import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase: Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
}

// Client para el browser (usa anon key, respeta RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client para el servidor / API Routes (usa service role, bypass RLS)
export function createServerClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  return createClient(supabaseUrl, serviceKey)
}
