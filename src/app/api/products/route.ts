import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateSlug } from '@/lib/utils'
import { productSchema } from '@/lib/validations/products'

export const revalidate = 60; // Cache for 60 seconds (ISR)

export async function GET(req: Request) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  
  try {
    // Identificar el store_id. 
    const { data: store, error: storeError } = await adminSupabase
      .from('stores')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (storeError || !store) {
      console.error('[API /products] Store not found or inactive:', storeError)
      return NextResponse.json({ error: 'Tienda no encontrada o inactiva' }, { status: 404 })
    }

    const storeId = store.id
    
    const { searchParams } = new URL(req.url)
    const branchId = searchParams.get('branch_id')
    const slug = searchParams.get('slug')

    // Usamos el cliente normal (respetando RLS) si es posible.
    // Si la tienda es pública, las políticas RLS deben permitir SELECT anónimo filtrado por store_id.
    let query = supabase
      .from('products')
      .select('*, inventory(*)')
      .eq('store_id', storeId)

    if (slug) {
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*, inventory(*)')
        .eq('store_id', storeId)
        .eq('slug', slug)
        .maybeSingle()

      if (productError) {
        console.error('[API /products] Error:', productError.message)
        return NextResponse.json({ error: productError.message }, { status: 500 })
      }

      if (!product) {
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
      }

      // Normalizar un solo producto
      const p = product
      let currentStock = p.stock ?? 0
      if (branchId) {
        const branchInv = p.inventory?.find((inv: any) => String(inv.branch_id) === String(branchId))
        currentStock = branchInv ? branchInv.stock : 0
      }
      const categorySlug = (p.category ?? '').toLowerCase()
      const categoryName = categorySlug
        ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
        : 'Sin categoría'

      return NextResponse.json({
        id: String(p.id),
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        price: p.price,
        image: p.image ?? '',
        category: categoryName,
        categorySlug: categorySlug,
        categoryId: categorySlug,
        stock: currentStock,
        lowStockThreshold: p.low_stock_threshold || 5,
        sku: p.sku ?? '',
        barcode: p.barcode ?? '',
        unit: p.unit ?? 'un',
        isActive: true,
        isFeatured: false,
        discount: 0,
        isExempt: p.is_exempt ?? false,
        nutritionalSeals: p.nutritional_seals || 0,
        isRealtimeTracked: p.is_realtime_tracked ?? false,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })
    }

    const { data: products, error: listError } = await supabase
      .from('products')
      .select('*, inventory(*)')
      .eq('store_id', storeId)
      .order('name')

    if (listError) {
      console.error('[API /products] List Error:', listError.message)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const dataList = products ?? []

    // NOTA: La columna `category` en products ya almacena el slug directamente
    // (ej: "alimentos", "bebidas"). No hay columna category_id en esta tabla.
    // Normalizar el schema de Supabase al formato que ya usa el front
    const normalized = dataList.map((p: any) => {
      // Si hay branchId, buscar el stock específico en la tabla inventory
      let currentStock = p.stock ?? 0
      if (branchId) {
        const branchInv = p.inventory?.find((inv: any) => String(inv.branch_id) === String(branchId))
        currentStock = branchInv ? branchInv.stock : 0
      }

      // La columna `category` ya es el slug ("alimentos", "bebidas", etc.)
      const categorySlug = (p.category ?? '').toLowerCase()
      const categoryName = categorySlug
        ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
        : 'Sin categoría'

      return {
        id: String(p.id),
        name: p.name,
        slug: p.slug,
        description: p.description ?? '',
        price: p.price,
        image: p.image ?? '',
        category: categoryName,
        categorySlug: categorySlug,
        categoryId: categorySlug,
        stock: currentStock,
        lowStockThreshold: p.low_stock_threshold || 5,
        sku: p.sku ?? '',
        barcode: p.barcode ?? '',
        unit: p.unit ?? 'un',
        isActive: true,
        isFeatured: false,
        discount: 0,
        isExempt: p.is_exempt ?? false,
        nutritionalSeals: p.nutritional_seals || 0,
        isRealtimeTracked: p.is_realtime_tracked ?? false,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }
    })

    return NextResponse.json(normalized)
  } catch (err) {
    console.error('[GET /api/products] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    
    // Validación con Zod
    const validated = productSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ 
        error: 'Datos de producto inválidos', 
        details: validated.error.issues 
      }, { status: 400 })
    }

    const validatedData = validated.data

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    const baseSlug = validatedData.slug || generateSlug(validatedData.name)
    let finalSlug = baseSlug
    
    // Verificación rápida de duplicados
    const { data: existingProduct } = await supabase
      .from('products')
      .select('slug')
      .eq('slug', baseSlug)
      .single()
      
    if (existingProduct) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
    }

    const { data: product, error: productError } = await supabase
      .from('products')
      .insert([{
        name: validatedData.name,
        slug: finalSlug,
        description: validatedData.description,
        price: validatedData.price,
        image: validatedData.image ?? '',
        category: validatedData.category,
        stock: validatedData.stock ?? 0,
        unit: validatedData.unit ?? 'unidad',
        is_exempt: validatedData.isExempt ?? false,
        sku: validatedData.sku,
        barcode: validatedData.barcode || validatedData.sku,
        nutritional_seals: validatedData.nutritionalSeals,
        is_realtime_tracked: validatedData.isRealtimeTracked,
        store_id: profile?.store_id,
      }])
      .select()
      .single()

    if (productError) {
      console.error('[POST /api/products] Supabase error:', productError.message, productError.details, productError.hint)
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    // Si hay stock por sucursal (Plan Élite), insertar en tabla inventory
    if (validatedData.branchStocks && Array.isArray(validatedData.branchStocks) && validatedData.branchStocks.length > 0) {
      const inventoryData = validatedData.branchStocks.map((bs: any) => ({
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
  } catch (error: any) {
    console.error('[POST /api/products] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
