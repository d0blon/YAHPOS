import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Ejecuta con: node --env-file=.env.local test-supabase.mjs')
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Querying stores...')
const start = Date.now()
const { data, error } = await supabase.from('stores').select('id, subdomain, name').limit(10)
const duration = Date.now() - start

if (error) {
  console.error('Error:', error)
} else {
  console.log(`Success! Fetched ${data.length} stores in ${duration}ms`)
  console.log('Stores:', data.map(s => ({ id: s.id, subdomain: s.subdomain, name: s.name })))
}
