import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cleanRut } from '@/lib/utils'

export async function POST(req: Request) {
  try {
    const supabase = createServerClient()
    const { email, password, firstName, lastName, phone, rut } = await req.json()

    if (!email || !password || !rut) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const cleanedRut = cleanRut(rut)

    // 1. Check if RUT already exists (POS record)
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('rut', cleanedRut)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching user:', fetchError.message)
    }

    if (existingUser) {
      // 2. "UPGRADE" existing POS user to Full Account
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)

      if (updateError) throw updateError

      return NextResponse.json({ 
        success: true, 
        message: 'Cuenta vinculada y creada con éxito', 
        user: { ...existingUser, email, first_name: firstName, last_name: lastName } 
      })
    } else {
      // 3. Create NEW user
      const { data: newUser, error: insertError } = await supabase
        .from('profiles')
        .insert([{
          email,
          first_name: firstName,
          last_name: lastName,
          phone,
          rut: cleanedRut,
          role: 'customer',
          loyalty_points: 0,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (insertError) throw insertError

      return NextResponse.json({ success: true, user: newUser })
    }
  } catch (err: any) {
    console.error('Registration error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
