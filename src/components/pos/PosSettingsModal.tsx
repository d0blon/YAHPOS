'use client'

import React from 'react'
import { X, Shield, Lock, EyeOff, Trash2, Save, Info } from 'lucide-react'
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

  if (!isOpen) return null

  const handleToggle = (key: keyof PosSettings) => {
    const newVal = !settings[key]
    updateSettings({ [key]: newVal })
    logEvent({ 
      type: 'AUTH_SUCCESS', 
      details: `Ajuste ${key} cambiado a ${newVal}` 
    })
    toast.success('Ajuste actualizado correctamente')
  }

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6)
    updateSettings({ supervisorPin: val })
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-corporate-blue/5">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-corporate-blue text-white rounded-2xl">
                <Shield className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">Ajustes de Administración</h2>
                <p className="text-gray-500 text-sm font-medium italic">Configuración de seguridad y reglas de negocio</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-8 h-8 text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto">
          
          {/* Setting 1: Blind Closure */}
          <div className="flex items-start gap-6 p-6 rounded-3xl border-2 border-transparent hover:border-gray-100 transition-all hover:bg-gray-50/50 group">
            <div className={`p-4 rounded-2xl transition-colors ${settings.blindClosureEnabled ? 'bg-corporate-blue text-white' : 'bg-gray-100 text-gray-400'}`}>
                <EyeOff className="w-8 h-8" />
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-black text-gray-900">Activar Caja Ciega</h3>
                  <button 
                    onClick={() => handleToggle('blindClosureEnabled')}
                    className={`w-14 h-8 rounded-full transition-all relative ${settings.blindClosureEnabled ? 'bg-corporate-blue' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.blindClosureEnabled ? 'right-1' : 'left-1'}`} />
                  </button>
               </div>
               <p className="text-sm text-gray-500 leading-relaxed font-medium">El cajero debe declarar el efectivo manualmente sin conocer el total del sistema. Evita fraudes y asegura una cuadratura real.</p>
               <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-corporate-blue bg-corporate-blue/5 px-3 py-1.5 rounded-lg w-fit">
                  <Info className="w-3 h-3" /> RECOMENDADO PARA RETAIL
               </div>
            </div>
          </div>

          {/* Setting 2: PIN for Delete */}
          <div className="flex items-start gap-6 p-6 rounded-3xl border-2 border-transparent hover:border-gray-100 transition-all hover:bg-gray-50/50 group">
            <div className={`p-4 rounded-2xl transition-colors ${settings.pinRequiredForDelete ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <Lock className="w-8 h-8" />
            </div>
            <div className="flex-1">
               <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-black text-gray-900">PIN para Anulaciones</h3>
                  <button 
                    onClick={() => handleToggle('pinRequiredForDelete')}
                    className={`w-14 h-8 rounded-full transition-all relative ${settings.pinRequiredForDelete ? 'bg-orange-500' : 'bg-gray-300'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.pinRequiredForDelete ? 'right-1' : 'left-1'}`} />
                  </button>
               </div>
               <p className="text-sm text-gray-500 leading-relaxed font-medium">Exige que un supervisor ingrese su PIN para eliminar cualquier producto del carrito. Controla las pérdidas y errores de digitación.</p>
            </div>
          </div>

          {/* Setting 3: Supervisor PIN */}
          <div className="p-8 bg-gray-900 rounded-[2.5rem] text-white">
             <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white/10 rounded-2xl">
                   <Lock className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                   <h3 className="text-xl font-black">PIN de Supervisor</h3>
                   <p className="text-xs text-white/50 font-medium">Utilice un código de 4 a 6 dígitos numéricos.</p>
                </div>
             </div>
             <div className="flex gap-4">
                <Input 
                  type="password"
                  value={settings.supervisorPin}
                  onChange={handlePinChange}
                  className="h-16 bg-white/5 border-white/10 text-3xl font-black text-center tracking-[1em] rounded-2xl focus:ring-orange-400 focus:border-orange-400"
                  placeholder="****"
                />
                <Button className="h-16 px-8 bg-orange-500 hover:bg-orange-600 rounded-2xl font-black gap-2 transition-all">
                   <Save className="w-6 h-6" /> ACTUALIZAR
                </Button>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 bg-gray-50 flex justify-center">
             <Button variant="ghost" className="font-bold text-gray-400 gap-2" onClick={onClose}>
                Cerrar Panel Administrativo
             </Button>
        </div>
      </div>
    </div>
  )
}
