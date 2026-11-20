'use client'

import React, { useState, useEffect } from 'react'
import { 
  Package, 
  Search, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  ClipboardList,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatPrice, cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Order {
  id: string
  user_id?: string
  status: string
  total: number
  payment_method?: string
  shipping_type?: string
  service_fee?: number
  shipping_address_json?: { fullName?: string, street?: string, number?: string }
}

// Mock de estados de pedido
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  preparing: 'bg-brand-accent-100 text-brand-accent-800 border-brand-accent-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  shipped: 'bg-brand-100 text-brand-800 border-brand-200',
  delivered: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  preparing: 'En Preparación',
  ready: 'Listo para Entrega',
  shipped: 'En Camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  async function fetchOrders() {
    try {
      const response = await fetch('/api/orders')
      if (!response.ok) {
        setOrders([])
        toast.error('No se pudieron cargar los pedidos')
        return
      }
      const data = await response.json()
      if (!Array.isArray(data)) {
        setOrders([])
        toast.error('No se pudieron cargar los pedidos')
        return
      }
      setOrders(data)
    } catch {
      console.error('Error fetching orders')
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrón de hidratación/fetch sin cambio de comportamiento
    fetchOrders()
  }, [])

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus })
      })

      if (!res.ok) throw new Error('Error al actualizar')

      toast.success(`Estado actualizado a ${STATUS_LABELS[newStatus]}`)
      fetchOrders()
    } catch {
      toast.error('No se pudo actualizar el estado')
    }
  }

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter
    const matchesSearch = String(order.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(order.user_id).toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Gestión de <span className="text-brand-accent-500">Pedidos</span>
          </h1>
          <p className="text-white/50 text-sm font-medium">Control logístico y armado de pedidos (Picking)</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
          <div className="px-6 py-2 text-center border-r border-white/10">
            <p className="text-3xl font-black text-brand-accent-500">{orders.length}</p>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/30">Total Hoy</p>
          </div>
          <div className="px-6 py-2 text-center">
            <p className="text-3xl font-black text-emerald-500">
              {orders.filter(o => o.status === 'pending').length}
            </p>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/30">Pendientes</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
          <Input 
            placeholder="Buscar por ID de pedido o cliente..." 
            className="pl-11 h-12 bg-black/20 border-white/5 rounded-xl text-white placeholder:text-white/20"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
            className={cn(
              "rounded-xl px-4 h-11 font-bold transition-all border-white/10",
              filter === 'all' ? 'bg-brand-accent-600 text-white hover:bg-brand-accent-500' : 'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            Todos
          </Button>
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'} 
            onClick={() => setFilter('pending')}
            className={cn(
              "rounded-xl px-4 h-11 font-bold transition-all border-white/10",
              filter === 'pending' ? 'bg-yellow-600 text-white hover:bg-yellow-500' : 'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            Pendientes
          </Button>
          <Button 
            variant={filter === 'preparing' ? 'default' : 'outline'} 
            onClick={() => setFilter('preparing')}
            className={cn(
              "rounded-xl px-4 h-11 font-bold transition-all border-white/10",
              filter === 'preparing' ? 'bg-brand-accent-500 text-white hover:bg-brand-accent-400' : 'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            En Picking
          </Button>
          <Button 
            variant={filter === 'ready' ? 'default' : 'outline'} 
            onClick={() => setFilter('ready')}
            className={cn(
              "rounded-xl px-4 h-11 font-bold transition-all border-white/10",
              filter === 'ready' ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'text-white/50 hover:bg-white/5 hover:text-white'
            )}
          >
            Listos
          </Button>
        </div>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-white/5 animate-pulse rounded-3xl border border-white/5" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Package className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white/40">No se encontraron pedidos</h3>
          <p className="text-white/20 text-sm">Prueba cambiando el filtro o los términos de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden border border-white/5 bg-white/5 backdrop-blur-xl hover:border-brand-accent-500/30 transition-all duration-300 shadow-xl group rounded-3xl">
              <CardContent className="p-0">
                {/* Header de la Card */}
                <div className="p-5 border-b border-white/5 flex justify-between items-start bg-white/5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-white/30 tracking-widest uppercase">ORDEN #{String(order.id).slice(0, 8)}</span>
                      <Badge className={cn(
                        "border-none font-bold text-[10px] uppercase tracking-wider px-2",
                        STATUS_COLORS[order.status]?.replace('bg-', 'bg-opacity-20 bg-') || 'bg-white/10'
                      )}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                    <h3 className="font-black text-white truncate max-w-[200px] uppercase italic text-sm">
                      {order.shipping_address_json?.fullName || 'Cliente Invitado'}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-brand-accent-400 tracking-tighter">{formatPrice(order.total)}</span>
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">{order.payment_method}</span>
                  </div>
                </div>

                {/* Detalles Logísticos */}
                <div className="p-5 bg-white/5 space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className={cn(
                      "p-3 rounded-2xl shadow-inner",
                      order.shipping_type === 'pickup' ? 'bg-orange-500/10 text-orange-400' : 'bg-emerald-500/10 text-emerald-400'
                    )}>
                      {order.shipping_type === 'pickup' ? <MapPin className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-black uppercase text-[11px] tracking-wider text-white/80">{order.shipping_type === 'pickup' ? 'Retiro en Tienda' : 'Envío a Domicilio'}</p>
                      <p className="text-xs text-white/40 truncate max-w-[200px] font-medium">
                        {order.shipping_type === 'pickup' ? 'Local AustralMarket' : `${order.shipping_address_json?.street} ${order.shipping_address_json?.number}`}
                      </p>
                    </div>
                  </div>

                  {(order.service_fee ?? 0) > 0 && (
                    <div className="flex items-center justify-between p-3 bg-brand-accent-500/5 rounded-2xl text-xs border border-brand-accent-500/10">
                      <span className="text-brand-accent-400 font-black uppercase tracking-widest text-[9px] flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Picking Fee Incluido
                      </span>
                      <span className="font-black text-brand-accent-400">{formatPrice(order.service_fee ?? 0)}</span>
                    </div>
                  )}
                </div>

                {/* Footer / Acciones */}
                <div className="p-5 flex flex-col gap-3">
                  {order.status === 'pending' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="w-full bg-brand-accent-600 hover:bg-brand-accent-500 gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl shadow-lg shadow-brand-accent-500/20 border-none"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Empezar Picking
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="w-full bg-amber-500 hover:bg-amber-600 gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl shadow-lg shadow-amber-500/20 border-none"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como Listo
                    </Button>
                  )}
                  {order.status === 'ready' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, order.shipping_type === 'pickup' ? 'delivered' : 'shipped')}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl shadow-lg shadow-emerald-500/20 border-none"
                    >
                      {order.shipping_type === 'pickup' ? <MapPin className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                      {order.shipping_type === 'pickup' ? 'Entregar al Cliente' : 'Enviar Pedido'}
                    </Button>
                  )}
                  {order.status === 'shipped' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="w-full bg-white/10 hover:bg-white/20 gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl border-none"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar Entrega
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
