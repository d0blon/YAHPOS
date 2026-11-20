import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

const PRIVILEGED_CUSTOMER_LIST_ROLES = ['owner', 'admin', 'manager', 'developer']

export async function GET() {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    if (!auth.profile?.role || !PRIVILEGED_CUSTOMER_LIST_ROLES.includes(auth.profile.role)) {
      return NextResponse.json({ error: 'No tienes permiso para ver esta lista' }, { status: 403 })
    }

    const { data, error } = await auth.supabase
      .from('profiles')
      .select('id, first_name, last_name, rut, email, loyalty_points, created_at, role')
      .eq('store_id', auth.storeId)
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .limit(200)

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
  } catch (error: unknown) {
    console.error('Error fetching customers list:', error)
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
