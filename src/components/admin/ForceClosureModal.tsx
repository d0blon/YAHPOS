'use client'

import React, { useState, useEffect } from 'react'
import { X, DollarSign, CreditCard, Send, FileText, AlertTriangle, User, Monitor, Loader2, ChevronRight, AlertCircle, Clock, TrendingUp, Receipt, Calculator, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn, formatPrice } from '@/lib/utils'

interface ForceClosureModalProps {
  session: {
    id: string;
    cashier_name: string;
    terminals?: {
      name: string;
    };
  }
  onClose: () => void
  onSuccess: () => void
}

interface SessionData {
  session: {
    id: string;
    terminal_name: string;
    cashier_name: string;
    opened_at: string;
    opening_amount: number;
  };
  totals: {
    cash: number;
    card: number;
    transfer: number;
    total: number;
    count: number;
  };
  movements: {
    in: number;
    out: number;
  };
  expected_cash: number;
}

export function ForceClosureModal({ session, onClose, onSuccess }: ForceClosureModalProps) {
  const [step, setStep] = useState(1)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [notes, setNotes] = useState('')
  const [timeOpen, setTimeOpen] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/cash-sessions/${session.id}/sales`)
        if (!res.ok) throw new Error('No se pudieron cargar los datos de la sesión')
        const data = await res.json()
        setSessionData(data)
        
        // Calcular tiempo abierto
        if (data.session.opened_at) {
          const openedAt = new Date(data.session.opened_at)
          const now = new Date()
          const diffMs = now.getTime() - openedAt.getTime()
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60))
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
          setTimeOpen(`${diffHrs}h ${diffMins}m`)
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
        toast.error(errorMessage)
        onClose()
      } finally {
        setIsLoadingData(false)
      }
    }
    fetchData()
  }, [session.id, onClose])

  const handleFinalClosure = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/cash-sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closing_amount: sessionData?.expected_cash || 0,
          total_cash_sales: sessionData?.totals.cash || 0,
          total_card_sales: sessionData?.totals.card || 0,
          total_transfer_sales: sessionData?.totals.transfer || 0,
          total_incomes: sessionData?.movements.in || 0,
          total_expenses: sessionData?.movements.out || 0,
          notes: notes || 'Cierre forzado desde panel administrativo'
        })
      })

      if (!res.ok) throw new Error('Error al cerrar la sesión')
      
      toast.success('Sesión cerrada remotamente con éxito')
      onSuccess()
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white/90 backdrop-blur-xl p-12 rounded-[3rem] shadow-2xl flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-patagonia-600 animate-spin" />
          <p className="text-gray-500 font-medium">Calculando totales en tiempo real...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
        {/* Header */}
        <div className="p-8 pb-4 text-center border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 relative">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm border border-slate-200 dark:border-slate-700 transition-all hover:scale-110 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calculator className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Cierre de Caja Forzado</h2>
          <p className="text-red-500 dark:text-red-400 font-bold text-xs uppercase tracking-widest mt-1">Panel Administrativo • Paso {step} de 2</p>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {step === 1 ? (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              {/* Session Info Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Monitor className="w-3 h-3 text-patagonia-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Terminal</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{sessionData?.session.terminal_name}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-patagonia-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Cajero</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{sessionData?.session.cashier_name}</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-3 h-3 text-patagonia-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Abierto</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-200">{timeOpen}</p>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Ventas Totales</span>
                      </div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{formatPrice(sessionData?.totals.total || 0)}</p>
                  </div>
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                      <div className="flex items-center gap-2 mb-2 text-slate-400">
                          <Receipt className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Documentos</span>
                      </div>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{sessionData?.totals.count}</p>
                  </div>
              </div>

              {/* Arqueo Section (Dark Card) */}
              <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                        <DollarSign className="w-6 h-6 text-patagonia-400" />
                        <span className="font-black text-xl uppercase tracking-tight">Arqueo de Valores</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(+) Fondo Inicial</span>
                        <span className="text-lg font-black">{formatPrice(sessionData?.session.opening_amount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(+) Ventas Efectivo</span>
                        <span className="text-lg font-black">{formatPrice(sessionData?.totals.cash || 0)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="w-3 h-3 text-emerald-400" />
                          <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(+) Entradas</span>
                        </div>
                        <span className="text-lg font-black text-emerald-400">{formatPrice(sessionData?.movements.in || 0)}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-2">
                          <ArrowDownCircle className="w-3 h-3 text-rose-400" />
                          <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(-) Salidas</span>
                        </div>
                        <span className="text-lg font-black text-rose-400">-{formatPrice(sessionData?.movements.out || 0)}</span>
                    </div>
                    
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center bg-white/5 -mx-4 px-6 py-3 rounded-2xl">
                        <span className="font-black uppercase tracking-[0.2em] text-[10px] text-patagonia-400">Efectivo Esperado</span>
                        <span className="text-3xl font-black">{formatPrice(sessionData?.expected_cash || 0)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 opacity-40 px-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-[9px] font-black uppercase tracking-widest">Tarjetas</span>
                          <span className="text-sm font-black">{formatPrice(sessionData?.totals.card || 0)}</span>
                        </div>
                        <div className="flex justify-between items-baseline border-l border-white/10 pl-4">
                          <span className="text-[9px] font-black uppercase tracking-widest">Transfers</span>
                          <span className="text-sm font-black">{formatPrice(sessionData?.totals.transfer || 0)}</span>
                        </div>
                    </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Motivo del Cierre Remoto (Opcional)</label>
                <div className="relative">
                  <FileText className="absolute left-5 top-5 w-5 h-5 text-slate-400" />
                  <Textarea 
                    placeholder="Indique el motivo del cierre si es necesario..."
                    className="pl-12 min-h-[100px] bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl focus:ring-2 focus:ring-patagonia-500/20 resize-none text-sm p-5 dark:text-white"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                onClick={() => setStep(2)}
                className="w-full h-20 rounded-[2rem] bg-patagonia-600 hover:bg-patagonia-700 text-white font-black text-xl shadow-xl shadow-patagonia-600/20 transition-all active:scale-[0.98]"
              >
                Siguiente Paso
                <ChevronRight className="w-6 h-6 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              {/* Confirmation Card - Redesign */}
              <div className="bg-red-50/50 dark:bg-red-500/5 rounded-[2.5rem] p-10 border-2 border-dashed border-red-200 dark:border-red-500/20 flex flex-col items-center text-center gap-6">
                <div className="p-6 bg-red-500 rounded-[2rem] shadow-xl shadow-red-500/30">
                  <AlertCircle className="w-12 h-12 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white">¿Confirmar Cierre?</h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-sm font-bold text-sm leading-relaxed">
                    Estás por cerrar de forma remota la caja de <span className="text-red-600 dark:text-red-400 font-black">{sessionData?.session.cashier_name}</span> en el terminal <span className="text-red-600 dark:text-red-400 font-black">{sessionData?.session.terminal_name}</span>.
                  </p>
                </div>
                
                {/* Visual Data Summary Card */}
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-8 w-full border border-red-100 dark:border-red-900/30 shadow-sm space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ventas Totales</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">{formatPrice(sessionData?.totals.total || 0)}</p>
                    </div>
                    <div className="text-left border-l border-slate-100 dark:border-slate-700 pl-8">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Efectivo Esperado</p>
                      <p className="text-2xl font-black text-red-600 dark:text-red-400">{formatPrice(sessionData?.expected_cash || 0)}</p>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4">
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    </div>
                    <p className="text-[10px] text-red-600 dark:text-red-400 font-black uppercase text-left leading-tight tracking-tight">
                      Esta acción es irreversible y notificará al cajero en tiempo real.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="flex-1 h-16 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-xs"
                >
                  Volver
                </Button>
                <Button 
                  onClick={handleFinalClosure}
                  disabled={isSubmitting}
                  className="flex-[2] h-16 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-lg shadow-xl shadow-red-500/20 transition-all active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin" />
                      CERRANDO...
                    </div>
                  ) : (
                    'CONFIRMAR CIERRE REMOTO'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
