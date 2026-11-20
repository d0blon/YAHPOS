'use client'

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex flex-col items-center text-center max-w-md">
        <div
          className="relative w-16 h-16 mb-8 motion-safe:animate-float"
          aria-hidden="true"
        >
          <svg viewBox="0 0 40 120" className="w-full h-full">
            <rect x="8" y="0" width="24" height="72" rx="12" fill="#ff00ff" />
            <circle cx="20" cy="102" r="14" fill="#ff00ff" />
          </svg>
        </div>

        <h1 className="text-6xl font-semibold tracking-tight mb-2">404</h1>
        <h2 className="text-lg font-medium mb-2">Esta página no existe</h2>
        <p className="text-sm text-[var(--muted-foreground)] mb-8">
          Revisá la dirección o volvé a un lugar conocido — esto todavía no está construido o se movió de lugar.
        </p>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-brand-primary text-white hover:bg-brand-600 transition-colors"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
        </div>
      </div>
    </div>
  )
}
