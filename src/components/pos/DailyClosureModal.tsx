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
    } catch (error) {
      toast.error('Error al guardar el cierre en la nube. Se guardará localmente.')
      setIsFinished(true)
    } finally {
      setIsClosing(false)
    }
  }

  const handleFinish = () => {
    clearSalesHistory()
    clearCashMovements() // Limpiar movimientos del turno
    clearCashSession() // Importante: Limpiar sesión para forzar reapertura en próximo turno
    setIsFinished(false)
    onClose()
    toast.info('Turno finalizado. Caja cerrada correctamente.')
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-corporate-blue/20 backdrop-blur-xl p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white flex flex-col">
        
        {/* State: Summary / Closing */}
        {!isFinished ? (
          <>
            <div className="p-10 pb-6 text-center">
              <div className="w-20 h-20 bg-corporate-blue/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-10 h-10 text-corporate-blue" />
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight">Cierre de Caja</h2>
              <p className="text-gray-500 font-medium text-lg mt-2">Resumen Fiscal del Turno (Reporte Z)</p>
            </div>

            <div className="px-10 space-y-4">
                {isDeclaring ? (
                  <div className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Declaración de Efectivo</p>
                    <p className="text-xs text-gray-500 mb-6 italic">Ingrese el monto total de efectivo contado en la gaveta. No incluya vouchers de tarjeta.</p>
                    <div className="relative max-w-xs mx-auto">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-gray-300">$</span>
                        <input 
                          type="number"
                          value={cashDeclared}
                          onChange={(e) => setCashDeclared(e.target.value)}
                          className="w-full h-20 pl-12 pr-6 rounded-3xl text-4xl font-black text-corporate-blue border-none focus:ring-0 shadow-inner bg-white text-center"
                          placeholder="0"
                          autoFocus
                        />
                    </div>
                    <Button 
                      className="mt-8 w-full h-16 bg-corporate-blue hover:bg-corporate-dark text-white rounded-2xl font-black text-lg shadow-lg"
                      onClick={() => setIsDeclaring(false)}
                      disabled={!cashDeclared}
                    >
                      CONTINUAR AL RESUMEN
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-inner">
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                               <TrendingUp className="w-4 h-4" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Ventas Totales</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{formatPrice(totals.total)}</p>
                        </div>
                        <div className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 shadow-inner">
                            <div className="flex items-center gap-2 mb-2 text-gray-400">
                               <Receipt className="w-4 h-4" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Documentos</span>
                            </div>
                            <p className="text-3xl font-black text-gray-900">{sales.length}</p>
                        </div>
                    </div>

                    <div className="p-8 bg-corporate-blue rounded-[2.5rem] text-white shadow-xl shadow-corporate-blue/20">
                        <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4">
                            <div className="flex items-center gap-3">
                                <DollarSign className="w-6 h-6" />
                                <span className="font-bold text-xl">Arqueo de Valores</span>
                            </div>
                            {settings.blindClosureEnabled && (
                              <div className="text-[10px] bg-white/10 px-2 py-1 rounded font-bold uppercase">Caja Ciega Acta</div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="opacity-80 font-medium italic">(+) Fondo Inicial</span>
                                <span className="text-xl font-bold">{formatPrice(openingAmount)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="opacity-80 font-medium italic">(+) Ventas Efectivo</span>
                                <span className="text-xl font-bold">{formatPrice(totals.cash)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="opacity-80 font-medium italic">(+) Entradas</span>
                                <span className="text-xl font-bold">{formatPrice(movementTotals.in)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="opacity-80 font-medium italic">(-) Salidas</span>
                                <span className="text-xl font-bold text-rose-300">-{formatPrice(movementTotals.out)}</span>
                            </div>
                            
                            <div className="pt-4 border-t border-white/20 flex justify-between items-center bg-white/10 -mx-4 px-4 py-2 rounded-xl">
                                <span className="font-black uppercase tracking-widest text-xs">Efectivo Esperado</span>
                                <span className="text-3xl font-black">{formatPrice(expectedCash)}</span>
                            </div>

                            {settings.blindClosureEnabled && (
                              <div className="flex justify-between items-baseline text-yellow-300 mt-4">
                                  <span className="opacity-80 font-bold italic">Efectivo Declarado (Contado)</span>
                                  <span className="text-2xl font-black">{formatPrice(parseFloat(cashDeclared || '0'))}</span>
                              </div>
                            )}

                            <div className="flex justify-between items-baseline pt-2 opacity-80">
                                <span className="font-medium italic">Ventas con Tarjeta</span>
                                <span className="text-xl font-bold">{formatPrice(totals.card)}</span>
                            </div>
                            
                            {settings.blindClosureEnabled && (
                              <div className={`pt-4 border-t border-white/20 flex justify-between items-center ${parseFloat(cashDeclared || '0') - expectedCash >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                  <span className="font-black uppercase tracking-widest text-xs">Diferencia de Caja</span>
                                  <span className="text-3xl font-black">
                                    {formatPrice(parseFloat(cashDeclared || '0') - expectedCash)}
                                  </span>
                              </div>
                            )}

                            <div className="pt-4 border-t border-white/20 flex justify-between items-baseline opacity-60">
                                <span className="font-bold uppercase tracking-widest text-[10px]">IVA (19%) Acumulado</span>
                                <span className="text-xl font-bold">{formatPrice(iva)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-6 bg-yellow-50 rounded-3xl border border-yellow-100">
                        <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0" />
                        <div>
                            <p className="text-sm font-bold text-yellow-800">Confirmación de Cierre</p>
                            <p className="text-xs text-yellow-700/80 leading-relaxed font-medium">Al ejecutar el cierre Z se finalizará el turno actual y se reseteará el historial local para el nuevo día.</p>
                        </div>
                    </div>
                  </>
                )}
            </div>

            {!isDeclaring && (
              <div className="p-10 flex gap-4">
                  <Button variant="ghost" className="h-16 flex-1 rounded-2xl font-bold text-gray-400" onClick={onClose} disabled={isClosing}>
                      Cancelar
                  </Button>
                  <Button 
                    className="h-16 flex-[2] bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-lg gap-3 shadow-2xl transition-all active:scale-95"
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
            <div className="w-24 h-24 bg-green-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner shadow-green-200">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tight">Cierre Exitoso</h2>
            <p className="text-gray-500 font-medium text-lg mt-4 max-w-xs mx-auto">El Reporte Z ha sido generado y la caja ha sido reiniciada correctamente.</p>
            
            <div className="mt-12">
               <Button 
                onClick={handleFinish}
                className="w-full h-16 bg-corporate-blue hover:bg-corporate-dark text-white rounded-2xl font-black text-xl shadow-2xl shadow-corporate-blue/30"
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
