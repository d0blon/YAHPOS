import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { userId, rut } = await req.json()

    if (!userId && !rut) {
      return NextResponse.json({ error: 'userId or rut is required' }, { status: 400 })
    }

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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
