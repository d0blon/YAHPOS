'use client'

import React from 'react'
import { ThemeProvider } from '@/providers/ThemeProvider'

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="h-screen w-full bg-gray-100 dark:bg-surface-100 overflow-hidden font-sans">
        {children}
      </div>
    </ThemeProvider>
  )
}
