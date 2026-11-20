import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { decrypt } from '@/lib/crypto'
import { parseQuery } from '@/lib/validations/http'
import { paymentStatusQuerySchema } from '@/lib/validations/api'

const MP_BASE_URL = 'https://api.mercadopago.com'

export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = parseQuery(req, paymentStatusQuerySchema)
    if ('error' in parsed) return parsed.error
    const requestId = parsed.data.requestId
    if (!requestId) return NextResponse.json({ error: 'Falta requestId' }, { status: 400 })

    const { data: settingsRows } = await auth.supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', auth.storeId)
      .in('key', ['payment_mercadopago_access_token'])

    const settingsMap: Record<string, string> = {}
    settingsRows?.forEach((s: { key: string, value: string }) => { settingsMap[s.key] = s.value })

    if (!settingsMap.payment_mercadopago_access_token) {
      return NextResponse.json({ error: 'Mercado Pago no está configurado' }, { status: 400 })
    }

    const accessToken = decrypt(settingsMap.payment_mercadopago_access_token)

    const mpRes = await fetch(`${MP_BASE_URL}/v1/orders/${requestId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    })

    if (!mpRes.ok) {
      console.error('[MercadoPago Status] Error http:', mpRes.status)
      return NextResponse.json({ status: 'pending' })
    }

    const mpData = await mpRes.json()
    const rawStatus = mpData.status

    let status = 'pending'
    if (rawStatus === 'processed') status = 'success'
    // 'refunded' NO se trata como éxito de venta para no engañar al cajero.
    else if (rawStatus === 'canceled' || rawStatus === 'expired' || rawStatus === 'failed') status = 'failed'

    return NextResponse.json({ status, raw: mpData })
  } catch (error: unknown) {
    console.error('[MercadoPago Status GET]', error)
    return NextResponse.json({ status: 'pending' })
  }
}
