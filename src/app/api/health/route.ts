import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    // Ping Supabase
    const { error } = await supabase.from('products').select('id').limit(1)

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
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 503 })
  }
}
