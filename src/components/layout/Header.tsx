"use client";
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react'
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
import { useTheme } from '@/providers/ThemeProvider'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/lib/gsap'

// Eliminado useTheme local que causaba conflictos

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
  ensureGsapRegistered()
  const { config } = useSaaS()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const pathname = usePathname()
  const { totalItems } = useCartStore()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const headerRef = useRef<HTMLElement>(null)


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

  // Entrance animation (fast, premium)
  useGSAP(() => {
    if (!mounted) return
    const header = headerRef.current
    if (!header) return
    const row = header.querySelector('.header-row')
    const logo = header.querySelector('.header-logo')
    const search = header.querySelector('.header-search')
    const actions = header.querySelector('.header-actions')

    const parts = [logo, search, actions].filter(Boolean) as Element[]
    gsap.set(header, { y: -10, autoAlpha: 0 })
    gsap.set(parts, { y: 10, autoAlpha: 0 })

    const tl = gsap.timeline()
    tl.to(header, { y: 0, autoAlpha: 1, duration: 0.35, ease: 'power2.out' })
      .to(parts, { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', stagger: 0.08 }, 0.05)

    return () => tl.kill()
  }, [mounted])

  if (!mounted) return null

  return (
    <header 
      ref={headerRef} 
      className={cn(
        "floating-header",
        isScrolled && "header-scrolled"
      )}
    >
      {/* Main Header Container */}
      <div className={cn(
        "px-6 transition-all duration-500",
        isScrolled ? "py-2" : "py-3"
      )}>
        <div className="flex items-center justify-between gap-6 header-row">
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 group header-logo shrink-0">
            <div className="relative">
              <div className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-all duration-500 overflow-hidden",
                hasEcommerce && config.store_logo 
                  ? "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl" 
                  : "bg-primary shadow-xl shadow-primary/20"
              )}>
                {hasEcommerce && config.store_logo ? (
                  <img src={config.store_logo} alt={displayName} className="w-8 h-8 object-contain" />
                ) : (
                  <img 
                    src={theme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'} 
                    alt="PatagoniaPOS" 
                    className={cn(
                      "w-full h-full object-contain p-1",
                      theme === 'dark' ? "mix-blend-screen" : "mix-blend-multiply"
                    )} 
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight leading-none">
                {displayName.includes('Patagonia') ? (
                  <>Patagonia<span className="text-primary italic">Market</span></>
                ) : (
                  displayName
                )}
              </h1>
              <p className={cn(
                "text-[9px] font-black text-primary uppercase tracking-[0.2em] leading-none transition-all duration-700",
                isScrolled ? "opacity-0 translate-y-[-5px] h-0 mt-0" : "opacity-70 translate-y-0 h-auto mt-1.5"
              )}>
                {hasEcommerce ? 'Smart Commerce' : 'Retail System'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation - Integrated in Header */}
          <nav className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}
                    className={cn(
                      "px-4 py-2 text-sm font-semibold transition-all duration-300 rounded-full hover:bg-gray-100 dark:hover:bg-white/5",
                      pathname === link.href 
                        ? "text-primary dark:text-primary-foreground" 
                        : "text-gray-600 dark:text-gray-400"
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Search bar simplified */}
          <div className="hidden md:flex flex-1 max-w-sm header-search relative group">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
             </div>
             <input
                type="text"
                placeholder="Explorar..."
                className="w-full h-10 pl-11 pr-4 rounded-full border-none bg-gray-100/50 dark:bg-white/5 focus:bg-white dark:focus:bg-white/10 focus:ring-2 focus:ring-primary/20 transition-all duration-300 text-sm font-medium"
             />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2 header-actions">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-accent-yellow" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </Button>

            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />

            {isAuthenticated ? (
              <UserDropdown />
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="sm" className="rounded-full font-bold text-xs uppercase tracking-wider">
                  Acceder
                </Button>
              </Link>
            )}

            <Link href="/carrito">
              <Button size="sm" className="relative rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 px-4">
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span className="font-bold">{totalItems}</span>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Enhanced */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[110%] left-0 right-0 glass-card mx-2 p-6 rounded-[2rem] overflow-hidden animate-slide-up">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block px-6 py-4 rounded-2xl font-bold text-lg transition-all",
                    pathname === link.href 
                      ? "bg-primary text-white" 
                      : "hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
