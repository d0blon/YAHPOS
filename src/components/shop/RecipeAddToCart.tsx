"use client"

import { useCartStore } from '@/stores/cartStore'
import { toast } from 'sonner'
import { Product as StoreProduct } from '@/types'

interface RecipeAddToCartProps {
  recipeTitle: string
  ingredients: string[]
}

export default function RecipeAddToCart({ recipeTitle, ingredients }: RecipeAddToCartProps) {
  const { addItem } = useCartStore()

  const handleAdd = () => {
    ingredients.forEach((ing, i) => {
      addItem({
        id: `recipe-ing-${recipeTitle.toLowerCase().replace(/\s+/g, '-')}-${i}`,
        name: ing,
        price: 1500 + i * 200,
        original_price: null,
        description: `Ingrediente para la receta: ${recipeTitle}`,
        category: 'Ingredientes',
        categorySlug: 'ingredientes',
        image: null,
        stock: 20,
        unit: 'unidad',
        brand: 'Feria',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as StoreProduct, 1)
    })

    toast.success("¡Ingredientes agregados!", {
      description: `Se agregaron ${ingredients.length} ingredientes para preparar ${recipeTitle}.`,
      duration: 3000
    })
  }

  return (
    <button 
      onClick={handleAdd}
      className="w-full py-2.5 border-2 border-brand-primary text-brand-primary font-bold text-sm rounded-xl hover:bg-brand-primary hover:text-white transition-all cursor-pointer font-heading"
    >
      Agregar ingredientes al carrito
    </button>
  )
}
