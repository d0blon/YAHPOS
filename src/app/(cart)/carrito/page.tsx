'use client'

import React, { useState, useRef } from 'react'
import Link from 'next/link';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowLeft, 
  Package,
  Truck,
  Tag,
  AlertCircle,
  CreditCard,
  ArrowRight,
  ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ShopBackdrop from '@/components/layout/ShopBackdrop'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered, toArray } from '@/lib/gsap'

export default function CartPage() {
  ensureGsapRegistered()
  const { items, totalItems, subtotal, discount, shipping, total, updateQuantity, removeItem, clearCart } = useCartStore()
  const [promoCode, setPromoCode] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setIsHydrated(true)
  }, [])

  useGSAP(() => {
    if (!isHydrated || items.length === 0) return
    
    const elements = toArray('.cart-item', containerRef.current)
    const summary = containerRef.current?.querySelector('.cart-summary')
    
    gsap.from(elements, {
      x: -30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power4.out'
    })

    if (summary) {
      gsap.from(summary, {
        x: 30,
        opacity: 0,
        duration: 0.8,
        ease: 'power4.out',
        delay: 0.2
      })
    }
  }, [isHydrated, items.length])

  const handleApplyPromo = () => {
    if (promoCode.trim()) {
      toast.info('Código de descuento no válido')
    }
  }

  if (!isHydrated) return null

  if (items.length === 0) {
    return (
      <>
        <ShopBackdrop />
        <Header />
        <main className="min-h-screen pt-32 pb-20 relative z-10">
          <div className="container mx-auto px-4">
            <div className="max-w-2xl mx-auto text-center glass-card p-12 md:p-20 rounded-[40px] bg-white/5 border border-white/10">
              <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse">
                <ShoppingCart className="w-12 h-12 text-blue-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">
                Tu carrito está <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">totalmente vacío</span>
              </h1>
              <p className="text-gray-400 text-lg md:text-xl mb-12 leading-relaxed">
                Parece que aún no has encontrado nada que te encante. <br />
                Explora nuestras colecciones exclusivas y llena tu bolsa.
              </p>
              <Link href="/">
                <Button size="lg" className="bg-white text-black hover:scale-105 transition-transform duration-300 font-black uppercase tracking-widest px-10 h-16 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                  <ArrowLeft className="w-5 h-5 mr-3" />
                  Volver a la tienda
                </Button>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <ShopBackdrop />
      <Header />
      <main ref={containerRef} className="min-h-screen pt-32 pb-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">
              Mi Carrito <span className="text-blue-500 opacity-50">/ {totalItems}</span>
            </h1>
            <p className="text-gray-400 font-medium">Revisa tus productos antes de finalizar la compra premium.</p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center justify-between px-4 mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Producto</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearCart}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-full font-bold text-[10px] uppercase tracking-widest"
                >
                  <Trash2 className="w-3 h-3 mr-2" />
                  Vaciar Carrito
                </Button>
              </div>

              <div className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.product.id} 
                    className="cart-item glass-card p-4 md:p-6 rounded-[32px] bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-500 flex flex-col md:flex-row gap-6 group"
                  >
                    {/* Image */}
                    <Link href={`/producto/${item.product.slug}`} className="shrink-0">
                      <div className="w-full md:w-32 h-32 bg-white/5 rounded-2xl overflow-hidden relative group-hover:scale-105 transition-transform duration-500">
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0 py-2">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <Link href={`/producto/${item.product.slug}`}>
                            <h3 className="font-bold text-xl text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                              {item.product.name}
                            </h3>
                          </Link>
                          <p className="text-xs font-black text-gray-500 uppercase tracking-widest mt-1">
                            {item.product.category.name}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between mt-6">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-1 bg-black/20 p-1 rounded-2xl border border-white/5">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center font-black text-lg text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors text-white"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="text-2xl font-black text-white tracking-tighter">
                            {formatPrice(item.product.price * item.quantity)}
                          </p>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                            {formatPrice(item.product.price)} UNIDAD
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue Shopping */}
              <Link href="/" className="inline-block pt-4">
                <Button variant="ghost" className="text-gray-400 hover:text-white group">
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Seguir Explorando
                </Button>
              </Link>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-4 sticky top-32 cart-summary">
              <div className="glass-card p-8 rounded-[40px] bg-white/5 border border-white/10 shadow-2xl">
                <h2 className="text-2xl font-black text-white tracking-tighter mb-8 flex items-center gap-3">
                  Resumen <span className="w-2 h-2 bg-blue-500 rounded-full" />
                </h2>

                <div className="space-y-6">
                  {/* Summary Details */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Subtotal</span>
                      <span className="text-lg font-black text-white">{formatPrice(subtotal)}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-green-400 uppercase tracking-widest">Descuento</span>
                        <span className="text-lg font-black text-green-400">-{formatPrice(discount)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Envío</span>
                      <span className={shipping === 0 ? "text-lg font-black text-green-400" : "text-lg font-black text-white"}>
                        {shipping === 0 ? 'GRATIS' : formatPrice(shipping)}
                      </span>
                    </div>
                  </div>

                  {/* Free Shipping Progress */}
                  {subtotal < 30000 && (
                    <div className="p-4 rounded-3xl bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-center gap-2 mb-3">
                        <Truck className="w-4 h-4 text-blue-400" />
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          Faltan {formatPrice(30000 - subtotal)} para Envío Gratis
                        </p>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((subtotal / 30000) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Promo Code */}
                  <div className="pt-6 border-t border-white/10">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="CÓDIGO PROMO"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className="flex-1 h-12 px-6 bg-white/5 border border-white/5 rounded-2xl text-xs font-bold tracking-widest focus:ring-2 focus:ring-blue-500/50 outline-none text-white uppercase"
                      />
                      <Button 
                        variant="outline" 
                        onClick={handleApplyPromo}
                        className="h-12 w-12 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="pt-6 border-t border-white/10 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Total Final</p>
                      <p className="text-4xl font-black text-white tracking-tighter">
                        {formatPrice(total)}
                      </p>
                    </div>
                    <Badge className="bg-blue-600 mb-2 px-3 py-1">PAGO SEGURO</Badge>
                  </div>

                  {/* Checkout Button */}
                  <Link href="/checkout" className="block pt-4">
                    <Button 
                      size="lg" 
                      className="w-full h-16 bg-white text-black hover:scale-[1.02] transition-all duration-300 rounded-2xl font-black uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
                    >
                      Pagar Ahora <CreditCard className="w-5 h-5 ml-3" />
                    </Button>
                  </Link>

                  <div className="flex items-center justify-center gap-4 pt-4 grayscale opacity-40">
                    <span className="text-[10px] font-black uppercase tracking-widest">Webpay</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Flow</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">Stripe</span>
                  </div>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                  <ShieldCheck className="w-5 h-5 text-gray-500 mb-2" />
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight">Compra <br />Certificada</p>
                </div>
                <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex flex-col items-center text-center">
                  <Package className="w-5 h-5 text-gray-500 mb-2" />
                  <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-tight">Empaque <br />Sostenible</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

