import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

type Params = Promise<{ id: string }>

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
      .select('*, inventory(*)')
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[GET /api/products/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
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
    const body = await req.json()

    const updateData: any = {
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
    }

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

    const { data: product, error: productError } = await auth.supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .eq('store_id', auth.storeId)
      .select()
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
            stock: bs.stock
          }, {
            onConflict: 'product_id, branch_id'
          })

        if (invError) {
          console.error('[PATCH /api/products] Inventory upsert error:', invError.message)
        }
      }
    }

    return NextResponse.json(product)
  } catch (error: any) {
    console.error('[PATCH /api/products/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
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
  } catch (error: any) {
    console.error('[DELETE /api/products/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
