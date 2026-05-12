import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixImages() {
  console.log('--- Iniciando corrección de Imágenes de Jumbo ---')
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, image')
    .ilike('image', '%cdn.jumbo.cl%')

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log(`Encontrados ${products.length} productos con URLs de Jumbo antiguas.`)

  for (const product of products) {
    const newImage = product.image.replace('cdn.jumbo.cl', 'jumbo.vteximg.com.br')
    
    console.log(`Actualizando [${product.name}]:\n  Vieja: ${product.image}\n  Nueva: ${newImage}`)
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ image: newImage })
      .eq('id', product.id)

    if (updateError) {
      console.error(`Error al actualizar ${product.id}:`, updateError.message)
    }
  }

  console.log('--- Corrección finalizada ---')
}

fixImages()
