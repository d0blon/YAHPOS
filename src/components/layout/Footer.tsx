'use client'

import Link from 'next/link'
import Image from 'next/image'
import { 
  MapPin, Mail, Clock, CreditCard, Truck, ShieldCheck, 
  Headphones, Zap, Star, Crown, ArrowRight
} from 'lucide-react'
import { useSaaS } from '@/providers/SaaSProvider'
import { useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered, toArray } from '@/lib/gsap'
import { getRootOriginSafe } from '@/lib/config/root-origin'

function getSupportEmail(): string | null {
  const configured = process.env.NEXT_PUBLIC_SUPPORT_EMAIL
  if (typeof configured !== 'string') return null
  const email = configured.trim()
  return email.length > 0 ? email : null
}

// ────────────────────────────────────────────────────
// Footer Premium (Archipielago / Patagonia)
// El negocio tiene su ecommerce público.
// Footer completo + YAHPOS! siempre al final.
// ────────────────────────────────────────────────────
function FooterPremium({ storeName }: { storeName: string }) {
  ensureGsapRegistered()
  const root = useRef<HTMLElement>(null)
  const supportEmail = getSupportEmail()
  const footerLinks = {
    shop: [
      { href: '/productos?categoria=alimentos', label: 'Alimentos' },
      { href: '/productos?categoria=bebidas', label: 'Bebidas' },
      { href: '/productos?categoria=frescos', label: 'Frescos' },
      { href: '/productos?categoria=limpieza', label: 'Limpieza' },
      { href: '/productos?categoria=hogar', label: 'Hogar' },
    ],
    company: [
      { href: '/nosotros', label: 'Sobre Nosotros' },
      { href: '/contacto', label: 'Contacto' },
      { href: '/trabaja-con-nosotros', label: 'Trabaja con Nosotros' },
    ],
    support: [
      { href: '/ayuda', label: 'Centro de Ayuda' },
      { href: '/envios', label: 'Envíos y Entregas' },
      { href: '/devoluciones', label: 'Devoluciones' },
      { href: '/terminos', label: 'Términos' },
    ],
  }

  return (
    <footer ref={root} className="bg-background text-white relative overflow-hidden pt-20 pb-10 md:pb-6 border-t border-white/5">
      {/* Dynamic Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-accent-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px]" />
      </div>

      <FooterFX scopeRef={root} />

      {/* Features Bar - Premium Glass Cards */}
      <div className="container mx-auto px-4 mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Truck, title: 'ENVÍO ELITE', sub: 'Mismo día garantizado', color: 'text-brand-accent-400' },
            { icon: CreditCard, title: 'PAGO BLINDADO', sub: 'Seguridad nivel bancario', color: 'text-brand-400' },
            { icon: ShieldCheck, title: 'GARANTÍA TOTAL', sub: 'Satisfacción certificada', color: 'text-emerald-400' },
            { icon: Headphones, title: 'SOPORTE 24/7', sub: 'Línea prioritaria miembros', color: 'text-amber-400' },
          ].map(({ icon: Icon, title, sub, color }) => (
            <div 
              key={title} 
              className="footer-feature premium-card p-8 rounded-[2rem] group"
            >
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5">
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] mb-2 text-white/90">{title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed font-medium">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-20">
          {/* Brand & Social */}
          <div className="lg:col-span-4 footer-col">
            <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
              <div className="w-14 h-14 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center p-2 group-hover:rotate-6 transition-all duration-500 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                <Image 
                  src="/logos/yahpos_logo_master_dark.svg" 
                  alt="YAHPOS!" 
                  width={40} 
                  height={40} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h2 className="font-black text-2xl tracking-tighter uppercase leading-none mb-1">{storeName}</h2>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Premium Store</p>
                </div>
              </div>
            </Link>
            
            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-sm">
              Redefiniendo el e-commerce local con tecnología de vanguardia y atención personalizada.
            </p>

            <div className="flex gap-4">
              {['fb', 'ig', 'tw', 'wa'].map((social) => (
                <div key={social} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-all cursor-pointer">
                  <span className="text-[10px] font-black uppercase">{social}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Links Grid */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">
            <div className="footer-col">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-gray-500">Explorar</h3>
              <ul className="space-y-4">
                {footerLinks.shop.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                      <span className="w-0 group-hover:w-2 h-[1px] bg-white transition-all duration-300" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-col">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-gray-500">Empresa</h3>
              <ul className="space-y-4">
                {footerLinks.company.map(link => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-gray-400 hover:text-white transition-all duration-300 flex items-center gap-2 group">
                      <span className="w-0 group-hover:w-2 h-[1px] bg-white transition-all duration-300" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer-col col-span-2 md:col-span-1">
              <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-8 text-gray-500">Contacto</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Avenida Costanera 1234, <br />Castro, Chiloé
                  </p>
                </div>
                {supportEmail !== null && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-400">
                      {supportEmail}
                    </p>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Lun - Sab</p>
                    <p className="text-sm font-bold">09:00 - 20:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-white/5 footer-bottom">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.3em] mb-2">
                © 2026 {storeName} / Todos los derechos reservados
              </p>
              <p className="text-[10px] font-black text-brand-accent-500 uppercase tracking-widest flex items-center gap-2 justify-center md:justify-start">
                <Zap className="w-3 h-3" /> Powered by YAHPOS! Technology
              </p>
            </div>
            
            <div className="flex items-center gap-8">
              <Link href="/terminos" className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Legal</Link>
              <Link href="/privacidad" className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Privacidad</Link>
              <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Network Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}


// ────────────────────────────────────────────────────
// Footer Plan Austral
// Solo el dueño ve esto (no hay ecommerce público).
// 100% publicidad YAHPOS! + CTA para subir de plan.
// ────────────────────────────────────────────────────
function FooterAustral() {
  ensureGsapRegistered()
  const root = useRef<HTMLElement>(null)
  const rootOrigin = getRootOriginSafe()
  return (
    <footer ref={root} className="bg-background text-white relative overflow-hidden py-20 border-t border-white/5">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-accent-600/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[140px]" />
      </div>

      <FooterFX scopeRef={root} />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto glass-card p-8 md:p-16 rounded-[40px] bg-gradient-to-br from-white/5 to-transparent border border-white/10 text-center">
          <div className="inline-flex items-center gap-3 mb-8 px-6 py-2 rounded-full bg-brand-accent-500/10 border border-brand-accent-500/20">
            <Zap className="w-4 h-4 text-brand-accent-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-accent-400">Unlock Full Potential</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-tight">
            ¿Listo para llevar tu <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 via-brand-accent to-brand-600">negocio al futuro?</span>
          </h2>
          
          <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
            Activa tu tienda online hoy mismo. Sincronización automática de stock, pagos integrados y una experiencia de usuario que enamora.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-lg mx-auto">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
              <Star className="w-8 h-8 text-yellow-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg mb-1">Plan Archipiélago</h3>
              <p className="text-sm text-gray-500">Ecommerce Completo</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
              <Crown className="w-8 h-8 text-brand-400 mb-4 mx-auto group-hover:scale-110 transition-transform" />
              <h3 className="font-bold text-lg mb-1">Plan Patagonia</h3>
              <p className="text-sm text-gray-500">Multisucursal & IA</p>
            </div>
          </div>

          {rootOrigin !== null && (
            <a 
              href={rootOrigin} 
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-black rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition-all duration-500 shadow-[0_0_50px_rgba(255,255,255,0.2)]"
            >
              Ver Planes & Precios <ArrowRight className="w-5 h-5" />
            </a>
          )}
        </div>

        <div className="mt-20 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 pt-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center p-1.5 shadow-lg shadow-primary/20">
              <Image 
                src="/logos/yahpos_logo_master_dark.svg" 
                alt="YAHPOS!" 
                width={28} 
                height={28} 
                className="w-full h-full object-contain invert brightness-0"
              />
            </div>
            <div>
              <p className="font-black text-sm tracking-tighter uppercase leading-none">YAHPOS!</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Advanced SaaS Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <Link href="/terminos" className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Términos</Link>
            <Link href="/privacidad" className="text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Privacidad</Link>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">© 2026 YAHPOS! Tech</p>
          </div>
        </div>
      </div>
    </footer>
  )
}


function FooterFX({ scopeRef }: { scopeRef: RefObject<HTMLElement | null> }) {
  ensureGsapRegistered()
  useGSAP(() => {
    const scope = scopeRef.current
    if (!scope) return
    const features = toArray('.footer-feature', scope)
    const cols = toArray('.footer-col', scope)
    const bottom = toArray('.footer-bottom', scope)

    if (features.length) {
      gsap.from(features, {
        y: 18,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power2.out',
        scrollTrigger: { trigger: scope, start: 'top 92%' },
      })
    }
    if (cols.length) {
      gsap.from(cols, {
        y: 26,
        opacity: 0,
        duration: 0.7,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: scope, start: 'top 88%' },
        clearProps: 'transform,opacity',
      })
    }
    if (bottom.length) {
      gsap.from(bottom, {
        y: 10,
        opacity: 0,
        duration: 0.45,
        ease: 'power2.out',
        scrollTrigger: { trigger: scope, start: 'bottom 95%' },
      })
    }
  }, { scope: scopeRef })

  return null
}

// ────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────
export default function Footer() {
  const { config } = useSaaS()

  if (config.tier === 'austral') {
    return <FooterAustral />
  }
  
  return <FooterPremium storeName={config.store_name} />
}
