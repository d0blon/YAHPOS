import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await auth.supabase
      .from('profiles')
      .update({ identity_verified: true })
      .eq('id', userId)
      .eq('store_id', auth.storeId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
