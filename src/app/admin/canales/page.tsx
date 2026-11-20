'use client'

import { Share2 } from 'lucide-react'
import { SectionCard } from '@/components/admin/SectionCard'
import { CardContent } from '@/components/ui/card'

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Canales de Venta</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Gestión unificada de canales (POS, tienda online, marketplaces) — próximamente.</p>
      </div>

      <SectionCard>
        <CardContent className="p-16 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[var(--muted)] flex items-center justify-center text-brand-accent">
            <Share2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-medium">Próximamente</h2>
          <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
            Estamos trabajando en esta sección. Todavía no hay funcionalidad ni datos acá.
          </p>
        </CardContent>
      </SectionCard>
    </div>
  )
}
