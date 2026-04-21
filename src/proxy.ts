import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
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

    // Consultar el rol real en la tabla de perfiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = profile?.role || 'customer'
    
    // Roles con acceso total
    const isSuperUser = role === 'admin' || role === 'developer' || role === 'manager'

    if (isAdminRoute && !isSuperUser) {
      console.warn(`[Proxy] Acceso denegado a ADMIN: ${session.user.email} es [${role}]`)
      return NextResponse.redirect(new URL('/', request.url))
    }
    
    if (isPosRoute && !isSuperUser && role !== 'cajero') {
      console.warn(`[Proxy] Acceso denegado a POS: ${session.user.email} es [${role}]`)
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 3. Verificación de Plan (SaaS)
  const { data: storeSettings } = await supabase
    .from('store_settings')
    .select('tier')
    .single()

  const tier = storeSettings?.tier || 'basico'

  const isPublicEcommerce = request.nextUrl.pathname === '/' || 
                             request.nextUrl.pathname.startsWith('/productos') ||
                             request.nextUrl.pathname.startsWith('/categoria')

  if (tier === 'basico' && isPublicEcommerce) {
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
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
