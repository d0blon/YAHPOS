'use client'

import React, { useState } from 'react'
import { 
  X, ArrowUpCircle, ArrowDownCircle, DollarSign, 
  Truck, Wallet, Coffee, AlertCircle, CheckCircle2,
  ChevronRight, Hash
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePosStore, CashMovement, MovementCategory } from '@/stores/posStore'
import { formatPrice, cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CashMovementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (movement: CashMovement) => void
}

const CATEGORIES: { id: MovementCategory; label: string; icon: any; color: string; type: 'IN' | 'OUT' }[] = [
  { id: 'PROVEEDOR', label: 'Pago Proveedor', icon: Truck, color: 'bg-amber-500', type: 'OUT' },
  { id: 'RETIRO', label: 'Retiro de Efectivo', icon: Wallet, color: 'bg-rose-500', type: 'OUT' },
  { id: 'GASTO_MENOR', label: 'Gasto Menor', icon: Coffee, color: 'bg-slate-500', type: 'OUT' },
  { id: 'REPOSICION', label: 'Reposición Sencillo', icon: DollarSign, color: 'bg-emerald-500', type: 'IN' },
  { id: 'ERROR_CAJA', label: 'Corrección Error', icon: AlertCircle, color: 'bg-indigo-500', type: 'IN' }, // Can be both, simplified as IN for UI
  { id: 'OTRO', label: 'Otro Motivo', icon: Hash, color: 'bg-gray-500', type: 'OUT' },
]

export function CashMovementModal({ isOpen, onClose, onSuccess }: CashMovementModalProps) {
  const { currentUser, cashSession, addCashMovement, logEvent } = usePosStore()
  const [type, setType] = useState<'IN' | 'OUT'>('OUT')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<MovementCategory | null>(null)
  const [reason, setReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    if (!amount || !category || !reason) {
      toast.error('Por favor complete todos los campos')
      return
    }

    setIsProcessing(true)
    const numAmount = parseFloat(amount)

    const movement: CashMovement = {
      id: `MOV-${Date.now()}`,
      sessionId: cashSession?.id || 'LOCAL',
      type,
      category,
      amount: numAmount,
      reason,
      timestamp: Date.now(),
      cashier: currentUser?.firstName || 'Cajero'
    }

    try {
      // Registrar en el store
      addCashMovement(movement)
      
      // Registrar en el log de auditoría
      logEvent({
        type: type === 'IN' ? 'CASH_IN' : 'CASH_OUT',
        details: `${category}: ${reason} - ${formatPrice(numAmount)}`
      })

      toast.success(`${type === 'IN' ? 'Entrada' : 'Salida'} de dinero registrada`)
      onSuccess(movement)
      
      // Reset
      setAmount('')
      setReason('')
      setCategory(null)
    } catch (error) {
      toast.error('Error al registrar movimiento')
    } finally {
      setIsProcessing(false)
    }
  }

  const filteredCategories = CATEGORIES.filter(c => c.type === type || c.id === 'OTRO' || c.id === 'ERROR_CAJA')

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-white flex flex-col">
        
        {/* Header */}
        <div className="p-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Movimiento de Caja</h2>
            <p className="text-gray-500 font-medium mt-1">Registre entradas o salidas extraordinarias</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="px-8 pb-8 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* Type Selector */}
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => { setType('OUT'); setCategory(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-black transition-all",
                type === 'OUT' ? "bg-white text-rose-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <ArrowDownCircle className="w-5 h-5" />
              SALIDA (EGRESO)
            </button>
            <button
              onClick={() => { setType('IN'); setCategory(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl font-black transition-all",
                type === 'IN' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              <ArrowUpCircle className="w-5 h-5" />
              ENTRADA (INGRESO)
            </button>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Monto del Movimiento</label>
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-300">$</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-20 pl-14 text-4xl font-black text-corporate-blue bg-gray-50 border-none rounded-3xl"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Categoría</label>
            <div className="grid grid-cols-2 gap-3">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group",
                    category === cat.id 
                      ? "border-corporate-blue bg-corporate-blue/5 shadow-md" 
                      : "border-gray-100 hover:border-gray-200"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg",
                    cat.color
                  )}>
                    <cat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={cn("font-bold text-sm", category === cat.id ? "text-corporate-blue" : "text-gray-600")}>
                      {cat.label}
                    </p>
                  </div>
                  {category === cat.id && <CheckCircle2 className="w-4 h-4 text-corporate-blue ml-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Reason/Description */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-4">Motivo / Descripción</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: Pago a repartidor de Panadería Don Juan"
              className="h-14 px-6 rounded-2xl bg-gray-50 border-none font-medium"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 pt-4 border-t border-gray-50 flex gap-4">
          <Button 
            variant="ghost" 
            className="h-16 flex-1 rounded-2xl font-bold text-gray-400"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            className={cn(
              "h-16 flex-[2] rounded-2xl font-black text-lg gap-3 shadow-xl transition-all active:scale-95",
              type === 'OUT' ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"
            )}
            onClick={handleSave}
            disabled={isProcessing || !amount || !category || !reason}
          >
            {isProcessing ? <Loader2 className="animate-spin" /> : <ChevronRight className="w-6 h-6" />}
            CONFIRMAR {type === 'IN' ? 'INGRESO' : 'EGRESO'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Loader2(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-loader-2 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
}
