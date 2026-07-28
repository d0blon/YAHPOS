/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code || code.length < 8) {
      return NextResponse.json({ success: false, error: 'Código inválido' }, { status: 400 })
    }

    const supabase = await createClient()

    // Validar sesión
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    // Consulta única al catálogo maestro propio (ya no se busca en products cross-tenant)
    const { data: masterProduct } = await supabase
      .from('master_catalog_products')
      .select('name, brand, category, image_url, description')
      .eq('sku', code)
      .maybeSingle()

    if (masterProduct) {
      return NextResponse.json({
        success: true,
        source: 'master_catalog',
        product: { 
          name: masterProduct.name, 
          category: masterProduct.category, 
          image_url: masterProduct.image_url,
          brand: masterProduct.brand,
          description: masterProduct.description
        }
      })
    }

    return NextResponse.json({ 
      success: false, 
      source: null, 
      error: 'Producto no encontrado'
    })
  } catch (err) {
    console.error('[GET /api/products/lookup] Error:', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Validar sesión
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.store_id) {
      return NextResponse.json({ success: false, error: 'Tienda no encontrada' }, { status: 403 })
    }

    const body = await request.json()
    const { sku, name, brand, category, image_url } = body

    if (!sku || !name) {
      return NextResponse.json({ success: false, error: 'SKU y nombre requeridos' }, { status: 400 })
    }

    // Insertar usando el admin client porque la tabla deniega todo acceso por RLS a 'authenticated'
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('master_catalog_submissions')
      .insert({
        sku,
        name,
        brand: brand || null,
        category: category || null,
        image_url: image_url || null,
        submitted_by_store_id: profile.store_id,
        status: 'pending'
      })

    if (error) {
      console.error('[POST /api/products/lookup] Insert error:', error.message)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[POST /api/products/lookup] Error:', err)
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
