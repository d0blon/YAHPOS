import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { parseBody, parseQuery } from '@/lib/validations/http'
import { cashSessionOpenSchema, cashSessionQuerySchema } from '@/lib/validations/api'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

// GET - Find active session by user ID or terminal
export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsedQuery = parseQuery(req, cashSessionQuerySchema)
    if ('error' in parsedQuery) return parsedQuery.error
    const terminalId = parsedQuery.data.terminal_id

    let query = auth.supabase
      .from('cash_sessions')
      .select('id, store_id, terminal_id, cashier_name, opening_amount, status, opened_at, terminals(name)')
      .eq('status', 'open')
      .eq('store_id', auth.storeId)
      .eq('user_id', auth.user.id)
      .order('opened_at', { ascending: false })
      .limit(1)

    if (terminalId) query = query.eq('terminal_id', terminalId)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ session: null, tableExists: false })
    }

    return NextResponse.json({ session: data?.[0] ?? null, tableExists: true })
  } catch (error: unknown) {
    console.error('[GET /api/cash-sessions] Error:', error)
    return NextResponse.json({ error: errorMessage(error) || 'Error interno del servidor' }, { status: 500 })
  }
}

// POST - Open a new cash session
export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, cashSessionOpenSchema)
    if ('error' in parsed) return parsed.error
    const { terminal_id: terminalId, cashier_name, opening_amount } = parsed.data

    // 1. Verificar disponibilidad del terminal (scoping por store_id de la sesión)
    const { data: terminal } = await auth.supabase
      .from('terminals')
      .select('name, status, current_user_id')
      .eq('id', terminalId)
      .eq('store_id', auth.storeId)
      .single()

    if (terminal?.status === 'open' && terminal.current_user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Este terminal ya está siendo usado por otro cajero.' }, { status: 409 })
    }

    // 2. Cerrar cualquier sesión previa del usuario y LIBERAR sus terminales
    const { data: oldSessions } = await auth.supabase
      .from('cash_sessions')
      .select('terminal_id')
      .eq('user_id', auth.user.id)
      .eq('status', 'open')
      .eq('store_id', auth.storeId)

    if (oldSessions && oldSessions.length > 0) {
      // 2.1 Cerrar sesiones
      await auth.supabase
        .from('cash_sessions')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('user_id', auth.user.id)
        .eq('status', 'open')
        .eq('store_id', auth.storeId)

      // 2.2 Liberar terminales
      const oldTerminalIds = oldSessions.map(s => s.terminal_id)
      await auth.supabase
        .from('terminals')
        .update({ status: 'active', current_user_id: null })
        .in('id', oldTerminalIds)
        .eq('store_id', auth.storeId)
    }

    // 3. Crear nueva sesión
    const { data: session, error: sessionError } = await auth.supabase
      .from('cash_sessions')
      .insert([{
        terminal_id: terminalId,
        cashier_name,
        user_id: auth.user.id,
        store_id: auth.storeId,
        opening_amount,
        status: 'open',
      }])
      .select('id, store_id, terminal_id, user_id, cashier_name, opening_amount, status, opened_at')
      .single()

    if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 })

    // 4. BLOQUEAR TERMINAL
    await auth.supabase
      .from('terminals')
      .update({
        status: 'open',
        current_user_id: auth.user.id
      })
      .eq('id', terminalId)
      .eq('store_id', auth.storeId)

    // 5. ACTUALIZAR AREA EN PERFIL
    await auth.supabase
      .from('profiles')
      .update({ current_area: terminal?.name ?? 'Caja' })
      .eq('id', auth.user.id)
      .eq('store_id', auth.storeId)

    return NextResponse.json(session, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/cash-sessions] Error:', error)
    return NextResponse.json({ error: errorMessage(error) || 'Error interno del servidor' }, { status: 500 })
  }
}
