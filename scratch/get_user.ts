import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddpzqayurvhgpllykku.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHB6cWF5dXJ2aGdwbGx5a2t1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDg0ODQxNCwiZXhwIjoyMDkwNDI0NDE0fQ.W3I5xzSR469ndL4FUU13_PJM0HWMB49PARrK4qlYC38'

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
