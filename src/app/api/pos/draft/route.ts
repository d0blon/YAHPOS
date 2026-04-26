import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('sessionId')

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('pos_drafts')
    .select('*')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is not found
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ draft: data || null })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { sessionId, cartData, suspendedOrdersData } = body

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID requerido' }, { status: 400 })
  }

  // Upsert the draft for this user and session
  const { data, error } = await supabase
    .from('pos_drafts')
    .upsert({
      session_id: sessionId,
      user_id: user.id,
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
}
