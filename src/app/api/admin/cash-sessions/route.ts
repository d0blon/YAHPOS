import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { roleIn } from '@/lib/constants/roles'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

const CASH_SESSION_ADMIN_ROLES = ['owner', 'admin', 'manager', 'developer'] as const

export async function GET() {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    if (!roleIn(auth.profile.role, CASH_SESSION_ADMIN_ROLES)) {
      return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 })
    }

    const { data: sessions, error } = await auth.supabase
      .from('cash_sessions')
      .select(`
        *,
        terminals (name)
      `)
      .eq('store_id', auth.storeId)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(sessions)
  } catch (error: unknown) {
    console.error('[GET /api/admin/cash-sessions] Error:', error)
    return NextResponse.json({ error: errorMessage(error) || 'Error interno del servidor' }, { status: 500 })
  }
}
