'use client'

import React, { useState } from 'react'
import { 
  Users, Search, UserPlus, X, Loader2, CheckCircle2, 
  Award, Mail, User, Fingerprint 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog'
import { usePosStore } from '@/stores/posStore'
import { toast } from 'sonner'
import { formatRut, validateRut, cleanRut } from '@/lib/utils'

export default function CustomerModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { setCustomer } = usePosStore()
  const [rut, setRut] = useState('')
  const [loading, setLoading] = useState(false)
  const [foundCustomer, setFoundCustomer] = useState<any>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  
  // Registration fields
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [mounted, setMounted] = useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const resetState = () => {
    setRut('')
    setFoundCustomer(null)
    setIsRegistering(false)
    setRegName('')
    setRegEmail('')
    setLoading(false)
  }

  if (!mounted) return null

  const handleSearch = async () => {
    const cleaned = cleanRut(rut)
    if (!cleaned) return
    
    if (cleaned.length > 0 && !validateRut(cleaned)) {
      // Optional: show warning if invalid, but many POS allow "Anonymous/Test" RUTs
      // We'll proceed but maybe highlight
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/customers?rut=${cleaned}`)
      const data = await res.json()
      
      if (data) {
        setFoundCustomer(data)
        setIsRegistering(false)
      } else {
        setFoundCustomer(null)
        setIsRegistering(true)
        toast.info('Cliente no encontrado. Puedes registrarlo ahora.')
      }
    } catch (err) {
      toast.error('Error al buscar cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyIdentity = async () => {
    if (!foundCustomer) return
    setIsVerifying(true)
    try {
      const res = await fetch(`/api/customers/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: foundCustomer.id })
      })
      if (!res.ok) throw new Error('Error al verificar')
      
      setFoundCustomer({ ...foundCustomer, identity_verified: true })
      toast.success('Identidad verificada correctamente')
    } catch (err) {
      toast.error('Hubo un error al verificar la identidad')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleRegister = async () => {
    if (!regName) {
      toast.error('Nombre es requerido')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rut, name: regName, email: regEmail })
      })
      const data = await res.json()
      
      if (data.error) throw new Error(data.error)
      
      setFoundCustomer(data)
      setIsRegistering(false)
      toast.success('Cliente registrado exitosamente')
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = () => {
    if (foundCustomer) {
      setCustomer(
        foundCustomer.rut,
        foundCustomer.name,
        foundCustomer.loyalty_points ?? 0,
        foundCustomer.is_full_account,
        foundCustomer.identity_verified
      )
      onClose()
      resetState()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); resetState(); } }}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl overflow-hidden border-none shadow-2xl p-0">
        <DialogHeader className="p-8 bg-corporate-blue text-white relative overflow-hidden">
          <div className="relative z-10">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <Users className="w-8 h-8" />
              Gestión de Clientes
            </DialogTitle>
            <DialogDescription className="text-blue-100 font-medium">
              Vincular venta a un cliente para acumular puntos
            </DialogDescription>
          </div>
          <Users className="absolute -bottom-4 -right-4 w-40 h-40 text-white/10" />
        </DialogHeader>

        <div className="p-8 space-y-6">
          {!foundCustomer && !isRegistering && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Documento de Identidad (RUT)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input 
                      placeholder="12.345.678-9" 
                      className="h-14 pl-12 bg-gray-50 border-none rounded-2xl text-lg font-bold"
                      value={rut}
                      onChange={(e) => setRut(formatRut(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button 
                    onClick={handleSearch} 
                    disabled={loading || !rut}
                    className="h-14 px-6 bg-corporate-blue hover:bg-corporate-dark text-white rounded-2xl font-black transition-all"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 italic text-sm text-gray-500 text-center">
                Ingresa el RUT del cliente para buscar sus beneficios.
              </div>
            </div>
          )}

          {foundCustomer && !isRegistering && (
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-5">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <p className="text-emerald-600 font-black uppercase text-[10px] tracking-widest">Cliente Encontrado</p>
                  <h4 className="text-xl font-black text-gray-900">{foundCustomer.name}</h4>
                  <p className="text-sm font-mono text-gray-500">{foundCustomer.rut}</p>
                </div>
              </div>

              <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-between">
                <div>
                  <p className="text-amber-600 font-black uppercase text-[10px] tracking-widest leading-none">Puntos Acumulados</p>
                  <p className="text-3xl font-black text-amber-600 mt-1">{(foundCustomer.loyalty_points || 0).toLocaleString()} <span className="text-sm">pts</span></p>
                </div>
                <Award className="w-12 h-12 text-amber-500/30" />
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-2xl border text-center ${foundCustomer.is_full_account ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Estado Web</p>
                  <p className={`text-xs font-bold mt-1 ${foundCustomer.is_full_account ? 'text-blue-600' : 'text-gray-500'}`}>
                    {foundCustomer.is_full_account ? 'Socio Registrado' : 'Falta Registro Web'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border text-center ${foundCustomer.identity_verified ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                  <p className="text-[10px] uppercase font-black tracking-widest text-gray-400">Identidad</p>
                  <p className={`text-xs font-bold mt-1 ${foundCustomer.identity_verified ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {foundCustomer.identity_verified ? 'Verificado' : 'Pendiente Verif.'}
                  </p>
                </div>
              </div>

              {!foundCustomer.identity_verified && foundCustomer.is_full_account && (
                <Button 
                  onClick={handleVerifyIdentity}
                  disabled={isVerifying}
                  className="w-full h-12 bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Fingerprint className="w-4 h-4" />}
                  Verificar con Cédula
                </Button>
              )}
              
              {!foundCustomer.is_full_account && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-[10px] text-amber-700 font-bold text-center">
                    EL CLIENTE DEBE COMPLETAR SU REGISTRO EN AUSTRAL.CL PARA CANJE DE PUNTOS
                  </p>
                </div>
              )}
            </div>
          )}

          {isRegistering && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl text-blue-700 text-sm font-bold border border-blue-100">
                <UserPlus className="w-5 h-5" />
                Nuevo Registro: {rut}
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input 
                    placeholder="Ej: Juan Pérez" 
                    className="h-14 pl-12 bg-gray-50 border-none rounded-2xl font-bold"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">E-mail (Opcional)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input 
                    placeholder="ejemplo@email.com" 
                    className="h-14 pl-12 bg-gray-50 border-none rounded-2xl font-bold"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 pt-0 flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => { resetState(); isRegistering ? setIsRegistering(false) : onClose(); }}
            className="flex-1 h-16 rounded-2xl font-black border-2 border-gray-100 text-gray-500"
          >
            {isRegistering ? 'Volver' : 'Cancelar'}
          </Button>
          
          {foundCustomer && (
            <Button 
              onClick={handleSelect}
              className="flex-1 h-16 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-500/20"
            >
              Vincular Cliente
            </Button>
          )}

          {isRegistering && (
            <Button 
              onClick={handleRegister}
              disabled={loading || !regName}
              className="flex-1 h-16 rounded-2xl font-black bg-corporate-blue hover:bg-corporate-dark text-white shadow-xl shadow-corporate-blue/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registrar y Vincular'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
