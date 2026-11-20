import type { createClient } from '@/lib/supabase'

type DeveloperSupabaseClient = Awaited<ReturnType<typeof createClient>>

export async function verifyDeveloperRole(supabase: DeveloperSupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'developer') throw new Error('No autorizado. Se requiere rol developer.')
}
