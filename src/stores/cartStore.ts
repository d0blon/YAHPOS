'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { Cart, CartItem, Product } from '@/types'

interface CartState extends Cart {
  addItem: (product: Product, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  applyDiscount: (code: string) => void
  removeDiscount: () => void
}

const calculateCartTotals = (items: CartItem[]): Omit<Cart, 'items'> => {
  const totalItems = items.reduce((sum, item) => { return sum + item.quantity }, 0)
  const subtotal = items.reduce((sum, item) => { return sum + (item.product.price * item.quantity) }, 0)
  const discount = 0
  const shipping = subtotal > 30000 ? 0 : 3500
  const total = subtotal - discount + shipping

  return {
    totalItems,
    subtotal,
    discount,
    shipping,
    total,
  }
}

// IndexedDB storage logic for Zustand
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name)
  },
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,

      addItem: (product: Product, quantity = 1) => {
        const { items } = get()
        const existingItem = items.find(item => item.product.id === product.id)

        let newItems: CartItem[]
        if (existingItem) {
          newItems = items.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          )
        } else {
          newItems = [...items, { product, quantity }]
        }

        set({
          items: newItems,
          ...calculateCartTotals(newItems),
        })
      },

      removeItem: (productId: string) => {
        const { items } = get()
        const newItems = items.filter(item => item.product.id !== productId)
        
        set({
          items: newItems,
          ...calculateCartTotals(newItems),
        })
      },

      updateQuantity: (productId: string, quantity: number) => {
        const { items } = get()
        
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }

        const newItems = items.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )

        set({
          items: newItems,
          ...calculateCartTotals(newItems),
        })
      },

      clearCart: () => {
        set({
          items: [],
          totalItems: 0,
          subtotal: 0,
          discount: 0,
          shipping: 0,
          total: 0,
        })
      },

      applyDiscount: (code: string) => {
        // TODO: Implement discount logic with API
        console.log('Applying discount code:', code)
      },

      removeDiscount: () => {
        set({ discount: 0 })
      },
    }),
    {

      name: 'austral-market-cart', // IndexedDB Key
      storage: createJSONStorage(() => idbStorage),
    }
  )
)
