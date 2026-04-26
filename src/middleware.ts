import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export default async function middleware(request: NextRequest) {
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

  const isAudit = request.nextUrl.searchParams.get('audit') === 'true'

  // A. Si no hay usuario y la ruta es protegida -> LOGIN (Saltamos si isAudit)
  if (!user && !isAudit && (isAdminRoute || isPosRoute || isProtectedRoute)) {
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
    const isSuperUser = ['admin', 'developer', 'manager', 'owner', 'superadmin'].includes(role.toLowerCase())

    if (isAdminRoute && !isSuperUser) {
      console.warn(`[Proxy] Rol insuficiente [${role}] para ADMIN. Redirecting to /`)
      return NextResponse.redirect(new URL('/?error=unauthorized_admin', request.url))
    }

    if (isPosRoute && !isSuperUser && role !== 'cajero') {
      console.warn(`[Proxy] Rol insuficiente [${role}] para POS. Redirecting to /`)
      return NextResponse.redirect(new URL('/?error=unauthorized_pos', request.url))
    }

    // Rutas exclusivas para el dueño técnico (Developer)
    const isDevOnlyRoute = request.nextUrl.pathname.startsWith('/admin/developer')
    if (isDevOnlyRoute && role !== 'developer') {
      console.warn(`[Proxy] Intento de acceso a zona developer por ${role}`)
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    // Rutas restringidas para manager (solo admin/developer entran)
    const adminOnlyRoutes = ['/admin/personal', '/admin/configuracion', '/admin/reportes']
    const isAdminOnly = adminOnlyRoutes.some(r => request.nextUrl.pathname.startsWith(r))
    if (isAdminOnly && role === 'manager') {
      console.warn(`[Proxy] Ruta restringida para manager: ${request.nextUrl.pathname}`)
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  // C. Verificación de Plan SaaS (Bloqueo de E-commerce y Pedidos por tienda)
  const isEcommerceRoute = request.nextUrl.pathname.startsWith('/productos') ||
                           request.nextUrl.pathname.startsWith('/categoria') ||
                           request.nextUrl.pathname.startsWith('/carrito') ||
                           request.nextUrl.pathname.startsWith('/checkout')

  if (isEcommerceRoute || request.nextUrl.pathname.startsWith('/admin/pedidos')) {
    const { data: profile } = await supabase.from('profiles').select('store_id').eq('id', user?.id).single()
    
    if (profile?.store_id) {
      const { data: storeSettings } = await supabase
        .from('store_settings')
        .select('tier')
        .eq('store_id', profile.store_id)
        .single()

      const tier = storeSettings?.tier || 'basico'

      if (tier === 'basico') {
        const target = isEcommerceRoute ? '/' : '/admin?error=upgrade_required'
        return NextResponse.redirect(new URL(target, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
