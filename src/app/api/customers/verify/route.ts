import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { parseBody } from '@/lib/validations/http'
import { customerVerifySchema } from '@/lib/validations/api'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, customerVerifySchema)
    if ('error' in parsed) return parsed.error
    const { userId, rut } = parsed.data

    let query = auth.supabase
      .from('profiles')
      .update({ identity_verified: true })
      .eq('store_id', auth.storeId)

    if (userId) {
      query = query.eq('id', userId)
    } else if (rut) {
      const cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase()
      query = query.eq('rut', cleaned)
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}
