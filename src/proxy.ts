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

  // Usamos getUser() que es más robusto para validaciones de servidor
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
  const isPosRoute = request.nextUrl.pathname.startsWith('/pos')
  const protectedRoutes = ['/perfil', '/carrito', '/checkout', '/mis-turnos']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // A. Si no hay usuario y la ruta es protegida -> LOGIN
  if (!user && (isAdminRoute || isPosRoute || isProtectedRoute)) {
    console.log(`[Proxy] No user found for protected route ${request.nextUrl.pathname}. Redirecting to /login`)
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // B. Si hay usuario, validamos roles para Admin y POS
  if (user && (isAdminRoute || isPosRoute)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role || 'customer'
    const isSuperUser = role === 'admin' || role === 'developer' || role === 'manager'

    if (isAdminRoute && !isSuperUser) {
      console.warn(`[Proxy] Rol insuficiente [${role}] para ADMIN. Redirecting to /`)
      return NextResponse.redirect(new URL('/?error=unauthorized_admin', request.url))
    }

    if (isPosRoute && !isSuperUser && role !== 'cajero') {
      console.warn(`[Proxy] Rol insuficiente [${role}] para POS. Redirecting to /`)
      return NextResponse.redirect(new URL('/?error=unauthorized_pos', request.url))
    }

    // Rutas exclusivas para developer/admin — el manager no puede acceder
    const developerOnlyRoutes = ['/admin/personal', '/admin/configuracion', '/admin/developer', '/admin/reportes']
    const isDeveloperOnly = developerOnlyRoutes.some(r => request.nextUrl.pathname.startsWith(r))
    if (isDeveloperOnly && role === 'manager') {
      console.warn(`[Proxy] Ruta restringida para manager: ${request.nextUrl.pathname}`)
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // C. Verificación de Plan SaaS (Solo para el ecommerce público)
  const isPublicEcommerce = request.nextUrl.pathname === '/' || 
                             request.nextUrl.pathname.startsWith('/productos') ||
                             request.nextUrl.pathname.startsWith('/categoria')

  if (isPublicEcommerce) {
    const { data: storeSettings } = await supabase.from('store_settings').select('tier').single()
    const tier = storeSettings?.tier || 'basico'

    if (tier === 'basico') {
      return NextResponse.redirect(new URL('/upgrade', request.url))
    }
  }

  // D. Proteger /admin/pedidos por plan
  if (request.nextUrl.pathname.startsWith('/admin/pedidos')) {
    const { data: storeSettings } = await supabase.from('store_settings').select('tier').single()
    if (storeSettings?.tier === 'basico') {
      return NextResponse.redirect(new URL('/admin?error=upgrade_required', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
