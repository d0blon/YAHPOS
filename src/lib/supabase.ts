import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient as createSSRClient } from '@supabase/ssr'

// ⚠️ NO importar 'next/headers' al nivel superior de este archivo.
// Este módulo es importado tanto por código de servidor como de cliente.
// La función createClient() usa import() dinámico para acceder a cookies
// SOLO cuando se ejecuta en el servidor.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase: Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
}

// 1. Client para el browser (usa cookies automáticamente via @supabase/ssr)
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

// 2. Client para procesos pesados de servidor (Admin/Cron) que bypass RLS
// Usa la SERVICE_ROLE_KEY. ¡NO USAR EN EL CLIENTE!
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  })
}

/**
 * 3. Client para API Routes / Server Actions / Server Components.
 * Lee las cookies dinámicamente (import lazy) para no romper componentes cliente
 * que también importen este mismo módulo.
 * @returns Supabase Client con sesión de usuario vinculada a cookies.
 */
export async function createClient() {
  // Import dinámico: solo se ejecuta en el servidor, nunca en el bundle del cliente
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createSSRClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // El error se ignora si se llama desde un Server Component
          // ya que el middleware maneja la actualización de tokens.
        }
      },
    },
  })
}
