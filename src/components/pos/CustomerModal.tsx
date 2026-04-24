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
import { formatRut, validateRut, cleanRut, cn } from '@/lib/utils'

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
      const res = await fetch(`/api/customers?rut=${encodeURIComponent(rut)}`)
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
      <DialogContent className="max-w-[550px] bg-white dark:bg-slate-900 rounded-[3rem] overflow-hidden border-none shadow-2xl p-0 text-slate-900 dark:text-white animate-in zoom-in-95 duration-500">
        <DialogHeader className="p-10 bg-patagonia-600 dark:bg-slate-800 text-white relative overflow-hidden shrink-0">
          <div className="relative z-10">
            <DialogTitle className="text-3xl font-black flex items-center gap-4 italic tracking-tighter uppercase">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Users className="w-7 h-7 text-white" />
              </div>
              Gestión Clientes
            </DialogTitle>
            <DialogDescription className="text-blue-100 dark:text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-3">
              Fidelización y Beneficios Patagonia
            </DialogDescription>
          </div>
          <Users className="absolute -bottom-10 -right-10 w-56 h-56 text-white/10 rotate-12" />
        </DialogHeader>

        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar max-h-[60vh]">
          {!foundCustomer && !isRegistering && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-6">Documento Identidad (RUT)</label>
                <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    <Fingerprint className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-patagonia-500 transition-colors" />
                    <Input 
                      placeholder="12.345.678-9" 
                      className="h-20 pl-16 bg-slate-50 dark:bg-slate-800/50 border-none rounded-[2rem] text-2xl font-black text-slate-900 dark:text-white focus-visible:ring-4 focus-visible:ring-patagonia-600/20 transition-all tracking-tight"
                      value={rut}
                      onChange={(e) => setRut(formatRut(e.target.value))}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <Button 
                    onClick={handleSearch} 
                    disabled={loading || !rut}
                    className="h-20 w-20 bg-patagonia-600 hover:bg-patagonia-700 text-white rounded-[2rem] shadow-xl shadow-patagonia-600/30 active:scale-95 transition-all p-0"
                  >
                    {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Search className="w-8 h-8" />}
                  </Button>
                </div>
              </div>
              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex items-start gap-4">
                <div className="w-10 h-10 bg-patagonia-600/10 rounded-xl flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5 text-patagonia-600" />
                </div>
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed uppercase tracking-wider">
                  Identifica al cliente para aplicar descuentos exclusivos y acumular puntos en su cuenta personal.
                </p>
              </div>
            </div>
          )}

          {foundCustomer && !isRegistering && (
            <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <div className="p-8 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-[2.5rem] flex items-center gap-6 relative overflow-hidden">
                <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-emerald-500/30 relative z-10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="flex-1 relative z-10">
                  <p className="text-emerald-600 dark:text-emerald-400 font-black uppercase text-[10px] tracking-[0.3em] mb-1">Cliente VIP</p>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{foundCustomer.name}</h4>
                  <p className="text-sm font-black text-slate-400 mt-2 font-mono">{foundCustomer.rut}</p>
                </div>
                <div className="absolute right-0 top-0 w-32 h-full bg-emerald-500/5 -skew-x-12 translate-x-8" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-8 bg-amber-500/10 border-2 border-amber-500/20 rounded-[2.5rem] relative overflow-hidden group">
                  <p className="text-amber-600 dark:text-amber-500 font-black uppercase text-[10px] tracking-[0.3em] leading-none mb-3">Puntos Fidelidad</p>
                  <p className="text-5xl font-black text-amber-600 tracking-tighter">
                    {(foundCustomer.loyalty_points || 0).toLocaleString()} 
                    <span className="text-xs uppercase tracking-widest ml-2">PTS</span>
                  </p>
                  <Award className="absolute -bottom-4 -right-4 w-20 h-20 text-amber-500/10 group-hover:scale-110 transition-transform" />
                </div>

                <div className="space-y-4">
                    <div className={cn(
                        "p-4 rounded-2xl border-2 flex items-center justify-between",
                        foundCustomer.is_full_account ? "bg-blue-500/10 border-blue-500/20" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                    )}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Socio Web</span>
                        <span className={cn("text-[10px] font-black uppercase", foundCustomer.is_full_account ? "text-blue-600" : "text-slate-400")}>
                            {foundCustomer.is_full_account ? 'ACTIVO' : 'PENDIENTE'}
                        </span>
                    </div>
                    <div className={cn(
                        "p-4 rounded-2xl border-2 flex items-center justify-between",
                        foundCustomer.identity_verified ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                    )}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identidad</span>
                        <span className={cn("text-[10px] font-black uppercase", foundCustomer.identity_verified ? "text-emerald-600" : "text-rose-600")}>
                            {foundCustomer.identity_verified ? 'VERIFICADA' : 'NO VERIF.'}
                        </span>
                    </div>
                </div>
              </div>

              {!foundCustomer.identity_verified && foundCustomer.is_full_account && (
                <Button 
                  onClick={handleVerifyIdentity}
                  disabled={isVerifying}
                  className="w-full h-16 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
                >
                  {isVerifying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                  Validar Identidad Presencial
                </Button>
              )}
            </div>
          )}

          {isRegistering && (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
              <div className="flex items-center gap-4 p-6 bg-patagonia-600/10 rounded-[2rem] text-patagonia-600 dark:text-patagonia-400 border border-patagonia-600/20">
                <div className="p-3 bg-patagonia-600 rounded-xl text-white">
                    <UserPlus className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest">Nuevo Registro</p>
                    <p className="text-xl font-black tracking-tight">{rut}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-6">Nombre Completo</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-patagonia-500 transition-colors" />
                  <Input 
                    placeholder="Ej: Juan Pérez" 
                    className="h-16 pl-16 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl font-black text-slate-900 dark:text-white focus-visible:ring-4 focus-visible:ring-patagonia-600/20"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 ml-6">Correo Electrónico</label>
                <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within:text-patagonia-500 transition-colors" />
                  <Input 
                    placeholder="ejemplo@patagonia.cl" 
                    className="h-16 pl-16 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl font-black text-slate-900 dark:text-white focus-visible:ring-4 focus-visible:ring-patagonia-600/20"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-10 pt-0 flex flex-col sm:flex-row gap-4 shrink-0">
          <Button 
            variant="ghost" 
            onClick={() => { resetState(); isRegistering ? setIsRegistering(false) : onClose(); }}
            className="flex-1 h-20 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            {isRegistering ? '← Volver' : 'Cancelar'}
          </Button>
          
          {foundCustomer && (
            <Button 
              onClick={handleSelect}
              className="flex-1 h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xl shadow-emerald-500/40 active:scale-[0.98] transition-all"
            >
              Vincular a Venta
            </Button>
          )}

          {isRegistering && (
            <Button 
              onClick={handleRegister}
              disabled={loading || !regName}
              className="flex-1 h-20 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs bg-patagonia-600 hover:bg-patagonia-700 text-white shadow-2xl shadow-patagonia-600/40 active:scale-[0.98] transition-all"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Registrar y Vincular'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
