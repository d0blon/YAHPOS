'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CreditCard, 
  Truck, 
  MapPin, 
  Check,
  ShieldCheck,
  Lock,
  Award,
  ChevronRight,
  Package,
  Wallet,
  Zap,
  ShoppingBag,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores'
import { useAuthStore } from '@/stores'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ShopBackdrop from '@/components/layout/ShopBackdrop'
import Link from 'next/link'
import { createOrder, createWebpayTransaction } from '@/lib/api'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/lib/gsap'
import { CartItem } from '@/types'

const paymentMethods = [
  { id: 'webpay', name: 'Webpay Plus', description: 'Crédito / Débito', icon: CreditCard, color: 'blue' },
  { id: 'flow', name: 'Flow', description: 'Multimétodo', icon: Zap, color: 'purple' },
  { id: 'transfer', name: 'Transferencia', description: 'Directo al banco', icon: Wallet, color: 'green' },
  { id: 'cash', name: 'Efectivo', description: 'Contra entrega', icon: ShoppingBag, color: 'orange' },
]

const shippingMethods = [
  { id: 'standard', name: 'Envío Estándar', description: '2-3 días hábiles', price: 3500 },
  { id: 'express', name: 'Envío Express', description: '24 horas hábiles', price: 5500 },
  { id: 'pickup', name: 'Retiro en Tienda', description: 'Pick-up gratuito', price: 0 },
]

export default function CheckoutPage() {
  ensureGsapRegistered()
  const navigate = useRouter()
  const { items, subtotal, total, clearCart } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()
  const [step, setStep] = useState(1)
  const [selectedShipping, setSelectedShipping] = useState('standard')
  const [selectedPayment, setSelectedPayment] = useState('webpay')
  const [isProcessing, setIsProcessing] = useState(false)
  const [loyaltyAccumulationRate, setLoyaltyAccumulationRate] = useState(100)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const stepRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings?.loyalty?.accumulationRate) {
          setLoyaltyAccumulationRate(Number(d.settings.loyalty.accumulationRate) || 100)
        }
      })
      .catch(() => {})
  }, [])

  useGSAP(() => {
    gsap.from('.checkout-header', {
      y: -20,
      opacity: 0,
      duration: 0.8,
      ease: 'power4.out'
    })
    
    gsap.from('.checkout-step-nav', {
      y: 20,
      opacity: 0,
      duration: 0.8,
      delay: 0.2,
      ease: 'power4.out'
    })
  }, { scope: containerRef })

  useGSAP(() => {
    // Animate step transition
    if (stepRef.current) {
      gsap.fromTo(stepRef.current, 
        { x: 20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
      )
    }
  }, { dependencies: [step] })

  const pointsToEarn = Math.floor(subtotal / loyaltyAccumulationRate)

  const handleSubmit = async () => {
    setIsProcessing(true)
    try {
      const shippingMethod = shippingMethods.find(s => s.id === selectedShipping);
      const isPickup = selectedShipping === 'pickup';
      const pickingFee = (isPickup && subtotal < 40000) ? 2000 : 0;
      const shippingCost = isPickup ? 0 : (shippingMethod?.price || 0);
      
      const orderTotal = subtotal + shippingCost + pickingFee;

      const orderData = {
        userId: user?.id,
        items: items.map((i: CartItem) => ({
          productId: i.product.id,
          quantity: i.quantity,
          price: i.product.price
        })),
        subtotal,
        shipping: shippingCost,
        serviceFee: pickingFee,
        total: orderTotal,
        paymentMethod: selectedPayment,
        shippingType: selectedShipping,
        shippingAddress: {
          fullName: `${(document.querySelector('input[name="firstName"]') as HTMLInputElement)?.value || ''} ${(document.querySelector('input[name="lastName"]') as HTMLInputElement)?.value || ''}`.trim(),
          email: (document.querySelector('input[name="email"]') as HTMLInputElement)?.value || '',
          phone: (document.querySelector('input[name="phone"]') as HTMLInputElement)?.value || '',
          street: (document.querySelector('input[name="street"]') as HTMLInputElement)?.value || '',
          number: (document.querySelector('input[name="number"]') as HTMLInputElement)?.value || '',
          apartment: (document.querySelector('input[name="apartment"]') as HTMLInputElement)?.value || '',
          commune: (document.querySelector('input[name="commune"]') as HTMLInputElement)?.value || '',
          city: (document.querySelector('input[name="city"]') as HTMLInputElement)?.value || '',
        },
      }
      
      const res = await createOrder(orderData)

      if (selectedPayment === 'webpay' || selectedPayment === 'flow') {
        const txRes = await createWebpayTransaction({
          orderId: res.id,
          amount: orderTotal,
          returnUrl: `${window.location.origin}/flow-confirmation`
        })

        if (txRes?.url) {
          window.location.href = txRes.token_ws ? `${txRes.url}?token_ws=${txRes.token_ws}` : txRes.url
          return
        }
      }

      toast.success('¡Pedido realizado con éxito!')
      clearCart()
      navigate.push('/')
    } catch (err) {
      console.error(err)
      toast.error('Ocurrió un error al procesar el pedido. Intente nuevamente.')
    } finally {
      setIsProcessing(false)
    }
  }

  const currentShippingPrice = shippingMethods.find(s => s.id === selectedShipping)?.price || 0;
  const isPickup = selectedShipping === 'pickup';
  const pickingFee = (isPickup && subtotal < 40000) ? 2000 : 0;
  const freePickingProgress = Math.min((subtotal / 40000) * 100, 100);

  return (
    <>
      <ShopBackdrop />
      <Header />
      <main ref={containerRef} className="min-h-screen pt-32 pb-20 relative z-10">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Top Info */}
          <div className="checkout-header mb-12">
            <nav className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
              <ChevronRight className="w-3 h-3 text-gray-700" />
              <Link href="/carrito" className="hover:text-white transition-colors">Carrito</Link>
              <ChevronRight className="w-3 h-3 text-gray-700" />
              <span className="text-brand-accent-400">Checkout Seguro</span>
            </nav>
            
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase mb-2">
              Finalizar <span className="text-brand-accent-500 italic">Pedido</span>
            </h1>
            <p className="text-gray-500 text-xs font-bold tracking-widest uppercase flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              CONEXIÓN ENCRIPTADA DE PUNTA A PUNTA
            </p>
          </div>

          {/* Custom Step Indicator */}
          <div className="checkout-step-nav mb-12 overflow-x-auto scrollbar-hide">
            <div className="flex items-center justify-between min-w-[600px] bg-white/5 border border-white/10 rounded-3xl p-2">
              {[
                { s: 1, label: 'INFORMACIÓN', icon: MapPin },
                { s: 2, label: 'MÉTODO DE PAGO', icon: CreditCard },
                { s: 3, label: 'CONFIRMACIÓN', icon: Check }
              ].map((item, idx) => (
                <div 
                  key={item.s} 
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl transition-all duration-500 ${
                    step === item.s ? 'bg-brand-accent-600 text-white shadow-lg shadow-brand-accent-600/20' : 'text-gray-500'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                    step === item.s ? 'bg-white text-brand-accent-600' : (step > item.s ? 'bg-green-500 text-white' : 'bg-white/5')
                  }`}>
                    {step > item.s ? <Check className="w-4 h-4" /> : item.s}
                  </div>
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">{item.label}</span>
                  {idx < 2 && <div className="h-[2px] w-8 bg-white/10 ml-4 hidden md:block" />}
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-8">
              <div ref={stepRef} className="space-y-8">
                {step === 1 && (
                  <div className="glass-card p-8 md:p-12 rounded-[40px] border-white/5 bg-white/5">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-brand-accent-500/10 flex items-center justify-center">
                        <MapPin className="w-7 h-7 text-brand-accent-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Datos de Entrega</h2>
                        <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mt-1">¿DÓNDE RECIBIRÁS TU PEDIDO?</p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Nombre</label>
                        <input name="firstName" type="text" placeholder="Ej. Juan" defaultValue={user?.firstName} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Apellido</label>
                        <input name="lastName" type="text" placeholder="Ej. Pérez" defaultValue={user?.lastName} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Email de Contacto</label>
                        <input name="email" type="email" placeholder="juan@email.com" defaultValue={user?.email} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Teléfono Móvil</label>
                        <input name="phone" type="tel" placeholder="+56 9 1234 5678" defaultValue={user?.phone} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      
                      <div className="md:col-span-2 pt-6">
                        <div className="h-[1px] bg-white/5 mb-10" />
                        <h3 className="text-[10px] font-black text-brand-accent-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                          <span className="w-4 h-[2px] bg-brand-accent-400" />
                          DIRECCIÓN EXACTA
                        </h3>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Calle / Avenida</label>
                        <input name="street" type="text" placeholder="Av. Siempre Viva" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Número</label>
                        <input name="number" type="text" placeholder="123" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Depto / Casa</label>
                        <input name="apartment" type="text" placeholder="Opcional" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Comuna</label>
                        <input name="commune" type="text" placeholder="Santiago" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Ciudad</label>
                        <input name="city" type="text" placeholder="Región Metropolitana" className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-accent-500/50 transition-all placeholder:text-gray-700" />
                      </div>
                    </div>

                    <div className="mt-12 pt-10 border-t border-white/5">
                      <h3 className="text-2xl font-black text-white tracking-tight uppercase mb-8">Método de Envío</h3>
                      <div className="grid gap-4">
                        {shippingMethods.map((method) => (
                          <label key={method.id} className={`group relative flex items-center justify-between p-6 border-2 rounded-[24px] cursor-pointer transition-all duration-300 ${
                            selectedShipping === method.id ? 'border-brand-accent-500 bg-brand-accent-500/5' : 'border-white/5 bg-white/5 hover:border-white/20'
                          }`}>
                            <div className="flex items-center gap-5">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedShipping === method.id ? 'border-brand-accent-500 bg-brand-accent-500' : 'border-white/20'}`}>
                                {selectedShipping === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <input type="radio" name="shipping" value={method.id} checked={selectedShipping === method.id} onChange={() => setSelectedShipping(method.id)} className="hidden" />
                              <div>
                                <p className="font-black text-white uppercase text-sm tracking-widest">{method.name}</p>
                                <p className="text-xs text-gray-500 font-bold uppercase mt-1">{method.description}</p>
                              </div>
                            </div>
                            <span className="font-black text-lg text-white">
                              {method.price === 0 ? <span className="text-green-400">GRATIS</span> : formatPrice(method.price)}
                            </span>
                          </label>
                        ))}
                      </div>

                      {selectedShipping === 'pickup' && (
                        <div className="mt-6 p-6 glass-card border-brand-accent-500/20 bg-brand-accent-500/5 rounded-3xl overflow-hidden relative">
                          <div className="relative z-10">
                            <div className="flex justify-between items-center mb-4">
                              <span className="text-[10px] font-black text-brand-accent-400 uppercase tracking-widest">
                                {subtotal >= 40000 ? '✅ ARMADO PREMIUM INCLUIDO' : `FALTAN ${formatPrice(40000 - subtotal)} PARA ARMADO GRATIS`}
                              </span>
                              <span className="text-brand-accent-400 font-black text-sm">{Math.round(freePickingProgress)}%</span>
                            </div>
                            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-4">
                              <div className="h-full bg-brand-accent-500 transition-all duration-1000 ease-out" style={{ width: `${freePickingProgress}%` }} />
                            </div>
                            <p className="text-[10px] font-bold text-gray-500 italic uppercase">
                              * Nuestro equipo seleccionará personalmente tus productos con el máximo cuidado.
                            </p>
                          </div>
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Package className="w-24 h-24 text-brand-accent-500" />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button 
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        setStep(2);
                      }} 
                      className="w-full h-20 bg-white text-black hover:bg-gray-200 font-black text-lg uppercase tracking-widest rounded-3xl mt-12 shadow-2xl shadow-white/5 group"
                    >
                      Continuar al Pago
                      <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  </div>
                )}

                {step === 2 && (
                  <div className="glass-card p-8 md:p-12 rounded-[40px] border-white/5 bg-white/5">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                        <Wallet className="w-7 h-7 text-brand-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Método de Pago</h2>
                        <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mt-1">SELECCIONA TU FORMA DE PAGO PREFERIDA</p>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {paymentMethods.map((method) => (
                        <label key={method.id} className={`group relative flex items-center gap-6 p-8 border-2 rounded-[32px] cursor-pointer transition-all duration-300 ${
                          selectedPayment === method.id ? 'border-brand-accent-500 bg-brand-accent-500/5 shadow-lg shadow-brand-accent-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'
                        }`}>
                          <input type="radio" name="payment" value={method.id} checked={selectedPayment === method.id} onChange={() => setSelectedPayment(method.id)} className="hidden" />
                          
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                            selectedPayment === method.id ? 'bg-brand-accent-500 text-white' : 'bg-white/5 text-gray-500 group-hover:bg-white/10'
                          }`}>
                            <method.icon className="w-8 h-8" />
                          </div>

                          <div className="flex-1">
                            <p className="font-black text-white uppercase tracking-widest text-lg">{method.name}</p>
                            <p className="text-xs text-gray-500 font-bold uppercase mt-1">{method.description}</p>
                          </div>

                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${selectedPayment === method.id ? 'border-brand-accent-500 bg-brand-accent-500' : 'border-white/10'}`}>
                            {selectedPayment === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 mt-12">
                      <Button variant="ghost" onClick={() => setStep(1)} className="h-20 flex-1 border border-white/10 text-white hover:bg-white/5 font-black uppercase tracking-widest rounded-3xl">
                        <ArrowLeft className="mr-3 w-5 h-5" />
                        Volver a Datos
                      </Button>
                      <Button onClick={() => setStep(3)} className="h-20 flex-1 bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-white/5">
                        Confirmar Selección
                        <ArrowRight className="ml-3 w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="glass-card p-8 md:p-12 rounded-[40px] border-white/5 bg-white/5">
                    <div className="flex items-center gap-4 mb-10">
                      <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
                        <ShieldCheck className="w-7 h-7 text-green-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Resumen Final</h2>
                        <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mt-1">ÚLTIMO PASO ANTES DE TU PEDIDO</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="glass-card p-8 rounded-3xl border-white/5 bg-white/2">
                        <h3 className="text-xs font-black text-brand-accent-400 uppercase tracking-[0.3em] mb-6">TUS PRODUCTOS</h3>
                        <div className="space-y-4">
                          {items.map((item: CartItem) => (
                            <div key={item.product.id} className="flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                                  <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="font-black text-white text-sm uppercase tracking-tighter">{item.product.name}</p>
                                  <p className="text-[10px] text-gray-500 font-black uppercase mt-1">CANTIDAD: {item.quantity}</p>
                                </div>
                              </div>
                              <span className="font-black text-white text-base">{formatPrice(item.product.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="glass-card p-6 rounded-3xl border-white/5 bg-white/2">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">DESTINO</h3>
                          <p className="text-sm font-black text-white uppercase">{shippingMethods.find(s => s.id === selectedShipping)?.name}</p>
                          <p className="text-[10px] text-brand-accent-400 font-bold uppercase mt-1">ENTREGA SEGURA</p>
                        </div>
                        <div className="glass-card p-6 rounded-3xl border-white/5 bg-white/2">
                          <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">PAGO</h3>
                          <p className="text-sm font-black text-white uppercase">{paymentMethods.find(p => p.id === selectedPayment)?.name}</p>
                          <p className="text-[10px] text-green-400 font-bold uppercase mt-1">TRANSACCIÓN PROTEGIDA</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 p-6 bg-green-500/10 border border-green-500/20 rounded-3xl">
                        <Lock className="w-6 h-6 text-green-500 shrink-0" />
                        <p className="text-xs font-bold text-green-400 uppercase tracking-widest leading-relaxed">
                          TUS DATOS ESTÁN PROTEGIDOS POR ENCRIPTACIÓN DE GRADO BANCARIO AES-256.
                        </p>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 mt-12">
                        <Button variant="ghost" onClick={() => setStep(2)} className="h-20 flex-1 border border-white/10 text-white hover:bg-white/5 font-black uppercase tracking-widest rounded-3xl">
                          <ArrowLeft className="mr-3 w-5 h-5" />
                          Cambiar Pago
                        </Button>
                        <Button onClick={handleSubmit} disabled={isProcessing} className="h-20 flex-1 bg-brand-accent-600 text-white hover:bg-blue-700 font-black uppercase tracking-widest rounded-3xl shadow-xl shadow-brand-accent-600/20">
                          {isProcessing ? (
                            <span className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                              PROCESANDO...
                            </span>
                          ) : (
                            <span className="flex items-center gap-3">
                              CONFIRMAR Y PAGAR
                              <ArrowRight className="w-5 h-5" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-4 sticky top-32">
              <div className="glass-card p-8 rounded-[40px] border-white/5 bg-white/5 relative overflow-hidden group">
                {/* Decorative mesh inside summary */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-accent-500/10 via-transparent to-brand-500/10 opacity-50 pointer-events-none" />
                
                <div className="relative z-10">
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase mb-8 flex items-center justify-between">
                    Resumen
                    <ShoppingBag className="w-6 h-6 text-brand-accent-500" />
                  </h2>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center group/item">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/item:text-gray-300 transition-colors">Subtotal</span>
                      <span className="font-black text-white">{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center group/item">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/item:text-gray-300 transition-colors">Costo de Envío</span>
                      <span className="font-black text-white">{currentShippingPrice === 0 ? <span className="text-green-400">GRATIS</span> : formatPrice(currentShippingPrice)}</span>
                    </div>
                    {pickingFee > 0 && (
                      <div className="flex justify-between items-center group/item pt-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-brand-accent-400 uppercase tracking-widest">Servicio de Armado</span>
                          <span className="text-[8px] font-bold text-gray-600 uppercase">EXPERIENCIA PREMIUM</span>
                        </div>
                        <span className="font-black text-brand-accent-400">{formatPrice(pickingFee)}</span>
                      </div>
                    )}

                    <div className="h-[1px] bg-white/5 my-6" />

                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total Final</span>
                        <p className="text-[8px] font-black text-brand-accent-500 uppercase tracking-[0.2em] mt-1">IVA INCLUIDO</p>
                      </div>
                      <span className="text-4xl font-black text-white tracking-tighter">
                        {formatPrice(subtotal + currentShippingPrice + pickingFee)}
                      </span>
                    </div>

                    {pointsToEarn > 0 && (
                      <div className="p-6 rounded-[24px] bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 relative overflow-hidden">
                        <div className="relative z-10 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                            <Award className="w-6 h-6 text-black" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Fidelización</p>
                            <p className="text-sm font-black text-white uppercase tracking-tighter mt-1">
                              GANARÁS <span className="text-amber-500">{pointsToEarn} PUNTOS</span>
                            </p>
                          </div>
                        </div>
                        <Award className="absolute -bottom-4 -right-4 w-20 h-20 text-amber-500/10 rotate-12" />
                      </div>
                    )}

                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                      <div className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        <Check className="w-4 h-4 text-green-500" />
                        Garantía de Satisfacción
                      </div>
                      <div className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                        <Check className="w-4 h-4 text-green-500" />
                        Devoluciones sin Costo
                      </div>
                    </div>
                  </div>
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

