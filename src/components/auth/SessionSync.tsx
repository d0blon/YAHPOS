'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

/**
 * Este componente asegura que la sesión de Supabase se sincronice
 * correctamente con las cookies del navegador para que el Proxy (Middleware)
 * pueda ver al usuario logueado.
 */
export function SessionSync() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // Solo refrescamos en el inicio de sesión inicial para setear cookies
        router.refresh()
      }
      
      if (event === 'SIGNED_OUT') {
        router.refresh()
        router.push('/login')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return null
}
