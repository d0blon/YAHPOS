'use client'

import React from 'react'
import { Search, Wifi, WifiOff, ShieldAlert, BadgeCheck, Monitor, LogOut } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePosStore } from '@/stores/posStore'
import { cn } from '@/lib/utils'

interface PosHeaderProps {
  search: string;
  onSearchChange: (val: string) => void;
  onToggleRole: () => void;
}

export function PosHeader({ search, onSearchChange, onToggleRole }: PosHeaderProps) {
  const { isTrainingMode, currentUser, cashSession, clearCashSession } = usePosStore()
  const pendingSyncOrders = usePosStore(state => state.pendingSyncOrders)
  const [isOnline, setIsOnline] = React.useState(true)

  React.useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header className={cn(
      "h-20 border-b border-gray-100 flex items-center px-8 gap-8 transition-all duration-300",
      isTrainingMode ? "bg-orange-50/50" : "bg-white"
    )}>
      
      {/* Search Bar - Center Piece */}
      <div className="flex-1 max-w-2xl relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5 group-focus-within:text-corporate-blue transition-colors" />
        <Input 
          autoFocus
          className="pl-14 h-14 text-lg rounded-2xl bg-gray-50 border-none focus:bg-white shadow-inner focus:ring-2 focus:ring-corporate-blue/20 transition-all font-medium"
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
              <Monitor className="w-4 h-4 text-corporate-blue" />
              <div className="leading-none">
                <p className="text-[9px] font-black uppercase tracking-tighter text-gray-400">Terminal</p>
                <p className="text-xs font-bold text-gray-700">{cashSession.terminal_name}</p>
              </div>
            </div>
            <button
              onClick={() => { if (confirm('¿Cerrar sesión de caja? Deberás declarar el fondo nuevamente.')) clearCashSession() }}
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

        <button 
          onClick={onToggleRole}
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-2xl border transition-all active:scale-95",
            currentUser?.role === 'admin' 
              ? "bg-corporate-blue text-white border-corporate-blue shadow-lg shadow-corporate-blue/20" 
              : "bg-white text-gray-500 border-gray-100"
          )}
        >
          <BadgeCheck className={cn("w-5 h-5", currentUser?.role === 'admin' ? "text-accent-yellow" : "text-gray-300")} />
          <div className="text-left leading-none">
            <p className="text-[9px] font-black uppercase tracking-tighter opacity-70">Perfil</p>
            <p className="text-xs font-bold">{currentUser?.role === 'admin' ? 'ADMIN' : 'CAJERO'}</p>
          </div>
        </button>
      </div>
    </header>
  )
}
