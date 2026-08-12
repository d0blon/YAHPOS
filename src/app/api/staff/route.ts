import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { data: staff, error } = await auth.supabase
      .from('profiles')
      .select('*')
      .eq('store_id', auth.storeId)
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
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { rut, first_name, last_name, role } = await request.json()
    
    if (!rut || !first_name) {
      return NextResponse.json({ error: 'RUT y Nombre son requeridos' }, { status: 400 })
    }

    const cleanedRut = rut.replace(/[^0-9kK]/g, '').toUpperCase()

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .upsert({
        rut: cleanedRut,
        first_name,
        last_name,
        role: role || 'manager',
        store_id: auth.storeId,
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
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id, current_area, role } = await request.json()
    
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (current_area !== undefined) updateData.current_area = current_area
    if (role !== undefined) updateData.role = role

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', auth.storeId)
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
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .update({ 
        role: 'user',
        current_area: 'Ausente',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error removing staff:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
