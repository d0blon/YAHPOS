import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { decrypt } from '@/lib/crypto'
import { parseQuery } from '@/lib/validations/http'
import { paymentStatusQuerySchema } from '@/lib/validations/api'

const TUU_BASE_URL = 'https://integrations.payment.haulmer.com'

export async function GET(req: Request) {
  try {
    const authResult = await withAuth()
    if (authResult.error) return authResult.error

    const parsed = parseQuery(req, paymentStatusQuerySchema)
    if ('error' in parsed) return parsed.error
    const requestId = parsed.data.requestId

    if (!requestId) return NextResponse.json({ error: 'Falta requestId' }, { status: 400 })

    const supabase = authResult.supabase
    const storeId = authResult.storeId

    const { data: settingsRows } = await supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', storeId)
      .in('key', ['payment_tuu_api_key'])

    const settingsMap: Record<string, string> = {}
    settingsRows?.forEach((s: { key: string, value: string }) => { settingsMap[s.key] = s.value })

    if (!settingsMap.payment_tuu_api_key) {
      return NextResponse.json({ error: 'TUU no está configurado' }, { status: 400 })
    }

    const apiKey = decrypt(settingsMap.payment_tuu_api_key)

    const tuuRes = await fetch(`${TUU_BASE_URL}/RemotePayment/v2/GetPaymentRequest/${requestId}`, {
      headers: {
        'X-API-Key': apiKey,
      },
    })

    if (!tuuRes.ok) {
      console.error('[TUU Status] Error http:', tuuRes.status)
      return NextResponse.json({ status: 'pending' }) // Si falla la red de TUU, asumimos pending para que siga el polling
    }

    const tuuData = await tuuRes.json()
    // El JSON suele venir con status: 'Completed', 'Failed', 'Canceled' o 'Pending'
    // También suele traer un statusCode y un paymentResult

    const status = tuuData.status?.toLowerCase() || 'pending'
    
    // Mapeamos a los estados que entiende nuestro POS
    let posStatus = 'pending'
    if (status === 'completed' || status === 'approved') posStatus = 'success'
    else if (status === 'failed' || status === 'canceled' || status === 'rejected') posStatus = 'failed'

    return NextResponse.json({
      status: posStatus,
      raw: tuuData
    })

  } catch (error: unknown) {
    console.error('[TUU Status GET]', error)
    return NextResponse.json({ status: 'pending' }) // Fallback seguro para no cortar el polling del POS por un crash
  }
}
