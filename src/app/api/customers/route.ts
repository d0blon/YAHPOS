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
    console.log(`[API Search] Buscando RUT: ${cleaned}`)

    let { data, error } = await auth.supabase
      .from('profiles')
      .select('*')
      .eq('rut', cleaned)
      .eq('store_id', auth.storeId)
      .limit(1)

    if ((!data || data.length === 0) && !error) {
      const secondTry = await auth.supabase
        .from('profiles')
        .select('*')
        .eq('rut', rut)
        .eq('store_id', auth.storeId)
        .limit(1)
      
      data = secondTry.data
      error = secondTry.error
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
      role: user.role
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

    const [firstName, ...lastNameParts] = name.split(' ')
    const lastName = lastNameParts.join(' ')

    const { data, error } = await auth.supabase
      .from('profiles')
      .upsert({ 
        rut: cleaned, 
        first_name: firstName,
        last_name: lastName || null,
        email: email || null,
        loyalty_points: points,
        role: 'customer',
        store_id: auth.storeId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'rut' })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
      email: data.email,
      loyalty_points: data.loyalty_points ?? 0,
      role: data.role
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

