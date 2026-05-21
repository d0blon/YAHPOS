'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { User } from '@/types'
import { DEVELOPER_EMAILS } from '@/lib/constants'

/**
 * Este componente asegura que la sesión de Supabase se sincronice
 * correctamente con las cookies del navegador para que el Proxy (Middleware)
 * pueda ver al usuario logueado, y también actualiza el estado global de Auth.
 */
export function SessionSync() {
  const router = useRouter()
  const { refreshProfile, logout } = useAuthStore()

  useEffect(() => {
    // 1. Carga inicial: Si hay una sesión activa, refrescar el perfil inmediatamente
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await refreshProfile()
      }
    }
    initAuth()

    // 2. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event, session?.user?.email)
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // El middleware ya inyectó los headers, pero el cliente necesita
        // actualizar el estado global de AuthStore con el rol de esta tienda.
        if (session) {
          await refreshProfile()
        }
      }
      
      if (event === 'SIGNED_OUT') {
        logout()
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, refreshProfile, logout])

  return null
}
