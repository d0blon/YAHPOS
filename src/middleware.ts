import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // 1. Proteger rutas que requieren sesión
  const protectedRoutes = ['/perfil', '/carrito', '/checkout', '/mis-turnos']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  if (isProtectedRoute && !session) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 2. Proteger rutas de ADMIN y POS
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isPosRoute = request.nextUrl.pathname.startsWith('/pos')

  if (isAdminRoute || isPosRoute) {
    if (!session) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const role = session.user.user_metadata?.role || 'customer'
    
    if (isAdminRoute && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    if (isPosRoute && role !== 'admin' && role !== 'cajero') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 3. Verificación de Plan (SaaS)
  // Obtenemos el plan de store_settings. Cachear esto sería ideal.
  const { data: storeSettings } = await supabase
    .from('store_settings')
    .select('tier')
    .single()

  const tier = storeSettings?.tier || 'basico'

  // Si el plan es básico y entra a la raíz (ecommerce), redirigir a /upgrade
  // Exceptuando rutas estáticas, api, auth, etc.
  const isPublicEcommerce = request.nextUrl.pathname === '/' || 
                             request.nextUrl.pathname.startsWith('/productos') ||
                             request.nextUrl.pathname.startsWith('/categoria')

  if (tier === 'basico' && isPublicEcommerce) {
    // Solo si no es admin/cajero logueado (que quizás quieren ver algo?)
    // Pero la regla dice: "Si el plan es básico, ve la pantalla de upgrade"
    return NextResponse.redirect(new URL('/upgrade', request.url))
  }

  // 4. Proteger /admin/pedidos (Requiere Plus o Elite)
  if (request.nextUrl.pathname.startsWith('/admin/pedidos') && tier === 'basico') {
    return NextResponse.redirect(new URL('/admin?error=upgrade_required', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
