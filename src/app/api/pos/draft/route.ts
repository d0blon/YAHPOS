import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { parseBody, parseQuery } from '@/lib/validations/http'
import { posDraftQuerySchema, posDraftSchema } from '@/lib/validations/api'

export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsedQuery = parseQuery(req, posDraftQuerySchema)
    if ('error' in parsedQuery) return parsedQuery.error
    const sessionId = parsedQuery.data.sessionId

    const { data, error } = await auth.supabase
      .from('pos_drafts')
      .select('id, session_id, user_id, store_id, cart_data, suspended_orders_data, updated_at')
      .eq('user_id', auth.user.id)
      .eq('session_id', sessionId)
      .eq('store_id', auth.storeId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ draft: data || null })
  } catch (error) {
    console.error('[GET /api/pos/draft] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, posDraftSchema)
    if ('error' in parsed) return parsed.error
    const { sessionId, cartData, suspendedOrdersData } = parsed.data

    const { data, error } = await auth.supabase
      .from('pos_drafts')
      .upsert({
        session_id: sessionId,
        user_id: auth.user.id,
        store_id: auth.storeId,
        cart_data: cartData,
        suspended_orders_data: suspendedOrdersData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      })
      .select('id, session_id, user_id, store_id, updated_at')

    if (error) {
      console.error('[POS DRAFT] Error upserting:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[POST /api/pos/draft] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
  }
}
