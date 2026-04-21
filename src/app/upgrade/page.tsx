'use client'

import React from 'react'
import Link from 'next/link'
import { Rocket, Store, ShieldCheck, Zap, ArrowRight, LayoutDashboard } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-corporate-blue/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      
      <div className="max-w-3xl w-full z-10 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-8 animate-bounce">
          <Zap className="w-4 h-4 fill-current" />
          <span>POTENCIA TU NEGOCIO</span>
        </div>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
          ¿Quieres tu <span className="text-corporate-blue">Tienda Online?</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed">
          Actualmente estás usando el <span className="text-white font-bold">Plan Básico</span>. 
          Activa el <span className="text-blue-400 font-bold">Plan Plus</span> para habilitar tu catálogo público, 
          recibir pedidos online y procesar pagos automáticos.
        </p>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12 text-left">
          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl hover:border-blue-500/50 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Store className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Seguir Operando</h3>
            <p className="text-gray-400 text-sm mb-6">Continúa usando el punto de venta (POS) para tus ventas presenciales.</p>
            <Button asChild className="w-full bg-white/10 hover:bg-white/20 text-white border-0 py-6 rounded-2xl">
              <Link href="/pos">
                <LayoutDashboard className="w-4 h-4 mr-2" />
                Ir al POS
              </Link>
            </Button>
          </div>

          <div className="p-8 rounded-3xl bg-gradient-to-br from-corporate-blue/20 to-blue-600/5 border border-blue-500/30 backdrop-blur-xl hover:border-blue-500 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Rocket className="w-24 h-24 rotate-12" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Activar Plan Plus</h3>
            <p className="text-gray-400 text-sm mb-6">Desbloquea el Ecommerce, Gestión de Pedidos y Branding Personalizado.</p>
            <Button className="w-full bg-corporate-blue hover:bg-blue-600 text-white shadow-xl shadow-blue-500/25 py-6 rounded-2xl border-0">
              Ver Planes de Upgrade
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Benefits Horizontal */}
        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500 font-medium border-t border-white/5 pt-12">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Configuración Instantánea</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Soporte 24/7</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Sin Comisiones de Venta</span>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-20 text-gray-600 text-xs uppercase tracking-widest font-bold">
        PatagoniaPOS SaaS Platform &copy; 2026
      </div>
    </div>
  )
}
