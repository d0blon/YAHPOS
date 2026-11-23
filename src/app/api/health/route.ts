import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

/**
 * Identidad del despliegue para el smoke test (scripts/smoke-deploy.mjs).
 * Vercel inyecta VERCEL_ENV ("production" | "preview" | "development") y
 * VERCEL_GIT_COMMIT_SHA en cada deployment. Fuera de Vercel se derivan de
 * NODE_ENV para que el chequeo también sirva en local/staging self-hosted.
 */
function deploymentEnv(): string {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV
  return process.env.NODE_ENV === 'production' ? 'production' : 'local'
}

function deploymentRelease(): string {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || ''
  return sha ? sha.slice(0, 12) : 'unknown'
}

export async function GET() {
  const identity = {
    env: deploymentEnv(),
    release: deploymentRelease(),
    region: process.env.VERCEL_REGION ?? null,
    uptimeSeconds: Math.round(process.uptime()),
  }
  try {
    const supabase = await createClient()
    
    // Ping Supabase — consultar tabla global (sin datos de tenant)
    const { error } = await supabase.from('subscription_tiers').select('id').limit(1)

    if (error) {
      return NextResponse.json({
        ok: false,
        db: 'supabase',
        checks: { db: 'fail' },
        error: error.message,
        ...identity,
      }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      db: process.env.DB_MODE ?? 'supabase',
      checks: { db: 'ok' },
      message: 'YAHPOS! API funcionando correctamente',
      timestamp: new Date().toISOString(),
      ...identity,
    })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: 503 })
  }
}
