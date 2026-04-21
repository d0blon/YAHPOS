import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type Params = Promise<{ id: string }>

// PATCH - Close a session
export async function PATCH(req: Request, { params }: { params: Params }) {
  const supabase = createServerClient()
  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabase
    .from('cash_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      closing_amount: body.closing_amount ?? null,
      total_cash_sales: body.total_cash_sales ?? 0,
      total_card_sales: body.total_card_sales ?? 0,
      total_transfer_sales: body.total_transfer_sales ?? 0,
      notes: body.notes ?? null,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
