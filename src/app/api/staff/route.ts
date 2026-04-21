import { createServerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createServerClient()
  
  try {
    // Get all profiles that are staff
    const { data: staff, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'manager', 'cashier', 'warehouse'])
      .order('first_name', { ascending: true })

    if (error) throw error

    return NextResponse.json(staff)
  } catch (error: any) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createServerClient()
  
  try {
    const { id, current_area, role } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    // Prepare update payload
    const updateData: any = { updated_at: new Date().toISOString() }
    if (current_area !== undefined) updateData.current_area = current_area
    if (role !== undefined) updateData.role = role

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
