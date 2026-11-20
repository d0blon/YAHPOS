import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { withAuth } from '@/lib/api-utils'
import { customerSchema } from '@/lib/validations/customers'
import { parseBody, parseQuery } from '@/lib/validations/http'
import { customerDeleteSchema, customerSearchQuerySchema } from '@/lib/validations/api'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

export async function GET(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsedQuery = parseQuery(req, customerSearchQuerySchema)
    if ('error' in parsedQuery) return parsedQuery.error
    const rut = parsedQuery.data.rut
    if (!rut) return NextResponse.json({ error: 'RUT required' }, { status: 400 })

    const cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase()

    // Toda búsqueda lleva el store de la sesión: nunca se consulta profiles por RUT global.
    // 1. Buscar con RUT limpio + store_id exacto
    let { data, error } = await auth.supabase
      .from('profiles')
      .select('id, first_name, last_name, email, loyalty_points, rut, role, is_full_account, identity_verified')
      .eq('rut', cleaned)
      .eq('store_id', auth.storeId)
      .limit(1)

    // 2. Fallback: buscar con RUT crudo + store_id (mismo tenant)
    if ((!data || data.length === 0) && !error) {
      const secondTry = await auth.supabase
        .from('profiles')
        .select('id, first_name, last_name, email, loyalty_points, rut, role, is_full_account, identity_verified')
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
      role: user.role,
      is_full_account: user.is_full_account ?? false,
      identity_verified: user.identity_verified ?? false,
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, customerSchema)
    if ('error' in parsed) return parsed.error

    const { rut, name, email, points = 0 } = parsed.data

    const cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase()

    const [firstName, ...lastNameParts] = name.trim().split(' ')
    const lastName = lastNameParts.join(' ')

    // Whitelist: solo datos del cliente derivados del body validado. Nunca role,
    // store_id ni flags de verificación desde el cliente.
    const customerFields = {
      first_name: firstName,
      last_name: lastName || null,
      email: email ? email.toLowerCase().trim() : null,
      loyalty_points: points,
      updated_at: new Date().toISOString()
    }

    // 1. Verificar si ya existe para decidir si hacer INSERT o UPDATE
    // No usamos upsert con onConflict porque 'rut' no tiene restricción UNIQUE en BD.
    // El store de la sesión acota la búsqueda: un RUT ajeno no puede alcanzarse.
    const { data: existing } = await auth.supabase
      .from('profiles')
      .select('id')
      .eq('rut', cleaned)
      .eq('store_id', auth.storeId)
      .maybeSingle()

    let result;
    if (existing) {
      const adminSupabase = createAdminClient()
      result = await adminSupabase
        .from('profiles')
        .update(customerFields)
        .eq('id', existing.id)
        .eq('store_id', auth.storeId)
        .select('id, first_name, last_name, email, loyalty_points, rut, role, is_full_account, identity_verified')
        .single()
    } else {
      console.log(`[API POST] Creando nuevo cliente`)
      const adminSupabase = createAdminClient()

      // profiles.id tiene FK real hacia auth.users.id -- no se puede insertar un perfil
      // "huérfano". Se crea una cuenta shadow con email sintético (el cliente no
      // necesita saberlo ni usarlo para loguearse); el trigger handle_new_user ya
      // autogenera una fila básica en profiles con ese id, así que acá solo se completa
      // con un UPDATE, nunca un INSERT.
      const syntheticEmail = `pos-${crypto.randomUUID()}@shadow.yahpos.internal`
      const { data: newAuthUser, error: authCreateError } = await adminSupabase.auth.admin.createUser({
        email: syntheticEmail,
        email_confirm: true,
      })

      if (authCreateError || !newAuthUser?.user) {
        console.error('[API POST] Error creando cuenta shadow para cliente:', authCreateError)
        return NextResponse.json({ error: 'Error al crear cliente' }, { status: 500 })
      }

      result = await adminSupabase
        .from('profiles')
        .update({
          ...customerFields,
          rut: cleaned,
          role: 'customer',
          store_id: auth.storeId // servidor; el trigger crea la fila sin store_id
        })
        .eq('id', newAuthUser.user.id)
        .select('id, first_name, last_name, email, loyalty_points, rut, role, is_full_account, identity_verified')
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
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}



const PRIVILEGED_CUSTOMER_MGMT_ROLES = ['owner', 'admin', 'manager', 'developer']

export async function DELETE(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    if (!auth.profile?.role || !PRIVILEGED_CUSTOMER_MGMT_ROLES.includes(auth.profile.role)) {
      return NextResponse.json({ error: 'No tienes permiso para eliminar clientes' }, { status: 403 })
    }

    const parsed = parseQuery(req, customerDeleteSchema)
    if ('error' in parsed) return parsed.error
    const { id } = parsed.data

    const { error } = await auth.supabase
      .from('profiles')
      .delete()
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .eq('role', 'customer')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 })
  }
}

