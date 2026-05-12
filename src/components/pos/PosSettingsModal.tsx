'use client'

import React from 'react'
import { 
  X, 
  ShieldCheck, 
  Receipt, 
  Wallet, 
  CreditCard, 
  Star,
  Settings2,
  ChevronRight,
  Pin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
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
  const [showPinInput, setShowPinInput] = React.useState(false)

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
    } catch {
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
      setShowPinInput(false)
    } catch {
      toast.error('Error al actualizar PIN')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-8 overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-5xl max-h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 rounded-t-[2.5rem] shrink-0">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-patagonia-600 text-white rounded-2xl shadow-lg shadow-patagonia-600/20">
                <Settings2 className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tight">Panel de Configuración</h2>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">Ajustes Técnicos y de Negocio</p>
             </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl transition-all active:scale-95 text-slate-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Caja */}
            <Card className="border-amber-500/20 dark:border-amber-500/10 shadow-amber-500/5 bg-white dark:bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500">Caja</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="blind-closure" className="text-sm font-black text-slate-900 dark:text-slate-100">Caja Ciega</Label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Oculta totales al cerrar</p>
                  </div>
                  <Switch 
                    id="blind-closure"
                    checked={settings.blindClosureEnabled}
                    onCheckedChange={() => handleToggle('blindClosureEnabled')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Seguridad */}
            <Card className="border-rose-500/20 dark:border-rose-500/10 shadow-rose-500/5 bg-white dark:bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-rose-500" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-500">Seguridad</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="pin-delete" className="text-sm font-black text-slate-900 dark:text-slate-100">PIN de Borrado</Label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Autorización para quitar ítems</p>
                  </div>
                  <Switch 
                    id="pin-delete"
                    checked={settings.pinRequiredForDelete}
                    onCheckedChange={() => handleToggle('pinRequiredForDelete')}
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {!showPinInput ? (
                    <button 
                      onClick={() => setShowPinInput(true)}
                      className="flex items-center justify-between w-full text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest group"
                    >
                      <span>Cambiar PIN Maestro</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <div className="space-y-3 pt-2 animate-in slide-in-from-top-2 duration-200">
                      <div className="relative">
                        <Pin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                          type="password"
                          value={newPin}
                          onChange={handlePinChange}
                          placeholder="****"
                          className="h-10 pl-10 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-black tracking-[0.3em] text-center"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setShowPinInput(false)}
                          className="flex-1 text-[10px] font-black uppercase"
                        >
                          Cancelar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={savePin}
                          disabled={isSaving || newPin.length < 4}
                          className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase"
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Métodos de Pago */}
            <Card className="border-emerald-500/20 dark:border-emerald-500/10 shadow-emerald-500/5 bg-white dark:bg-slate-900/50 lg:row-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">Pagos & Vouchers</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="junaeb" className="text-sm font-black text-slate-900 dark:text-slate-100">JUNAEB / Edenred</Label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Habilitar validaciones</p>
                  </div>
                  <Switch 
                    id="junaeb"
                    checked={settings.junaebEnabled}
                    onCheckedChange={() => handleToggle('junaebEnabled')}
                  />
                </div>

                {settings.junaebEnabled && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-500/5 rounded-xl border border-emerald-100 dark:border-emerald-500/10 space-y-2 animate-in zoom-in-95">
                    <Label className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Máximo de Sellos</Label>
                    <Input 
                      type="number" 
                      value={settings.maxSeals || 2} 
                      onChange={(e) => updateSettings({ maxSeals: parseInt(e.target.value) })}
                      className="h-9 bg-white dark:bg-slate-950 border-emerald-200 dark:border-emerald-900 font-black text-sm"
                    />
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Región de Operación</Label>
                  <select 
                    value={settings.region || 'REGIONES'}
                    onChange={(e) => updateSettings({ region: e.target.value as 'RM' | 'REGIONES' })}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                  >
                    <option value="RM">Región Metropolitana</option>
                    <option value="REGIONES">Otras Regiones</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-4 opacity-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PLUXE (Pronto)</span>
                    <Switch disabled checked={settings.pluxeEnabled} />
                  </div>
                  <div className="flex items-center justify-between gap-4 opacity-50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SUMUP (Pronto)</span>
                    <Switch disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* SII / Facturación */}
            <Card className="border-violet-500/20 dark:border-violet-500/10 shadow-violet-500/5 bg-white dark:bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-violet-500" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-500">SII / Facturación</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                   <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-black text-slate-900 dark:text-slate-100">Modelo de Emisión</Label>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Configuración de Boletas</p>
                    </div>
                    <Switch 
                      checked={settings.siiModel === 'SII_VOUCHER_SKIP'}
                      onCheckedChange={() => updateSettings({ 
                        siiModel: settings.siiModel === 'SII_ALWAYS' ? 'SII_VOUCHER_SKIP' : 'SII_ALWAYS' 
                      })}
                    />
                  </div>
                  <div className="p-3 bg-violet-50 dark:bg-violet-500/5 rounded-xl border border-violet-100 dark:border-violet-500/10">
                    <p className="text-[10px] text-violet-600 dark:text-violet-400 font-bold leading-relaxed uppercase tracking-tight">
                      {settings.siiModel === 'SII_VOUCHER_SKIP' 
                        ? 'VOUCHER COMO BOLETA: No se emite boleta SII en pagos con tarjeta.' 
                        : 'EMISIÓN SIEMPRE: Boleta SII para todos los métodos.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fidelización */}
            <Card className="border-sky-500/20 dark:border-sky-500/10 shadow-sky-500/5 bg-white dark:bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-sky-500" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-500">Fidelización</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acumulación (%)</Label>
                    <Input 
                      type="number" 
                      value={(settings.loyalty?.accumulationRate || 0) * 100} 
                      onChange={(e) => updateSettings({ 
                        loyalty: { ...settings.loyalty!, accumulationRate: parseFloat(e.target.value) / 100 } 
                      })}
                      className="h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-black text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Valor Punto ($)</Label>
                    <Input 
                      type="number" 
                      value={settings.loyalty?.redemptionRate} 
                      onChange={(e) => updateSettings({ 
                        loyalty: { ...settings.loyalty!, redemptionRate: parseFloat(e.target.value) } 
                      })}
                      className="h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-black text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comportamiento */}
            <Card className="border-slate-500/20 dark:border-slate-500/10 shadow-slate-500/5 bg-white dark:bg-slate-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-slate-500" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-500">Comportamiento</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="loyalty-enabled" className="text-sm font-black text-slate-900 dark:text-slate-100">Loyalty Activo</Label>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Habilitar programa de puntos</p>
                  </div>
                  <Switch 
                    id="loyalty-enabled"
                    checked={settings.loyaltyEnabled}
                    onCheckedChange={() => handleToggle('loyaltyEnabled')}
                  />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-center rounded-b-[2.5rem] shrink-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">YAHPOS! PATAGONIA POS v1.2 — Todos los cambios se guardan automáticamente</p>
        </div>
      </div>
    </div>
  )
}
