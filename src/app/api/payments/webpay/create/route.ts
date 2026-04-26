import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { orderId, amount, returnUrl } = await req.json()

    console.log(`[Webpay] Creando transacción para orden ${orderId} por $${amount}`)

    // Simulación de respuesta de Transbank
    // En producción aquí se usaría el SDK de Transbank
    return NextResponse.json({
      url: 'https://webpay3gint.transbank.cl/webpayserver/initTransaction',
      token_ws: `mock_webpay_token_${Date.now()}`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
