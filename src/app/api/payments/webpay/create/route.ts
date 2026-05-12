import { NextResponse } from 'next/server'
import { tx } from '@/lib/payments/transbank'

export async function POST(req: Request) {
  try {
    const { orderId, amount, returnUrl } = await req.json()

    console.log(`[Webpay] Creando transacción para orden ${orderId} por $${amount}`)

    // El monto debe ser entero para Webpay Plus
    const buyOrder = `ORD-${orderId}-${Math.floor(Math.random() * 1000)}`;
    const sessionId = `SES-${Date.now()}`;
    
    const response = await tx.create(
      buyOrder,
      sessionId,
      Math.round(amount),
      returnUrl
    );

    return NextResponse.json({
      url: response.url,
      token: response.token
    })
  } catch (error: any) {
    console.error('[Webpay Create Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
