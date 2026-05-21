'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  User, LogOut, ShoppingBag, Heart, MessageSquare, Star,
  LayoutDashboard, Package, Users, CalendarClock, ChevronDown,
  Terminal, BadgeCheck, Coins
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin:    { label: 'Administrador',     color: 'text-rose-700',   bg: 'bg-rose-100'   },
  developer: { label: 'Desarrollador',    color: 'text-brand-700', bg: 'bg-brand-100' },
  manager:  { label: 'Encargado Turno',  color: 'text-brand-accent-700', bg: 'bg-brand-accent-100'   },
  cashier:  { label: 'Colaborador',      color: 'text-green-700',  bg: 'bg-green-100'  },
  customer: { label: 'Cliente',          color: 'text-gray-700',   bg: 'bg-gray-100'   },
}

export function UserDropdown() {
  const { user, isAuthenticated, logout } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isAuthenticated || !user) return null

  const role = user.role || 'customer'
  const roleInfo = ROLE_LABELS[role] || ROLE_LABELS.customer
  const isAdmin = role === 'admin'
  const isDeveloper = role === 'developer'
  const isManager = role === 'manager'
  const isStaff = role === 'cashier'
  const isPrivileged = isAdmin || isDeveloper || isManager

  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="user-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-accent-700 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md">
          {initials || <User className="w-4 h-4" />}
        </div>
        <span className="hidden md:inline text-sm font-semibold text-gray-800 dark:text-white">
          {user.firstName}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-500 hidden md:block transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-3 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

          {/* Header: Profile summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-accent-700 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                {initials || <User className="w-6 h-6" />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1",
                  roleInfo.bg, roleInfo.color
                )}>
                  <BadgeCheck className="w-3 h-3" />
                  {roleInfo.label}
                </span>
              </div>
            </div>
            {/* Loyalty Points - shown for all */}
            <div className="mt-3 flex items-center gap-2 bg-white dark:bg-gray-900 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-700">
              <Coins className="w-4 h-4 text-brand-accent" />
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {user.loyaltyPoints ?? 0} <span className="text-gray-400 font-normal">Puntos Austral</span>
              </span>
            </div>
          </div>

          <div className="p-2">

            {/* Admin or Developer section */}
            {(isAdmin || isDeveloper) && (
              <div className="mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 pt-2 pb-1">
                  {isDeveloper ? 'Desarrollo' : 'Administración'}
                </p>
                <MenuItem href="/admin" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsOpen(false)} />
                {isAdmin && <MenuItem href="/admin/usuarios" icon={Users} label="Gestión de Personal" onClick={() => setIsOpen(false)} />}
                {isDeveloper && <MenuItem href="/admin/configuracion" icon={Terminal} label="Configuración" onClick={() => setIsOpen(false)} />}
                <MenuItem href="/pos" icon={Terminal} label="Ir al POS" onClick={() => setIsOpen(false)} />
              </div>
            )}

            {/* Manager section */}
            {isManager && !isDeveloper && (
              <div className="mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 pt-2 pb-1">Encargado</p>
                <MenuItem href="/admin" icon={LayoutDashboard} label="Dashboard" onClick={() => setIsOpen(false)} />
                <MenuItem href="/admin/productos" icon={Package} label="Inventario (Vender)" onClick={() => setIsOpen(false)} />
                <MenuItem href="/pos" icon={Terminal} label="Ir al POS" onClick={() => setIsOpen(false)} />
              </div>
            )}

            {/* Worker section */}
            {isStaff && (
              <div className="mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 pt-2 pb-1">Mi Trabajo</p>
                <MenuItem href="/mis-turnos" icon={CalendarClock} label="Mis Turnos" onClick={() => setIsOpen(false)} />
                <MenuItem href="/pos" icon={Terminal} label="Ir al POS" onClick={() => setIsOpen(false)} />
              </div>
            )}

            {/* General section - for all users */}
            <div className="mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 pt-2 pb-1">Mi Cuenta</p>
              <MenuItem href="/perfil" icon={User} label="Mi Perfil" onClick={() => setIsOpen(false)} />
              <MenuItem href="/perfil?tab=orders" icon={ShoppingBag} label="Mis Compras" onClick={() => setIsOpen(false)} />
              <MenuItem href="/perfil?tab=wishlist" icon={Heart} label="Mis Favoritos" onClick={() => setIsOpen(false)} />
              <MenuItem href="/perfil?tab=questions" icon={MessageSquare} label="Mis Preguntas" onClick={() => setIsOpen(false)} />
              <MenuItem href="/perfil?tab=opinions" icon={Star} label="Mis Opiniones" onClick={() => setIsOpen(false)} />
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
              <button
                onClick={() => { logout(); setIsOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors text-sm font-semibold"
              >
                <LogOut className="w-4 h-4 flex-shrink-0" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuItem({ href, icon: Icon, label, onClick }: {
  href: string
  icon: React.ElementType
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm font-medium text-gray-700 dark:text-gray-300 group"
    >
      <Icon className="w-4 h-4 text-gray-400 group-hover:text-brand-primary transition-colors flex-shrink-0" />
      <span>{label}</span>
    </Link>
  )
}
