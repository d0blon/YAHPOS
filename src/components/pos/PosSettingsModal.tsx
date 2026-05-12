'use client'

import React from 'react'
import { X, Shield, Lock, EyeOff, Save, Info, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePosStore, PosSettings } from '@/stores/posStore'
import { toast } from 'sonner'

interface PosSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function PosSettingsModal({ isOpen, onClose }: PosSettingsModalProps) {
  const { settings, updateSettings, logEvent } = usePosStore()
  const [isSaving, setIsSaving] = React.useState(false)
  const [newPin, setNewPin] = React.useState(settings.supervisorPin || '')

  if (!isOpen) return null

  const handleToggle = async (key: keyof PosSettings) => {
    setIsSaving(true)
    try {
      const newVal = !settings[key]
      await updateSettings({ [key]: newVal })
      logEvent({ 
        type: 'AUTH_SUCCESS', 
        details: `Ajuste ${key} cambiado a ${newVal}` 
      })
      toast.success('Ajuste actualizado correctamente')
    } catch (error) {
      toast.error('Error al actualizar ajuste')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    setNewPin(val)
  }

  const savePin = async () => {
    if (newPin.length < 4) {
      toast.error('El PIN debe tener al menos 4 dígitos')
      return
    }
    setIsSaving(true)
    try {
      await updateSettings({ supervisorPin: newPin })
      toast.success('PIN de Supervisor actualizado')
    } catch (error) {
      toast.error('Error al actualizar PIN')
    } finally {
      setIsSaving(false)
    }
  }

  const handleLoyaltyChange = async (update: any) => {
    setIsSaving(true)
    try {
      await updateSettings({ loyalty: { ...settings.loyalty!, ...update } })
      toast.success('Programa de lealtad actualizado')
    } catch (error) {
      toast.error('Error al actualizar lealtad')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-8 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[95vh] md:max-h-[85vh] rounded-[2rem] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Sticky Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-md rounded-t-[2rem] shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
             <div className="p-2 sm:p-3 bg-patagonia-600 text-white rounded-xl sm:rounded-2xl shadow-md">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
             </div>
             <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Configuración POS</h2>
                <p className="text-slate-500 dark:text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden sm:block">Seguridad y Reglas de Negocio</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 sm:p-3 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all active:scale-95 text-slate-500">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Setting 1: Blind Closure */}
            <div className="flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-patagonia-600/20 transition-all bg-card cursor-pointer" onClick={() => handleToggle('blindClosureEnabled')}>
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${settings.blindClosureEnabled ? 'bg-patagonia-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <EyeOff className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all relative ${settings.blindClosureEnabled ? 'bg-patagonia-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.blindClosureEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1">Caja Ciega</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">Cajeros declaran efectivo sin ver totales del sistema.</p>
            </div>

            {/* Setting 2: PIN for Delete */}
            <div className="flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-orange-500/20 transition-all bg-card cursor-pointer" onClick={() => handleToggle('pinRequiredForDelete')}>
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${settings.pinRequiredForDelete ? 'bg-orange-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Lock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all relative ${settings.pinRequiredForDelete ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.pinRequiredForDelete ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1">PIN de Borrado</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">Solicitar PIN de manager para quitar productos.</p>
            </div>

            {/* Setting 3: Junaeb / Edenred */}
            <div className="flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-rose-500/20 transition-all bg-card cursor-pointer" onClick={() => handleToggle('junaebEnabled')}>
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${settings.junaebEnabled ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <span className="font-black text-lg sm:text-xl">J</span>
                </div>
                <div className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all relative ${settings.junaebEnabled ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.junaebEnabled ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1">Pagos Junaeb</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">Habilitar validación de sellos y pago interno.</p>
              
              {settings.junaebEnabled && (
                <div className="mt-4 pt-4 border-t border-rose-500/10 space-y-2 animate-in slide-in-from-top-2" onClick={(e) => e.stopPropagation()}>
                   <label className="text-[9px] font-black text-rose-500 uppercase tracking-widest ml-1">Límite Máximo de Sellos</label>
                   <Input 
                     type="number" 
                     value={settings.maxSeals || 2} 
                     onChange={(e) => updateSettings({ maxSeals: parseInt(e.target.value) })}
                     className="h-10 rounded-xl border-rose-200 dark:border-rose-900 dark:bg-slate-950 font-bold text-sm"
                   />
                </div>
              )}
            </div>

            {/* Setting 4: SII Emission Model */}
            <div className="flex flex-col p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 hover:border-emerald-500/20 transition-all bg-card cursor-pointer" 
              onClick={() => updateSettings({ siiModel: settings.siiModel === 'SII_ALWAYS' ? 'SII_VOUCHER_SKIP' : 'SII_ALWAYS' })}>
              <div className="flex justify-between items-start mb-3 sm:mb-4">
                <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${settings.siiModel === 'SII_VOUCHER_SKIP' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div className={`w-10 h-5 sm:w-12 sm:h-6 rounded-full transition-all relative ${settings.siiModel === 'SII_VOUCHER_SKIP' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
                  <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${settings.siiModel === 'SII_VOUCHER_SKIP' ? 'right-1' : 'left-1'}`} />
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mb-1">Modelo de Emisión</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold">
                {settings.siiModel === 'SII_VOUCHER_SKIP' 
                  ? 'VOUCHER COMO BOLETA: No se emite boleta SII en pagos con tarjeta.' 
                  : 'EMISIÓN SIEMPRE: Se emite boleta SII para todos los métodos de pago.'}
              </p>
            </div>
          </div>

          {/* Region Selector */}
          <div className="p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border-2 border-slate-100 dark:border-slate-800 bg-card">
            <label className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Región de operación</label>
            <select 
              value={settings.region || 'REGIONES'}
              onChange={(e) => updateSettings({ region: e.target.value as 'RM' | 'REGIONES' })}
              className="mt-2 w-full h-12 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm bg-white dark:bg-slate-900 dark:text-white px-4 focus:ring-2 focus:ring-patagonia-600/20 focus:border-patagonia-600 transition-all"
            >
              <option value="RM">Región Metropolitana</option>
              <option value="REGIONES">Regiones</option>
            </select>
          </div>

          {/* Loyalty Settings */}
          <div className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl sm:rounded-2xl">
                   <Info className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                   <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">Programa de Lealtad</h3>
                   <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Configuración de Puntos</p>
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 sm:space-y-2">
                   <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 sm:ml-2">Acumulación (%)</label>
                   <Input 
                     type="number" 
                     value={(settings.loyalty?.accumulationRate || 0) * 100} 
                     onChange={(e) => updateSettings({ loyalty: { ...settings.loyalty!, accumulationRate: parseFloat(e.target.value) / 100 } })}
                     className="h-10 sm:h-12 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 font-bold text-sm sm:text-base"
                   />
                </div>
                <div className="space-y-1 sm:space-y-2">
                   <label className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 sm:ml-2">Valor Punto ($)</label>
                   <Input 
                     type="number" 
                     value={settings.loyalty?.redemptionRate} 
                     onChange={(e) => updateSettings({ loyalty: { ...settings.loyalty!, redemptionRate: parseFloat(e.target.value) } })}
                     className="h-10 sm:h-12 rounded-xl border-slate-200 dark:border-slate-700 dark:bg-slate-900 font-bold text-sm sm:text-base"
                   />
                </div>
             </div>
          </div>

          {/* Setting 3: Supervisor PIN */}
          <div className="p-4 sm:p-6 md:p-8 bg-slate-900 rounded-2xl sm:rounded-[2.5rem] text-white shadow-xl shadow-slate-900/40">
             <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl">
                   <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                </div>
                <div>
                   <h3 className="text-lg sm:text-xl font-black">Cambiar PIN Maestro</h3>
                   <p className="text-[9px] sm:text-xs text-white/50 font-bold uppercase tracking-tight">Clave numérica (4-6 req)</p>
                </div>
             </div>
             <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Input 
                  type="password"
                  value={newPin}
                  onChange={handlePinChange}
                  className="h-12 sm:h-14 flex-1 bg-white/5 border-white/10 text-xl sm:text-2xl font-black text-center tracking-[0.5em] rounded-xl sm:rounded-2xl focus:ring-orange-400 focus:border-orange-400"
                  placeholder="****"
                />
                <Button onClick={savePin} className="h-12 sm:h-14 px-6 sm:px-8 bg-orange-500 hover:bg-orange-600 rounded-xl sm:rounded-2xl font-black gap-2 transition-all shadow-lg active:scale-95 w-full sm:w-auto">
                   <Save className="w-5 h-5 sm:w-6 sm:h-6" /> <span className="hidden sm:inline">ACTUALIZAR</span><span className="sm:hidden">GUARDAR</span>
                </Button>
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}
