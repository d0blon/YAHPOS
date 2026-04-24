'use client'

import { create } from 'zustand'
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { get, set, del } from 'idb-keyval'
import { Product, User } from '@/types'

export interface CashSession {
  id: number;
  terminal_id: number;
  terminal_name: string;
  cashier_name: string;
  opening_amount: number;
  opened_at: string;
  status: 'open' | 'closed';
}

export interface PosSettings {
  blindClosureEnabled: boolean;
  pinRequiredForDelete: boolean;
  supervisorPin: string;
  loyaltyEnabled: boolean;
  loyalty?: {
    accumulationRate: number; // e.g. 1% -> 0.01
    redemptionRate: number;   // e.g. 1 point = $1
    redemptionMultiple: number; // e.g. only redeem in 100s
  };
}

export interface AuditEntry {
  id: string;
  type: 'SALE' | 'VOID' | 'CLOSURE' | 'CANCEL' | 'AUTH_SUCCESS' | 'AUTH_FAIL' | 'CASH_IN' | 'CASH_OUT';
  user: string;
  details: string;
  timestamp: number;
}

export type MovementCategory = 'PROVEEDOR' | 'RETIRO' | 'GASTO_MENOR' | 'REPOSICION' | 'ERROR_CAJA' | 'OTRO';

export interface CashMovement {
  id: string;
  sessionId: number | string;
  type: 'IN' | 'OUT';
  category: MovementCategory;
  amount: number;
  reason: string;
  timestamp: number;
  cashier: string;
}

export interface PosItem {
  product: Product;
  quantity: number;
}

export interface PosCart {
  items: PosItem[];
  totalItems: number;
  subtotal: number;
  total: number;
  customerRut?: string;
  customerName?: string;
  customerPoints?: number;
  isFullAccount?: boolean;
  identityVerified?: boolean;
  pointsToEarn: number;
  pointsRedeemed: number;
}

export interface SuspendedOrder {
  id: string;
  items: PosItem[];
  customerRut?: string;
  customerName?: string;
  timestamp: number;
  total: number;
}

export interface OrderRecord {
  id: string;
  items: PosItem[];
  subtotal: number;
  total: number;
  customerRut?: string;
  customerName?: string;
  customerPoints?: number;
  pointsToEarn: number;
  paymentMethod: 'EFECTIVO' | 'TARJETA' | 'PUNTOS';
  timestamp: number;
  isOffline: boolean;
  discount?: number;
  pointsRedeemed?: number;
}

interface PosState extends PosCart {
  inventory: Product[];
  suspendedOrders: SuspendedOrder[];
  salesHistory: OrderRecord[];
  pendingSyncOrders: OrderRecord[];
  cashMovements: CashMovement[];
  settings: PosSettings;
  currentUser: User | null;
  auditLog: AuditEntry[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearPos: () => void;
  setCustomer: (rut: string, name?: string, points?: number, isFull?: boolean, isVerified?: boolean) => void;
  suspendCurrentOrder: () => void;
  resumeOrder: (id: string) => void;
  removeSuspendedOrder: (id: string) => void;
  setInventory: (products: Product[]) => void;
  processCheckoutStock: () => void;
  addSale: (sale: OrderRecord) => void;
  addCashMovement: (movement: CashMovement) => void;
  clearCashMovements: () => void;
  queueOrderForSync: (sale: OrderRecord) => void;
  removeOrderFromQueue: (orderId: string) => void;
  clearSalesHistory: () => void;
  updateSettings: (settings: Partial<PosSettings>) => void;
  setCurrentUser: (user: User | null) => void;
  logEvent: (entry: Omit<AuditEntry, 'id' | 'timestamp' | 'user'>) => void;
  setTrainingMode: (active: boolean) => void;
  isTrainingMode: boolean;
  cashSession: CashSession | null;
  setCashSession: (session: CashSession | null) => void;
  clearCashSession: () => void;
  addGenericItem: (name: string, price: number) => void;
  setPointsRedeemed: (points: number) => void;
  setItems: (items: PosItem[]) => void;
  setSuspendedOrders: (orders: SuspendedOrder[]) => void;
  syncDraftToServer: () => Promise<void>;
  loadDraftFromServer: (sessionId: string | number) => Promise<void>;
  loadMovementsFromServer: (sessionId: string) => Promise<void>;
  isSyncing: boolean;
  isInitialLoading: boolean;
}

const calculatePosTotals = (items: PosItem[], pointsRedeemed = 0, settings?: PosSettings): Omit<PosCart, 'items' | 'customerRut' | 'customerName' | 'customerPoints'> => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  
  // Loyalty Logic
  const redemptionRate = settings?.loyalty?.redemptionRate || 1
  const discount = pointsRedeemed * redemptionRate
  const total = Math.max(0, subtotal - discount)
  
  const accumulationRate = settings?.loyalty?.accumulationRate || 0.01
  const pointsToEarn = Math.floor(subtotal * accumulationRate)
  
  return { totalItems, subtotal, total, pointsToEarn, pointsRedeemed }
}

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => (await get(name)) || null,
  setItem: async (name: string, value: string): Promise<void> => await set(name, value),
  removeItem: async (name: string): Promise<void> => await del(name),
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      subtotal: 0,
      total: 0,
      pointsToEarn: 0,
      pointsRedeemed: 0,
      inventory: [],
      suspendedOrders: [],
      salesHistory: [],
      pendingSyncOrders: [],
      cashMovements: [],
      auditLog: [],
      currentUser: {
        id: '1',
        email: 'admin@australmarket.cl',
        firstName: 'Admin',
        lastName: 'Austral',
        role: 'admin',
        addresses: [],
        loyaltyPoints: 0,
        identityVerified: false,
        wishlist: [],
        purchaseHistory: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      settings: {
        blindClosureEnabled: true,
        pinRequiredForDelete: true,
        supervisorPin: '1234',
        loyaltyEnabled: true,
        loyalty: {
          accumulationRate: 0.01,
          redemptionRate: 1,
          redemptionMultiple: 100
        }
      },
      isTrainingMode: false,
      cashSession: null,
      
      addItem: (product: Product, quantity = 1) => {
        const { items } = get()
        const existingItem = items.find(item => item.product.id === product.id)
        
        let newItems: PosItem[]
        if (existingItem) {
          newItems = items.map(item =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
          )
        } else {
          newItems = [...items, { product, quantity }]
        }
        
        set({ items: newItems, ...calculatePosTotals(newItems, get().pointsRedeemed, get().settings) })
      },
      
      removeItem: (productId: string) => {
        const { items } = get()
        const newItems = items.filter(item => item.product.id !== productId)
        set({ items: newItems, ...calculatePosTotals(newItems, get().pointsRedeemed, get().settings) })
      },
      
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) return get().removeItem(productId)
        const { items } = get()
        const newItems = items.map(item => item.product.id === productId ? { ...item, quantity } : item)
        set({ items: newItems, ...calculatePosTotals(newItems, get().pointsRedeemed, get().settings) })
      },
      
      clearPos: () => {
        set({ 
          items: [], totalItems: 0, subtotal: 0, total: 0, pointsToEarn: 0, pointsRedeemed: 0,
          customerRut: undefined, customerName: undefined, customerPoints: undefined,
          isFullAccount: undefined, identityVerified: undefined
        })
      },
      
      setCustomer: (rut: string, name?: string, points?: number, isFull?: boolean, isVerified?: boolean) => {
        set({ customerRut: rut, customerName: name, customerPoints: points, isFullAccount: isFull, identityVerified: isVerified })
      },
      
      suspendCurrentOrder: () => {
        const { items, customerRut, customerName, total } = get();
        if (items.length === 0) return;
        
        const newSuspended: SuspendedOrder = {
          id: Date.now().toString(),
          items: [...items],
          customerRut,
          customerName,
          timestamp: Date.now(),
          total
        };
        
        set((state) => ({
          suspendedOrders: [...state.suspendedOrders, newSuspended],
          items: [], totalItems: 0, subtotal: 0, total: 0, pointsToEarn: 0, customerRut: undefined, customerName: undefined, customerPoints: undefined
        }));
      },
      
      resumeOrder: (id: string) => {
        const { suspendedOrders, items } = get();
        const orderToResume = suspendedOrders.find(o => o.id === id);
        if (!orderToResume) return;
        
        // If there's an active cart, suspend it first
        if (items.length > 0) {
          get().suspendCurrentOrder();
        }
        
        set((state) => ({
          items: orderToResume.items,
          customerRut: orderToResume.customerRut,
          customerName: orderToResume.customerName,
          suspendedOrders: state.suspendedOrders.filter(o => o.id !== id),
          ...calculatePosTotals(orderToResume.items, 0, get().settings)
        }));
      },
      
      removeSuspendedOrder: (id: string) => {
        set((state) => ({
          suspendedOrders: state.suspendedOrders.filter(o => o.id !== id)
        }));
      },
      
      setInventory: (products: Product[]) => {
        set({ inventory: products });
      },
      processCheckoutStock: () => {
        const { items, inventory, isTrainingMode } = get();
        if (isTrainingMode) return; // Skip stock deduction in sandbox
        
        // Decrement stock in the local inventory state
        const newInventory = inventory.map(p => {
          const cartItem = items.find(item => item.product.id === p.id);
          if (cartItem) {
            return {
              ...p,
              stock: p.stock - cartItem.quantity
            };
          }
          return p;
        });
        
        set({ inventory: newInventory });
      },
      
      addSale: (sale: OrderRecord) => {
        const { isTrainingMode } = get();
        if (isTrainingMode) return; // Don't record training sales in master history
        
        set((state) => ({
          salesHistory: [sale, ...state.salesHistory]
        }));
      },

      addCashMovement: (movement: CashMovement) => {
        const { isTrainingMode } = get();
        if (isTrainingMode) return;
        set((state) => ({
          cashMovements: [movement, ...state.cashMovements]
        }));
      },

      clearCashMovements: () => {
        set({ cashMovements: [] });
      },
      
      queueOrderForSync: (sale: OrderRecord) => {
        const { isTrainingMode } = get();
        if (isTrainingMode) return;
        set((state) => ({
          pendingSyncOrders: [...state.pendingSyncOrders, sale]
        }));
      },
      
      removeOrderFromQueue: (orderId: string) => {
        set((state) => ({
          pendingSyncOrders: state.pendingSyncOrders.filter(o => o.id !== orderId)
        }));
      },
      
      clearSalesHistory: () => {
        set({ salesHistory: [] });
      },

      setTrainingMode: (active: boolean) => {
        set({ isTrainingMode: active });
      },
      
      updateSettings: (newSettings: Partial<PosSettings>) => {
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));
      },
      
      setCurrentUser: (user: User | null) => {
        set({ currentUser: user });
      },
      
      setCashSession: (session: CashSession | null) => {
        set({ cashSession: session });
      },
      
      clearCashSession: () => {
        set({ cashSession: null });
      },
      
      addGenericItem: (name, price) => {
        const product: Product = {
          id: `GEN-${Date.now()}`,
          name: name || 'Otros',
          slug: `otros-${Date.now()}`,
          description: 'Producto no registrado',
          price: price,
          image: '',
          images: [],
          category: { id: 'otros', name: 'Otros', slug: 'otros', isActive: true, order: 99 } as any,
          categoryId: 'otros',
          stock: 9999,
          sku: `GEN-${Date.now()}`,
          barcode: '',
          unit: 'un',
          isActive: true,
          isFeatured: false,
          lowStockThreshold: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        get().addItem(product);
      },

      setPointsRedeemed: (points) => {
        set({ ...calculatePosTotals(get().items, points, get().settings) });
      },
      
      setItems: (items) => {
        set({ items, ...calculatePosTotals(items, get().pointsRedeemed, get().settings) })
      },

      setSuspendedOrders: (orders) => {
        set({ suspendedOrders: orders })
      },

      isSyncing: false,
      isInitialLoading: false,

      syncDraftToServer: async () => {
        const { cashSession, items, suspendedOrders } = get()
        if (!cashSession) return

        set({ isSyncing: true })
        try {
          await fetch('/api/pos/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: cashSession.id,
              cartData: items,
              suspendedOrdersData: suspendedOrders
            })
          })
        } catch (error) {
          console.error('[POS STORE] Error syncing draft silently:', error)
        } finally {
          // El mini-indicador desaparece rápido
          setTimeout(() => set({ isSyncing: false }), 500)
        }
      },

      loadDraftFromServer: async (sessionId) => {
        set({ isInitialLoading: true })
        try {
          // Cargar draft de carrito
          const res = await fetch(`/api/pos/draft?sessionId=${sessionId}`)
          if (res.ok) {
            const { draft } = await res.json()
            if (draft) {
              if (draft.cart_data) {
                const items = draft.cart_data
                set({ items, ...calculatePosTotals(items, 0, get().settings) })
              }
              if (draft.suspended_orders_data) {
                set({ suspendedOrders: draft.suspended_orders_data })
              }
            }
          }

          // Cargar movimientos de caja
          await get().loadMovementsFromServer(sessionId.toString())

        } catch (error) {
          console.error('[POS STORE] Error loading draft:', error)
        } finally {
          set({ isInitialLoading: false })
        }
      },

      loadMovementsFromServer: async (sessionId) => {
        try {
          const res = await fetch(`/api/cash-movements?session_id=${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            const movements: CashMovement[] = data.map((m: any) => ({
              id: m.id,
              sessionId: m.session_id,
              type: m.type,
              category: m.category,
              amount: parseFloat(m.amount),
              reason: m.reason,
              timestamp: new Date(m.created_at).getTime(),
              cashier: m.cashier_name
            }))
            set({ cashMovements: movements })
          }
        } catch (error) {
          console.error('[POS STORE] Error loading movements:', error)
        }
      },

      logEvent: (entry) => {
        const { currentUser } = get();
        const newEntry: AuditEntry = {
          ...entry,
          id: Date.now().toString(),
          user: currentUser?.email || 'unknown',
          timestamp: Date.now()
        };
        set((state) => ({ auditLog: [newEntry, ...state.auditLog].slice(0, 1000) }));
      }
    }),
    {
      name: 'austral-market-pos-session',
      storage: createJSONStorage(() => idbStorage),
    }
  )
)
