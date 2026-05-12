'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Rocket, Store, ShieldCheck, Zap, ArrowRight, LayoutDashboard, CheckCircle2, Star, Trophy, Globe, ReceiptText, Boxes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { getSubscriptionTiers, SubscriptionTier } from '@/lib/subscriptions'

export default function UpgradePage() {
  const { user } = useAuthStore()
  const [tiers, setTiers] = useState<SubscriptionTier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadTiers() {
      const data = await getSubscriptionTiers()
      setTiers(data)
      setLoading(false)
    }
    loadTiers()
  }, [])

  const currentTierSlug = user?.role === 'customer' ? null : (user as any)?.tier || 'austral'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-corporate-blue"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center p-6 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-corporate-blue/20 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      
      <div className="max-w-6xl w-full z-10 text-center mt-12">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold mb-8">
          <Zap className="w-4 h-4 fill-current" />
          <span>PLANES DE SUSCRIPCIÓN 2026</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tighter bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent">
          Escala tu negocio con <span className="text-corporate-blue">YAHPOS!</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl mb-16 max-w-2xl mx-auto leading-relaxed">
          Elige el plan que mejor se adapte al tamaño de tu operación. 
          Desde pequeños comercios hasta grandes cadenas regionales.
        </p>

        {/* Tiers Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {tiers.map((tier) => (
            <Card 
              key={tier.id}
              className={`relative p-8 rounded-3xl border transition-all duration-500 group overflow-hidden ${
                tier.slug === 'archipielago' 
                  ? 'bg-gradient-to-b from-blue-600/20 to-transparent border-blue-500/50 scale-105 shadow-2xl shadow-blue-500/10' 
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              {tier.slug === 'archipielago' && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-blue-500 text-white border-0">RECOMENDADO</Badge>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
                  {tier.slug === 'austral' && <Store className="w-6 h-6 text-gray-400" />}
                  {tier.slug === 'archipielago' && <Rocket className="w-6 h-6 text-blue-400" />}
                  {tier.slug === 'patagonia' && <Trophy className="w-6 h-6 text-yellow-500" />}
                  {tier.name}
                </h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-black">${tier.price.toLocaleString('es-CL')}</span>
                  <span className="text-gray-500 text-sm font-medium">/ mes</span>
                </div>
              </div>

              <div className="space-y-4 text-left mb-8">
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={`w-5 h-5 ${tier.features.sii ? 'text-green-500' : 'text-gray-600'}`} />
                  <span className={tier.features.sii ? 'text-gray-200' : 'text-gray-600'}>Boleta Electrónica SII</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={`w-5 h-5 ${tier.features.inventory ? 'text-green-500' : 'text-gray-600'}`} />
                  <span className={tier.features.inventory ? 'text-gray-200' : 'text-gray-600'}>Gestión de Inventario</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className={`w-5 h-5 ${tier.features.ecommerce ? 'text-green-500' : 'text-gray-600'}`} />
                  <span className={tier.features.ecommerce ? 'text-gray-200' : 'text-gray-600'}>E-commerce Online</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Boxes className={`w-5 h-5 ${tier.limit_products ? 'text-blue-500' : 'text-yellow-500'}`} />
                  <span className="text-gray-200">
                    {tier.limit_products ? `Hasta ${tier.limit_products} productos` : 'Productos ilimitados'}
                  </span>
                </div>
                {tier.slug === 'patagonia' && (
                  <>
                    <div className="flex items-center gap-3 text-sm">
                      <Globe className="w-5 h-5 text-yellow-500" />
                      <span className="text-gray-200">Multi-sucursal</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <ReceiptText className="w-5 h-5 text-yellow-500" />
                      <span className="text-gray-200">Factura Electrónica & Guías</span>
                    </div>
                  </>
                )}
              </div>

              <Button 
                className={`w-full py-6 rounded-2xl font-bold transition-all ${
                  tier.slug === currentTierSlug
                    ? 'bg-white/10 text-white border border-white/20 cursor-default'
                    : tier.slug === 'archipielago'
                      ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-white text-black hover:bg-gray-200'
                }`}
                disabled={tier.slug === currentTierSlug}
              >
                {tier.slug === currentTierSlug ? 'Tu Plan Actual' : 'Seleccionar Plan'}
              </Button>
            </Card>
          ))}
        </div>

        {/* Benefits Horizontal */}
        <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500 font-medium border-t border-white/5 pt-12 max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Configuración en 5 minutos</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Actualizaciones SII de por vida</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-500" />
            <span>Sin contratos de permanencia</span>
          </div>
        </div>
      </div>

      {/* Footer hint */}
      <div className="mt-20 mb-10 text-gray-600 text-xs uppercase tracking-widest font-bold">
        YAHPOS! SaaS Platform &copy; 2026
      </div>
    </div>
  )
}
