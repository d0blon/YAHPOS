import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createServerClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, rut, email, loyalty_points, created_at, role')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customers:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Map to the format expected by the frontend
    const formattedData = data.map(c => ({
      id: c.id,
      name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sin nombre',
      rut: c.rut || '—',
      email: c.email || '',
      loyalty_points: c.loyalty_points || 0,
      createdAt: c.created_at,
      role: c.role || 'customer'
    }))

    return NextResponse.json(formattedData)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
