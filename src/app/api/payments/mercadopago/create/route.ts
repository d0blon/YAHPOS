import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { decrypt } from '@/lib/crypto'
import crypto from 'crypto'
import { parseBody } from '@/lib/validations/http'
import { amountSchema } from '@/lib/validations/api'

const MP_BASE_URL = 'https://api.mercadopago.com'

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, amountSchema)
    if ('error' in parsed) return parsed.error
    const { amount } = parsed.data

    const { data: settingsRows } = await auth.supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', auth.storeId)
      .in('key', ['payment_mercadopago_access_token', 'payment_mercadopago_terminal_id'])

    const settingsMap: Record<string, string> = {}
    settingsRows?.forEach((s: { key: string, value: string }) => { settingsMap[s.key] = s.value })

    if (!settingsMap.payment_mercadopago_access_token || !settingsMap.payment_mercadopago_terminal_id) {
      return NextResponse.json({ error: 'Mercado Pago no está configurado en esta tienda' }, { status: 400 })
    }

    const accessToken = decrypt(settingsMap.payment_mercadopago_access_token)
    const idempotencyKey = crypto.randomUUID()

    const mpRes = await fetch(`${MP_BASE_URL}/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        type: 'point',
        external_reference: `pos-${Date.now()}`,
        transactions: { payments: [{ amount: Number(amount).toFixed(2) }] },
        config: {
          point: {
            terminal_id: settingsMap.payment_mercadopago_terminal_id,
            print_on_terminal: 'no_ticket',
          },
        },
      }),
    })

    if (!mpRes.ok) {
      const err = await mpRes.text()
      console.error('[MercadoPago Create] Error:', err)
      return NextResponse.json({ error: 'Error al iniciar pago en terminal Mercado Pago' }, { status: mpRes.status })
    }

    const mpData = await mpRes.json()
    // Verificado: el campo del ID de la orden es `id`.
    const orderId = mpData.id

    if (!orderId) {
      console.error('[MercadoPago Create] Respuesta sin ID de orden:', mpData)
      return NextResponse.json({ error: 'Respuesta inesperada de Mercado Pago' }, { status: 502 })
    }

    return NextResponse.json({ success: true, requestId: orderId })
  } catch (error: unknown) {
    console.error('[MercadoPago Create POST]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}
