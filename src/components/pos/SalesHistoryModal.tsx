'use client'

import React from 'react'
import { X, Search, Printer, ShoppingBag, Clock, User, CreditCard, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { OrderRecord } from '@/stores/posStore'

interface SalesHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  sales: OrderRecord[]
  onReprint: (sale: OrderRecord) => void
}

export function SalesHistoryModal({ isOpen, onClose, sales, onReprint }: SalesHistoryModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">Historial de Ventas</h2>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Auditoría de Turno en Tiempo Real</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors group">
            <X className="w-8 h-8 text-slate-300 group-hover:text-slate-600 dark:group-hover:text-white" />
          </button>
        </div>

        {/* Filters / Stats Summary */}
        <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Ventas</p>
                <p className="text-2xl font-black text-slate-900 dark:text-white">{sales.length}</p>
            </div>
            <div className="bg-patagonia-600/5 dark:bg-patagonia-600/10 p-4 rounded-2xl border border-patagonia-600/10">
                <p className="text-[10px] font-black text-patagonia-600 uppercase tracking-widest mb-1">Monto Bruto</p>
                <p className="text-2xl font-black text-patagonia-600">{formatPrice(sales.reduce((s, o) => s + o.total, 0))}</p>
            </div>
            <div className="bg-emerald-500/5 dark:bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/10">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Efectivo</p>
                <p className="text-2xl font-black text-emerald-600">{formatPrice(sales.filter(s => s.paymentMethod === 'EFECTIVO').reduce((s, o) => s + o.total, 0))}</p>
            </div>
            <div className="bg-amber-500/5 dark:bg-amber-500/10 p-4 rounded-2xl border border-amber-500/10">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Tarjetas</p>
                <p className="text-2xl font-black text-amber-600">{formatPrice(sales.filter(s => s.paymentMethod === 'TARJETA').reduce((s, o) => s + o.total, 0))}</p>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50 dark:bg-slate-950/20 custom-scrollbar">
          {sales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-50">
                <ShoppingBag className="w-24 h-24 stroke-[1]" />
                <p className="text-xs font-black uppercase tracking-[0.3em]">Sin Ventas Registradas</p>
            </div>
          ) : (
            sales.map((sale) => (
              <div 
                key={sale.id}
                className="bg-white dark:bg-slate-900 p-5 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between hover:border-patagonia-600/30 transition-all group gap-4"
              >
                <div className="flex items-center gap-5 w-full sm:w-auto">
                  <div className={`p-4 rounded-2xl transition-all group-hover:scale-110 ${sale.paymentMethod === 'EFECTIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-patagonia-600/10 text-patagonia-600'}`}>
                    {sale.paymentMethod === 'EFECTIVO' ? <Banknote className="w-7 h-7" /> : <CreditCard className="w-7 h-7" />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">#{sale.id}</span>
                        {sale.isOffline && <span className="text-[9px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Offline</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 opacity-50"/> {new Date(sale.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300"><User className="w-3.5 h-3.5 opacity-50"/> {sale.customerName || 'Público General'}</span>
                        <span className="flex items-center gap-1.5 opacity-50">{sale.items.length} ART.</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto sm:gap-8 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-4 sm:pt-0">
                   <div className="text-left sm:text-right">
                      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{formatPrice(sale.total)}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{sale.paymentMethod}</p>
                   </div>
                   <Button 
                     variant="outline" 
                     className="h-12 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-patagonia-600 hover:text-white hover:border-patagonia-600 transition-all font-black text-[10px] uppercase tracking-widest gap-2"
                     onClick={() => onReprint(sale)}
                   >
                     <Printer className="w-4 h-4" /> Ticket
                   </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50 dark:bg-slate-800/50">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em]">Registro Histórico • Auditado por PatagoniaPOS</p>
        </div>
      </div>
    </div>
  )
}
