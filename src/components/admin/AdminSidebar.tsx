'use client'

import React from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, 
  Settings, Monitor, LogOut, HardHat, Terminal, Lock
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
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow sticky top-20 border border-gray-100 dark:border-gray-700 overflow-hidden">
        
        {/* Header del sidebar */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-corporate-blue/5">
          <h2 className="font-black text-base tracking-tight uppercase truncate">PatagoniaPOS</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-corporate-blue mt-0.5">Panel Admin</p>
        </div>

        {/* Badge del usuario actual */}
        <div className="px-5 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-corporate-blue to-blue-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                role === 'developer' ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
                role === 'admin'     ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                role === 'manager'   ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                role === 'cajero' || role === 'cashier' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                      "bg-gray-100 text-gray-700"
              )}>
                {roleLabel}
              </span>
            </div>
          </div>
          
          {/* Indicador de plan */}
          <div className={cn(
            "mt-2 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg text-center",
            hasEcommerce 
              ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" 
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          )}>
            Plan {config.tier === 'elite' ? '👑 Élite' : config.tier === 'plus' ? '⚡ Plus' : '🔵 Básico'}
          </div>
        </div>
        
        <nav className="p-4 space-y-4">
          {/* Links principales */}
          <ul className="space-y-1">
            {filteredLinks.map((link) => {
              const isActive = activePath === link.href || 
                (activePath === '/admin' && link.href === '/admin' && activePath.length === link.href.length)
              return (
                <li key={link.href}>
                  <Link 
                    href={link.href} 
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                      isActive 
                        ? "bg-corporate-blue text-white shadow-lg shadow-corporate-blue/20" 
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-corporate-blue"
                    )}
                  >
                    <link.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-white" : "text-gray-400")} />
                    <span className="font-bold text-sm tracking-tight">{link.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Items bloqueados por plan - mostrar como referencia */}
          {!hasEcommerce && (ROUTE_PERMISSIONS['/admin/pedidos']?.includes(role)) && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-4 mb-2">Requiere Plan Plus</p>
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-60">
                <Lock className="w-4 h-4" />
                <span className="font-bold text-sm tracking-tight">Pedidos Online</span>
                <span className="ml-auto text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Plus</span>
              </div>
              {isDeveloper && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-60">
                  <Lock className="w-4 h-4" />
                  <span className="font-bold text-sm tracking-tight">Reportes</span>
                  <span className="ml-auto text-[9px] font-black uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">Plus</span>
                </div>
              )}
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
            {/* Developer Mode: solo para developer */}
            {isDeveloper && (
              <Link 
                href="/admin/developer" 
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all border border-purple-500/10 group"
              >
                <Terminal className="w-5 h-5 transition-transform group-hover:rotate-12" />
                <span className="font-black text-[10px] uppercase tracking-widest italic">Developer Mode</span>
              </Link>
            )}

            {/* Botón POS - siempre visible para staff */}
            <Link 
              href="/pos" 
              className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 group"
            >
              <Monitor className="w-5 h-5 text-accent-yellow transition-transform group-hover:rotate-12" />
              <span className="font-black text-xs uppercase tracking-widest text-accent-yellow">Ir al POS</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-bold uppercase">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
