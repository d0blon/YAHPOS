import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/ratelimit'
import {
  getRequestProtocol,
  getRootRedirectUrl,
  isRootRequestHost,
} from '@/lib/config/root-domain'
import { getRootOriginSafe, ROOT_ORIGIN_ENV_VAR } from '@/lib/config/root-origin'

import { DEVELOPER_EMAILS } from '@/lib/constants'
import { normalizeRole, AppRole } from '@/lib/constants/roles'
import { Store } from './types'

/** CSP con nonce por request: Next inyecta el nonce en <script>/<link> solo si
 * el header CSP viene en el REQUEST. `x-nonce` además permite leerlo en componentes. */
function buildCsp(nonce: string, protocol: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  // HTTP sin TLS (dev/Tailscale) no puede elevar subrecursos a HTTPS: rompe CSS y chunks.
  const upgradeInsecure = !isDev || protocol === 'https'
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "worker-src 'self'",
    'img-src \'self\' blob: data: https://*.supabase.co https://i.pravatar.cc https://images.unsplash.com https://cdn.jumbo.cl https://jumbo.vteximg.com.br https://*.cugat.cl https://cugat.cl https://placehold.co https://*.placehold.co',
    "font-src 'self' https://fonts.gstatic.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'connect-src \'self\' https://*.supabase.co wss://*.supabase.co https://maullin.sii.cl https://palena.sii.cl https://*.vercel-storage.com',
    ...(upgradeInsecure ? ['upgrade-insecure-requests'] : []),
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce, getRequestProtocol(request.headers))
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const withCsp = <T extends Response>(response: T): T => {
    response.headers.set('Content-Security-Policy', csp)
    return response
  }

  const rootConfig = getRootOriginSafe()
  if (rootConfig === null) {
    console.error(`[Proxy] Configuración de origen raíz inválida: ${ROOT_ORIGIN_ENV_VAR}.`)
    return withCsp(new NextResponse('Configuración de origen raíz inválida.', { status: 500 }))
  }

  // El protocolo de la plataforma es config, no un header que pueda inyectar el cliente.
  requestHeaders.set('x-forwarded-proto', new URL(rootConfig).protocol.slice(0, -1))

  const path = request.nextUrl.pathname
  const host = (request.headers.get('host') || '').toLowerCase()
  const isRootDomain = isRootRequestHost(host)

  // Anti-loop: si llegó _mw_loop a un redirect que no sea /login, cortar
  if (request.nextUrl.searchParams.has('_mw_loop') && !path.startsWith('/login')) {
    console.error(`[Middleware] Loop detectado en ${host}${path}`)
    return withCsp(new NextResponse('Loop detectado. Limpia cookies e intenta de nuevo.', { status: 500 }))
  }

  // 0. Fail-safe para OAuth: Si llega un code al root (/) en lugar de /api/auth/callback
  // Esto pasa si la configuración de Supabase Site URL apunta al root.
  if (isRootDomain && path === '/' && request.nextUrl.searchParams.has('code')) {
    console.log('[Middleware] Detectado OAuth code en root. Redirigiendo a callback centralizado...')
    const callbackUrl = new URL('/api/auth/callback', request.url)
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    return withCsp(NextResponse.redirect(callbackUrl))
  }
  
  let rateCheck

  // 1. Detección de Dominio Raíz vs Tenant
  const isPublicAsset = path.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/) || path.startsWith('/_next') || path.startsWith('/data/')
  
  // Rutas que requieren pertenecer a una tienda (subdominio)
  const isAdminRoute = path.startsWith('/admin')
  const isPosRoute = path.startsWith('/pos') || path.startsWith('/vender')
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/register') || path.startsWith('/registro') || path.startsWith('/iniciar-sesion')
  
  // Bloqueo de seguridad: Si es dominio raíz, NO puede entrar a POS/Admin ni Login/Register
  const isDeveloperLoginFlow = path.startsWith('/login') &&
    request.nextUrl.searchParams.get('redirect')?.startsWith('/developer')

  if (isRootDomain && (isPosRoute || isAdminRoute || isAuthRoute) && !isDeveloperLoginFlow) {
    console.warn(`[Security] Bloqueo en raíz (${host}): acceso denegado a ${path}. Redirigiendo a Landing.`)
    const protocol = getRequestProtocol(requestHeaders)
    return withCsp(NextResponse.redirect(new URL('/', `${protocol}://${host}`)))
  }

  // Rutas que SIEMPRE son públicas (no requieren login ni tienda)
  const isPublicRoute = 
    path === '/' || 
    path.startsWith('/login') || 
    path.startsWith('/register') || 
    path.startsWith('/developer/catalog') ||
    path.startsWith('/api/auth/session-sync') ||
    path.startsWith('/api/auth/callback')

  if (isPublicAsset) return withCsp(NextResponse.next({ request: { headers: requestHeaders } }))

  const protectedRoutes = ['/perfil', '/carrito', '/checkout', '/mis-turnos']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))

  // 2. Supabase Client Initialization
  const response = withCsp(NextResponse.next({
    request: { headers: requestHeaders },
  }))

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
            response.cookies.set(name, value, { ...options, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' })
          })
        },
      },
      cookieOptions: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      },
    }
  )

  // 3. Resolución de Tienda (Multi-Tenancy)
  let storeData = null
  const isBotApiRoute = path.startsWith('/api/v1/bot')
  if (!isRootDomain && !isBotApiRoute) {
    let store = null;
    
    // Resolución siempre por RPC: la tabla stores ya no es legible por anon
    // (config contiene supervisorPin y configuración SII de la tienda).
    // La RPC devuelve solo id/tier/slug/name y colores públicos de branding.
    const { data } = await supabase.rpc('get_store_by_domain', { p_host: host }).maybeSingle()
    store = data

    if (store) {
      const s = store as unknown as Store
      storeData = s
      // Inyectar contexto de tienda en headers
      response.headers.set('x-store-id', s.id)
      response.headers.set('x-store-tier', s.tier)
      response.headers.set('x-store-slug', s.slug)
      response.headers.set('x-store-name', s.name)
      const config = (s as { config?: Record<string, unknown> }).config || {}
      response.headers.set('x-store-primary-color', (config.appearance_primary_color as string) || '#4b0082')
      response.headers.set('x-store-accent-color', (config.accent_color as string) || '#ff00ff')
      response.headers.set('x-store-surface-color', (config.surface_color as string) || '')
    } else {
      // Si no hay tienda y no es el root, redirigir al landing o 404
      console.warn(`[Proxy] Dominio no reconocido: ${host}. Redirigiendo a root.`)
      return withCsp(NextResponse.redirect(getRootRedirectUrl('/')))
    }
  }

  // 4. Rate Limiting
  // Los limitadores resuelven su propio backend. Si Redis no está disponible en
  // producción devuelven success:false (fail-closed) en vez de dejar todo abierto.
  const forwardedFor = request.headers.get('x-forwarded-for') || ''
  const ip = (forwardedFor.split(',')[0] || '').trim() || '127.0.0.1'

  const isAuthAttempt =
    path.startsWith('/login') ||
    path.startsWith('/register') ||
    path.startsWith('/iniciar-sesion') ||
    path.startsWith('/api/auth/register') ||
    path.startsWith('/api/auth/sso')

  const isOperational =
    path.startsWith('/api/orders') ||
    path.startsWith('/api/sii') ||
    path.startsWith('/api/ai')

  const publicApiPrefixes = [
    '/api/v1/bot/',
    '/api/auth/callback',
    '/api/auth/session-sync',
    '/api/health',
    '/api/ping',
    '/api/verify-dns',
    '/api/blumi/',
    '/api/customers/verify',
  ]
  const isPublicApi = publicApiPrefixes.some((prefix) => path.startsWith(prefix))

  if (isAuthAttempt) {
    rateCheck = await rateLimit.critical.limit(ip)
  } else if (isOperational) {
    rateCheck = await rateLimit.operational.limit(ip)
  } else if (isPublicApi) {
    rateCheck = await rateLimit.public.limit(ip)
  }

  if (rateCheck && !rateCheck.success) {
    if (rateCheck.unavailable) {
      console.error('[RateLimit] Limitador no disponible en producción; solicitud bloqueada')
      return withCsp(NextResponse.json({ error: 'Servicio temporalmente no disponible' }, { status: 503 }))
    }
    return withCsp(NextResponse.json({ error: 'Too many requests' }, { status: 429 }))
  }

  // 5. Auth & RBAC
  let user = null
  let authError = null
  try {
    const result = await supabase.auth.getUser()
    user = result.data?.user ?? null
    authError = result.error
  } catch (err) {
    console.error('[Middleware] Auth cookies corruptos, limpiando...', (err as Error).message)
    // Limpiar todas las cookies sb-* que tengan formato viejo/incompatible
    // para que el próximo request funcione sin issues
    const authCookies = request.cookies.getAll().filter(c => c.name.startsWith('sb-'))
    for (const cookie of authCookies) {
      request.cookies.set(cookie.name, '')
      response.cookies.set(cookie.name, '', { maxAge: 0, path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' })
    }
  }
  
  if (authError) {
    console.error('[Middleware] Auth Error:', authError.message)
  }
  
  // Auth state successfully checked
  
  const isDeveloper = !!user && DEVELOPER_EMAILS.includes(user.email?.toLowerCase() || '')

  if (!user && !isPublicRoute && (isAdminRoute || isPosRoute || isProtectedRoute || path.startsWith('/developer'))) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    // Sanitizar: eliminar trailing dots del redirect path
    const cleanPath = path.replace(/\.+$/, '')
    redirectUrl.searchParams.set('redirect', cleanPath)
    redirectUrl.searchParams.set('_mw_loop', '1')
    
    const redirectResponse = NextResponse.redirect(redirectUrl)
    
    // IMPORTANTE: Traspasar cookies (posible refresh de token) al redirect
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie)
    })
    
    return withCsp(redirectResponse)
  }

  if (user && (isAdminRoute || isPosRoute)) {
    // Verificar rol global para bypass de developer ya se hizo arriba
    
    // Si estamos en un subdominio, verificar rol/tienda del perfil.
    // (antes leía user_stores, que ningún flujo real de creación de dueños/personal
    // llena -- profiles.role/store_id es la fuente de verdad real, igual que en RLS)
    if (storeData) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, store_id')
        .eq('id', user.id)
        .single()

      let userRole = (profile?.store_id === storeData.id) ? (profile?.role || 'customer') : 'customer'
      if (isDeveloper) userRole = 'developer'

      const isSuperUser = ['admin', 'developer', 'manager', 'owner', 'superadmin'].includes(userRole.toLowerCase())

      // Validar acceso según ruta
      if (isAdminRoute && !isSuperUser) {
        return withCsp(NextResponse.redirect(new URL('/?error=unauthorized_admin', request.url)))
      }

      if (isPosRoute && !isSuperUser && normalizeRole(userRole) !== AppRole.CASHIER) {
        return withCsp(NextResponse.redirect(new URL('/?error=unauthorized_pos', request.url)))
      }
    }
  }

  // Rutas exclusivas para Developer
  if (user && path.startsWith('/developer') && !isPublicRoute && !isDeveloper) {
    return withCsp(NextResponse.redirect(new URL('/admin', request.url)))
  }

  return response

}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
