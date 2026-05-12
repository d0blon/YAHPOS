import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Usamos service role para bypass RLS

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno Supabase')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProducts() {
  console.log('--- Verificando productos en la base de datos ---')
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug, image')
    .limit(10)

  if (error) {
    console.error('Error al obtener productos:', error.message)
    return
  }

  console.table(products)

  const nullSlugs = products.filter(p => !p.slug)
  console.log(`\nProductos analizados: ${products.length}`)
  console.log(`Productos sin slug: ${nullSlugs.length}`)
  
  const jumboImages = products.filter(p => p.image?.includes('jumbo.cl'))
  console.log(`Productos con imágenes de Jumbo: ${jumboImages.length}`)
  
  if (jumboImages.length > 0) {
    console.log('\nEjemplo de URL de Jumbo:', jumboImages[0].image)
  }
}

checkProducts()
