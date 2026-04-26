'use client'

import React, { useState, useEffect } from 'react'
import { 
  Users, Search, UserPlus, Mail, Phone, MapPin, 
  TrendingUp, Award, MoreHorizontal, Edit2, Trash2,
  Loader2, AlertCircle, ChevronRight, Filter
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

export default function AdminClientes() {
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', rut: '', email: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/customers/list')
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      setCustomers(data)
    } catch (err: any) {
      setError(err.message)
      if (customers.length === 0) {
        setCustomers([
          { id: '1', name: 'Juan Pérez', rut: '12.345.678-9', email: 'juan@email.com', loyalty_points: 1250, createdAt: '2026-01-15' },
          { id: '2', name: 'María González', rut: '15.987.654-3', email: 'maria@email.com', loyalty_points: 450, createdAt: '2026-03-20' },
          { id: '3', name: 'Carlos Soto', rut: '18.111.222-0', email: 'csoto@email.com', loyalty_points: 0, createdAt: '2026-04-01' },
        ])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.rut.includes(searchTerm)
  )

  return (
    <div className="space-y-8">
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Base de Datos de <span className="text-corporate-blue">Clientes</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Gestiona perfiles, RUTs y programas de fidelización</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/50 dark:bg-white/5 backdrop-blur-md p-2 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg">
          <div className="px-6 py-2 text-center border-r border-gray-200 dark:border-gray-700">
            <p className="text-3xl font-black text-corporate-blue">{customers.length}</p>
            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Total</p>
          </div>
          <div className="px-6 py-2 text-center">
            <p className="text-3xl font-black text-emerald-600">
              {customers.reduce((acc, c) => acc + (c.loyalty_points || 0), 0).toLocaleString()}
            </p>
            <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Puntos Totales</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-card p-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Buscar por nombre o RUT..." 
            className="pl-11 h-12 bg-white/50 dark:bg-black/20 border-none rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 px-2">
          <Button variant="outline" className="rounded-xl h-12 border-gray-200 dark:border-gray-700 font-bold px-6">
            <Filter className="w-4 h-4 mr-2" />
            Filtros Avanzados
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-corporate-blue/20 flex items-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <Card className="w-full max-w-md border-none shadow-2xl bg-white dark:bg-gray-800 rounded-3xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <CardHeader className="bg-corporate-blue text-white p-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  Registrar Nuevo Cliente
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setIsAddModalOpen(false)} className="text-white hover:bg-white/20 rounded-full">
                  <MoreHorizontal className="w-6 h-6" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">RUT</label>
                <Input 
                  placeholder="12.345.678-9" 
                  className="h-12 bg-gray-50 border-none rounded-xl"
                  value={newCustomer.rut}
                  onChange={(e) => setNewCustomer({...newCustomer, rut: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Nombre Completo</label>
                <Input 
                  placeholder="Ej: Juan Pérez" 
                  className="h-12 bg-gray-50 border-none rounded-xl"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">E-mail (Opcional)</label>
                <Input 
                  placeholder="ejemplo@correo.com" 
                  className="h-12 bg-gray-50 border-none rounded-xl"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  type="email"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <Button 
                  variant="ghost" 
                  className="flex-1 h-12 rounded-xl font-bold text-gray-500"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-[2] bg-corporate-blue hover:bg-corporate-dark text-white h-12 rounded-xl font-bold shadow-lg shadow-corporate-blue/20"
                  disabled={isSaving || !newCustomer.rut || !newCustomer.name}
                  onClick={async () => {
                    try {
                      setIsSaving(true)
                      const res = await fetch('/api/customers', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newCustomer)
                      })
                      if (!res.ok) throw new Error('Error al registrar')
                      toast.success('Cliente registrado con éxito')
                      setIsAddModalOpen(false)
                      setNewCustomer({ name: '', rut: '', email: '' })
                      fetchCustomers()
                    } catch (err) {
                      toast.error('Hubo un error al registrar el cliente')
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirmar Registro'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="glass-card overflow-hidden border-none shadow-xl">
        <CardHeader className="border-b border-gray-100/50 dark:border-gray-700/50 bg-white/30 dark:bg-black/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black uppercase italic tracking-tighter">
              Listado de <span className="text-corporate-blue">Clientes</span>
            </CardTitle>
            <Badge variant="outline" className="rounded-lg font-bold border-gray-200 dark:border-gray-700">
              {filteredCustomers.length} Resultados
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-left border-b border-gray-100 dark:border-gray-700">
                  <th className="py-5 px-6 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Cliente</th>
                  <th className="py-5 px-6 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Rango</th>
                  <th className="py-5 px-6 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">RUT</th>
                  <th className="py-5 px-6 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">E-mail</th>
                  <th className="py-5 px-6 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Puntos</th>
                  <th className="py-5 px-6 text-xs font-black text-gray-400 uppercase tracking-widest text-[10px]">Fecha Registro</th>
                  <th className="py-5 px-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-corporate-blue mb-4" />
                      <p className="text-sm text-gray-500">Cargando clientes...</p>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-20 text-center">
                      <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 font-medium">No se encontraron clientes</p>
                    </td>
                  </tr>
                ) : filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          customer.role === 'admin' ? 'bg-red-100 text-red-600' :
                          customer.role === 'developer' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' :
                          customer.role === 'manager' ? 'bg-orange-100 text-orange-600' :
                          'bg-corporate-blue/10 text-corporate-blue'
                        }`}>
                          {customer.name?.charAt(0) || '?'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900 dark:text-white group-hover:text-corporate-blue transition-colors">{customer.name}</span>
                          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">{customer.id.substring(0,8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <Badge 
                        className={`font-black uppercase tracking-widest text-[9px] px-2 py-0.5 rounded-md border-none ${
                          customer.role === 'admin' ? 'bg-red-500 text-white shadow-sm' :
                          customer.role === 'developer' ? 'bg-purple-600 text-white shadow-neon' :
                          customer.role === 'manager' ? 'bg-amber-500 text-white' :
                          customer.role === 'cashier' ? 'bg-emerald-500 text-white' :
                          customer.role === 'warehouse' ? 'bg-slate-500 text-white' :
                          'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}
                      >
                        {customer.role === 'admin' ? 'Administrador' :
                         customer.role === 'developer' ? 'Desarrollador' :
                         customer.role === 'manager' ? 'Gerente' :
                         customer.role === 'cashier' ? 'Cajero' :
                         customer.role === 'warehouse' ? 'Bodega' : 'Cliente'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 font-mono text-sm">{customer.rut || '—'}</td>
                    <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">{customer.email || '—'}</td>
                    <td className="py-4 px-6">
                      <Badge variant="secondary" className="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 font-bold px-3 py-1 rounded-lg">
                        <Award className="w-3 h-3 mr-1" />
                        {customer.loyalty_points || 0} pts
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-corporate-blue"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-gray-300"><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

