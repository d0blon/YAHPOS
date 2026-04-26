'use client'

import React, { useState, useEffect } from 'react'
import { 
  Package, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  MoreVertical,
  ChevronRight,
  ClipboardList,
  AlertCircle
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

// Mock de estados de pedido
const STATUS_COLORS: any = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  shipped: 'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const STATUS_LABELS: any = {
  pending: 'Pendiente',
  preparing: 'En Preparación',
  ready: 'Listo para Entrega',
  shipped: 'En Camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

import Header from '@/components/layout/Header'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      setOrders(data)
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }

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
    } catch (error) {
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
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20 mesh-bg">
        <div className="container mx-auto px-4 animate-fade-in">
          <div className="flex gap-8">
            <AdminSidebar activePath="/admin/pedidos" />

            <div className="flex-1 space-y-8">
              {/* Header section with Stats */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                    Gestión de <span className="text-corporate-blue">Pedidos</span>
                  </h1>
                  <p className="text-gray-500 text-sm font-medium">Control logístico y armado de pedidos (Picking)</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
                  <div className="px-6 py-2 text-center border-r border-gray-200 dark:border-gray-700">
                    <p className="text-3xl font-black text-corporate-blue">{orders.length}</p>
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Total Hoy</p>
                  </div>
                  <div className="px-6 py-2 text-center">
                    <p className="text-3xl font-black text-emerald-600">
                      {orders.filter(o => o.status === 'pending').length}
                    </p>
                    <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Pendientes</p>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="glass-card p-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Buscar por ID de pedido o cliente..." 
                    className="pl-11 h-12 bg-white/50 dark:bg-black/20 border-none rounded-xl"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto">
                  <Button 
                    variant={filter === 'all' ? 'default' : 'outline'} 
                    onClick={() => setFilter('all')}
                    className={`rounded-xl px-4 h-11 font-bold ${filter === 'all' ? 'bg-corporate-blue text-white' : ''}`}
                  >
                    Todos
                  </Button>
                  <Button 
                    variant={filter === 'pending' ? 'default' : 'outline'} 
                    onClick={() => setFilter('pending')}
                    className={`rounded-xl px-4 h-11 font-bold ${filter === 'pending' ? 'bg-yellow-500 text-white' : ''}`}
                  >
                    Pendientes
                  </Button>
                  <Button 
                    variant={filter === 'preparing' ? 'default' : 'outline'} 
                    onClick={() => setFilter('preparing')}
                    className={`rounded-xl px-4 h-11 font-bold ${filter === 'preparing' ? 'bg-blue-500 text-white' : ''}`}
                  >
                    En Picking
                  </Button>
                  <Button 
                    variant={filter === 'ready' ? 'default' : 'outline'} 
                    onClick={() => setFilter('ready')}
                    className={`rounded-xl px-4 h-11 font-bold ${filter === 'ready' ? 'bg-emerald-500 text-white' : ''}`}
                  >
                    Listos
                  </Button>
                </div>
              </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-500">No se encontraron pedidos</h3>
          <p className="text-gray-400">Prueba cambiando el filtro o los términos de búsqueda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="glass-card overflow-hidden border-none shadow-premium group hover:ring-2 hover:ring-corporate-blue/30 transition-all">
              <CardContent className="p-0">
                {/* Header de la Card */}
                <div className="p-5 border-b border-gray-100/50 dark:border-gray-800/50 flex justify-between items-start bg-white/30 dark:bg-black/10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">ORDEN #{String(order.id).slice(0, 8)}</span>
                      <Badge className={`${STATUS_COLORS[order.status] || 'bg-gray-100'} border-none font-bold text-[10px] uppercase tracking-wider px-2`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white truncate max-w-[200px] uppercase italic text-sm">
                      {order.shipping_address_json?.fullName || 'Cliente Invitado'}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-corporate-blue tracking-tighter">{formatPrice(order.total)}</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{order.payment_method}</span>
                  </div>
                </div>

                {/* Detalles Logísticos */}
                <div className="p-5 bg-white/10 dark:bg-black/5 space-y-4">
                  <div className="flex items-center gap-4 text-sm">
                    <div className={`p-3 rounded-2xl ${order.shipping_type === 'pickup' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'} shadow-sm`}>
                      {order.shipping_type === 'pickup' ? <MapPin className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-black uppercase text-[11px] tracking-wider">{order.shipping_type === 'pickup' ? 'Retiro en Tienda' : 'Envío a Domicilio'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px] font-medium">
                        {order.shipping_type === 'pickup' ? 'Local AustralMarket' : `${order.shipping_address_json?.street} ${order.shipping_address_json?.number}`}
                      </p>
                    </div>
                  </div>

                  {order.service_fee > 0 && (
                    <div className="flex items-center justify-between p-3 bg-corporate-blue/5 dark:bg-corporate-blue/10 rounded-2xl text-xs border border-corporate-blue/10">
                      <span className="text-corporate-blue dark:text-blue-300 font-black uppercase tracking-widest text-[9px] flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Picking Fee Incluido
                      </span>
                      <span className="font-black text-corporate-blue">{formatPrice(order.service_fee)}</span>
                    </div>
                  )}
                </div>

                {/* Footer / Acciones */}
                <div className="p-5 flex flex-col gap-3">
                  {order.status === 'pending' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, 'preparing')}
                      className="w-full bg-corporate-blue hover:bg-corporate-dark gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl shadow-lg shadow-corporate-blue/20"
                    >
                      <ClipboardList className="w-4 h-4" />
                      Empezar Picking
                    </Button>
                  )}
                  {order.status === 'preparing' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, 'ready')}
                      className="w-full bg-amber-500 hover:bg-amber-600 gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl shadow-lg shadow-amber-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar como Listo
                    </Button>
                  )}
                  {order.status === 'ready' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, order.shipping_type === 'pickup' ? 'delivered' : 'shipped')}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl shadow-lg shadow-emerald-500/20"
                    >
                      {order.shipping_type === 'pickup' ? <MapPin className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                      {order.shipping_type === 'pickup' ? 'Entregar al Cliente' : 'Enviar Pedido'}
                    </Button>
                  )}
                  {order.status === 'shipped' && (
                    <Button 
                      onClick={() => updateOrderStatus(order.id, 'delivered')}
                      className="w-full bg-gray-600 hover:bg-gray-700 gap-2 text-[11px] font-black uppercase tracking-widest h-11 text-white rounded-xl"
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
          </div>
        </div>
      </main>
    </>
  )
}
