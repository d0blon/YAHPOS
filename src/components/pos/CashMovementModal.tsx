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
  { id: 'ERROR_CAJA', label: 'Corrección Error', icon: AlertCircle, color: 'bg-brand-500', type: 'IN' }, // Can be both, simplified as IN for UI
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
      // 1. Sincronizar con el Servidor
      const response = await fetch('/api/cash-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: cashSession?.id,
          type,
          category,
          amount: numAmount,
          reason,
          cashier: currentUser?.firstName || 'Cajero'
        })
      });

      if (!response.ok) {
        throw new Error('Error al sincronizar con el servidor');
      }

      // 2. Registrar en el store local (optimista)
      addCashMovement(movement)
      
      // 3. Registrar en el log de auditoría
      logEvent({
        type: type === 'IN' ? 'CASH_IN' : 'CASH_OUT',
        details: `${category}: ${reason} - ${formatPrice(numAmount)}`
      })

      toast.success(`${type === 'IN' ? 'Entrada' : 'Salida'} de dinero registrada en la nube ✅`)
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
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-hidden">
      <div className="bg-white dark:bg-surface-100 w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 border border-white/10 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-10 pb-6 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Flujo de Caja</h2>
            <p className="text-slate-500 dark:text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Registro de Entradas y Salidas</p>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-2xl transition-all active:scale-90 group">
            <X className="w-6 h-6 text-slate-400 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        <div className="px-10 pb-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Type Selector (Industrial Style) */}
          <div className="flex p-2 bg-slate-100 dark:bg-surface-200/50 rounded-[2rem] gap-2">
            <button
              onClick={() => { setType('OUT'); setCategory(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black text-xs transition-all uppercase tracking-widest",
                type === 'OUT' 
                  ? "bg-white dark:bg-surface-100 text-rose-500 shadow-xl shadow-rose-500/10 scale-[1.02]" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
              )}
            >
              <ArrowDownCircle className="w-5 h-5" />
              SALIDA (EGRESO)
            </button>
            <button
              onClick={() => { setType('IN'); setCategory(null); }}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-5 rounded-[1.5rem] font-black text-xs transition-all uppercase tracking-widest",
                type === 'IN' 
                  ? "bg-white dark:bg-surface-100 text-emerald-500 shadow-xl shadow-emerald-500/10 scale-[1.02]" 
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"
              )}
            >
              <ArrowUpCircle className="w-5 h-5" />
              ENTRADA (INGRESO)
            </button>
          </div>

          {/* Amount Input (High Visibility) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-gray-500 ml-6">Monto del Movimiento</label>
            <div className="relative group">
              <span className="absolute left-8 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-300 group-focus-within:text-brand-primary transition-colors">$</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-24 pl-16 text-5xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-surface-200/50 border-none rounded-[2.5rem] focus-visible:ring-4 focus-visible:ring-brand-primary/20 transition-all tracking-tighter"
              />
            </div>
          </div>

          {/* Categories Grid (Optimized for Touch) */}
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-gray-500 ml-6">Categoría de Auditoría</label>
            <div className="grid grid-cols-2 gap-4">
              {filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-4 p-5 rounded-[2rem] border-2 transition-all text-left relative group overflow-hidden",
                    category === cat.id 
                      ? "border-brand-primary bg-brand-primary/5 shadow-lg shadow-brand-primary/10" 
                      : "border-slate-100 dark:border-gray-800 hover:border-slate-200 dark:hover:border-gray-700 bg-white dark:bg-surface-100"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xl transition-transform group-hover:scale-110",
                    cat.color
                  )}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className={cn("font-black text-[10px] uppercase tracking-widest", category === cat.id ? "text-brand-primary dark:text-brand-primary/80" : "text-slate-600 dark:text-gray-400")}>
                      {cat.label}
                    </p>
                  </div>
                  {category === cat.id && (
                    <div className="absolute top-2 right-4 w-1.5 h-1.5 bg-brand-primary rounded-full animate-ping" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Reason/Description */}
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-gray-500 ml-6">Motivo / Observación</label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describa el motivo del movimiento..."
              className="h-16 px-8 rounded-2xl bg-slate-50 dark:bg-surface-200/50 border-none font-bold text-sm text-slate-700 dark:text-gray-200 placeholder:text-slate-400 focus-visible:ring-4 focus-visible:ring-brand-primary/20"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-10 pt-6 border-t border-slate-50 dark:border-gray-800 flex gap-4 shrink-0 bg-white dark:bg-surface-100/80 backdrop-blur-md">
          <Button 
            variant="ghost" 
            className="h-20 flex-1 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button 
            className={cn(
              "h-20 flex-[2] rounded-3xl font-black text-sm uppercase tracking-[0.3em] gap-3 shadow-2xl transition-all active:scale-[0.98]",
              type === 'OUT' 
                ? "bg-rose-500 hover:bg-rose-600 shadow-rose-900/30 text-white" 
                : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-900/30 text-white"
            )}
            onClick={handleSave}
            disabled={isProcessing || !amount || !category || !reason}
          >
            {isProcessing ? <Loader2 className="animate-spin w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
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
