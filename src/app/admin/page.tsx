'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  DollarSign, ArrowUpRight, Loader2, AlertCircle,
  Download, RefreshCw, Zap
} from 'lucide-react'
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { SalesTrendChart } from '@/components/admin/SalesTrendChart';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { SectionCard } from '@/components/admin/SectionCard'
import { cn } from '@/lib/utils'

const IconMap: Record<string, React.ElementType> = {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  LayoutDashboard,
  TrendingUp
}

interface DashboardStat {
  title: string
  value: string | number
  icon: string
  trend: string
  change: string
}

interface DashboardOrder {
  id: string
  customer: string
  total: number
  status: string
  date: string
}

interface DashboardPersonnel {
  name: string
  role: string
  area: string
}

interface DashboardProduct {
  name: string
  sales: number
  revenue: number
}

interface DashboardData {
  stats: DashboardStat[]
  recentOrders: DashboardOrder[]
  topProducts: DashboardProduct[]
  activePersonnel?: DashboardPersonnel[]
  paymentMethods?: { name: string, value: number }[]
  branches?: { id: string, name: string }[]
}

const COLORS = ['#4b0082', '#ff00ff', '#10b981', '#f59e0b', '#6366f1'];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')
  const initialBranchIdRef = useRef(selectedBranchId)
  const hasFetchedRef = useRef(false)

  const fetchDashboard = useCallback(async (showMainLoader = true, branchId?: string) => {
    const targetBranchId = branchId ?? initialBranchIdRef.current
    try {
      if (showMainLoader) setIsLoading(true)
      else setIsRefreshing(true)

      const url = new URL('/api/dashboard', window.location.origin)
      if (targetBranchId !== 'all') {
        url.searchParams.set('branchId', targetBranchId)
      }

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Error al cargar datos del dashboard')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos del dashboard')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrón de hidratación/fetch sin cambio de comportamiento
    setIsMounted(true)

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchDashboard()
    }

    const intervalId = setInterval(() => {
      fetchDashboard(false)
    }, 60000)

    return () => clearInterval(intervalId)
  }, [fetchDashboard])

  const handleExport = () => {
    if (!data) return;
    const headers = ['ID', 'Cliente', 'Total', 'Estado', 'Fecha'];
    const rows = data.recentOrders.map(o => [
      o.id,
      o.customer,
      o.total,
      o.status,
      o.date
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Reporte descargado correctamente');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-semibold">Error de Conexión</h2>
        <p className="text-[var(--muted-foreground)] text-sm">{error}</p>
        <Button onClick={() => fetchDashboard()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Rendimiento en tiempo real de tu negocio.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {data?.branches && data.branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value)
                fetchDashboard(true, e.target.value)
              }}
              className="bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none w-full sm:w-auto"
            >
              <option value="all">Todas las sucursales</option>
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => fetchDashboard(false, selectedBranchId)}
              disabled={isRefreshing}
              className="flex-1 sm:flex-none rounded-lg h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-sm">Actualizar</span>
            </Button>
            <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none rounded-lg h-9">
              <Download className="w-3.5 h-3.5 mr-2" />
              <span className="text-sm">Exportar</span>
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-brand-accent animate-spin" />
          <span className="ml-3 text-sm text-[var(--muted-foreground)]">Cargando métricas...</span>
        </div>
      ) : (
        <>
          {/* Stats Row */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.stats.map((stat) => {
              const Icon = IconMap[stat.icon] || DollarSign
              return (
                <SectionCard key={stat.title}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{stat.title}</p>
                      <Icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                    </div>
                    <h3 className="text-3xl font-semibold tracking-tight">{stat.value}</h3>
                    <p className={cn(
                      "text-xs mt-1.5 flex items-center gap-1",
                      stat.trend === 'up' ? "text-emerald-500" : "text-rose-500"
                    )}>
                      <ArrowUpRight className={cn("w-3 h-3", stat.trend !== 'up' && "rotate-90")} />
                      {stat.change}
                      <span className="text-[var(--muted-foreground)]">vs. mes anterior</span>
                    </p>
                  </CardContent>
                </SectionCard>
              )
            })}
          </div>

          <div className="grid lg:grid-cols-4 gap-4">
            {/* Ventas Chart */}
            <div className="lg:col-span-3">
              <SalesTrendChart branchId={selectedBranchId} />
            </div>

            {/* Personnel Turno */}
            <SectionCard>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">Personal Activo</CardTitle>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-xs text-[var(--muted-foreground)]">{data?.activePersonnel?.length || 0} en turno</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mt-2">
                  {!data?.activePersonnel || data.activePersonnel.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-[var(--border)] rounded-lg">
                       <Users className="w-6 h-6 text-[var(--muted-foreground)] mx-auto mb-2 opacity-40" />
                       <p className="text-xs text-[var(--muted-foreground)]">Sin personal activo</p>
                    </div>
                  ) : (
                    data.activePersonnel.map((person) => (
                      <div key={person.name} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--muted)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[var(--card)] border border-[var(--border)] text-brand-accent rounded-full flex items-center justify-center text-xs font-medium">
                            {person.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-none">{person.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">{person.role}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-transparent border-[var(--border)] text-xs">{person.area}</Badge>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="ghost" className="w-full mt-3 text-sm" asChild>
                  <Link href="/admin/personal">Gestionar Equipo <ArrowUpRight className="w-3.5 h-3.5 ml-1" /></Link>
                </Button>
              </CardContent>
            </SectionCard>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Pedidos Recientes */}
            <SectionCard className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Pedidos Recientes</CardTitle>
                <Button variant="outline" size="sm" className="rounded-lg text-sm" asChild>
                  <Link href="/admin/pedidos">Ver Historial <ArrowUpRight className="w-4 h-4 ml-1" /></Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-3 px-3 text-xs font-medium text-[var(--muted-foreground)]">ID Pedido</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-[var(--muted-foreground)]">Cliente</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-[var(--muted-foreground)]">Total</th>
                        <th className="text-right py-3 px-3 text-xs font-medium text-[var(--muted-foreground)]">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {data?.recentOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-xs text-[var(--muted-foreground)]">No se encontraron pedidos</td>
                        </tr>
                      ) : (
                        data?.recentOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-[var(--muted)] transition-colors">
                            <td className="py-3 px-3 text-sm font-medium">#{order.id}</td>
                            <td className="py-3 px-3 text-sm">{order.customer}</td>
                            <td className="py-3 px-3 text-sm">${order.total.toLocaleString()}</td>
                            <td className="py-3 px-3 text-right">
                              <Badge variant={order.status === 'completed' || order.status === 'delivered' ? 'success' : order.status === 'processing' ? 'warning' : order.status === 'shipped' ? 'default' : 'secondary'}
                                className="text-xs border-none px-2 py-0.5">
                                {order.status === 'completed' || order.status === 'delivered' ? 'Entregado' : order.status === 'processing' ? 'En proceso' : order.status === 'shipped' ? 'Enviado' : 'Pendiente'}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </SectionCard>

            {/* Pagos Pie Chart */}
            <SectionCard>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Flujo de Caja</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px] w-full">
                  {isMounted && data?.paymentMethods && data.paymentMethods.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={data.paymentMethods}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={4}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.paymentMethods.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`$${Number(value ?? 0).toLocaleString()}`, 'Monto']}
                          contentStyle={{
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            boxShadow: 'none',
                            backgroundColor: 'var(--card)',
                            padding: '10px'
                          }}
                          itemStyle={{ fontSize: '12px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)] gap-2">
                       <DollarSign className="w-10 h-10 opacity-20" />
                       <span className="text-xs">Sin datos de transacciones</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </SectionCard>
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            {/* Top Products */}
            <SectionCard className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold">Productos Estrella</CardTitle>
                <Link href="/admin/productos">
                  <Button variant="ghost" size="sm" className="text-sm">Inventario Completo</Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {data?.topProducts.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--muted-foreground)] col-span-2">No hay ventas registradas</p>
                  ) : (
                    data?.topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)]">
                        <div className="w-8 h-8 bg-[var(--card)] border border-[var(--border)] text-brand-accent rounded-lg flex items-center justify-center text-xs font-medium shrink-0">
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-emerald-500">{product.sales} ventas</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${product.revenue.toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </SectionCard>

            {/* Quick Actions */}
            <SectionCard>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-accent" />
                  Accesos Rápidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full justify-between rounded-lg bg-brand-primary hover:bg-brand-600 text-white">
                    <Link href="/admin/productos">
                      <span className="flex items-center text-sm"><Package className="w-4 h-4 mr-3" />Inventario</span>
                      <ArrowUpRight className="w-4 h-4 opacity-60" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-between rounded-lg">
                    <Link href="/admin/pedidos">
                      <span className="flex items-center text-sm"><ShoppingCart className="w-4 h-4 mr-3" />Órdenes</span>
                      <ArrowUpRight className="w-4 h-4 opacity-60" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-between rounded-lg">
                    <Link href="/admin/reportes">
                      <span className="flex items-center text-sm"><TrendingUp className="w-4 h-4 mr-3" />Análisis</span>
                      <ArrowUpRight className="w-4 h-4 opacity-60" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  )
}
