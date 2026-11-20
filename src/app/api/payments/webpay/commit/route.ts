import { NextResponse } from 'next/server'
import { getTransbankClient } from '@/lib/payments/transbank'
import { withAuth } from '@/lib/api-utils'
import { parseBody } from '@/lib/validations/http'
import { tokenWsSchema } from '@/lib/validations/api'

export async function POST(req: Request) {
  try {
    // Fail closed: la tienda se resuelve desde la sesión, nunca desde el token.
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, tokenWsSchema)
    if ('error' in parsed) return parsed.error
    const { token_ws } = parsed.data

    const tx = await getTransbankClient(auth.storeId)
    const response = await tx.commit(token_ws)

    // Si la transacción fue exitosa (vci === 'TSY')
    if (response.vci === 'TSY' && response.status === 'AUTHORIZED') {
      // El buy_order es ORD-ID-RANDOM, extraemos el ID
      const orderId = response.buy_order.replace(/^ORD-/, '').replace(/-.*$/, '');

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
        console.error('[Webpay Commit] Error actualizando orden')
      }

      return NextResponse.json({
        success: true,
        orderId,
        amount: response.amount,
        authorizationCode: response.authorization_code
      })
    }

    return NextResponse.json({
      success: false,
      error: 'Transacción no autorizada',
      response
    })
  } catch (error) {
    console.error('[Webpay Commit Error]', error instanceof Error ? error.message : 'error desconocido');
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
