import Link from 'next/link';
import { ArrowRight, Clock, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getProducts } from '@/lib/api'

export default async function OffersBanner() {
  const products = await getProducts();
  const maxDiscount = products.reduce((max, p) => Math.max(max, p.discount || 0), 0);
  const displayDiscount = maxDiscount > 0 ? maxDiscount : 50; // fallback

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Main Offer Card */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-corporate-blue via-corporate-dark to-corporate-darker p-8 md:p-12">
            {/* Background Pattern */}
            <div className="absolute inset-0 dot-pattern opacity-20" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-accent-yellow/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
            
            {/* Content */}
            <div className="relative z-10">
              <Badge className="bg-accent-yellow text-corporate-dark font-bold mb-4">
                <Tag className="w-3 h-3 mr-1" />
                OFERTA ESPECIAL
              </Badge>
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Hasta {displayDiscount}% de Descuento
              </h3>
              <p className="text-white/80 mb-6 max-w-md">
                Aprovecha nuestras ofertas especiales en productos seleccionados. 
                ¡Stock limitado, no te lo pierdas!
              </p>
              
              {/* Countdown */}
              <div className="flex items-center gap-2 text-white/90 mb-8">
                <Clock className="w-5 h-5" />
                <span className="text-sm">La oferta termina en:</span>
                <div className="flex gap-2">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="font-bold">23</span>
                    <span className="text-xs ml-1">h</span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="font-bold">45</span>
                    <span className="text-xs ml-1">m</span>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="font-bold">12</span>
                    <span className="text-xs ml-1">s</span>
                  </div>
                </div>
              </div>

              <Link href="/ofertas">
                <Button className="glass-button-accent">
                  Ver Ofertas
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Secondary Cards */}
          <div className="grid gap-6">
            {/* Free Shipping Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent-yellow to-accent-gold p-6 md:p-8 flex items-center">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/20 rounded-full blur-2xl" />
              
              <div className="relative z-10 flex-1">
                <Badge className="bg-corporate-blue text-white mb-3">
                  ENVÍO GRATIS
                </Badge>
                <h3 className="text-2xl font-bold text-corporate-dark mb-2">
                  En compras sobre $30.000
                </h3>
                <p className="text-corporate-dark/70 text-sm mb-4">
                  Recibe tus productos en la puerta de tu casa sin costo adicional.
                </p>
                <Link href="/envios">
                  <Button variant="outline" className="border-corporate-dark text-corporate-dark hover:bg-corporate-dark hover:text-white">
                    Más información
                  </Button>
                </Link>
              </div>
              
              <div className="hidden md:block w-24 h-24 bg-white/30 rounded-2xl flex items-center justify-center">
                <span className="text-4xl font-bold text-corporate-dark">$0</span>
              </div>
            </div>

            {/* New Products Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 p-6 md:p-8 flex items-center">
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              
              <div className="relative z-10 flex-1">
                <Badge className="bg-white text-green-600 mb-3">
                  NUEVOS PRODUCTOS
                </Badge>
                <h3 className="text-2xl font-bold text-white mb-2">
                  Descubre lo nuevo
                </h3>
                <p className="text-white/80 text-sm mb-4">
                  Cada semana traemos nuevos productos para ti.
                </p>
                <Link href="/nuevos">
                  <Button variant="outline" className="border-white text-white hover:bg-white hover:text-green-600">
                    Explorar
                  </Button>
                </Link>
              </div>
              
              <div className="hidden md:block">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✨</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
