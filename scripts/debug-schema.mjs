import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugSchema() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error.message)
    return
  }

  if (data && data.length > 0) {
    console.log('Columnas encontradas:', Object.keys(data[0]))
    console.log('Valor del slug para el primer producto:', data[0].slug)
  } else {
    console.log('No hay productos para analizar.')
  }
}

debugSchema()
