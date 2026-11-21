import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Faltan variables de entorno Supabase')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function getUserId() {
  const { data, error } = await supabase.from('profiles').select('id').limit(1).single()
  if (error) {
    console.error('Error:', error)
    return
  }
  console.log('VALID_USER_ID:', data.id)
}

getUserId()
