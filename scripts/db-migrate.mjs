#!/usr/bin/env node
/**
 * db-migrate.mjs — aplica las migraciones de `supabase/migrations` en orden.
 *
 * Uso:
 *   node scripts/db-migrate.mjs --target staging --plan          # solo muestra qué falta
 *   node scripts/db-migrate.mjs --target staging --apply
 *   node scripts/db-migrate.mjs --target production --apply --i-have-a-backup
 *
 * Modos (--mode):
 *   auto     (default) usa el CLI de Supabase si está instalado; si no, psql con SUPABASE_DB_URL.
 *   supabase `supabase db push` (requiere SUPABASE_ACCESS_TOKEN y proyecto linkeado)
 *   psql     aplica archivo por archivo en una transacción y registra la versión en
 *            `supabase_migrations.schema_migrations` (la misma tabla que usa el CLI).
 *
 * El script NO crea respaldos: en producción exige `--i-have-a-backup`, que solo
 * declara que el respaldo/PITR ya está confirmado (ver docs/operacion/DEPLOY.md §7).
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const MIGRATIONS_DIR = resolve('supabase/migrations')

function parseArgs(argv) {
  const out = { target: 'staging', mode: 'auto', apply: false, plan: true, haveBackup: false, allowProd: false, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--target') out.target = argv[++i]
    else if (a === '--mode') out.mode = argv[++i]
    else if (a === '--apply') { out.apply = true; out.plan = false }
    else if (a === '--plan') out.plan = true
    else if (a === '--i-have-a-backup') out.haveBackup = true
    else if (a === '--allow-prod') out.allowProd = true
    else if (a === '--json') out.json = true
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
      process.exit(0)
    } else {
      console.error(`Argumento desconocido: ${a}`)
      process.exit(2)
    }
  }
  return out
}

const opts = parseArgs(process.argv.slice(2))
if (!['local', 'staging', 'production'].includes(opts.target)) {
  console.error(`--target inválido (local|staging|production): ${opts.target}`)
  process.exit(2)
}

function envFor(name) {
  const suffix = `_${opts.target.toUpperCase()}`
  return process.env[`${name}${suffix}`] || process.env[name] || ''
}

const projectRef = envFor('SUPABASE_PROJECT_REF')
const dbUrl = envFor('SUPABASE_DB_URL') || envFor('DIRECT_DATABASE_URL')
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || ''

function which(cmd) {
  const r = spawnSync(cmd, ['--version'], { encoding: 'utf8', shell: process.platform === 'win32' })
  if (r.status === 0) return (r.stdout || '').trim().split('\n')[0]
  return null
}

const supabaseCli = which('supabase')
const psql = which('psql')

function die(msg, code = 1) {
  console.error(`\n[db:migrate] ${msg}`)
  process.exit(code)
}

if (opts.target === 'production' && opts.apply) {
  if (!opts.haveBackup && process.env.BACKUP_CONFIRMED !== '1') {
    die('producción requiere confirmar respaldo: `--i-have-a-backup` (o BACKUP_CONFIRMED=1). Ver DEPLOY.md §7.', 2)
  }
  if (!opts.allowProd && process.env.ALLOW_PROD_MIGRATIONS !== '1') {
    die('producción requiere `--allow-prod` explícito (o ALLOW_PROD_MIGRATIONS=1).', 2)
  }
}

if (!existsSync(MIGRATIONS_DIR)) die(`no existe ${MIGRATIONS_DIR}`)

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))

if (files.length === 0) die('no hay migraciones en supabase/migrations')

/** Versión = prefijo numérico del archivo (mismo criterio que usa el CLI de Supabase). */
const versionOf = (file) => {
  const m = file.match(/^(\d+)/)
  return m ? m[1] : null
}

const localVersions = files.map((f) => ({ file: f, version: versionOf(f) })).filter((m) => m.version)
const missingVersion = files.filter((f) => !versionOf(f))
if (missingVersion.length) {
  die(`archivos sin prefijo numérico (no se pueden trackear): ${missingVersion.join(', ')}`)
}

// Detección de huecos en la secuencia (ej. falta 016): informativo, no bloquea.
const numeric = localVersions.map((m) => Number(m.version)).sort((a, b) => a - b)
const gaps = []
for (let i = 1; i < numeric.length; i++) {
  if (numeric[i] - numeric[i - 1] > 1) {
    for (let n = numeric[i - 1] + 1; n < numeric[i]; n++) gaps.push(String(n).padStart(3, '0'))
  }
}

function run(cmd, args, { input, allowFail = false } = {}) {
  const r = spawnSync(cmd, args, {
    encoding: 'utf8',
    input,
    shell: process.platform === 'win32',
    env: process.env,
  })
  if (r.status !== 0 && !allowFail) {
    console.error(`\n[db:migrate] FALLÓ: ${cmd} ${args.join(' ')}`)
    console.error((r.stdout || '').trim())
    console.error((r.stderr || '').trim())
    process.exit(r.status ?? 1)
  }
  return r
}

function remoteAppliedVersionsViaPsql() {
  if (!dbUrl) return null
  const sql =
    "select version from supabase_migrations.schema_migrations order by version;"
  const r = spawnSync('psql', [dbUrl, '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  if (r.status !== 0) {
    // La tabla puede no existir si la DB nunca fue tocada por el CLI: se asume vacío.
    if (/schema_migrations|does not exist/i.test(r.stderr || '')) return { versions: [], tableMissing: true }
    return { error: (r.stderr || '').trim() }
  }
  return { versions: (r.stdout || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean) }
}

function planWithPsql() {
  const remote = remoteAppliedVersionsViaPsql()
  if (!remote) return null
  if (remote.error) die(`no se pudo leer el historial de migraciones por psql: ${remote.error}`)
  const applied = new Set(remote.versions)
  const pending = localVersions.filter((m) => !applied.has(m.version))
  return { pending, appliedVersions: remote.versions, tableMissing: remote.tableMissing === true }
}

function main() {
  const header = [
    '',
    '──────────────────────────────────────────────────────────────',
    ` Migraciones Supabase · target=${opts.target} · mode=${opts.mode}`,
    ` local: ${localVersions.length} archivos (${localVersions[0].file} → ${localVersions[localVersions.length - 1].file})`,
    ` CLI supabase: ${supabaseCli ?? 'no instalado'} | psql: ${psql ?? 'no instalado'}`,
    ` project ref: ${projectRef || '(no definido)'} | DB URL: ${dbUrl ? '(definida)' : '(no definida)'}`,
    '──────────────────────────────────────────────────────────────',
  ]
  if (!opts.json) console.log(header.join('\n'))
  if (gaps.length) console.log(`AVISO: falta(n) migración(es) en la secuencia: ${gaps.join(', ')} — confirmar que el hueco es intencional.`)

  // Modo psql directo: permite plan y aplicación con tracking propio.
  if (opts.mode === 'psql' || (opts.mode === 'auto' && !supabaseCli)) {
    if (!psql) die('psql no está en PATH. Instalar el cliente de PostgreSQL o usar --mode supabase.')
    const plan = planWithPsql()
    if (!plan) die('falta SUPABASE_DB_URL (o DIRECT_DATABASE_URL) para el modo psql.')
    if (plan.tableMissing) {
      console.log('AVISO: `supabase_migrations.schema_migrations` no existe todavía; se creará al aplicar la primera migración.')
    }
    if (plan.pending.length === 0) {
      console.log('\nNada pendiente: la base ya tiene todas las migraciones locales aplicadas.')
      return
    }
    console.log(`\nPendientes (${plan.pending.length}):`)
    for (const m of plan.pending) console.log(`  - ${m.file}`)

    if (!opts.apply) {
      console.log('\nModo plan: no se aplicó nada. Repetir con --apply para ejecutar.')
      console.log('Orden de operaciones del deploy: build → migraciones → deploy (DEPLOY.md §3).')
      return
    }

    // Tracking table + cada archivo en su propia transacción.
    const bootstrap = `create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text,
  inserted_at timestamptz not null default now()
);`
    const bootRes = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '-c', bootstrap], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    if (bootRes.status !== 0) die(`no se pudo crear el historial de migraciones: ${(bootRes.stderr || '').trim()}`)

    for (const m of plan.pending) {
      const sql = readFileSync(join(MIGRATIONS_DIR, m.file), 'utf8')
      const tracked = `\ninsert into supabase_migrations.schema_migrations (version, name) values ('${m.version}', '${m.file.replace(/'/g, "''")}') on conflict (version) do nothing;\n`
      console.log(`\n→ aplicando ${m.file} …`)
      const r = spawnSync('psql', [dbUrl, '-v', 'ON_ERROR_STOP=1', '--single-transaction', '-X', '-q'], {
        input: `${sql}\n${tracked}`,
        encoding: 'utf8',
        shell: process.platform === 'win32',
      })
      if (r.status !== 0) {
        console.error((r.stdout || '').trim())
        console.error((r.stderr || '').trim())
        die(`migración ${m.file} falló y fue revertida (single-transaction). No se desplegó la app.`)
      }
      console.log(`   OK ${m.file}`)
    }
    console.log(`\n${plan.pending.length} migración(es) aplicadas en ${opts.target}.`)
    return
  }

  // Modo CLI de Supabase.
  if (!supabaseCli) die('supabase CLI no está instalado. Instalar (`npm i -g supabase`) o usar --mode psql.')
  if (!accessToken) die('falta SUPABASE_ACCESS_TOKEN para el CLI de Supabase.')

  if (!projectRef) {
    console.log('\nAVISO: SUPABASE_PROJECT_REF no definido; se asume que el proyecto ya está linkeado (.temp/project-ref).')
  } else {
    console.log(`\n→ supabase link --project-ref ${projectRef}`)
    run('supabase', ['link', '--project-ref', projectRef])
  }

  console.log('\n→ supabase migration list (local vs remoto)')
  run('supabase', ['migration', 'list'], { allowFail: true })

  if (!opts.apply) {
    console.log('\nModo plan: revisar la lista de arriba. Repetir con --apply para ejecutar `supabase db push`.')
    return
  }

  console.log('\n→ supabase db push')
  run('supabase', ['db', 'push'])
  console.log('\nMigraciones aplicadas (CLI Supabase).')

  console.log('\nBaseline de una DB ya migrada manualmente (solo la primera vez):')
  console.log('  supabase migration repair --status applied <version>   # una por archivo ya existente')
}

main()
