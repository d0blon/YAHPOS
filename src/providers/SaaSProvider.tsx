'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { getStoreSettingsAction } from '@/app/admin/developer/actions'

interface SaaSConfig {
  tier: 'basico' | 'plus' | 'elite'
  store_name: string
  store_logo: string | null
  white_label_enabled: boolean
  accent_color: string
}

interface SaaSContextType {
  config: SaaSConfig
  isLoading: boolean
  isFeatureEnabled: (feature: 'ecommerce' | 'picking-fees' | 'logistics' | 'multi-branch' | 'api') => boolean
  refreshConfig: () => Promise<void>
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined)

export function SaaSProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SaaSConfig>({
    tier: 'basico',
    store_name: 'PatagoniaPOS',
    store_logo: null,
    white_label_enabled: false,
    accent_color: '#003399'
  })
  const [isLoading, setIsLoading] = useState(true)

  const fetchConfig = async () => {
    setIsLoading(true)
    const data = await getStoreSettingsAction()
    if (data) {
      setConfig(data)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  /**
   * Feature flags por Plan:
   * 
   * Básico:  POS offline, inventario, caja, CRM básico
   * Plus:    Todo lo anterior + ecommerce, pedidos online, catálogo público
   * Élite:   Todo lo anterior + picking fees, logística avanzada, multi-sucursal, API
   */
  const isFeatureEnabled = (feature: 'ecommerce' | 'picking-fees' | 'logistics' | 'multi-branch' | 'api') => {
    switch (feature) {
      case 'ecommerce':
        return config.tier === 'plus' || config.tier === 'elite'
      case 'picking-fees':
        return config.tier === 'elite'
      case 'logistics':
        return config.tier === 'elite'
      case 'multi-branch':
        return config.tier === 'elite'
      case 'api':
        return config.tier === 'elite'
      default:
        return false
    }
  }

  return (
    <SaaSContext.Provider value={{ config, isLoading, isFeatureEnabled, refreshConfig: fetchConfig }}>
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
