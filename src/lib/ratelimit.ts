import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const isRedisConfigured = 
  process.env.UPSTASH_REDIS_REST_URL && 
  process.env.UPSTASH_REDIS_REST_URL !== 'https://...' &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_TOKEN !== '...';

const redis = isRedisConfigured 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const rateLimit = {
  critical: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    prefix: 'rl:critical:',
  }) : { limit: () => Promise.resolve({ success: true }) },
  operational: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    prefix: 'rl:ops:',
  }) : { limit: () => Promise.resolve({ success: true }) },
  public: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 h'),
    prefix: 'rl:public:',
  }) : { limit: () => Promise.resolve({ success: true }) },
}
