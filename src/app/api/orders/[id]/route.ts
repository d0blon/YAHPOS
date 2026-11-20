import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await withAuth()
  if (auth.error) return auth.error

  const { id } = await params

  try {
    // Scoping multi-tenant obligatorio: store de la sesión, nunca del request.
    const { data, error } = await auth.supabase
      .from('orders')
      .select('id, store_id, user_id, branch_id, total, subtotal, discount, shipping_cost, service_fee, status, payment_method, payment_status, shipping_type, shipping_address_json, address, fulfillment_status, metadata, sii_document_id, sii_status, folio, created_at, updated_at')
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Validar que el usuario logueado sea el dueño de la orden o un admin/manager de la tienda
    if (data.user_id !== auth.user.id) {
      if (!['admin', 'manager', 'developer'].includes(auth.profile.role ?? '')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
