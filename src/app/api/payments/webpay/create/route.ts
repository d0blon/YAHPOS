import { NextResponse } from 'next/server'
import { getTransbankClient } from '@/lib/payments/transbank'
import { withAuth } from '@/lib/api-utils'
import { parseBody } from '@/lib/validations/http'
import { webpayCreateSchema } from '@/lib/validations/api'

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, webpayCreateSchema)
    if ('error' in parsed) return parsed.error
    const { orderId, amount, returnUrl } = parsed.data

    // Si orderId corresponde a una orden real de e-commerce ya creada (siempre es el caso
    // para el checkout normal — createOrder() se llama ANTES que esto), usamos el total
    // real guardado en la DB y se ignora el `amount` que mande el cliente. El flujo
    // WEBPAY_QR del POS manda un orderId sintético (timestamp, no existe en `orders`
    // todavía en ese punto) — para ese caso se mantiene el comportamiento actual sin tocar,
    // fuera de alcance de este fix (POS es superficie de personal, no de cliente final).
    let finalAmount = amount

    const { data: existingOrder } = await auth.supabase
      .from('orders')
      .select('id, total, user_id, store_id')
      .eq('id', orderId)
      .eq('store_id', auth.storeId)
      .maybeSingle()

    if (existingOrder) {
      if (existingOrder.user_id !== auth.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
      finalAmount = existingOrder.total
    }

    console.log(`[Webpay] Creando transacción para orden ${orderId} por $${finalAmount}`)

    const tx = await getTransbankClient(auth.storeId);

    const buyOrder = `ORD-${orderId}-${Math.floor(Math.random() * 1000)}`;
    const sessionId = `SES-${Date.now()}`;
    
    const response = await tx.create(
      buyOrder,
      sessionId,
      Math.round(finalAmount),
      returnUrl
    );

    return NextResponse.json({
      url: response.url,
      token: response.token
    })
  } catch (error) {
    console.error('[Webpay Create Error]', error instanceof Error ? error.message : 'error desconocido');
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
