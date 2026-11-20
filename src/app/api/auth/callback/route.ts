import { createClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'
import { DEVELOPER_EMAILS } from '@/lib/constants'
import { getRootOrigin } from '@/lib/config/root-origin'
import {
  isRootRequestHost,
  resolveTrustedSsoOrigin,
  sanitizeNextPath,
  type TrustedOrigin,
} from '@/lib/auth/sso-target'

type StoreDomain = { subdomain: string | null; custom_domain: string | null }

/** Helper: redirige a session-sync en un origin ya confiable para setear cookies en el subdominio */
async function redirectViaSessionSync(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trusted: TrustedOrigin,
  safeNext: string
) {
  const { data: { session } } = await supabase.auth.getSession()
  const base = new URL(trusted.origin)
  const internalNext = sanitizeNextPath(safeNext, trusted.origin)

  if (session) {
    const syncUrl = new URL('/api/auth/session-sync', base)
    syncUrl.searchParams.set('access_token', session.access_token)
    syncUrl.searchParams.set('refresh_token', session.refresh_token)
    syncUrl.searchParams.set('next', internalNext)
    console.log(`[Auth Callback] Redirigiendo vía session-sync a: ${trusted.host}`)
    return NextResponse.redirect(syncUrl.toString())
  }

  return NextResponse.redirect(new URL(internalNext, base).toString())
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const fromOriginRaw = requestUrl.searchParams.get('from_origin')
  const origin = requestUrl.origin
  const host = request.headers.get('host') || ''

  const rootOrigin = getRootOrigin()
  const rootUrl = new URL(rootOrigin)
  const rootHost = rootUrl.host.toLowerCase()
  const nextRaw = requestUrl.searchParams.get('next') || '/admin'
  const safeNext = sanitizeNextPath(nextRaw, rootOrigin)

  // Validar el boundary ANTES del exchange: un origin ajeno nunca debe recibir tokens.
  const trusted = await resolveTrustedSsoOrigin(fromOriginRaw)
  if (fromOriginRaw !== null && trusted === null) {
    return NextResponse.redirect(new URL('/login?error=invalid_origin', rootOrigin).toString())
  }

  const targetOrigin = trusted?.origin ?? rootOrigin
  const isRootDomain = isRootRequestHost(host)

  if (code) {
    const supabase = await createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('[Auth Callback] Error exchanging code:', error)
        return NextResponse.redirect(new URL('/login?error=auth_failed', targetOrigin).toString())
      }

      const user = data.user

      // 1. Verificar si el usuario tiene perfil básico
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, first_name')
        .eq('id', user.id)
        .single()

      const hasProfile = profile?.first_name || user.user_metadata?.full_name

      if (!hasProfile) {
        return NextResponse.redirect(new URL('/cuenta/completar-perfil?from=google', targetOrigin).toString())
      }

      // 2. Determinar redirección basada en el rol y pertenencia a tiendas
      const isDeveloper = user.email && DEVELOPER_EMAILS.includes(user.email.toLowerCase())
      const role = isDeveloper ? 'developer' : (profile?.role || 'customer')
      const isSuperUser = ['admin', 'developer', 'manager', 'owner', 'superadmin'].includes(role.toLowerCase())

      // 3. Lógica de Redirección Inteligente
      if (isRootDomain) {
        if (trusted) {
          // Staff: membresía por store_id cuando la RPC identificó la tienda.
          if (trusted.store) {
            const { data: membership } = await supabase
              .from('user_stores')
              .select('store_id')
              .eq('user_id', user.id)
              .eq('store_id', trusted.store.id)
              .eq('is_active', true)
              .maybeSingle()

            console.log(`[Auth Callback] store_id=${trusted.store.id} membership=${membership !== null}`)
          } else {
            // Dominio propio del root sin store resuelta: extraer subdominio del host raíz configurado.
            const fromHost = new URL(trusted.origin).host.toLowerCase()
            let subdomain: string | null = null
            if (fromHost.endsWith(`.${rootHost}`)) {
              const candidate = fromHost.slice(0, -(rootHost.length + 1))
              if (candidate.length > 0 && candidate !== 'www' && !candidate.includes('.')) {
                subdomain = candidate
              }
            }

            if (subdomain) {
              const { data: userStore } = await supabase
                .from('user_stores')
                .select('store_id, stores!inner(subdomain, custom_domain)')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .eq('stores.subdomain', subdomain)
                .maybeSingle()

              console.log(`[Auth Callback] Staff redirigido a tienda: ${subdomain} (membership=${userStore !== null})`)
            }
          }

          // Clientes y staff sin membresía vuelven al origen confiable.
          return redirectViaSessionSync(supabase, trusted, safeNext)
        }

        // Sin fromOrigin: buscar primera tienda del usuario (staff/admin)
        const { data: userStores } = await supabase
          .from('user_stores')
          .select('store_id, stores(subdomain, custom_domain)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)

        let targetStore: StoreDomain | null = null

        if (userStores && userStores.length > 0) {
          targetStore = userStores[0].stores as unknown as StoreDomain
        } else if (profile?.role) {
          // Fallback: user_stores no está poblada para cuentas reales. profiles.store_id
          // no tiene FK declarada hacia stores (confirmado: PostgREST no arma el embed,
          // PGRST200) -- por eso son 2 queries separadas, no un embed.
          const { data: profileData } = await supabase
            .from('profiles')
            .select('store_id')
            .eq('id', user.id)
            .not('store_id', 'is', null)
            .single()

          if (profileData?.store_id) {
            const { data: storeData } = await supabase
              .from('stores')
              .select('subdomain, custom_domain')
              .eq('id', profileData.store_id)
              .single()
            targetStore = storeData || null
          }
        }

        if (targetStore) {
          const targetHost = targetStore.custom_domain ||
            (targetStore.subdomain ? `${targetStore.subdomain}.${rootHost}` : rootHost)
          const base = new URL(rootOrigin)
          base.host = targetHost

          console.log(`[Auth Callback] Redirigiendo de raíz a tienda: ${base.host}`)

          const { data: { session } } = await supabase.auth.getSession()

          if (session) {
            const syncUrl = new URL('/api/auth/session-sync', base)
            syncUrl.searchParams.set('access_token', session.access_token)
            syncUrl.searchParams.set('refresh_token', session.refresh_token)
            syncUrl.searchParams.set('next', safeNext)
            return NextResponse.redirect(syncUrl.toString())
          }

          return NextResponse.redirect(new URL(safeNext, base).toString())
        }

        // Developer sin tienda → queda en root
        if (isSuperUser) {
          return NextResponse.redirect(new URL('/developer', targetOrigin).toString())
        }

        return NextResponse.redirect(new URL(safeNext, targetOrigin).toString())
      } else {
        // Ya estamos en un subdominio: navegación interna sobre el host de la request.
        return NextResponse.redirect(new URL(safeNext, origin).toString())
      }
    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      return NextResponse.redirect(new URL('/login?error=unexpected', targetOrigin).toString())
    }
  }

  // Fallback: si hay fromOrigin, siempre pasa por session-sync para tener cookies en el subdominio
  if (trusted) {
    const supabase = await createClient()
    return redirectViaSessionSync(supabase, trusted, safeNext)
  }

  return NextResponse.redirect(new URL(safeNext, origin).toString())
}
