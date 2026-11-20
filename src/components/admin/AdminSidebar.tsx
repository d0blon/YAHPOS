'use client'

import React from 'react'
import Link from 'next/link'
import {
  Settings, Monitor, LogOut, HardHat, Terminal, FileText, Store, LayoutDashboard, Package, Users, ShoppingCart, TrendingUp, PaintBucket,
  MessageSquare, Megaphone, Share2, ShieldCheck, Plug, HelpCircle
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
 * owner      → acceso total (dueño de la tienda)
 * admin      → acceso total (administrador de la tienda)
 * manager    → Dashboard, Productos, Clientes, POS, Pedidos
 * cajero     → Solo POS (no debería llegar al admin, pero por si acaso)
 */
const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/admin':               ['developer', 'owner', 'admin', 'manager'],
  '/admin/productos':     ['developer', 'owner', 'admin', 'manager'],
  '/admin/personal':      ['developer', 'owner', 'admin'],
  '/admin/pedidos':       ['developer', 'owner', 'admin', 'manager'],
  '/admin/clientes':      ['developer', 'owner', 'admin', 'manager'],
  '/admin/reportes':      ['developer', 'owner', 'admin'],
  '/admin/configuracion': ['developer', 'owner', 'admin'],
  '/admin/branding':      ['developer', 'owner', 'admin'],
  '/admin/facturacion':   ['developer', 'owner', 'admin'],
  '/admin/sucursales':    ['developer', 'owner', 'admin'],
  '/admin/cajas':         ['developer', 'owner', 'admin', 'manager'],
  '/admin/mensajes':      ['developer', 'owner', 'admin'],
  '/admin/campanas':      ['developer', 'owner', 'admin'],
  '/admin/canales':       ['developer', 'owner', 'admin'],
  '/admin/roles':         ['developer', 'owner', 'admin'],
  '/admin/integraciones': ['developer', 'owner', 'admin'],
  '/admin/ayuda':         ['developer', 'owner', 'admin', 'manager'],
}

interface SidebarLink {
  href: string
  label: string
  icon: React.ElementType
  requiresEcommerce?: boolean
  badge?: string
}

interface SidebarSection {
  title: string
  links: SidebarLink[]
}

const sidebarSections: SidebarSection[] = [
  {
    title: 'Dashboard',
    links: [
      { href: '/admin',               label: 'Dashboard',  icon: LayoutDashboard },
      { href: '/admin/productos',     label: 'Inventario', icon: Package },
      { href: '/admin/reportes',      label: 'Reportes',   icon: TrendingUp },
    ],
  },
  {
    title: 'Punto de Venta',
    links: [
      { href: '/admin/cajas',         label: 'Cajas / POS', icon: Monitor },
      { href: '/admin/sucursales',    label: 'Sucursales',  icon: Store },
    ],
  },
  {
    title: 'E-commerce',
    links: [
      { href: '/admin/pedidos',       label: 'Pedidos Online',   icon: ShoppingCart, requiresEcommerce: true },
      { href: '/admin/canales',       label: 'Canales de Venta', icon: Share2, badge: 'Próximamente' },
    ],
  },
  {
    title: 'Clientes',
    links: [
      { href: '/admin/clientes',      label: 'Clientes (CRM)', icon: Users },
      { href: '/admin/mensajes',      label: 'Mensajes',       icon: MessageSquare, badge: 'Próximamente' },
      { href: '/admin/campanas',      label: 'Campañas',       icon: Megaphone, badge: 'Próximamente' },
    ],
  },
  {
    title: 'Gestión',
    links: [
      { href: '/admin/personal',      label: 'Personal',        icon: HardHat },
      { href: '/admin/roles',         label: 'Roles y Permisos', icon: ShieldCheck, badge: 'Próximamente' },
      { href: '/admin/facturacion',   label: 'Facturación SII',  icon: FileText },
      { href: '/admin/branding',      label: 'Branding',        icon: PaintBucket },
    ],
  },
  {
    title: 'Configuración',
    links: [
      { href: '/admin/configuracion', label: 'Configuración',   icon: Settings },
      { href: '/admin/integraciones', label: 'Integraciones',   icon: Plug, badge: 'Próximamente' },
      { href: '/admin/ayuda',         label: 'Centro de Ayuda', icon: HelpCircle, badge: 'Próximamente' },
    ],
  },
]

const ROLE_LABELS: Record<string, string> = {
  developer: 'Desarrollador',
  owner:     'Propietario',
  admin:     'Administrador',
  manager:   'Encargado de Turno',
  cajero:    'Cajero',
  customer:  'Cliente',
}

export default function AdminSidebar({ activePath }: AdminSidebarProps) {
  const { config, isFeatureEnabled } = useSaaS()
  const { user, logout } = useAuthStore()

  const role = user?.role || 'customer'
  const isDeveloper = role === 'developer'
  const isPrivileged = isDeveloper || role === 'admin' || role === 'owner'
  const roleLabel = ROLE_LABELS[role] || role
  const hasEcommerce = isFeatureEnabled('ecommerce')

  const filteredSections = sidebarSections
    .map(section => ({
      ...section,
      links: section.links.filter(link => {
        if (isPrivileged) return true
        if (link.requiresEcommerce && !hasEcommerce) return false
        const allowedRoles = ROUTE_PERMISSIONS[link.href]
        if (!allowedRoles) return false
        return allowedRoles.includes(role)
      }),
    }))
    .filter(section => section.links.length > 0)

  const handleLogout = async () => {
    await logout()
  }

  return (
    <aside className="h-full w-full flex flex-col bg-[var(--card)] text-[var(--foreground)]">
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header del sidebar */}
        <div className="px-5 py-5 border-b border-[var(--border)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-primary flex items-center justify-center text-white shrink-0">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm leading-none truncate">YAHPOS!</h2>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">Panel de Control</p>
          </div>
        </div>

        {/* User profile */}
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--muted)] flex items-center justify-center text-brand-accent text-xs font-semibold shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">{roleLabel}</p>
            </div>
          </div>

          {/* Plan Indicator */}
          <div className="mt-3 px-3 py-2 rounded-lg bg-[var(--muted)] flex items-center justify-between text-[var(--muted-foreground)]">
            <span className="text-[11px] font-medium">
              Plan {config.tier === 'patagonia' ? 'YAHPOS! Platinum' : config.tier === 'archipielago' ? 'YAHPOS! Pro' : 'YAHPOS! Starter'}
            </span>
            {config.tier === 'patagonia' ? <TrendingUp className="w-3.5 h-3.5" /> : <Package className="w-3.5 h-3.5" />}
          </div>
        </div>

        <nav className="px-3 py-4 space-y-5">
          {filteredSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.links.map((link) => {
                  const isActive = activePath === link.href ||
                    (activePath === '/admin' && link.href === '/admin' && activePath.length === link.href.length)
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                          isActive
                            ? "bg-[var(--muted)] text-brand-accent font-medium"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-brand-accent" />
                        )}
                        <link.icon className="w-4 h-4 shrink-0" />
                        <span className="truncate flex-1">{link.label}</span>
                        {link.badge && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--border)] text-[var(--muted-foreground)] shrink-0">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          <div className="space-y-1 pt-4 border-t border-[var(--border)]">
            {isDeveloper && (
              <Link
                href="/developer"
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  activePath === '/developer'
                    ? "bg-[var(--muted)] text-brand-primary font-medium"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                <Terminal className="w-4 h-4 shrink-0" />
                <span>System Dev</span>
              </Link>
            )}

            <Link
              href="/pos"
              className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg text-sm font-medium bg-[var(--muted)] text-brand-accent hover:bg-[var(--border)] transition-colors"
            >
              <Monitor className="w-4 h-4" />
              <span>Terminal POS</span>
            </Link>
          </div>
        </nav>
      </div>

      <div className="p-3 border-t border-[var(--border)] shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  )
}
