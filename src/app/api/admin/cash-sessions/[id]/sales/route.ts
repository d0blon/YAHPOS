import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

type Params = Promise<{ id: string }>

export async function GET(req: Request, { params }: { params: Params }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { id } = await params

    // Scoping multi-tenant: obtener store_id del perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    // 1. Obtener la sesión (scoping por store_id)
    let sessionQuery = supabase
      .from('cash_sessions')
      .select('id, store_id, opening_amount, cashier_name, opened_at, terminals(name)')
      .eq('id', id)
    
    if (profile?.store_id) {
      sessionQuery = sessionQuery.eq('store_id', profile.store_id)
    }
    const { data: session, error: sessionError } = await sessionQuery.single()

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

    // 3. Obtener totales de ventas desde orders (scoping por store_id)
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total, payment_method')
      .eq('cash_session_id', id)
      .eq('status', 'completed')
      .eq('store_id', session.store_id)

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

    // 4. Obtener movimientos de caja (scoping por store_id)
    const { data: movements, error: movementsError } = await supabase
      .from('cash_movements')
      .select('amount, type')
      .eq('session_id', id)
      .eq('store_id', session.store_id)

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
        terminal_name: (session.terminals as unknown as { name?: string } | null)?.name || 'Desconocido',
        cashier_name: session.cashier_name,
        opened_at: session.opened_at,
        opening_amount: openingAmount
      },
      totals,
      movements: movementTotals,
      expected_cash: expectedCash
    })
  } catch (error: unknown) {
    console.error('[GET /api/admin/cash-sessions/[id]/sales] Error:', error)
    return NextResponse.json({ error: errorMessage(error) || 'Error interno del servidor' }, { status: 500 })
  }
}
