"use client"

import { useCartStore } from '@/stores/cartStore'
import { toast } from 'sonner'
import { Heart } from 'lucide-react'
import { Product as StoreProduct } from '@/types'

export default function HeroAddToCart({ product: customProduct }: { product?: any }) {
  const { addItem } = useCartStore()

  const handleAdd = () => {
    const defaultProduct = {
      id: "hero-detergent",
      name: "Detergente Líquido Ultra 1.5L",
      description: "Detergente ultra concentrado para limpieza profunda",
      price: 2990,
      original_price: 4990,
      category: "Limpieza",
      categorySlug: "limpieza",
      image: "https://placehold.co/800x600/4b0082/ffd100?text=Detergente+Ultra",
      stock: 50,
      nutritionalSeals: 0,
      unit: "unidad",
      sku: "SKU-HERO-DET",
      barcode: null,
      brand: "UltraClean",
      min_stock: 5,
      max_stock: 100,
      is_active: true,
      category_id: null,
      tags: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      store_id: null
    }

    const product = customProduct || defaultProduct

    addItem(product as unknown as StoreProduct, 1)
    toast.success(`${product.name} Agregado`, {
      description: `Se agregó 1 unidad de ${product.name} al carrito.`,
      duration: 2000
    })
  }

  return (
    <div className="flex gap-3 pt-2">
      <button 
        onClick={handleAdd}
        className="flex-1 bg-brand-primary hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all text-sm shadow-lg shadow-brand-primary/20 cursor-pointer font-heading"
      >
        Agregar al carrito
      </button>
      <button className="w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-brand-primary flex items-center justify-center transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
        <Heart className="w-5 h-5 text-gray-400 hover:text-red-500 hover:fill-red-500 transition-colors" />
      </button>
    </div>
  )
}
