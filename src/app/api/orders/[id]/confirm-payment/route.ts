import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id: orderId } = await params

    const { error } = await auth.supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .eq('store_id', auth.storeId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Pago confirmado y pedido actualizado' })
  } catch (error: any) {
    console.error('[Confirm Payment Error]:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
