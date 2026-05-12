import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// GET - Find active session by user ID or terminal
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { searchParams } = new URL(req.url)
    const terminalId = searchParams.get('terminal_id')

    let query = supabase
      .from('cash_sessions')
      .select('*, terminals(name)')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1)

    // Priorizar búsqueda por user_id si está disponible
    if (user) {
      query = query.eq('user_id', user.id)
    } else {
      const cashierName = searchParams.get('cashier')
      if (cashierName) query = query.eq('cashier_name', cashierName)
    }
    
    if (terminalId) query = query.eq('terminal_id', terminalId)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ session: null, tableExists: false })
    }

    return NextResponse.json({ session: data?.[0] ?? null, tableExists: true })
  } catch (error: any) {
    console.error('[GET /api/cash-sessions] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Open a new cash session
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const terminalId = body.terminal_id

    // 1. Verificar disponibilidad del terminal
    const { data: terminal } = await supabase
      .from('terminals')
      .select('name, status, current_user_id')
      .eq('id', terminalId)
      .single()

    if (terminal?.status === 'open' && terminal.current_user_id !== user.id) {
      return NextResponse.json({ error: 'Este terminal ya está siendo usado por otro cajero.' }, { status: 409 })
    }

    // 2. Cerrar cualquier sesión previa del usuario y LIBERAR sus terminales
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    const { data: oldSessions } = await supabase
      .from('cash_sessions')
      .select('terminal_id')
      .eq('user_id', user.id)
      .eq('status', 'open')
      .eq('store_id', profile?.store_id)

    if (oldSessions && oldSessions.length > 0) {
      // 2.1 Cerrar sesiones
      await supabase
        .from('cash_sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('status', 'open')
        .eq('store_id', profile?.store_id)

      // 2.2 Liberar terminales
      const oldTerminalIds = oldSessions.map(s => s.terminal_id)
      await supabase
        .from('terminals')
        .update({ status: 'active', current_user_id: null })
        .in('id', oldTerminalIds)
        .eq('store_id', profile?.store_id)
    }

    // 3. Crear nueva sesión
    const { data: session, error: sessionError } = await supabase
      .from('cash_sessions')
      .insert([{
        terminal_id: terminalId,
        cashier_name: body.cashier_name,
        user_id: user.id,
        store_id: profile?.store_id,
        opening_amount: body.opening_amount,
        status: 'open',
      }])
      .select()
      .single()

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

    // 4. BLOQUEAR TERMINAL
    await supabase
      .from('terminals')
      .update({
        status: 'open',
        current_user_id: user.id
      })
      .eq('id', terminalId)
      .eq('store_id', profile?.store_id)

    // 5. ACTUALIZAR AREA EN PERFIL
    await supabase
      .from('profiles')
      .update({ current_area: terminal?.name ?? 'Caja' })
      .eq('id', user.id)

    return NextResponse.json(session, { status: 201 })
  } catch (error: any) {
    console.error('[POST /api/cash-sessions] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
