import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 })

    const { data: terminals, error } = await supabase
      .from('terminals')
      .select(`
        *,
        current_user:profiles!current_user_id (first_name, last_name)
      `)
      .eq('store_id', profile.store_id)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    const { data: activeSessions } = await supabase
      .from('cash_sessions')
      .select('terminal_id, user_id, cashier_name')
      .is('closed_at', null)
      .eq('store_id', profile.store_id)

    const terminalsWithStatus = terminals.map(t => {
      const activeSession = activeSessions?.find(s => s.terminal_id === t.id)
      return {
        ...t,
        status: activeSession ? 'open' : 'closed',
        current_user_id: activeSession ? activeSession.user_id : null,
        current_user_name: activeSession ? activeSession.cashier_name : null
      }
    })

    return NextResponse.json(terminalsWithStatus)
  } catch (err: any) {
    console.warn('[terminals] Error:', err.message)
    return NextResponse.json([{ id: 1, name: 'Caja 1', description: 'Terminal principal', is_active: true, status: 'closed' }])
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user.id)
    .single()

  const body = await req.json()

  const { data, error } = await supabase
    .from('terminals')
    .insert([{
      name: body.name, 
      description: body.description ?? '',
      store_id: profile?.store_id
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
