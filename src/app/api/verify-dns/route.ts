import { NextResponse } from 'next/server'
import dns from 'dns/promises'
import { parseQuery } from '@/lib/validations/http'
import { verifyDnsQuerySchema } from '@/lib/validations/api'

export async function GET(request: Request) {
  const parsed = parseQuery(request, verifyDnsQuerySchema)
  if ('error' in parsed) return parsed.error
  const domain = parsed.data.domain

  const targetHost = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim()
  if (!targetHost) {
    return NextResponse.json(
      { valid: false, error: 'NEXT_PUBLIC_ROOT_DOMAIN no está configurado' },
      { status: 500 }
    )
  }

  try {
    const records = await dns.resolveCname(domain)
    const isValid = records.some(record => record.includes(targetHost))

    return NextResponse.json({
      valid: isValid,
      records: records,
      target: targetHost
    })
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : String(error)
    return NextResponse.json(
      { valid: false, error: message, target: targetHost },
      { status: 500 }
    )
  }
}
