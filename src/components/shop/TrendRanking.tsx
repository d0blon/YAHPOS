"use client"

import Image from 'next/image'
import { TrendingUp, Plus } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { toast } from 'sonner'
import { Product as StoreProduct } from '@/types'

export interface RankingProduct {
  rank: number
  id: string
  name: string
  price: number
  sales: string
  image: string
  category: string
  sku: string
}

interface TrendRankingProps {
  products?: RankingProduct[]
}

const DEFAULT_RANKINGS: RankingProduct[] = [
  { rank: 1, id: 'rank-1', name: 'Leche Entera Colun 1L', price: 1290, sales: '1,234 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=Colun', category: 'Lácteos', sku: 'SKU-R-COLUN' },
  { rank: 2, id: 'rank-2', name: 'Pan Molde Blanco 800g', price: 1890, sales: '987 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=Pan', category: 'Despensa', sku: 'SKU-R-BREAD' },
  { rank: 3, id: 'rank-3', name: 'Arroz Grado 1 Tucapel 1kg', price: 1590, sales: '756 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=Arroz', category: 'Despensa', sku: 'SKU-R-RICE' },
  { rank: 4, id: 'rank-4', name: 'Aceite Maravilla Natura 1L', price: 2490, sales: '543 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=Aceite', category: 'Despensa', sku: 'SKU-R-OIL' },
  { rank: 5, id: 'rank-5', name: 'Fideos Tallarín Lucchetti 500g', price: 990, sales: '432 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=Fideos', category: 'Despensa', sku: 'SKU-R-PASTA' },
]

export default function TrendRanking({ products = DEFAULT_RANKINGS }: TrendRankingProps) {
  const { items, addItem, updateQuantity } = useCartStore()

  const handleAdd = (p: RankingProduct) => {
    const cartProduct = {
      id: p.id,
      name: p.name,
      price: p.price,
      original_price: null,
      description: 'Producto popular de la semana',
      category: p.category,
      categorySlug: p.category.toLowerCase(),
      image: p.image,
      stock: 50,
      nutritionalSeals: 0,
      unit: 'unidad',
      sku: p.sku,
      barcode: null,
      brand: 'Popular',
      min_stock: 5,
      max_stock: 100,
      is_active: true,
      category_id: null,
      tags: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      store_id: null
    }

    addItem(cartProduct as unknown as StoreProduct, 1)
    toast.success(`${p.name} agregado`, {
      description: 'Se agregó al carrito.',
      duration: 1500
    })
  }

  const getQuantity = (id: string) => {
    const item = items.find(i => i.product.id === id)
    return item ? item.quantity : 0
  }

  const handleDecrement = (p: RankingProduct, qty: number) => {
    if (qty > 0) {
      updateQuantity(p.id, qty - 1)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-5 flex items-center gap-2 font-heading">
        <TrendingUp className="w-6 h-6 text-brand-primary" />
        Top ventas esta semana
      </h2>
      <div className="space-y-3">
        {products.map(p => {
          const qty = getQuantity(p.id)
          return (
            <div 
              key={p.rank} 
              className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow group"
            >
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black font-heading ${
                p.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-brand-accent' :
                p.rank === 2 ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' :
                p.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400' :
                'bg-gray-50 text-gray-400 dark:bg-gray-800/30 dark:text-gray-500'
              }`}>{p.rank}</span>
              <div className="relative w-12 h-12 bg-gray-50 dark:bg-gray-950 rounded-xl overflow-hidden shrink-0 border border-gray-100 dark:border-gray-850 p-1">
                <Image 
                  src={p.image} 
                  alt={p.name} 
                  fill 
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate font-heading group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">{p.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{p.sales}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-base font-black text-brand-primary dark:text-white font-heading">${p.price.toLocaleString('es-CL')}</span>
                
                {qty === 0 ? (
                  <button 
                    onClick={() => handleAdd(p)}
                    className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center hover:scale-110 active:scale-95 transition-transform shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[3px]" />
                  </button>
                ) : (
                  <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 gap-1.5 border border-gray-250 dark:border-gray-700 shadow-inner">
                    <button 
                      onClick={() => handleDecrement(p, qty)} 
                      className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-xs font-black shadow-sm"
                    >-</button>
                    <span className="text-xs font-bold w-4 text-center select-none text-gray-800 dark:text-gray-200 font-heading">{qty}</span>
                    <button 
                      onClick={() => handleAdd(p)} 
                      className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-brand-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-xs font-black shadow-sm"
                    >+</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      
      {/* Pills de estadísticas */}
      <div className="flex flex-wrap gap-2 pt-4 justify-start">
        <span className="bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 font-bold px-3 py-1.5 rounded-full shadow-sm">
          20,939,327 visitas
        </span>
        <span className="bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 font-bold px-3 py-1.5 rounded-full shadow-sm">
          9,679 pedidos
        </span>
        <span className="bg-gray-50 dark:bg-gray-900 border border-gray-150 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 font-bold px-3 py-1.5 rounded-full shadow-sm">
          Actualizado hoy
        </span>
      </div>
    </div>
  )
}
