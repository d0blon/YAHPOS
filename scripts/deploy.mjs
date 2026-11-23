#!/usr/bin/env node
/**
 * deploy.mjs — despliegue reproducible con orden explícito:
 *
 *   1. preflight   → variables de entorno del entorno (aborta si falta algo)
 *   2. build       → `vercel build` (artefacto local, sin publicar)
 *   3. migraciones → `scripts/db-migrate.mjs --apply` (antes de publicar)
 *   4. deploy      → `vercel deploy --prebuilt`
 *   5. smoke       → `scripts/smoke-deploy.mjs` contra la URL publicada
 *
 * Uso:
 *   node scripts/deploy.mjs --target staging
 *   node scripts/deploy.mjs --target staging --dry-run
 *   node scripts/deploy.mjs --target production --i-have-a-backup
 *   node scripts/deploy.mjs --target staging --skip-migrations   (solo si no hay cambios de esquema)
 *
 * Requiere (una vez por máquina/CI): VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID.
 * Con `vercel login` local basta con tener el proyecto linkeado (.vercel/project.json).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'

const args = process.argv.slice(2)
const opts = {
  target: null,
  dryRun: false,
  skipBuild: false,
  skipMigrations: false,
  skipPull: false,
  haveBackup: false,
  allowProd: false,
  yes: false,
  url: null,
  envFile: null,
}

for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--target') opts.target = args[++i]
  else if (a === '--dry-run') opts.dryRun = true
  else if (a === '--skip-build') opts.skipBuild = true
  else if (a === '--skip-migrations') opts.skipMigrations = true
  else if (a === '--skip-pull') opts.skipPull = true
  else if (a === '--i-have-a-backup') opts.haveBackup = true
  else if (a === '--allow-prod') opts.allowProd = true
  else if (a === '--yes' || a === '-y') opts.yes = true
  else if (a === '--url') opts.url = args[++i]
  else if (a === '--env-file') opts.envFile = args[++i]
  else if (a === '--help' || a === '-h') {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
    process.exit(0)
  } else {
    console.error(`Argumento desconocido: ${a}`)
    process.exit(2)
  }
}

if (!opts.target || !['staging', 'production'].includes(opts.target)) {
  console.error('Uso: node scripts/deploy.mjs --target staging|production [--dry-run] [--skip-build] [--skip-migrations]')
  process.exit(2)
}

const isProd = opts.target === 'production'
const vercelEnv = isProd ? 'production' : 'preview'
// En Vercel un deployment de la rama staging es VERCEL_ENV=preview con VERCEL_TARGET_ENV/rama staging.
const expectedHealthEnv = vercelEnv
const envFile = opts.envFile || `.vercel/.env.${vercelEnv}.local`

const state = { steps: [], startedAt: new Date().toISOString(), deploymentUrl: null }

function log(msg = '') {
  console.log(msg)
}

function stepHeader(n, total, title) {
  log('')
  log(`── [${n}/${total}] ${title} ${'─'.repeat(Math.max(0, 54 - title.length))}`)
}

function shellQuoteForLog(cmd, args) {
  return [cmd, ...args.map((a) => (a.includes(' ') ? `"${a}"` : a))].join(' ')
}

/** Ejecuta o (en dry-run) imprime el comando. Devuelve {status, stdout, stderr}.
 *  `force: true` ejecuta incluso en dry-run (solo para chequeos locales de lectura). */
function run(cmd, cmdArgs, { capture = false, input = undefined, allowFail = false, force = false } = {}) {
  const printable = shellQuoteForLog(cmd, cmdArgs)
  if (opts.dryRun && !force) {
    log(`   [dry-run] ${printable}`)
    return { status: 0, stdout: '', stderr: '', dryRun: true }
  }
  log(`   $ ${printable}`)
  const r = spawnSync(cmd, cmdArgs, {
    encoding: 'utf8',
    input,
    shell: process.platform === 'win32',
    stdio: capture ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'inherit', 'inherit'],
    env: process.env,
  })
  if (r.status !== 0 && !allowFail) {
    log('')
    log(`   FALLÓ (exit ${r.status}). El deploy se detiene en este paso y no publica nada más.`)
    record(n_current, 'fail')
    if (r.stderr) console.error(r.stderr.trim())
    finish(1)
  }
  return r
}

let n_current = ''
function record(name, status, extra = {}) {
  state.steps.push({ name, status, at: new Date().toISOString(), ...extra })
}

function finish(code) {
  state.finishedAt = new Date().toISOString()
  state.ok = code === 0
  if (!opts.dryRun) {
    try {
      mkdirSync('.vercel', { recursive: true })
      writeFileSync(join('.vercel', `last-deploy.${opts.target}.json`), JSON.stringify(state, null, 2))
    } catch {
      /* el reporte es best-effort */
    }
  }
  log('')
  log('══════════════════════════════════════════════════════════════')
  log(` ${state.ok ? 'DEPLOY OK' : 'DEPLOY FALLIDO'} · target=${opts.target}${opts.dryRun ? ' (dry-run)' : ''}`)
  if (state.deploymentUrl) log(` URL: ${state.deploymentUrl}`)
  log(' Pasos: ' + state.steps.map((s) => `${s.name}:${s.status}`).join('  '))
  if (state.ok && !opts.dryRun) {
    log('')
    log(' Rollback de la app:  node scripts/rollback.mjs --target ' + opts.target + ' --list')
    log(' Rollback de datos:   docs/operacion/DEPLOY.md §7 (PITR / migración inversa)')
  }
  log('══════════════════════════════════════════════════════════════')
  process.exit(code)
}

function findVercel() {
  const probes = [['vercel', ['--version']], ['npx', ['--no-install', 'vercel', '--version']]]
  for (const [cmd, a] of probes) {
    const r = spawnSync(cmd, a, { encoding: 'utf8', shell: process.platform === 'win32' })
    if (r.status === 0) return { cmd, prefix: cmd === 'npx' ? ['--no-install', 'vercel'] : [] }
  }
  return null
}

const vercel = findVercel()

function vercelCmd(subArgs) {
  if (!vercel) return { cmd: 'vercel', args: subArgs } // dry-run: solo se imprime
  return { cmd: vercel.cmd, args: [...vercel.prefix, ...subArgs] }
}

const TOTAL = 5

log('══════════════════════════════════════════════════════════════')
log(` YAHPOS! deploy · target=${opts.target} · vercel-env=${vercelEnv}${opts.dryRun ? ' · DRY RUN' : ''}`)
log(' Orden: preflight → build → migraciones → deploy → smoke')
log('══════════════════════════════════════════════════════════════')

// ── 1. Preflight ────────────────────────────────────────────────────────────
stepHeader(1, TOTAL, 'Preflight de variables de entorno')
n_current = 'preflight'
if (!existsSync('supabase/migrations')) {
  log('   ERROR: no existe supabase/migrations — repo incorrecto.')
  record('preflight', 'fail')
  finish(1)
}
if (!vercel && !opts.dryRun) {
  log('   ERROR: el CLI de Vercel no está disponible (ni `vercel` ni `npx vercel`).')
  log('          npm i -g vercel   ·   o usar el workflow .github/workflows/deploy.yml')
  record('preflight', 'fail')
  finish(1)
}
if (!vercel && opts.dryRun) {
  log('   [dry-run] CLI de Vercel no instalado: los comandos se muestran sin ejecutar.')
}
if (!existsSync(envFile) && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  log(`   AVISO: no existe ${envFile} y no hay variables en el proceso todavía.`)
  log('          Se ejecutará `vercel pull` (paso 1b) para traerlas del proyecto.')
}
const preflightArgs = ['scripts/check-env.mjs', '--target', isProd ? 'production' : 'staging']
if (existsSync(envFile)) preflightArgs.push('--file', envFile)
const pre = run('node', preflightArgs, { allowFail: true, force: true })
if (pre.status !== 0) {
  log('')
  log('   El preflight falló: faltan variables obligatorias del entorno.')
  log('   Configurarlas en Vercel (Project → Settings → Environment Variables) y repetir.')
  record('preflight', 'fail')
  finish(1)
}
record('preflight', 'ok')

// ── 1b. Pull de env vars del proyecto Vercel ────────────────────────────────
if (!opts.skipPull) {
  log('')
  log('   → vercel pull (trae las env vars del scope ' + vercelEnv + ' a .vercel/.env.' + vercelEnv + '.local)')
  const pull = vercelCmd(['pull', '--yes', '--environment', vercelEnv])
  run(pull.cmd, pull.args)
} else {
  log('   (pull omitido: --skip-pull)')
}

// ── 2. Build ────────────────────────────────────────────────────────────────
stepHeader(2, TOTAL, 'Build (artefacto local, todavía sin publicar)')
n_current = 'build'
if (opts.skipBuild) {
  log('   (omitido: --skip-build)')
  record('build', 'skipped')
} else {
  const buildArgs = ['build']
  if (isProd) buildArgs.push('--prod')
  const build = vercelCmd(buildArgs)
  run(build.cmd, build.args)
  record('build', 'ok')
}

// ── 3. Migraciones ──────────────────────────────────────────────────────────
stepHeader(3, TOTAL, 'Migraciones de base de datos (antes de publicar)')
n_current = 'migrations'
if (opts.skipMigrations) {
  log('   (omitido: --skip-migrations — solo válido si el cambio no toca esquema)')
  record('migrations', 'skipped')
} else {
  const migArgs = ['scripts/db-migrate.mjs', '--target', opts.target]
  if (opts.dryRun) migArgs.push('--plan')
  else migArgs.push('--apply')
  if (isProd) {
    migArgs.push('--allow-prod')
    if (opts.haveBackup) migArgs.push('--i-have-a-backup')
  }
  const mig = run('node', migArgs, { allowFail: true })
  if (mig.status !== 0) {
    log('')
    log('   Las migraciones fallaron o no se pudieron verificar. No se publica la app.')
    log('   Corregir el SQL (o el acceso a la DB) y repetir el deploy completo.')
    record('migrations', 'fail')
    finish(mig.status ?? 1)
  }
  record('migrations', opts.dryRun ? 'planned' : 'ok')
}

// ── 4. Deploy ───────────────────────────────────────────────────────────────
stepHeader(4, TOTAL, 'Publicación en Vercel')
n_current = 'deploy'
const deployArgs = ['deploy', '--prebuilt', '--yes']
if (isProd) deployArgs.push('--prod')
const deployCmd = vercelCmd(deployArgs)
const dep = run(deployCmd.cmd, deployCmd.args, { capture: true })
if (!opts.dryRun) {
  const out = `${dep.stdout || ''}\n${dep.stderr || ''}`
  const m = out.match(/https:\/\/[a-z0-9-]+\.vercel\.app/i)
  state.deploymentUrl = m ? m[0] : opts.url || null
  log(`   URL: ${state.deploymentUrl ?? '(no detectada en la salida del CLI)'}`)
}
record('deploy', 'ok', { url: state.deploymentUrl })

// ── 5. Smoke ────────────────────────────────────────────────────────────────
stepHeader(5, TOTAL, 'Smoke test contra el despliegue')
n_current = 'smoke'
const smokeUrl = opts.url || state.deploymentUrl || process.env.SMOKE_URL
if (opts.dryRun) {
  log(`   [dry-run] node scripts/smoke-deploy.mjs ${smokeUrl || '<url>'} --expect-env ${expectedHealthEnv}`)
  record('smoke', 'planned')
} else if (!smokeUrl) {
  log('   AVISO: no se pudo determinar la URL del despliegue. Smoke omitido.')
  log('   Ejecutar manualmente: node scripts/smoke-deploy.mjs <url> --expect-env ' + expectedHealthEnv)
  record('smoke', 'skipped')
} else {
  const smoke = run(
    'node',
    ['scripts/smoke-deploy.mjs', smokeUrl, '--expect-env', expectedHealthEnv, '--retries', '5'],
    { allowFail: true }
  )
  if (smoke.status !== 0) {
    log('')
    log('   El smoke falló: el despliegue está publicado pero no está sano.')
    log('   Rollback inmediato: node scripts/rollback.mjs --target ' + opts.target + ' --list')
    record('smoke', 'fail', { url: smokeUrl })
    finish(smoke.status ?? 1)
  }
  record('smoke', 'ok', { url: smokeUrl })
}

finish(0)
