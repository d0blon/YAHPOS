import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-utils'

function errorMessage(error: unknown): string | undefined {
  return typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
    ? error.message
    : undefined
}

export async function GET() {
  try {
    const auth = await withAuth()
    if (auth.error) return auth.error

    const { data: products, error: pError } = await auth.supabase
      .from('products')
      .select('category')
      .eq('store_id', auth.storeId)

    if (pError) throw pError

    const uniqueNames = Array.from(new Set((products || []).map(p => p.category).filter(Boolean)))
    const mockCategories = uniqueNames.map(name => ({
      id: name,
      name: name,
      slug: String(name).toLowerCase().replace(/\s+/g, '-')
    }))

    return NextResponse.json(mockCategories)

  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 })
  }
}
