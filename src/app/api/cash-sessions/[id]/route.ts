import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

type Params = Promise<{ id: string }>

// PATCH - Close a session
export async function PATCH(req: Request, { params }: { params: Params }) {
  const supabase = await createClient()
  const { id } = await params
  const body = await req.json()

  // 1. Obtener la sesión para saber qué terminal liberar
  const { data: session } = await supabase
    .from('cash_sessions')
    .select('terminal_id')
    .eq('id', id)
    .single()

  // 2. Cerrar la sesión
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

  // 3. LIBERAR EL TERMINAL
  if (session?.terminal_id) {
    await supabase
      .from('terminals')
      .update({
        status: 'closed',
        current_user_id: null
      })
      .eq('id', session.terminal_id)
  }

  return NextResponse.json(data)
}
