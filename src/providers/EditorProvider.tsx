'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SiteContent {
  hero: {
    badge: string
    titlePrimary: string
    titleAccent: string
    titleSecondary: string
    description: string
    ctaPrimary: string
    ctaSecondary: string
  }
  store: {
    name: string
    slogan: string
    badgeOpen: string
    badgeDelivery: string
  }
}

const DEFAULT_CONTENT: SiteContent = {
  hero: {
    badge: 'Abierto • Despacho en 45 min',
    titlePrimary: 'EL MARKET',
    titleAccent: 'QUE TU HOGAR',
    titleSecondary: 'MERECE.',
    description: 'Calidad artesanal, frescura patagónica y una experiencia de compra diseñada para tu comodidad absoluta.',
    ctaPrimary: 'Ver Productos',
    ctaSecondary: 'Ofertas Hoy',
  },
  store: {
    name: 'PatagoniaMarket',
    slogan: 'Smart Commerce',
    badgeOpen: 'ABIERTO',
    badgeDelivery: 'DESPACHO EN 45 MIN',
  },
}

interface EditorContextType {
  isEditorMode: boolean
  toggleEditorMode: () => void
  content: SiteContent
  updateField: (path: string, value: string) => void
  saveChanges: () => Promise<void>
  isSaving: boolean
  hasUnsavedChanges: boolean
  discardChanges: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const EditorContext = createContext<EditorContextType | null>(null)

export function useEditor() {
  const ctx = useContext(EditorContext)
  if (!ctx) throw new Error('useEditor must be used inside EditorProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [isEditorMode, setIsEditorMode] = useState(false)
  const [content, setContent] = useState<SiteContent>(DEFAULT_CONTENT)
  const [savedContent, setSavedContent] = useState<SiteContent>(DEFAULT_CONTENT)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Load content from Supabase on mount
  useEffect(() => {
    async function loadContent() {
      try {
        const { data } = await supabase
          .from('store_settings')
          .select('site_content')
          .limit(1)
          .single()

        if (data?.site_content && Object.keys(data.site_content).length > 0) {
          const merged = deepMerge(DEFAULT_CONTENT, data.site_content) as SiteContent
          setContent(merged)
          setSavedContent(merged)
        }
      } catch (err) {
        console.warn('[EditorProvider] Could not load site_content:', err)
      }
    }
    loadContent()
  }, [])

  // Deep set a nested value by dot-path (e.g. "hero.badge")
  const updateField = useCallback((path: string, value: string) => {
    setContent(prev => {
      const next = deepClone(prev)
      setNestedValue(next, path, value)
      return next
    })
    setHasUnsavedChanges(true)
  }, [])

  const saveChanges = useCallback(async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('store_settings')
        .update({ site_content: content })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error

      setSavedContent(content)
      setHasUnsavedChanges(false)
    } catch (err) {
      console.error('[EditorProvider] Save failed:', err)
    } finally {
      setIsSaving(false)
    }
  }, [content])

  const discardChanges = useCallback(() => {
    setContent(savedContent)
    setHasUnsavedChanges(false)
  }, [savedContent])

  const toggleEditorMode = useCallback(() => {
    setIsEditorMode(v => {
      if (v && hasUnsavedChanges) discardChanges()
      return !v
    })
  }, [hasUnsavedChanges, discardChanges])

  return (
    <EditorContext.Provider value={{
      isEditorMode,
      toggleEditorMode,
      content,
      updateField,
      saveChanges,
      isSaving,
      hasUnsavedChanges,
      discardChanges,
    }}>
      {children}
    </EditorContext.Provider>
  )
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function deepMerge(base: any, override: any): any {
  const result = { ...base }
  for (const key of Object.keys(override)) {
    if (override[key] !== null && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] ?? {}, override[key])
    } else {
      result[key] = override[key]
    }
  }
  return result
}

function setNestedValue(obj: any, path: string, value: string) {
  const keys = path.split('.')
  let current = obj
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]]
  }
  current[keys[keys.length - 1]] = value
}
