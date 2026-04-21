import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')

  if (error) {
    console.error('[API /products] Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Normalizar el schema de Supabase al formato que ya usa el front
  const normalized = (data ?? []).map((p: any) => ({
    id: String(p.id),
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    image: p.image ?? '',
    category: p.category ?? 'Sin categoría',
    categoryId: String(p.category_id ?? ''),
    stock: p.stock ?? 0,
    lowStockThreshold: 5,
    sku: p.sku ?? '',
    unit: p.unit ?? 'un',
    isActive: true,
    isFeatured: false,
    discount: 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: Request) {
  const supabase = createServerClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('products')
    .insert([{
      name: body.name,
      description: body.description,
      price: body.price,
      image: body.image ?? '',
      category: body.category,
      stock: body.stock ?? 0,
      unit: body.unit ?? 'unidad',
    }])
    .select()
    .single()

  if (error) {
    console.error('[POST /api/products] Supabase error:', error.message, error.details, error.hint)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
