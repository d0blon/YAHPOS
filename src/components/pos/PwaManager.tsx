'use client'

import { useEffect } from 'react'

export function PwaManager({ storeId }: { storeId: string | null }) {
  useEffect(() => {
    if (!storeId) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(regs => {
          regs.forEach(r => r.unregister())
        })
      }
      return
    }

    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = '/manifest.json'
    document.head.appendChild(link)

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {})
      })
    }
  }, [storeId])

  return null
}
