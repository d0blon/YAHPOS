import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terminal POS - AustralMarket',
  description: 'Sistema Híbrido Offline-First de Punto de Venta',
}

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen w-full bg-gray-100 dark:bg-gray-900 overflow-hidden font-sans">
      {children}
    </div>
  )
}
