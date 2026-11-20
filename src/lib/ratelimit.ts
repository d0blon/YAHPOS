import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * Envoltura común para los tres límites. Reglas:
 *  - Con Redis configurado: se usa Upstash (distribuido, correcto en producción).
 *  - Sin Redis en desarrollo: limitador en memoria para no perder la protección.
 *  - Sin Redis en producción: FAIL CLOSED. Antes devolvía success:true y el
 *    login/registro quedaban sin límite alguno.
 *  - Si Redis falla en producción: FAIL CLOSED también.
 */

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
  /** Presente solo cuando el limitador no está disponible (fail-closed). */
  unavailable?: boolean
}

type Limiter = { limit: (identifier: string) => Promise<RateLimitResult> }

const isRedisConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
    process.env.UPSTASH_REDIS_REST_URL !== 'https://...' &&
    process.env.UPSTASH_REDIS_REST_TOKEN &&
    process.env.UPSTASH_REDIS_REST_TOKEN !== '...'
)

const redis = isRedisConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// Estado en memoria compartido vía globalThis: Next dev recarga módulos y un Map
// local se reinventaría en cada request, dejando el limitador sin efecto.
const memoryStore =
  (globalThis as typeof globalThis & { __yahposRateLimitBuckets?: Map<string, number[]> })
    .__yahposRateLimitBuckets ??
  new Map<string, number[]>()

;(globalThis as typeof globalThis & { __yahposRateLimitBuckets?: Map<string, number[]> })
  .__yahposRateLimitBuckets = memoryStore

function memoryLimiter(limit: number, windowMs: number, prefix: string): Limiter {
  return {
    limit: async (identifier: string) => {
      const now = Date.now()
      const key = `${prefix}${identifier}`
      const hits = (memoryStore.get(key) || []).filter((t) => now - t < windowMs)
      const allowed = hits.length < limit
      if (allowed) hits.push(now)
      if (hits.length) memoryStore.set(key, hits)
      else memoryStore.delete(key)
      return {
        success: allowed,
        limit,
        remaining: Math.max(0, limit - hits.length),
        reset: now + windowMs,
      }
    },
  }
}

function unavailable(limit: number): RateLimitResult {
  return {
    success: false,
    limit,
    remaining: 0,
    reset: Date.now() + 60_000,
    unavailable: true,
  }
}

function resolveLimiter(
  limit: number,
  windowMs: number,
  prefix: string,
  redisLimiter: Ratelimit | null
): Limiter {
  const fallback = memoryLimiter(limit, windowMs, prefix)

  return {
    limit: async (identifier: string) => {
      if (!redisLimiter) {
        if (process.env.NODE_ENV === 'production') return unavailable(limit)
        return fallback.limit(identifier)
      }
      try {
        const result = await redisLimiter.limit(identifier)
        return {
          success: result.success,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
        }
      } catch (error) {
        console.error(`[RateLimit] Fallo de Redis (${prefix}):`, error)
        if (process.env.NODE_ENV === 'production') return unavailable(limit)
        return fallback.limit(identifier)
      }
    },
  }
}

export const rateLimit = {
  critical: resolveLimiter(
    5,
    60_000,
    'rl:critical:',
    redis
      ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:critical:' })
      : null
  ),
  operational: resolveLimiter(
    100,
    15 * 60_000,
    'rl:ops:',
    redis
      ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '15 m'), prefix: 'rl:ops:' })
      : null
  ),
  public: resolveLimiter(
    1000,
    60 * 60_000,
    'rl:public:',
    redis
      ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(1000, '1 h'), prefix: 'rl:public:' })
      : null
  ),
}
