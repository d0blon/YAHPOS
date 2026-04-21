'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@/types'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  setAuthSession: (user: User) => void
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<User>) => void
  refreshProfile: () => Promise<void>
}

interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  phone?: string
  rut?: string
}

// Mock user for development
const mockUser: User = {
  id: '1',
  email: 'cliente@patagoniapos.cl',
  firstName: 'Juan',
  lastName: 'Pérez',
  phone: '+56912345678',
  role: 'customer',
  loyaltyPoints: 0,
  identityVerified: false,
  wishlist: [],
  purchaseHistory: [],
  addresses: [
    {
      id: '1',
      name: 'Casa',
      street: 'Los Carrera',
      number: '123',
      commune: 'Castro',
      city: 'Castro',
      region: 'Los Lagos',
      isDefault: true,
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          if (email === 'cliente@australmarket.cl' && password === 'password') {
            set({ user: mockUser, isAuthenticated: true, isLoading: false })
          } else {
            throw new Error('Credenciales inválidas')
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true })
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })
          
          const result = await res.json()
          if (!res.ok) throw new Error(result.error || 'Error al registrar')
          
          set({ user: result.user, isAuthenticated: true, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false })
      },

      setAuthSession: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false })
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...userData, updatedAt: new Date().toISOString() } })
        }
      },

      refreshProfile: async () => {
        const { user: currentUser } = get()
        if (!currentUser?.id) return

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          if (error) throw error
          if (data) {
            set({ 
              user: { 
                ...currentUser, 
                firstName: data.first_name || currentUser.firstName || '',
                lastName: data.last_name || currentUser.lastName || '',
                name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || currentUser.name,
                role: (data.role as any) || currentUser.role,
                rut: data.rut || currentUser.rut,
                phone: data.phone || currentUser.phone,
                loyaltyPoints: data.loyalty_points ?? currentUser.loyaltyPoints,
                identityVerified: data.identity_verified ?? currentUser.identityVerified ?? false,
                updatedAt: data.updated_at || new Date().toISOString()
              } 
            })
          }
        } catch (error) {
          console.error('Error refreshing profile:', error)
        }
      },
    }),
    {
      name: 'patagoniapos-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
