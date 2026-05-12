import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

type Params = Promise<{ id: string }>

// PATCH - Close a session
export async function PATCH(req: Request, { params }: { params: Params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params
    const body = await req.json()

    // 1. Obtener la sesión y verificar permisos
    const { data: session } = await supabase
      .from('cash_sessions')
      .select('terminal_id, user_id, store_id')
      .eq('id', id)
      .single()

    if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

    // 1.1 Si no es el dueño de la sesión, verificar si es admin/manager/developer
    if (session.user_id !== user.id) {
      const { data: userStore } = await supabase
        .from('user_stores')
        .select('role')
        .eq('user_id', user.id)
        .eq('store_id', session.store_id)
        .in('role', ['owner', 'admin', 'manager', 'developer'])
        .eq('is_active', true)
        .single()

      if (!userStore) {
        return NextResponse.json({ error: 'No tiene permisos para cerrar esta sesión' }, { status: 403 })
      }
    }

    // 2. Cerrar la sesión
    const { data, error } = await supabase
      .from('cash_sessions')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closing_amount: body.closing_amount ?? null,
        total_cash_sales: body.total_cash_sales ?? 0,
        total_card_sales: body.total_card_sales ?? 0,
        total_transfer_sales: body.total_transfer_sales ?? 0,
        total_incomes: body.total_incomes ?? 0,
        total_expenses: body.total_expenses ?? 0,
        notes: body.notes ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // 3. LIBERAR EL TERMINAL
    if (session?.terminal_id) {
      await supabase
        .from('terminals')
        .update({
          status: 'active',
          current_user_id: null
        })
        .eq('id', session.terminal_id)
    }

    // 4. ACTUALIZAR AREA EN PERFIL A INACTIVO
    if (session?.user_id) {
      await supabase
        .from('profiles')
        .update({ current_area: 'Inactivo' })
        .eq('id', session.user_id)
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[PATCH /api/cash-sessions/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
