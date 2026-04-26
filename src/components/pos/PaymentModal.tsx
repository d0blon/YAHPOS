'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatPrice, cn } from '@/lib/utils'
import { Banknote, CreditCard, X, Delete, CheckCircle2, ArrowRight, RefreshCw, Smartphone, Zap, Globe, Building2, Tablet } from 'lucide-react'
import { usePosStore } from '@/stores/posStore'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  onConfirm: (method: 'EFECTIVO' | 'TARJETA' | 'TERMINAL', receivedAmount?: number, terminalType?: string) => void
}

export function PaymentModal({ isOpen, onClose, total, onConfirm }: PaymentModalProps) {
  const { settings } = usePosStore();
  const [method, setMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TERMINAL'>('EFECTIVO')
  const [selectedTerminal, setSelectedTerminal] = useState('')
  const [isTerminalConfirmed, setIsTerminalConfirmed] = useState(false)
  const [receivedStr, setReceivedStr] = useState('')
  const receivedAmount = parseInt(receivedStr) || 0
  const change = receivedAmount - total

  const bills = [1000, 2000, 5000, 10000, 20000]

  const allTerminals = [
    { id: 'SumUp', key: 'sumup', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Sin arriendo, solo comisión. Simple.' },
    { id: 'Mercado Pago', key: 'other_card', icon: Globe, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Abono inmediato + Chip 4G gratis.' },
    { id: 'TUU', key: 'tuu', icon: Tablet, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Integración SII. Boleta en equipo.' },
    { id: 'Getnet', key: 'getnet', icon: Building2, color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'Dinero el mismo día. Santander.' },
    { id: 'Compraquí', key: 'other_card', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-500/10', desc: 'Respaldo BancoEstado. Confiable.' }
  ];

  const activeTerminalsList = allTerminals.filter(t => {
    if (!settings.activeTerminals) return true;
    return settings.activeTerminals[t.key as keyof typeof settings.activeTerminals] === true;
  });

  useEffect(() => {
    if (isOpen) {
      setMethod('EFECTIVO')
      setReceivedStr('')
      setIsTerminalConfirmed(false)
      if (activeTerminalsList.length > 0) {
        setSelectedTerminal(activeTerminalsList[0].id)
      }
    }
  }, [isOpen])

  const addNumber = (num: string) => {
    if (receivedStr.length > 10) return
    setReceivedStr(prev => prev + num)
  }

  const handleBackspace = () => {
    setReceivedStr(prev => prev.slice(0, -1))
  }

  const handleBillClick = (bill: number) => {
    setReceivedStr(bill.toString())
  }

  const canConfirm = method === 'EFECTIVO' ? receivedAmount >= total : (method === 'TERMINAL' ? (selectedTerminal !== '' && isTerminalConfirmed) : true)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-[3rem] border-none shadow-2xl text-slate-900 dark:text-white flex flex-col md:flex-row h-auto max-h-[95vh] md:h-[700px] animate-in zoom-in-95 duration-300">
        
        {/* Left Side: Summary & Methods */}
        <div className="w-full md:w-[350px] bg-slate-50 dark:bg-slate-800/50 p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-patagonia-600 rounded-lg">
                <Banknote className="w-5 h-5 text-white" />
             </div>
             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Canal de Cobro</h2>
          </div>
          
          <div className="flex-1 space-y-4">
            <button 
              onClick={() => setMethod('EFECTIVO')}
              className={cn(
                "w-full p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden",
                method === 'EFECTIVO' 
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-2xl shadow-emerald-500/30 scale-[1.02]" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-emerald-500/30"
              )}
            >
              <Banknote className={cn("w-10 h-10 transition-transform group-hover:scale-110", method === 'EFECTIVO' ? "text-white" : "text-slate-300")} />
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Efectivo</span>
              {method === 'EFECTIVO' && <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />}
            </button>

            <button 
              onClick={() => setMethod('TARJETA')}
              className={cn(
                "w-full p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden",
                method === 'TARJETA' 
                  ? "bg-patagonia-600 border-patagonia-600 text-white shadow-2xl shadow-patagonia-600/30 scale-[1.02]" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-patagonia-600/30"
              )}
            >
              <CreditCard className={cn("w-10 h-10 transition-transform group-hover:scale-110", method === 'TARJETA' ? "text-white" : "text-slate-300")} />
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Tarjeta</span>
              {method === 'TARJETA' && <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />}
            </button>

            <button 
              onClick={() => setMethod('TERMINAL')}
              className={cn(                "w-full p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden",
                method === 'TERMINAL' 
                  ? "bg-amber-500 border-amber-500 text-white shadow-2xl shadow-amber-500/30 scale-[1.02]" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-amber-500/30"
              )}
            >
              <Smartphone className={cn("w-10 h-10 transition-transform group-hover:scale-110", method === 'TERMINAL' ? "text-white" : "text-slate-300")} />
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Terminal</span>
              {method === 'TERMINAL' && <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />}
            </button>
          </div>

          <div className="mt-8 p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm text-center">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-2">Total a Cobrar</p>
             <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{formatPrice(total)}</p>
          </div>
        </div>

        {/* Right Side: Calculation */}
        <div className="flex-1 p-8 md:p-12 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto">
          {method === 'EFECTIVO' ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Monto Recibido</p>
                  <p className="text-6xl font-black text-emerald-600 tracking-tighter leading-none">{formatPrice(receivedAmount)}</p>
                </div>
                <div className={cn(
                  "rounded-[2.5rem] p-8 border transition-all duration-700",
                  change >= 0 ? "bg-amber-500/10 border-amber-500/20 shadow-xl" : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800"
                )}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Vuelto Cliente</p>
                  <p className={cn("text-6xl font-black tracking-tighter leading-none", change >= 0 ? "text-amber-500 animate-in zoom-in-95 duration-500" : "text-slate-200 dark:text-slate-800")}>
                    {change >= 0 ? formatPrice(change) : '$0'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
                {/* Keypad */}
                <div className="lg:col-span-3 grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, '0', '00'].map(n => (
                    <button 
                      key={n} 
                      onClick={() => addNumber(n.toString())}
                      className="h-20 lg:h-auto bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-3xl text-4xl font-black text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-patagonia-600/30 active:scale-95 transition-all shadow-sm flex items-center justify-center group"
                    >
                      <span className="group-hover:scale-125 transition-transform">{n}</span>
                    </button>
                  ))}
                  <button 
                    onClick={handleBackspace}
                    className="h-20 lg:h-auto bg-rose-500/10 border-2 border-rose-500/10 rounded-3xl flex items-center justify-center text-rose-500 hover:bg-rose-500/20 active:scale-95 transition-all shadow-sm"
                  >
                    <Delete className="w-10 h-10" />
                  </button>
                </div>

                {/* Bills */}
                <div className="flex flex-row lg:flex-col gap-3">
                  {bills.map(bill => (
                    <button 
                      key={bill}
                      onClick={() => handleBillClick(bill)}
                      className="flex-1 bg-emerald-500/10 dark:bg-emerald-500/5 border-2 border-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-500 font-black text-lg hover:bg-emerald-500 hover:text-white active:scale-95 transition-all shadow-sm uppercase tracking-tighter"
                    >
                      {formatPrice(bill)}
                    </button>
                  ))}
                  <button 
                     onClick={() => handleBillClick(total)}
                     className="flex-1 bg-slate-900 dark:bg-white dark:text-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    Exacto
                  </button>
                </div>
              </div>
            </div>
          ) : method === 'TARJETA' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 animate-in fade-in zoom-in-95 duration-700 py-10">
              <div className="relative">
                <div className="w-48 h-48 bg-patagonia-600/10 rounded-[4rem] flex items-center justify-center relative border-4 border-patagonia-600/20">
                  <div className="absolute inset-0 bg-patagonia-600/20 rounded-[4rem] animate-ping duration-[3000ms]" />
                  <CreditCard className="w-24 h-24 text-patagonia-600 animate-pulse" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-xl border border-slate-100 dark:border-slate-800">
                    <RefreshCw className="w-8 h-8 text-patagonia-400 animate-spin" />
                </div>
              </div>
              <div className="max-w-xs">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none italic mb-4">Procesando...</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Inserte o acerque la tarjeta al terminal Transbank para finalizar.</p>
              </div>
              <div className="flex gap-3">
                 <div className="w-3 h-3 bg-patagonia-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-3 h-3 bg-patagonia-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-3 h-3 bg-patagonia-600 rounded-full animate-bounce" />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 flex items-center justify-between">
                 <div>
                   <h3 className="text-2xl font-black text-amber-500 uppercase italic tracking-tighter">Terminal Físico</h3>
                   <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">Seleccione el terminal para enviar el monto</p>
                 </div>
                 <Smartphone className="w-12 h-12 text-amber-500" />
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                  {activeTerminalsList.map(term => (
                    <button
                      key={term.id}
                      onClick={() => {
                        setSelectedTerminal(term.id);
                        setIsTerminalConfirmed(false);
                      }}
                      className={cn(
                        "p-5 rounded-[1.5rem] border-2 flex items-center gap-4 transition-all group relative overflow-hidden",
                        selectedTerminal === term.id 
                          ? "bg-white dark:bg-slate-800 border-amber-500 shadow-xl scale-[1.02]" 
                          : "bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800 text-slate-400 hover:border-amber-500/30"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", term.bg)}>
                        <term.icon className={cn("w-5 h-5", term.color)} />
                      </div>
                      <div className="text-left">
                        <p className="font-black uppercase tracking-tighter text-xs">{term.id}</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-tight">{term.desc}</p>
                      </div>
                      {selectedTerminal === term.id && <CheckCircle2 className="w-5 h-5 text-amber-500 ml-auto" />}
                    </button>
                  ))}
                </div>

                {selectedTerminal && !isTerminalConfirmed && (
                  <button 
                    onClick={() => setIsTerminalConfirmed(true)}
                    className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-amber-600 transition-all shadow-lg animate-pulse"
                  >
                    Confirmar Pago en {selectedTerminal}
                  </button>
                )}

                {isTerminalConfirmed && (
                  <div className="p-5 bg-slate-900 rounded-3xl border border-white/5 flex items-center justify-center gap-4">
                     <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">Esperando Confirmación de {selectedTerminal}...</span>
                     <button 
                       onClick={() => setIsTerminalConfirmed(false)}
                       className="ml-auto text-[8px] text-slate-500 hover:text-white underline uppercase"
                     >
                       Cancelar
                     </button>
                  </div>
                )}
            </div>
          )}

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="h-20 px-10 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all sm:w-auto w-full"
            >
              Anular Pago
            </Button>
            <Button 
              disabled={!canConfirm}
              onClick={() => onConfirm(method, receivedAmount, selectedTerminal)}
              className={cn(
                "flex-1 h-20 rounded-3xl font-black uppercase tracking-[0.3em] text-sm shadow-2xl transition-all active:scale-[0.98] group",
                method === 'EFECTIVO' 
                  ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/40 text-white" 
                  : method === 'TARJETA' ? "bg-patagonia-600 hover:bg-patagonia-700 shadow-patagonia-600/40 text-white"
                  : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/40 text-white"
              )}
            >
              {canConfirm ? (
                <>FINALIZAR TRANSACCIÓN <CheckCircle2 className="ml-3 w-6 h-6 group-hover:scale-125 transition-transform" /></>
              ) : (
                <>MONTO INSUFICIENTE <X className="ml-3 w-6 h-6" /></>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
