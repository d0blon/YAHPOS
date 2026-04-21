'use client'

import React from 'react'
import Link from 'next/link'
import { 
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, 
  Settings, Monitor, LogOut, UserCheck, HardHat, Terminal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSaaS } from '@/providers/SaaSProvider'

interface AdminSidebarProps {
  activePath?: string;
}

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/productos', label: 'Productos', icon: Package },
  { href: '/admin/personal', label: 'Personal', icon: HardHat },
  { href: '/admin/pedidos', label: 'Pedidos', icon: ShoppingCart },
  { href: '/admin/clientes', label: 'Clientes', icon: Users },
  { href: '/admin/reportes', label: 'Reportes', icon: TrendingUp },
  { href: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export default function AdminSidebar({ activePath }: AdminSidebarProps) {
  const { config, isFeatureEnabled } = useSaaS()

  const filteredLinks = sidebarLinks.filter(link => {
    if (link.href === '/admin/pedidos') return isFeatureEnabled('ecommerce')
    return true
  })

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow sticky top-20 border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-corporate-blue/5 rounded-t-xl">
          <h2 className="font-black text-lg tracking-tight uppercase truncate">PatagoniaPOS</h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-corporate-blue">Panel de Admin</p>
        </div>
        
        <nav className="p-4 space-y-4">
          <ul className="space-y-1">
            {filteredLinks.map((link) => {
              const isActive = activePath === link.href || (activePath === '/admin' && link.href === '/admin' && activePath.length === link.href.length)
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

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
             <Link 
               href="/admin/developer" 
               className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-500/5 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-all border border-purple-500/10 group"
             >
                <Terminal className="w-5 h-5 transition-transform group-hover:rotate-12" />
                <span className="font-black text-[10px] uppercase tracking-widest italic">Developer Mode</span>
             </Link>

             <Link 
               href="/pos" 
               className="flex items-center justify-center gap-2 w-full py-4 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 group"
             >
                <Monitor className="w-5 h-5 text-accent-yellow transition-transform group-hover:rotate-12" />
                <span className="font-black text-xs uppercase tracking-widest text-accent-yellow">Ir al POS</span>
             </Link>
          </div>
        </nav>

        <div className="p-4 mt-2">
            <Link href="/" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Cerrar Sesión</span>
            </Link>
        </div>
      </div>
    </aside>
  )
}
