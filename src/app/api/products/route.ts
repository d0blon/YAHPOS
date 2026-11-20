import { NextResponse } from 'next/server'
import { parseBody, parseQuery } from '@/lib/validations/http'
import { productsQuerySchema } from '@/lib/validations/api'
import { createClient, createAdminClient } from '@/lib/supabase'
import { withAuth } from '@/lib/api-utils'
import { generateSlug } from '@/lib/utils'
import { productSchema } from '@/lib/validations/products'
import fs from 'fs'
import path from 'path'

export const revalidate = 60;

const DEMO_HOST_PREFIX = 'master.'

interface CatalogItem {
  name: string
  price: number
  sku?: string
  brand?: string
  images?: string[]
  tags?: string[]
  name_raw?: string
  category_main?: string
}

interface NormalizedProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  image: string
  category: string
  categorySlug: string
  categoryId: string
  stock: number
  lowStockThreshold: number
  sku: string
  barcode: string
  brand: string
  unit: string
  isActive: boolean
  isFeatured: boolean
  discount: number
  isExempt: boolean
  nutritionalSeals: number
  isRealtimeTracked: boolean
  createdAt: string
  updatedAt: string
  tags?: string[]
  volume?: string | null
  supplierName?: string | null
  supplierMetadata?: unknown
}

interface InventoryRow {
  branch_id: string | number
  stock: number
}

interface ProductRow {
  id: string | number
  name: string
  slug: string
  description: string | null
  price: number
  image: string | null
  category: string | null
  stock: number | null
  low_stock_threshold: number | null
  sku: string | null
  barcode: string | null
  brand: string | null
  volume: string | null
  supplier_name: string | null
  supplier_metadata: unknown
  unit: string | null
  is_exempt: boolean | null
  nutritional_seals: number | null
  is_realtime_tracked: boolean | null
  created_at: string
  updated_at: string
  inventory: InventoryRow[] | null
}

interface CategoryLookupRow {
  id: number
  category: string | null
}

interface SearchLookupRow {
  id: number
  name: string | null
  sku: string | null
  barcode: string | null
}

let catalogCache: CatalogItem[] | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string') throw new Error(`catalog.json: ${field} debe ser string`)
  return value
}

function optionalStringArray(value: unknown, field: string): string[] | undefined {
  if (value === undefined || value === null) return undefined
  if (!Array.isArray(value) || value.some((entry: unknown) => typeof entry !== 'string')) {
    throw new Error(`catalog.json: ${field} debe ser un array de strings`)
  }
  return value as string[]
}

function parseCatalog(raw: unknown): CatalogItem[] {
  if (!Array.isArray(raw)) throw new Error('catalog.json debe ser un array')

  return raw.map((value: unknown): CatalogItem => {
    if (!isRecord(value)) throw new Error('catalog.json: item inválido')

    const name = optionalString(value.name, 'name')
    if (name === undefined) throw new Error('catalog.json: name requerido')
    if (typeof value.price !== 'number') throw new Error('catalog.json: price requerido')

    return {
      name,
      price: value.price,
      sku: optionalString(value.sku, 'sku'),
      brand: optionalString(value.brand, 'brand'),
      images: optionalStringArray(value.images, 'images'),
      tags: optionalStringArray(value.tags, 'tags'),
      name_raw: optionalString(value.name_raw, 'name_raw'),
      category_main: optionalString(value.category_main, 'category_main'),
    }
  })
}

function loadCatalog(): CatalogItem[] {
  if (catalogCache) return catalogCache
  const filePath = path.join(process.cwd(), 'public', 'data', 'catalog.json')
  const raw: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  catalogCache = parseCatalog(raw)
  return catalogCache
}

function transformCatalogItem(item: CatalogItem, index: number): NormalizedProduct {
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

function normalizeDbProduct(p: ProductRow, branchId: string | undefined): NormalizedProduct {
  let currentStock = p.stock ?? 0
  if (branchId) {
    const branchInv = (p.inventory ?? []).find(
      (inv: InventoryRow) => String(inv.branch_id) === String(branchId)
    )
    currentStock = branchInv ? branchInv.stock : (p.stock ?? 0)
  }

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
}

function resolveStoreId(value: unknown): string | null {
  if (!isRecord(value)) return null
  const id = value.id
  return typeof id === 'string' && id.length > 0 ? id : null
}

function errorMessage(error: unknown): string {
  const fallback = 'Error interno del servidor'
  if (error instanceof Error) return error.message || fallback
  if (isRecord(error) && typeof error.message === 'string' && error.message.length > 0) {
    return error.message
  }
  return fallback
}

function serveDemoCatalog(req?: Request) {
  try {
    const catalog = loadCatalog()
    let slug: string | undefined
    let category: string | undefined
    let search: string | undefined
    if (req) {
      const parsed = parseQuery(req, productsQuerySchema)
      if ('error' in parsed) return parsed.error
      ;({ slug, category, search } = parsed.data)
    }

    if (slug && req) {
      const item = catalog.find((p: CatalogItem) => generateSlug(p.name) === slug)
      if (!item) {
        return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
      }
      const idx = catalog.indexOf(item)
      return NextResponse.json(transformCatalogItem(item, idx))
    }

    let filtered = catalog
    if (category) {
      filtered = catalog.filter((item: CatalogItem) => {
        const itemSlug = (item.category_main || '').toLowerCase().replace(/\s+/g, '-')
        return itemSlug === category.toLowerCase()
      })
    } else if (search) {
      const term = generateSlug(search)
      filtered = catalog.filter((item: CatalogItem) => generateSlug(item.name || '').includes(term))
    }

    const transformed = filtered.map((item: CatalogItem, i: number) => transformCatalogItem(item, i))
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
    // Unica resolución de tienda: la RPC normaliza dominio personalizado,
    // subdominio raíz y sufijos dev (SQL), sin consultar `stores` directamente.
    const { data: storeData, error: storeError } = await adminSupabase
      .rpc('get_store_by_domain', { p_host: host })
      .maybeSingle()
    const storeId = storeError ? null : resolveStoreId(storeData)

    // Sin tienda resuelta: solo el prefijo master. sirve catálogo demo.
    // Cualquier otro host fail-closed: nunca catálogo falso en una tienda real.
    if (!storeId) {
      if (host.startsWith(DEMO_HOST_PREFIX)) return serveDemoCatalog(req)
      return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 404 })
    }

    const parsedQuery = parseQuery(req, productsQuerySchema)
    if ('error' in parsedQuery) return parsedQuery.error
    const { branch_id: branchId, slug, category: categorySlug, search: searchTerm } = parsedQuery.data

    // La policy pública de lectura se eliminó: el catálogo se sirve con el cliente
    // admin, siempre acotado por store_id resuelto en servidor desde el Host.
    if (slug) {
      const { data: product, error: productError } = await adminSupabase
        .from('products')
        .select('id, name, slug, description, price, image, category, stock, low_stock_threshold, sku, barcode, brand, volume, supplier_name, supplier_metadata, unit, is_exempt, nutritional_seals, is_realtime_tracked, created_at, updated_at, inventory(branch_id, stock)')
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

      return NextResponse.json(normalizeDbProduct(product as ProductRow, branchId))
    }

    let matchingIds: number[] | null = null
    if (categorySlug) {
      const { data: allCategories, error: catError } = await adminSupabase
        .from('products')
        .select('id, category')
        .eq('store_id', storeId)

      if (catError) {
        console.error('[API /products] Category Lookup Error:', catError.message)
        return NextResponse.json({ error: catError.message }, { status: 500 })
      }

      const rows = (allCategories ?? []) as CategoryLookupRow[]
      matchingIds = rows
        .filter((p: CategoryLookupRow) => generateSlug(p.category ?? '') === categorySlug.toLowerCase())
        .map((p: CategoryLookupRow) => p.id)
    } else if (searchTerm) {
      const { data: allSearchable, error: searchLookupError } = await adminSupabase
        .from('products')
        .select('id, name, sku, barcode')
        .eq('store_id', storeId)

      if (searchLookupError) {
        console.error('[API /products] Search Lookup Error:', searchLookupError.message)
        return NextResponse.json({ error: searchLookupError.message }, { status: 500 })
      }

      const normalizedTerm = generateSlug(searchTerm)
      const rows = (allSearchable ?? []) as SearchLookupRow[]
      matchingIds = rows
        .filter((p: SearchLookupRow) =>
          generateSlug(p.name ?? '').includes(normalizedTerm) ||
          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .map((p: SearchLookupRow) => p.id)
    }

    let listQuery = adminSupabase
      .from('products')
      .select('id, name, slug, description, price, image, category, stock, low_stock_threshold, sku, barcode, brand, volume, supplier_name, supplier_metadata, unit, is_exempt, nutritional_seals, is_realtime_tracked, created_at, updated_at, inventory(branch_id, stock)')
      .eq('store_id', storeId)
    if (matchingIds !== null) {
      listQuery = listQuery.in('id', matchingIds.length > 0 ? matchingIds : [-1])
    }
    const { data: products, error: listError } = await listQuery.order('name').limit(1000)

    if (listError) {
      console.error('[API /products] List Error:', listError.message)
      return NextResponse.json({ error: listError.message }, { status: 500 })
    }

    const dataList = (products ?? []) as ProductRow[]

    // Catálogo demo SOLO en la tienda demo (master.*). Una tienda real con
    // catálogo vacío debe verse vacía: nunca se le inyectan datos de otro origen.
    if (dataList.length === 0 && !categorySlug && !searchTerm && host.startsWith(DEMO_HOST_PREFIX)) {
      return serveDemoCatalog(req)
    }

    // NOTA: La columna `category` en products ya almacena el slug directamente
    // (ej: "alimentos", "bebidas"). No hay columna category_id en esta tabla.
    const normalized: NormalizedProduct[] = dataList.map((p: ProductRow) =>
      normalizeDbProduct(p, branchId)
    )

    return NextResponse.json(normalized)
  } catch (err) {
    console.error('[GET /api/products] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const parsed = await parseBody(req, productSchema)
    if ('error' in parsed) return parsed.error
    const validatedData = parsed.data

    const baseSlug = validatedData.slug || generateSlug(validatedData.name)
    let finalSlug = baseSlug

    // Verificación rápida de duplicados (scoping por store_id de la sesión)
    const { data: existingProduct } = await auth.supabase
      .from('products')
      .select('slug')
      .eq('slug', baseSlug)
      .eq('store_id', auth.storeId)
      .single()

    if (existingProduct) {
      finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`
    }

    const { data: product, error: productError } = await auth.supabase
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
        store_id: auth.storeId,
      }])
      .select('id, store_id, name, slug, description, price, image, category, stock, unit, is_exempt, sku, barcode, brand, volume, supplier_name, supplier_metadata, nutritional_seals, is_realtime_tracked, created_at, updated_at')
      .single()

    if (productError) {
      console.error('[POST /api/products] Supabase error:', productError.message, productError.details, productError.hint)
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    // Si hay stock por sucursal (Plan Élite), insertar en tabla inventory
    if (validatedData.branchStocks && Array.isArray(validatedData.branchStocks) && validatedData.branchStocks.length > 0) {
      const inventoryData = validatedData.branchStocks.map((bs) => ({
        product_id: product.id,
        branch_id: bs.branchId,
        stock: bs.stock,
        store_id: auth.storeId
      }))

      const { error: invError } = await auth.supabase
        .from('inventory')
        .insert(inventoryData)

      if (invError) {
        console.error('[POST /api/products] Inventory error:', invError.message)
        // No fallamos el request principal pero logeamos el error
      }
    }

    return NextResponse.json(product, { status: 201 })
  } catch (error: unknown) {
    console.error('[POST /api/products] Error:', error)
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
