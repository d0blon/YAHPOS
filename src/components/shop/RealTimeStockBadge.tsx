'use client'

import React, { useEffect, useState } from 'react'
import { Package, AlertCircle, XCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface RealTimeStockBadgeProps {
  productId: string
  initialStock: number
  lowStockThreshold: number
  isRealtimeTracked?: boolean
  className?: string
}

export function RealTimeStockBadge({ 
  productId,
  initialStock, 
  lowStockThreshold, 
  isRealtimeTracked,
  className 
}: RealTimeStockBadgeProps) {
  const [stock, setStock] = useState(initialStock)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Solo suscribir si el flag está activo
    if (!isRealtimeTracked) {
      setStock(initialStock)
      return
    }

    let timeoutId: NodeJS.Timeout

    // Suscripción al canal de Supabase Realtime
    const channel = supabase
      .channel(`product-stock-${productId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `id=eq.${productId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new.stock === 'number') {
            setStock(payload.new.stock)
            // Efecto visual de actualización
            setIsUpdating(true)
            if (timeoutId) clearTimeout(timeoutId)
            timeoutId = setTimeout(() => setIsUpdating(false), 2000)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [productId, isRealtimeTracked, initialStock])

  const isLowStock = stock > 0 && stock <= lowStockThreshold
  const isOutOfStock = stock <= 0

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md transition-all duration-500 shadow-sm",
      isOutOfStock 
        ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
        : isLowStock
          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      isUpdating && "scale-105 shadow-[0_0_15px_rgba(16,185,129,0.3)] border-emerald-500/50",
      className
    )}>
      {isRealtimeTracked && (
        <Zap className={cn(
          "w-3 h-3 fill-current transition-all duration-300",
          isUpdating ? "scale-125 text-yellow-400" : "animate-pulse text-emerald-500",
          isOutOfStock && "text-rose-500"
        )} />
      )}
      
      {isOutOfStock ? (
        <>
          <XCircle className="w-3 h-3" />
          <span>Agotado</span>
        </>
      ) : isLowStock ? (
        <>
          <AlertCircle className="w-3 h-3" />
          <span>Bajo Stock: {stock}</span>
        </>
      ) : (
        <>
          <Package className="w-3 h-3" />
          <span>Stock: {stock}</span>
        </>
      )}
    </div>
  )
}
