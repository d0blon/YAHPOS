'use client'

import { useSyncExternalStore } from 'react'
import { Search, Wifi, WifiOff, BadgeCheck, Monitor, LogOut, FileWarning } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePosStore } from '@/stores/posStore'
import { useSiiStore } from '@/stores/siiStore'
import { getActiveStoreId } from '@/lib/tenant-state'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function subscribeToNetwork(fn: () => void) {
  window.addEventListener('online', fn)
  window.addEventListener('offline', fn)
  return () => {
    window.removeEventListener('online', fn)
    window.removeEventListener('offline', fn)
  }
}

interface PosHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  onToggleRole: () => void;
}

export function PosHeader({ search, onSearchChange, onToggleRole }: PosHeaderProps) {
  const { isTrainingMode, currentUser, cashSession, clearCashSession } = usePosStore()
  const pendingSyncOrders = usePosStore(state => state.pendingSyncOrders)
  const offlineFolioPool = useSiiStore(state => state.offlineFolioPool)
  const foliosDisponibles = useSiiStore(state => state.foliosDisponibles)
  const isOnline = useSyncExternalStore(
    subscribeToNetwork,
    () => navigator.onLine,
    () => true
  )

  // offlineFolioPool usa keys `${storeId}:${tipo}`. Mostrar solo el sufijo y
  // solo las keys de la tienda activa (fail-closed).
  const activeStoreId = getActiveStoreId()
  const storePrefix = activeStoreId ? `${activeStoreId}:` : null
  const folioPools = storePrefix
    ? Object.entries(offlineFolioPool)
        .filter(([key]) => key.startsWith(storePrefix))
        .map(([key, pool]) => ({ key, tipo: key.slice(key.indexOf(':') + 1), pool }))
    : []

  return (
    <header className={cn(
      "h-20 border-b border-gray-100 flex items-center px-8 gap-8 transition-all duration-300",
      isTrainingMode ? "bg-orange-50/50" : "bg-white"
    )}>
      
      {/* Search Bar - Center Piece */}
      <div className="flex-1 max-w-2xl relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-brand-primary transition-colors" />
        <Input 
          autoFocus
          className="pl-14 h-14 text-lg rounded-2xl bg-gray-50 border-none focus:bg-white shadow-inner focus:ring-2 focus:ring-brand-primary/20 transition-all font-medium"
          placeholder="Escanear producto o Escribir búsqueda rápida..." 
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase tracking-widest border border-gray-200 px-2 py-1 rounded-md">
           F1 Búsqueda
        </div>
      </div>

      {/* Connection & Mode Indicators */}
      <div className="flex items-center gap-4">
        {cashSession && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-100 rounded-xl">
              <Monitor className="w-4 h-4 text-brand-primary" />
              <div className="leading-none">
                <p className="text-[9px] font-black uppercase tracking-tighter text-gray-400">Terminal</p>
                <p className="text-xs font-bold text-gray-700">{cashSession.terminal_name}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!confirm('¿Cerrar sesión de caja? Se ejecutará cierre automático.')) return
                const session = usePosStore.getState().cashSession
                if (session?.id) {
                  try {
                    await fetch(`/api/cash-sessions/${session.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ closing_amount: 0, notes: 'Cierre rápido' })
                    })
                  } catch (err) {
                    console.error('Error closing session API:', err)
                  }
                }
                clearCashSession()
                toast.success('Sesión cerrada correctamente')
              }}
              className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-gray-100"
              title="Cerrar caja"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-colors",
          !isOnline 
            ? "bg-red-50 text-red-600 border-red-100" 
            : pendingSyncOrders.length > 0 
              ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" 
              : "bg-green-50 text-green-600 border-green-100"
        )}>
          {!isOnline ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
          
          <div className="flex flex-col leading-none">
             <span>{!isOnline ? 'Offline' : 'Online'}</span>
             {pendingSyncOrders.length > 0 && (
               <span className="text-[8px] font-black opacity-80 pt-0.5">
                  {pendingSyncOrders.length} en cola
               </span>
             )}
          </div>
        </div>
        
        {/* SII Folio Indicator */}
        {!foliosDisponibles && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-pulse">
            <FileWarning className="w-4 h-4 text-amber-500" />
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest">
                Sin Folios
              </span>
              <span className="text-[7px] font-bold text-amber-500 uppercase">
                Boletas no emitibles
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {folioPools.map(({ key, tipo, pool }) => (
            <div key={key} className={cn(
              "flex flex-col items-center justify-center px-2 py-1 rounded-lg border text-[8px] font-black tracking-tighter transition-all",
              pool.length === 0 
                ? "bg-red-500 text-white border-red-600 animate-bounce" 
                : pool.length < 10 
                  ? "bg-amber-100 text-amber-700 border-amber-300 animate-pulse"
                  : "bg-gray-50 text-gray-500 border-gray-100"
            )}>
              <span className="opacity-60 leading-none mb-0.5">DTE {tipo}</span>
              <span className="text-[10px] leading-none">{pool.length}</span>
            </div>
          ))}
        </div>

        <button 
          onClick={onToggleRole}
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all active:scale-95",
            currentUser?.role === 'admin' 
              ? "bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20" 
              : "bg-white text-gray-500 border-gray-100"
          )}
        >
          <BadgeCheck className={cn("w-5 h-5", currentUser?.role === 'admin' ? "text-brand-accent" : "text-gray-300")} />
          <div className="text-left leading-none">
            <p className="text-[9px] font-black uppercase tracking-tighter opacity-70">Perfil</p>
            <p className="text-xs font-bold">{currentUser?.role === 'admin' ? 'ADMIN' : 'CAJERO'}</p>
          </div>
        </button>
      </div>
    </header>
  )
}
