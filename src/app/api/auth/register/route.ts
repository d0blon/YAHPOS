import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cleanRut } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { email, password, firstName, lastName, phone, rut, acceptMarketing } = await req.json()

    if (!email || !password || !rut) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const cleanedRut = cleanRut(rut)

    // 1. Sign up the user in Supabase Auth first
    // This creates the actual credentials needed for login
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

    // 2. Sync profile data (Upsert)
    // We use the ID from authData.user.id to ensure consistency
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        rut: cleanedRut,
        role: 'customer',
        accepts_marketing: acceptMarketing ?? true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' }) // Usar el ID de auth para el conflicto, permitiendo actualizar perfiles existentes
      .select()
      .single()

    if (profileError) {
      console.error('Error syncing profile:', profileError.message)
    }

    // 3. Associate with current store (Membership)
    // El middleware proxy.ts inyecta x-store-id basado en el dominio detectado
    const storeId = req.headers.get('x-store-id')
    
    if (storeId) {
      console.log(`[Register] Asociando usuario ${authData.user.id} con tienda ${storeId}`)
      const { error: membershipError } = await supabase
        .from('user_stores')
        .upsert({ // Usar upsert para evitar errores si ya existe la membresía
          user_id: authData.user.id,
          store_id: storeId,
          role: 'customer',
          is_active: true
        }, { onConflict: 'user_id,store_id' })

      if (membershipError) {
        console.error('Error creating membership:', membershipError.message)
      }
    } else {
      console.warn('[Register] No se detectó storeId en los headers. El usuario no fue asociado a ninguna tienda.')
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
        loyaltyPoints: profile?.loyalty_points || 0,
        createdAt: profile?.created_at || new Date().toISOString(),
        updatedAt: profile?.updated_at || new Date().toISOString()
      } 
    })
  } catch (err: any) {
    console.error('Registration error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
