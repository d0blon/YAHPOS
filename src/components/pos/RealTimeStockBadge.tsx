'use client'

import React from 'react'
import { Package, AlertCircle, XCircle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RealTimeStockBadgeProps {
  stock: number
  lowStockThreshold: number
  isRealtimeTracked?: boolean
  className?: string
}

export function RealTimeStockBadge({ 
  stock, 
  lowStockThreshold, 
  isRealtimeTracked,
  className 
}: RealTimeStockBadgeProps) {
  const isLowStock = stock > 0 && stock <= lowStockThreshold
  const isOutOfStock = stock <= 0

  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md transition-all duration-500",
      isOutOfStock 
        ? "bg-rose-500/10 border-rose-500/20 text-rose-500" 
        : isLowStock
          ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
      className
    )}>
      {isRealtimeTracked && (
        <Zap className={cn(
          "w-3 h-3 fill-current animate-pulse",
          !isOutOfStock && !isLowStock && "text-emerald-500"
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
