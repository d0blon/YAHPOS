import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'Perfil o tienda no encontrada' }, { status: 404 })
    }

    // Obtener los ingresos pendientes de la base de datos
    const { data: adjustments, error: adjError } = await supabase
      .from('pending_inventory_adjustments')
      .select('id, store_id, invoice_number, supplier_name, supplier_metadata, invoice_url, items, status, created_at, updated_at')
      .eq('store_id', profile.store_id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (adjError) {
      console.error('[GET pending adjustments error]:', adjError.message)
      return NextResponse.json({ error: adjError.message }, { status: 500 })
    }

    return NextResponse.json(adjustments)
  } catch (error: unknown) {
    console.error('[GET /api/admin/inventory/adjustments Error]:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
