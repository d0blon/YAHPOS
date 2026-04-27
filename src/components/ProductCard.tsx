"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Heart, Star, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores/cartStore'
import type { Product } from '@/types'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCartStore()

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product)
    toast.success(`${product.name} agregado`, {
      description: "Revisa tu carrito para finalizar la compra",
      className: "glass-card border-corporate-blue/20 dark:border-accent-yellow/20 font-bold",
    })
  }

  return (
    <div className="group relative bg-white/50 dark:bg-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden border border-gray-100 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(59,130,246,0.1)] dark:hover:shadow-[0_20px_50px_rgb(254,204,27,0.1)] transition-all duration-700 hover:-translate-y-2">
      {/* Top Utility Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {product.discount ? (
          <Badge className="pointer-events-auto bg-red-500 hover:bg-red-600 text-white border-0 shadow-lg px-3 py-1 font-black rounded-full text-[10px] uppercase tracking-tighter">
            -{product.discount}%
          </Badge>
        ) : <div />}
        
        <button className="pointer-events-auto w-10 h-10 bg-white/80 dark:bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 transition-all duration-300 shadow-sm hover:scale-110 active:scale-95">
          <Heart className="w-5 h-5" />
        </button>
      </div>

      {/* Image Section */}
      <Link href={`/producto/${product.slug}`} className="block relative aspect-[4/5] overflow-hidden bg-gray-50 dark:bg-gray-900/50">
        <Image
          src={product.image || 'https://placehold.co/400x500/003399/FFFFFF?text=Producto'}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out p-4 group-hover:p-0"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        
        {/* Quick Add Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-accent-yellow text-corporate-blue dark:text-corporate-dark flex items-center justify-center scale-50 group-hover:scale-100 transition-transform duration-500 delay-100">
            <Plus className="w-8 h-8" />
          </div>
        </div>
      </Link>

      {/* Content Section */}
      <div className="p-6 md:p-8 flex flex-col h-full">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-corporate-blue/50 dark:text-accent-yellow/50">
              {product.category?.name || 'Curated'}
            </span>
            {product.rating && (
              <div className="flex items-center gap-1 ml-auto">
                <Star className="w-3 h-3 fill-accent-yellow text-accent-yellow" />
                <span className="text-[10px] font-bold text-gray-500">{product.rating}</span>
              </div>
            )}
          </div>
          
          <Link href={`/producto/${product.slug}`}>
            <h3 className="text-lg md:text-xl font-black text-gray-900 dark:text-white leading-tight mb-2 line-clamp-1 hover:text-corporate-blue dark:hover:text-accent-yellow transition-colors tracking-tight">
              {product.name}
            </h3>
          </Link>
        </div>

        {/* Footer Area: Price & Action */}
        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            {product.originalPrice && (
              <span className="text-xs text-gray-400 line-through font-bold">
                {formatPrice(product.originalPrice)}
              </span>
            )}
            <span className="text-2xl font-black text-corporate-blue dark:text-white tracking-tighter">
              {formatPrice(product.price)}
            </span>
          </div>

          <Button 
            onClick={handleAddToCart}
            size="icon"
            className="w-14 h-14 rounded-[1.25rem] bg-corporate-blue dark:bg-accent-yellow text-white dark:text-corporate-dark shadow-xl shadow-corporate-blue/20 dark:shadow-accent-yellow/20 hover:scale-110 active:scale-95 transition-all group/btn shrink-0"
            disabled={product.stock === 0}
          >
            <ShoppingCart className="w-6 h-6" />
          </Button>
        </div>
      </div>
      
      {/* Stock Status Bar */}
      {product.stock > 0 && product.stock < 10 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-100 dark:bg-white/5">
          <div 
            className="h-full bg-red-500" 
            style={{ width: `${(product.stock / 10) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
