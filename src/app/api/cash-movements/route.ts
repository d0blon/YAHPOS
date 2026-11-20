import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { parseBody, parseQuery } from '@/lib/validations/http'
import { cashMovementQuerySchema, cashMovementSchema } from '@/lib/validations/api'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

function isValidUUID(str: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsedQuery = parseQuery(req, cashMovementQuerySchema)
    if ('error' in parsedQuery) return parsedQuery.error
    const sessionId = parsedQuery.data.session_id

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    if (!isValidUUID(sessionId)) {
      return NextResponse.json([])
    }

    const { data, error } = await auth.supabase
      .from('cash_movements')
      .select('id, store_id, session_id, type, category, amount, reason, cashier_name, created_at')
      .eq('session_id', sessionId)
      .eq('store_id', auth.storeId)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('[GET /api/cash-movements] Error:', error)
    return NextResponse.json({ error: errorMessage(error) || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, cashMovementSchema)
    if ('error' in parsed) return parsed.error

    const { sessionId, type, category, amount, reason, cashier } = parsed.data

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
      .select('id, store_id, session_id, type, category, amount, reason, cashier_name, created_at')
      .single()

    if (error) {
      console.error('[API /cash-movements] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/cash-movements] Error:', error)
    return NextResponse.json({ error: errorMessage(error) || 'Error interno del servidor' }, { status: 500 })
  }
}
