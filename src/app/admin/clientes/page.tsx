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
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdminSidebar from '@/components/admin/AdminSidebar'
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
      // For now we fetch from 'users' with role 'customer'
      // We'll need a better endpoint but let's try a direct query or a proxy
      const res = await fetch('/api/customers/list') // We'll create this or use a generic one
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      setCustomers(data)
    } catch (err: any) {
      setError(err.message)
      // Initial mock data if fetch fails (while setting up database)
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
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <AdminSidebar activePath="/admin/clientes" />

            <div className="flex-1 space-y-6">
              {/* Stats Header */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-corporate-blue text-white overflow-hidden relative">
                  <CardContent className="p-6">
                    <div className="relative z-10">
                      <p className="text-white/70 text-sm font-bold uppercase tracking-wider">Total Clientes</p>
                      <h3 className="text-4xl font-black mt-1">{customers.length}</h3>
                      <p className="text-xs text-white/50 mt-2 font-medium">+12% este mes</p>
                    </div>
                    <Users className="absolute -bottom-4 -right-4 w-24 h-24 text-white/10" />
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Puntos Distribuidos</p>
                    <h3 className="text-4xl font-black mt-1 text-gray-900 dark:text-white">
                      {customers.reduce((acc, c) => acc + (c.loyalty_points || 0), 0).toLocaleString()}
                    </h3>
                    <div className="flex items-center gap-1 text-amber-500 text-xs mt-2 font-bold italic">
                        <Award className="w-4 h-4" />
                        Programas de Lealtad Activos
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6">
                    <p className="text-gray-500 text-sm font-bold uppercase tracking-wider">Tickets Promedio</p>
                    <h3 className="text-4xl font-black mt-1 text-gray-900 dark:text-white">$14.500</h3>
                    <p className="text-xs text-green-500 mt-2 font-bold">Ticket superior al promedio</p>
                  </CardContent>
                </Card>
              </div>

              {/* Main Content Area */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Base de Datos de Clientes</h1>
                  <p className="text-gray-600 dark:text-gray-400">Gestiona perfiles, RUTs y programas de fidelización</p>
                </div>
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  className="bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-corporate-blue/20 flex items-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  Nuevo Cliente
                </Button>
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

              <Card className="border-none shadow-sm overflow-hidden bg-white dark:bg-gray-800">
                <CardHeader className="border-b border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input 
                        placeholder="Buscar por nombre o RUT..." 
                        className="pl-10 h-11 bg-gray-50 dark:bg-gray-900 border-none rounded-xl"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                       <Button variant="outline" className="rounded-xl h-11 border-gray-200">
                          <Filter className="w-4 h-4 mr-2" />
                          Filtros
                       </Button>
                    </div>
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
                            <td colSpan={6} className="py-20 text-center">
                              <Loader2 className="w-8 h-8 animate-spin mx-auto text-corporate-blue mb-4" />
                              <p className="text-sm text-gray-500">Cargando clientes...</p>
                            </td>
                          </tr>
                        ) : filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-20 text-center">
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
                              {new Date(customer.createdAt).toLocaleDateString('es-CL')}
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
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
