import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type Params = Promise<{ id: string }>

export async function GET(
  req: Request,
  { params }: { params: Params }
) {
  const supabase = createServerClient()
  const { id } = await params

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  req: Request,
  { params }: { params: Params }
) {
  const supabase = createServerClient()
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
  }

  // Remove undefined fields to avoid overwriting with null
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key])

  const { data, error } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('[PATCH /api/products] Supabase error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(
  req: Request,
  { params }: { params: Params }
) {
  const supabase = createServerClient()
  const { id } = await params

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Producto eliminado correctamente' })
}
