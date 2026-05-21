'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { Store, Menu, X } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from '@/lib/gsap'

const PlatformHeader = () => {
  const headerRef = useRef<HTMLElement>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  useGSAP(() => {
    // Entrance animation
    gsap.from(headerRef.current, {
      y: -100,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
    })

    // Scroll transition: Transparent to Glass
    if (headerRef.current) {
      gsap.to(headerRef.current, {
        scrollTrigger: {
          start: 50, // Trigger after 50px scroll
          toggleActions: 'play none none reverse',
        },
        backgroundColor: 'rgba(21, 0, 36, 0.8)', // brand-900 with alpha
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(119, 0, 204, 0.2)',
        height: '80px',
        paddingTop: '0',
        paddingBottom: '0',
        duration: 0.5,
        ease: 'power3.inOut'
      })
    }
  }, { scope: headerRef })

  const navLinks = [
    { name: 'Funcionalidades', href: '#features' },
    { name: 'POS', href: '#pos' },
    { name: 'Precios', href: '#pricing' },
    { name: 'Contacto', href: '#contact' },
  ]

  return (
    <header 
      ref={headerRef}
      className="fixed top-0 left-0 w-full h-[100px] z-[1000] flex items-center px-6 md:px-12 text-white transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-12 h-12 bg-gradient-to-br from-brand-primary to-brand-700 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 ring-1 ring-white/20">
            <Store className="text-white w-7 h-7" />
          </div>
          <span className="text-3xl font-black tracking-tighter">
            YAHPOS<span className="text-brand-accent">!</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-10">
          {navLinks.map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 hover:text-brand-accent transition-colors duration-300 relative group/link"
            >
              {link.name}
              <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-brand-accent transition-all duration-300 group-hover/link:w-full"></span>
            </Link>
          ))}
          <div className="h-8 w-[1px] bg-white/10 mx-2"></div>
          <Link 
            href="/login" 
            className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors"
          >
            Acceso
          </Link>
          <Link 
            href="/login" 
            className="px-8 py-3 bg-brand-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-brand-700 shadow-xl hover:shadow-brand-primary/20 transition-all duration-300 transform hover:-translate-y-1 ring-1 ring-white/10"
          >
            Empezar
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="lg:hidden p-2 text-white hover:text-brand-accent transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-brand-900 z-[2000] flex flex-col p-8 lg:hidden animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-center mb-16">
             <span className="text-3xl font-black tracking-tighter text-white">
              YAHPOS<span className="text-brand-accent">!</span>
            </span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-3 bg-white/5 rounded-2xl">
              <X className="w-8 h-8 text-white" />
            </button>
          </div>
          <div className="flex flex-col gap-6">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-5xl font-black text-white hover:text-brand-accent transition-colors tracking-tighter"
              >
                {link.name}
              </Link>
            ))}
            <div className="h-[1px] w-full bg-white/10 my-6" />
            <Link 
              href="/login" 
              className="text-2xl font-black text-white/40 hover:text-white transition-colors tracking-tight"
            >
              Acceso Clientes
            </Link>
            <Link 
              href="/login" 
              className="w-full py-6 bg-brand-primary text-white text-center text-2xl font-black rounded-[2rem] shadow-2xl shadow-brand-primary/20 mt-4"
            >
              Empezar Gratis
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default PlatformHeader
