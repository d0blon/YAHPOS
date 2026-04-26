import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id: orderId } = await params

  try {
    const { error } = await supabase
      .from('orders')
      .update({
        status: 'processing',
        payment_status: 'paid',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Pago confirmado y pedido actualizado' })
  } catch (error: any) {
    console.error('[Confirm Payment Error]:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
