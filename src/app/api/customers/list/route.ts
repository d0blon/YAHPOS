import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const customers = data.map(profile => ({
      id: profile.id,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Sin Nombre',
      rut: profile.rut,
      email: profile.email,
      loyalty_points: profile.loyalty_points || 0,
      createdAt: profile.created_at,
      role: profile.role
    }))

    return NextResponse.json(customers)
  } catch (error: any) {
    console.error('Error fetching customers list:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
