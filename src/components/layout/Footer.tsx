'use client'

import Link from 'next/link'
import { 
  MapPin, Phone, Mail, Clock, CreditCard, Truck, ShieldCheck, 
  Headphones, Globe, Zap, Star, Crown, ArrowRight
} from 'lucide-react'
import { useSaaS } from '@/providers/SaaSProvider'

// ────────────────────────────────────────────────────
// Footer Plan Plus / Elite
// El negocio tiene su ecommerce público.
// Footer completo + PatagoniaPOS siempre al final.
// ────────────────────────────────────────────────────
function FooterPlus({ storeName }: { storeName: string }) {
  const footerLinks = {
    shop: [
      { href: '/categoria/alimentos', label: 'Alimentos' },
      { href: '/categoria/bebidas', label: 'Bebidas' },
      { href: '/categoria/frescos', label: 'Frescos' },
      { href: '/categoria/limpieza', label: 'Limpieza' },
      { href: '/categoria/hogar', label: 'Hogar' },
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
    <footer className="bg-gray-900 text-white">
      {/* Features Bar */}
      <div className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: 'Envío Rápido', sub: 'Entrega el mismo día' },
              { icon: CreditCard, title: 'Pago Seguro', sub: 'Múltiples métodos' },
              { icon: ShieldCheck, title: 'Garantía', sub: 'Calidad asegurada' },
              { icon: Headphones, title: 'Soporte 24/7', sub: 'Siempre disponibles' },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="w-12 h-12 bg-corporate-blue/20 rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6 text-accent-yellow" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{title}</h4>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand: nombre del negocio + powered by PatagoniaPOS */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-1">
              <div className="w-12 h-12 bg-gradient-to-br from-corporate-blue to-corporate-dark rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-2xl uppercase">{storeName.charAt(0)}</span>
              </div>
              <div>
                <h2 className="font-black text-xl tracking-tighter uppercase leading-tight">{storeName}</h2>
                <p className="text-[10px] font-bold text-corporate-blue uppercase tracking-widest">
                  Powered by PatagoniaPOS
                </p>
              </div>
            </Link>
            <p className="text-gray-400 text-sm mt-4 mb-6 max-w-sm font-medium">
              Tu destino de compras local. Tecnología PatagoniaPOS al servicio de tu negocio.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                <MapPin className="w-4 h-4 text-accent-yellow shrink-0" />
                <span>Castro, Chiloé, Chile</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                <Phone className="w-4 h-4 text-accent-yellow shrink-0" />
                <span>+56 9 1234 5678</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                <Mail className="w-4 h-4 text-accent-yellow shrink-0" />
                <span>contacto@{storeName.toLowerCase().replace(/\s/g, '')}.cl</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-6 opacity-50">Tienda</h3>
            <ul className="space-y-4">
              {footerLinks.shop.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-6 opacity-50">Empresa</h3>
            <ul className="space-y-4">
              {footerLinks.company.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-6 opacity-50">Soporte</h3>
            <ul className="space-y-4 mb-8">
              {footerLinks.support.map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-white transition-colors font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2 text-accent-yellow">
              <Clock className="w-4 h-4" /> Horarios
            </h3>
            <ul className="space-y-2">
              {[
                { day: 'Lun - Vie', hours: '8:00 - 21:00' },
                { day: 'Sábado', hours: '8:00 - 20:00' },
                { day: 'Domingo', hours: '9:00 - 18:00' },
              ].map(item => (
                <li key={item.day} className="text-xs text-gray-400 font-medium">
                  <span className="text-gray-300 font-bold">{item.day}:</span> {item.hours}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom — PatagoniaPOS siempre al final */}
      <div className="border-t border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-black uppercase tracking-widest text-gray-500">
                © 2026 {storeName}. <span className="opacity-60">Todos los derechos reservados.</span>
              </p>
              <p className="text-[10px] font-bold text-corporate-blue tracking-tight">
                © 2026 PatagoniaPOS Tech. Todos los derechos reservados. · patagoniapos.cl
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/terminos" className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Términos</Link>
              <Link href="/privacidad" className="text-xs font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">Privacidad</Link>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sistemas OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ────────────────────────────────────────────────────
// Footer Plan Básico
// Solo el dueño ve esto (no hay ecommerce público).
// 100% publicidad PatagoniaPOS + CTA para subir de plan.
// ────────────────────────────────────────────────────
function FooterBasico() {
  return (
    <footer className="bg-gray-950 text-white border-t border-gray-800/50">
      {/* Upgrade Banner */}
      <div className="border-b border-gray-800/50 bg-gradient-to-r from-corporate-blue/10 to-purple-900/10">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-corporate-blue mb-2">
                ¿Quieres que tus clientes compren online?
              </p>
              <h3 className="text-xl font-black uppercase tracking-tighter">
                Activa tu <span className="text-accent-yellow">Tienda Online</span> con Plan Plus
              </h3>
              <p className="text-gray-400 text-sm mt-1 max-w-lg">
                Con el <strong className="text-white">Plan Plus</strong> tus clientes podrán ver tu catálogo y hacer pedidos desde el celular, sin que tú hagas nada extra.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <div className="p-4 bg-black/40 rounded-2xl border border-fuchsia-500/20 min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-fuchsia-400" />
                  <p className="text-xs font-black uppercase tracking-tight text-fuchsia-400">Plan Plus</p>
                </div>
                <ul className="space-y-1">
                  {['Tienda online', 'Pedidos app', 'Reportes'].map(f => (
                    <li key={f} className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="text-fuchsia-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-black/40 rounded-2xl border border-amber-500/20 min-w-[150px]">
                <div className="flex items-center gap-2 mb-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <p className="text-xs font-black uppercase tracking-tight text-amber-400">Plan Élite</p>
                </div>
                <ul className="space-y-1">
                  {['Sucursales', 'IA + Reportes', 'API externa'].map(f => (
                    <li key={f} className="text-[10px] text-gray-400 flex items-center gap-1">
                      <span className="text-amber-400">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nuestros datos */}
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-corporate-blue rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-lg italic">P</span>
              </div>
              <h2 className="font-black text-lg tracking-tighter uppercase">
                Patagonia<span className="text-accent-yellow italic">POS</span>
              </h2>
            </Link>
            <p className="text-gray-400 text-sm mb-6 max-w-lg font-medium">
              Plataforma de punto de venta e e-commerce para negocios locales de la Patagonia. 
              Tecnología robusta, soporte cercano, precios justos.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Zap, text: 'POS offline siempre activo', color: 'text-blue-400' },
                { icon: Globe, text: 'Ecommerce con Plan Plus', color: 'text-fuchsia-400' },
                { icon: ShieldCheck, text: 'Seguridad AES-256', color: 'text-green-400' },
                { icon: Headphones, text: 'Soporte técnico local', color: 'text-amber-400' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                  <span className="text-xs text-gray-400 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-black text-sm uppercase tracking-widest mb-4 text-gray-500">Contáctanos</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm text-gray-400 font-medium">
                <MapPin className="w-4 h-4 text-corporate-blue shrink-0 mt-0.5" />
                <span>Blanco Encalada 235, Castro, Chiloé</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                <Phone className="w-4 h-4 text-corporate-blue shrink-0" />
                <span>+56 9 1234 5678</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                <Mail className="w-4 h-4 text-corporate-blue shrink-0" />
                <span>hola@patagoniapos.cl</span>
              </div>
              <a 
                href="https://patagoniapos.cl" 
                className="flex items-center gap-2 mt-4 text-xs font-black text-corporate-blue hover:text-blue-400 transition-colors uppercase tracking-widest"
              >
                <Globe className="w-4 h-4" />
                patagoniapos.cl
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-gray-800/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs font-black uppercase tracking-widest text-gray-600">
              © 2026 PatagoniaPOS Tech. <span className="opacity-60">Todos los derechos reservados.</span>
            </p>
            <div className="flex items-center gap-4">
              <Link href="/terminos" className="text-xs font-bold text-gray-600 hover:text-white uppercase tracking-widest transition-colors">Términos</Link>
              <Link href="/privacidad" className="text-xs font-bold text-gray-600 hover:text-white uppercase tracking-widest transition-colors">Privacidad</Link>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Sistemas OK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────
export default function Footer() {
  const { config } = useSaaS()

  if (config.tier === 'basico') {
    return <FooterBasico />
  }

  return <FooterPlus storeName={config.store_name} />
}
