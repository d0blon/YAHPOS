import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Auth Bridge: Inicia el flujo de OAuth desde el dominio raíz para evitar errores de PKCE (bad_code_verifier).
 * Esto asegura que las cookies de auth se establezcan en el mismo dominio que el callback.
 * 
 * CRÍTICO: Este route handler NO usa createClient() de @/lib/supabase porque esa función
 * usa cookies() de next/headers y no garantiza que los Set-Cookie se propaguen al 
 * NextResponse.redirect() final. En su lugar, creamos el cliente SSR inline y escribimos
 * las cookies directamente en el objeto response que vamos a retornar.
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const fromOrigin = requestUrl.searchParams.get('from_origin')
    const next = requestUrl.searchParams.get('next') || '/admin'
    const host = request.headers.get('host') || ''
    
    const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
    const rootOrigin = isLocalhost ? 'http://localhost:3000' : 'https://yahpos.cl'
    
    const callbackUrl = new URL('/api/auth/callback', rootOrigin)
    if (next) callbackUrl.searchParams.set('next', next)
    if (fromOrigin) callbackUrl.searchParams.set('from_origin', fromOrigin)
    
    console.log(`[Auth SSO] Iniciando OAuth desde raíz. Callback: ${callbackUrl.toString()}`)

    const pendingCookies: { name: string; value: string; options: Record<string, any> }[] = []

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set({ name, value, ...options })
              pendingCookies.push({ name, value, options })
            })
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        }
      },
    })
    
    if (error) {
      console.error('[Auth SSO] Error starting OAuth:', error)
      return NextResponse.redirect(`${fromOrigin || rootOrigin}/login?error=sso_failed`)
    }

    const response = NextResponse.redirect(data.url)
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, { ...options, secure: false, sameSite: 'lax', path: '/' })
    })
    
    return response
  } catch (err) {
    console.error('[Auth SSO] Error:', err)
    return NextResponse.redirect(`/login?error=sso_error`)
  }
}
