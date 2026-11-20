'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Package, ArrowRight, ShoppingBag, MapPin, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useSaaS } from '@/providers/SaaSProvider'

interface OrderDetails {
  address?: string
  payment_method?: string
  total?: number
}

export default function OrderSuccessPage() {
  const params = useParams()
  const { config } = useSaaS()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`)
        if (!res.ok) throw new Error('No pudimos cargar los detalles de tu orden')
        const data = await res.json()
        setOrder(data)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    if (params.id) fetchOrder()
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mb-4" />
          <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 md:py-20">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic mb-3">
            ¡Pedido <span className="text-brand-primary">Recibido!</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
            Tu orden <span className="font-mono text-brand-primary">#{params.id?.toString().substring(0, 8)}</span> ha sido procesada con éxito.
          </p>
        </div>

        {/* Order Card */}
        <Card className="glass-card overflow-hidden border-none shadow-2xl animate-in fade-in zoom-in-95 duration-700 delay-150">
          <CardContent className="p-0">
            {/* Status Header */}
            <div className="bg-brand-primary p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5" />
                <span className="font-bold uppercase tracking-widest text-xs">Estado de la Orden</span>
              </div>
              <span className="bg-white/20 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                En Preparación
              </span>
            </div>

            <div className="p-8 space-y-8">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-brand-primary">
                    <MapPin className="w-4 h-4" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Dirección de Entrega</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium leading-relaxed">
                    {order?.address || 'Retiro en Tienda'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-brand-primary">
                    <CreditCard className="w-4 h-4" />
                    <h3 className="font-bold uppercase tracking-widest text-xs">Método de Pago</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium uppercase tracking-widest">
                    {order?.payment_method?.replace('_', ' ') || 'Pendiente'}
                  </p>
                </div>
              </div>

              {/* Order Summary Summary */}
              <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total de la Compra</span>
                  <span className="text-3xl font-black text-gray-900 dark:text-white">
                    ${order?.total?.toLocaleString('es-CL')}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-medium italic">
                  Te hemos enviado un correo con el detalle completo y el comprobante de tu compra.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <Link href="/mis-ordenes" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full h-14 px-10 rounded-2xl font-bold border-2 border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all">
              Ver Mis Pedidos
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full h-14 px-10 bg-brand-primary hover:bg-brand-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 flex items-center gap-3 group">
              Seguir Comprando <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-full">
            <ShoppingBag className="w-4 h-4 text-gray-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Gracias por elegir {config.store_name}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
