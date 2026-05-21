'use client'

import React, { useState } from 'react'
import { X, Search, Package, Save, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePosStore } from '@/stores/posStore'
import { formatPrice, cn } from '@/lib/utils'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface QuickStockPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function QuickStockPanel({ isOpen, onClose }: QuickStockPanelProps) {
  const { inventory, setInventory, selectedBranchId } = usePosStore()
  const [search, setSearch] = useState('')
  const [isUpdating, setIsUpdating] = useState<string | null>(null)
  const [stockChanges, setStockChanges] = useState<Record<string, number>>({})

  if (!isOpen) return null

  const filteredProducts = inventory.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku?.includes(search) || 
      p.barcode?.includes(search);
    
    // Si no hay búsqueda, priorizar los trackeados
    if (!search) return p.isRealtimeTracked;
    return matchesSearch;
  })

  const handleStockChange = (productId: string, currentStock: number, delta: number) => {
    const currentChange = stockChanges[productId] || 0
    setStockChanges({
      ...stockChanges,
      [productId]: currentChange + delta
    })
  }

  const saveStockUpdate = async (productId: string) => {
    const change = stockChanges[productId]
    if (!change) return

    setIsUpdating(productId)
    try {
      const product = inventory.find(p => p.id === productId)
      if (!product) return

      const newStock = product.stock + change

      // 1. Update in Supabase
      const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId)

      if (error) throw error

      // 2. Update local store
      const updatedInventory = inventory.map(p => 
        p.id === productId ? { ...p, stock: newStock } : p
      )
      setInventory(updatedInventory)

      // 3. Clear changes for this product
      const newChanges = { ...stockChanges }
      delete newChanges[productId]
      setStockChanges(newChanges)

      toast.success(`${product.name} actualizado: ${newStock} ${product.unit}`, {
        icon: '🚀'
      })
    } catch (error) {
      console.error('Error updating stock:', error)
      toast.error('Error al actualizar stock')
    } finally {
      setIsUpdating(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-hidden">
      <div className="bg-white dark:bg-surface-100 w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col border border-slate-200 dark:border-gray-800 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-gray-800 flex justify-between items-center bg-slate-50/50 dark:bg-surface-100/50 backdrop-blur-md rounded-t-[2.5rem]">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-brand-primary text-white rounded-2xl shadow-lg">
                <Package className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Monitor de Stock en Tiempo Real</h2>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Carga Rápida y Sincronización POS-Tienda</p>
             </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="BUSCAR PRODUCTO..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-10 w-64 rounded-xl border-slate-200 dark:border-gray-800 bg-surface-50 font-bold text-xs"
              />
            </div>
            <button onClick={onClose} className="p-3 bg-slate-100 hover:bg-slate-200 dark:bg-surface-200 dark:hover:bg-gray-700 rounded-xl transition-all active:scale-95">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
           {filteredProducts.length === 0 && (
             <div className="flex flex-col items-center justify-center py-12 opacity-50">
               <Package className="w-12 h-12 mb-4" />
               <p className="font-bold text-sm uppercase">No hay productos trackeados o no coinciden con la búsqueda</p>
             </div>
           )}

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map(p => {
                const change = stockChanges[p.id] || 0
                const finalStock = p.stock + change
                const isLow = finalStock <= (p.lowStockThreshold || 5)
                
                return (
                  <div key={p.id} className={cn(
                    "p-5 rounded-[2rem] border-2 transition-all flex flex-col gap-4",
                    isLow ? "bg-rose-500/5 border-rose-500/10" : "bg-slate-50 dark:bg-surface-200/20 border-slate-100 dark:border-gray-800"
                  )}>
                     <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                           <div className="w-16 h-16 rounded-2xl bg-white dark:bg-surface-200 overflow-hidden border border-slate-100 dark:border-gray-700 p-2 shrink-0">
                              <img src={p.image} alt={p.name} className="w-full h-full object-contain" />
                           </div>
                           <div className="min-w-0">
                              <h4 className="font-black text-slate-900 dark:text-white leading-tight uppercase text-sm line-clamp-1">{p.name}</h4>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{p.sku || p.barcode || 'SIN SKU'}</p>
                              <div className="flex items-center gap-2 mt-2">
                                 <span className="px-2 py-0.5 bg-slate-200 dark:bg-surface-250 rounded text-[9px] font-black text-slate-600 dark:text-gray-300 uppercase">{p.unit}</span>
                                 {p.isRealtimeTracked && (
                                   <span className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase">
                                      <Zap className="w-2.5 h-2.5 animate-pulse fill-current" /> TIENDA VIVA
                                   </span>
                                 )}
                              </div>
                           </div>
                        </div>
                        <div className="text-right">
                           <div className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">{formatPrice(p.price)}</div>
                           <div className={cn(
                             "text-[10px] font-black uppercase mt-1",
                             isLow ? "text-rose-500" : "text-slate-400"
                           )}>
                              Actual: {p.stock}
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-wrap items-center gap-2">
                        <div className="flex-1 bg-white dark:bg-surface-50 rounded-2xl border border-slate-200 dark:border-gray-800 p-1.5 flex items-center justify-between min-w-[140px]">
                           <button 
                             onClick={() => handleStockChange(p.id, p.stock, -1)}
                             className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-surface-200 flex items-center justify-center text-slate-600 dark:text-gray-300 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
                           >
                              <ArrowDownRight className="w-4 h-4" />
                           </button>
                           
                           <div className="flex flex-col items-center">
                              <span className={cn(
                                "text-lg font-black tracking-tighter transition-all",
                                change > 0 ? "text-emerald-500" : change < 0 ? "text-rose-500" : "text-slate-900 dark:text-white"
                              )}>
                                 {finalStock}
                              </span>
                           </div>

                           <button 
                             onClick={() => handleStockChange(p.id, p.stock, 1)}
                             className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-surface-200 flex items-center justify-center text-slate-600 dark:text-gray-300 hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
                           >
                              <ArrowUpRight className="w-4 h-4" />
                           </button>
                        </div>

                        {/* Botones de carga rápida */}
                        <div className="flex items-center gap-1">
                           {[5, 10, 25].map(val => (
                             <button
                               key={val}
                               onClick={() => handleStockChange(p.id, p.stock, val)}
                               className="px-3 h-11 rounded-xl bg-slate-100 dark:bg-surface-200 text-[10px] font-black text-slate-600 dark:text-gray-400 hover:bg-brand-500 hover:text-white transition-all active:scale-95"
                             >
                               +{val}
                             </button>
                           ))}
                        </div>

                        <Button 
                          onClick={() => saveStockUpdate(p.id)}
                          disabled={change === 0 || isUpdating === p.id}
                          className={cn(
                            "flex-1 h-11 px-4 rounded-xl font-black gap-2 transition-all shadow-lg text-xs",
                            change !== 0 ? "bg-brand-primary hover:brightness-90 text-white" : "bg-slate-100 dark:bg-surface-200 text-slate-400"
                          )}
                        >
                           {isUpdating === p.id ? (
                             <RefreshCw className="w-4 h-4 animate-spin" />
                           ) : (
                             <Save className="w-4 h-4" />
                           )}
                           OK
                        </Button>
                     </div>

                     {isLow && (
                       <div className="flex items-center gap-2 text-rose-500">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Alerta de Stock Bajo Detectada</span>
                       </div>
                     )}
                  </div>
                )
              })}
           </div>
        </div>

      </div>
    </div>
  )
}
