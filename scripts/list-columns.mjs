import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function listColumns() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(0) // Solo queremos los headers

  if (error) {
    console.error('Error:', error.message)
    return
  }

  // En supabase-js, si no hay datos, a veces no obtenemos las columnas así.
  // Intentaremos obtener un registro real.
  const { data: record } = await supabase
    .from('products')
    .select('*')
    .limit(1)

  if (record && record.length > 0) {
    console.log('Columnas:', Object.keys(record[0]))
  } else {
    console.log('No se encontraron registros para inferir columnas.')
  }
}

listColumns()
