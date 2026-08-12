"use client"

import Link from 'next/link'
import Image from 'next/image'
import { Tag, Plus } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { Product as StoreProduct } from '@/types'
import { toast } from 'sonner'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  original_price: number | null
  category: string
  categorySlug: string
  image: string | null
  stock: number
  nutritionalSeals: number
  unit: string | null
  sku: string | null
  barcode: string | null
  brand: string | null
  min_stock: number
  max_stock: number
  is_active: boolean
  category_id: string | null
  tags: string | null
  created_at: string
  updated_at: string
  store_id: string | null
}

interface ProductCardSuperProps {
  product: Product
  variant?: 'offer' | 'fresh' | 'meat' | 'premium'
}

export default function ProductCardSuper({ product, variant }: ProductCardSuperProps) {
  const { items, addItem, updateQuantity } = useCartStore()

  // Buscar el producto en el carrito global para sincronizar el estado
  const cartItem = items.find(item => item.product.id === product.id)
  const quantity = cartItem ? cartItem.quantity : 0

  const isOffer = variant === 'offer' || !!product.original_price
  const isFresh = variant === 'fresh'
  const isMeat = variant === 'meat'
  const isPremium = variant === 'premium'

  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Convertir el tipo Product local al tipo esperado por store
    addItem(product as unknown as StoreProduct, 1)
    toast.success(`${product.name} agregado`, {
      description: "Se agregó 1 unidad al carrito.",
      duration: 1500
    })
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (quantity > 0) {
      updateQuantity(product.id, quantity - 1)
      if (quantity === 1) {
        toast.info(`${product.name} removido`, {
          description: "Se eliminó el producto del carrito.",
          duration: 1500
        })
      }
    }
  }

  if (isPremium) {
    return (
      <Link
        href={`/producto/${product.sku || product.id}`}
        className="bg-[#2a2a2a] border border-gray-800 rounded-2xl p-4 hover:border-brand-accent/40 hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
      >
        <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-gray-800">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-contain p-2 group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">Sin imagen</div>
          )}
          {product.brand && (
            <div className="absolute top-2 left-2 bg-black/60 text-brand-accent text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm">
              {product.brand}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <span className="text-[10px] font-medium text-brand-accent tracking-wider mb-1 uppercase font-heading">Importado</span>
          <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 mb-2 min-h-[2.5em]">{product.name}</h3>
          <p className="text-[11px] text-gray-400 mb-3 line-clamp-1">{product.description || 'Calidad de selección mundial'}</p>
          
          <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-gray-800">
            <span className="text-base font-black text-brand-accent font-heading">${product.price.toLocaleString('es-CL')}</span>
            
            <div className="shrink-0">
              {quantity === 0 ? (
                <button
                  onClick={handleIncrement}
                  className="w-9 h-9 rounded-full bg-brand-accent text-brand-primary flex items-center justify-center hover:scale-110 transition-transform active:scale-95 shadow-md shadow-brand-accent/15"
                >
                  <Plus className="w-5 h-5 stroke-[3px]" />
                </button>
              ) : (
                <div className="flex items-center bg-gray-900 rounded-full p-0.5 gap-2 border border-gray-800 shadow-inner">
                  <button onClick={handleDecrement} className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-xs font-black">-</button>
                  <span className="text-xs font-bold w-4 text-center select-none text-white">{quantity}</span>
                  <button onClick={handleIncrement} className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-xs font-black">+</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    )
  }

  return (
    <div
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-150 dark:border-gray-800 overflow-hidden hover:shadow-hover hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full relative"
    >
      <Link href={`/producto/${product.sku || product.id}`} className="block relative aspect-square bg-[#f8f6f2] dark:bg-gray-950 overflow-hidden shrink-0">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">Sin imagen</div>
        )}
        
        {/* Badges en esquina superior izquierda */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
          {isOffer && (
            <div className="bg-brand-primary text-white text-[9px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm font-heading">
              <Tag className="w-2.5 h-2.5" />
              OFERTA
            </div>
          )}
        </div>

        {/* Descuento en esquina superior derecha */}
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-brand-accent text-brand-primary text-[10px] font-black px-2 py-1 rounded-lg shadow-sm font-heading z-10">
            -{discount}%
          </div>
        )}
        {isFresh && !product.original_price && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-sm font-heading z-10">
            Nacional
          </div>
        )}
        {isMeat && !product.original_price && (
          <div className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-sm font-heading z-10">
            Cortes Frescos
          </div>
        )}
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{product.category}</span>
        <Link href={`/producto/${product.sku || product.id}`} className="block group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 mb-2 min-h-[2.5em] font-heading">{product.name}</h3>
        </Link>
        {product.unit && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mb-2">por {product.unit === 'kg' ? 'kg' : 'unidad'}</p>
        )}

        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            {product.original_price && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 line-through font-bold">
                ${product.original_price.toLocaleString('es-CL')}
              </span>
            )}
            <span className="text-base font-black text-brand-primary dark:text-white font-heading">
              ${product.price.toLocaleString('es-CL')}
            </span>
          </div>

          <div className="shrink-0">
            {quantity === 0 ? (
              <button
                onClick={handleIncrement}
                className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center hover:scale-110 transition-transform active:scale-95 shadow-md shadow-brand-primary/10"
              >
                <Plus className="w-5 h-5 stroke-[3px]" />
              </button>
            ) : (
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-0.5 gap-1.5 border border-gray-200 dark:border-gray-700 shadow-inner">
                <button onClick={handleDecrement} className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-red-500 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-xs font-black shadow-sm">-</button>
                <span className="text-xs font-bold w-4 text-center select-none text-gray-850 dark:text-gray-200 font-heading">{quantity}</span>
                <button onClick={handleIncrement} className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-brand-primary flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-xs font-black shadow-sm">+</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
