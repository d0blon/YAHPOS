import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

type Params = Promise<{ id: string }>

export async function GET(
  req: Request,
  { params }: { params: Params }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('products')
      .select('*, inventory(*)')
      .eq('id', id)
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()

    // Only include columns that exist in the database
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

    // Remove undefined fields to avoid overwriting with null
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (productError) {
      console.error('[PATCH /api/products] Supabase error:', productError.message)
      return NextResponse.json({ error: productError.message }, { status: 500 })
    }

    // Si hay stock por sucursal, upsert en tabla inventory
    if (body.branchStocks && Array.isArray(body.branchStocks)) {
      for (const bs of body.branchStocks) {
        const { error: invError } = await supabase
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Producto eliminado correctamente' })
  } catch (error: any) {
    console.error('[DELETE /api/products/[id]] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
