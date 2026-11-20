import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient as createSSRClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase: Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
}

/**
 * 1. Client para el browser (Singleton)
 * Se usa createBrowserClient para manejar cookies automáticamente en el cliente.
 */
export const supabase = typeof window !== 'undefined' 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })

/**
 * 2. Client para procesos pesados de servidor (Admin/Cron) que bypass RLS.
 * Solo usar en el servidor.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada — createAdminClient no puede operar con anon key.')
  return createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  })
}

/**
 * 3. Client para API Routes / Server Actions / Server Components.
 * Esta función es ASÍNCRONA porque accede a cookies().
 */
export async function createClient() {
  // SEGURIDAD: Si se llama accidentalmente en el navegador, devolvemos el singleton síncronamente
  if (typeof window !== 'undefined') {
    return supabase;
  }

  try {
    // Import dinámico de next/headers para evitar que se incluya en el bundle del cliente
    const { cookies } = await import('next/headers')
    
    let cookieStore;
    try {
      cookieStore = await cookies()
    } catch {
      // Si cookies() falla (fuera de request scope, ej: build), usamos cliente básico
      return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      })
    }

    return createSSRClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              })
            )
          } catch {
            // Ignorar errores de set en Server Components (Next.js limita esto)
          }
        },
      },
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      }
    })
  } catch (err) {
    console.error('createClient: Error al inicializar cliente SSR:', err)
    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
  }
}

