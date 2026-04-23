'use client'

import React, { useState } from 'react'
import { 
  ShoppingCart, History, Store, Calculator, Settings, 
  ChevronLeft, ChevronRight, User, Terminal, ShieldAlert,
  HelpCircle, Package, LogOut, LayoutDashboard, ArrowUpDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePosStore } from '@/stores/posStore'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface PosSidebarProps {
  onShowHistory: () => void;
  onShowClosure: () => void;
  onShowSettings: () => void;
  onShowMovements: () => void;
}

import { useSaaS } from '@/providers/SaaSProvider'

export function PosSidebar({ onShowHistory, onShowClosure, onShowSettings, onShowMovements }: PosSidebarProps) {
  const { config } = useSaaS()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { isTrainingMode, setTrainingMode, currentUser } = usePosStore()

  const router = useRouter()

  // Determinar marca a mostrar
  const displayBrand = config.white_label_enabled && config.tier === 'elite' 
    ? config.store_name 
    : 'PATAGONIA'

  const subLabel = config.white_label_enabled && config.tier === 'elite'
    ? 'Powered by PatagoniaPOS'
    : 'POS System'

  const menuItems = [
    { icon: ShoppingCart, label: 'Caja Reg.', action: null, active: true },
    { icon: History, label: 'Historial', action: onShowHistory },
    { icon: Calculator, label: 'Cierre Z', action: onShowClosure },
    { icon: ArrowUpDown, label: 'Movimientos', action: onShowMovements },
    { icon: Package, label: 'Inventario', action: () => router.push('/admin/productos') },
  ]


  return (
    <aside 
      className={cn(
        "bg-white border-r border-gray-100 flex flex-col transition-all duration-300 relative z-50 shadow-2xl",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand / Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-50 bg-corporate-blue/5">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
          {config.store_logo && config.white_label_enabled && config.tier === 'elite' ? (
            <img src={config.store_logo} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
            <img 
              src="/logos/logo-light.png" 
              alt="PatagoniaPOS" 
              className="w-10 h-10 object-contain mix-blend-multiply" 
            />
          )}
        </div>
        {!isCollapsed && (
          <div className="animate-in fade-in slide-in-from-left-2 duration-300">
            <h1 className="font-black text-gray-900 tracking-tighter leading-none uppercase truncate max-w-[120px]">
              {displayBrand}
            </h1>
            <p className="text-[10px] font-bold text-corporate-blue tracking-[0.1em] uppercase mt-1">
              {subLabel}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-2 py-6">
        {menuItems.map((item, idx) => (
          <button
            key={idx}
            onClick={item.action || (() => {})}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group relative",
              item.active 
                ? "bg-corporate-blue text-white shadow-xl shadow-corporate-blue/20" 
                : "text-gray-400 hover:bg-gray-50 hover:text-corporate-blue"
            )}
          >
            <item.icon className={cn("w-6 h-6 shrink-0 transition-transform group-hover:scale-110", item.active ? "text-white" : "text-gray-400")} />
            {!isCollapsed && <span className="font-black text-sm">{item.label}</span>}
            {item.active && !isCollapsed && <div className="ml-auto w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]" />}
          </button>
        ))}

        <div className="pt-6 border-t border-gray-50 mt-4 space-y-2">
           <button
             onClick={onShowSettings}
             className="w-full flex items-center gap-4 p-4 rounded-2xl text-gray-400 hover:bg-gray-50 hover:text-corporate-blue transition-all"
           >
             <Settings className="w-6 h-6 shrink-0" />
             {!isCollapsed && <span className="font-bold text-sm">Ajustes Admin</span>}
           </button>
        </div>
      </nav>

      {/* Training Mode & User */}
      <div className="p-3 space-y-4 mb-4">
        <div className="pt-2 pb-4">
           <Link 
             href="/admin" 
             className="w-full flex items-center gap-4 p-4 rounded-3xl bg-gray-100 hover:bg-corporate-blue hover:text-white transition-all group shadow-sm hover:shadow-xl hover:-translate-y-0.5"
           >
             <LayoutDashboard className="w-6 h-6 shrink-0 text-corporate-blue group-hover:text-white transition-colors" />
             {!isCollapsed && <span className="font-black text-xs uppercase tracking-widest">Panel Admin</span>}
           </Link>
        </div>

        <div className={cn(
          "rounded-[1.5rem] p-4 transition-all border-2",
          isTrainingMode 
            ? "bg-orange-50 border-orange-200" 
            : "bg-gray-50 border-transparent"
        )}>
          {!isCollapsed && (
            <div className="flex justify-between items-center mb-3">
               <div className="flex items-center gap-2">
                  <ShieldAlert className={cn("w-4 h-4", isTrainingMode ? "text-orange-600 animate-pulse" : "text-gray-400")} />
                  <span className={cn("text-[10px] font-black uppercase tracking-widest", isTrainingMode ? "text-orange-600" : "text-gray-400")}>
                    Entrenamiento
                  </span>
               </div>
               <button 
                 onClick={() => setTrainingMode(!isTrainingMode)}
                 className={cn(
                   "w-10 h-5 rounded-full transition-all relative",
                   isTrainingMode ? "bg-orange-500" : "bg-gray-300"
                 )}
               >
                 <div className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all", isTrainingMode ? "right-0.5" : "left-0.5")} />
               </button>
            </div>
          )}
          {isCollapsed ? (
            <button onClick={() => setTrainingMode(!isTrainingMode)} className={cn("p-3 rounded-xl mx-auto flex items-center justify-center", isTrainingMode ? "bg-orange-500 text-white" : "text-gray-400 bg-gray-100")}>
                <ShieldAlert className="w-5 h-5" />
            </button>
          ) : (
            <p className="text-[9px] text-gray-400 font-medium leading-relaxed italic">
              {isTrainingMode ? 'Ventas aisladas de la contabilidad real.' : 'Modo producción activo.'}
            </p>
          )}
        </div>

        <div className={cn(
            "bg-gray-900 rounded-[2rem] p-4 flex items-center gap-3 border border-white/5",
            isCollapsed ? "justify-center" : ""
        )}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-corporate-blue to-accent-yellow p-0.5 group">
                <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center overflow-hidden">
                    <User className="text-white w-5 h-5" />
                </div>
            </div>
            {!isCollapsed && (
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-xs truncate">{currentUser?.firstName || 'Cajero'}</p>
                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-tighter">{currentUser?.role}</p>
                </div>
            )}
            {!isCollapsed && (
              <Link href="/admin">
                <LogOut className="w-4 h-4 text-gray-500 hover:text-red-400 cursor-pointer transition-colors" />
              </Link>
            )}
        </div>

        {!isCollapsed && (
          <div className="text-center opacity-20 hover:opacity-50 transition-opacity">
            <p className="text-[8px] font-black tracking-[.2em] text-gray-400 uppercase">PatagoniaPOS v2.4.0</p>
          </div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition-all text-gray-400 z-[60]"
      >
        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  )
}
