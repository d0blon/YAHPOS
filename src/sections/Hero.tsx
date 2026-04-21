import Link from 'next/link';
import { ArrowRight, ShoppingBag, Truck, Percent, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProducts } from '@/lib/api'

const features = [
  { icon: Truck, label: 'Envío Gratis', sublabel: 'En compras +$30.000' },
  { icon: Percent, label: 'Mejores Precios', sublabel: 'Ofertas todos los días' },
  { icon: Clock, label: 'Entrega Rápida', sublabel: 'El mismo día' },
  { icon: ShoppingBag, label: 'Productos Frescos', sublabel: 'Calidad garantizada' },
]

export default async function Hero() {
  const products = await getProducts();
  const totalProducts = products.length;
  
  const displayTotal = totalProducts;
  const countAlimentos = products.filter(p => (p.category?.slug || p.category) === 'alimentos').length;
  const countBebidas = products.filter(p => (p.category?.slug || p.category) === 'bebidas').length;
  const countFrescos = products.filter(p => (p.category?.slug || p.category) === 'frescos').length;

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 hero-gradient" />
      
      {/* Mesh Background */}
      <div className="absolute inset-0 mesh-bg" />
      
      {/* Dot Pattern */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      
      {/* Floating Shapes */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent-yellow/10 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-corporate-blue/20 rounded-full blur-3xl animate-float-slow animation-delay-1000" />
      <div className="absolute top-1/2 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl animate-float" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-accent-yellow rounded-full animate-pulse" />
              <span className="text-sm text-white/90">Nuevo en Castro, Chiloé</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight animate-slide-up">
              Tu Supermercado
              <span className="block text-accent-yellow">Online de Confianza</span>
            </h1>

            {/* Description */}
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0 animate-slide-up animation-delay-100">
              Compra desde la comodidad de tu hogar. Productos frescos, precios competitivos 
              y entrega el mismo día en Castro y alrededores.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12 animate-slide-up animation-delay-200">
              <Link href="/categoria/alimentos">
                <Button size="lg" className="glass-button-accent text-base px-8">
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Comprar Ahora
                </Button>
              </Link>
              <Link href="/ofertas">
                <Button size="lg" variant="glass" className="text-base px-8">
                  Ver Ofertas
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-slide-up animation-delay-300">
              {features.map((feature, index) => (
                <div 
                  key={feature.label}
                  className="glass-card p-4 text-center hover:bg-white/20 transition-all duration-300 hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <feature.icon className="w-6 h-6 text-accent-yellow mx-auto mb-2" />
                  <p className="text-sm font-semibold text-white">{feature.label}</p>
                  <p className="text-xs text-white/60">{feature.sublabel}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Glass Cards */}
          <div className="hidden lg:block relative">
            {/* Main Glass Card */}
            <div className="glass-card p-8 max-w-md mx-auto transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-accent-yellow rounded-2xl flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 text-corporate-dark" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">{displayTotal}</h3>
                  <p className="text-white/70">Productos disponibles</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/80">Alimentos</span>
                  <span className="text-accent-yellow font-semibold">{countAlimentos}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/80">Bebidas</span>
                  <span className="text-accent-yellow font-semibold">{countBebidas}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <span className="text-white/80">Frescos</span>
                  <span className="text-accent-yellow font-semibold">{countFrescos}</span>
                </div>
              </div>
            </div>

            {/* Floating Card 1 */}
            <div className="absolute -top-8 -right-8 glass-card p-4 animate-float">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Percent className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Hasta 30% OFF</p>
                  <p className="text-xs text-white/60">En productos seleccionados</p>
                </div>
              </div>
            </div>

            {/* Floating Card 2 */}
            <div className="absolute -bottom-4 -left-8 glass-card p-4 animate-float animation-delay-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-corporate-blue rounded-full flex items-center justify-center">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Envío Gratis</p>
                  <p className="text-xs text-white/60">En compras sobre $30.000</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            fill="white" 
            className="dark:fill-gray-900"
          />
        </svg>
      </div>
    </section>
  )
}
