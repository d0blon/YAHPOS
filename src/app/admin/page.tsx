'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link';
import { 
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp, 
  DollarSign, ArrowUpRight, Loader2, AlertCircle, 
  Download, RefreshCw, Zap
} from 'lucide-react'
import { 
  XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { SectionCard, SectionHeader } from '@/components/admin/SectionCard'
import { cn } from '@/lib/utils'

// Mapping of icon names to components
const IconMap: Record<string, any> = {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  LayoutDashboard,
  TrendingUp
}

interface DashboardData {
  stats: any[]
  recentOrders: any[]
  topProducts: any[]
  activePersonnel?: any[]
  chartData?: any[]
  paymentMethods?: any[]
  branches?: { id: string, name: string }[]
}

const COLORS = ['#003399', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all')

  const fetchDashboard = async (showMainLoader = true, branchId = selectedBranchId) => {
    try {
      if (showMainLoader) setIsLoading(true)
      else setIsRefreshing(true)
      
      const url = new URL('/api/dashboard', window.location.origin)
      if (branchId !== 'all') {
        url.searchParams.set('branchId', branchId)
      }
      
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error('Error al cargar datos del dashboard')
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    setIsMounted(true)
    fetchDashboard()
    
    // Auto-actualización cada 60 segundos
    const intervalId = setInterval(() => {
      fetchDashboard(false)
    }, 60000)
    
    return () => clearInterval(intervalId)
  }, [])

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
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-xl font-bold">Error de Conexión</h2>
        <p className="text-gray-500">{error}</p>
        <Button onClick={() => fetchDashboard()}>Reintentar</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            Dashboard <span className="text-brand-primary">General</span>
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Rendimiento en tiempo real de tu negocio.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {data?.branches && data.branches.length > 0 && (
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value)
                fetchDashboard(true, e.target.value)
              }}
              className="bg-white/5 border border-white/10 dark:bg-black/40 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none w-full sm:w-auto"
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
              className="flex-1 sm:flex-none rounded-xl border-none shadow-sm hover:bg-white/80 dark:hover:bg-white/10 h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[10px] font-black uppercase">Actualizar</span>
            </Button>
            <Button variant="outline" onClick={handleExport} className="flex-1 sm:flex-none rounded-xl border-none shadow-sm hover:bg-white/80 dark:hover:bg-white/10 h-9">
              <Download className="w-3.5 h-3.5 mr-2" />
              <span className="text-[10px] font-black uppercase">Exportar</span>
            </Button>
          </div>
        </div>
      </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                  <span className="ml-3 font-medium text-gray-500 italic uppercase font-black tracking-tighter">Cargando métricas...</span>
                </div>
              ) : (
                <>
                  {/* Stats Row */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {data?.stats.map((stat) => {
                      const Icon = IconMap[stat.icon] || DollarSign
                      return (
                        <SectionCard key={stat.title} className="hover:scale-[1.02] transition-all duration-300">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 bg-brand-primary/10 text-brand-primary rounded-2xl group-hover:bg-brand-primary group-hover:text-white transition-all shadow-inner">
                                <Icon className="w-6 h-6" />
                              </div>
                              <Badge variant="outline" className={cn(
                                "border-none font-black italic tracking-tighter text-[10px] uppercase px-2 py-0.5",
                                stat.trend === 'up' ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                              )}>
                                {stat.change}
                              </Badge>
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{stat.title}</p>
                            <h3 className="text-3xl font-black italic tracking-tighter">{stat.value}</h3>
                          </CardContent>
                        </SectionCard>
                      )
                    })}
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Ventas Chart */}
                    <SectionCard className="lg:col-span-2">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-brand-primary" />
                            Rendimiento <span className="text-brand-primary">Ventas</span>
                          </CardTitle>
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none font-black italic text-[10px] uppercase">+12.5% ESTE MES</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="h-[300px] w-full">
                          {isMounted && (
                            <ResponsiveContainer width="100%" height={260}>
                              <AreaChart data={data?.chartData || []}>
                                <defs>
                                  <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4b0082" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#4b0082" stopOpacity={0}/>
                                  </linearGradient>
                                  <linearGradient id="colorEcom" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
                                <XAxis 
                                  dataKey="name" 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{fontSize: 10, fill: '#6b7280', fontWeight: 900}} 
                                  dy={10}
                                />
                                <YAxis 
                                  axisLine={false} 
                                  tickLine={false} 
                                  tick={{fontSize: 10, fill: '#6b7280', fontWeight: 900}}
                                  tickFormatter={(value) => `$${value / 1000}k`}
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    padding: '12px'
                                  }}
                                  itemStyle={{ fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}
                                  labelStyle={{ fontWeight: 900, marginBottom: '4px', color: '#4b0082' }}
                                  formatter={(value: any, name: any) => [`$${value.toLocaleString()}`, name === 'POS' ? 'TIENDA FÍSICA' : name === 'Ecommerce' ? 'VENTAS ONLINE' : name]}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }} />
                                <Area 
                                  type="monotone" 
                                  dataKey="POS" 
                                  name="POS"
                                  stroke="#4b0082" 
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill="url(#colorPos)" 
                                  animationDuration={1500}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="Ecommerce" 
                                  name="Ecommerce"
                                  stroke="#10b981" 
                                  strokeWidth={3}
                                  fillOpacity={1} 
                                  fill="url(#colorEcom)" 
                                  animationDuration={1500}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </CardContent>
                    </SectionCard>

                    {/* Personnel Turno */}
                    <SectionCard>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                            <Users className="w-5 h-5 text-brand-primary" />
                            Personal <span className="text-brand-primary">Activo</span>
                          </CardTitle>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-tighter text-emerald-600">{data?.activePersonnel?.length || 0} EN TURNO</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 mt-4">
                          {!data?.activePersonnel || data.activePersonnel.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed border-gray-100 dark:border-white/5 rounded-3xl">
                               <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                               <p className="text-[10px] text-gray-400 font-black uppercase italic">Sin personal activo</p>
                            </div>
                          ) : (
                            data.activePersonnel.map((person) => (
                              <div key={person.name} className="flex items-center justify-between p-3 bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-white/10 group hover:border-brand-primary/30 transition-all shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-brand-primary text-white rounded-xl flex items-center justify-center font-black italic text-xs shadow-lg shadow-brand-primary/20">
                                    {person.name.split(' ').map((n: string) => n[0]).join('')}
                                  </div>
                                  <div>
                                    <p className="font-black italic text-sm text-gray-900 dark:text-white leading-none uppercase tracking-tighter">{person.name}</p>
                                    <p className="text-[10px] text-gray-500 uppercase font-black mt-1 tracking-widest">{person.role}</p>
                                  </div>
                                </div>
                                <Badge className="bg-brand-primary/10 text-brand-primary border-none text-[9px] font-black italic uppercase">{person.area}</Badge>
                              </div>
                            ))
                          )}
                        </div>
                        <Button variant="ghost" className="w-full mt-4 text-[10px] font-black uppercase italic tracking-widest hover:bg-brand-primary/5 rounded-xl" asChild>
                          <Link href="/admin/personal">Gestionar Equipo <ArrowUpRight className="w-3 h-3 ml-1" /></Link>
                        </Button>
                      </CardContent>
                    </SectionCard>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Pedidos Recientes */}
                    <SectionCard className="lg:col-span-2">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-black italic tracking-tighter uppercase">
                          Pedidos <span className="text-brand-primary">Recientes</span>
                        </CardTitle>
                        <Button variant="outline" size="sm" className="rounded-xl border-none shadow-sm text-[10px] font-black uppercase italic tracking-widest" asChild>
                          <Link href="/admin/pedidos">Ver Historial <ArrowUpRight className="w-4 h-4 ml-1" /></Link>
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-100 dark:border-white/10">
                                <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">ID Pedido</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Cliente</th>
                                <th className="text-left py-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Total</th>
                                <th className="text-right py-4 px-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Estado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                              {data?.recentOrders.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="py-12 text-center text-[10px] font-black uppercase italic text-gray-400">No se encontraron pedidos</td>
                                </tr>
                              ) : (
                                data?.recentOrders.map((order) => (
                                  <tr key={order.id} className="group hover:bg-brand-primary/5 transition-colors">
                                    <td className="py-4 px-4 text-sm font-black italic tracking-tighter">#{order.id}</td>
                                    <td className="py-4 px-4 text-sm font-medium">{order.customer}</td>
                                    <td className="py-4 px-4 text-sm font-black text-brand-primary">${order.total.toLocaleString()}</td>
                                    <td className="py-4 px-4 text-right">
                                      <Badge variant={order.status === 'completed' || order.status === 'delivered' ? 'success' : order.status === 'processing' ? 'warning' : order.status === 'shipped' ? 'default' : 'secondary'} 
                                        className="text-[9px] font-black uppercase italic tracking-tighter border-none px-2 py-0.5">
                                        {order.status === 'completed' || order.status === 'delivered' ? 'ENTREGADO' : order.status === 'processing' ? 'EN PROCESO' : order.status === 'shipped' ? 'ENVIADO' : 'PENDIENTE'}
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
                        <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-emerald-500" />
                          Flujo de <span className="text-brand-primary">Caja</span>
                        </CardTitle>
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
                                  paddingAngle={8}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {data.paymentMethods.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity outline-none" />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: any) => [`$${value.toLocaleString()}`, 'MONTO']}
                                  contentStyle={{ 
                                    borderRadius: '16px', 
                                    border: 'none', 
                                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    padding: '12px'
                                  }}
                                  itemStyle={{ fontWeight: 900, fontSize: '12px', textTransform: 'uppercase' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontWeight: 900, fontSize: '10px', textTransform: 'uppercase' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                               <DollarSign className="w-12 h-12 opacity-10" />
                               <span className="text-[10px] font-black uppercase italic tracking-widest">Sin datos de transacciones</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </SectionCard>
                  </div>

                  <div className="grid lg:grid-cols-3 gap-6">
                    {/* Top Products */}
                    <SectionCard className="lg:col-span-2">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-black italic tracking-tighter uppercase">
                          Productos <span className="text-brand-primary">Estrella</span>
                        </CardTitle>
                        <Link href="/admin/productos">
                          <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase italic tracking-widest hover:bg-brand-primary/5">Inventario Completo</Button>
                        </Link>
                      </CardHeader>
                      <CardContent>
                        <div className="grid md:grid-cols-2 gap-4">
                          {data?.topProducts.length === 0 ? (
                            <p className="py-8 text-center text-gray-500 italic text-[10px] font-black uppercase col-span-2">No hay ventas registradas</p>
                          ) : (
                            data?.topProducts.map((product, index) => (
                              <div key={product.name} className="flex items-center gap-4 p-4 bg-white/50 dark:bg-white/5 rounded-3xl border border-white/10 group hover:border-brand-primary/30 transition-all shadow-sm">
                                <div className="w-10 h-10 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center font-black italic shadow-inner">
                                  #{index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-black italic text-sm uppercase truncate tracking-tighter">{product.name}</p>
                                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{product.sales} VENTAS</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black italic text-sm text-brand-primary">${product.revenue.toLocaleString()}</p>
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
                        <CardTitle className="text-xl font-black italic tracking-tighter uppercase flex items-center gap-2">
                          <Zap className="w-5 h-5 text-amber-500" />
                          Accesos <span className="text-brand-primary">Rápidos</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-col gap-3">
                          <Button asChild className="w-full justify-between bg-brand-primary hover:bg-brand-700 rounded-2xl py-6 shadow-lg shadow-brand-primary/20 group">
                            <Link href="/admin/productos">
                              <span className="flex items-center font-black italic uppercase tracking-widest text-[11px]"><Package className="w-4 h-4 mr-3" />Inventario</span>
                              <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="w-full justify-between rounded-2xl py-6 border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/5 shadow-sm group">
                            <Link href="/admin/pedidos">
                              <span className="flex items-center font-black italic uppercase tracking-widest text-[11px]"><ShoppingCart className="w-4 h-4 mr-3" />Órdenes</span>
                              <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </Button>
                          <Button asChild variant="outline" className="w-full justify-between rounded-2xl py-6 border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/5 shadow-sm group">
                            <Link href="/admin/reportes">
                              <span className="flex items-center font-black italic uppercase tracking-widest text-[11px]"><TrendingUp className="w-4 h-4 mr-3" />Análisis</span>
                              <ArrowUpRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
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
