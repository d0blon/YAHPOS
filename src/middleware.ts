import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware de PatagoniaPOS
 * 
 * Intercepta TODAS las peticiones antes de que se renderice cualquier página.
 * Aplica dos capas de protección:
 *   1. Autenticación: ¿El usuario tiene sesión activa?
 *   2. Roles: ¿Tiene el rol necesario para esta ruta?
 * 
 * NOTA: La protección por Plan SaaS se maneja a nivel de componente/página
 * porque requiere consultar la DB, lo cual tiene más latencia en el edge.
 */

// Rutas que requieren sesión activa
const PROTECTED_ROUTES = [
  '/carrito',
  '/checkout',
  '/perfil',
  '/completar-perfil',
  '/mis-turnos',
  '/flow-confirmation',
]

// Rutas que requieren rol admin o superior
const ADMIN_ROUTES = [
  '/admin',
]

// Rutas que requieren rol cajero o admin
const CASHIER_ROUTES = [
  '/pos',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  // Crear cliente de Supabase compatible con el edge (middleware)
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
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Obtener sesión del usuario
  const { data: { user } } = await supabase.auth.getUser()

  // ─────────────────────────────────────────────────────────────
  // 1. PROTECCIÓN DE RUTAS QUE REQUIEREN SESIÓN
  // ─────────────────────────────────────────────────────────────
  const needsAuth = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  
  if (needsAuth && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    loginUrl.searchParams.set('msg', 'Debes iniciar sesión para continuar')
    return NextResponse.redirect(loginUrl)
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PROTECCIÓN DE RUTAS DE ADMIN
  // ─────────────────────────────────────────────────────────────
  const needsAdmin = ADMIN_ROUTES.some(route => pathname.startsWith(route))
  
  // /admin/developer tiene su propio sistema de seguridad (2FA + Master Key)
  const isDeveloperPanel = pathname.startsWith('/admin/developer')

  if (needsAdmin && !isDeveloperPanel) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      loginUrl.searchParams.set('msg', 'Acceso restringido. Inicia sesión como administrador.')
      return NextResponse.redirect(loginUrl)
    }

    // Verificar rol admin en metadata del usuario
    const userRole = user.user_metadata?.role || user.app_metadata?.role
    if (userRole !== 'admin' && userRole !== 'developer') {
      return NextResponse.redirect(new URL('/?access=denied', request.url))
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PROTECCIÓN DE RUTAS DE CAJERO (POS)
  // ─────────────────────────────────────────────────────────────
  const needsCashier = CASHIER_ROUTES.some(route => pathname.startsWith(route))

  if (needsCashier) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      loginUrl.searchParams.set('msg', 'Inicia sesión para acceder al POS')
      return NextResponse.redirect(loginUrl)
    }

    const userRole = user.user_metadata?.role || user.app_metadata?.role
    const allowedRoles = ['admin', 'developer', 'cajero']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/?access=denied', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Aplica el middleware a todas las rutas EXCEPTO:
     * - Archivos estáticos (_next/static, _next/image, favicon, etc.)
     * - Rutas de la API
     * - Service Worker
     */
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
