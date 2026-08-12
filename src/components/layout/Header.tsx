"use client";
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react'
import {
  ShoppingCart, 
  Search, 
  Sun, 
  Moon, 
  Heart
} from 'lucide-react'
import { UserDropdown } from '@/components/layout/UserDropdown'
import { Button } from '@/components/ui/button'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { useTheme } from '@/providers/ThemeProvider'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/lib/gsap'

// Eliminado useTheme local que causaba conflictos


import { useSaaS } from '@/providers/SaaSProvider'

export default function Header() {
  ensureGsapRegistered()
  const { config } = useSaaS()
  const [isScrolled, setIsScrolled] = useState(false)

  const { totalItems } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const headerRef = useRef<HTMLElement>(null)


  // En Plan Patagonia el header muestra la marca del negocio cliente (White Label)
  // En Plan Básico siempre YAHPOS! (no tienen ecommerce público)
  const hasEcommerce = (config.tier as string) === 'archipielago' || (config.tier as string) === 'patagonia'
  const displayName = hasEcommerce ? config.store_name : 'YAHPOS!'

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true)
    })
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  // Entrance animation (fast, premium)
  useGSAP(() => {
    if (!mounted) return
    const header = headerRef.current
    if (!header) return
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
        "floating-header bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 sticky top-0 z-50 transition-all duration-300 py-3",
        isScrolled && "shadow-md py-2"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* DESKTOP HEADER & MOBILE ROW 1 */}
        <div className="flex items-center justify-between gap-6 header-row">
          
          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-3 group header-logo shrink-0">
            <div className="relative">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-all duration-500 overflow-hidden",
                hasEcommerce && config.store_logo 
                  ? "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl" 
                  : "bg-primary shadow-xl shadow-primary/20"
              )}>
                {hasEcommerce && config.store_logo ? (
                  <Image 
                    src={config.store_logo} 
                    alt={displayName} 
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain" 
                  />
                ) : (
                  <Image 
                    src={theme === 'dark' ? '/logos/yahpos_logo_master_dark.svg' : '/logos/yahpos_logo_master.svg'} 
                    alt="YAHPOS!" 
                    width={40}
                    height={40}
                    className="w-full h-full object-contain p-1" 
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col">
              <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight leading-none font-heading">
                {displayName}
              </h1>
              <span className="text-[9px] font-bold text-primary dark:text-brand-accent uppercase tracking-widest mt-0.5">
                {hasEcommerce ? 'Supermercado' : 'Smart Commerce'}
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar - Flex 1 */}
          <div className="hidden md:flex flex-1 max-w-2xl header-search relative group">
             <input
                type="text"
                placeholder="¿Qué necesitas hoy?"
                className="w-full h-11 pl-4 pr-11 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 focus:bg-white dark:focus:bg-gray-950 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 text-sm font-medium outline-none"
             />
             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
             </div>
          </div>

          {/* Actions - Right Side */}
          <div className="flex items-center gap-2 md:gap-3 header-actions justify-end shrink-0">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-brand-accent" /> : <Moon className="w-4 h-4 text-gray-600" />}
            </Button>

            {/* Favorites (Heart) */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-gray-100 dark:hover:bg-white/5 relative"
            >
              <Heart className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
            </Button>

            <div className="w-px h-6 bg-gray-200 dark:bg-white/10 mx-1 hidden sm:block" />

            {/* User Dropdown */}
            {isAuthenticated ? (
              <UserDropdown />
            ) : (
              <Link href="/login" className="hidden sm:block">
                <Button variant="ghost" size="sm" className="rounded-full font-bold text-xs uppercase tracking-wider">
                  Acceder
                </Button>
              </Link>
            )}

            {/* Cart Button */}
            <Link href="/carrito">
              <Button size="sm" className="relative rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 px-4 h-10 font-bold font-heading">
                <ShoppingCart className="w-4 h-4 mr-2" />
                <span>{totalItems}</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* MOBILE ROW 2: SEARCH BAR (Full Width) */}
        <div className="md:hidden mt-3 relative group">
           <input
              type="text"
              placeholder="¿Qué necesitas hoy?"
              className="w-full h-10 pl-4 pr-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 text-xs font-medium outline-none"
           />
           <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <Search className="w-3.5 h-3.5 text-gray-400 group-focus-within:text-primary transition-colors" />
           </div>
        </div>
      </div>
    </header>
  )
}
