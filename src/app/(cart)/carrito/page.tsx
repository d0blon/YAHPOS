'use client'

import React, { useState } from 'react'
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
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function CartPage() {
  const { items, totalItems, subtotal, discount, shipping, total, updateQuantity, removeItem, clearCart } = useCartStore()
  const [promoCode, setPromoCode] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  React.useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleApplyPromo = () => {
    if (promoCode.trim()) {
      toast.info('Código de descuento no válido')
    }
  }

  if (!isHydrated) return null

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-20">
          <div className="container mx-auto px-4">
            <div className="max-w-md mx-auto text-center">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingCart className="w-12 h-12 text-gray-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Tu carrito está vacío
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Parece que aún no has agregado productos a tu carrito. 
                ¡Explora nuestra tienda y encuentra lo que necesitas!
              </p>
              <Link href="/categoria/alimentos">
                <Button size="lg" className="bg-corporate-blue hover:bg-corporate-dark">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continuar comprando
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
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-20">
        <div className="container mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-8">
            <Link href="/" className="hover:text-corporate-blue">Inicio</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium">Carrito</span>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Tu Carrito <span className="text-corporate-blue dark:text-accent-yellow">({totalItems})</span>
          </h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Productos</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearCart}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Vaciar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div 
                      key={item.product.id} 
                      className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                    >
                      {/* Image */}
                      <Link href={`/producto/${item.product.slug}`} className="shrink-0">
                        <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
                          <img
                            src={item.product.image}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </Link>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <Link href={`/producto/${item.product.slug}`}>
                          <h3 className="font-medium text-gray-900 dark:text-white hover:text-corporate-blue dark:hover:text-accent-yellow transition-colors line-clamp-2">
                            {item.product.name}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {item.product.category.name}
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          {/* Quantity Controls */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-medium">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="w-8 h-8 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Price */}
                          <div className="text-right">
                            <p className="font-bold text-corporate-blue dark:text-white">
                              {formatPrice(item.product.price * item.quantity)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {formatPrice(item.product.price)} c/u
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="shrink-0 w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Continue Shopping */}
              <Link href="/categoria/alimentos">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continuar comprando
                </Button>
              </Link>
            </div>

            {/* Order Summary */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen del Pedido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Promo Code */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Código de descuento"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleApplyPromo}
                      className="shrink-0"
                    >
                      <Tag className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Summary Details */}
                  <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Package className="w-4 h-4" />
                        Subtotal
                      </span>
                      <span className="font-medium">{formatPrice(subtotal)}</span>
                    </div>
                    
                    {discount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-green-600">
                          <Tag className="w-4 h-4" />
                          Descuento
                        </span>
                        <span className="font-medium text-green-600">-{formatPrice(discount)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Truck className="w-4 h-4" />
                        Envío
                      </span>
                      <span className={shipping === 0 ? "font-medium text-green-600" : "font-medium"}>
                        {shipping === 0 ? 'Gratis' : formatPrice(shipping)}
                      </span>
                    </div>

                    {shipping === 0 && (
                      <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-400">
                          ¡Tienes envío gratis!
                        </span>
                      </div>
                    )}

                    {subtotal < 30000 && (
                      <div className="p-3 bg-accent-yellow/10 rounded-lg">
                        <p className="text-sm text-corporate-dark">
                          Te faltan <strong>{formatPrice(30000 - subtotal)}</strong> para envío gratis
                        </p>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent-yellow rounded-full transition-all"
                            style={{ width: `${Math.min((subtotal / 30000) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-2xl font-bold text-corporate-blue dark:text-accent-yellow">
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Link href="/checkout">
                    <Button 
                      size="lg" 
                      className="w-full bg-corporate-blue hover:bg-corporate-dark text-white"
                    >
                      Proceder al pago
                    </Button>
                  </Link>

                  <p className="text-xs text-center text-gray-500">
                    Envío e impuestos calculados en el checkout
                  </p>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                    Métodos de pago aceptados
                  </p>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">Webpay</Badge>
                    <Badge variant="outline">Flow</Badge>
                    <Badge variant="outline">Transferencia</Badge>
                    <Badge variant="outline">Efectivo</Badge>
                  </div>
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
