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
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import { createServerClient } from '@/lib/supabase'

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
      // TODO: Implementar PATCH /api/orders/[id]
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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-8 h-8 text-corporate-blue" />
            Gestión de Pedidos
          </h1>
          <p className="text-gray-500 mt-1">Control logístico y armado de pedidos (Picking)</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchOrders} className="gap-2">
            <Clock className="w-4 h-4" />
            Actualizar
          </Button>
          <Button className="bg-corporate-blue hover:bg-corporate-dark gap-2">
            Ver Estadísticas
          </Button>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por ID de pedido o cliente..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-corporate-blue/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            onClick={() => setFilter('all')}
            className="rounded-full px-6"
          >
            Todos
          </Button>
          <Button 
            variant={filter === 'pending' ? 'default' : 'outline'} 
            onClick={() => setFilter('pending')}
            className="rounded-full px-6"
          >
            Pendientes
          </Button>
          <Button 
            variant={filter === 'preparing' ? 'default' : 'outline'} 
            onClick={() => setFilter('preparing')}
            className="rounded-full px-6"
          >
            En Picking
          </Button>
          <Button 
            variant={filter === 'ready' ? 'default' : 'outline'} 
            onClick={() => setFilter('ready')}
            className="rounded-full px-6"
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
            <Card key={order.id} className="overflow-hidden border-none shadow-premium bg-white dark:bg-gray-900 group hover:ring-2 hover:ring-corporate-blue/30 transition-all">
              <CardContent className="p-0">
                {/* Header de la Card */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-400 tracking-wider">ORDEN #{String(order.id).slice(0, 8)}</span>
                      <Badge className={STATUS_COLORS[order.status] || 'bg-gray-100'}>
                        {STATUS_LABELS[order.status] || order.status}
                      </Badge>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]">
                      {order.shipping_address_json?.fullName || 'Cliente Invitado'}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-lg font-black text-corporate-blue">{formatPrice(order.total)}</span>
                    <span className="text-[10px] text-gray-400 capitalize">{order.payment_method}</span>
                  </div>
                </div>

                {/* Detalles Logísticos */}
                <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className={`p-2 rounded-lg ${order.shipping_type === 'pickup' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'}`}>
                      {order.shipping_type === 'pickup' ? <MapPin className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{order.shipping_type === 'pickup' ? 'Retiro en Tienda' : 'Envío a Domicilio'}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {order.shipping_type === 'pickup' ? 'Local AustralMarket' : `${order.shipping_address_json?.street} ${order.shipping_address_json?.number}`}
                      </p>
                    </div>
                  </div>

                  {order.service_fee > 0 && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs">
                      <span className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Picking Fee Incluido
                      </span>
                      <span className="font-bold text-blue-700">{formatPrice(order.service_fee)}</span>
                    </div>
                  )}
                </div>

                {/* Footer / Acciones */}
                <div className="p-4 flex gap-2">
                  <Button className="flex-1 bg-corporate-blue hover:bg-corporate-dark gap-2 text-xs h-9">
                    <ClipboardList className="w-4 h-4" />
                    Armar Pedido
                  </Button>
                  <Button variant="outline" className="h-9 w-9 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
