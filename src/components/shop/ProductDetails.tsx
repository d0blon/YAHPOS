'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  ShoppingCart, 
  Heart, 
  Share2, 
  Star, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Minus, 
  Plus, 
  ChevronRight,
  ChevronLeft,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import { RealTimeStockBadge } from '@/components/shop/RealTimeStockBadge'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ShopBackdrop from '@/components/layout/ShopBackdrop'
import ProductCard from '@/components/shop/ProductCard'
import type { Product } from '@/types'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/lib/gsap'

interface ProductDetailsProps {
  product: Product
  relatedProducts: Product[]
}

export default function ProductDetails({ product, relatedProducts }: ProductDetailsProps) {
  ensureGsapRegistered()
  const router = useRouter()
  const { addItem } = useCartStore()
  
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out' } })

    tl.from('.hero-reveal', {
      y: 100,
      opacity: 0,
      duration: 1.2,
      stagger: 0.15,
      delay: 0.2
    })
    .from('.image-reveal', {
      scale: 0.8,
      opacity: 0,
      duration: 1.5,
    }, "-=1")
    .from('.info-card', {
      x: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
    }, "-=1")

    // Floating effect for main image
    gsap.to('.main-product-image', {
      y: -15,
      duration: 3,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    })

  }, { scope: containerRef })

  const handleAddToCart = () => {
    addItem(product, quantity)
    toast.success(`${product.name} agregado`, {
      description: `Se han añadido ${quantity} unidades al carrito.`,
      icon: <ShoppingCart className="w-4 h-4" />,
      className: "glass-card border-brand-accent-500/20"
    })
  }

  const images = product.images?.length ? product.images : [product.image].filter(Boolean) as string[]
  const categoryName = typeof product.category === 'string' ? product.category : product.category?.name || 'Producto'
  const categorySlug = product.categorySlug || ''

  return (
    <>
      <ShopBackdrop />
      <Header />
      
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 w-full h-1 z-[100] bg-white/5">
        <div className="h-full bg-brand-accent-500 w-0" id="scroll-progress" />
      </div>

      <main ref={containerRef} className="min-h-screen pt-32 pb-20 relative z-10 overflow-hidden">
        
        {/* Background Decorative Category Title */}
        <div className="absolute top-40 right-[-5%] pointer-events-none select-none z-0 opacity-[0.03] rotate-90 origin-right">
          <h2 className="text-[20rem] font-black uppercase tracking-tighter whitespace-nowrap leading-none">
            {categoryName}
          </h2>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-12 hero-reveal">
            <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
              <Link href="/" className="hover:text-white transition-colors">INICIO</Link>
              <ChevronRight className="w-3 h-3 text-gray-800" />
              <Link href={`/categoria/${categorySlug}`} className="hover:text-white transition-colors">{categoryName}</Link>
              <ChevronRight className="w-3 h-3 text-gray-800" />
              <span className="text-brand-accent-400">{product.name}</span>
            </nav>

            <Button variant="ghost" onClick={() => router.back()} className="rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white">
              <ChevronLeft className="w-4 h-4 mr-2" /> VOLVER
            </Button>
          </div>

          <div className="grid lg:grid-cols-2 gap-16 xl:gap-32 items-start">
            
            {/* Left Column: Visual Experience */}
            <div className="space-y-8 sticky top-32">
              <div ref={imageContainerRef} className="image-reveal relative aspect-square rounded-[4rem] overflow-hidden glass-card border border-white/10 group p-12">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.15),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                
                <div className="main-product-image w-full h-full relative z-10 flex items-center justify-center">
                  <img 
                    src={images[selectedImage] || product.image} 
                    alt={product.name} 
                    className="w-full h-full object-contain drop-shadow-[0_40px_80px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-1000" 
                  />
                </div>

                {/* Floating Tags */}
                <div className="absolute top-10 left-10 flex flex-col gap-3 z-20">
                  {product.discount && product.discount > 0 && (
                    <div className="bg-red-500 text-white font-black px-5 py-2 rounded-2xl text-xl shadow-2xl shadow-red-500/40">
                      -{product.discount}%
                    </div>
                  )}
                  {product.isExempt && (
                    <div className="bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 text-emerald-400 font-black px-4 py-2 rounded-xl text-[10px] tracking-widest uppercase">
                      PRODUCTO EXENTO
                    </div>
                  )}
                  <div className="bg-brand-accent-600/20 backdrop-blur-md border border-brand-accent-500/30 text-brand-accent-400 font-black px-4 py-2 rounded-xl text-[10px] tracking-widest uppercase">
                    SELECCIÓN ELITE
                  </div>
                </div>

                <div className="absolute bottom-10 right-10 z-20">
                   <div className="w-16 h-16 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/40 group-hover:text-white transition-colors cursor-pointer hover:scale-110 transition-transform">
                      <Plus className="w-8 h-8" />
                   </div>
                </div>
              </div>

              {/* Thumbnails Strip */}
              {images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {images.map((img, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`hero-reveal relative w-24 h-24 rounded-3xl overflow-hidden border-2 transition-all duration-500 shrink-0 ${selectedImage === idx ? 'border-brand-accent-500 scale-105 bg-brand-accent-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'}`}
                    >
                      <img src={img} alt={`${product.name} ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right Column: Narrative & Action */}
            <div ref={contentRef} className="space-y-12">
              <div className="space-y-6">
                <div className="hero-reveal inline-flex items-center gap-3">
                  <span className="w-12 h-[2px] bg-brand-accent-500/40" />
                  <span className="text-[10px] font-black text-brand-accent-400 uppercase tracking-[0.4em]">{categoryName}</span>
                </div>
                
                <h1 className="hero-reveal text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9] mb-8">
                  {product.name}
                </h1>

                <div className="hero-reveal flex items-center gap-8">
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Precio Elite</span>
                    <div className="flex items-baseline gap-4">
                      <span className="text-5xl font-black text-white tracking-tighter">{formatPrice(product.price)}</span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <span className="text-2xl text-gray-600 font-bold line-through tracking-tighter italic">
                          {formatPrice(product.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-12 w-px bg-white/10" />
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Valoración</span>
                    <div className="flex items-center gap-2">
                       <Star className="w-6 h-6 fill-brand-accent-500 text-brand-accent-500" />
                       <span className="text-2xl font-black text-white">4.9</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-reveal">
                <p className="text-xl text-gray-400 leading-relaxed font-medium max-w-xl">
                  {product.description || "Un producto seleccionado cuidadosamente para garantizar la máxima calidad y satisfacción. Experiencia premium en cada detalle."}
                </p>
              </div>

              {/* Action Board */}
              <div className="hero-reveal glass-card p-10 rounded-[3rem] border border-white/10 space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <ShoppingCart className="w-32 h-32 text-brand-accent-500" />
                </div>

                <div className="relative z-10 space-y-8">
                   <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex items-center gap-2 bg-black/40 p-2 rounded-[2rem] border border-white/5 w-fit">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                          className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-all active:scale-90"
                        >
                          <Minus className="w-6 h-6" />
                        </button>
                        <span className="w-16 text-center font-black text-3xl text-white tracking-tighter">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(quantity + 1)} 
                          className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-all active:scale-90"
                        >
                          <Plus className="w-6 h-6" />
                        </button>
                      </div>

                      <Button 
                        onClick={handleAddToCart}
                        className="flex-1 h-[84px] bg-white text-black hover:bg-brand-accent-50 transition-all rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm group"
                      >
                        <ShoppingCart className="w-5 h-5 mr-3 group-hover:rotate-[-10deg] transition-transform" />
                        Agregar al Carrito
                        <ArrowRight className="w-5 h-5 ml-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                      </Button>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <Button variant="outline" className="h-16 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px]">
                        <Heart className="w-4 h-4 mr-2" /> Guardar Favorito
                      </Button>
                      <Button variant="outline" className="h-16 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-[10px]">
                        <Share2 className="w-4 h-4 mr-2" /> Compartir Producto
                      </Button>
                   </div>
                </div>
              </div>

              {/* Guarantees Grid */}
              <div className="grid grid-cols-3 gap-6 hero-reveal">
                 {[
                   { icon: Truck, label: "Envío Prioritario", sub: "24-48 Horas" },
                   { icon: ShieldCheck, label: "Garantía Total", sub: "Calidad Elite" },
                   { icon: RotateCcw, label: "Devolución", sub: "30 Días" }
                 ].map((item, i) => (
                   <div key={i} className="info-card flex flex-col items-center text-center gap-3 group">
                      <div className="w-14 h-14 rounded-2xl bg-brand-accent-600/10 border border-brand-accent-500/20 flex items-center justify-center text-brand-accent-400 group-hover:bg-brand-accent-600 group-hover:text-white transition-all duration-500">
                        <item.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">{item.label}</p>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mt-1">{item.sub}</p>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Specs / Meta */}
              <div className="pt-8 border-t border-white/10 grid grid-cols-2 md:grid-cols-3 gap-8 hero-reveal">
                 <div>
                    <span className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Código SKU</span>
                    <span className="text-sm font-bold text-white tracking-widest">ELITE-{product.id.substring(0, 8).toUpperCase()}</span>
                 </div>
                 <div>
                    <span className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Disponibilidad</span>
                    {product.isRealtimeTracked ? (
                      <RealTimeStockBadge 
                        productId={product.id}
                        initialStock={product.stock}
                        lowStockThreshold={product.lowStockThreshold || 5}
                        isRealtimeTracked={true}
                      />
                    ) : (
                      <span className="flex items-center gap-2 text-sm font-bold text-green-400">
                         <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                         {product.stock > 0 ? 'EN STOCK' : 'AGOTADO'}
                      </span>
                    )}
                 </div>
                 <div>
                    <span className="block text-[10px] font-black text-gray-600 uppercase tracking-widest mb-2">Unidad</span>
                    <span className="text-sm font-bold text-white">Venta por {product.unit || 'unidad'}</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Related Collections Section */}
          {relatedProducts.length > 0 && (
            <div className="mt-40 space-y-16">
              <div className="flex items-center justify-between">
                <div className="space-y-4">
                  <Badge variant="outline" className="border-brand-accent-500/30 text-brand-accent-400 font-black px-4 py-1 text-[10px] tracking-widest uppercase">
                    Te puede interesar
                  </Badge>
                  <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Productos Relacionados</h2>
                </div>
                <Link href={`/categoria/${categorySlug}`}>
                   <Button variant="ghost" className="text-brand-accent-400 font-black uppercase tracking-widest text-xs hover:text-white">
                      Explorar Todo <ChevronRight className="w-4 h-4 ml-2" />
                   </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                 {relatedProducts.map(p => (
                   <ProductCard key={p.id} product={p} />
                 ))}
              </div>
            </div>
          )}

          {/* Luxury Banner */}
          <div className="mt-40 rounded-[4rem] overflow-hidden relative h-[400px] group">
             <img 
               src="/premium_offer_bg_1777248447917.png" 
               alt="Luxury Experience" 
               className="w-full h-full object-cover transition-transform duration-[3s] group-hover:scale-110"
             />
             <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent p-16 flex flex-col justify-center">
                <h3 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 max-w-2xl leading-[0.9]">
                   EXPERIMENTA LA <br />
                   DIFERENCIA <span className="text-brand-accent-500">ELITE</span>.
                </h3>
                <p className="text-xl text-white/70 max-w-md font-medium mb-10 leading-relaxed">
                   En YAHPOS! elevamos el estándar de tus compras diarias con una selección inigualable.
                </p>
                <Link href="/">
                   <Button className="w-fit h-16 px-12 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-xs hover:scale-105 transition-transform">
                      Descubrir Más
                   </Button>
                </Link>
             </div>
          </div>

        </div>
      </main>

      <Footer />
    </>
  )
}
