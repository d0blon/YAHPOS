/**
 * Fuente única de verdad para las variables de entorno de YAHPOS!.
 *
 * - `ENV_SPEC` describe cada variable (propósito, entornos donde es obligatoria,
 *   si es secreta, ejemplo y validador de formato). `docs/env.md` replica esta
 *   tabla para humanos y `.env.example` es la plantilla para copiar.
 * - `validateEnv()` es puro: recibe el `source` (por defecto `process.env`) y
 *   devuelve TODOS los problemas juntos, sin lanzar.
 * - `assertEnv()` lanza `EnvValidationError` con un mensaje legible. Se invoca
 *   en `next.config.ts` (build) y en `src/instrumentation.ts` (arranque del
 *   servidor), de modo que un deploy con configuración incompleta falla fuerte
 *   en vez de degradarse en silencio.
 *
 * No importar desde componentes de cliente: el módulo menciona secretos de
 * servidor. Los componentes de cliente ya leen `process.env.NEXT_PUBLIC_*`
 * directamente (Next los inlinea en build).
 */

export type EnvPhase = 'build' | 'runtime'
export type EnvTarget = 'development' | 'test' | 'production'

export interface EnvRequirement {
  build: boolean
  development: boolean
  production: boolean
}

export interface EnvVarSpec {
  name: string
  scope: 'public' | 'server'
  secret: boolean
  requirement: EnvRequirement
  /** Se avisa (no se aborta) si falta en los entornos indicados. */
  recommended?: EnvRequirement
  description: string
  example: string
  /** Devuelve un mensaje de error, o `null` si el valor es válido. */
  validate?: (value: string) => string | null
}

export type EnvSource = Readonly<Record<string, string | undefined>>

export interface EnvIssue {
  name: string
  message: string
}

export interface EnvValidationResult {
  ok: boolean
  phase: EnvPhase
  target: EnvTarget
  errors: EnvIssue[]
  warnings: EnvIssue[]
}

const requiredEverywhere: EnvRequirement = { build: true, development: true, production: true }
const runtimeRequiredInProduction: EnvRequirement = { build: false, development: false, production: true }
const recommendedInProduction: EnvRequirement = { build: false, development: false, production: true }
const optional: EnvRequirement = { build: false, development: false, production: false }

function isHttpUrl(value: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return 'no es una URL válida'
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'debe usar protocolo http(s)'
  }
  return null
}

function isHttpOrigin(value: string): string | null {
  const urlError = isHttpUrl(value)
  if (urlError) return urlError
  const parsed = new URL(value)
  if (parsed.username || parsed.password) return 'no debe incluir credenciales embebidas'
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    return 'debe ser solo el origin, sin path, query ni hash (ej: https://app.ejemplo.cl)'
  }
  return null
}

function exactLength(expected: number): (value: string) => string | null {
  return (value) =>
    value.length === expected
      ? null
      : `debe tener exactamente ${expected} caracteres (actual: ${value.length})`
}

function minLength(min: number): (value: string) => string | null {
  return (value) => (value.length >= min ? null : `debe tener al menos ${min} caracteres (actual: ${value.length})`)
}

function oneOf(allowed: readonly string[]): (value: string) => string | null {
  return (value) =>
    allowed.includes(value) ? null : `valor no soportado (permitidos: ${allowed.join(', ')})`
}

function isEmail(value: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'no parece un correo válido'
}

function isHostname(value: string): string | null {
  if (/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(value) && !value.includes('..')) return null
  return 'debe ser solo un hostname (sin scheme, puerto, path ni espacios)'
}

function isChileanWhatsApp(value: string): string | null {
  return /^569\d{8}$/.test(value) ? null : 'formato esperado: 569XXXXXXXX (sin + ni espacios)'
}

function isUuid(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? null
    : 'no es un UUID válido'
}

function isChileanRut(value: string): string | null {
  return /^\d{1,8}-[\dkK]$/.test(value) ? null : 'formato esperado: 76123456-0 (sin puntos, con guion)'
}

function isPositiveInteger(value: string): string | null {
  return /^\d+$/.test(value) && Number(value) > 0 ? null : 'debe ser un entero positivo'
}

export const ENV_SPEC: readonly EnvVarSpec[] = [
  // --- Supabase -------------------------------------------------------------
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    scope: 'public',
    secret: false,
    requirement: requiredEverywhere,
    description: 'URL del proyecto Supabase. Se inlinea en el bundle del navegador.',
    example: 'https://tu-proyecto.supabase.co',
    validate: isHttpUrl,
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    scope: 'public',
    secret: false,
    requirement: requiredEverywhere,
    description: 'Anon key de Supabase (pública por diseño; RLS protege los datos).',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    scope: 'server',
    secret: true,
    requirement: { build: false, development: true, production: true },
    description: 'Service role key. Bypassa RLS: solo servidor (createAdminClient).',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  },

  // --- Multi-tenant ---------------------------------------------------------
  {
    name: 'NEXT_PUBLIC_ROOT_ORIGIN',
    scope: 'public',
    secret: false,
    requirement: requiredEverywhere,
    description: 'Origin raíz para login SSO y /api/auth/sso. Si falta, el proxy falla cerrado (500).',
    example: 'https://app.yahpos.cl',
    validate: isHttpOrigin,
  },
  {
    name: 'NEXT_PUBLIC_ROOT_DOMAIN',
    scope: 'public',
    secret: false,
    requirement: optional,
    recommended: recommendedInProduction,
    description: 'Host CNAME destino del root (sin scheme ni puerto) para resolver tenant por dominio. D-001: valor pendiente del dueño.',
    example: 'root.yahpos.cl',
    validate: isHostname,
  },

  // --- Contacto -------------------------------------------------------------
  {
    name: 'NEXT_PUBLIC_SUPPORT_EMAIL',
    scope: 'public',
    secret: false,
    requirement: optional,
    recommended: recommendedInProduction,
    description: 'Correo público de soporte (footer, upgrade y editor). D-001: valor pendiente del dueño.',
    example: 'soporte@yahpos.cl',
    validate: isEmail,
  },
  {
    name: 'NEXT_PUBLIC_SUPPORT_WHATSAPP',
    scope: 'public',
    secret: false,
    requirement: optional,
    description: 'WhatsApp público de soporte. Default en código: 56912345678.',
    example: '56912345678',
    validate: isChileanWhatsApp,
  },

  // --- Seguridad ------------------------------------------------------------
  {
    name: 'SECURITY_SALT',
    scope: 'server',
    secret: true,
    requirement: runtimeRequiredInProduction,
    description: 'Salt de scrypt para cifrar el secreto maestro (panel developer).',
    example: 'salt-aleatorio-largo',
    validate: minLength(16),
  },
  {
    name: 'SII_ENCRYPTION_KEY',
    scope: 'server',
    secret: true,
    requirement: runtimeRequiredInProduction,
    description: 'Clave AES-256-GCM para CAF y certificados SII.',
    example: '0123456789abcdef0123456789abcdef',
    validate: exactLength(32),
  },

  // --- SII (verificación y apuntamiento) ------------------------------------
  {
    name: 'SII_ENV',
    scope: 'server',
    secret: false,
    requirement: optional,
    description:
      'Ambiente SII por defecto: certification → maullín, production → palena. ' +
      '`sii_config.environment` de cada tienda sigue mandando en el motor.',
    example: 'certification',
    validate: oneOf(['certification', 'production']),
  },
  {
    name: 'SII_BASE_URL',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'Override del host SII para un proxy/mock controlado. Vacío = host canónico de SII_ENV.',
    example: 'https://maullin.sii.cl',
    validate: isHttpOrigin,
  },
  {
    name: 'SII_CERT_PATH',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'Ruta al PFX/P12 de certificación para scripts. Fuera del repo (certs/ ignorado).',
    example: 'certs/sii/emisor.pfx',
  },
  {
    name: 'SII_CERT_PASSWORD',
    scope: 'server',
    secret: true,
    requirement: optional,
    description: 'Contraseña del PFX. Solo secret manager o .env.local; nunca en el repo ni en logs.',
    example: '********',
  },
  {
    name: 'SII_CERT_PFX_BASE64',
    scope: 'server',
    secret: true,
    requirement: optional,
    description: 'PFX en base64 para CI/secret manager. Si convive con SII_CERT_PATH, gana el base64.',
    example: 'MIIJ...',
  },
  {
    name: 'SII_CAF_DIR',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'Directorio con los CAF de certificación en disco (default certs/sii/caf).',
    example: 'certs/sii/caf',
  },
  {
    name: 'SII_RUT_EMISOR',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'RUT del emisor sin puntos. Cruza certificado, CAF y sii_config.rut_emisor.',
    example: '76123456-0',
    validate: isChileanRut,
  },
  {
    name: 'SII_TIMEOUT_MS',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'Timeout de red contra el SII en milisegundos (default 30000).',
    example: '30000',
    validate: isPositiveInteger,
  },
  {
    name: 'MASTER_KEY_ENCRYPTED',
    scope: 'server',
    secret: true,
    requirement: optional,
    recommended: recommendedInProduction,
    description: 'Secreto maestro cifrado (password + TOTP) del panel developer. Sin él, el login developer falla; el resto de la app opera.',
    example: 'iv:payload-cifrado',
  },
  {
    name: 'DEV_TOKEN_SECRET',
    scope: 'server',
    secret: true,
    requirement: runtimeRequiredInProduction,
    description: 'HMAC para la cookie del panel developer.',
    example: 'secreto-aleatorio-largo',
    validate: minLength(16),
  },

  // --- Rate limiting --------------------------------------------------------
  {
    name: 'UPSTASH_REDIS_REST_URL',
    scope: 'server',
    secret: false,
    requirement: runtimeRequiredInProduction,
    description: 'URL REST de Upstash Redis. Sin ella, el rate limit falla cerrado en producción.',
    example: 'https://tu-instancia.upstash.io',
    validate: isHttpUrl,
  },
  {
    name: 'UPSTASH_REDIS_REST_TOKEN',
    scope: 'server',
    secret: true,
    requirement: runtimeRequiredInProduction,
    description: 'Token REST de Upstash Redis.',
    example: 'AXxxASQg...',
  },

  // --- Integraciones opcionales --------------------------------------------
  {
    name: 'BLUMI_SANDBOX_URL',
    scope: 'server',
    secret: false,
    requirement: runtimeRequiredInProduction,
    description: 'Base URL del cliente Blumi (DTE). Obligatoria en producción (fail-closed).',
    example: 'https://dte.blumi.cl/api/v1/sandbox',
    validate: isHttpUrl,
  },
  {
    name: 'OPENAI_API_KEY',
    scope: 'server',
    secret: true,
    requirement: optional,
    description: 'OpenAI para funciones de IA. Si falta, esas funciones se deshabilitan.',
    example: 'sk-...',
  },
  {
    name: 'GEMINI_API_KEY',
    scope: 'server',
    secret: true,
    requirement: optional,
    description: 'Gemini para lectura de facturas de proveedor (OCR).',
    example: 'AIza...',
  },

  // --- Comportamiento -------------------------------------------------------
  {
    name: 'PAYMENT_PROVIDER',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: "Proveedor de pagos. Solo 'flow' cambia el comportamiento; el resto usa Transbank.",
    example: 'transbank',
    validate: oneOf(['transbank', 'flow']),
  },
  {
    name: 'DB_MODE',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: "Etiqueta informativa de /api/health. Solo 'supabase' está implementado.",
    example: 'supabase',
    validate: oneOf(['supabase']),
  },

  // --- Solo scripts ---------------------------------------------------------
  {
    name: 'SUPABASE_URL',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'Alias legado de NEXT_PUBLIC_SUPABASE_URL leído por scripts sueltos (*.mjs).',
    example: 'https://tu-proyecto.supabase.co',
    validate: isHttpUrl,
  },
  {
    name: 'STORE_ID',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'ID de tienda para scripts de seed/validación (no lo usa la app en runtime).',
    example: '00000000-0000-0000-0000-000000000000',
    validate: isUuid,
  },
  {
    name: 'TEST_USER_PASSWORD',
    scope: 'server',
    secret: true,
    requirement: optional,
    description: 'Password del usuario de pruebas creado por scripts/setup_test_user.mjs.',
    example: 'change-me',
  },
  {
    name: 'ALLOW_SIGNUP_PROBE',
    scope: 'server',
    secret: false,
    requirement: optional,
    description: 'Habilita la probe destructiva de signup (scripts/test_signup_store_metadata.mjs).',
    example: '0',
    validate: oneOf(['0', '1']),
  },
]

const PLACEHOLDER_PATTERN =
  /^(your[-_ ]|change[-_ ]?me|xxx+|\.\.\.|<[^>]*>|sk-your|tu-|ejemplo-|example-)/i

function looksLikePlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value.trim()) || /your[-_]|placeholder/i.test(value)
}

function resolveTarget(explicit?: EnvTarget): EnvTarget {
  if (explicit) return explicit
  const nodeEnv = process.env.NODE_ENV
  if (nodeEnv === 'production') return 'production'
  if (nodeEnv === 'test') return 'test'
  return 'development'
}

function isRequired(spec: EnvVarSpec, phase: EnvPhase, target: EnvTarget): boolean {
  if (phase === 'build') return spec.requirement.build
  if (target === 'production') return spec.requirement.production
  if (target === 'development') return spec.requirement.development
  return false
}

function labelFor(phase: EnvPhase, target: EnvTarget): string {
  return phase === 'build' ? 'build' : target
}

/**
 * Valida el entorno y devuelve todos los problemas juntos. No lanza.
 * En `target: 'test'` no valida nada: los tests definen sus propias variables.
 */
export function validateEnv(options: {
  phase?: EnvPhase
  target?: EnvTarget
  source?: EnvSource
} = {}): EnvValidationResult {
  const phase = options.phase ?? 'runtime'
  const target = resolveTarget(options.target)
  const source = options.source ?? process.env
  const errors: EnvIssue[] = []
  const warnings: EnvIssue[] = []

  if (target === 'test') {
    return { ok: true, phase, target, errors, warnings }
  }

  for (const spec of ENV_SPEC) {
    if (spec.scope === 'public' && spec.secret) {
      errors.push({ name: spec.name, message: 'error interno: una variable pública no puede ser secreta' })
      continue
    }

    const required = isRequired(spec, phase, target)
    const raw = source[spec.name]
    const value = typeof raw === 'string' ? raw.trim() : ''
    const where = labelFor(phase, target)

    if (!value) {
      if (required) {
        errors.push({ name: spec.name, message: `faltante (obligatoria en ${where})` })
      } else if (phase === 'runtime' && target === 'production' && spec.recommended?.production) {
        warnings.push({
          name: spec.name,
          message: 'recomendada en production; sin valor se usa el fallback del código (D-001: pedir valor real al dueño)',
        })
      }
      continue
    }

    if (looksLikePlaceholder(value)) {
      if (required) {
        errors.push({
          name: spec.name,
          message: `sigue con el valor de ejemplo de .env.example (obligatoria en ${where})`,
        })
      } else {
        warnings.push({ name: spec.name, message: 'tiene un valor de ejemplo/placeholder' })
      }
      continue
    }

    if (spec.validate) {
      const problem = spec.validate(value)
      if (problem) {
        if (required || target === 'production') {
          errors.push({ name: spec.name, message: problem })
        } else {
          warnings.push({ name: spec.name, message: problem })
        }
      }
    }
  }

  return { ok: errors.length === 0, phase, target, errors, warnings }
}

export class EnvValidationError extends Error {
  readonly issues: EnvIssue[]

  constructor(issues: EnvIssue[], phase: EnvPhase, target: EnvTarget) {
    const header = `[env] Configuración inválida (${labelFor(phase, target)}): ${issues.length} problema(s)`
    const body = issues.map((issue) => `  ✗ ${issue.name} — ${issue.message}`).join('\n')
    super(
      `${header}\n\n${body}\n\n` +
        'Revisa .env.example (plantilla) y docs/env.md (inventario y cómo obtener cada valor).\n' +
        'En local: copia .env.example a .env.local y completa los valores.'
    )
    this.name = 'EnvValidationError'
    this.issues = issues
  }
}

function validationDisabled(target: EnvTarget): boolean {
  // Escape hatch solo para entornos locales; producción nunca se salta.
  return target !== 'production' && process.env.SKIP_ENV_VALIDATION === '1'
}

/**
 * Lanza `EnvValidationError` si falta o es inválida alguna variable obligatoria.
 * Imprime los warnings (variables opcionales mal formadas) sin cortar el arranque.
 */
export function assertEnv(options: {
  phase?: EnvPhase
  target?: EnvTarget
  source?: EnvSource
} = {}): void {
  const target = resolveTarget(options.target)
  if (validationDisabled(target)) return

  const result = validateEnv({ ...options, target })

  for (const warning of result.warnings) {
    console.warn(`[env] ${warning.name}: ${warning.message}`)
  }

  if (!result.ok) {
    throw new EnvValidationError(result.errors, result.phase, result.target)
  }
}
