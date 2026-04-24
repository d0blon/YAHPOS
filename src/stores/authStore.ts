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
  acceptMarketing?: boolean
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
        // Limpiar estado anterior primero (evita contaminar sesiones entre cuentas)
        set({ user: null, isAuthenticated: false, isLoading: true })
        try {
          // Primero cerramos cualquier sesión previa de Supabase
          await supabase.auth.signOut()

          // Login real contra Supabase (crea cookies de sesión para el Proxy)
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })

          if (error) throw new Error(error.message)
          if (!data.user) throw new Error('No se pudo obtener el usuario')

          // Obtener el perfil real con el rol correcto
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, rut, first_name, last_name, phone, loyalty_points')
            .eq('id', data.user.id)
            .single()

          const appUser: User = {
            id: data.user.id,
            email: data.user.email || '',
            firstName: profile?.first_name || data.user.user_metadata?.first_name || 'Usuario',
            lastName: profile?.last_name || data.user.user_metadata?.last_name || '',
            phone: profile?.phone || data.user.user_metadata?.phone || '',
            role: profile?.role || 'customer',
            rut: profile?.rut || '',
            loyaltyPoints: profile?.loyalty_points ?? 0,
            identityVerified: false,
            wishlist: [],
            purchaseHistory: [],
            addresses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          set({ user: appUser, isAuthenticated: true, isLoading: false })
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

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, isAuthenticated: false, isLoading: false })
        // Limpiar el storage persistido para que no queden datos de la sesión anterior
        if (typeof window !== 'undefined') {
          localStorage.removeItem('patagoniapos-auth')
        }
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
