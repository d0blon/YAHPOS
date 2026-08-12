'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatPrice, cn } from '@/lib/utils'
import { Banknote, CreditCard, X, Delete, CheckCircle2, ArrowRight, RefreshCw, Smartphone, Zap, Globe, Building2, Tablet, QrCode } from 'lucide-react'
import { usePosStore } from '@/stores/posStore'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  total: number
  onConfirm: (method: 'EFECTIVO' | 'TARJETA' | 'TERMINAL' | 'JUNAEB' | 'PLUXE' | 'EDENRED' | 'WEBPAY_QR', receivedAmount?: number, terminalType?: string) => void
}

export function PaymentModal({ isOpen, onClose, total, onConfirm }: PaymentModalProps) {
  const { settings, items } = usePosStore();
  const [method, setMethod] = useState<'EFECTIVO' | 'TARJETA' | 'TERMINAL' | 'JUNAEB' | 'PLUXE' | 'EDENRED' | 'WEBPAY_QR'>('EFECTIVO')
  const [selectedTerminal, setSelectedTerminal] = useState('')
  const [isTerminalConfirmed, setIsTerminalConfirmed] = useState(false)
  const [receivedStr, setReceivedStr] = useState('')
  const receivedAmount = parseInt(receivedStr) || 0
  const change = receivedAmount - total

  const [webpayQrUrl, setWebpayQrUrl] = useState<string | null>(null)
  const [webpayToken, setWebpayToken] = useState<string | null>(null)
  const [webpayStatus, setWebpayStatus] = useState<'idle' | 'loading' | 'pending' | 'AUTHORIZED' | 'REJECTED' | 'ERROR'>('idle')

  const bills = [1000, 2000, 5000, 10000, 20000]

  const allTerminals = [
    { id: 'SumUp', key: 'sumup', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/10', desc: 'Sin arriendo, solo comisión. Simple.' },
    { id: 'Mercado Pago', key: 'other_card', icon: Globe, color: 'text-brand-accent-500', bg: 'bg-brand-accent-500/10', desc: 'Abono inmediato + Chip 4G gratis.' },
    { id: 'TUU', key: 'tuu', icon: Tablet, color: 'text-emerald-500', bg: 'bg-emerald-500/10', desc: 'Integración SII. Boleta en equipo.' },
    { id: 'Getnet', key: 'getnet', icon: Building2, color: 'text-rose-500', bg: 'bg-rose-500/10', desc: 'Dinero el mismo día. Santander.' },
    { id: 'Compraquí', key: 'other_card', icon: CreditCard, color: 'text-brand-500', bg: 'bg-brand-500/10', desc: 'Respaldo BancoEstado. Confiable.' }
  ];

  const activeTerminalsList = React.useMemo(() => {
    return allTerminals.filter(t => {
      if (!settings.activeTerminals) return true;
      return settings.activeTerminals[t.key as keyof typeof settings.activeTerminals] === true;
    });
  }, [settings.activeTerminals]);

  // Manejar el reset de estado sin useEffect para evitar cascading renders
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true);
    setMethod('EFECTIVO');
    setReceivedStr('');
    setIsTerminalConfirmed(false);
    setWebpayQrUrl(null);
    setWebpayToken(null);
    setWebpayStatus('idle');
    if (activeTerminalsList.length > 0) {
      setSelectedTerminal(activeTerminalsList[0].id);
    }
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false);
  }

  const handleMethodChange = (newMethod: typeof method) => {
    setMethod(newMethod);
    if (newMethod !== 'WEBPAY_QR') {
      setWebpayQrUrl(null);
      setWebpayToken(null);
      setWebpayStatus('idle');
    }
  };

  useEffect(() => {
    if (method !== 'WEBPAY_QR') return;
    if (webpayStatus !== 'idle') return

    const createWebpayQr = async () => {
      setWebpayStatus('loading')
      try {
        const res = await fetch('/api/payments/webpay/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: `${Date.now()}`,
            amount: total,
            returnUrl: window.location.origin
          })
        })
        const data = await res.json()
        if (data.url && data.token) {
          setWebpayQrUrl(data.url)
          setWebpayToken(data.token)
          setWebpayStatus('pending')
        } else {
          setWebpayStatus('ERROR')
        }
      } catch {
        setWebpayStatus('ERROR')
      }
    }

    createWebpayQr()
  }, [method, total, webpayStatus])

  useEffect(() => {
    if (webpayStatus !== 'pending' || !webpayToken) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/webpay/status?token=${webpayToken}`)
        const data = await res.json()
        if (data.status === 'AUTHORIZED') {
          setWebpayStatus('AUTHORIZED')
          clearInterval(interval)
        } else if (data.status === 'REJECTED' || data.status === 'UNKNOWN') {
          setWebpayStatus('REJECTED')
          clearInterval(interval)
        }
      } catch {
        // Network error, keep polling
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [webpayStatus, webpayToken])

  useEffect(() => {
    if (webpayStatus === 'AUTHORIZED') {
      const timer = setTimeout(() => {
        onConfirm('WEBPAY_QR', total)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [webpayStatus, onConfirm, total])

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

  const maxSeals = settings.maxSeals || 2
  const invalidJunaebItems = items.filter(item => {
    const seals = item.product.nutritionalSeals ?? 0
    return seals > maxSeals
  })
  const isFoodPassValid = invalidJunaebItems.length === 0

  const canConfirm = method === 'EFECTIVO' ? receivedAmount >= total : 
                     method === 'TERMINAL' ? (selectedTerminal !== '' && isTerminalConfirmed) : 
                     (method === 'JUNAEB' || method === 'PLUXE' || method === 'EDENRED') ? isFoodPassValid :
                     method === 'WEBPAY_QR' ? webpayStatus === 'AUTHORIZED' : true

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden bg-white dark:bg-surface-100 rounded-[3rem] border-none shadow-2xl text-slate-900 dark:text-white flex flex-col md:flex-row h-auto max-h-[95vh] md:h-[700px] animate-in zoom-in-95 duration-300">
        <DialogTitle className="sr-only">Canal de Cobro</DialogTitle>
        
        {/* Left Side: Summary & Methods */}
        <div className="w-full md:w-[350px] bg-slate-50 dark:bg-surface-200/50 p-8 border-b md:border-b-0 md:border-r border-slate-100 dark:border-gray-800 flex flex-col shrink-0">
          <div className="flex items-center gap-3 mb-8">
             <div className="p-2 bg-brand-primary rounded-lg">
                <Banknote className="w-5 h-5 text-white" />
             </div>
             <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-gray-400">Canal de Cobro</h2>
          </div>
          
          <div className="flex-1 space-y-4">
            <button 
              onClick={() => handleMethodChange('EFECTIVO')}
              className={cn(
                "w-full p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden",
                method === 'EFECTIVO' 
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-2xl shadow-emerald-500/30 scale-[1.02]" 
                  : "bg-white dark:bg-surface-100 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-emerald-500/30"
              )}
            >
              <Banknote className={cn("w-10 h-10 transition-transform group-hover:scale-110", method === 'EFECTIVO' ? "text-white" : "text-slate-300")} />
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Efectivo</span>
              {method === 'EFECTIVO' && <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />}
            </button>

            <button 
              onClick={() => handleMethodChange('TARJETA')}
              className={cn(
                "w-full p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden",
                method === 'TARJETA' 
                  ? "bg-brand-primary border-brand-primary text-white shadow-2xl shadow-brand-primary/30 scale-[1.02]" 
                  : "bg-white dark:bg-surface-100 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-brand-primary/30"
              )}
            >
              <CreditCard className={cn("w-10 h-10 transition-transform group-hover:scale-110", method === 'TARJETA' ? "text-white" : "text-slate-300")} />
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Tarjeta</span>
              {method === 'TARJETA' && <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />}
            </button>

            <button 
              onClick={() => handleMethodChange('WEBPAY_QR')}
              className={cn(
                "w-full p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden",
                method === 'WEBPAY_QR' 
                  ? "bg-brand-primary border-brand-primary text-white shadow-2xl shadow-brand-primary/30 scale-[1.02]" 
                  : "bg-white dark:bg-surface-100 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-brand-primary/30"
              )}
            >
              <QrCode className={cn("w-10 h-10 transition-transform group-hover:scale-110", method === 'WEBPAY_QR' ? "text-white" : "text-slate-300")} />
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Webpay QR</span>
              {method === 'WEBPAY_QR' && <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />}
            </button>

            <button 
              onClick={() => handleMethodChange('TERMINAL')}
              className={cn(                "w-full p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-4 transition-all duration-300 group relative overflow-hidden",
                method === 'TERMINAL' 
                  ? "bg-amber-500 border-amber-500 text-white shadow-2xl shadow-amber-500/30 scale-[1.02]" 
                  : "bg-white dark:bg-surface-100 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-amber-500/30"
              )}
            >
              <Smartphone className={cn("w-10 h-10 transition-transform group-hover:scale-110", method === 'TERMINAL' ? "text-white" : "text-slate-300")} />
              <span className="font-black uppercase tracking-[0.2em] text-[10px]">Terminal</span>
              {method === 'TERMINAL' && <div className="absolute top-2 right-4 w-2 h-2 bg-white rounded-full animate-ping" />}
            </button>

            <div className="grid grid-cols-2 gap-2">
              {settings.junaebEnabled && (
                <button 
                  onClick={() => handleMethodChange('JUNAEB')}
                  className={cn(
                    "p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all duration-300 group relative overflow-hidden",
                    method === 'JUNAEB' 
                      ? "bg-rose-500 border-rose-500 text-white shadow-2xl shadow-rose-500/30 scale-[1.02]" 
                      : "bg-white dark:bg-surface-100 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-rose-500/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-xl transition-transform group-hover:scale-110", method === 'JUNAEB' ? "text-white" : "text-slate-300")}>J</div>
                  <span className="font-black uppercase tracking-[0.1em] text-[8px]">Junaeb</span>
                </button>
              )}

              {settings.pluxeEnabled && settings.region === 'RM' && (
                <button 
                  onClick={() => handleMethodChange('PLUXE')}
                  className={cn(
                    "p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all duration-300 group relative overflow-hidden",
                    method === 'PLUXE' 
                      ? "bg-brand-500 border-brand-500 text-white shadow-2xl shadow-brand-500/30 scale-[1.02]" 
                      : "bg-white dark:bg-surface-100 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-brand-500/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-xl transition-transform group-hover:scale-110", method === 'PLUXE' ? "text-white" : "text-slate-300")}>P</div>
                  <span className="font-black uppercase tracking-[0.1em] text-[8px]">Pluxe</span>
                </button>
              )}

              {settings.edenredEnabled && settings.region === 'REGIONES' && (
                <button 
                  onClick={() => handleMethodChange('EDENRED')}
                  className={cn(
                    "p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all duration-300 group relative overflow-hidden",
                    method === 'EDENRED' 
                      ? "bg-orange-500 border-orange-500 text-white shadow-2xl shadow-orange-500/30 scale-[1.02]" 
                      : "bg-white dark:bg-surface-100 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-orange-500/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-black text-xl transition-transform group-hover:scale-110", method === 'EDENRED' ? "text-white" : "text-slate-300")}>E</div>
                  <span className="font-black uppercase tracking-[0.1em] text-[8px]">Edenred</span>
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 p-8 bg-white dark:bg-surface-100 rounded-[2.5rem] border border-slate-100 dark:border-gray-800 shadow-sm text-center">
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-gray-500 mb-2">Total a Cobrar</p>
             <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{formatPrice(total)}</p>
          </div>
        </div>

        {/* Right Side: Calculation */}
        <div className="flex-1 p-8 md:p-12 flex flex-col bg-white dark:bg-surface-100 overflow-y-auto">
          {method === 'EFECTIVO' ? (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                <div className="bg-slate-50 dark:bg-surface-200/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-gray-800 shadow-inner">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Monto Recibido</p>
                  <p className="text-6xl font-black text-emerald-600 tracking-tighter leading-none">{formatPrice(receivedAmount)}</p>
                </div>
                <div className={cn(
                  "rounded-[2.5rem] p-8 border transition-all duration-700",
                  change >= 0 ? "bg-amber-500/10 border-amber-500/20 shadow-xl" : "bg-slate-50 dark:bg-surface-200/50 border-slate-100 dark:border-gray-800"
                )}>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Vuelto Cliente</p>
                  <p className={cn("text-6xl font-black tracking-tighter leading-none", change >= 0 ? "text-amber-500 animate-in zoom-in-95 duration-500" : "text-slate-200 dark:text-gray-800")}>
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
                      className="h-20 lg:h-auto bg-white dark:bg-surface-200 border-2 border-slate-50 dark:border-gray-800 rounded-3xl text-4xl font-black text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 hover:border-brand-primary/30 active:scale-95 transition-all shadow-sm flex items-center justify-center group"
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
                     className="flex-1 bg-slate-900 dark:bg-white dark:text-gray-900 rounded-2xl flex items-center justify-center text-white font-black text-[10px] uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl"
                  >
                    Exacto
                  </button>
                </div>
              </div>
            </div>
          ) : method === 'TARJETA' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-10 animate-in fade-in zoom-in-95 duration-700 py-10">
              <div className="relative">
                <div className="w-48 h-48 bg-brand-primary/10 rounded-[4rem] flex items-center justify-center relative border-4 border-brand-primary/20">
                  <div className="absolute inset-0 bg-brand-primary/20 rounded-[4rem] animate-ping duration-[3000ms]" />
                  <CreditCard className="w-24 h-24 text-brand-primary animate-pulse" />
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white dark:bg-surface-100 rounded-full flex items-center justify-center shadow-xl border border-slate-100 dark:border-gray-800">
                    <RefreshCw className="w-8 h-8 text-brand-primary/80 animate-spin" />
                </div>
              </div>
              <div className="max-w-xs">
                <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none italic mb-4">Procesando...</h3>
                <p className="text-slate-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Inserte o acerque la tarjeta al terminal Transbank para finalizar.</p>
              </div>
              <div className="flex gap-3">
                 <div className="w-3 h-3 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-3 h-3 bg-brand-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-3 h-3 bg-brand-primary rounded-full animate-bounce" />
              </div>
            </div>
          ) : method === 'WEBPAY_QR' ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-10 animate-in fade-in zoom-in-95 duration-700">
              {webpayStatus === 'loading' && (
                <div className="flex flex-col items-center justify-center space-y-10">
                  <div className="relative">
                    <div className="w-48 h-48 bg-brand-primary/10 rounded-[4rem] flex items-center justify-center relative border-4 border-brand-primary/20">
                      <div className="absolute inset-0 bg-brand-primary/20 rounded-[4rem] animate-ping duration-[3000ms]" />
                      <QrCode className="w-24 h-24 text-brand-primary animate-pulse" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Generando QR...</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mt-2">Preparando pago Webpay</p>
                  </div>
                </div>
              )}
              {webpayStatus === 'pending' && webpayQrUrl && (
                <div className="flex flex-col items-center justify-center space-y-8">
                  <div className="bg-white rounded-3xl p-4 shadow-2xl border-4 border-brand-primary/20">
                    <img src={webpayQrUrl} alt="Webpay QR" className="w-80 h-80" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Escanea con tu banco</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mt-2">Usá la app de tu banco para pagar con Webpay</p>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold uppercase tracking-widest">Esperando pago...</span>
                  </div>
                  <button onClick={() => handleMethodChange('EFECTIVO')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 underline font-bold uppercase tracking-widest">
                    Cancelar pago
                  </button>
                </div>
              )}
              {webpayStatus === 'AUTHORIZED' && (
                <div className="flex flex-col items-center justify-center space-y-10">
                  <div className="relative">
                    <div className="w-48 h-48 bg-emerald-500/10 rounded-[4rem] flex items-center justify-center relative border-4 border-emerald-500/20">
                      <div className="absolute inset-0 bg-emerald-500/20 rounded-[4rem] animate-ping duration-[3000ms]" />
                      <CheckCircle2 className="w-24 h-24 text-emerald-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-emerald-600 tracking-tighter">Pago Aprobado</h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mt-2">Redirigiendo...</p>
                  </div>
                </div>
              )}
              {(webpayStatus === 'REJECTED' || webpayStatus === 'ERROR') && (
                <div className="flex flex-col items-center justify-center space-y-8">
                  <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center relative">
                    <X className="w-12 h-12 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {webpayStatus === 'REJECTED' ? 'Pago Rechazado' : 'Error de Conexión'}
                    </h3>
                    <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mt-2 max-w-xs">
                      {webpayStatus === 'REJECTED'
                        ? 'El pago no pudo ser procesado. Intentá de nuevo.'
                        : 'Ocurrió un error al procesar el pago. Verificá tu conexión e intentá de nuevo.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setWebpayQrUrl(null)
                      setWebpayToken(null)
                      setWebpayStatus('idle')
                    }}
                    className="bg-brand-primary hover:brightness-90 text-white rounded-2xl px-10 py-4 font-black uppercase tracking-widest text-xs shadow-lg transition-all"
                  >
                    Reintentar
                  </button>
                  <button onClick={() => handleMethodChange('EFECTIVO')} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 underline font-bold uppercase tracking-widest">
                    Otro método de pago
                  </button>
                </div>
              )}
            </div>
          ) : method === 'TERMINAL' ? (
            <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-[2.5rem] p-8 flex items-center justify-between">
                 <div>
                   <h3 className="text-2xl font-black text-amber-500 uppercase italic tracking-tighter">Terminal Físico</h3>
                   <p className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mt-1">Seleccione el terminal para enviar el monto</p>
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
                          ? "bg-white dark:bg-surface-200 border-amber-500 shadow-xl scale-[1.02]" 
                          : "bg-slate-50 dark:bg-surface-200/30 border-slate-100 dark:border-gray-800 text-slate-400 hover:border-amber-500/30"
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
          ) : (method === 'JUNAEB' || method === 'PLUXE' || method === 'EDENRED') ? (
            <div className="flex-1 flex flex-col space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
              <div className={cn(
                "border rounded-[2.5rem] p-8 flex items-center justify-between",
                method === 'JUNAEB' ? "bg-rose-500/10 border-rose-500/20" : 
                method === 'PLUXE' ? "bg-brand-500/10 border-brand-500/20" : 
                "bg-orange-500/10 border-orange-500/20"
              )}>
                 <div>
                   <h3 className={cn("text-2xl font-black uppercase italic tracking-tighter", 
                     method === 'JUNAEB' ? "text-rose-500" : 
                     method === 'PLUXE' ? "text-brand-500" : 
                     "text-orange-500")}>
                     {method === 'JUNAEB' ? 'Beca Junaeb' : 
                      method === 'PLUXE' ? 'Ticket Pluxe / Sodexo' : 
                      'Edenred Ticket'}
                   </h3>
                   <p className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-widest mt-1">Validación de productos permitidos</p>
                 </div>
                 <div className={cn("w-12 h-12 text-white rounded-xl flex items-center justify-center font-black text-2xl shadow-lg", 
                   method === 'JUNAEB' ? "bg-rose-500" : 
                   method === 'PLUXE' ? "bg-brand-500" : 
                   "bg-orange-500")}>
                   {method.charAt(0)}
                 </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                {!isFoodPassValid ? (
                  <div className="space-y-6">
                    <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-12 h-12 text-red-500" />
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Carrito Inválido</h4>
                    <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">Existen {invalidJunaebItems.length} producto(s) con más de {maxSeals} sellos. La normativa prohíbe la compra de estos artículos.</p>
                    
                    <div className="bg-slate-50 dark:bg-surface-200/50 rounded-2xl p-4 text-left border border-red-200 dark:border-red-900/50 max-h-48 overflow-y-auto w-full max-w-md mx-auto custom-scrollbar">
                      <ul className="space-y-2">
                        {invalidJunaebItems.map(item => (
                          <li key={item.product.id} className="text-xs font-bold text-slate-600 dark:text-gray-300 flex justify-between">
                            <span>{item.product.name}</span>
                            <span className="text-red-500">{item.product.nutritionalSeals ?? 0} sellos</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                      <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/30 rounded-full animate-ping" />
                      <CheckCircle2 className="w-12 h-12 text-emerald-500 relative z-10" />
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Productos Válidos</h4>
                    <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">Todos los productos cumplen con la normativa. Procesa el pago en tu terminal físico y luego registra la venta aquí.</p>
                    <p className={cn("text-xs font-bold max-w-md mx-auto p-3 rounded-xl border", 
                      method === 'JUNAEB' ? "text-rose-500 bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900/30" : 
                      method === 'PLUXE' ? "text-brand-500 bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-900/30" :
                      "text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30")}>
                      Esta venta se registrará internamente y no generará documento en el SII, ya que el IVA se procesa mediante la aplicación del convenio.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="mt-12 flex flex-col sm:flex-row gap-4">
            <Button 
              variant="ghost" 
              onClick={onClose}
              className="h-20 px-10 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all sm:w-auto w-full"
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
                  : method === 'TARJETA' ? "bg-brand-primary hover:brightness-90 shadow-brand-primary/40 text-white"
                  : method === 'WEBPAY_QR' ? "bg-brand-primary hover:brightness-90 shadow-brand-primary/40 text-white"
                  : method === 'EDENRED' ? "bg-orange-500 hover:bg-orange-600 shadow-orange-500/40 text-white"
                  : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/40 text-white"
              )}
            >
              {method === 'WEBPAY_QR' ? (
                <>
                  {webpayStatus === 'loading' && <>GENERANDO QR...</>}
                  {webpayStatus === 'pending' && <>ESPERANDO PAGO...</>}
                  {webpayStatus === 'AUTHORIZED' && <><CheckCircle2 className="mr-3 w-6 h-6" />PAGO APROBADO</>}
                  {webpayStatus === 'REJECTED' && <>RECHAZADO - REINTENTAR</>}
                  {webpayStatus === 'ERROR' && <>ERROR</>}
                  {webpayStatus === 'idle' && <>WEBPAY QR</>}
                </>
              ) : canConfirm ? (
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
