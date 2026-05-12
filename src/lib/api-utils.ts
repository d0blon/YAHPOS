import { createClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export function apiError(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function withAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { error: apiError('No autorizado', 401), supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.store_id) {
    return { error: apiError('Perfil sin tienda', 403), supabase }
  }

  return { user, profile, supabase, storeId: profile.store_id }
}

export function requireStoreAccess(
  profile: { store_id: string | null },
  targetStoreId: string
) {
  return profile.store_id === targetStoreId
}
