'use client'

import * as React from 'react'
import { useSaaS } from './SaaSProvider'
import { generateShades } from '@/lib/color'

export function BrandThemeSetter() {
  const { config } = useSaaS()

  React.useEffect(() => {
    const root = document.documentElement
    const primary = config.appearance_primary_color || '#4b0082'
    const accent = config.accent_color || '#ff00ff'

    root.style.setProperty('--brand-primary', primary)
    root.style.setProperty('--brand-accent', accent)
    root.style.setProperty('--brand-logo', config.store_logo || '')

    const primaryShades = generateShades(primary)
    const accentShades = generateShades(accent)
    for (const [shade, hex] of Object.entries(primaryShades)) {
      root.style.setProperty(`--brand-${shade}`, hex)
    }
    for (const [shade, hex] of Object.entries(accentShades)) {
      root.style.setProperty(`--brand-accent-${shade}`, hex)
    }
  }, [config.appearance_primary_color, config.accent_color, config.store_logo])

  return null
}
