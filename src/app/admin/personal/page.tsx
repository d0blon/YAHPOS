'use client'

import React, { useState } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HardHat, Store, Package, ShoppingCart, Beef, Search, Clock, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// Defines the Staff type matching our DB
type StaffProfile = {
  id: string
  first_name: string
  last_name: string
  role: string
  current_area: string
  updated_at: string
}

const AREAS = [
  { id: 'Caja 1', icon: Store, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  { id: 'Caja 2', icon: Store, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
  { id: 'Carnicería', icon: Beef, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  { id: 'Bodega', icon: Package, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  { id: 'Reposición', icon: ShoppingCart, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  { id: 'Supervisión', icon: ShieldAlert, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-200' },
  { id: 'Ausente', icon: Clock, color: 'text-gray-400', bg: 'bg-gray-50 border-gray-200 text-gray-400 opacity-75' },
]

export default function PersonalDashboard() {
  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  React.useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await fetch('/api/staff')
        if (res.ok) {
          const data = await res.json()
          setStaff(data)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStaff()
    
    // Configurar polling cada 15 segundos para dar la sensación de tiempo real sin saturar
    const interval = setInterval(fetchStaff, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleAreaChange = async (staffId: string, newArea: string) => {
    // Optimistic UI Update
    const originalStaff = [...staff]
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, current_area: newArea } : s))
    
    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffId, current_area: newArea })
      })
      if (!res.ok) throw new Error('Error de conexión')
      toast.success(`Área asignada correctamente.`)
    } catch (err) {
      toast.error('No se pudo guardar la asignación')
      setStaff(originalStaff) // Rollback
    }
  }

  const handleRoleChange = async (staffId: string, newRole: string) => {
    // Optimistic UI Update
    const originalStaff = [...staff]
    setStaff(prev => prev.map(s => s.id === staffId ? { ...s, role: newRole } : s))
    
    try {
      const res = await fetch('/api/staff', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: staffId, role: newRole })
      })
      if (!res.ok) throw new Error('Error de conexión')
      toast.success(`Rango actualizado correctamente.`)
    } catch (err) {
      toast.error('No se pudo actualizar el rango')
      setStaff(originalStaff) // Rollback
    }
  }

  const filteredStaff = staff.filter(s => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.trim()
    return fullName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // Roles Definition
  const ROLES = [
    { id: 'admin', label: 'Administrador' },
    { id: 'manager', label: 'Encargado' },
    { id: 'cashier', label: 'Cajero' },
    { id: 'warehouse', label: 'Bodega' },
  ]

  // 'Ausente' or null/empty is treated as absent
  const activeStaffCount = staff.filter(s => s.current_area && s.current_area !== 'Ausente' && s.current_area !== 'Inactivo').length

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <AdminSidebar activePath="/admin/personal" />

            <div className="flex-1 space-y-6">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-corporate-blue text-white rounded-xl shadow-lg shadow-corporate-blue/20">
                      <HardHat className="w-6 h-6" />
                    </div>
                    Gestión de Personal
                  </h1>
                  <p className="text-gray-500 mt-2 font-medium">Asignación y monitoreo de áreas de trabajo en vivo.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="px-4 py-2 text-center">
                    <p className="text-2xl font-black text-emerald-600">{activeStaffCount}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Activos</p>
                  </div>
                  <div className="w-px h-8 bg-gray-100 dark:bg-gray-700"></div>
                  <div className="px-4 py-2 text-center">
                    <p className="text-2xl font-black text-gray-400">{staff.length - activeStaffCount}</p>
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Ausentes</p>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar trabajador..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-corporate-blue/50 text-sm font-medium transition-all"
                  />
                </div>
              </div>

              {/* Staff Grid */}
              {isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corporate-blue"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredStaff.map(worker => {
                    const currentAreaConfig = AREAS.find(a => a.id === worker.current_area) || AREAS[6] // Index 6 is Ausente
                    const AreaIcon = currentAreaConfig.icon
                    const fullName = `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Sin Nombre'
                    
                    // Simple relative time display
                    const isRecentlyUpdated = new Date().getTime() - new Date(worker.updated_at).getTime() < 3600000;

                    return (
                      <Card key={worker.id} className="overflow-hidden border-2 border-transparent hover:border-corporate-blue/20 transition-all duration-300 shadow-sm hover:shadow-xl group">
                        <div className="p-5 flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-lg">
                              {fullName.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{fullName}</h3>
                              <div className="mt-1">
                                <select 
                                  value={worker.role}
                                  onChange={(e) => handleRoleChange(worker.id, e.target.value)}
                                  className="text-[10px] font-bold uppercase tracking-widest text-corporate-blue bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border-none focus:ring-1 focus:ring-corporate-blue/40"
                                >
                                  {ROLES.map(role => (
                                    <option key={role.id} value={role.id}>{role.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                          {isRecentlyUpdated && (
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1" title="Activo recientemente" />
                          )}
                        </div>

                        <div className="px-5 pb-5 pt-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Área Actual</label>
                          <div className="relative">
                            <select
                              value={worker.current_area || 'Ausente'}
                              onChange={(e) => handleAreaChange(worker.id, e.target.value)}
                              className={cn(
                                "w-full appearance-none px-4 py-3 pl-11 rounded-xl text-sm font-bold transition-all border-2 cursor-pointer focus:outline-none focus:ring-4 focus:ring-corporate-blue/20",
                                currentAreaConfig.bg,
                                currentAreaConfig.color
                              )}
                            >
                              {AREAS.map(area => (
                                <option key={area.id} value={area.id}>{area.id}</option>
                              ))}
                            </select>
                            <AreaIcon className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", currentAreaConfig.color)} />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
