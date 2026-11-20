'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User as AppUser } from '@/types'
import { supabase } from '@/lib/supabase'
import { DEVELOPER_EMAILS } from '@/lib/constants'
import { AppRole } from '@/lib/constants/roles'
import { clearTenantState, createTenantStorage, getActiveStoreId, registerTenantResetHandler, registerTenantStoreSync, setActiveStoreId } from '@/lib/tenant-state'

const localStateStorage = {
  getItem: (name: string): string | null => window.localStorage.getItem(name),
  setItem: (name: string, value: string): void => { window.localStorage.setItem(name, value) },
  removeItem: (name: string): void => { window.localStorage.removeItem(name) },
}

interface RawStoreInfo {
  tier: 'austral' | 'archipielago' | 'patagonia';
  name: string;
}

interface RawSupabaseMembership {
  store_id: string;
  role: string;
  is_active: boolean;
  // Supabase devuelve `stores` como objeto o como array según la query.
  stores: RawStoreInfo | RawStoreInfo[] | null;
}

export interface UserStoreMembership {
  store_id: string;
  role: string;
  is_active: boolean;
  stores?: {
    tier: 'austral' | 'archipielago' | 'patagonia';
    name: string;
  } | null;
}

interface AuthState {
  user: AppUser | null
  isAuthenticated: boolean
  isLoading: boolean
  memberships: UserStoreMembership[]
  currentStoreRole: string | null
  login: (email: string, password: string) => Promise<void>
  setAuthSession: (user: AppUser) => void
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  updateUser: (user: Partial<AppUser>) => void
  switchStore: (storeId: string) => Promise<void>
  initialize: () => Promise<void>
  refreshProfile: (currentStoreId?: string) => Promise<void>
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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      memberships: [],
      currentStoreRole: null,

      login: async (email: string, password: string) => {
        set({ user: null, isAuthenticated: false, isLoading: true, memberships: [], currentStoreRole: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password })

          if (error) throw new Error(error.message)
          if (!data.user) throw new Error('No se pudo obtener el usuario')

          // 1. Obtener Perfil Básico
          const { data: profile } = await supabase
            .from('profiles')
            .select('rut, first_name, last_name, phone, loyalty_points, role, store_id')
            .eq('id', data.user.id)
            .single()

          // 2. Obtener Membresías (RBAC Multi-tienda) -- hoy casi siempre vacío, profiles es
          // la fuente de verdad real (mismo fix que ya se hizo en middleware.ts)
          const { data: memberships } = await supabase
            .from('user_stores')
            .select('store_id, role, is_active, stores(tier, name)')
            .eq('user_id', data.user.id)
            .eq('is_active', true)

          const metadata = data.user.user_metadata
          const isDev = data.user.email && DEVELOPER_EMAILS.includes(data.user.email.toLowerCase())
          
          // Transformar membresías para asegurar que stores sea un objeto (Supabase a veces retorna array)
          const formattedMemberships: UserStoreMembership[] = (memberships || []).map((m: RawSupabaseMembership) => ({
            store_id: m.store_id,
            role: m.role,
            is_active: m.is_active,
            stores: Array.isArray(m.stores) ? m.stores[0] : m.stores
          }))

          const primaryMembership = formattedMemberships[0]
          const resolvedStoreId = primaryMembership?.store_id || profile?.store_id

          // Tier: si hay membership úsalo, si no, resolver desde el store del profile
          let tier: 'austral' | 'archipielago' | 'patagonia' = 'austral'
          if (isDev) {
            tier = 'patagonia'
          } else if (primaryMembership?.stores?.tier) {
            tier = primaryMembership.stores.tier
          } else if (resolvedStoreId) {
            const { data: storeRow } = await supabase.from('stores').select('tier').eq('id', resolvedStoreId).single()
            if (storeRow?.tier) tier = storeRow.tier as 'austral' | 'archipielago' | 'patagonia'
          }
          
          const appUser: AppUser = {
            id: data.user.id,
            email: data.user.email || '',
            firstName: profile?.first_name || metadata?.given_name || metadata?.first_name || 'Usuario',
            lastName: profile?.last_name || metadata?.family_name || metadata?.last_name || '',
            phone: profile?.phone || '',
            role: isDev ? AppRole.DEVELOPER : (primaryMembership?.role as AppRole || profile?.role as AppRole || AppRole.CUSTOMER),
            rut: profile?.rut || '',
            loyaltyPoints: profile?.loyalty_points ?? 0,
            storeId: resolvedStoreId,
            tier,
            identityVerified: false,
            wishlist: [],
            purchaseHistory: [],
            addresses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          set({ 
            user: appUser, 
            isAuthenticated: true, 
            isLoading: false,
            memberships: formattedMemberships,
            currentStoreRole: isDev ? AppRole.DEVELOPER : (primaryMembership?.role || profile?.role || AppRole.CUSTOMER)
          })
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
        await clearTenantState()
        setActiveStoreId(null)
        set({ user: null, isAuthenticated: false, isLoading: false, memberships: [], currentStoreRole: null })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('yahpos-auth')
        }
      },

      setAuthSession: (user: AppUser) => {
        set({ user, isAuthenticated: true, isLoading: false })
      },

      updateUser: (userData: Partial<AppUser>) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, ...userData, updatedAt: new Date().toISOString() } })
        }
      },

      refreshProfile: async (currentStoreId?: string) => {
        let { user: currentUser } = get()
        
        // Si no hay usuario en el estado, intentar recuperarlo de la sesión de Supabase
        // Esto es vital para subdominios donde localStorage (Zustand persist) puede estar vacío.
        if (!currentUser?.id) {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) return
          
          currentUser = {
            id: session.user.id,
            email: session.user.email || '',
            firstName: session.user.user_metadata?.first_name || '',
            lastName: session.user.user_metadata?.last_name || '',
            role: AppRole.CUSTOMER, // Será actualizado más abajo
          } as AppUser
        }

        try {
          // 1. Perfil básico (No lanzamos error si no existe, usamos fallback)
          const { data: profile } = await supabase
            .from('profiles')
            .select('store_id, first_name, last_name, role, rut, phone, loyalty_points, identity_verified, updated_at')
            .eq('id', currentUser.id)
            .maybeSingle()

          // 2. Membresías
          const { data: memberships } = await supabase
            .from('user_stores')
            .select('store_id, role, is_active, stores(tier, name)')
            .eq('user_id', currentUser.id)
            .eq('is_active', true)

          const isDev = currentUser.email && DEVELOPER_EMAILS.includes(currentUser.email.toLowerCase())
          
          // Formatear membresías
          const formattedMemberships: UserStoreMembership[] = (memberships || []).map((m: RawSupabaseMembership) => ({
            store_id: m.store_id,
            role: m.role,
            is_active: m.is_active,
            stores: Array.isArray(m.stores) ? m.stores[0] : m.stores
          }))

          const activeMembership = currentStoreId 
            ? formattedMemberships.find(m => m.store_id === currentStoreId)
            : formattedMemberships[0]

          const resolvedStoreId = activeMembership?.store_id || profile?.store_id || currentUser.storeId

          const hostStoreId = getActiveStoreId()
          if (hostStoreId && resolvedStoreId && hostStoreId !== resolvedStoreId) {
            set({ isLoading: false })
            return
          }

          // Tier: si hay membership úsalo, si no, resolver desde el store del profile
          let tier: 'austral' | 'archipielago' | 'patagonia' = 'austral'
          if (isDev) {
            tier = 'patagonia'
          } else if (activeMembership?.stores?.tier) {
            tier = activeMembership.stores.tier
          } else if (resolvedStoreId) {
            const { data: storeRow } = await supabase.from('stores').select('tier').eq('id', resolvedStoreId).single()
            if (storeRow?.tier) tier = storeRow.tier as 'austral' | 'archipielago' | 'patagonia'
          }

          // Actualizar estado incluso si no hay perfil (usando datos de auth.users como fallback)
          set({ 
            user: { 
              ...currentUser, 
              firstName: profile?.first_name || currentUser.firstName || 'Usuario',
              lastName: profile?.last_name || currentUser.lastName || '',
              role: isDev ? AppRole.DEVELOPER : (activeMembership?.role as AppRole || profile?.role as AppRole || AppRole.CUSTOMER),
              rut: profile?.rut || currentUser.rut || '',
              phone: profile?.phone || currentUser.phone || '',
              loyaltyPoints: profile?.loyalty_points ?? 0,
              storeId: resolvedStoreId,
              identityVerified: profile?.identity_verified ?? false,
              tier,
              updatedAt: profile?.updated_at || new Date().toISOString()
            },
            memberships: formattedMemberships,
            currentStoreRole: isDev ? AppRole.DEVELOPER : (activeMembership?.role || profile?.role || AppRole.CUSTOMER),
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          console.error('Error refreshing profile:', error)
          set({ isLoading: false })
        }
      },

      switchStore: async (storeId: string) => {
        const { memberships, user } = get()
        if (!user) return

        const targetMembership = memberships.find(m => m.store_id === storeId)
        if (!targetMembership) return

        set({ isLoading: true })
        await clearTenantState()
        setActiveStoreId(storeId)
        await get().refreshProfile(storeId)
        set({ isLoading: false })
      },

      initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await get().refreshProfile(getActiveStoreId() ?? undefined)
        }
      },
    }),
    {
      name: 'yahpos-auth',
      storage: createJSONStorage(() => createTenantStorage(localStateStorage)),
      // Validar que el estado rehidratado tiene la forma correcta.
      // Si el user guardado es un string (bug de versiones anteriores), lo limpiamos.
      onRehydrateStorage: () => (state) => {
        if (!state) return
        if (typeof state.user === 'string') {
          (state as AuthState).user = null
          state.isAuthenticated = false
          state.isLoading = false
          return
        }
        const activeStoreId = getActiveStoreId()
        const persistedStoreId = state.user?.storeId
        if (activeStoreId && persistedStoreId && persistedStoreId !== activeStoreId) {
          state.user = null
          state.memberships = []
          state.currentStoreRole = null
          state.isAuthenticated = false
          state.isLoading = false
          void clearTenantState()
        }
      },
    }

  )
)

registerTenantResetHandler(() => {
  useAuthStore.setState({ user: null, isAuthenticated: false, isLoading: false, memberships: [], currentStoreRole: null })
})
registerTenantStoreSync(() => { void useAuthStore.persist.rehydrate() })
