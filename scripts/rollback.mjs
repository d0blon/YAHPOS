#!/usr/bin/env node
/**
 * rollback.mjs — vuelve a un despliegue anterior de Vercel y recuerda el lado DB.
 *
 * Uso:
 *   node scripts/rollback.mjs --target staging --list
 *   node scripts/rollback.mjs --target staging --to https://yahpos-abc123.vercel.app
 *   node scripts/rollback.mjs --target production --to <url> --yes
 *
 * Requiere VERCEL_TOKEN + VERCEL_ORG_ID/PROJECT_ID (API) o el CLI `vercel` logueado.
 * NO revierte migraciones: ver docs/operacion/DEPLOY.md §7.2.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opts = { target: null, to: null, list: false, yes: false, dryRun: false, limit: 10 }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--target') opts.target = args[++i]
  else if (a === '--to') opts.to = args[++i]
  else if (a === '--list' || a === '-l') opts.list = true
  else if (a === '--yes' || a === '-y') opts.yes = true
  else if (a === '--dry-run') opts.dryRun = true
  else if (a === '--limit') opts.limit = Number(args[++i])
  else if (a === '--help' || a === '-h') {
    console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
    process.exit(0)
  } else {
    console.error(`Argumento desconocido: ${a}`)
    process.exit(2)
  }
}

if (!opts.target || !['staging', 'production'].includes(opts.target)) {
  console.error('Uso: node scripts/rollback.mjs --target staging|production [--list | --to <url>] [--yes]')
  process.exit(2)
}

const isProd = opts.target === 'production'
const token = process.env.VERCEL_TOKEN || ''
const projectId = process.env.VERCEL_PROJECT_ID || ''
const teamId = process.env.VERCEL_ORG_ID || ''

const DB_NOTE = `
Nota DB: este script NO revierte migraciones.
  - Si el release anterior y el actual son compatibles con el mismo esquema, no hay nada que hacer.
  - Si la migración fue destructiva/incompatible: restaurar por PITR (Supabase → Database → Backups)
    o aplicar la migración inversa documentada. Pasos exactos en docs/operacion/DEPLOY.md §7.2.
`

function vercelCli(args) {
  const candidates = [['vercel', ['--version']], ['npx', ['--no-install', 'vercel', '--version']]]
  for (const [cmd, a] of candidates) {
    const r = spawnSync(cmd, a, { encoding: 'utf8', shell: process.platform === 'win32' })
    if (r.status === 0) return { cmd, prefix: cmd === 'npx' ? ['--no-install', 'vercel'] : [], args }
  }
  return null
}

async function api(path) {
  const url = new URL(`https://api.vercel.com${path}`)
  if (teamId) url.searchParams.set('teamId', teamId)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(`Vercel API ${res.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 200)}`)
  }
  return body
}

async function listDeployments() {
  const target = isProd ? 'production' : 'preview'
  const body = await api(`/v6/deployments?projectId=${projectId}&limit=${opts.limit}&target=${target}`)
  const rows = (body.deployments || []).map((d) => ({
    url: `https://${d.url}`,
    state: d.state || d.readyState,
    created: new Date(d.created).toISOString().replace('T', ' ').slice(0, 19),
    commit: (d.meta?.githubCommitSha || '').slice(0, 7),
    branch: d.meta?.githubCommitRef || '',
    target: d.target || 'preview',
  }))
  console.log(`\nDeployments recientes (${target}) del proyecto ${projectId}:`)
  console.log('  #  creado (UTC)          estado     commit   rama            url')
  rows.forEach((r, i) => {
    console.log(`  ${String(i + 1).padStart(2)}  ${r.created}  ${String(r.state).padEnd(9)}  ${(r.commit || '-').padEnd(7)}  ${(r.branch || '-').padEnd(14)}  ${r.url}`)
  })
  if (rows.length === 0) console.log('  (sin deployments para ese target)')
  return rows
}

async function main() {
  console.log(`\nRollback YAHPOS! · target=${opts.target}${opts.dryRun ? ' · DRY RUN' : ''}`)

  const useApi = Boolean(token && projectId)
  if (!useApi) {
    const cli = vercelCli([])
    if (!cli) {
      console.error('Faltan VERCEL_TOKEN + VERCEL_PROJECT_ID y el CLI `vercel` no está disponible.')
      console.error('Configurar el token o instalar el CLI (`npm i -g vercel`) y loguearse.')
      process.exit(2)
    }
    if (opts.list) {
      const r = spawnSync(cli.cmd, [...cli.prefix, 'ls', isProd ? '--prod' : '', ...(teamId ? ['--scope', teamId] : [])].filter(Boolean), {
        encoding: 'utf8',
        shell: process.platform === 'win32',
      })
      console.log(r.stdout || r.stderr)
      console.log(DB_NOTE)
      return
    }
    if (!opts.to) {
      console.error('Falta --to <url|deployment> (o usar --list).')
      process.exit(2)
    }
    const cmdArgs = [...cli.prefix, 'rollback', opts.to, ...(opts.yes ? ['--yes'] : [])]
    console.log(`\n$ ${cli.cmd} ${cmdArgs.join(' ')}`)
    if (opts.dryRun) {
      console.log('(dry-run: no se ejecutó)')
      return
    }
    const r = spawnSync(cli.cmd, cmdArgs, { stdio: 'inherit', shell: process.platform === 'win32' })
    if (r.status !== 0) process.exit(r.status ?? 1)
    console.log(DB_NOTE)
    return
  }

  if (opts.list || !opts.to) {
    const rows = await listDeployments()
    if (!opts.to) console.log(DB_NOTE)
    if (!opts.to) return rows
  }

  if (!opts.to) return
  const target = opts.to.replace(/^https?:\/\//, '')
  const list = await listDeployments()
  const match = list.find((d) => d.url.replace(/^https?:\/\//, '') === target || d.url === opts.to)
  if (!match) {
    console.error(`\nNo se encontró ${opts.to} entre los últimos ${opts.limit} deployments de ${opts.target}.`)
    process.exit(1)
  }
  if (opts.dryRun) {
    console.log(`\n[dry-run] POST /v9/projects/${projectId}/rollback/${target}`)
    console.log(DB_NOTE)
    return
  }
  if (!opts.yes) {
    console.error('\nConfirmar con --yes para ejecutar el rollback (acción con efecto en producción).')
    process.exit(2)
  }
  await api(`/v9/projects/${projectId}/rollback/${encodeURIComponent(target)}`)
  console.log(`\nRollback solicitado → ${match.url}`)
  console.log('Verificar: node scripts/smoke-deploy.mjs ' + match.url + ` --expect-env ${isProd ? 'production' : 'preview'}`)
  console.log(DB_NOTE)
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`)
  process.exit(1)
})
