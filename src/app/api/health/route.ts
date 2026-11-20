import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Ping Supabase — consultar tabla global (sin datos de tenant)
    const { error } = await supabase.from('subscription_tiers').select('id').limit(1)

    if (error) {
      return NextResponse.json({
        ok: false,
        db: 'supabase',
        error: error.message,
      }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      db: process.env.DB_MODE ?? 'supabase',
      message: 'AustralPOS API funcionando correctamente',
      timestamp: new Date().toISOString(),
    })
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: errorMessage(e) }, { status: 503 })
  }
}
