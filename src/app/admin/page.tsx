'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, 
  DollarSign, ArrowUpRight, ArrowDownRight, MoreHorizontal, 
  Loader2, AlertCircle, Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdminSidebar from '@/components/admin/AdminSidebar'

// Mapping of icon names to components
const IconMap: Record<string, any> = {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  LayoutDashboard,
  TrendingUp,
  Settings
}

interface DashboardData {
  stats: any[]
  recentOrders: any[]
  topProducts: any[]
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error('Error al cargar datos del dashboard')
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (error) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20 flex items-center justify-center">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Error de Conexión</h2>
              <p className="text-gray-500 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>Reintentar</Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <AdminSidebar activePath="/admin" />

            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                  <p className="text-gray-600 dark:text-gray-400">Resumen de tu tienda</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Hoy</Button>
                  <Button variant="outline">Semana</Button>
                  <Button variant="default" className="bg-corporate-blue">Mes</Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-corporate-blue animate-spin" />
                  <span className="ml-3 font-medium text-gray-500">Cargando métricas...</span>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data?.stats.map((stat) => {
                      const Icon = IconMap[stat.icon] || DollarSign
                      return (
                        <Card key={stat.title}>
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.title}</p>
                                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                <div className={`flex items-center gap-1 mt-2 text-sm ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                                  {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                  <span>{stat.change}</span>
                                  <span className="text-gray-400">vs ayer</span>
                                </div>
                              </div>
                              <div className="w-12 h-12 bg-corporate-blue/10 rounded-xl flex items-center justify-center">
                                <Icon className="w-6 h-6 text-corporate-blue" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Pedidos Recientes</CardTitle>
                        <Link href="/admin/pedidos">
                          <Button variant="ghost" size="sm">Ver todos<ArrowUpRight className="w-4 h-4 ml-1" /></Button>
                        </Link>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Pedido</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Cliente</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {data?.recentOrders.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-8 text-center text-gray-500">No hay pedidos recientes</td>
                                </tr>
                              ) : (
                                data?.recentOrders.map((order) => (
                                  <tr key={order.id} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="py-3 px-4 text-sm font-medium">{order.id}</td>
                                    <td className="py-3 px-4 text-sm">{order.customer}</td>
                                    <td className="py-3 px-4 text-sm">${order.total.toLocaleString()}</td>
                                    <td className="py-3 px-4">
                                      <Badge variant={order.status === 'completed' || order.status === 'delivered' ? 'success' : order.status === 'processing' ? 'warning' : order.status === 'shipped' ? 'default' : 'secondary'} className="text-xs">
                                        {order.status === 'completed' || order.status === 'delivered' ? 'Completado' : order.status === 'processing' ? 'Procesando' : order.status === 'shipped' ? 'Enviado' : 'Pendiente'}
                                      </Badge>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Productos Más Vendidos</CardTitle>
                        <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {data?.topProducts.length === 0 ? (
                            <p className="py-8 text-center text-gray-500">No hay datos de ventas</p>
                          ) : (
                            data?.topProducts.map((product, index) => (
                              <div key={product.name} className="flex items-center gap-4">
                                <div className="w-8 h-8 bg-corporate-blue/10 rounded-lg flex items-center justify-center font-bold text-corporate-blue">{index + 1}</div>
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{product.name}</p>
                                  <p className="text-xs text-gray-500">{product.sales} unidades vendidas</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-sm">${product.revenue.toLocaleString()}</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/admin/productos">
                      <Button className="bg-corporate-blue hover:bg-corporate-dark"><Package className="w-4 h-4 mr-2" />Gestionar Productos</Button>
                    </Link>
                    <Link href="/admin/pedidos">
                      <Button variant="outline"><ShoppingCart className="w-4 h-4 mr-2" />Ver Pedidos</Button>
                    </Link>
                    <Link href="/admin/reportes">
                      <Button variant="outline"><TrendingUp className="w-4 h-4 mr-2" />Ver Reportes</Button>
                    </Link>
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
