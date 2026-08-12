"use client"

import { useCartStore } from '@/stores/cartStore'
import { toast } from 'sonner'
import { Product as StoreProduct } from '@/types'

interface BasketAddToCartProps {
  basketName: string
  basketTotal: number
  basketSavings: number
}

export default function BasketAddToCart({ basketName, basketSavings }: BasketAddToCartProps) {
  const { addItem } = useCartStore()

  const handleAdd = () => {
    // Definir productos ficticios según la canasta
    let mockProducts: Array<{
      id: string
      name: string
      price: number
      sku: string
    }> = []

    if (basketName.includes('asado')) {
      mockProducts = [
        { id: 'b-meat', name: 'Carne de Vacuno Asado 1kg', price: 18990, sku: 'SKU-B-MEAT' },
        { id: 'b-coal', name: 'Carbón Espino 3kg', price: 4990, sku: 'SKU-B-COAL' },
        { id: 'b-drink', name: 'Bebida de Fantasía 2.5L', price: 2000, sku: 'SKU-B-DRINK' },
        { id: 'b-salad', name: 'Mix Ensaladas Verdes', price: 3010, sku: 'SKU-B-SALAD' }
      ]
    } else if (basketName.includes('Desayuno')) {
      mockProducts = [
        { id: 'b-milk', name: 'Leche Entera Caja 1L', price: 1200, sku: 'SKU-B-MILK' },
        { id: 'b-cereal', name: 'Cereal de Maíz 400g', price: 2500, sku: 'SKU-B-CEREAL' },
        { id: 'b-bread', name: 'Pan de Molde Blanco 500g', price: 1800, sku: 'SKU-B-BREAD' },
        { id: 'b-jam', name: 'Mermelada de Durazno 380g', price: 1500, sku: 'SKU-B-JAM' },
        { id: 'b-coffee', name: 'Café Instantáneo 100g', price: 5490, sku: 'SKU-B-COFFEE' }
      ]
    } else {
      mockProducts = [
        { id: 'b-deterg', name: 'Detergente Líquido 1.5L', price: 4990, sku: 'SKU-B-DETERG' },
        { id: 'b-chlor', name: 'Cloro Tradicional 1L', price: 1200, sku: 'SKU-B-CHLOR' },
        { id: 'b-clean', name: 'Limpiapisos Lavanda 900cc', price: 1800, sku: 'SKU-B-CLEAN' },
        { id: 'b-sponge', name: 'Esponja de Fibra Doble 3un', price: 1500, sku: 'SKU-B-SPONGE' },
        { id: 'b-bag', name: 'Bolsas de Basura 50x70 10un', price: 1500, sku: 'SKU-B-BAG' }
      ]
    }

    mockProducts.forEach(p => {
      addItem({
        ...p,
        description: 'Producto de canasta sugerida',
        image: null,
        stock: 10,
        unit: 'unidad',
        brand: 'Pack Ahorro',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as StoreProduct, 1)
    })

    toast.success(`¡Canasta agregada!`, {
      description: `Se agregaron los productos de "${basketName}" con un ahorro de $${basketSavings.toLocaleString('es-CL')}.`,
      duration: 3000
    })
  }

  return (
    <button 
      onClick={handleAdd}
      className="w-full mt-4 py-2.5 bg-brand-primary hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer font-heading"
    >
      Agregar todo al carrito
    </button>
  )
}
