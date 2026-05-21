import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { withAuth, apiError } from '@/lib/api-utils'
import { customerSchema } from '@/lib/validations/customers'

export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const rut = searchParams.get('rut')
    if (!rut) return NextResponse.json({ error: 'RUT required' }, { status: 400 })

    const cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    console.log(`[API Search] Buscando RUT: ${cleaned} (Original: ${rut}) en store ${auth.storeId}`)

    // 1. Buscar con RUT limpio + store_id exacto
    let { data, error } = await auth.supabase
      .from('profiles')
      .select('*')
      .eq('rut', cleaned)
      .eq('store_id', auth.storeId)
      .limit(1)

    // 2. Fallback: buscar con RUT crudo + store_id
    if ((!data || data.length === 0) && !error) {
      console.log(`[API Search] Fallback 1: RUT original ${rut} + store ${auth.storeId}`)
      const secondTry = await auth.supabase
        .from('profiles')
        .select('*')
        .eq('rut', rut)
        .eq('store_id', auth.storeId)
        .limit(1)
      
      data = secondTry.data
      error = secondTry.error
    }

    // 3. Fallback: buscar solo por RUT (sin store_id) — perfiles creados desde web
    if ((!data || data.length === 0) && !error) {
      console.log(`[API Search] Fallback 2: Solo RUT limpio ${cleaned} (Global)`)
      const thirdTry = await auth.supabase
        .from('profiles')
        .select('*')
        .eq('rut', cleaned)
        .limit(1)
      
      data = thirdTry.data
      error = thirdTry.error
    }

    // 4. Fallback 3: Solo RUT original (Global)
    if ((!data || data.length === 0) && !error) {
      console.log(`[API Search] Fallback 3: Solo RUT original ${rut} (Global)`)
      const fourthTry = await auth.supabase
        .from('profiles')
        .select('*')
        .eq('rut', rut)
        .limit(1)
      
      data = fourthTry.data
      error = fourthTry.error
    }

    if (data && data.length > 0) {
      console.log(`[API Search] Cliente encontrado: ${data[0].id} (Full: ${data[0].is_full_account})`)
    } else {
      console.log(`[API Search] Cliente no encontrado tras 4 intentos.`)
    }

    if (error) {
      console.error('[API Search Error]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json(null)
    }

    const user = data[0]
    return NextResponse.json({
      id: user.id,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Sin nombre',
      email: user.email,
      loyalty_points: user.loyalty_points ?? 0,
      rut: user.rut,
      role: user.role,
      is_full_account: user.is_full_account ?? false,
      identity_verified: user.identity_verified ?? false,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const body = await req.json()
    
    const validated = customerSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ 
        error: 'Datos de cliente inválidos', 
        details: validated.error.issues 
      }, { status: 400 })
    }

    const { rut, name, email, points = 0 } = validated.data

    const cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase()
    console.log(`[API POST] Registrando/Actualizando cliente RUT: ${cleaned}`)

    const [firstName, ...lastNameParts] = name.trim().split(' ')
    const lastName = lastNameParts.join(' ')

    // 1. Verificar si ya existe para decidir si hacer INSERT o UPDATE
    // No usamos upsert con onConflict porque 'rut' no tiene restricción UNIQUE en BD
    const { data: existing } = await auth.supabase
      .from('profiles')
      .select('id')
      .eq('rut', cleaned)
      .maybeSingle()

    let result;
    if (existing) {
      console.log(`[API POST] Actualizando cliente existente: ${existing.id}`)
      result = await auth.supabase
        .from('profiles')
        .update({ 
          first_name: firstName,
          last_name: lastName || null,
          email: email ? email.toLowerCase().trim() : null,
          loyalty_points: points,
          role: 'customer',
          store_id: auth.storeId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single()
    } else {
      console.log(`[API POST] Creando nuevo cliente`)
      result = await auth.supabase
        .from('profiles')
        .insert({ 
          rut: cleaned, 
          first_name: firstName,
          last_name: lastName || null,
          email: email ? email.toLowerCase().trim() : null,
          loyalty_points: points,
          role: 'customer',
          store_id: auth.storeId,
          updated_at: new Date().toISOString()
        })
        .select('*')
        .single()
    }

    if (result.error) {
      console.error('[API POST Error]', result.error)
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    const data = result.data
    return NextResponse.json({
      id: data.id,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      email: data.email,
      loyalty_points: data.loyalty_points ?? 0,
      role: data.role,
      is_full_account: data.is_full_account ?? false,
      identity_verified: data.identity_verified ?? false,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}



export async function DELETE(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    const { error } = await auth.supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('store_id', auth.storeId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

