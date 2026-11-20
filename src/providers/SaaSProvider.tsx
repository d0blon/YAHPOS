'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getStoreSettingsAction } from '@/app/developer/actions'
import { supabase } from '@/lib/supabase'
import { setActiveStoreId } from '@/lib/tenant-state'

type Tier = 'austral' | 'archipielago' | 'patagonia'

const TIERS: readonly Tier[] = ['austral', 'archipielago', 'patagonia']

interface SaaSConfig {
  id?: string
  tier: Tier
  store_name: string
  store_logo: string | null
  tax_id: string | null
  white_label_enabled: boolean
  accent_color: string
  appearance_primary_color: string
  surface_color: string | null
}

interface SaaSContextType {
  config: SaaSConfig
  storeId: string | null
  isLoading: boolean
  isFeatureEnabled: (feature: 'ecommerce' | 'picking-fees' | 'logistics' | 'multi-branch' | 'api') => boolean
  isDocumentTypeEnabled: (tipoDte: number) => boolean
  tier: Tier
  refreshConfig: () => Promise<void>
}

interface StoreConfig {
  store_logo?: string | null
  tax_id?: string | null
  white_label_enabled?: boolean
  accent_color?: string | null
  appearance_primary_color?: string | null
  surface_color?: string | null
}

interface StoreRow {
  id: string
  name: string | null
  slug: string | null
  tier: string | null
  config: StoreConfig | null
  is_active: boolean | null
}

const SaaSContext = createContext<SaaSContextType | undefined>(undefined)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function parseStoreConfig(value: unknown): StoreConfig | null {
  if (!isRecord(value)) return null

  return {
    store_logo: readString(value.store_logo),
    tax_id: readString(value.tax_id),
    white_label_enabled: readBoolean(value.white_label_enabled) ?? false,
    accent_color: readString(value.accent_color),
    appearance_primary_color: readString(value.appearance_primary_color),
    surface_color: readString(value.surface_color),
  }
}

function parseStoreRow(value: unknown): StoreRow | null {
  if (!isRecord(value)) return null

  const id = readString(value.id)
  if (!id) return null

  return {
    id,
    name: readString(value.name),
    slug: readString(value.slug),
    tier: readString(value.tier),
    config: parseStoreConfig(value.config),
    is_active: readBoolean(value.is_active),
  }
}

function normalizeTier(value: unknown): Tier {
  return TIERS.find((tier) => tier === value) ?? 'austral'
}

function buildConfig(row: Pick<StoreRow, 'id' | 'name' | 'tier' | 'config'>): SaaSConfig {
  return {
    id: row.id,
    tier: normalizeTier(row.tier),
    store_name: row.name || 'YAHPOS!',
    store_logo: row.config?.store_logo || null,
    tax_id: row.config?.tax_id || null,
    white_label_enabled: row.config?.white_label_enabled || false,
    accent_color: row.config?.accent_color || '#003399',
    appearance_primary_color: row.config?.appearance_primary_color || '#4b0082',
    surface_color: row.config?.surface_color || null,
  }
}

function buildInitialConfig(initialConfig: Partial<SaaSConfig> | null): SaaSConfig {
  return {
    tier: normalizeTier(initialConfig?.tier),
    store_name: initialConfig?.store_name || 'YAHPOS!',
    store_logo: initialConfig?.store_logo || null,
    tax_id: initialConfig?.tax_id || null,
    white_label_enabled: initialConfig?.white_label_enabled || false,
    accent_color: initialConfig?.accent_color || '#003399',
    appearance_primary_color: initialConfig?.appearance_primary_color || '#4b0082',
    surface_color: initialConfig?.surface_color || null,
  }
}

async function fetchStoreConfig(storeId: string): Promise<StoreRow | null> {
  const data = await getStoreSettingsAction(storeId)
  return parseStoreRow(data)
}

export function SaaSProvider({
  children,
  initialStoreId = null,
  initialConfig = null
}: {
  children: React.ReactNode,
  initialStoreId?: string | null,
  initialConfig?: Partial<SaaSConfig> | null
}) {
  const [config, setConfig] = useState<SaaSConfig>(() => buildInitialConfig(initialConfig))
  const [storeId, setStoreId] = useState<string | null>(initialStoreId)
  const [isLoading, setIsLoading] = useState(() => Boolean(initialStoreId && !initialConfig))
  const initialConfigRef = useRef(initialConfig)
  const initialStoreIdRef = useRef(initialStoreId)

  useEffect(() => {
    setActiveStoreId(storeId)
  }, [storeId])

  const refreshConfig = useCallback(async () => {
    if (!storeId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const data = await fetchStoreConfig(storeId)
      if (data && data.id === storeId) {
        setStoreId(data.id)
        setActiveStoreId(data.id)
        setConfig(buildConfig(data))
      }
    } catch (error) {
      console.error('Error fetching SaaS config:', error)
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    if (!storeId) return

    const startFetch = () => {
      void Promise.resolve()
        .then(() => setIsLoading(true))
        .then(() => fetchStoreConfig(storeId))
        .then((data) => {
          if (!data || data.id !== storeId) return
          setStoreId(data.id)
          setActiveStoreId(data.id)
          setConfig(buildConfig(data))
        })
        .catch((error: unknown) => {
          console.error('Error fetching SaaS config:', error)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }

    const skipInitialFetch = storeId === initialStoreIdRef.current && initialConfigRef.current !== null

    if (!skipInitialFetch) startFetch()

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
          const updated = parseStoreRow(payload.new)
          if (!updated || updated.id !== storeId) return

          setConfig(prev => ({
            ...prev,
            tier: updated.tier ? normalizeTier(updated.tier) : prev.tier,
            store_name: updated.name || prev.store_name,
            store_logo: updated.config?.store_logo ?? prev.store_logo,
            tax_id: updated.config?.tax_id ?? prev.tax_id,
            white_label_enabled: updated.config?.white_label_enabled ?? prev.white_label_enabled,
            accent_color: updated.config?.accent_color ?? prev.accent_color,
            appearance_primary_color: updated.config?.appearance_primary_color ?? prev.appearance_primary_color,
            surface_color: updated.config?.surface_color ?? prev.surface_color,
          }))
        }
      )
      .subscribe()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return
      if (initialConfigRef.current) return
      startFetch()
    })

    return () => {
      supabase.removeChannel(channel)
      subscription.unsubscribe()
    }
  }, [storeId])

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
    <SaaSContext.Provider value={{ config, storeId, isLoading, isFeatureEnabled, isDocumentTypeEnabled, tier: config.tier, refreshConfig }}>
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
