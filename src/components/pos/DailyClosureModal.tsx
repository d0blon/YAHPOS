'use client'

import React, { useState } from 'react'
import { X, CheckCircle2, Printer, AlertTriangle, TrendingUp, DollarSign, Receipt, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { OrderRecord, usePosStore } from '@/stores/posStore'
import { toast } from 'sonner'

interface DailyClosureModalProps {
  isOpen: boolean
  onClose: () => void
  sales: OrderRecord[]
}

export function DailyClosureModal({ isOpen, onClose, sales }: DailyClosureModalProps) {
  const { clearSalesHistory, settings, cashSession, clearCashSession, cashMovements, clearCashMovements } = usePosStore()
  const [isClosing, setIsClosing] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isDeclaring, setIsDeclaring] = useState(settings.blindClosureEnabled)
  const [cashDeclared, setCashDeclared] = useState('')

  if (!isOpen) return null

  const movementTotals = cashMovements.reduce((acc, mov) => {
    if (mov.type === 'IN') acc.in += mov.amount
    else acc.out += mov.amount
    return acc
  }, { in: 0, out: 0 })

  const totals = sales.reduce((acc, sale) => {
    acc.total += sale.total
    if (sale.paymentMethod === 'EFECTIVO') acc.cash += sale.total
    else if (sale.paymentMethod === 'TARJETA') acc.card += sale.total
    else acc.transfer += sale.total
    acc.items += sale.items.length
    return acc
  }, { total: 0, cash: 0, card: 0, transfer: 0, items: 0 })

  const openingAmount = cashSession?.opening_amount || 0
  const expectedCash = openingAmount + totals.cash + movementTotals.in - movementTotals.out

  const iva = Math.round(totals.total - (totals.total / 1.19))
  const neto = totals.total - iva

  const handleFinalClosure = async () => {
    setIsClosing(true)
    
    try {
      if (cashSession?.id) {
        // Enviar reporte de cierre a Supabase
        await fetch(`/api/cash-sessions/${cashSession.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              closing_amount: parseFloat(cashDeclared || '0'),
              opening_amount: openingAmount,
              total_cash_sales: totals.cash,
              total_card_sales: totals.card,
              total_transfer_sales: totals.transfer,
              total_incomes: movementTotals.in,
              total_expenses: movementTotals.out,
              notes: `Cierre Z generado por ${cashSession.cashier_name}. Diferencia: ${parseFloat(cashDeclared || '0') - expectedCash}`
            })
        })
      }

      toast.success('Reporte Z Generado y enviado a contabilidad')
      setIsFinished(true)
    } catch {
      toast.error('Error al guardar el cierre en la nube. Se guardará localmente.')
      setIsFinished(true)
    } finally {
      setIsClosing(false)
    }
  }

  const handleFinish = async () => {
    // (Removido: El API ahora maneja el estado del perfil)

    clearSalesHistory()
    clearCashMovements()
    clearCashSession()
    setIsFinished(false)
    onClose()
    toast.info('Turno finalizado. Caja cerrada correctamente.')
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-hidden">
      <div className="bg-white dark:bg-surface-100 w-full max-w-2xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-gray-800 flex flex-col">
        
        {/* State: Summary / Closing */}
        {!isFinished ? (
          <>
            <div className="p-8 pb-4 text-center border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-surface-200/50 relative">
              <button 
                onClick={onClose} 
                disabled={isClosing}
                className="absolute top-6 right-6 p-2 bg-white dark:bg-surface-200 rounded-full text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm border border-slate-200 dark:border-gray-700 transition-all hover:scale-110 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calculator className="w-8 h-8 text-brand-primary" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Cierre de Caja</h2>
              <p className="text-slate-500 dark:text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Reporte Fiscal Z de Turno</p>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {isDeclaring ? (
                  <div className="p-8 bg-slate-50 dark:bg-surface-200/50 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-gray-700 text-center">
                    <p className="text-sm font-black text-brand-primary dark:text-brand-primary/80 uppercase tracking-widest mb-4">Declaración de Efectivo</p>
                    <p className="text-xs text-slate-600 dark:text-gray-400 mb-6 font-bold">Ingrese el monto total de efectivo contado físicamente.</p>
                    <div className="relative max-w-xs mx-auto">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300">$</span>
                        <input 
                          type="number"
                          value={cashDeclared}
                          onChange={(e) => setCashDeclared(e.target.value)}
                          className="w-full h-20 pl-12 pr-6 rounded-3xl text-4xl font-black text-brand-primary border-none focus:ring-2 focus:ring-brand-primary/50 shadow-inner bg-white dark:bg-surface-100 text-center"
                          placeholder="0"
                          autoFocus
                        />
                    </div>
                    <Button 
                      className="mt-8 w-full h-16 bg-brand-primary hover:brightness-90 text-white rounded-2xl font-black text-lg shadow-lg shadow-brand-primary/20 active:scale-95 transition-all"
                      onClick={() => setIsDeclaring(false)}
                      disabled={!cashDeclared}
                    >
                      CONTINUAR AL RESUMEN
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50 dark:bg-surface-200/50 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                               <TrendingUp className="w-4 h-4" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Ventas Totales</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{formatPrice(totals.total)}</p>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-surface-200/50 rounded-[2rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                               <Receipt className="w-4 h-4" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Documentos</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">{sales.length}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-50 dark:bg-surface-200/50 rounded-[1.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Neto (sin IVA)</span>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{formatPrice(neto)}</p>
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-surface-200/50 rounded-[1.5rem] border border-slate-100 dark:border-gray-800 shadow-inner">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">IVA (19%)</span>
                            <p className="text-xl font-black text-slate-900 dark:text-white">{formatPrice(iva)}</p>
                        </div>
                    </div>

                    <div className="p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/40">
                        <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                            <div className="flex items-center gap-3">
                                <DollarSign className="w-6 h-6 text-brand-primary/80" />
                                <span className="font-black text-xl uppercase tracking-tight">Arqueo de Valores</span>
                            </div>
                            {settings.blindClosureEnabled && (
                              <div className="text-[8px] bg-brand-primary px-2 py-1 rounded-lg font-black uppercase tracking-widest">Caja Ciega</div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(+) Fondo Inicial</span>
                                <span className="text-lg font-black">{formatPrice(openingAmount)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(+) Ventas Efectivo</span>
                                <span className="text-lg font-black">{formatPrice(totals.cash)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(+) Entradas</span>
                                <span className="text-lg font-black text-emerald-400">{formatPrice(movementTotals.in)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-xs opacity-60 font-bold uppercase tracking-widest">(-) Salidas</span>
                                <span className="text-lg font-black text-rose-400">-{formatPrice(movementTotals.out)}</span>
                            </div>
                            
                            <div className="pt-4 border-t border-white/10 flex justify-between items-center bg-white/5 -mx-4 px-6 py-3 rounded-2xl">
                                <span className="font-black uppercase tracking-[0.2em] text-[10px] text-brand-primary/80">Efectivo Esperado</span>
                                <span className="text-3xl font-black">{formatPrice(expectedCash)}</span>
                            </div>

                            {settings.blindClosureEnabled && (
                              <div className="flex justify-between items-baseline text-amber-400 mt-4 px-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest">Efectivo Declarado</span>
                                  <span className="text-2xl font-black">{formatPrice(parseFloat(cashDeclared || '0'))}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-baseline pt-2 opacity-40 px-2">
                                <span className="text-[10px] font-black uppercase tracking-widest">Ventas con Tarjeta</span>
                                <span className="text-base font-black">{formatPrice(totals.card)}</span>
                            </div>
                            
                            {settings.blindClosureEnabled && (
                              <div className={`pt-4 mt-2 border-t border-white/10 flex justify-between items-center ${parseFloat(cashDeclared || '0') - expectedCash >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  <span className="font-black uppercase tracking-widest text-[10px]">Diferencia de Caja</span>
                                  <span className="text-3xl font-black">
                                    {formatPrice(parseFloat(cashDeclared || '0') - expectedCash)}
                                  </span>
                              </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-6 bg-amber-500/10 dark:bg-amber-500/5 rounded-[2rem] border border-amber-500/20">
                        <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                        <div>
                            <p className="text-sm font-black text-amber-600 dark:text-amber-500 uppercase">Confirmación de Cierre</p>
                            <p className="text-[10px] text-amber-700/80 dark:text-amber-500/60 leading-relaxed font-bold uppercase tracking-tight">Al ejecutar el cierre Z se finalizará el turno actual y se reseteará el historial local para el nuevo día.</p>
                        </div>
                    </div>
                  </>
                )}
            </div>

            {!isDeclaring && (
              <div className="p-8 bg-slate-50 dark:bg-surface-200/50 border-t border-slate-100 dark:border-gray-800 flex gap-4">
                  <Button variant="ghost" className="h-16 flex-1 rounded-2xl font-black text-slate-400 uppercase tracking-widest text-xs" onClick={onClose} disabled={isClosing}>
                      Cancelar
                  </Button>
                  <Button 
                    className="h-16 flex-[2] bg-brand-primary hover:brightness-90 text-white rounded-2xl font-black text-lg gap-3 shadow-xl shadow-brand-primary/20 transition-all active:scale-95"
                    onClick={handleFinalClosure}
                    disabled={isClosing || sales.length === 0}
                  >
                      {isClosing ? <><Calculator className="animate-spin w-6 h-6"/> PROCESANDO...</> : <><Printer className="w-6 h-6" /> EJECUTAR CIERRE Z</>}
                  </Button>
              </div>
            )}
          </>
        ) : (
          <div className="p-16 text-center animate-in fade-in slide-in-from-bottom-10 duration-500">
            <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Cierre Exitoso</h2>
            <p className="text-slate-500 dark:text-gray-400 font-bold text-base mt-4 max-w-xs mx-auto">El Reporte Z ha sido generado y la caja ha sido reiniciada correctamente.</p>
            
            <div className="mt-12">
               <Button 
                onClick={handleFinish}
                className="w-full h-20 bg-brand-primary hover:brightness-90 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-brand-primary/30 active:scale-95 transition-all"
               >
                 FINALIZAR Y SALIR
               </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
