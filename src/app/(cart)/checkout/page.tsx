'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  CreditCard, 
  Truck, 
  MapPin, 
  Check,
  ShieldCheck,
  Lock,
  Award
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
import Link from 'next/link'
import { createOrder, createWebpayTransaction } from '@/lib/api'

const paymentMethods = [
  { id: 'webpay', name: 'Webpay Plus', description: 'Paga con tarjeta de crédito o débito', icon: CreditCard },
  { id: 'flow', name: 'Flow', description: 'Múltiples métodos de pago', icon: CreditCard },
  { id: 'transfer', name: 'Transferencia Bancaria', description: 'Transferencia directa', icon: CreditCard },
  { id: 'cash', name: 'Efectivo', description: 'Pago contra entrega', icon: CreditCard },
]

const shippingMethods = [
  { id: 'standard', name: 'Envío Estándar', description: '2-3 días hábiles', price: 3500 },
  { id: 'express', name: 'Envío Express', description: '24 horas', price: 5500 },
  { id: 'pickup', name: 'Retiro en Tienda', description: 'Gratis', price: 0 },
]

export default function CheckoutPage() {
  const navigate = useRouter()
  const { items, subtotal, total, clearCart } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()
  const [step, setStep] = useState(1)
  const [selectedShipping, setSelectedShipping] = useState('standard')
  const [selectedPayment, setSelectedPayment] = useState('webpay')
  const [isProcessing, setIsProcessing] = useState(false)
  const [loyaltyAccumulationRate, setLoyaltyAccumulationRate] = useState(100) // Default: cada $100 = 1 punto

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
        items: items.map((i: any) => ({
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
          fullName: `${(document.querySelector('input[placeholder="Nombre"]') as HTMLInputElement)?.value || ''} ${(document.querySelector('input[placeholder="Apellido"]') as HTMLInputElement)?.value || ''}`.trim(),
          email: (document.querySelector('input[placeholder="Email"]') as HTMLInputElement)?.value || '',
          phone: (document.querySelector('input[placeholder="Teléfono"]') as HTMLInputElement)?.value || '',
          street: (document.querySelector('input[placeholder="Calle"]') as HTMLInputElement)?.value || '',
          number: (document.querySelector('input[placeholder="Número"]') as HTMLInputElement)?.value || '',
          apartment: (document.querySelector('input[placeholder="Departamento (opcional)"]') as HTMLInputElement)?.value || '',
          commune: (document.querySelector('input[placeholder="Comuna"]') as HTMLInputElement)?.value || '',
          city: (document.querySelector('input[placeholder="Ciudad"]') as HTMLInputElement)?.value || '',
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
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-20">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-8">
            <Link href="/" className="hover:text-corporate-blue">Inicio</Link>
            <span>/</span>
            <Link href="/carrito" className="hover:text-corporate-blue">Carrito</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Checkout</span>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Finalizar Compra
          </h1>

          <div className="flex items-center gap-4 mb-8">
            {[{ step: 1, label: 'Envío' }, { step: 2, label: 'Pago' }, { step: 3, label: 'Confirmar' }].map((s, index, arr) => (
              <React.Fragment key={s.step}>
                <div className={`flex items-center gap-2 ${step >= s.step ? 'text-corporate-blue' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s.step ? 'bg-corporate-blue text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step > s.step ? <Check className="w-4 h-4" /> : s.step}
                  </div>
                  <span className="hidden sm:inline font-medium">{s.label}</span>
                </div>
                {index < arr.length - 1 && <div className={`flex-1 h-1 rounded-full ${step > s.step ? 'bg-corporate-blue' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-corporate-blue" />
                      Dirección de Envío
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <input type="text" placeholder="Nombre" defaultValue={user?.firstName} className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="text" placeholder="Apellido" defaultValue={user?.lastName} className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="email" placeholder="Email" defaultValue={user?.email} className="md:col-span-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="tel" placeholder="Teléfono" defaultValue={user?.phone} className="md:col-span-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="text" placeholder="Calle" className="md:col-span-2 px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="text" placeholder="Número" className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="text" placeholder="Departamento (opcional)" className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="text" placeholder="Comuna" className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                      <input type="text" placeholder="Ciudad" className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50" />
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="font-medium mb-4 flex items-center gap-2">
                        <Truck className="w-5 h-5 text-corporate-blue" />
                        Método de Envío
                      </h3>
                      <div className="space-y-3">
                        {shippingMethods.map((method) => (
                          <label key={method.id} className={`flex items-center justify-between p-4 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedShipping === method.id ? 'border-corporate-blue bg-corporate-blue/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}>
                            <div className="flex items-center gap-3">
                              <input type="radio" name="shipping" value={method.id} checked={selectedShipping === method.id} onChange={() => setSelectedShipping(method.id)} className="w-4 h-4 text-corporate-blue" />
                              <div>
                                <p className="font-medium">{method.name}</p>
                                <p className="text-sm text-gray-500">{method.description}</p>
                              </div>
                            </div>
                            <span className="font-bold">{method.price === 0 ? 'Gratis' : formatPrice(method.price)}</span>
                          </label>
                        ))}
                      </div>

                      {selectedShipping === 'pickup' && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium text-blue-800 dark:text-blue-300">
                              {subtotal >= 40000 ? '✅ Armado GRATIS obtenido' : `Faltan ${formatPrice(40000 - subtotal)} para armado GRATIS`}
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 font-bold">{Math.round(freePickingProgress)}%</span>
                          </div>
                          <div className="w-full h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${freePickingProgress}%` }} />
                          </div>
                          <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                            * El servicio de armado ($2.000) nos permite elegir los mejores productos por ti y tenerlos listos en minutos.
                          </p>
                        </div>
                      )}
                    </div>

                    <Button onClick={() => setStep(2)} className="w-full bg-corporate-blue hover:bg-corporate-dark">
                      Continuar al pago
                    </Button>
                  </CardContent>
                </Card>
              )}

              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-corporate-blue" />
                      Método de Pago
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <label key={method.id} className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedPayment === method.id ? 'border-corporate-blue bg-corporate-blue/5' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}>
                          <input type="radio" name="payment" value={method.id} checked={selectedPayment === method.id} onChange={() => setSelectedPayment(method.id)} className="w-4 h-4 text-corporate-blue" />
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <method.icon className="w-6 h-6 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="flex gap-4">
                      <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                      </Button>
                      <Button onClick={() => setStep(3)} className="flex-1 bg-corporate-blue hover:bg-corporate-dark">
                        Continuar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-corporate-blue" />
                      Confirmar Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="font-medium">Productos</h3>
                      <div className="space-y-3">
                        {items.map((item: any) => (
                          <div key={item.product.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
                                <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{item.product.name}</p>
                                <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                              </div>
                            </div>
                            <span className="font-medium">{formatPrice(item.product.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <h3 className="font-medium mb-2">Envío / Retiro</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{shippingMethods.find(s => s.id === selectedShipping)?.name}</p>
                        {selectedShipping === 'pickup' && <p className="text-xs text-blue-600">Servicio de Armado incluido</p>}
                      </div>
                      <div>
                        <h3 className="font-medium mb-2">Pago</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{paymentMethods.find(p => p.id === selectedPayment)?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <Lock className="w-5 h-5 text-green-600" />
                      <span className="text-sm text-green-700 dark:text-green-400">Tu información está segura y encriptada</span>
                    </div>

                    <div className="flex gap-4">
                      <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver
                      </Button>
                      <Button onClick={handleSubmit} disabled={isProcessing} className="flex-1 bg-corporate-blue hover:bg-corporate-dark">
                        {isProcessing ? 'Procesando...' : 'Confirmar Pedido'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div>
              <Card className="sticky top-32">
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Envío</span>
                      <span>{currentShippingPrice === 0 ? 'Gratis' : formatPrice(currentShippingPrice)}</span>
                    </div>
                    {pickingFee > 0 && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span>Servicio de Armado</span>
                        <span>{formatPrice(pickingFee)}</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="font-bold">Total</span>
                      <span className="text-xl font-bold text-corporate-blue dark:text-accent-yellow">
                        {formatPrice(subtotal + currentShippingPrice + pickingFee)}
                      </span>
                    </div>
                  </div>
                  {pointsToEarn > 0 && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                      <Award className="w-4 h-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                        Ganarás <span className="font-black">{pointsToEarn} puntos</span> con esta compra
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

