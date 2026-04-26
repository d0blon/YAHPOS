'use client'

import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { 
  Store, 
  Plus, 
  MapPin, 
  Phone, 
  Trash2, 
  Edit2, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Map, 
  Search,
  Users,
  Building
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { SectionCard, SectionHeader } from '@/components/admin/SectionCard'

interface Branch {
  id: string
  name: string
  address: string
  phone: string
  is_active: boolean
  manager_name?: string
  created_at: string
}

export default function SucursalesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    is_active: true
  })

  useEffect(() => {
    fetchBranches()
  }, [])

  async function fetchBranches() {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      if (data) setBranches(data)
    } catch (error: any) {
      toast.error('Error al cargar sucursales: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch)
      setFormData({
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        is_active: branch.is_active
      })
    } else {
      setEditingBranch(null)
      setFormData({
        name: '',
        address: '',
        phone: '',
        is_active: true
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingBranch) {
        const { error } = await supabase
          .from('branches')
          .update(formData)
          .eq('id', editingBranch.id)
        
        if (error) throw error
        toast.success('Sucursal actualizada correctamente')
      } else {
        const { error } = await supabase
          .from('branches')
          .insert([formData])
        
        if (error) throw error
        toast.success('Sucursal creada correctamente')
      }
      
      setIsModalOpen(false)
      fetchBranches()
    } catch (error: any) {
      toast.error('Error al guardar: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sucursal?')) return

    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      toast.success('Sucursal eliminada')
      fetchBranches()
    } catch (error: any) {
      toast.error('Error al eliminar: ' + error.message)
    }
  }

  const filteredBranches = branches.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.address.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const activeBranches = branches.filter(b => b.is_active).length
  const regionsCount = new Set(branches.map(b => b.address.split(',').pop()?.trim())).size

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#0d001a] pt-24 pb-20 mesh-bg">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-8">
            <AdminSidebar activePath="/admin/sucursales" />

            <div className="flex-1 space-y-8 animate-fade-in">
              {/* Header section with harmonized style */}
              <SectionHeader 
                title="Gestión de Sucursales"
                subtitle="Administra tus puntos de venta físicos y centros de distribución estratégica"
                icon={Building2}
                actions={
                  <Button 
                    onClick={() => handleOpenModal()}
                    className="bg-corporate-blue hover:bg-corporate-dark text-white rounded-2xl px-8 h-14 font-black uppercase tracking-widest shadow-xl shadow-corporate-blue/20 flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="w-6 h-6" />
                    Nueva Sucursal
                  </Button>
                }
              />

              {/* Stats Grid - Premium look */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Locales', value: branches.length, icon: Store, color: 'text-corporate-blue', bg: 'bg-corporate-blue/10' },
                  { label: 'Operativas', value: activeBranches, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Regiones', value: regionsCount || 0, icon: Map, color: 'text-amber-500', bg: 'bg-amber-500/10' }
                ].map((stat, i) => (
                  <SectionCard key={i} className="p-6">
                    <div className="flex items-center gap-5">
                      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110", stat.bg, stat.color)}>
                        <stat.icon className="w-9 h-9" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{stat.label}</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter italic">{stat.value}</h3>
                      </div>
                    </div>
                  </SectionCard>
                ))}
              </div>

              {/* Search Bar - Harmonized */}
              <SectionCard className="p-2 border border-white/5 backdrop-blur-xl bg-white/5">
                <div className="flex items-center gap-4 px-4">
                  <Search className="w-6 h-6 text-gray-500" />
                  <Input 
                    placeholder="Filtrar por nombre, dirección o referencia..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 bg-transparent border-none text-lg font-medium text-white placeholder:text-gray-600 focus-visible:ring-0 h-14"
                  />
                  <div className="hidden md:flex items-center gap-2 px-4 border-l border-white/10">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Live Sincronizado</span>
                  </div>
                </div>
              </SectionCard>

              {/* Main Content Area */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-6">
                  <div className="w-16 h-16 border-4 border-corporate-blue border-t-transparent rounded-full animate-spin"></div>
                  <p className="font-black text-gray-500 uppercase tracking-widest text-sm animate-pulse">Sincronizando Nodos...</p>
                </div>
              ) : filteredBranches.length === 0 ? (
                <SectionCard className="text-center py-32 border-dashed border-2 border-white/5">
                  <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Building className="w-12 h-12 text-gray-700" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Sin resultados</h3>
                  <p className="text-gray-500 mt-2 font-medium">No se encontraron sucursales bajo estos criterios.</p>
                  <Button 
                    onClick={() => handleOpenModal()}
                    variant="outline" 
                    className="mt-8 rounded-2xl border-white/10 text-white hover:bg-white/5 px-8 h-12"
                  >
                    Registrar Nueva Unidad
                  </Button>
                </SectionCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {filteredBranches.map((branch) => (
                    <div 
                      key={branch.id} 
                      className="group relative glass-card p-8 rounded-[2.5rem] border-none hover:translate-y-[-8px] transition-all duration-500"
                    >
                      <div className="flex justify-between items-start mb-10">
                        <div className="w-16 h-16 rounded-3xl bg-corporate-blue/10 flex items-center justify-center text-corporate-blue group-hover:bg-corporate-blue group-hover:text-white transition-all duration-500 shadow-lg shadow-corporate-blue/5">
                          <Store className="w-8 h-8" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={cn(
                            "rounded-full px-4 py-1.5 font-black uppercase tracking-[0.15em] text-[10px] border-none",
                            branch.is_active 
                              ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]" 
                              : "bg-red-500/10 text-red-400"
                          )}>
                            {branch.is_active ? '● Activa' : '○ Inactiva'}
                          </Badge>
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-tighter font-mono">
                            #ID_{branch.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <div>
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white group-hover:text-corporate-blue transition-colors duration-300">
                            {branch.name}
                          </h3>
                          <div className="flex items-start gap-2 mt-3 text-gray-400">
                            <MapPin className="w-4 h-4 shrink-0 text-corporate-blue mt-0.5" />
                            <p className="text-sm font-medium leading-relaxed italic">{branch.address}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-8 border-t border-white/5">
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Contacto</p>
                            <div className="flex items-center gap-2 text-gray-300">
                              <Phone className="w-4 h-4 text-corporate-blue" />
                              <span className="text-sm font-black tracking-tight">{branch.phone || 'S/N'}</span>
                            </div>
                          </div>
                          <div className="space-y-1.5 text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-600">Responsable</p>
                            <div className="flex items-center justify-end gap-2 text-gray-300">
                              <Users className="w-4 h-4 text-corporate-blue" />
                              <span className="text-sm font-black truncate max-w-[120px]">{branch.manager_name || 'Pendiente'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-10 flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => handleOpenModal(branch)}
                          className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] border-white/5 bg-white/5 hover:bg-corporate-blue hover:text-white transition-all shadow-lg"
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => handleDelete(branch.id)}
                          className="rounded-2xl h-12 w-12 p-0 font-black text-red-500 border-white/5 bg-white/5 hover:bg-red-500 hover:text-white transition-all shadow-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Sucursal - Premium Glassmorphism */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-[#150024] border-white/10 rounded-[3rem] overflow-hidden p-0 shadow-2xl backdrop-blur-2xl">
          <div className="h-2 w-full bg-gradient-to-r from-corporate-blue to-purple-500" />
          
          <DialogHeader className="p-10 pb-0">
            <DialogTitle className="text-4xl font-black text-white tracking-tighter uppercase italic">
              {editingBranch ? 'Actualizar' : 'Registrar'} <span className="text-corporate-blue">Sucursal</span>
            </DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-base mt-2">
              Configura los parámetros operativos de tu unidad de negocio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-10 pt-8 space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Identificador Público</Label>
                <div className="relative group">
                  <Store className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-corporate-blue transition-transform group-focus-within:scale-110" />
                  <Input 
                    id="name"
                    placeholder="Ej: Austral Market Central"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                    className="pl-14 py-8 bg-white/5 border-white/10 rounded-2xl font-black text-white placeholder:text-gray-700 focus:border-corporate-blue/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Ubicación Geo-Referencial</Label>
                <div className="relative group">
                  <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-corporate-blue transition-transform group-focus-within:scale-110" />
                  <Input 
                    id="address"
                    placeholder="Dirección exacta, Ciudad"
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    required
                    className="pl-14 py-8 bg-white/5 border-white/10 rounded-2xl font-black text-white placeholder:text-gray-700 focus:border-corporate-blue/50 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Canal Telefónico</Label>
                  <div className="relative group">
                    <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-corporate-blue" />
                    <Input 
                      id="phone"
                      placeholder="+56 9 ..."
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="pl-14 py-8 bg-white/5 border-white/10 rounded-2xl font-black text-white placeholder:text-gray-700 focus:border-corporate-blue/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 ml-1">Estado de Red</Label>
                  <div 
                    onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                    className={cn(
                      "flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all h-[64px]",
                      formData.is_active 
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" 
                        : "bg-red-500/10 border-red-500/40 text-red-400"
                    )}
                  >
                    <span className="font-black uppercase tracking-widest text-[11px] italic">
                      {formData.is_active ? 'Online' : 'Offline'}
                    </span>
                    {formData.is_active ? <CheckCircle2 className="w-6 h-6 shadow-[0_0_10px_rgba(16,185,129,0.5)]" /> : <XCircle className="w-6 h-6 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full bg-corporate-blue hover:bg-corporate-dark text-white rounded-[1.5rem] py-10 font-black text-xl uppercase tracking-widest shadow-2xl shadow-corporate-blue/20 transition-all hover:scale-[1.02] active:scale-95 border-t border-white/20"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-4">
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Procesando...</span>
                  </div>
                ) : (
                  editingBranch ? 'Guardar Cambios Maestros' : 'Desplegar Sucursal'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  )
}
