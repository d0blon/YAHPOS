import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { DEVELOPER_EMAILS } from '@/lib/constants'

/** Helper: redirige a session-sync en fromOrigin para setear cookies en el subdominio */
async function redirectViaSessionSync(supabase: Awaited<ReturnType<typeof createClient>>, fromOrigin: string, next: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const fromUrl = new URL(fromOrigin)
    const syncUrl = new URL(`${fromUrl.protocol}//${fromUrl.host}/api/auth/session-sync`)
    syncUrl.searchParams.set('access_token', session.access_token)
    syncUrl.searchParams.set('refresh_token', session.refresh_token)
    syncUrl.searchParams.set('next', next)
    console.log(`[Auth Callback] Redirigiendo vía session-sync a: ${fromOrigin}`)
    return NextResponse.redirect(syncUrl.toString())
  }
  return NextResponse.redirect(`${fromOrigin}${next}`)
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/admin'
  const fromOrigin = requestUrl.searchParams.get('from_origin')
  const origin = requestUrl.origin
  const host = request.headers.get('host') || ''

  // Determinar si estamos en el dominio raíz
  const isRootDomain = host === 'yahpos.cl' || host === 'localhost:3000' || host === '127.0.0.1:3000' || host === 'www.yahpos.cl'

  // DEBUG: Log all cookies to diagnose PKCE code_verifier issue
  const allCookies = request.cookies.getAll()
  const codeVerifierCookie = allCookies.find(c => c.name.includes('code-verifier'))
  console.log(`[Auth Callback] Cookies recibidas: ${allCookies.length}`)
  console.log(`[Auth Callback] Cookie names: ${allCookies.map(c => c.name).join(', ')}`)
  console.log(`[Auth Callback] code_verifier present: ${!!codeVerifierCookie}`)

  if (code) {
    const supabase = await createClient()
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[Auth Callback] Error exchanging code:', error)
        const errorRedirect = fromOrigin || origin
        return NextResponse.redirect(`${errorRedirect}/login?error=auth_failed`)
      }

      const user = data.user
      
      // 1. Verificar si el usuario tiene perfil básico
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name, full_name')
        .eq('id', user.id)
        .single()
      
      const hasProfile = profile?.first_name || profile?.full_name || user.user_metadata?.full_name
      
      if (!hasProfile) {
        const profileRedirect = fromOrigin || origin
        return NextResponse.redirect(`${profileRedirect}/cuenta/completar-perfil?from=google`)
      }

      // 2. Determinar redirección basada en el rol y pertenencia a tiendas
      const isDeveloper = user.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase())
      const role = isDeveloper ? 'developer' : (profile?.role || 'customer')
      const isSuperUser = ['admin', 'developer', 'manager', 'owner', 'superadmin'].includes(role.toLowerCase())

      // 3. Lógica de Redirección Inteligente
      if (isRootDomain) {
        // Si el usuario vino desde una tienda específica, priorizar ese origen
        if (fromOrigin) {
          const fromUrl = new URL(fromOrigin)
          const fromHost = fromUrl.hostname

          // Extraer subdominio del origen para buscar tienda
          const isLocalDev = fromHost.includes('localhost') || fromHost.includes('127.0.0.1')
          const isYahpos = fromHost.includes('yahpos.cl')
          let subdomain: string | null = null
          if (isLocalDev) {
            const parts = fromHost.split('.localhost:3000')
            if (parts.length > 1) subdomain = parts[0]
          } else if (isYahpos) {
            const parts = fromHost.split('.yahpos.cl')
            if (parts.length > 1) subdomain = parts[0]
          }

          // Si es un subdominio válido, buscar membresía del usuario en esa tienda
          if (subdomain && !['www', ''].includes(subdomain)) {
            const { data: userStore } = await supabase
              .from('user_stores')
              .select('store_id, stores!inner(subdomain, custom_domain)')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .eq('stores.subdomain', subdomain)
              .maybeSingle()

            if (userStore) {
              console.log(`[Auth Callback] Staff redirigido a tienda: ${subdomain}`)
              return redirectViaSessionSync(supabase, fromOrigin, next)
            }
          }

          // Para clientes o staff sin membresía en esta tienda, volver al origen
          console.log(`[Auth Callback] Redirigiendo de raíz a origen: ${fromOrigin}`)
          return redirectViaSessionSync(supabase, fromOrigin, next)
        }

        // Sin fromOrigin: buscar primera tienda del usuario (staff/admin)
        const { data: userStores } = await supabase
          .from('user_stores')
          .select('store_id, stores(subdomain, custom_domain)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
        
        if (userStores && userStores.length > 0) {
          const store = userStores[0].stores as any
          const targetSubdomain = store.subdomain
          const protocol = origin.startsWith('https') ? 'https' : 'http'
          
          let targetHost = store.custom_domain || (host.includes('localhost') 
            ? `${targetSubdomain}.localhost:3000` 
            : `${targetSubdomain}.yahpos.cl`)

          console.log(`[Auth Callback] Redirigiendo de raíz a tienda: ${targetHost}`)
          
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            const syncUrl = new URL(`${protocol}://${targetHost}/api/auth/session-sync`)
            syncUrl.searchParams.set('access_token', session.access_token)
            syncUrl.searchParams.set('refresh_token', session.refresh_token)
            syncUrl.searchParams.set('next', next)
            return NextResponse.redirect(syncUrl.toString())
          }

          return NextResponse.redirect(`${protocol}://${targetHost}${next}`)
        }

        // Developer sin tienda → queda en root
        if (isSuperUser) {
          return NextResponse.redirect(`${origin}/developer`)
        }
      } else {
        // Ya estamos en un subdominio, simplemente seguir el flujo
        return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/' + next}`)
      }

    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      const errorRedirect = fromOrigin || origin
      return NextResponse.redirect(`${errorRedirect}/login?error=unexpected`)
    }
  }

  // Fallback: si hay fromOrigin, siempre pasa por session-sync para tener cookies en el subdominio
  if (fromOrigin) {
    const supabase = await createClient()
    return redirectViaSessionSync(supabase, fromOrigin, next)
  }

  return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`)
}
