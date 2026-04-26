import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'

export async function GET(req: Request) {
  const supabase = await createClient()
  
  try {
    // const { data: { user } } = await supabase.auth.getUser()
    // if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    
    const supabaseAdmin = createAdminClient()
    
    // Para el audit, buscaremos la primera tienda activa
    const { data: firstStore } = await supabaseAdmin.from('stores').select('id').limit(1).single()
    const storeId = firstStore?.id || '00000000-0000-0000-0000-000000000000'
    
    const profile = { store_id: storeId } // Mock profile

    // const { data: profile } = await supabase
    //   .from('profiles')
    //   .select('store_id')
    //   .eq('id', user.id)
    //   .single()
    // if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branch_id')

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, inventory(*)')
      .eq('store_id', profile.store_id)
      .order('name')

    if (error) {
      console.error('[API /products] Error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Normalizar el schema de Supabase al formato que ya usa el front
    const normalized = (data ?? []).map((p: any) => {
      // Si hay branchId, buscar el stock específico en la tabla inventory
      let currentStock = p.stock ?? 0
      if (branchId) {
        const branchInv = p.inventory?.find((inv: any) => String(inv.branch_id) === String(branchId))
        currentStock = branchInv ? branchInv.stock : 0
      }

      return {
        id: String(p.id),
        name: p.name,
        description: p.description ?? '',
        price: p.price,
        image: p.image ?? '',
        category: p.category ?? 'Sin categoría',
        categoryId: String(p.category_id ?? ''),
        stock: currentStock,
        lowStockThreshold: 5,
        sku: p.sku ?? '',
        unit: p.unit ?? 'un',
        isActive: true,
        isFeatured: false,
        discount: 0,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }
    })

    return NextResponse.json(normalized)
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const body = await req.json()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id')
    .eq('id', user?.id)
    .single()

  const { data: product, error: productError } = await supabase
    .from('products')
    .insert([{
      name: body.name,
      description: body.description,
      price: body.price,
      image: body.image ?? '',
      category: body.category,
      stock: body.stock ?? 0,
      unit: body.unit ?? 'unidad',
      store_id: profile?.store_id,
    }])
    .select()
    .single()

  if (productError) {
    console.error('[POST /api/products] Supabase error:', productError.message, productError.details, productError.hint)
    return NextResponse.json({ error: productError.message }, { status: 500 })
  }

  // Si hay stock por sucursal (Plan Élite), insertar en tabla inventory
  if (body.branchStocks && Array.isArray(body.branchStocks) && body.branchStocks.length > 0) {
    const inventoryData = body.branchStocks.map((bs: any) => ({
      product_id: product.id,
      branch_id: bs.branchId,
      stock: bs.stock
    }))

    const { error: invError } = await supabase
      .from('inventory')
      .insert(inventoryData)

    if (invError) {
      console.error('[POST /api/products] Inventory error:', invError.message)
      // No fallamos el request principal pero logeamos el error
    }
  }

  return NextResponse.json(product, { status: 201 })
}
