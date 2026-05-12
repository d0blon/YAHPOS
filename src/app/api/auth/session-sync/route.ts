import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Session Sync Route
 * Recibe tokens de sesión por URL (usado solo en transiciones entre dominios/subdominios)
 * y establece las cookies en el dominio actual.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const accessToken = requestUrl.searchParams.get('access_token')
  const refreshToken = requestUrl.searchParams.get('refresh_token')
  const next = requestUrl.searchParams.get('next') || '/admin'
  
  // ❌ NO usar requestUrl.origin — Next.js normaliza la URL sin subdominio.
  //    Usar el Host header para construir el origen real.
  const host = request.headers.get('host') || ''
  const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  console.log(`[Session Sync] Intentando sincronizar sesión en origin: ${origin} (host: ${host})`)

  if (!accessToken || !refreshToken) {
    console.error('[Session Sync] Faltan tokens para sincronización')
    return NextResponse.redirect(`${origin}/login?error=sync_missing_tokens`)
  }

  // Preparar la respuesta de redirección primero
  const redirectUrl = new URL(next.startsWith('/') ? next : '/' + next, origin)
  const response = NextResponse.redirect(redirectUrl.toString())

  // Crear un cliente de Supabase que escriba directamente en esta respuesta
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              // Forzar secure:false para desarrollo local HTTP.
              // Si no se fuerza, @supabase/ssr puede poner secure:true
              // y el navegador no enviaría la cookie por HTTP.
              secure: false,
              sameSite: 'lax',
              path: '/',
            })
          )
        },
      },
    }
  )

  try {
    // Establecer la sesión (esto disparará el setAll anterior)
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    if (error) {
      console.error('[Session Sync] Error al establecer sesión:', error.message)
      return NextResponse.redirect(`${origin}/login?error=sync_failed`)
    }

    console.log(`[Session Sync] Sesión sincronizada para: ${data.user?.email}. Redirigiendo a: ${redirectUrl.pathname}`)
    return response

  } catch (err) {
    console.error('[Session Sync] Error inesperado:', err)
    return NextResponse.redirect(`${origin}/login?error=sync_unexpected`)
  }
}
