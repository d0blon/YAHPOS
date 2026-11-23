/**
 * Esquema único de variables de entorno de YAHPOS! por entorno.
 *
 * Fuente: inventario de `process.env.*` en `src/` (22-11-2026) + `.env.example`.
 * Este archivo NO reemplaza la validación de runtime de la app; es el gate de
 * despliegue: comprueba presencia y forma antes de construir y antes de publicar.
 *
 * Niveles: 'required' | 'recommended' | 'optional' | 'unused'
 *  - required    → el deploy se aborta si falta o es inválida.
 *  - recommended → se avisa, no se aborta.
 *  - optional    → informativa.
 *  - unused      → documentada en .env.example pero ningún archivo del repo la
 *                  lee (verificado con grep); se lista para no configurarla en vano.
 */

export const TARGETS = ['local', 'staging', 'production']

const req = (local, staging, production) => ({ local, staging, production })

/** @typedef {{name:string, level:Record<string,'required'|'recommended'|'optional'|'unused'>, secret:boolean, phase:'build'|'runtime'|'both', format?:string, minLength?:number, note:string}} EnvVar */

/** @type {EnvVar[]} */
export const ENV_SCHEMA = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    level: req('required', 'required', 'required'),
    secret: false,
    phase: 'both',
    format: 'https-url',
    note: 'URL del proyecto Supabase. Se inlinea en el bundle: debe existir en el BUILD del entorno.',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    level: req('required', 'required', 'required'),
    secret: false,
    phase: 'both',
    format: 'min-length',
    minLength: 40,
    note: 'Anon key (pública por diseño, protegida por RLS). También se inlinea en el build.',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    level: req('required', 'required', 'required'),
    secret: true,
    phase: 'runtime',
    format: 'min-length',
    minLength: 40,
    note: 'Bypassa RLS. Solo servidor. Nunca con prefijo NEXT_PUBLIC_.',
  },
  {
    name: 'NEXT_PUBLIC_ROOT_ORIGIN',
    level: req('required', 'required', 'required'),
    secret: false,
    phase: 'both',
    format: 'origin',
    note: 'Origin raíz sin path/query/hash. Si falta o es inválida, el middleware responde 500 (fail-closed).',
  },
  {
    name: 'SECURITY_SALT',
    level: req('optional', 'required', 'required'),
    secret: true,
    phase: 'runtime',
    format: 'min-length',
    minLength: 16,
    note: 'Salt de cifrado del secreto maestro. DEBE ser estable: cambiarlo invalida todo lo cifrado con el anterior.',
  },
  {
    name: 'SII_ENCRYPTION_KEY',
    level: req('optional', 'required', 'required'),
    secret: true,
    phase: 'runtime',
    format: 'exact-length',
    minLength: 32,
    note: 'AES-256-GCM para CAF/certificados en DB. Exactamente 32 caracteres en producción; si cambia sin rotar, los PFX/CAF quedan ilegibles.',
  },
  {
    name: 'DEV_TOKEN_SECRET',
    level: req('optional', 'recommended', 'required'),
    secret: true,
    phase: 'runtime',
    format: 'min-length',
    minLength: 16,
    note: 'Firma de cookies del panel developer. Sin secreto válido, el login developer falla cerrado.',
  },
  {
    name: 'UPSTASH_REDIS_REST_URL',
    level: req('optional', 'required', 'required'),
    secret: true,
    phase: 'runtime',
    format: 'https-url',
    note: 'Rate limiting distribuido. Sin Redis en producción el limitador HACE FAIL-CLOSED (login/registro bloqueados).',
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    level: req('optional', 'required', 'required'),
    secret: true,
    phase: 'runtime',
    format: 'min-length',
    minLength: 20,
    note: 'Token de Upstash. Se configura junto con la URL.',
  },
  {
    name: 'BLUMI_SANDBOX_URL',
    level: req('optional', 'recommended', 'required'),
    secret: false,
    phase: 'runtime',
    format: 'https-url',
    note: 'Cliente DTE Blumi: lanza error en producción si se instancia sin esta URL.',
  },
  {
    name: 'OPENAI_API_KEY',
    level: req('optional', 'optional', 'optional'),
    secret: true,
    phase: 'runtime',
    note: 'Generación de descripciones con IA. Sin key, esa función queda deshabilitada.',
  },
  {
    name: 'GEMINI_API_KEY',
    level: req('optional', 'optional', 'optional'),
    secret: true,
    phase: 'runtime',
    note: 'OCR de facturas de proveedor en /api/admin/inventory/adjustments/upload.',
  },
  {
    name: 'MASTER_KEY_ENCRYPTED',
    level: req('optional', 'optional', 'optional'),
    secret: true,
    phase: 'runtime',
    note: 'Legacy: respaldo del secreto de firma developer. Preferir DEV_TOKEN_SECRET.',
  },
  {
    name: 'NEXT_PUBLIC_ROOT_DOMAIN',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'both',
    format: 'hostname',
    note: 'CNAME destino del root para resolver tiendas por dominio. Sin scheme ni puerto.',
  },
  {
    name: 'NEXT_PUBLIC_SUPPORT_WHATSAPP',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'build',
    format: 'digits',
    note: 'Formato 569XXXXXXXX. Sin valor se usa un placeholder.',
  },
  {
    name: 'NEXT_PUBLIC_SUPPORT_EMAIL',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'build',
    format: 'email',
    note: 'Correo público de soporte (footer, upgrade, editor).',
  },
  {
    name: 'PAYMENT_PROVIDER',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    format: 'enum:transbank|flow',
    note: 'Proveedor por defecto del lado servidor. Las credenciales reales viven cifradas en `settings` por tienda.',
  },
  {
    name: 'DB_MODE',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    format: 'enum:supabase|postgres|sqlite',
    note: 'Solo informativo: /api/health lo reporta. Default supabase.',
  },
  {
    name: 'SII_ENV',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    format: 'enum:certification|production',
    note: 'Ambiente SII por defecto: certification → maullín, production → palena. `sii_config.environment` de cada tienda sigue mandando en el motor.',
  },
  {
    name: 'SII_BASE_URL',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    format: 'origin',
    note: 'Override del host SII para un proxy/mock controlado. Vacío = host canónico de SII_ENV. Sin path.',
  },
  {
    name: 'SII_CERT_PATH',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    note: 'Ruta al PFX/P12 de certificación para scripts de verificación. Debe estar fuera del repo (certs/ ignorado). Alternativa: SII_CERT_PFX_BASE64.',
  },
  {
    name: 'SII_CERT_PASSWORD',
    level: req('optional', 'optional', 'optional'),
    secret: true,
    phase: 'runtime',
    note: 'Contraseña del PFX. Solo secret manager o .env.local; nunca en el repo ni en logs.',
  },
  {
    name: 'SII_CERT_PFX_BASE64',
    level: req('optional', 'optional', 'optional'),
    secret: true,
    phase: 'runtime',
    note: 'PFX en base64 para CI/secret manager. Si convive con SII_CERT_PATH, gana el base64.',
  },
  {
    name: 'SII_CAF_DIR',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    note: 'Directorio con los CAF de certificación en disco (default certs/sii/caf). Los CAF reales viven cifrados en sii_folios.',
  },
  {
    name: 'SII_RUT_EMISOR',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    format: 'rut',
    note: 'RUT del emisor sin puntos (ej. 76123456-0). Cruza certificado, CAF y sii_config.rut_emisor.',
  },
  {
    name: 'SII_TIMEOUT_MS',
    level: req('optional', 'optional', 'optional'),
    secret: false,
    phase: 'runtime',
    format: 'integer',
    note: 'Timeout de red contra el SII en milisegundos (default 30000).',
  },
  {
    name: 'FLOW_SANDBOX',
    level: req('optional', 'unused', 'unused'),
    secret: false,
    phase: 'runtime',
    note: 'Legacy: las credenciales de pago se guardan cifradas en `settings`, no en el entorno.',
  },
]

const PLACEHOLDER_RE = /(your[-_ ]|<[^>]+>|change[-_]?me|xxxx|example\.(com|test)|^\.\.\.$|^changeme$)/i

export function isPlaceholder(value) {
  return !value || PLACEHOLDER_RE.test(String(value).trim())
}

/** Parser .env sin dependencias (soporta comillas, comentarios y CRLF). */
export function parseEnvFile(text) {
  const out = {}
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim().replace(/^export\s+/, '')
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function checkFormat(spec, value) {
  const v = String(value).trim()
  if (!spec.format) return null
  switch (spec.format) {
    case 'https-url': {
      try {
        const u = new URL(v)
        if (u.protocol !== 'https:') return 'debe usar https://'
      } catch {
        return 'no es una URL válida'
      }
      return null
    }
    case 'origin': {
      try {
        const u = new URL(v)
        if (u.protocol !== 'http:' && u.protocol !== 'https:') return 'debe ser http(s)://'
        if (u.pathname !== '/' || u.search || u.hash) return 'no debe incluir path, query ni hash'
      } catch {
        return 'no es una URL válida'
      }
      return null
    }
    case 'hostname': {
      if (/^[a-z]+:\/\//i.test(v)) return 'no debe incluir scheme'
      if (v.includes('/') || v.includes(':')) return 'no debe incluir path ni puerto'
      return null
    }
    case 'email':
      return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? null : 'no es un email válido'
    case 'digits':
      return /^\d{8,15}$/.test(v) ? null : 'debe ser solo dígitos (ej. 56912345678)'
    case 'rut':
      return /^\d{1,8}-[\dkK]$/.test(v) ? null : 'formato esperado: 76123456-0 (sin puntos, con guion)'
    case 'integer':
      return /^\d+$/.test(v) && Number(v) > 0 ? null : 'debe ser un entero positivo'
    case 'min-length':
      return v.length >= (spec.minLength ?? 1) ? null : `largo mínimo ${spec.minLength}`
    case 'exact-length':
      return v.length === (spec.minLength ?? 0) ? null : `debe tener exactamente ${spec.minLength} caracteres`
    default:
      if (spec.format.startsWith('enum:')) {
        const allowed = spec.format.slice(5).split('|')
        return allowed.includes(v) ? null : `valores permitidos: ${allowed.join(', ')}`
      }
      return null
  }
}

/**
 * Valida un mapa de variables contra el esquema para un entorno.
 * @returns {{target:string, ok:boolean, rows:Array, missingRequired:string[], invalidRequired:string[]}}
 */
export function validateEnv(env, target) {
  if (!TARGETS.includes(target)) {
    throw new Error(`Entorno desconocido: ${target}. Usar uno de: ${TARGETS.join(', ')}`)
  }
  const rows = []
  for (const spec of ENV_SCHEMA) {
    const level = spec.level[target]
    const raw = env[spec.name]
    const value = typeof raw === 'string' ? raw.trim() : ''
    const present = value.length > 0
    let status
    let problem = null

    if (level === 'unused') {
      status = present ? 'unused-set' : 'unused'
    } else if (!present) {
      status = level === 'required' ? 'missing' : 'absent'
    } else if (isPlaceholder(value)) {
      status = 'placeholder'
      problem = 'valor de ejemplo/placeholder'
    } else {
      problem = checkFormat(spec, value)
      status = problem ? 'invalid' : 'ok'
    }
    rows.push({ name: spec.name, level, status, problem, secret: spec.secret, phase: spec.phase, note: spec.note, length: value.length })
  }

  const missingRequired = rows.filter((r) => r.status === 'missing' && r.level === 'required').map((r) => r.name)
  const invalidRequired = rows.filter(
    (r) => (r.status === 'invalid' || r.status === 'placeholder') && r.level === 'required'
  ).map((r) => `${r.name} (${r.problem})`)

  return { target, ok: missingRequired.length === 0 && invalidRequired.length === 0, rows, missingRequired, invalidRequired }
}

export function maskValue(value) {
  if (!value) return ''
  const v = String(value)
  if (v.length <= 8) return '********'
  return `${v.slice(0, 4)}…${v.slice(-2)} (${v.length} chars)`
}

export function formatReport(report, { showValues = false, env = {} } = {}) {
  const icon = { ok: 'OK  ', missing: 'FALTA', absent: '--  ', invalid: 'MAL ', placeholder: 'PLACE', 'unused-set': 'OJ O', unused: 'n/a ' }
  const lines = []
  lines.push(`Entorno: ${report.target}  |  resultado: ${report.ok ? 'PASS' : 'FAIL'}`)
  lines.push('')
  lines.push('variable'.padEnd(34) + 'nivel'.padEnd(13) + 'fase'.padEnd(9) + 'estado'.padEnd(7) + (showValues ? 'valor' : ''))
  lines.push('-'.repeat(showValues ? 96 : 70))
  for (const r of report.rows) {
    const detail = r.status === 'invalid' || r.status === 'placeholder' ? `  ← ${r.problem}` : ''
    lines.push(
      r.name.padEnd(34) +
        r.level.padEnd(13) +
        r.phase.padEnd(9) +
        (icon[r.status] ?? r.status).padEnd(7) +
        (showValues ? maskValue(env[r.name]) : '') +
        detail
    )
  }
  if (report.missingRequired.length || report.invalidRequired.length) {
    lines.push('')
    lines.push('BLOQUEANTES:')
    for (const m of report.missingRequired) lines.push(`  - falta ${m}`)
    for (const m of report.invalidRequired) lines.push(`  - inválida ${m}`)
  }
  const unusedSet = report.rows.filter((r) => r.status === 'unused-set').map((r) => r.name)
  if (unusedSet.length) {
    lines.push('')
    lines.push(`Aviso: configuradas pero sin uso en el código: ${unusedSet.join(', ')}`)
  }
  return lines.join('\n')
}
