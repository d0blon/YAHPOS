import { createClient } from '@supabase/supabase-js'

// Intentar leer de variables de entorno directamente (Next.js las carga en el shell a veces)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidas en el entorno.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim()
}

async function migrate() {
  console.log('--- Iniciando migración de Slugs ---')
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, slug')

  if (error) {
    console.error('Error:', error.message)
    return
  }

  const toUpdate = products.filter(p => !p.slug || p.slug === '')
  console.log(`Encontrados ${toUpdate.length} productos sin slug.`)

  for (const product of toUpdate) {
    const slug = generateSlug(product.name)
    const finalSlug = `${slug}-${product.id.split('-')[0]}` // Usar parte del ID para asegurar unicidad
    
    console.log(`Actualizando [${product.name}] -> ${finalSlug}`)
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ slug: finalSlug })
      .eq('id', product.id)

    if (updateError) {
      console.error(`Error al actualizar ${product.id}:`, updateError.message)
    }
  }

  console.log('--- Migración finalizada ---')
}

migrate()
