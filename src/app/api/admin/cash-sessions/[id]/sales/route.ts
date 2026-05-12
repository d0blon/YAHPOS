import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

type Params = Promise<{ id: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    // 1. Obtener la sesión
    const { data: session, error: sessionError } = await supabase
      .from('cash_sessions')
      .select('*, terminals(name)')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    // 2. Verificar permisos (owner, admin, manager, developer)
    const { data: userStore } = await supabase
      .from('user_stores')
      .select('role')
      .eq('user_id', user.id)
      .eq('store_id', session.store_id)
      .in('role', ['owner', 'admin', 'manager', 'developer'])
      .eq('is_active', true)
      .single()

    if (!userStore) {
      return NextResponse.json({ error: 'No tiene permisos para ver estos datos' }, { status: 403 })
    }

    // 3. Obtener totales de ventas desde orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total, payment_method')
      .eq('cash_session_id', id)
      .eq('status', 'completed') // Asumiendo que solo ventas completadas cuentan

    if (ordersError) {
      return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 500 })
    }

    const totals = {
      cash: 0,
      card: 0,
      transfer: 0,
      total: 0,
      count: orders?.length || 0
    }

    orders?.forEach(order => {
      const amount = Number(order.total)
      totals.total += amount
      
      // Agrupar métodos de pago
      const method = order.payment_method?.toUpperCase()
      if (method === 'EFECTIVO') {
        totals.cash += amount
      } else if (['TARJETA', 'GETNET', 'TUU', 'SUMUP', 'COMPRAQUI'].includes(method)) {
        totals.card += amount
      } else if (method === 'TRANSFERENCIA') {
        totals.transfer += amount
      }
    })

    // 4. Obtener movimientos de caja
    const { data: movements, error: movementsError } = await supabase
      .from('cash_movements')
      .select('amount, type')
      .eq('session_id', id)

    if (movementsError) {
      return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
    }

    const movementTotals = {
      in: 0,
      out: 0
    }

    movements?.forEach(m => {
      const amount = Number(m.amount)
      if (m.type === 'IN') movementTotals.in += amount
      else if (m.type === 'OUT') movementTotals.out += amount
    })

    // 5. Calcular efectivo esperado
    const openingAmount = Number(session.opening_amount) || 0
    const expectedCash = openingAmount + totals.cash + movementTotals.in - movementTotals.out

    return NextResponse.json({
      session: {
        id: session.id,
        terminal_name: session.terminals?.name || 'Desconocido',
        cashier_name: session.cashier_name,
        opened_at: session.opened_at,
        opening_amount: openingAmount
      },
      totals,
      movements: movementTotals,
      expected_cash: expectedCash
    })
  } catch (error: any) {
    console.error('[GET /api/admin/cash-sessions/[id]/sales] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
