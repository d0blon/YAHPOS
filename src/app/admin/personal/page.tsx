'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HardHat, Store, Package, ShoppingCart, Beef, Search, Clock, ShieldAlert, Plus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newStaff, setNewStaff] = useState({ 
    rut: '', 
    first_name: '', 
    last_name: '', 
    role: 'manager' 
  })

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

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStaff)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al agregar trabajador')
      }
      const data = await res.json()
      
      // Update local state if not already there (prevent double entries if polling happens)
      setStaff(prev => {
        if (prev.some(s => s.id === data.id)) return prev
        return [...prev, data]
      })
      
      setIsAddModalOpen(false)
      setNewStaff({ rut: '', first_name: '', last_name: '', role: 'manager' })
      toast.success('Trabajador agregado correctamente')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveStaff = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar a este trabajador?')) return
    
    try {
      const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar trabajador')
      setStaff(prev => prev.filter(s => s.id !== id))
      toast.success('Trabajador eliminado correctamente')
    } catch (err: any) {
      toast.error(err.message)
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Gestión de <span className="text-blue-500">Personal</span>
          </h1>
          <p className="text-white/50 text-sm font-medium">Asignación y monitoreo de áreas de trabajo en vivo</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white/5 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl">
          <div className="px-6 py-2 text-center">
            <p className="text-3xl font-black text-emerald-500">{activeStaffCount}</p>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Activos</p>
          </div>
          <div className="w-px h-10 bg-white/10"></div>
          <div className="px-6 py-2 text-center">
            <p className="text-3xl font-black text-white/30">{staff.length - activeStaffCount}</p>
            <p className="text-[10px] uppercase font-black tracking-widest text-white/40">Ausentes</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white/5 backdrop-blur-xl p-4 rounded-3xl border border-white/10 shadow-2xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
          <input 
            type="text" 
            placeholder="Buscar trabajador por nombre o RUT..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-black/20 border border-white/5 rounded-2xl text-lg font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-white/20"
          />
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white rounded-2xl px-8 h-14 font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all hover:scale-105 border-none"
        >
          <Plus className="w-4 h-4" />
          Nuevo Trabajador
        </Button>
      </div>

      {/* Staff Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredStaff.map(worker => {
            const currentAreaConfig = AREAS.find(a => a.id === worker.current_area) || AREAS[6]
            const AreaIcon = currentAreaConfig.icon
            const fullName = `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || 'Sin Nombre'
            const isRecentlyUpdated = new Date().getTime() - new Date(worker.updated_at).getTime() < 3600000;

            return (
              <Card key={worker.id} className="overflow-hidden border border-white/5 bg-white/5 backdrop-blur-xl hover:border-blue-500/30 transition-all duration-300 shadow-xl group rounded-3xl">
                <div className="p-5 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center font-bold text-white/70 text-lg border border-white/10">
                      {fullName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white leading-tight">{fullName}</h3>
                      <div className="mt-1">
                        <select 
                          value={worker.role}
                          onChange={(e) => handleRoleChange(worker.id, e.target.value)}
                          className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 focus:ring-1 focus:ring-blue-500/40"
                        >
                          {ROLES.map(role => (
                            <option key={role.id} value={role.id}>{role.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isRecentlyUpdated && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-1" title="Activo recientemente" />
                    )}
                    <button 
                      onClick={() => handleRemoveStaff(worker.id)}
                      className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Eliminar trabajador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2 block">Área Actual</label>
                  <div className="relative">
                    <select
                      value={worker.current_area || 'Ausente'}
                      onChange={(e) => handleAreaChange(worker.id, e.target.value)}
                      className={cn(
                        "w-full appearance-none px-4 py-3 pl-11 rounded-2xl text-sm font-bold transition-all border border-white/5 cursor-pointer focus:outline-none focus:ring-4 focus:ring-blue-500/20",
                        currentAreaConfig.id === 'Ausente' ? "bg-white/5 text-white/40" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      )}
                    >
                      {AREAS.map(area => (
                        <option key={area.id} value={area.id} className="bg-gray-900 text-white">{area.id}</option>
                      ))}
                    </select>
                    <AreaIcon className={cn("absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4", currentAreaConfig.id === 'Ausente' ? "text-white/30" : "text-blue-400")} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Staff Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl bg-[#0f0f12] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Nuevo Trabajador</DialogTitle>
            <DialogDescription className="text-white/50">
              Agrega un nuevo miembro al equipo. Si el RUT ya existe, se promoverá a personal.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddStaff} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rut" className="text-white/70">RUT</Label>
              <Input 
                id="rut" 
                placeholder="12.345.678-9" 
                value={newStaff.rut}
                onChange={e => setNewStaff({...newStaff, rut: e.target.value})}
                required
                className="rounded-xl bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name" className="text-white/70">Nombre</Label>
                <Input 
                  id="first_name" 
                  placeholder="Juan" 
                  value={newStaff.first_name}
                  onChange={e => setNewStaff({...newStaff, first_name: e.target.value})}
                  required
                  className="rounded-xl bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name" className="text-white/70">Apellido</Label>
                <Input 
                  id="last_name" 
                  placeholder="Pérez" 
                  value={newStaff.last_name}
                  onChange={e => setNewStaff({...newStaff, last_name: e.target.value})}
                  className="rounded-xl bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-white/70">Rol / Cargo</Label>
              <select 
                id="role"
                value={newStaff.role}
                onChange={e => setNewStaff({...newStaff, role: e.target.value})}
                className="w-full flex h-10 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500/50"
              >
                {ROLES.map(role => (
                  <option key={role.id} value={role.id} className="bg-gray-900">{role.label}</option>
                ))}
              </select>
            </div>
            <DialogFooter className="pt-4">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-6 font-bold text-lg shadow-xl shadow-blue-500/20 border-none"
              >
                {isSubmitting ? 'Guardando...' : 'Crear Trabajador'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
