import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET - Find active session by cashier name or terminal
export async function GET(req: Request) {
  const supabase = createServerClient()
  const { searchParams } = new URL(req.url)
  const cashierName = searchParams.get('cashier')
  const terminalId = searchParams.get('terminal_id')

  let query = supabase
    .from('cash_sessions')
    .select('*, terminals(name)')
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1)

  if (cashierName) query = query.eq('cashier_name', cashierName)
  if (terminalId) query = query.eq('terminal_id', terminalId)

  const { data, error } = await query

  if (error) {
    // Table doesn't exist yet
    return NextResponse.json({ session: null, tableExists: false })
  }

  return NextResponse.json({ session: data?.[0] ?? null, tableExists: true })
}

// POST - Open a new cash session
export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  // Close any existing open session for this cashier
  if (body.cashier_name) {
    await supabase
      .from('cash_sessions')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('cashier_name', body.cashier_name)
      .eq('status', 'open')
  }

  const { data, error } = await supabase
    .from('cash_sessions')
    .insert([{
      terminal_id: body.terminal_id,
      cashier_name: body.cashier_name,
      opening_amount: body.opening_amount,
      status: 'open',
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
