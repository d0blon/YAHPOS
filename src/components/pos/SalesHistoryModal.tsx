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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col">
        
        {/* Header */}
        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div>
            <h2 className="text-3xl font-black text-gray-900 leading-tight">Historial de Ventas</h2>
            <p className="text-gray-500 font-medium">Auditoría completa del turno actual</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-8 h-8 text-gray-400" />
          </button>
        </div>

        {/* Filters / Stats Summary */}
        <div className="p-6 bg-white border-b border-gray-100 grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Ventas</p>
                <p className="text-2xl font-black text-gray-900">{sales.length}</p>
            </div>
            <div className="bg-corporate-blue/5 p-4 rounded-2xl border border-corporate-blue/10">
                <p className="text-[10px] font-bold text-corporate-blue uppercase tracking-wider mb-1">Monto Total</p>
                <p className="text-2xl font-black text-corporate-blue">{formatPrice(sales.reduce((s, o) => s + o.total, 0))}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">Efectivo</p>
                <p className="text-2xl font-black text-green-700">{formatPrice(sales.filter(s => s.paymentMethod === 'EFECTIVO').reduce((s, o) => s + o.total, 0))}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1">Tarjetas</p>
                <p className="text-2xl font-black text-purple-700">{formatPrice(sales.filter(s => s.paymentMethod === 'TARJETA').reduce((s, o) => s + o.total, 0))}</p>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50/30">
          {sales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                <ShoppingBag className="w-20 h-20 opacity-20" />
                <p className="text-xl font-bold italic">No hay ventas registradas aún</p>
            </div>
          ) : (
            sales.map((sale) => (
              <div 
                key={sale.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:border-corporate-blue/30 transition-all group"
              >
                <div className="flex items-center gap-6">
                  <div className={`p-4 rounded-2xl ${sale.paymentMethod === 'EFECTIVO' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'}`}>
                    {sale.paymentMethod === 'EFECTIVO' ? <Banknote className="w-8 h-8" /> : <CreditCard className="w-8 h-8" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-lg text-gray-900">#{sale.id}</span>
                        {sale.isOffline && <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Offline</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {new Date(sale.timestamp).toLocaleTimeString()}</span>
                        <span className="flex items-center gap-1 font-bold text-gray-700"><User className="w-4 h-4"/> {sale.customerName || 'Cliente Genérico'}</span>
                        <span className="flex items-center gap-1">{sale.items.length} productos</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                   <div className="text-right">
                      <p className="text-2xl font-black text-gray-900">{formatPrice(sale.total)}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{sale.paymentMethod}</p>
                   </div>
                   <Button 
                     variant="outline" 
                     className="rounded-xl border-gray-200 hover:bg-corporate-blue hover:text-white hover:border-corporate-blue transition-all"
                     onClick={() => onReprint(sale)}
                   >
                     <Printer className="w-5 h-5 mr-2" /> Re-imprimir
                   </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 text-center bg-gray-50/50">
            <p className="text-xs text-gray-400 font-medium">Desliza para ver más historial • Reporte generado localmente</p>
        </div>
      </div>
    </div>
  )
}
