'use client'

import React from 'react'
import { Cloud, Loader2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SyncOverlayProps {
  isVisible: boolean
  status: 'syncing' | 'completed'
}

export const SyncOverlay: React.FC<SyncOverlayProps> = ({ isVisible, status }) => {
  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-surface-50/80 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-surface-100 p-10 rounded-[3rem] shadow-2xl border border-border flex flex-col items-center gap-6 max-w-sm w-full text-center scale-in-center">
        <div className="relative">
          <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center animate-pulse">
            {status === 'syncing' ? (
              <Cloud className="w-10 h-10 text-brand-500" />
            ) : (
              <ShieldCheck className="w-10 h-10 text-emerald-500" />
            )}
          </div>
          {status === 'syncing' && (
            <div className="absolute inset-0 flex items-center justify-center">
               <Loader2 className="w-28 h-28 text-brand-primary animate-spin opacity-40" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-foreground tracking-tighter uppercase">
            YAHPOS!<span className="text-brand-primary italic"></span>
          </h2>
          <p className="text-muted-foreground font-medium text-sm">
            {status === 'syncing' 
              ? 'Sincronizando sesión con la nube...' 
              : 'Sesión guardada con éxito'}
          </p>
        </div>

        <div className="w-full bg-surface-150 h-1.5 rounded-full overflow-hidden">
          <div className={cn(
            "h-full transition-all duration-1000",
            status === 'syncing' ? "bg-brand-primary w-2/3 animate-pulse" : "bg-emerald-500 w-full"
          )} />
        </div>
        
        <p className="text-[10px] font-black uppercase text-muted-foreground/50 tracking-widest">Protegiendo tus datos</p>
      </div>
    </div>
  )
}
