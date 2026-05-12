import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('pos_drafts')
      .select('*')
      .eq('user_id', auth.user.id)
      .eq('session_id', sessionId)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ draft: data || null })
  } catch (error: any) {
    console.error('[GET /api/pos/draft] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const body = await req.json()
    const { sessionId, cartData, suspendedOrdersData } = body

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 })
    }

    const { data, error } = await auth.supabase
      .from('pos_drafts')
      .upsert({
        session_id: sessionId,
        user_id: auth.user.id,
        cart_data: cartData,
        suspended_orders_data: suspendedOrdersData,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      })
      .select()

    if (error) {
      console.error('[POS DRAFT] Error upserting:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('[POST /api/pos/draft] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
