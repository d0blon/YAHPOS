'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, CheckCircle2, Wifi, WifiOff, ScanLine, Award, Package, Monitor } from 'lucide-react'
import { useCustomerDisplayReceiver, type CustomerDisplayData } from '@/lib/hooks/useCustomerDisplaySync'
import { formatPrice, cn } from '@/lib/utils'

function ConfettiParticle({ index }: { index: number }) {
  const colors = ['#ffd100', '#4b0082', '#22c55e', '#ef4444', '#3b82f6', '#f97316']
  const color = colors[index % colors.length]
  const left = `${Math.random() * 100}%`
  const delay = Math.random() * 0.5
  const duration = 1.5 + Math.random() * 1.5
  const size = 6 + Math.random() * 10

  return (
    <motion.div
      className="absolute top-0 rounded-sm"
      style={{ left, width: size, height: size, backgroundColor: color }}
      initial={{ y: -20, rotate: 0, opacity: 1 }}
      animate={{ y: '100vh', rotate: 720, opacity: 0 }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatDelay: 1 }}
    />
  )
}

function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-8 p-10">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="w-32 h-32 rounded-3xl bg-brand-primary flex items-center justify-center shadow-2xl shadow-brand-primary/30">
          <ShoppingCart className="w-16 h-16 text-white" />
        </div>
      </motion.div>
      <motion.h1
        className="text-5xl font-black text-foreground tracking-tight"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Bienvenido
      </motion.h1>
      <motion.p
        className="text-2xl text-muted-foreground font-medium"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.35 }}
      >
        Escanea tus productos para comenzar
      </motion.p>
    </div>
  )
}

function ProductCard({ item }: { item: NonNullable<CustomerDisplayData['items']>[number] }) {
  const hasDiscount = item.originalPrice && item.originalPrice > item.price
  const discountPercent = hasDiscount ? Math.round((1 - item.price / item.originalPrice!) * 100) : 0
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex items-center gap-5 px-6 py-4 bg-surface-100/50 rounded-2xl border border-border min-h-[110px]">
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-200/50 border border-border flex items-center justify-center shrink-0">
        {item.image && !imgError ? (
          <img
            src={item.image}
            alt={item.name}
            crossOrigin="anonymous"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-1.5"
          />
        ) : (
          <Package className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {item.category && (
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-wider">{item.category}</span>
          )}
          {item.unit === 'kg' && (
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">· PESO</span>
          )}
        </div>
        <h3 className="text-lg font-black text-foreground leading-tight truncate">{item.name}</h3>

        {item.packDescription && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-brand-primary font-bold">{item.packDescription}</span>
            {item.packQuantity && item.packPrice && (
              <span className="text-xs text-muted-foreground">{item.packQuantity}x {formatPrice(item.packPrice)}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="text-center min-w-[48px]">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Cant</div>
          <div className="text-xl font-black text-foreground">{item.quantity}</div>
        </div>
        <div className="text-right min-w-[120px]">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">P. Unit</div>
          {hasDiscount ? (
            <div className="flex flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground line-through font-bold">{formatPrice(item.originalPrice!)}</span>
                <span className="text-lg font-black text-brand-primary">{formatPrice(item.price)}</span>
                <span className="px-1 py-0.5 rounded bg-green-500/20 text-green-600 text-[9px] font-black">-{discountPercent}%</span>
              </div>
            </div>
          ) : (
            <span className="text-lg font-black text-foreground">{formatPrice(item.price)}</span>
          )}
        </div>
        <div className="text-right min-w-[100px] border-l border-border pl-5">
          <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mb-1">Total</div>
          <div className="text-xl font-black text-foreground">{formatPrice(item.total)}</div>
        </div>
      </div>
    </div>
  )
}

function CartState({ data }: { data: CustomerDisplayData }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const items = data.items || []

  useEffect(() => {
    const el = scrollRef.current
    if (!el || items.length <= 2) return

    let direction = 1
    let paused = false
    let rafId: number
    const maxScroll = el.scrollHeight - el.clientHeight
    if (maxScroll <= 0) return

    const tick = () => {
      if (!el) return
      if (!paused) {
        el.scrollTop += direction * 0.6
        if (el.scrollTop >= maxScroll) {
          el.scrollTop = maxScroll
          direction = -1
          paused = true
          setTimeout(() => { paused = false }, 1000)
        } else if (el.scrollTop <= 0) {
          el.scrollTop = 0
          direction = 1
          paused = true
          setTimeout(() => { paused = false }, 1000)
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(rafId)
  }, [items.length])

  return (
    <div className="flex flex-col h-full w-full bg-surface-50">
      {/* Terminal + Cashier + Status bar */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface-100 border-b border-border shrink-0">
        <TerminalCashierBar data={data} />
        <div className="flex items-center gap-2 text-xs">
          <Wifi className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-600 font-medium">En uso</span>
        </div>
      </div>

      {/* Customer info */}
      {data.customerName && (
        <div className="px-6 py-3 bg-brand-primary/[0.06] border-b border-brand-primary/10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center">
                <Award className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-foreground">{data.customerName}</span>
                  {data.customerRut && (
                    <span className="text-xs text-muted-foreground font-mono">{data.customerRut}</span>
                  )}
                </div>
                {data.pointsToEarn !== undefined && data.pointsToEarn > 0 && (
                  <span className="text-xs text-emerald-600 font-medium">+{data.pointsToEarn} pts esta compra</span>
                )}
              </div>
            </div>
            {data.customerPoints !== undefined && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
                <Award className="w-4 h-4 text-brand-primary" />
                <span className="text-xl font-black text-brand-primary">{data.customerPoints.toLocaleString('es-CL')}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Puntos</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Products list */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-3 custom-scrollbar"
      >
        {items.map((item, i) => (
          <motion.div
            key={`${item.name}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.03 * i }}
          >
            <ProductCard item={item} />
          </motion.div>
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-lg font-medium">
            Carrito vacío
          </div>
        )}
      </div>

      {/* Totals footer */}
      <div className="px-6 py-3 bg-surface-100 border-t border-border shrink-0">
        <div className="flex items-end justify-between">
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="font-medium">{data.itemsCount || items.length} producto{(data.itemsCount || items.length) !== 1 ? 's' : ''}</span>
              <span>Subtotal <span className="text-foreground font-bold">{formatPrice(data.subtotal)}</span></span>
            </div>
            <div className="text-muted-foreground/70 text-xs">
              IVA 19% <span className="text-muted-foreground font-medium">{formatPrice(Math.round(data.subtotal * 0.19 / 1.19))}</span>
            </div>
            {data.discount > 0 && (
              <div className="text-emerald-600 font-medium text-xs">
                Descuento -{formatPrice(data.discount)}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {data.discount > 0 && (
              <span className="text-sm text-muted-foreground line-through font-bold">{formatPrice(data.subtotal)}</span>
            )}
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-foreground uppercase tracking-wider font-medium">Total</span>
              <span className="text-3xl font-black text-foreground tracking-tight">
                {formatPrice(data.total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TerminalCashierBar({ data }: { data: CustomerDisplayData }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-bold text-foreground">
          {data.terminalName || 'Terminal'}
        </span>
        {data.terminalId && (
          <span className="text-xs text-muted-foreground font-mono">#{data.terminalId}</span>
        )}
      </div>
      {data.cashierName && (
        <>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-sm font-medium text-foreground">Cajero: {data.cashierName}</span>
        </>
      )}
    </div>
  )
}

function PaymentQrState({ data }: { data: CustomerDisplayData }) {
  return (
    <div className="flex flex-col h-full w-full bg-surface-50">
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface-100 border-b border-border shrink-0">
        <TerminalCashierBar data={data} />
        <div className="flex items-center gap-2 text-xs">
          <Wifi className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-amber-600 font-medium">Escaneando</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-4"
        >
          <ScanLine className="w-12 h-12 text-brand-primary" />
          <h2 className="text-4xl font-black text-foreground tracking-tight">Escanea para Pagar</h2>
          <p className="text-xl text-muted-foreground">Usa tu aplicación bancaria para escanear el código</p>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="p-4 rounded-3xl bg-white shadow-2xl border border-border">
            {data.qrData?.url ? (
              <img
                src={data.qrData.url}
                alt="Código QR de pago"
                className="w-[300px] h-[300px] md:w-[360px] md:h-[360px] object-contain"
              />
            ) : (
              <div className="w-[300px] h-[300px] md:w-[360px] md:h-[360px] flex items-center justify-center bg-surface-100 rounded-2xl">
                <p className="text-muted-foreground text-lg font-medium">Cargando QR...</p>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          className="flex items-center gap-3 text-2xl text-foreground font-bold mt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <span>Total a pagar:</span>
          <span className="text-brand-primary">{formatPrice(data.total)}</span>
        </motion.div>
      </div>
    </div>
  )
}

function PaymentConfirmedState({ data }: { data?: CustomerDisplayData }) {
  return (
    <div className="flex flex-col h-full w-full bg-surface-50">
      {data && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-surface-100 border-b border-border shrink-0">
          <TerminalCashierBar data={data} />
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-emerald-600 font-medium">Completado</span>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 relative overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle key={i} index={i} />
        ))}

        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="w-40 h-40 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.4, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <CheckCircle2 className="w-24 h-24 text-emerald-500" />
            </motion.div>
          </div>
        </motion.div>

        <motion.h1
          className="text-6xl font-black text-emerald-600 tracking-tight"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          PAGO EXITOSO
        </motion.h1>

        <motion.p
          className="text-2xl text-muted-foreground font-medium"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.55 }}
        >
          Gracias por tu compra
        </motion.p>
      </div>
    </div>
  )
}

export default function CustomerDisplayPage() {
  const { data, isConnected } = useCustomerDisplayReceiver()
  const [showCursor, setShowCursor] = useState(true)
  const cursorTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleMove = () => {
      setShowCursor(true)
      if (cursorTimer.current) clearTimeout(cursorTimer.current)
      cursorTimer.current = setTimeout(() => setShowCursor(false), 3000)
    }
    window.addEventListener('mousemove', handleMove)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (cursorTimer.current) clearTimeout(cursorTimer.current)
    }
  }, [])

  const itemsCount = data?.itemsCount ?? data?.items?.length ?? 0

  const renderContent = () => {
    if (!data || data.type === 'reset') {
      return <IdleState />
    }

    switch (data.type) {
      case 'cart-update':
        return <CartState data={data} />
      case 'payment-qr':
        return <PaymentQrState data={data} />
      case 'payment-confirmed':
        return <PaymentConfirmedState data={data} />
      default:
        return <IdleState />
    }
  }

  return (
    <div
      className={cn(
        'h-screen w-screen overflow-hidden flex flex-col',
        !showCursor && 'cursor-none'
      )}
    >
      <header className="flex items-center justify-between px-6 py-3 bg-surface-100 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-primary flex items-center justify-center">
            <ShoppingCart className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-black text-foreground tracking-tight">YAHPOS!</span>
          {itemsCount > 0 && (
            <div className="ml-2 px-2.5 py-0.5 rounded-full bg-brand-primary text-white text-xs font-black">
              {itemsCount}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Wifi className={cn('w-3.5 h-3.5', isConnected ? 'text-emerald-500' : 'text-muted-foreground')} />
          <span className={isConnected ? 'text-emerald-600 font-medium' : ''}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={data?.type ?? 'idle'}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}
