'use client'

import React, { useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, Shield, Zap, Globe, Smartphone, BarChart3, Cloud, ChevronRight, Store } from 'lucide-react'
import { useGSAP } from '@gsap/react'
import gsap from '@/lib/gsap'
import PlatformHeader from '@/components/layout/PlatformHeader'

const PlatformLanding = () => {
  const mainRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const pricingRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // 1. Hero Entrance - High impact split-text style
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })
    
    tl.from('.hero-bg-img', {
      scale: 1.4,
      duration: 2.5,
      ease: 'expo.out'
    })
    .from('.hero-title-line span', {
      y: 200,
      rotate: 10,
      opacity: 0,
      duration: 1.8,
      stagger: 0.15,
      ease: 'expo.out'
    }, 0.5)
    .from('.hero-desc', {
      y: 40,
      opacity: 0,
      duration: 1.2
    }, '-=1')
    .from('.hero-cta-btn', {
      y: 50,
      opacity: 0,
      duration: 1,
      stagger: 0.2
    }, '-=0.8')

    // 2. Parallax Effect for Background
    gsap.to('.hero-bg-img', {
      yPercent: 30,
      ease: 'none',
      scrollTrigger: {
        trigger: heroRef.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true
      }
    })

    // 3. Staggered Feature Reveal
    gsap.from('.feature-card', {
      scrollTrigger: {
        trigger: featuresRef.current,
        start: 'top 75%',
      },
      y: 100,
      opacity: 0,
      duration: 1.2,
      stagger: 0.1,
      ease: 'expo.out'
    })

    // 4. Pricing Cards Hover & Entrance
    gsap.from('.pricing-card', {
      scrollTrigger: {
        trigger: pricingRef.current,
        start: 'top 80%',
      },
      scale: 0.9,
      opacity: 0,
      duration: 1,
      stagger: 0.2,
      ease: 'back.out(1.7)'
    })

    // 5. Magnetic Button Effect
    const magneticBtns = document.querySelectorAll('.magnetic-btn')
    magneticBtns.forEach((btn: any) => {
      btn.addEventListener('mousemove', (e: MouseEvent) => {
        const rect = btn.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        gsap.to(btn, {
          x: x * 0.4,
          y: y * 0.4,
          duration: 0.6,
          ease: 'power3.out'
        })
      })
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {
          x: 0,
          y: 0,
          duration: 0.8,
          ease: 'elastic.out(1, 0.3)'
        })
      })
    })

  }, { scope: mainRef })

  const features = [
    {
      title: 'Punto de Venta (POS)',
      desc: 'Gestión de caja rápida, intuitiva y conectada en tiempo real con tu inventario.',
      icon: Smartphone,
      color: 'purple'
    },
    {
      title: 'E-commerce Multi-tenant',
      desc: 'Tu tienda online lista en minutos con subdominio propio y pasarela de pagos.',
      icon: Globe,
      color: 'yellow'
    },
    {
      title: 'Facturación SII',
      desc: 'Emisión de boletas y facturas electrónicas automatizada y legalmente válida.',
      icon: Shield,
      color: 'blue'
    },
    {
      title: 'Gestión de Inventario',
      desc: 'Control total de stock, proveedores y alertas de reposición inteligente.',
      icon: BarChart3,
      color: 'purple'
    },
    {
      title: 'Sincronización Cloud',
      desc: 'Accede a tus datos desde cualquier lugar. Funciona offline y se sincroniza al volver.',
      icon: Cloud,
      color: 'yellow'
    },
    {
      title: 'Soporte Austral',
      desc: 'Atención personalizada y local para las necesidades únicas del comercio en el sur.',
      icon: Zap,
      color: 'blue'
    }
  ]

  const plans = [
    {
      name: 'Plan Austral',
      price: '$19.990',
      desc: 'Ideal para tiendas físicas que necesitan control.',
      features: ['POS Ilimitado', 'Inventario Base', 'Reportes Diarios', '1 Usuario'],
      highlight: false
    },
    {
      name: 'Plan Archipiélago',
      price: '$34.990',
      desc: 'Perfecto para crecer con tienda online.',
      features: ['Todo en Austral', 'Tienda Online Propia', 'Pasarela de Pagos', 'Facturación SII', '3 Usuarios'],
      highlight: true
    },
    {
      name: 'Plan Patagonia',
      price: '$59.990',
      desc: 'Potencia máxima para empresas consolidadas.',
      features: ['Todo en Archipiélago', 'Multi-sucursal', 'API de Integración', 'Soporte Prioritario 24/7', 'Usuarios Ilimitados'],
      highlight: false
    }
  ]

  return (
    <div ref={mainRef} className="bg-white overflow-x-hidden selection:bg-brand-primary selection:text-white">
      <PlatformHeader />

      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <Image 
            src="https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&q=80&w=2070"
            alt="Patagonia Torres del Paine"
            fill
            className="hero-bg-img object-cover brightness-[0.6] contrast-[1.1]"
            priority
          />
          {/* Advanced Overlays for Contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-900/70 via-transparent to-white"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-brand-900/40 via-transparent to-brand-900/40"></div>
          <div className="absolute inset-0 backdrop-blur-[2px]"></div>
        </div>

        <div className="relative z-10 text-center px-6 max-w-6xl">
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full">
            <span className="w-2 h-2 bg-brand-accent rounded-full animate-pulse"></span>
            <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Nueva Era Digital Austral</span>
          </div>

          <h1 className="text-6xl md:text-[8rem] font-black text-white tracking-tighter leading-[0.85] mb-10 pointer-events-none">
            <div className="hero-title-line overflow-hidden py-2">
              <span className="inline-block">COMERCIO</span>
            </div>
            <div className="hero-title-line overflow-hidden py-2">
              <span className="inline-block text-brand-accent drop-shadow-[0_0_50px_rgba(255,209,0,0.4)] italic">INTELIGENTE</span>
            </div>
            <div className="hero-title-line overflow-hidden py-2">
              <span className="inline-block">DESDE EL SUR.</span>
            </div>
          </h1>

          <p className="hero-desc text-lg md:text-2xl text-white/80 mb-14 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-lg">
            Digitalizamos tu negocio con la potencia del <span className="text-white font-black">POS</span>, <span className="text-white font-black">E-commerce</span> y <span className="text-white font-black">Facturación SII</span> integrados en una sola plataforma robusta.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              href="/login" 
              className="hero-cta-btn magnetic-btn w-full sm:w-auto px-12 py-7 bg-brand-primary text-white rounded-2xl font-black text-xl hover:bg-brand-700 transition-all shadow-[0_20px_50px_rgba(119,0,204,0.4)] flex items-center justify-center gap-3 group ring-1 ring-white/20"
            >
              Empezar Ahora <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="#pricing" 
              className="hero-cta-btn magnetic-btn w-full sm:w-auto px-12 py-7 bg-white/5 backdrop-blur-2xl border border-white/20 text-white rounded-2xl font-black text-xl hover:bg-white/10 transition-all"
            >
              Ver Planes
            </Link>
          </div>
        </div>

        {/* Floating Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-6">
          <div className="w-[1px] h-24 bg-gradient-to-b from-brand-accent via-brand-accent/50 to-transparent"></div>
          <span className="text-white/30 text-[10px] font-black tracking-[0.5em] uppercase vertical-text">Explorar</span>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="py-40 px-6 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[150px] -mr-96 -mt-96 animate-float-slow"></div>
        <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-[150px] -ml-96 -mb-96 animate-float"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-end justify-between mb-24 gap-12">
            <div className="max-w-3xl">
              <h2 className="text-sm font-black text-brand-primary uppercase tracking-[0.6em] mb-6 block">Tecnología de Punta</h2>
              <h3 className="text-5xl md:text-8xl font-black text-brand-900 tracking-tighter leading-[0.9]">
                Herramientas hechas para el <span className="text-brand-primary">crecimiento.</span>
              </h3>
            </div>
            <p className="text-xl text-gray-500 font-medium max-w-sm leading-relaxed border-l-4 border-brand-accent pl-8">
              Diseñado específicamente para las necesidades del comercio regional en Chile.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((f, i) => (
              <div 
                key={i} 
                className="feature-card group bg-gray-50/50 p-12 rounded-[3rem] border border-gray-100 hover:border-brand-primary/20 transition-all duration-700 hover:shadow-3xl hover:bg-white relative overflow-hidden"
              >
                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 
                  ${f.color === 'purple' ? 'bg-brand-primary/10 text-brand-primary' : 
                    f.color === 'yellow' ? 'bg-brand-accent/10 text-brand-accent-600' : 
                    'bg-blue-500/10 text-blue-600'}`}
                >
                  <f.icon className="w-10 h-10" />
                </div>
                <h4 className="text-3xl font-black text-brand-900 mb-6 tracking-tight">{f.title}</h4>
                <p className="text-gray-500 leading-relaxed font-medium text-lg mb-8">{f.desc}</p>
                
                <Link href="/login" className="flex items-center gap-2 text-brand-primary font-black text-sm uppercase tracking-widest group/link">
                  Saber más <ChevronRight className="w-4 h-4 group-hover/link:translate-x-1 transition-transform" />
                </Link>

                <div className="absolute -bottom-12 -right-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-700 pointer-events-none">
                  <f.icon size={250} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section ref={pricingRef} id="pricing" className="py-40 px-6 bg-brand-900 relative overflow-hidden">
        {/* Background Visuals */}
        <div className="absolute inset-0 z-0 opacity-10">
          <Image 
            src="https://images.unsplash.com/photo-1517783999520-f068d7431a60?auto=format&fit=crop&q=80&w=2070"
            alt="Southern Mountains"
            fill
            className="object-cover grayscale"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-brand-900 via-brand-900/90 to-brand-900"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-sm font-black text-brand-accent uppercase tracking-[0.5em] mb-6">Planes & Precios</h2>
            <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter">Inversión para tu éxito.</h3>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 items-center">
            {plans.map((p, i) => (
              <div 
                key={i} 
                className={`pricing-card relative p-12 rounded-[3.5rem] border transition-all duration-700 hover:-translate-y-6 
                  ${p.highlight 
                    ? 'bg-brand-primary text-white border-white/20 shadow-3xl scale-105 z-20' 
                    : 'bg-white/5 text-white border-white/10 hover:bg-white/10'}`}
              >
                {p.highlight && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-brand-accent text-brand-900 text-[10px] font-black rounded-full uppercase tracking-[0.3em] shadow-2xl">
                    Recomendado
                  </div>
                )}
                <h4 className="text-2xl font-black mb-4 tracking-tight">{p.name}</h4>
                <div className="flex items-baseline gap-2 mb-8">
                  <span className="text-6xl font-black tracking-tighter">{p.price}</span>
                  <span className="text-white/50 text-sm font-bold uppercase tracking-widest">/ mes</span>
                </div>
                <p className="mb-10 text-white/70 font-medium leading-relaxed">{p.desc}</p>
                
                <div className="h-[1px] w-full bg-white/10 mb-10" />
                
                <ul className="space-y-6 mb-12">
                  {p.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-4 text-sm font-bold tracking-tight">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${p.highlight ? 'bg-white text-brand-primary' : 'bg-brand-accent text-brand-900'}`}>
                        <Check size={14} strokeWidth={4} />
                      </div>
                      {feat}
                    </li>
                  ))}
                </ul>

                <Link 
                  href="/login" 
                  className={`block w-full py-6 text-center font-black rounded-[2rem] transition-all text-sm uppercase tracking-[0.2em] shadow-xl
                    ${p.highlight 
                      ? 'bg-white text-brand-primary hover:bg-gray-100' 
                      : 'bg-brand-accent text-brand-900 hover:bg-brand-accent-600'}`}
                >
                  Seleccionar
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-40 px-6 bg-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-sm font-black text-brand-primary uppercase tracking-[0.6em] mb-10">Comienza hoy mismo</h2>
          <h3 className="text-6xl md:text-[9rem] font-black text-brand-900 tracking-tighter leading-[0.8] mb-16">
            EL FUTURO ES <span className="text-brand-primary italic">AHORA.</span>
          </h3>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <Link 
              href="/login" 
              className="magnetic-btn px-16 py-8 bg-brand-primary text-white rounded-[2rem] font-black text-2xl hover:bg-brand-700 transition-all shadow-3xl flex items-center gap-4 group"
            >
              Crear mi Cuenta <ArrowRight className="group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link 
              href="https://wa.me/569XXXXXXXX" 
              className="magnetic-btn px-16 py-8 bg-gray-100 text-brand-900 rounded-[2rem] font-black text-2xl hover:bg-gray-200 transition-all"
            >
              Hablemos
            </Link>
          </div>

          <p className="mt-16 text-gray-400 font-black text-xs uppercase tracking-[0.4em]">
            Ya son más de 500 comercios en el sur de Chile.
          </p>
        </div>
        
        {/* Abstract Background Element */}
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 bg-gray-50 border-t border-gray-100 text-center">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10 mb-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center">
                <Store size={20} className="text-white" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-brand-900">YAHPOS<span className="text-brand-accent">!</span></span>
            </div>
            <div className="flex gap-8">
              {['Privacidad', 'Términos', 'Ayuda', 'Blog'].map(link => (
                <Link key={link} href="#" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-primary transition-colors">{link}</Link>
              ))}
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
            © 2026 YAHPOS! - TECNOLOGÍA AUSTRAL PARA EL MUNDO. MADE WITH ❤️ IN PATAGONIA.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default PlatformLanding

