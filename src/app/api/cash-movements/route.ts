import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Valida si un string es un UUID válido
function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    // La tabla cash_movements.session_id es UUID → si el POS envía un timestamp numérico
    // (sesión local sin cash_session creada), devolvemos array vacío sin error
    if (!isValidUUID(sessionId)) {
      return NextResponse.json([])
    }

    const { data, error } = await supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[GET /api/cash-movements] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()

    const { 
      sessionId, 
      type, 
      category, 
      amount, 
      reason, 
      cashier 
    } = body

    if (!sessionId || !type || !category || !amount || !cashier) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Si el sessionId no es UUID válido, no se puede insertar en cash_movements
    if (!isValidUUID(sessionId)) {
      return NextResponse.json(
        { error: 'El movimiento de caja requiere una sesión de caja activa (UUID). Abrí primero una caja.' },
        { status: 422 }
      )
    }

    const { data, error } = await supabase
      .from('cash_movements')
      .insert([{
        session_id: sessionId,
        type,
        category,
        amount,
        reason,
        cashier_name: cashier
      }])
      .select()
      .single()

    if (error) {
      console.error('[API /cash-movements] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/cash-movements] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
