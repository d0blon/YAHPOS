'use client'

import Link from 'next/link'
import { Monitor, Star, Crown, ArrowRight, Lock, Zap, Globe, BarChart3, Truck, Building2 } from 'lucide-react'

export default function EcommerceUpgradePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-16">
      
      {/* YAHPOS! badge */}
      <div className="flex items-center gap-2 mb-8 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full">
        <div className="w-6 h-6 bg-brand-primary rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs italic">P</span>
        </div>
        <span className="text-xs font-black text-brand-primary uppercase tracking-widest">YAHPOS!</span>
      </div>

      {/* Lock icon */}
      <div className="w-24 h-24 bg-gray-800 border border-gray-700 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(59,130,246,0.1)]">
        <Lock className="w-12 h-12 text-gray-500" />
      </div>

      {/* Heading */}
      <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-center mb-4 max-w-2xl">
        La tienda online no está{' '}
        <span className="text-brand-primary">activada</span>
      </h1>
      <p className="text-gray-400 text-center max-w-lg mb-12 text-lg font-medium">
        Este negocio opera con el <strong className="text-white">Plan Austral</strong>. Para tener un ecommerce público, catálogo online y recibir pedidos, necesita el Plan Archipiélago.
      </p>

      {/* Plans comparison */}
      <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
        {/* Plan Archipiélago */}
        <div className="p-6 bg-brand-accent-500/5 border border-brand-accent-500/30 rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-brand-accent-400" />
            <h3 className="font-black uppercase tracking-widest text-sm text-brand-accent-400">Plan Archipiélago</h3>
          </div>
          <ul className="space-y-3">
            {[
              { icon: Globe, text: 'Tienda online activada' },
              { icon: Truck, text: 'Pedidos y despacho' },
              { icon: BarChart3, text: 'Reportes de ventas' },
              { icon: Zap, text: 'Todo del Plan Austral' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                <Icon className="w-4 h-4 text-brand-accent-400 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Plan Patagonia */}
        <div className="p-6 bg-amber-500/5 border border-amber-500/30 rounded-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-5 h-5 text-amber-400" />
            <h3 className="font-black uppercase tracking-widest text-sm text-amber-400">Plan Patagonia</h3>
          </div>
          <ul className="space-y-3">
            {[
              { icon: Building2, text: 'Múltiples sucursales' },
              { icon: BarChart3, text: 'Reportes con IA' },
              { icon: Globe, text: 'API externa + Webhooks' },
              { icon: Zap, text: 'Todo del Plan Archipiélago' },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                <Icon className="w-4 h-4 text-amber-400 shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        {/* CTA principal — ir al POS */}
        <Link
          href="/pos"
          className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-brand-primary hover:bg-brand-accent-700 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all duration-200 shadow-[0_8px_20px_rgba(0,51,153,0.4)] hover:shadow-[0_12px_28px_rgba(0,51,153,0.5)] hover:-translate-y-0.5 group"
        >
          <Monitor className="w-5 h-5 transition-transform group-hover:rotate-12" />
          Ir al POS
        </Link>

        {/* CTA secundario — contactar para upgrade */}
        <a
          href="mailto:hola@yahpos.cl?subject=Quiero%20activar%20el%20Plan%20Archipiélago"
          className="flex-1 flex items-center justify-center gap-3 py-4 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black uppercase tracking-widest text-sm rounded-2xl transition-all duration-200 group"
        >
          Activar Plan Archipiélago
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </a>
      </div>

      {/* Footer */}
      <p className="mt-12 text-xs text-gray-600 font-medium">
        © 2026 YAHPOS! Tech · yahpos.cl · +56 9 1234 5678
      </p>
    </div>
  )
}
