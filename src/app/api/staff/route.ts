import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { createAdminClient } from '@/lib/supabase'
import { STAFF_MANAGEMENT_ROLES } from '@/lib/constants/roles'
import { parseBody, parseQuery } from '@/lib/validations/http'
import { staffCreateSchema, staffDeleteSchema, staffUpdateSchema } from '@/lib/validations/staff'

function assertCanManageStaff(auth: { profile?: { role?: string } }) {
  const role = auth.profile?.role
  if (!role || !STAFF_MANAGEMENT_ROLES.includes(role as (typeof STAFF_MANAGEMENT_ROLES)[number])) {
    return NextResponse.json({ error: 'No tienes permiso para gestionar personal' }, { status: 403 })
  }
  return null
}

export async function GET() {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { data: staff, error } = await auth.supabase
      .from('profiles')
      .select('id, first_name, last_name, rut, role, current_area, updated_at')
      .eq('store_id', auth.storeId)
      .in('role', ['admin', 'manager', 'cashier', 'warehouse'])
      .order('first_name', { ascending: true })
      .limit(500)

    if (error) throw error

    return NextResponse.json(staff)
  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const permError = assertCanManageStaff(auth)
    if (permError) return permError

    const parsed = await parseBody(request, staffCreateSchema)
    if ('error' in parsed) return parsed.error
    const { rut, first_name, last_name, role } = parsed.data

    const cleanedRut = rut.replace(/[^0-9kK]/g, '').toUpperCase()

    const adminSupabase = createAdminClient()
    const payload = {
      first_name,
      last_name,
      // role viene de un enum estricto: no se puede escalar a owner/developer.
      role: role || 'manager',
      updated_at: new Date().toISOString()
    }

    // Nunca upsert global por RUT: otro tenant podría usar el mismo RUT.
    const { data: existing, error: lookupError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('store_id', auth.storeId)
      .eq('rut', cleanedRut)
      .maybeSingle()

    if (lookupError) throw lookupError

    const { data, error } = existing
      ? await adminSupabase
          .from('profiles')
          .update(payload)
          .eq('id', existing.id)
          .eq('store_id', auth.storeId)
          .select('id, first_name, last_name, rut, role, current_area, updated_at')
          .single()
      : await adminSupabase
          .from('profiles')
          .insert({ ...payload, rut: cleanedRut, store_id: auth.storeId })
          .select('id, first_name, last_name, rut, role, current_area, updated_at')
          .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating staff:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const permError = assertCanManageStaff(auth)
    if (permError) return permError

    const parsed = await parseBody(request, staffUpdateSchema)
    if ('error' in parsed) return parsed.error
    const { id, current_area, role } = parsed.data

    if (role !== undefined && id === auth.user.id) {
      return NextResponse.json({ error: 'No podés cambiar tu propio rol' }, { status: 403 })
    }

    const updateData: Record<string, string> = { updated_at: new Date().toISOString() }
    if (current_area !== undefined) updateData.current_area = current_area
    if (role !== undefined) updateData.role = role

    const adminSupabase = createAdminClient()
    const { data, error } = await adminSupabase
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .select('id, first_name, last_name, rut, role, current_area, updated_at')
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating staff:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const permError = assertCanManageStaff(auth)
    if (permError) return permError

    const parsed = parseQuery(request, staffDeleteSchema)
    if ('error' in parsed) return parsed.error
    const { id } = parsed.data

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
      .select('id, first_name, last_name, rut, role, current_area, updated_at')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error removing staff:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message }, { status: 500 })
  }
}
