"use client";

import Link from 'next/link';
import { ShoppingCart, Heart, Star } from 'lucide-react'
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
    toast.success(`${product.name} agregado al carrito`)
  }

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Image */}
      <Link href={`/producto/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img
          src={product.image || 'https://placehold.co/400x400/003399/FFFFFF?text=Producto'}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Discount Badge */}
        {product.discount && (
          <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0 shadow-md">
            -{product.discount}%
          </Badge>
        )}
        {/* Wishlist Button */}
        <button className="absolute top-3 right-3 w-9 h-9 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 hover:text-red-500">
          <Heart className="w-4 h-4" />
        </button>
      </Link>

      {/* Content */}
      <div className="p-4">
        {/* Category */}
        <p className="text-xs text-corporate-blue dark:text-accent-yellow font-medium mb-1">
          {product.category?.name || 'Varios'}
        </p>
        
        {/* Name */}
        <Link href={`/producto/${product.slug}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-corporate-blue dark:hover:text-accent-yellow transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-accent-yellow text-accent-yellow" />
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-sm text-gray-500">({product.reviewCount})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-bold text-corporate-blue dark:text-white">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button 
          onClick={handleAddToCart}
          className="w-full bg-corporate-blue hover:bg-corporate-dark text-white shadow-md hover:shadow-lg transition-all"
          disabled={product.stock === 0}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {product.stock === 0 ? 'Sin stock' : 'Agregar'}
        </Button>
      </div>
    </div>
  )
}
