import { createHmac, timingSafeEqual } from 'crypto'

/** Duración de la sesión del developer console (2 horas, igual que la cookie original). */
export const DEV_TOKEN_MAX_AGE = 60 * 60 * 2

const VERSION = 'v1'
const MAX_AGE_MS = DEV_TOKEN_MAX_AGE * 1000
const CLOCK_SKEW_MS = 60 * 1000

/**
 * Secreto para firmar el token developer. NUNCA un valor hardcodeado en producción.
 * En local se usa un valor de desarrollo; en producción se exige DEV_TOKEN_SECRET
 * (o, en su defecto, otro secreto servidor ya presente).
 */
function getSigningSecret(): string | null {
  const configured =
    process.env.DEV_TOKEN_SECRET ||
    process.env.MASTER_KEY_ENCRYPTED ||
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (configured && configured.length >= 16) return configured
  if (process.env.NODE_ENV === 'production') return null
  return 'local-dev-only-token-secret-not-for-production'
}

/**
 * Token opaco con firma HMAC y timestamp. Formato: v1.<issuedAtMs>.<hmacHex>.
 * No contiene datos sensibles; el timestamp permite expiración sin estado.
 */
export function createDevToken(): string | null {
  const secret = getSigningSecret()
  if (!secret) return null

  const issuedAt = Date.now().toString()
  const payload = `${VERSION}.${issuedAt}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${signature}`
}

/** Verifica firma, versión y expiración con comparación en tiempo constante. */
export function verifyDevToken(token?: string | null): boolean {
  if (!token) return false

  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== VERSION) return false

  const issuedAt = Number(parts[1])
  if (!Number.isSafeInteger(issuedAt) || issuedAt <= 0) return false

  const now = Date.now()
  if (now - issuedAt > MAX_AGE_MS || issuedAt > now + CLOCK_SKEW_MS) return false

  const secret = getSigningSecret()
  if (!secret) return false

  const expected = createHmac('sha256', secret)
    .update(`${VERSION}.${parts[1]}`)
    .digest('hex')

  const expectedBuffer = Buffer.from(expected, 'hex')
  const receivedBuffer = Buffer.from(parts[2], 'hex')
  if (expectedBuffer.length !== receivedBuffer.length) return false
  return timingSafeEqual(expectedBuffer, receivedBuffer)
}
