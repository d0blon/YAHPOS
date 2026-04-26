import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { token } = await req.json()

    console.log(`[Webpay] Confirmando transacción con token: ${token}`)

    // Simulación de respuesta exitosa de Transbank
    return NextResponse.json({
      status: 'AUTHORIZED',
      response_code: 0,
      amount: 1000, // En un caso real vendría del commit
      buy_order: 'ORD-MOCK',
      authorization_code: '123456'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
