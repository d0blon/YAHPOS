import { NextResponse } from 'next/server'
import { tx } from '@/lib/payments/transbank'
import { createClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { token_ws } = await req.json()
    const supabase = await createClient()

    if (!token_ws) {
      return NextResponse.json({ error: 'Token no proporcionado' }, { status: 400 })
    }

    const response = await tx.commit(token_ws)

    // Si la transacción fue exitosa (vci === 'TSY')
    if (response.vci === 'TSY' && response.status === 'AUTHORIZED') {
      // Actualizar orden en Supabase
      // Nota: El buy_order es ORD-ID-RANDOM, extraemos el ID
      const orderId = response.buy_order.replace('ORD-', '');

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'PAID', 
          payment_data: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
         console.error('[Webpay Commit] Error actualizando orden:', updateError);
      }

      return NextResponse.json({
        success: true,
        orderId,
        amount: response.amount,
        authorizationCode: response.authorization_code
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Transacción no autorizada',
        response
      })
    }
  } catch (error: any) {
    console.error('[Webpay Commit Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
