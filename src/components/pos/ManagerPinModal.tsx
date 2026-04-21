'use client'

import React, { useState } from 'react'
import { X, ShieldCheck, Delete, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePosStore } from '@/stores/posStore'
import { toast } from 'sonner'

interface ManagerPinModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  actionDisplayName: string
}

export function ManagerPinModal({ isOpen, onClose, onSuccess, actionDisplayName }: ManagerPinModalProps) {
  const { settings, logEvent } = usePosStore()
  const [pin, setPin] = useState('')

  if (!isOpen) return null

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin(pin + num)
    }
  }

  const handleDelete = () => {
    setPin(pin.slice(0, -1))
  }

  const handleSubmit = () => {
    if (pin === settings.supervisorPin) {
      logEvent({ type: 'AUTH_SUCCESS', details: `Autorización exitosa para: ${actionDisplayName}` })
      toast.success('Autorización concedida')
      onSuccess()
      setPin('')
    } else {
      logEvent({ type: 'AUTH_FAIL', details: `Fallo de PIN para: ${actionDisplayName} (PIN ingresado: ${pin})` })
      toast.error('PIN de Supervisor incorrecto')
      setPin('')
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/95 backdrop-blur-xl p-4">
      <div className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white flex flex-col">
        
        {/* Header */}
        <div className="p-10 pb-6 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-inner shadow-orange-200">
            <ShieldCheck className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Autorización</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Supervisor Requerido para:</p>
          <p className="text-orange-500 font-black text-sm mt-1 uppercase">{actionDisplayName}</p>
        </div>

        {/* PIN Display */}
        <div className="px-10 mb-8">
            <div className="flex justify-center gap-4">
               {[...Array(settings.supervisorPin.length)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? 'bg-orange-500 scale-125' : 'bg-gray-200'}`} 
                  />
               ))}
            </div>
        </div>

        {/* Keypad */}
        <div className="px-10 pb-10 grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(val => (
            <button 
              key={val}
              onClick={() => handleKeyPress(val.toString())}
              className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all text-2xl font-black text-gray-700 active:bg-orange-50 shadow-sm"
            >
              {val}
            </button>
          ))}
          <button 
            onClick={onClose}
            className="h-16 rounded-2xl bg-red-50 hover:bg-red-100 active:scale-95 transition-all text-red-500 flex items-center justify-center border border-red-100"
          >
            <X className="w-8 h-8" />
          </button>
          <button 
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all text-2xl font-black text-gray-700 shadow-sm"
          >
            0
          </button>
          <button 
            onClick={handleSubmit}
            className="h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white flex items-center justify-center shadow-lg shadow-orange-500/20"
          >
            <ArrowRight className="w-8 h-8" />
          </button>
        </div>

        {/* Footer */}
        <div className="pb-10 px-10">
             <button onClick={handleDelete} className="w-full h-12 rounded-xl text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors uppercase tracking-widest">
                Borrar último dígito
             </button>
        </div>
      </div>
    </div>
  )
}
