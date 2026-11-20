import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cleanRut } from '@/lib/utils'
import { createAdminClient } from '@/lib/supabase'
import { parseBody } from '@/lib/validations/http'
import { registerSchema } from '@/lib/validations/api'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const parsed = await parseBody(req, registerSchema)
    if ('error' in parsed) return parsed.error
    const { email, password, firstName, lastName, phone, rut, acceptMarketing } = parsed.data

    const cleanedRut = cleanRut(rut)

    // Resolver la tienda desde el Host, igual que hace el middleware. NUNCA desde un
    // header del cliente: x-store-id es falsificable y acá se escribe con admin client.
    const host = (req.headers.get('host') || '').toLowerCase()
    const { data: store } = host
      ? await supabase.rpc('get_store_by_domain', { p_host: host }).maybeSingle()
      : { data: null }
    const storeId = (store as { id?: string } | null)?.id ?? null

    if (!storeId) {
      return NextResponse.json({ error: 'No se pudo resolver la tienda desde el dominio' }, { status: 400 })
    }

    // Check if a profile with this RUT already exists (e.g. created by POS)
    const existingQuery = supabase
      .from('profiles')
      .select('id, loyalty_points, first_name, last_name, email, store_id')
      .eq('rut', cleanedRut)
      .eq('store_id', storeId)
      .limit(1)

    const { data: existingProfiles } = await existingQuery

    const existingProfile = existingProfiles?.[0]
    const existingPoints = existingProfile?.loyalty_points || 0
    const existingProfileId = existingProfile?.id

    // 1. Sign up the user in Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          rut: cleanedRut
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No se pudo crear el usuario de autenticación')

    // 2. Update/Create profile linked to auth user
    // The handle_new_user trigger already creates a basic profile, we enhance it
    const adminSupabase = createAdminClient()
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email?.toLowerCase().trim(),
        first_name: firstName?.trim() || existingProfile?.first_name,
        last_name: lastName?.trim() || existingProfile?.last_name,
        phone,
        rut: cleanedRut,
        role: 'customer',
        loyalty_points: existingPoints,
        is_full_account: true,
        store_id: storeId,
        accepts_marketing: acceptMarketing ?? true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
      .select('id, email, first_name, last_name, phone, rut, role, loyalty_points, is_full_account, created_at, updated_at')
      .single()

    if (profileError) {
      console.error('Error syncing profile:', profileError.message)
    }

    // 3. If the existing profile has a different ID (POS-created), delete it
    // to avoid duplicate profiles with the same RUT
    if (existingProfileId && existingProfileId !== authData.user.id) {
      const admin = createAdminClient()
      await admin.from('profiles').delete().eq('id', existingProfileId).eq('store_id', storeId)
      console.log(`[Register] Perfil POS antiguo eliminado: ${existingProfileId}`)
    }

    // 4. Associate with the store resolved from the domain
    console.log(`[Register] Asociando usuario ${authData.user.id} con tienda ${storeId}`)
    const { error: membershipError } = await supabase
      .from('user_stores')
      .upsert({
        user_id: authData.user.id,
        store_id: storeId,
        role: 'customer',
        is_active: true
      }, { onConflict: 'user_id,store_id' })

    if (membershipError) {
      console.error('Error creating membership:', membershipError.message)
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        firstName: profile?.first_name || firstName,
        lastName: profile?.last_name || lastName,
        phone: profile?.phone || phone,
        rut: profile?.rut || cleanedRut,
        role: 'customer',
        loyaltyPoints: profile?.loyalty_points || existingPoints,
        isFullAccount: true,
        createdAt: profile?.created_at || new Date().toISOString(),
        updatedAt: profile?.updated_at || new Date().toISOString()
      } 
    })
  } catch (err: unknown) {
    const message = errorMessage(err)
    console.error('Registration error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
