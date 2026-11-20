'use client'

import React, { useRef } from 'react'
import { Printer, CheckCircle2, DollarSign, Calendar, Clock, User, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { CashMovement } from '@/stores/posStore'

interface MovementReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  movement: CashMovement | null
}

export function MovementReceiptModal({ isOpen, onClose, movement }: MovementReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !movement) return null

  const handlePrint = () => {
    const printContent = receiptRef.current
    const windowUrl = 'about:blank'
    const uniqueName = new Date().getTime()
    const windowName = 'Print' + uniqueName
    
    const printWindow = window.open(windowUrl, windowName, 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0')
    
    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Comprobante de Caja</title>
            <style>
              @page { size: 80mm auto; margin: 0; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 80mm; 
                padding: 10mm;
                line-height: 1.2;
                font-size: 12px;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
              .large { font-size: 16px; }
              .amount { font-size: 20px; font-weight: bold; margin: 10px 0; }
            </style>
          </head>
          <body></body>
        </html>
      `)
      // Clonar nodos DOM en vez de reinsertar HTML serializado: evita volver a
      // interpretar markup y mantiene el escape que ya aplicó React.
      const receiptClone = printContent.cloneNode(true) as HTMLElement
      printWindow.document.body.insertBefore(receiptClone, printWindow.document.body.firstChild)
      printWindow.document.close()
      // Llamar desde el padre: un <script> inline en about:blank heredero del CSP
      // sería bloqueado por script-src con nonce.
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 500)
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-gray-950/90 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-500 border border-white flex flex-col">
        
        {/* Success Header */}
        <div className="p-10 pb-6 text-center">
            <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg ${movement.type === 'IN' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
              {movement.type === 'IN' ? <CheckCircle2 className="w-10 h-10" /> : <Printer className="w-10 h-10" />}
            </div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Registro Exitoso</h2>
            <p className="text-gray-500 font-medium mt-2">Movimiento de Caja #${movement.id.split('-')[1]}</p>
        </div>

        {/* Receipt Preview Area */}
        <div className="px-10">
          <div 
            ref={receiptRef}
            className="p-8 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 relative overflow-hidden"
          >
            {/* Decal Background */}
            <div className="absolute top-[-20px] right-[-20px] opacity-[0.03] rotate-12 scale-150">
               <DollarSign className="w-40 h-40" />
            </div>

            <div className="relative z-10 space-y-4">
                <div className="text-center pb-4 border-b border-gray-200 border-dashed">
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">AustralMarket POS</p>
                  <p className="text-sm font-bold text-gray-800">Comprobante de {movement.type === 'IN' ? 'Ingreso' : 'Egreso'}</p>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-gray-400 font-bold">
                            <Calendar className="w-3 h-3" /> FECHA
                        </div>
                        <span className="font-black text-gray-700">{new Date(movement.timestamp).toLocaleDateString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-gray-400 font-bold">
                            <Clock className="w-3 h-3" /> HORA
                        </div>
                        <span className="font-black text-gray-700">{new Date(movement.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-gray-400 font-bold">
                            <User className="w-3 h-3" /> CAJERO
                        </div>
                        <span className="font-black text-gray-700 uppercase">{movement.cashier}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2 text-gray-400 font-bold">
                            <Tag className="w-3 h-3" /> CATEGORÍA
                        </div>
                        <span className={`font-black text-[10px] px-2 py-0.5 rounded ${movement.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {movement.category}
                        </span>
                    </div>
                </div>

                <div className="py-6 border-y border-gray-200 border-dashed flex flex-col items-center justify-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">MONTO TOTAL</p>
                    <p className={`text-5xl font-black ${movement.type === 'IN' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatPrice(movement.amount)}
                    </p>
                </div>

                <div className="pt-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">MOTIVO / NOTA:</p>
                    <p className="text-sm font-bold text-gray-700 leading-tight italic bg-white p-3 rounded-xl border border-gray-100">
                        &quot;{movement.reason}&quot;
                    </p>
                </div>

                <div className="pt-8 text-center">
                    <div className="w-32 h-1 bg-gray-200 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-gray-300 uppercase">Firma Responsable</p>
                </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-10 pt-8 flex gap-4">
            <Button 
                variant="outline" 
                className="h-16 flex-1 rounded-2xl font-bold text-gray-500 border-gray-200"
                onClick={onClose}
            >
                Cerrar
            </Button>
            <Button 
                className="h-16 flex-[2] bg-gray-900 hover:bg-black text-white rounded-2xl font-black text-xl gap-3 shadow-2xl transition-all active:scale-95"
                onClick={handlePrint}
            >
                <Printer className="w-6 h-6" />
                IMPRIMIR
            </Button>
        </div>
      </div>
    </div>
  )
}
