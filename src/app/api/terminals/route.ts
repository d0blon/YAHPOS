import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('terminals')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (error) {
    // Table might not exist yet — return a default
    return NextResponse.json([{ id: 1, name: 'Caja 1', description: 'Terminal principal', is_active: true }])
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('terminals')
    .insert([{ name: body.name, description: body.description ?? '' }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
