'use client'

import React from 'react'
import Link from 'next/link'
import { 
  Settings, Monitor, LogOut, HardHat, Terminal, Lock, FileText, Store, LayoutDashboard, Package, Users, ShoppingCart, TrendingUp
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSaaS } from '@/providers/SaaSProvider'
import { useAuthStore } from '@/stores/authStore'

interface AdminSidebarProps {
  activePath?: string;
}

/**
 * Matriz de permisos por rol para el panel de administración.
 *
 * developer  → acceso total
 * manager    → Dashboard, Productos, Clientes, POS (sin Personal, Config, Dev)
 * cajero     → Solo POS (no debería llegar al admin, pero por si acaso)
 * admin      → acceso total (igual que developer)
 */
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/admin':               ['developer', 'manager', 'admin'],
  '/admin/productos':     ['developer', 'manager', 'admin'],
  '/admin/personal':      ['developer', 'admin'],
  '/admin/pedidos':       ['developer', 'manager', 'admin'],
  '/admin/clientes':      ['developer', 'manager', 'admin'],
  '/admin/reportes':      ['developer', 'admin'],
  '/admin/configuracion': ['developer', 'admin'],
  '/admin/facturacion':   ['developer', 'admin'],
  '/admin/sucursales':    ['developer', 'admin'],
}

interface SidebarLink {
  href: string
  label: string
  icon: React.ElementType
  requiresEcommerce?: boolean
  badge?: string
}

const sidebarLinks: SidebarLink[] = [
  { href: '/admin',               label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/admin/productos',     label: 'Inventario',     icon: Package },
  { href: '/admin/clientes',      label: 'Clientes (CRM)', icon: Users },
  { href: '/admin/personal',      label: 'Personal',       icon: HardHat },
  { href: '/admin/pedidos',       label: 'Pedidos Online', icon: ShoppingCart, requiresEcommerce: true },
  { href: '/admin/reportes',      label: 'Reportes',       icon: TrendingUp },
  { href: '/admin/facturacion',   label: 'Facturación SII', icon: FileText },
  { href: '/admin/sucursales',    label: 'Sucursales',      icon: Store },
  { href: '/admin/configuracion', label: 'Configuración',  icon: Settings },
]

const ROLE_LABELS: Record<string, string> = {
  developer: 'Desarrollador',
  admin:     'Administrador',
  manager:   'Encargado de Turno',
  cajero:    'Cajero',
  customer:  'Cliente',
}

export default function AdminSidebar({ activePath }: AdminSidebarProps) {
  const { config, isFeatureEnabled } = useSaaS()
  const { user, logout } = useAuthStore()

  const role = user?.role || 'customer'
  const roleLabel = ROLE_LABELS[role] || role
  const hasEcommerce = isFeatureEnabled('ecommerce')

  // Filtrar links según rol y plan
  const filteredLinks = sidebarLinks.filter(link => {
    // Si requiere ecommerce y no está habilitado, no mostrar
    if (link.requiresEcommerce && !hasEcommerce) return false

    // Verificar si el rol tiene permiso para esta ruta
    const allowedRoles = ROUTE_PERMISSIONS[link.href]
    if (!allowedRoles) return false
    return allowedRoles.includes(role)
  })

  const isDeveloper = role === 'developer' || role === 'admin'

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="hidden lg:block w-72 shrink-0">
      <div className="glass-card sticky top-24 border-none overflow-hidden animate-fade-in">
        
        {/* Header del sidebar */}
        <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-corporate-blue flex items-center justify-center text-white shadow-lg shadow-corporate-blue/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-black text-lg tracking-tighter uppercase italic leading-none">Patagonia<span className="text-corporate-blue">POS</span></h2>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">Panel de Control</p>
            </div>
          </div>
        </div>

        {/* User profile */}
        <div className="px-6 py-6 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-corporate-blue to-blue-700 p-0.5 shadow-lg shadow-corporate-blue/10">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-gray-900 flex items-center justify-center text-corporate-blue text-sm font-black italic">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-gray-900 dark:text-white truncate uppercase italic tracking-tighter">
                {user?.firstName} {user?.lastName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
                  role === 'developer' ? "bg-purple-500/10 text-purple-600" :
                  role === 'admin'     ? "bg-rose-500/10 text-rose-600" :
                  role === 'manager'   ? "bg-blue-500/10 text-blue-600" :
                                        "bg-gray-500/10 text-gray-600"
                )}>
                  {roleLabel}
                </span>
              </div>
            </div>
          </div>
          
          {/* Plan Indicator */}
          <div className={cn(
            "mt-4 p-3 rounded-xl border flex items-center justify-between group cursor-help transition-all",
            hasEcommerce 
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700" 
              : "bg-amber-500/5 border-amber-500/20 text-amber-700"
          )}>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest">
                Plan {config.tier === 'elite' ? 'Élite' : config.tier === 'plus' ? 'Plus' : 'Básico'}
              </span>
            </div>
            {config.tier === 'elite' ? <TrendingUp className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
          </div>
        </div>
        
        <nav className="p-4 py-6 space-y-8">
          {/* Links principales */}
          <ul className="space-y-1.5">
            {filteredLinks.map((link) => {
              const isActive = activePath === link.href || 
                (activePath === '/admin' && link.href === '/admin' && activePath.length === link.href.length)
              return (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
                      isActive 
                        ? "bg-corporate-blue text-white shadow-xl shadow-corporate-blue/20 translate-x-1" 
                        : "text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-corporate-blue"
                    )}
                  >
                    <link.icon className={cn("w-5 h-5 transition-all duration-300 group-hover:scale-110", isActive ? "text-white" : "text-gray-400 group-hover:text-corporate-blue")} />
                    <span className="font-black text-xs uppercase tracking-widest italic">{link.label}</span>
                    {isActive && (
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/30" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-white/5">
            {/* Developer Mode */}
            {isDeveloper && (
              <Link 
                href="/admin/developer" 
                className={cn(
                  "flex items-center gap-3 px-4 py-4 rounded-xl transition-all border group",
                  activePath === '/admin/developer'
                    ? "bg-purple-600 text-white shadow-xl shadow-purple-600/20"
                    : "bg-purple-500/5 text-purple-600 border-purple-500/10 hover:bg-purple-500/10"
                )}
              >
                <Terminal className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                <span className="font-black text-[10px] uppercase tracking-[0.2em] italic">System Dev</span>
              </Link>
            )}

            {/* Go to POS */}
            <Link 
              href="/pos" 
              className="flex items-center justify-center gap-3 w-full py-5 px-4 bg-gray-900 hover:bg-black text-accent-yellow rounded-2xl transition-all shadow-xl hover:shadow-black/20 hover:-translate-y-1 group"
            >
              <Monitor className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span className="font-black text-[10px] uppercase tracking-[0.2em] italic">Terminal POS</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-white/5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all group"
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
