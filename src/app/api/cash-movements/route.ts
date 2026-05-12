import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!isValidUUID(sessionId)) {
      return NextResponse.json([])
    }

    const { data, error } = await auth.supabase
      .from('cash_movements')
      .select('*')
      .eq('session_id', sessionId)
      .eq('store_id', auth.storeId)
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
    const auth = await withAuth()
    if (auth.error) return auth.error

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

    if (!isValidUUID(sessionId)) {
      return NextResponse.json(
        { error: 'El movimiento de caja requiere una sesión de caja activa (UUID). Abrí primero una caja.' },
        { status: 422 }
      )
    }

    const { data, error } = await auth.supabase
      .from('cash_movements')
      .insert([{
        session_id: sessionId,
        type,
        category,
        amount,
        reason,
        cashier_name: cashier,
        store_id: auth.storeId
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
