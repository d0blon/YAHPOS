'use client'

import React, { useState, useEffect } from 'react'
import { 
  TrendingUp, Download, Calendar, 
  PieChart as PieIcon, LineChart as LineIcon,
  ArrowUpRight, DollarSign, Package,
  Loader2, ArrowDownRight, MoreHorizontal
} from 'lucide-react'
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SectionCard, SectionHeader } from '@/components/admin/SectionCard'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

const COLORS = ['#4b0082', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface CategoryDatum {
  name: string
  value: number
}

interface BestProduct {
  name: string
  quantity: number
  total: number
}

interface ReportsData {
  summary: { totalSales: number, totalOrders: number, avgTicket: number }
  chartData: { name: string, sales: number }[]
  categoryData: CategoryDatum[]
  bestProducts: BestProduct[]
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- patrón de hidratación/fetch sin cambio de comportamiento
    setIsMounted(true)
    fetchReports()
  }, [])

  async function fetchReports() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/reports')
      if (!res.ok) throw new Error('Error al cargar reportes')
      const result = await res.json()
      setData(result)
    } catch (err) {
      console.error(err)
      toast.error('No se pudieron cargar los datos de reportes')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!data) return
    const headers = ['Métrica', 'Valor']
    const rows = [
      ['Ventas Totales', data.summary.totalSales],
      ['Total Pedidos', data.summary.totalOrders],
      ['Ticket Promedio', data.summary.avgTicket],
    ]
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
        <Loader2 className="w-12 h-12 animate-spin text-brand-primary mx-auto mb-4" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Generando Inteligencia de Negocios...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader 
        title="Centro de Reportes"
        subtitle="Análisis detallado de ventas, inventario y rendimiento comercial"
        icon={TrendingUp}
        actions={
          <div className="flex gap-3 bg-white/50 dark:bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/20 dark:border-white/10">
            <Button variant="outline" className="rounded-xl border-none shadow-sm hover:bg-white/80 dark:hover:bg-white/10">
              <Calendar className="w-4 h-4 mr-2" />
              Últimos 30 días
            </Button>
            <Button 
              onClick={exportToCSV}
              variant="outline" 
              className="rounded-xl border-none shadow-sm hover:bg-white/80 dark:hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button 
              onClick={fetchReports}
              className="bg-brand-primary hover:bg-brand-700 text-white rounded-xl px-6 shadow-lg shadow-brand-primary/20"
            >
              Actualizar
            </Button>
          </div>
        }
      />

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Ventas Totales', value: formatPrice(data?.summary.totalSales || 0), trend: '+12.5%', up: true, icon: DollarSign, color: 'text-brand-primary' },
          { title: 'Total Pedidos', value: data?.summary.totalOrders || 0, trend: '+5.2%', up: true, icon: Package, color: 'text-emerald-500' },
          { title: 'Ticket Promedio', value: formatPrice(data?.summary.avgTicket || 0), trend: '-2.1%', up: false, icon: TrendingUp, color: 'text-amber-500' },
        ].map((stat, i) => (stat && (
          <div key={i} className="glass-card p-6 relative overflow-hidden group">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <stat.icon size={120} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl bg-white/50 dark:bg-black/20 ${stat.color} shadow-sm`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <Badge className={`${stat.up ? 'bg-emerald-500' : 'bg-red-500'} border-none font-bold text-[10px] uppercase tracking-wider`}>
                {stat.trend} {stat.up ? <ArrowUpRight className="w-3 h-3 ml-1" /> : <ArrowDownRight className="w-3 h-3 ml-1" />}
              </Badge>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.title}</p>
            <h3 className="text-3xl font-black italic tracking-tighter text-gray-900 dark:text-white">{stat.value}</h3>
          </div>
        )))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Sales Chart */}
        <SectionCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black italic uppercase tracking-tighter text-xl leading-none">Ventas <span className="text-brand-primary">Diarias</span></h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Rendimiento de ingresos en el tiempo</p>
            </div>
            <div className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl">
              <LineIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="h-72 w-full">
            {isMounted && (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data?.chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4b0082" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#4b0082" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700}}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 700}}
                    tickFormatter={(value) => `$${value/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontWeight: 'bold'
                    }} 
                    formatter={(value) => [formatPrice(Number(value ?? 0)), 'Ventas']}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#4b0082" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        {/* Categories Chart */}
        <SectionCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black italic uppercase tracking-tighter text-xl leading-none">Mix de <span className="text-brand-primary">Categorías</span></h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Distribución de ventas por rubro</p>
            </div>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <PieIcon className="w-5 h-5" />
            </div>
          </div>
          <div className="h-72 flex items-center">
            <div className="w-1/2 h-full">
              {isMounted && (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={data?.categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data?.categoryData.map((entry: CategoryDatum, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="w-1/2 space-y-3 px-4">
              {data?.categoryData.map((cat: CategoryDatum, i: number) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-bold truncate max-w-[100px] uppercase italic">{cat.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-400">{formatPrice(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Top Products Table */}
      <SectionCard>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black italic tracking-tighter uppercase">
              Top <span className="text-brand-primary">Productos</span>
            </CardTitle>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Los 5 productos con mayor rotación e ingreso</p>
          </div>
          <Button variant="ghost" size="icon" className="text-gray-400 rounded-full">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-black/10 text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cantidad</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Ventas</th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Rendimiento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data?.bestProducts.map((p: BestProduct, i: number) => (
                  <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center font-black text-brand-primary text-xs uppercase italic">
                          #{i+1}
                        </div>
                        <span className="font-black text-sm uppercase italic">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-bold text-sm">{p.quantity} unid.</td>
                    <td className="py-4 px-6 font-black text-brand-primary">{formatPrice(p.total)}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="w-full max-w-[100px] h-2 bg-gray-100 dark:bg-gray-800 rounded-full ml-auto overflow-hidden">
                        <div 
                          className="h-full bg-brand-primary rounded-full" 
                          style={{ width: `${(p.total / data.summary.totalSales) * 100 * 2}%` }} 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </SectionCard>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <span className={`px-2 py-1 rounded-lg text-white flex items-center ${className}`}>
      {children}
    </span>
  )
}
