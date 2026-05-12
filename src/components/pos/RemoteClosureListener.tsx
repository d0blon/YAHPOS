'use client'

import { useEffect } from 'react'
import { usePosStore } from '@/stores/posStore'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function RemoteClosureListener() {
  const { cashSession, clearCashSession } = usePosStore()

  useEffect(() => {
    if (!cashSession?.id) return
    let isMounted = true

    const channel = supabase
      .channel(`session_closure_${cashSession.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cash_sessions',
          filter: `id=eq.${cashSession.id}`
        },
        (payload) => {
          if (isMounted && payload.new.status === 'closed') {
            toast.warning('Tu sesión de caja ha sido cerrada remotamente por un administrador.', {
              duration: 10000,
              description: 'La aplicación se reiniciará para nueva apertura.'
            })
            
            // Limpiar sesión localmente
            clearCashSession()
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [cashSession?.id, clearCashSession])

  return null
}
