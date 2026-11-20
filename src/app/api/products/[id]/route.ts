import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'
import { parseBody } from '@/lib/validations/http'
import { productPatchSchema } from '@/lib/validations/api'

type Params = Promise<{ id: string }>

type ProductUpdate = {
  name?: string
  description?: string | null
  price?: number
  image?: string
  category?: string
  stock?: number
  unit?: string
  is_exempt?: boolean
  sku?: string
  barcode?: string
  nutritional_seals?: number
  is_realtime_tracked?: boolean
  supplier_name?: string
  supplier_metadata?: unknown
}

function errorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' && error !== null && 'message' in error &&
    typeof error.message === 'string' && error.message.length > 0
  ) {
    return error.message
  }
  return fallback
}

export async function GET(
  req: Request,
  { params }: { params: Params }
) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id } = await params

    const { data, error } = await auth.supabase
      .from('products')
      .select('id, store_id, name, slug, description, price, image, category, stock, low_stock_threshold, sku, barcode, brand, volume, supplier_name, supplier_metadata, unit, is_exempt, nutritional_seals, is_realtime_tracked, created_at, updated_at, inventory(branch_id, stock)')
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: unknown) {
    console.error('[GET /api/products/[id]] Error:', error)
    return NextResponse.json({ error: errorMessage(error, 'Error interno del servidor') }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Params }
) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id } = await params
    const parsed = await parseBody(req, productPatchSchema)
    if ('error' in parsed) return parsed.error
    const body = parsed.data

    const updateData: ProductUpdate = {
      name: body.name,
      description: body.description,
      price: body.price,
      image: body.image,
      category: body.category,
      stock: body.stock,
      unit: body.unit,
      is_exempt: body.isExempt,
      sku: body.sku,
      barcode: body.barcode || body.sku,
      nutritional_seals: body.nutritionalSeals,
      is_realtime_tracked: body.isRealtimeTracked,
      supplier_name: body.supplierName,
      supplier_metadata: body.supplierMetadata,
    }

    for (const key of Object.keys(updateData) as Array<keyof ProductUpdate>) {
      if (updateData[key] === undefined) delete updateData[key]
    }

    const { data: product, error: productError } = await auth.supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .select('id, store_id, name, slug, description, price, image, category, stock, unit, is_exempt, sku, barcode, brand, volume, supplier_name, supplier_metadata, nutritional_seals, is_realtime_tracked, created_at, updated_at')
      .single()

    if (productError) {
      console.error('[PATCH /api/products] Supabase error:', productError.message)
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    if (body.branchStocks && Array.isArray(body.branchStocks)) {
      for (const bs of body.branchStocks) {
        const { error: invError } = await auth.supabase
          .from('inventory')
          .upsert({
            product_id: id,
            branch_id: bs.branchId,
            stock: bs.stock,
            store_id: auth.storeId
          }, {
            onConflict: 'product_id, branch_id'
          })

        if (invError) {
          console.error('[PATCH /api/products] Inventory upsert error:', invError.message)
        }
      }
    }

    return NextResponse.json(product)
  } catch (error: unknown) {
    console.error('[PATCH /api/products/[id]] Error:', error)
    return NextResponse.json({ error: errorMessage(error, 'Error interno del servidor') }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Params }
) {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { id } = await params

    const { error } = await auth.supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('store_id', auth.storeId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Producto eliminado correctamente' })
  } catch (error: unknown) {
    console.error('[DELETE /api/products/[id]] Error:', error)
    return NextResponse.json({ error: errorMessage(error, 'Error interno del servidor') }, { status: 500 })
  }
}
