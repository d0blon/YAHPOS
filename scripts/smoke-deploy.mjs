#!/usr/bin/env node
/**
 * smoke-deploy.mjs — verifica un despliegue real contra su URL.
 *
 * Uso:
 *   node scripts/smoke-deploy.mjs https://staging.tudominio.cl --expect-env staging
 *   node scripts/smoke-deploy.mjs --url https://app.tudominio.cl --expect-env production --expect-release <sha>
 *   node scripts/smoke-deploy.mjs http://localhost:3000 --expect-env local --json
 *
 * Chequeos (en orden, todos read-only):
 *   1. GET /api/ping    → 200 y {"message":"pong"}         (liveness: proceso vivo, sin DB)
 *   2. GET /api/health  → 200 y ok:true                    (readiness: Supabase responde)
 *   3. Headers de seguridad mínimos (nosniff, frame-options)
 *   4. Si la respuesta expone `env`/`release`, coinciden con --expect-env/--expect-release
 *
 * Reintenta 3 veces por defecto (arranque en frío de serverless). Exit 1 si algo falla.
 */
const args = process.argv.slice(2)

function usage() {
  const src = process.argv[1]
  console.log(`Uso: node ${src} <url> [--expect-env staging|production|local] [--expect-release <sha>] [--retries 3] [--timeout 15000] [--json]`)
  process.exit(2)
}

const opts = { url: null, expectEnv: null, expectRelease: null, retries: 3, timeout: 15000, json: false }
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a === '--url') opts.url = args[++i]
  else if (a === '--expect-env') opts.expectEnv = args[++i]
  else if (a === '--expect-release') opts.expectRelease = args[++i]
  else if (a === '--retries') opts.retries = Number(args[++i])
  else if (a === '--timeout') opts.timeout = Number(args[++i])
  else if (a === '--json') opts.json = true
  else if (a === '--help' || a === '-h') usage()
  else if (!a.startsWith('-')) opts.url = opts.url ? opts.url : a
  else {
    console.error(`Argumento desconocido: ${a}`)
    usage()
  }
}

if (!opts.url) usage()
if (!/^https?:\/\//i.test(opts.url)) {
  console.error(`URL inválida (debe empezar con http:// o https://): ${opts.url}`)
  process.exit(2)
}

const base = opts.url.replace(/\/+$/, '')
const results = []
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchWithTimeout(path) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeout)
  const started = Date.now()
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: { 'user-agent': 'yahpos-deploy-smoke/1.0', accept: 'application/json' },
    })
    const text = await res.text()
    let body = null
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
    return { status: res.status, headers: res.headers, body, text, ms: Date.now() - started }
  } finally {
    clearTimeout(timer)
  }
}

function record(name, ok, detail, ms) {
  results.push({ name, ok, detail, ms })
  if (!opts.json) {
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(22)} ${String(ms ?? '').padStart(5)}ms  ${detail}`)
  }
}

/** Reintenta cuando la respuesta es 5xx/timeout (cold start o despliegue aún propagando). */
async function withRetry(fn) {
  let lastError
  for (let attempt = 1; attempt <= opts.retries; attempt++) {
    try {
      return await fn(attempt)
    } catch (e) {
      lastError = e
      if (attempt < opts.retries) await sleep(1500 * attempt)
    }
  }
  throw lastError
}

async function main() {
  if (!opts.json) console.log(`Smoke de despliegue → ${base}\n`)

  // 1) Liveness
  try {
    const ping = await withRetry(async () => {
      const r = await fetchWithTimeout('/api/ping')
      if (r.status === 0 || r.status >= 500) throw new Error(`HTTP ${r.status}`)
      return r
    })
    const okPing = ping.status === 200 && ping.body?.message === 'pong'
    record('GET /api/ping', okPing, okPing ? 'proceso vivo' : `HTTP ${ping.status} body=${JSON.stringify(ping.body)?.slice(0, 120)}`, ping.ms)
  } catch (e) {
    record('GET /api/ping', false, `sin respuesta: ${e.message}`, null)
  }

  // 2) Readiness (DB)
  let health = null
  try {
    health = await withRetry(async () => {
      const r = await fetchWithTimeout('/api/health')
      if (r.status === 0) throw new Error('sin respuesta')
      return r
    })
    const okHealth = health.status === 200 && health.body?.ok === true
    record(
      'GET /api/health',
      okHealth,
      okHealth
        ? `db=${health.body?.db ?? '?'} release=${health.body?.release ?? 'n/d'} env=${health.body?.env ?? 'n/d'}`
        : `HTTP ${health.status} body=${JSON.stringify(health.body)?.slice(0, 160)}`,
      health.ms
    )

    // 3) Headers de seguridad
    const nosniff = health.headers.get('x-content-type-options') === 'nosniff'
    const frame = (health.headers.get('x-frame-options') || '').toUpperCase() === 'DENY'
    record('headers de seguridad', nosniff && frame, `nosniff=${nosniff} frame-options=${frame}`, null)

    // 4) Identidad del despliegue
    if (opts.expectEnv) {
      const envReported = health.body?.env ?? null
      const okEnv = envReported !== null && envReported === opts.expectEnv
      record('entorno desplegado', okEnv, okEnv ? envReported : `esperado=${opts.expectEnv} reportado=${envReported ?? 'no expuesto'}`, null)
    }
    if (opts.expectRelease) {
      const reported = String(health.body?.release ?? '')
      const okRelease = reported.length > 0 && reported.startsWith(opts.expectRelease.slice(0, 7))
      record('release desplegado', okRelease, okRelease ? reported : `esperado=${opts.expectRelease} reportado=${reported || 'no expuesto'}`, null)
    }
  } catch (e) {
    record('GET /api/health', false, `sin respuesta: ${e.message}`, null)
  }

  const failed = results.filter((r) => !r.ok)
  if (opts.json) {
    console.log(JSON.stringify({ url: base, ok: failed.length === 0, results }, null, 2))
  } else {
    console.log('')
    if (failed.length === 0) {
      console.log(`SMOKE OK — ${results.length} chequeos en ${results.reduce((s, r) => s + (r.ms ?? 0), 0)}ms`)
    } else {
      console.log(`SMOKE FALLIDO — ${failed.length}/${results.length} chequeos`)
      console.log('Rollback: ver docs/operacion/DEPLOY.md §7 antes de reintentar el deploy.')
    }
  }
  process.exit(failed.length === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(`Error inesperado en el smoke: ${e.stack || e.message}`)
  process.exit(1)
})
