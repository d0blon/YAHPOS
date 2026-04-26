import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET() {
  const supabase = await createClient()

  try {
    const { data: products, error: pError } = await supabase
      .from('products')
      .select('category')

    if (pError) throw pError

    const uniqueNames = Array.from(new Set((products || []).map(p => p.category).filter(Boolean)))
    const mockCategories = uniqueNames.map(name => ({
      id: name,
      name: name,
      slug: String(name).toLowerCase().replace(/\s+/g, '-')
    }))

    return NextResponse.json(mockCategories)

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
