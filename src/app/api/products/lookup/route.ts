import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (!code || code.length < 8) {
    return NextResponse.json({ success: false, error: 'Código inválido' }, { status: 400 })
  }

  // Capa 1: Catálogo propio
  const supabase = await createClient()
  const { data: local } = await supabase
    .from('products')
    .select('name, category, image, sku, barcode')
    .or(`sku.eq.${code},barcode.eq.${code}`)
    .limit(1)
    .maybeSingle()

  if (local) {
    return NextResponse.json({
      success: true,
      source: 'internal',
      product: { 
        name: local.name, 
        category: local.category, 
        image_url: local.image 
      }
    })
  }

  // Capa 2: Open Food Facts
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
      signal: AbortSignal.timeout(5000)
    })
    const data = await res.json()
    
    if (data.status === 1) {
      // Mapeo de sellos chilenos desde Open Food Facts
      const labels = data.product.labels_tags || []
      const sealTags = [
        'en:high-in-sugars',
        'en:high-in-saturated-fat',
        'en:high-in-sodium',
        'en:high-in-salt',
        'en:high-in-calories',
        'en:high-in-energy'
      ]
      
      // Contar sellos únicos (sodium/salt y calories/energy son redundantes)
      const uniqueSeals = new Set<string>()
      labels.forEach((label: string) => {
        if (label === 'en:high-in-sugars') uniqueSeals.add('sugars')
        if (label === 'en:high-in-saturated-fat') uniqueSeals.add('fat')
        if (label === 'en:high-in-sodium' || label === 'en:high-in-salt') uniqueSeals.add('salt')
        if (label === 'en:high-in-calories' || label === 'en:high-in-energy') uniqueSeals.add('calories')
      })

      return NextResponse.json({
        success: true,
        source: 'openfoodfacts',
        product: {
          name: data.product.product_name || data.product.generic_name,
          category: data.product.categories?.split(',')[0]?.trim(),
          image_url: data.product.image_url || data.product.image_front_url,
          brand: data.product.brands,
          quantity: data.product.quantity,
          nutritionalSeals: uniqueSeals.size
        }
      })
    }
  } catch (err) {
    console.error('[Product Lookup] Open Food Facts error:', err)
    // Timeout o error de red
  }

  // Capa 3: No encontrado
  return NextResponse.json({ success: false, source: null, error: 'Producto no encontrado' })
}
