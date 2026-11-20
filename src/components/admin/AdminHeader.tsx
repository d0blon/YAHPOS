'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Bell, 
  Monitor, 
  Store, 
  ChevronRight, 
  Sparkles,
  Menu,
  LayoutDashboard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { DesignWishlistModal } from './DesignWishlistModal'

interface AdminHeaderProps {
  onMenuClick?: () => void
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Generar breadcrumbs a partir del pathname
  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = `/${pathSegments.slice(0, index + 1).join('/')}`
    const isLast = index === pathSegments.length - 1
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')
    
    return { href, label, isLast }
  })

  return (
    <header 
      className={cn(
        "fixed top-0 right-0 left-0 lg:left-72 z-40 transition-all duration-300 px-4 md:px-8",
        isScrolled 
          ? "h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 shadow-sm" 
          : "h-20 bg-transparent"
      )}
    >
      <div className="h-full flex items-center justify-between gap-4">
        
        {/* Left Side: Breadcrumbs & Context */}
        <div className="flex items-center gap-4 overflow-hidden">
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden shrink-0"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <nav className="hidden md:flex items-center gap-2 text-sm text-gray-500 overflow-hidden whitespace-nowrap">
            <Link href="/admin" className="hover:text-brand-primary transition-colors flex items-center gap-1.5 shrink-0">
              <LayoutDashboard className="w-4 h-4" />
              <span className="font-bold uppercase tracking-tighter italic">Admin</span>
            </Link>
            
            {breadcrumbs.length > 1 && breadcrumbs.slice(1).map((crumb) => (
              <React.Fragment key={crumb.href}>
                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                <Link 
                  href={crumb.href}
                  className={cn(
                    "transition-colors truncate",
                    crumb.isLast 
                      ? "text-gray-900 dark:text-white font-black uppercase italic tracking-tighter" 
                      : "hover:text-brand-primary"
                  )}
                >
                  {crumb.label}
                </Link>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right Side: Actions & Profile */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          
          {/* AI Innovation Button - The Magic Wand */}
          <Button 
            onClick={() => setIsWishlistOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-accent-600 hover:from-brand-700 hover:to-brand-accent-700 text-white border-none rounded-2xl px-4 h-10 shadow-lg shadow-brand-500/20 animate-pulse-subtle group"
          >
            <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest italic">Mejorar con IA</span>
          </Button>

          {/* Quick Links */}
          <div className="flex items-center bg-gray-50 dark:bg-white/5 p-1 rounded-2xl border border-gray-100 dark:border-white/5">
            <Link href="/pos">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-white dark:hover:bg-white/10 shadow-sm" title="Terminal POS">
                <Monitor className="w-4 h-4 text-brand-primary" />
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-white dark:hover:bg-white/10 shadow-sm" title="Ver Tienda">
                <Store className="w-4 h-4 text-emerald-500" />
              </Button>
            </Link>
          </div>

          <div className="h-8 w-[1px] bg-gray-100 dark:bg-white/10 hidden md:block" />

          {/* Notifications & Profile */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative w-10 h-10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
            </Button>

            <div className="flex items-center gap-3 pl-2 border-l border-gray-100 dark:border-white/10 ml-2">
              <div className="hidden md:block text-right leading-none">
                <p className="text-sm font-black italic uppercase tracking-tighter text-gray-900 dark:text-white">
                  {user?.firstName}
                </p>
                <p className="text-[9px] font-bold text-brand-primary uppercase tracking-widest mt-0.5">
                  {user?.role}
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-blue-700 p-0.5 shadow-lg shadow-brand-primary/10 shrink-0">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-gray-900 flex items-center justify-center text-brand-primary text-xs font-black italic">
                  {user?.firstName?.[0]}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DesignWishlistModal 
        isOpen={isWishlistOpen} 
        onClose={() => setIsWishlistOpen(false)} 
      />
    </header>
  )
}
