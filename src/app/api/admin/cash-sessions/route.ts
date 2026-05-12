import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    // 1. Verificar rol y store_id
    const { data: userStore } = await supabase
      .from('user_stores')
      .select('store_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin', 'manager', 'developer'])
      .eq('is_active', true)
      .single()

    if (!userStore) {
      return NextResponse.json({ error: 'Acceso restringido a administradores' }, { status: 403 })
    }

    // 2. Obtener todas las sesiones abiertas de la tienda
    const { data: sessions, error } = await supabase
      .from('cash_sessions')
      .select(`
        *,
        terminals (name)
      `)
      .eq('store_id', userStore.store_id)
      .eq('status', 'open')
      .order('opened_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(sessions)
  } catch (error: any) {
    console.error('[GET /api/admin/cash-sessions] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
