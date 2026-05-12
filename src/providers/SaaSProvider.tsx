'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getStoreSettingsAction } from '@/app/developer/actions'
import { supabase } from '@/lib/supabase'

interface SaaSConfig {
  id?: string
  tier: 'austral' | 'archipielago' | 'patagonia'
  store_name: string
  store_logo: string | null
  tax_id: string | null
  white_label_enabled: boolean
  accent_color: string
}

interface SaaSContextType {
  config: SaaSConfig
  storeId: string | null
  isLoading: boolean
  isFeatureEnabled: (feature: 'ecommerce' | 'picking-fees' | 'logistics' | 'multi-branch' | 'api') => boolean
  isDocumentTypeEnabled: (tipoDte: number) => boolean
  tier: 'austral' | 'archipielago' | 'patagonia'
  refreshConfig: () => Promise<void>
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined)

export function SaaSProvider({ 
  children, 
  initialStoreId = null,
  initialConfig = null
}: { 
  children: React.ReactNode,
  initialStoreId?: string | null,
  initialConfig?: Partial<SaaSConfig> | null
}) {
  const [config, setConfig] = useState<SaaSConfig>({
    tier: (initialConfig?.tier as any) || 'austral',
    store_name: initialConfig?.store_name || 'YAHPOS!',
    store_logo: initialConfig?.store_logo || null,
    tax_id: initialConfig?.tax_id || null,
    white_label_enabled: initialConfig?.white_label_enabled || false,
    accent_color: initialConfig?.accent_color || '#003399'
  })
  const [storeId, setStoreId] = useState<string | null>(initialStoreId)
  const [isLoading, setIsLoading] = useState(!initialConfig)

  const fetchConfig = async () => {
    // Si no hay storeId (dominio raíz), no necesitamos buscar nada
    if (!initialStoreId) {
      setIsLoading(false)
      return
    }

    // Si ya tenemos el config inicial completo del servidor, no re-hidratar
    if (initialConfig && initialStoreId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      // Pasar initialStoreId (puede ser null). Si es null, getStoreSettingsAction no ejecutará el fallback.
      const data = await getStoreSettingsAction(initialStoreId)
      
      if (data) {
        setStoreId(data.id)
        const normalizedConfig: SaaSConfig = {
          id: data.id,
          tier: data.tier || 'austral',
          store_name: data.name || 'YAHPOS!',
          store_logo: data.config?.store_logo || null,
          tax_id: data.config?.tax_id || null,
          white_label_enabled: data.config?.white_label_enabled || false,
          accent_color: data.config?.accent_color || '#003399'
        }
        setConfig(normalizedConfig)
      }
    } catch (error) {
      console.error('Error fetching SaaS config:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchConfig()

    // Solo activar suscripciones en tiempo real si hay una tienda seleccionada
    if (!storeId) return;

    // Suscripción en tiempo real a cambios en la tabla stores
    const channel = supabase
      .channel(`store-changes-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stores',
          filter: `id=eq.${storeId}`
        },
        (payload) => {
          console.log('Store updated in real-time!', payload)
          if (payload.new) {
            const updated = payload.new as any
            setConfig(prev => ({
              ...prev,
              tier: updated.tier || prev.tier,
              store_name: updated.name || prev.store_name,
              store_logo: updated.config?.store_logo ?? prev.store_logo,
              tax_id: updated.config?.tax_id ?? prev.tax_id,
              white_label_enabled: updated.config?.white_label_enabled ?? prev.white_label_enabled,
              accent_color: updated.config?.accent_color ?? prev.accent_color
            }))
          }
        }
      )
      .subscribe()

    // También escuchar cambios de autenticación para actualizar store_id
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        fetchConfig()
      }
    })

    return () => {
      supabase.removeChannel(channel)
      subscription.unsubscribe()
    }
  }, [storeId]) // Re-ejecutar si cambia el storeId

  const isFeatureEnabled = (feature: 'ecommerce' | 'picking-fees' | 'logistics' | 'multi-branch' | 'api') => {
    switch (feature) {
      case 'ecommerce':
        return ['archipielago', 'patagonia'].includes(config.tier)
      case 'picking-fees':
      case 'logistics':
      case 'multi-branch':
      case 'api':
        return ['patagonia'].includes(config.tier)
      default:
        return false
    }
  }

  const isDocumentTypeEnabled = (tipoDte: number) => {
    const tier = config.tier
    // Austral: Solo Boletas (39, 41)
    // Archipielago: Boletas + Facturas (33) + Notas (56, 61)
    // Patagonia: Todo lo anterior + Guía de Despacho (52)
    
    const boletas = [39, 41]
    const facturacion = [33, 56, 61]
    const despacho = [52]

    if (boletas.includes(tipoDte)) return true
    if (tier === 'austral') return false
    
    if (facturacion.includes(tipoDte)) return true
    if (tier === 'archipielago') return false

    if (despacho.includes(tipoDte)) return true
    
    return false
  }

  return (
    <SaaSContext.Provider value={{ config, storeId, isLoading, isFeatureEnabled, isDocumentTypeEnabled, tier: config.tier, refreshConfig: fetchConfig }}>
      {children}
    </SaaSContext.Provider>
  )
}

export function useSaaS() {
  const context = useContext(SaaSContext)
  if (context === undefined) {
    throw new Error('useSaaS must be used within a SaaSProvider')
  }
  return context
}

