/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, prefer-const */
import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase'
import { generateSlug } from '@/lib/utils'
import { productSchema } from '@/lib/validations/products'
import fs from 'fs'
import path from 'path'

export const revalidate = 60;

const DEMO_HOST_PREFIX = 'master.'

let catalogCache: any[] | null = null

function loadCatalog(): any[] {
  if (catalogCache) return catalogCache
  const filePath = path.join(process.cwd(), 'public', 'data', 'catalog.json')
  const raw = fs.readFileSync(filePath, 'utf-8')
  catalogCache = JSON.parse(raw) as any[]
  return catalogCache
}

function transformCatalogItem(item: any, index: number) {
  const categorySlug = (item.category_main || '').toLowerCase().replace(/\s+/g, '-')
  const categoryName = categorySlug
    ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
    : 'Sin categoría'
  const slug = generateSlug(item.name)

  return {
    id: `demo-${item.sku || `catalog-${index}`}`,
    name: item.name,
    slug,
    description: item.name_raw || item.name,
    price: item.price,
    image: item.images?.[0] || '',
    category: categoryName,
    categorySlug,
    categoryId: categorySlug,
    stock: 999,
    lowStockThreshold: 5,
    sku: item.sku || '',
    barcode: item.sku || '',
    unit: 'un',
    isActive: true,
    isFeatured: false,
    discount: 0,
    tags: item.tags || [],
    brand: item.brand || '',
    isExempt: false,
    nutritionalSeals: 0,
    isRealtimeTracked: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function serveDemoCatalog(req?: Request) {
  try {
    const catalog = loadCatalog()
    const url = req ? new URL(req.url) : null
    const slug = url?.searchParams.get('slug')
    const category = url?.searchParams.get('category')
    const search = url?.searchParams.get('search')

    if (slug && req) {
      const item = catalog.find((p: any) => generateSlug(p.name) === slug)
      if (!item) {
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
      }
      const idx = catalog.indexOf(item)
      return NextResponse.json(transformCatalogItem(item, idx))
    }

    let filtered = catalog
    if (category) {
      filtered = catalog.filter((item: any) => {
        const itemSlug = (item.category_main || '').toLowerCase().replace(/\s+/g, '-')
        return itemSlug === category.toLowerCase()
      })
    } else if (search) {
      const term = generateSlug(search)
      filtered = catalog.filter((item: any) => generateSlug(item.name || '').includes(term))
    }

    const transformed = filtered.map((item: any, i: number) => transformCatalogItem(item, i))
    return NextResponse.json(transformed)
  } catch (err) {
    console.error('[GET /api/products] Demo catalog error:', err)
    return NextResponse.json({ error: 'Error loading demo catalog' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const supabase = await createClient()

  // Demo store (master.*): catálogo demo SOLO para visitantes públicos sin sesión.
  // Con sesión activa (admin/developer) siempre se usa la DB real, sin importar el host.
  if (host.startsWith(DEMO_HOST_PREFIX)) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return serveDemoCatalog(req)
    }
  }

  const adminSupabase = createAdminClient()
  
  try {
    let store: { id: string } | null = null
    let storeError = null

    if (host.endsWith('.localhost:3000')) {
      const subdomain = host.split('.localhost:3000')[0]
      const { data, error } = await adminSupabase
        .from('stores')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle()
      store = data as { id: string } | null
      storeError = error
    } else if (host.endsWith('.localtest.me:3000')) {
      const subdomain = host.split('.localtest.me:3000')[0]
      const { data, error } = await adminSupabase
        .from('stores')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle()
      store = data as { id: string } | null
      storeError = error
    } else {
      // Producción: usar RPC para dominios personalizados o subdominios yahpos.cl
      const { data, error } = await adminSupabase
        .rpc('get_store_by_domain', { p_host: host })
        .maybeSingle()
      store = data as { id: string } | null
      storeError = error
    }

    // Fallback: si no hay tienda resuelta, servimos catalog.json (dev local / demo)
    if (storeError || !store) {
      return serveDemoCatalog(req)
    }

    const storeId = store.id
  
  const { searchParams } = new URL(req.url)
  const branchId = searchParams.get('branch_id')
  const slug = searchParams.get('slug')
  const categorySlug = searchParams.get('category')
  const searchTerm = searchParams.get('search')

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
        currentStock = branchInv ? branchInv.stock : (p.stock ?? 0)
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
        sku: p.sku || p.barcode || '',
        barcode: p.barcode || p.sku || '',
        brand: p.brand ?? '',
        volume: p.volume ?? '',
        supplierName: p.supplier_name ?? '',
        supplierMetadata: p.supplier_metadata ?? {},
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

    let matchingIds: number[] | null = null
    if (categorySlug) {
      const { data: allCategories, error: catError } = await supabase
        .from('products')
        .select('id, category')
        .eq('store_id', storeId)

      if (catError) {
        console.error('[API /products] Category Lookup Error:', catError.message)
        return NextResponse.json({ error: catError.message }, { status: 500 })
      }

      matchingIds = (allCategories ?? [])
        .filter((p: any) => generateSlug(p.category ?? '') === categorySlug.toLowerCase())
        .map((p: any) => p.id)
    } else if (searchTerm) {
      const { data: allSearchable, error: searchLookupError } = await supabase
        .from('products')
        .select('id, name, sku, barcode')
        .eq('store_id', storeId)

      if (searchLookupError) {
        console.error('[API /products] Search Lookup Error:', searchLookupError.message)
        return NextResponse.json({ error: searchLookupError.message }, { status: 500 })
      }

      const normalizedTerm = generateSlug(searchTerm)
      matchingIds = (allSearchable ?? [])
        .filter((p: any) =>
          generateSlug(p.name ?? '').includes(normalizedTerm) ||
          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .map((p: any) => p.id)
    }

    let listQuery = supabase
      .from('products')
      .select('*, inventory(*)')
      .eq('store_id', storeId)
    if (matchingIds !== null) {
      listQuery = listQuery.in('id', matchingIds.length > 0 ? matchingIds : [-1])
    }
    const { data: products, error: listError } = await listQuery.order('name')

    if (listError) {
      console.error('[API /products] List Error:', listError.message)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const dataList = products ?? []

    // Si no hay productos en DB (tienda vacía, SIN filtro de categoría), servir catálogo
    // demo -- útil para dev local. Si HAY filtro de categoría y da 0 resultados reales,
    // NO mostrar el demo -- es una categoría real vacía, se debe ver vacía.
    if (dataList.length === 0 && !categorySlug && !searchTerm) {
      return serveDemoCatalog(req)
    }

    // NOTA: La columna `category` en products ya almacena el slug directamente
    // (ej: "alimentos", "bebidas"). No hay columna category_id en esta tabla.
    // Normalizar el schema de Supabase al formato que ya usa el front
    const normalized = dataList.map((p: any) => {
      // Si hay branchId, buscar el stock específico en la tabla inventory
      let currentStock = p.stock ?? 0
      if (branchId) {
        const branchInv = p.inventory?.find((inv: any) => String(inv.branch_id) === String(branchId))
        currentStock = branchInv ? branchInv.stock : (p.stock ?? 0)
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
        sku: p.sku || p.barcode || '',
        barcode: p.barcode || p.sku || '',
        brand: p.brand ?? '',
        volume: p.volume ?? '',
        supplierName: p.supplier_name ?? '',
        supplierMetadata: p.supplier_metadata ?? {},
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
        brand: validatedData.brand ?? '',
        volume: validatedData.volume ?? '',
        supplier_name: validatedData.supplierName ?? '',
        supplier_metadata: validatedData.supplierMetadata ?? {},
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
