"use client";
import Link from 'next/link';
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation';
import {
  ShoppingCart, 
  Menu, 
  X, 
  Search, 
  User, 
  MapPin, 
  Phone,
  Sun,
  Moon
} from 'lucide-react'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'

const useTheme = () => {
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return { theme, setTheme };
}

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/categoria/alimentos', label: 'Alimentos' },
  { href: '/categoria/bebidas', label: 'Bebidas' },
  { href: '/categoria/frescos', label: 'Frescos' },
  { href: '/categoria/limpieza', label: 'Limpieza' },
  { href: '/categoria/hogar', label: 'Hogar' },
]

import { useSaaS } from '@/providers/SaaSProvider'

export default function Header() {
  const { config } = useSaaS()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()
  const { totalItems } = useCartStore()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // En Plan Plus/Elite el header muestra la marca del negocio cliente
  // En Plan Básico siempre PatagoniaPOS (no tienen ecommerce público)
  const hasEcommerce = config.tier === 'plus' || config.tier === 'elite'
  const displayName = hasEcommerce ? config.store_name : 'PatagoniaPOS'
  const displayInitial = displayName.charAt(0).toUpperCase()

  useEffect(() => {
    setMounted(true)
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!mounted) return null

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      "bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800",
      isScrolled && "shadow-md"
    )}>
      {/* Top Bar */}
      <div className={cn(
        "hidden md:block transition-all duration-300 overflow-hidden",
        isScrolled || pathname.startsWith('/admin') ? "h-0 opacity-0" : "h-10 opacity-100"
      )}>
        <div className="bg-corporate-blue text-white text-sm">
          <div className="container mx-auto px-4 h-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Castro, Chiloé, Chile
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +56 9 1234 5678
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span>Envío gratis en compras sobre $30.000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className={cn(
        "transition-all duration-300",
        isScrolled ? "py-2" : "py-4"
      )}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo — cambia según plan */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-10 h-10 bg-corporate-blue rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-corporate-blue/20 overflow-hidden">
                  {hasEcommerce && config.store_logo ? (
                    <img src={config.store_logo} alt={displayName} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-white font-black text-xl italic uppercase tracking-tighter">{displayInitial}</span>
                  )}
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent-yellow rounded-full border-2 border-white dark:border-gray-900 animate-pulse" />
              </div>
              <div className="flex flex-col">
                {hasEcommerce ? (
                  <>
                    <span className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tighter uppercase">
                      {displayName}
                    </span>
                    <span className="text-[10px] font-bold text-corporate-blue uppercase tracking-widest leading-none mt-0.5">
                      Powered by PatagoniaPOS
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tighter">
                      Patagonia<span className="text-corporate-blue italic">POS</span>
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                      Smart Commerce
                    </span>
                  </>
                )}
              </div>
            </Link>

            {/* Desktop Search */}
            <div className="hidden lg:flex flex-1 max-w-xl mx-8">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="w-full h-11 pl-12 pr-4 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50 focus:border-transparent transition-all duration-200"
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-corporate-blue text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-corporate-dark transition-colors">
                  Buscar
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="hidden md:flex"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              {/* Search Mobile */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* User */}
              {isAuthenticated ? (
                <UserDropdown />
              ) : (
                <Link href="/login">
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span className="hidden md:inline">Ingresar</span>
                  </Button>
                </Link>
              )}

              {/* Cart */}
              <Link href="/carrito">
                <Button variant="ghost" className="relative flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="hidden md:inline">Carrito</span>
                  {totalItems > 0 && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-xs bg-accent-yellow text-corporate-dark"
                    >
                      {totalItems}
                    </Badge>
                  )}
                </Button>
              </Link>

              {/* Mobile Menu Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Search */}
          {isSearchOpen && (
            <div className="lg:hidden mt-4 pb-2 animate-slide-down">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  className="w-full h-11 pl-12 pr-4 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50"
                  autoFocus
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation - Hidden on admin pages */}
      {!pathname.startsWith('/admin') && (
      <nav className={cn(
        "hidden md:block border-t border-gray-100 dark:border-gray-800 transition-all duration-300",
        "bg-white dark:bg-gray-900"
      )}>
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}
                  className={cn(
                    "relative px-4 py-3 text-sm font-medium transition-colors hover:text-corporate-blue dark:hover:text-accent-yellow block",
                    pathname === link.href 
                      ? "text-corporate-blue dark:text-accent-yellow" 
                      : "text-gray-700 dark:text-gray-300"
                  )}
                >
                  {link.label}
                  {pathname === link.href && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-corporate-blue dark:bg-accent-yellow rounded-full" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      )}

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[60px] bg-white dark:bg-gray-900 z-40 animate-slide-down">
          <div className="p-4">
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "block px-4 py-3 rounded-lg font-medium transition-colors",
                      pathname === link.href 
                        ? "bg-corporate-blue text-white" 
                        : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Tema</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
                  {theme === 'dark' ? 'Claro' : 'Oscuro'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
