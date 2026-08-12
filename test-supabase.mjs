import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddpzqayurvhgpllykku.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHB6cWF5dXJ2aGdwbGx5a2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NDg0MTQsImV4cCI6MjA5MDQyNDQxNH0.RegxACpC4UzUqK6eGqHvKDvcuA1MT7QIWpXP5hit4cY'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('Querying stores...')
const start = Date.now()
const { data, error } = await supabase.from('stores').select('*')
const duration = Date.now() - start

if (error) {
  console.error('Error:', error)
} else {
  console.log(`Success! Fetched ${data.length} stores in ${duration}ms`)
  console.log('Stores:', data.map(s => ({ id: s.id, subdomain: s.subdomain, name: s.name })))
}
