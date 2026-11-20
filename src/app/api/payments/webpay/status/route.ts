import { NextResponse } from 'next/server'
import { getTransbankClient } from '@/lib/payments/transbank'
import { withAuth } from '@/lib/api-utils'
import { parseQuery } from '@/lib/validations/http'
import { paymentStatusQuerySchema } from '@/lib/validations/api'

export async function GET(req: Request) {
  try {
    // Fail closed: sin sesión o sin tienda no se consulta ni se escribe nada.
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = parseQuery(req, paymentStatusQuerySchema)
    if ('error' in parsed) return parsed.error
    const token = parsed.data.token

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const tx = await getTransbankClient(auth.storeId)
    const response = await tx.commit(token)

    if (response.vci === 'TSY' && response.status === 'AUTHORIZED') {
      const orderId = response.buy_order.replace(/^ORD-/, '').replace(/-.*$/, '')

      const { error: updateError } = await auth.supabase
        .from('orders')
        .update({
          status: 'PAID',
          payment_data: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('store_id', auth.storeId)

      if (updateError) {
        console.error('[Webpay Status] Error actualizando orden')
      }

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

  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Token already used') || message.includes('not found')) {
      return NextResponse.json({
        status: 'UNKNOWN' as const,
        error: 'Token ya procesado o no encontrado'
      })
    }

    return NextResponse.json({
      status: 'ERROR' as const,
      error: message || 'Error interno'
    }, { status: 500 })
  }
}
