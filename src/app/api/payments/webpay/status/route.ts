import { NextResponse } from 'next/server'
import { tx } from '@/lib/payments/transbank'
import { createClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
  }

  try {
    const response = await tx.commit(token)

    if (response.vci === 'TSY' && response.status === 'AUTHORIZED') {
      const orderId = response.buy_order.replace(/^ORD-/, '').replace(/-.*$/, '')

      await (await createClient())
        .from('orders')
        .update({
          status: 'PAID',
          payment_data: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)

      return NextResponse.json({
        status: 'AUTHORIZED' as const,
        authorizationCode: response.authorization_code,
        amount: response.amount,
        buyOrder: response.buy_order,
        cardNumber: response.card_detail?.card_number
      })
    }

    if (response.status === 'REVERSED' || response.vci === 'TSN') {
      return NextResponse.json({ status: 'REJECTED' as const })
    }

    return NextResponse.json({ status: 'PENDING' as const })

  } catch (error: any) {
    if (error.message?.includes('Token already used') || error.message?.includes('not found')) {
      return NextResponse.json({
        status: 'UNKNOWN' as const,
        error: 'Token ya procesado o no encontrado'
      })
    }

    return NextResponse.json({
      status: 'ERROR' as const,
      error: error.message
    }, { status: 500 })
  }
}
