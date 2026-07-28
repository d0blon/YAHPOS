'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { Session } from '@supabase/supabase-js'

/**
 * Este componente asegura que la sesión de Supabase se sincronice
 * correctamente con las cookies del navegador para que el Proxy (Middleware)
 * pueda ver al usuario logueado, y también actualiza el estado global de Auth.
 */
export function SessionSync() {
  const router = useRouter()
  const { refreshProfile, logout } = useAuthStore()

  useEffect(() => {
    let mounted = true
    let isRefreshingProfile = false
    let initialSessionFired = false

    const handleSync = async (session: Session | null) => {
      if (!mounted || isRefreshingProfile) return
      isRefreshingProfile = true
      try {
        if (session) {
          await refreshProfile()
        }
      } finally {
        isRefreshingProfile = false
      }
    }

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      console.log('Auth Event:', event, session?.user?.email)
      
      if (event === 'INITIAL_SESSION') {
        initialSessionFired = true
      }
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        await handleSync(session)
      }
      
      if (event === 'SIGNED_OUT') {
        logout()
        router.refresh()
      }
    })

    // 1. Carga inicial controlada (con delay para evitar pisotón)
    // Si INITIAL_SESSION ya disparó, no hacemos getSession() redundante
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
  }, [router, refreshProfile, logout])

  return null
}
