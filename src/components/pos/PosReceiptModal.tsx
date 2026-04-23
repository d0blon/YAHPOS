'use client'

import React from 'react';
import { Printer, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, cn } from '@/lib/utils';
import { PosItem, usePosStore } from '@/stores/posStore';
import { useSaaS } from '@/providers/SaaSProvider';

interface PosReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    orderId: string;
    items: PosItem[];
    subtotal: number;
    total: number;
    pointsToEarn?: number;
    customerRut?: string;
    customerName?: string;
    customerPoints?: number;
    date: string;
    paymentMethod: string;
    isOffline?: boolean;
  } | null;
}

export function PosReceiptModal({ isOpen, onClose, orderData }: PosReceiptModalProps) {
  const { isTrainingMode } = usePosStore();
  const { config } = useSaaS();
  
  if (!isOpen || !orderData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-[380px] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 print:hidden">
          <h3 className="font-semibold text-gray-700">Comprobante de Venta</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full">
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 font-mono text-sm print:p-0 print:bg-white print:text-black printable-receipt bg-white text-gray-900 relative">
          
          {isTrainingMode && (
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none rotate-[-45deg] z-0 select-none">
                <p className="text-4xl font-black text-red-600 text-center uppercase">
                  NO VÁLIDO<br />ENTRENAMIENTO
                </p>
            </div>
          )}

          <div className="text-center mb-6 relative z-10">
            <img src="/logos/logo-light.png" alt="Logo" className="h-16 mx-auto mb-2 object-contain mix-blend-multiply" />
            <h2 className="font-bold text-xl uppercase mb-1">{config.store_name}</h2>
            <p className="text-xs">RUT: 76.123.456-7</p>
            <p className="text-xs">Giro: Supermercado Retail</p>
            <p className="text-xs">Av. Los Carrera 123, Castro, Los Lagos</p>
            <div className="mt-4 border-t border-dashed border-gray-300 pt-4">
              <p className="font-bold text-lg mb-1">
                {orderData.isOffline ? 'PRE-FOLIO INTERNO' : 'BOLETA ELECTRÓNICA'}
              </p>
              <p className="text-xs">N°: {orderData.orderId}</p>
              <p className="text-xs">Fecha: {orderData.date}</p>
            </div>
            {orderData.customerRut && (
               <p className="text-xs mt-2 text-left bg-gray-100 print:bg-transparent p-1">Cliente RUT: {orderData.customerRut}</p>
            )}
          </div>
          
          <table className="w-full mb-4 text-xs">
            <thead>
              <tr className="border-b border-dashed border-gray-300">
                <th className="text-left font-normal py-1 w-2/3">Artículo</th>
                <th className="text-right font-normal py-1">Total</th>
              </tr>
            </thead>
            <tbody>
              {orderData.items.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr>
                    <td colSpan={2} className="pt-2 font-semibold">{item.product.name}</td>
                  </tr>
                  <tr>
                    <td className="pb-1 text-gray-500 text-[10px]">
                      {item.product.unit === 'kg' 
                        ? `${item.quantity.toFixed(3)}kg x ${formatPrice(item.product.price)}` 
                        : `${item.quantity} x ${formatPrice(item.product.price)}`}
                    </td>
                    <td className="text-right pb-1 font-bold">{formatPrice(item.product.price * item.quantity)}</td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-gray-300 pt-2 mb-6">
            <div className="flex justify-between font-bold text-base mt-2">
              <span>TOTAL</span>
              <span>{formatPrice(orderData.total)}</span>
            </div>
            <div className="flex justify-between text-[11px] mt-2 text-gray-600 italic">
              <span>MÉTODO PAGO</span>
              <span className="uppercase">{orderData.paymentMethod}</span>
            </div>
          </div>

          {(orderData.customerName || orderData.pointsToEarn) && (
            <div className="bg-gray-50 p-2 border border-dashed border-gray-300 rounded mb-4 text-[10px]">
              <p className="font-bold border-b border-gray-200 mb-1 pb-1">CLUB PUNTOS AUSTRAL</p>
              {orderData.customerName && <p>TITULAR: {orderData.customerName}</p>}
              {orderData.pointsToEarn && <p>GANASTE: +{orderData.pointsToEarn} pts</p>}
            </div>
          )}

          {isTrainingMode && (
            <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">Documento de Prueba</p>
                <p className="text-[9px] text-orange-700 leading-tight font-bold italic">Simulación para capacitación. Impresión deshabilitada.</p>
              </div>
            </div>
          )}

          <div className="text-center text-xs text-gray-500 mt-8 mb-4 border-t border-dashed border-gray-200 pt-4">
             {isTrainingMode ? (
               <p className="font-black text-orange-600">*** ENTRENAMIENTO ***</p>
             ) : (
               <p>Gracias por su preferencia</p>
             )}
             <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col items-center gap-1 opacity-40">
               <p className="text-[8px] font-black tracking-[0.3em] uppercase">Powered by</p>
               <p className="text-[10px] font-black tracking-tighter">PatagoniaPOS © 2026</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 print:hidden">
            <Button variant="outline" className="flex-1 border-gray-300 text-slate-700 hover:bg-gray-100 font-bold" onClick={onClose}>
              Cerrar
            </Button>
            <Button 
              className={cn(
                "flex-1 gap-2 font-black shadow-lg",
                isTrainingMode 
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                  : "bg-corporate-blue text-white"
              )} 
              onClick={isTrainingMode ? undefined : handlePrint}
              disabled={isTrainingMode}
            >
              <Printer className="w-4 h-4"/> 
              {isTrainingMode ? 'NO PRINT' : 'Imprimir'}
            </Button>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * { visibility: hidden !important; }
          html, body {
            margin: 0; padding: 0;
            background-color: white;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
          .printable-receipt, .printable-receipt * { 
            visibility: visible !important; 
            font-family: 'Courier New', Courier, monospace !important;
            color: black !important;
          }
          .printable-receipt { 
             position: absolute !important; 
             left: 0 !important; 
             top: 0 !important; 
             width: 78mm !important; 
             padding: 2mm !important;
             box-sizing: border-box !important;
          }
        }
      `}} />
    </div>
  );
}
