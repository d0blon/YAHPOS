'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Session } from '@supabase/supabase-js'
import { clearTenantState, getActiveStoreId, setActiveStoreId } from '@/lib/tenant-state'
import { usePosStore } from '@/stores/posStore'
import { useSiiStore } from '@/stores/siiStore'
import { useCartStore } from '@/stores/cartStore'

/**
 * Sincroniza la sesión con las cookies (para el Proxy) y fija el tenant activo
 * del Host antes de exponer cualquier estado persistido a los stores.
 */
export function SessionSync() {
  const router = useRouter()
  const { refreshProfile } = useAuthStore()

  useEffect(() => {
    let mounted = true
    let isRefreshingProfile = false
    let initialSessionFired = false

    const handleSync = async (session: Session | null) => {
      if (!mounted || isRefreshingProfile) return
      isRefreshingProfile = true
      try {
        if (session) {
          const hostStoreId = getActiveStoreId()
          await refreshProfile(hostStoreId ?? undefined)

          const profileStoreId = useAuthStore.getState().user?.storeId ?? null

          if (hostStoreId && profileStoreId && hostStoreId !== profileStoreId) {
            await clearTenantState()
            return
          }

          const storeId = hostStoreId || profileStoreId
          if (storeId) setActiveStoreId(storeId)

          await Promise.all([
            usePosStore.persist.rehydrate(),
            useSiiStore.persist.rehydrate(),
            useCartStore.persist.rehydrate()
          ])
        }
      } finally {
        isRefreshingProfile = false
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      console.log('[SessionSync] Auth event:', event)

      if (event === 'INITIAL_SESSION') {
        initialSessionFired = true
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        await handleSync(session)
      }

      if (event === 'SIGNED_OUT') {
        await clearTenantState()
        useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, memberships: [], currentStoreRole: null })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('yahpos-auth')
        }
        window.location.href = new URL('/', window.location.origin).toString()
      }
    })

    const initTimer = setTimeout(async () => {
      if (!mounted || initialSessionFired) return
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await handleSync(session)
      }
    }, 800)

    return () => {
      mounted = false
      clearTimeout(initTimer)
      subscription.unsubscribe()
    }
  }, [router, refreshProfile])

  return null
}
