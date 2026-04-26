import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  
  try {
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

export async function POST(request: Request) {
  const supabase = await createClient()
  
  try {
    const { rut, first_name, last_name, role } = await request.json()
    
    if (!rut || !first_name) {
      return NextResponse.json({ error: 'RUT y Nombre son requeridos' }, { status: 400 })
    }

    const cleanedRut = rut.replace(/[^0-9kK]/g, '').toUpperCase()

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        rut: cleanedRut,
        first_name,
        last_name,
        role: role || 'manager',
        updated_at: new Date().toISOString()
      }, { onConflict: 'rut' })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  
  try {
    const { id, current_area, role } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

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

export async function DELETE(request: Request) {
  const supabase = await createClient()
  
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: 'user',
        current_area: 'Ausente',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error removing staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
