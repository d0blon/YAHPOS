import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getRootOrigin } from '@/lib/config/root-origin'
import { resolveTrustedSsoOrigin, sanitizeNextPath } from '@/lib/auth/sso-target'

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
  const requestUrl = new URL(request.url)

  try {
    const rootOrigin = getRootOrigin()
    const fromOriginRaw = requestUrl.searchParams.get('from_origin')
    const nextRaw = requestUrl.searchParams.get('next') ?? '/admin'

    const trusted = await resolveTrustedSsoOrigin(fromOriginRaw)
    if (fromOriginRaw !== null && trusted === null) {
      return NextResponse.redirect(new URL('/login?error=invalid_origin', rootOrigin).toString())
    }

    const next = sanitizeNextPath(nextRaw, rootOrigin)

    const callbackUrl = new URL('/api/auth/callback', rootOrigin)
    callbackUrl.searchParams.set('next', next)
    if (trusted) callbackUrl.searchParams.set('from_origin', trusted.origin)

    console.log(`[Auth SSO] Iniciando OAuth desde raíz. Callback: ${callbackUrl.toString()}`)

    const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []

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
      return NextResponse.redirect(new URL('/login?error=sso_failed', trusted?.origin ?? rootOrigin).toString())
    }

    const response = NextResponse.redirect(data.url)
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, { ...options, secure: rootOrigin.startsWith('https:'), sameSite: 'lax', path: '/' })
    })

    return response
  } catch (err) {
    console.error('[Auth SSO] Error:', err)
    return NextResponse.redirect(new URL('/login?error=sso_error', requestUrl.origin).toString())
  }
}
