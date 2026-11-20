'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, User } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/lib/gsap'

ensureGsapRegistered()

export default function BottomNav() {
  const pathname = usePathname()
  const cartItems = useCartStore((state) => state.items)
  const user = useAuthStore((state) => state.user)
  const containerRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  
  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  const navItems = [
    { label: 'Inicio', icon: Home, href: '/' },
    { label: 'Explorar', icon: Search, href: '/buscar' },
    { label: 'Carrito', icon: ShoppingBag, href: '/carrito', badge: totalItems },
    { label: 'Perfil', icon: User, href: user ? '/perfil' : '/login' },
  ]

  const activeIndex = navItems.findIndex(item => item.href === pathname)

  useGSAP(() => {
    if (activeIndex !== -1 && indicatorRef.current) {
      const items = containerRef.current?.querySelectorAll('.nav-item')
      if (items && items[activeIndex]) {
        const target = items[activeIndex] as HTMLElement
        gsap.to(indicatorRef.current, {
          x: target.offsetLeft + (target.offsetWidth / 2) - (indicatorRef.current.offsetWidth / 2),
          duration: 0.6,
          ease: 'elastic.out(1, 0.8)'
        });
      }
    }
  }, [activeIndex])

  const handleInteraction = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const icon = e.currentTarget.querySelector('.nav-icon')
    if (icon) {
      gsap.to(icon, {
        scale: 0.8,
        duration: 0.1,
        yoyo: true,
        repeat: 1,
        ease: 'power2.inOut'
      })
    }
  }

  return (
    <div className="md:hidden fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md pointer-events-none">
      <div 
        ref={containerRef}
        className="relative w-full h-20 bg-black/40 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto flex items-center justify-around px-4"
      >
        {/* Animated Background Indicator */}
        <div 
          ref={indicatorRef}
          className="absolute top-1/2 -translate-y-1/2 w-16 h-16 bg-brand-accent-600/20 rounded-3xl border border-brand-accent-500/30 blur-[2px] transition-opacity duration-300 pointer-events-none"
          style={{ opacity: activeIndex === -1 ? 0 : 1 }}
        >
          <div className="absolute inset-0 bg-brand-accent-500/10 rounded-3xl" />
        </div>

        {navItems.map((item, index) => {
          const isActive = activeIndex === index
          const Icon = item.icon
          
          return (
            <Link 
              key={item.href}
              href={item.href}
              onClick={handleInteraction}
              className={cn(
                "nav-item relative flex flex-col items-center justify-center w-16 h-16 transition-all duration-500 z-10",
                isActive ? "text-brand-accent-400" : "text-gray-500"
              )}
            >
              <div className="nav-icon relative">
                <Icon className={cn(
                  "w-6 h-6 transition-all duration-500",
                  isActive && "scale-110"
                )} />
                 {(item.badge ?? 0) > 0 && (
                  <span className="absolute -top-2 -right-2 bg-brand-accent-600 text-[10px] font-black text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-black/50 shadow-lg shadow-brand-accent-600/20">
                    {item.badge}
                  </span>
                )}
              </div>
              
              <span className={cn(
                "text-[9px] font-black mt-1.5 uppercase tracking-widest transition-all duration-500",
                isActive ? "opacity-100 scale-100" : "opacity-0 scale-50"
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
