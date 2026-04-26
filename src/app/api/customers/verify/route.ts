import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({ identity_verified: true })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
