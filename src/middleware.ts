import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { rateLimit } from '@/lib/ratelimit'

import { DEVELOPER_EMAILS } from '@/lib/constants'
import { normalizeRole, AppRole } from '@/lib/constants/roles'
import { Store } from './types'

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const host = (request.headers.get('host') || '').toLowerCase()
  const isRootDomain = host === 'yahpos.cl' || host === 'localhost:3000' || host === '127.0.0.1:3000' || host === 'www.yahpos.cl'

  // Anti-loop: si llegó _mw_loop a un redirect que no sea /login, cortar
  if (request.nextUrl.searchParams.has('_mw_loop') && !path.startsWith('/login')) {
    console.error(`[Middleware] Loop detectado en ${host}${path}`)
    return new NextResponse('Loop detectado. Limpia cookies e intenta de nuevo.', { status: 500 })
  }

  const cookies = request.cookies.getAll()
  console.log(`[Middleware Log] Request: ${host}${path} | Cookie names: ${cookies.map(c => c.name).join(', ')}`)
  
  // 0. Fail-safe para OAuth: Si llega un code al root (/) en lugar de /api/auth/callback
  // Esto pasa si la configuración de Supabase Site URL apunta al root.
  if (isRootDomain && path === '/' && request.nextUrl.searchParams.has('code')) {
    console.log('[Middleware] Detectado OAuth code en root. Redirigiendo a callback centralizado...')
    const callbackUrl = new URL('/api/auth/callback', request.url)
    request.nextUrl.searchParams.forEach((value, key) => {
      callbackUrl.searchParams.set(key, value)
    })
    return NextResponse.redirect(callbackUrl)
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
    const protocol = host.includes('localhost') ? 'http' : 'https'
    return NextResponse.redirect(new URL('/', `${protocol}://${host}`))
  }

  // Rutas que SIEMPRE son públicas (no requieren login ni tienda)
  const isPublicRoute = 
    path === '/' || 
    path.startsWith('/login') || 
    path.startsWith('/register') || 
    path.startsWith('/developer/catalog') ||
    path.startsWith('/api/auth/session-sync') ||
    path.startsWith('/api/auth/callback')

  if (isPublicAsset) return NextResponse.next()

  const protectedRoutes = ['/perfil', '/carrito', '/checkout', '/mis-turnos']
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isAudit = request.nextUrl.searchParams.get('audit') === 'true'

  // 2. Supabase Client Initialization
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

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
    
    // Soporte para subdominios locales (.localhost:3000 o .localtest.me:3000)
    if (host.endsWith('.localhost:3000')) {
      const subdomain = host.split('.localhost:3000')[0]
      const { data } = await supabase.from('stores').select('*').eq('subdomain', subdomain).maybeSingle()
      store = data
    } else if (host.endsWith('.localtest.me:3000')) {
      const subdomain = host.split('.localtest.me:3000')[0]
      const { data } = await supabase.from('stores').select('*').eq('subdomain', subdomain).maybeSingle()
      store = data
    } else {
      // Producción: usar RPC para dominios personalizados o subdominios yahpos.cl
      const { data } = await supabase.rpc('get_store_by_domain', { p_host: host }).maybeSingle()
      store = data
    }

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
      response.headers.set('x-store-accent-color', (config.accent_color as string) || '#FFD100')
      response.headers.set('x-store-surface-color', (config.surface_color as string) || '')
    } else {
      // Si no hay tienda y no es el root, redirigir al landing o 404
      console.warn(`[Proxy] Dominio no reconocido: ${host}. Redirigiendo a root.`)
      return NextResponse.redirect(new URL('/', host.includes('localhost') ? 'http://localhost:3000' : 'https://yahpos.cl'))
    }
  }

  // 4. Rate Limiting
  const isUpstashConfigured = process.env.UPSTASH_REDIS_REST_URL && 
                             process.env.UPSTASH_REDIS_REST_URL !== 'https://xxxxx.upstash.io';

  if (isUpstashConfigured) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
    if (path.startsWith('/login') || path.startsWith('/register')) {
      rateCheck = await rateLimit.critical.limit(ip)
    } else if (path.startsWith('/api/orders') || path.startsWith('/api/sii')) {
      rateCheck = await rateLimit.operational.limit(ip)
    }
  }

  if (rateCheck && !rateCheck.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
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

  if (!user && !isAudit && !isPublicRoute && (isAdminRoute || isPosRoute || isProtectedRoute || path.startsWith('/developer'))) {
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
    
    return redirectResponse
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
        return NextResponse.redirect(new URL('/?error=unauthorized_admin', request.url))
      }

      if (isPosRoute && !isSuperUser && normalizeRole(userRole) !== AppRole.CASHIER) {
        return NextResponse.redirect(new URL('/?error=unauthorized_pos', request.url))
      }
    }
  }

  // Rutas exclusivas para Developer
  if (user && path.startsWith('/developer') && !isPublicRoute && !isDeveloper) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return response

}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
