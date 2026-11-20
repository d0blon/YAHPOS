import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { decrypt } from '@/lib/crypto'
import crypto from 'crypto'
import { parseBody } from '@/lib/validations/http'
import { amountSchema } from '@/lib/validations/api'

const TUU_BASE_URL = 'https://integrations.payment.haulmer.com'

export async function POST(req: Request) {
  try {
    const authResult = await withAuth()
    if (authResult.error) return authResult.error

    const parsed = await parseBody(req, amountSchema)
    if ('error' in parsed) return parsed.error
    const { amount } = parsed.data

    const supabase = authResult.supabase
    const storeId = authResult.storeId

    const { data: settingsRows } = await supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', storeId)
      .in('key', ['payment_tuu_api_key', 'payment_tuu_terminal_serial'])

    const settingsMap: Record<string, string> = {}
    settingsRows?.forEach((s: { key: string, value: string }) => { settingsMap[s.key] = s.value })

    if (!settingsMap.payment_tuu_api_key || !settingsMap.payment_tuu_terminal_serial) {
      return NextResponse.json({ error: 'TUU no está configurado en esta tienda (falta API Key o Serial)' }, { status: 400 })
    }

    const apiKey = decrypt(settingsMap.payment_tuu_api_key)
    const idempotencyKey = crypto.randomUUID()

    const tuuRes = await fetch(`${TUU_BASE_URL}/RemotePayment/v2/Create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        device: settingsMap.payment_tuu_terminal_serial,
        amount: Math.round(amount),
        paymentMethod: 1, // 1: crédito, 2: débito
        idempotencyKey,
      }),
    })

    if (!tuuRes.ok) {
      const err = await tuuRes.text()
      console.error('[TUU Create] Error:', err)
      return NextResponse.json({ error: 'Error al iniciar pago en terminal TUU' }, { status: tuuRes.status })
    }

    const tuuData = await tuuRes.json()
    // TUU retorna típicamente un request de pago aceptado. Guardamos en BD si es necesario, 
    // pero como el polling del POS es directo contra TUU, devolvemos el ID al POS.

    return NextResponse.json({
      success: true,
      requestId: idempotencyKey, // TUU asocia el requestId al idempotencyKey enviado
      tuuResponse: tuuData
    })

  } catch (error: unknown) {
    console.error('[TUU Create POST]', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error desconocido' }, { status: 500 })
  }
}
