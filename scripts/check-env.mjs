#!/usr/bin/env node
/**
 * check-env.mjs — gate de variables de entorno por entorno.
 *
 * Uso:
 *   node scripts/check-env.mjs                                  # local, .env.local
 *   node scripts/check-env.mjs --target staging --file .env.staging
 *   node scripts/check-env.mjs --target production --file .vercel/.env.production.local --json
 *   node scripts/check-env.mjs --target staging --strict        # 'recommended' también bloquea
 *
 * Salida: tabla legible (default) o JSON (--json). Exit 1 si falta/está mal una
 * variable 'required' (o 'recommended' con --strict). Nunca imprime valores
 * completos: solo los enmascara con --show-values.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnvFile, validateEnv, formatReport, TARGETS } from './lib/env-schema.mjs'

function parseArgs(argv) {
  const args = { target: null, file: null, json: false, strict: false, showValues: false, quiet: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--target' || a === '-t') args.target = argv[++i]
    else if (a.startsWith('--target=')) args.target = a.split('=')[1]
    else if (a === '--file' || a === '-f') args.file = argv[++i]
    else if (a.startsWith('--file=')) args.file = a.split('=')[1]
    else if (a === '--json') args.json = true
    else if (a === '--strict') args.strict = true
    else if (a === '--show-values') args.showValues = true
    else if (a === '--quiet') args.quiet = true
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0])
      process.exit(0)
    } else {
      console.error(`Argumento desconocido: ${a}`)
      process.exit(2)
    }
  }
  return args
}

const DEFAULT_FILES = {
  local: ['.env.local', '.env'],
  staging: ['.env.staging', '.vercel/.env.preview.local'],
  production: ['.env.production', '.vercel/.env.production.local'],
}

const args = parseArgs(process.argv.slice(2))
const target = args.target || 'local'

if (!TARGETS.includes(target)) {
  console.error(`--target inválido: ${target}. Opciones: ${TARGETS.join(', ')}`)
  process.exit(2)
}

let filePath = args.file ? resolve(args.file) : null
if (!filePath) {
  for (const candidate of DEFAULT_FILES[target]) {
    const abs = resolve(candidate)
    if (existsSync(abs)) {
      filePath = abs
      break
    }
  }
}

let fileEnv = {}
if (filePath) {
  fileEnv = parseEnvFile(readFileSync(filePath, 'utf8'))
}

// process.env gana sobre el archivo (en CI el job ya exporta los valores);
// si no hay archivo, process.env es la única fuente.
const merged = { ...fileEnv, ...process.env }

const report = validateEnv(merged, target)

if (args.strict) {
  const extraMissing = report.rows
    .filter((r) => r.level === 'recommended' && (r.status === 'missing' || r.status === 'invalid' || r.status === 'placeholder'))
    .map((r) => `${r.name} (${r.status}${r.problem ? `: ${r.problem}` : ''})`)
  if (extraMissing.length) {
    report.invalidRequired.push(...extraMissing.map((e) => `[strict] ${e}`))
    report.ok = false
  }
}

if (args.json) {
  console.log(
    JSON.stringify(
      {
        target: report.target,
        ok: report.ok,
        file: filePath,
        missingRequired: report.missingRequired,
        invalidRequired: report.invalidRequired,
        variables: report.rows,
      },
      null,
      2
    )
  )
} else if (!args.quiet) {
  if (!filePath) {
    console.log(`(sin archivo .env para '${target}': se validan solo las variables del proceso)`)
  } else {
    console.log(`Archivo: ${filePath}`)
  }
  console.log(formatReport(report, { showValues: args.showValues, env: merged }))
  console.log('')
  console.log('Las variables comparadas contra el platform secret store deben coincidir por NOMBRE y estar')
  console.log('en el scope correcto (Production vs Preview). Ver docs/operacion/DEPLOY.md §4.')
}

process.exit(report.ok ? 0 : 1)
