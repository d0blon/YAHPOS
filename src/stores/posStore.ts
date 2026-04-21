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
  loyalty?: {
    accumulationRate: number;
    redemptionRate: number;
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
}

const calculatePosTotals = (items: PosItem[]): Omit<PosCart, 'items' | 'customerRut' | 'customerName' | 'customerPoints'> => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const total = subtotal
  const pointsToEarn = Math.floor(total / 100)
  
  return { totalItems, subtotal, total, pointsToEarn }
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
        supervisorPin: '1234'
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
        
        set({ items: newItems, ...calculatePosTotals(newItems) })
      },
      
      removeItem: (productId: string) => {
        const { items } = get()
        const newItems = items.filter(item => item.product.id !== productId)
        set({ items: newItems, ...calculatePosTotals(newItems) })
      },
      
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) return get().removeItem(productId)
        const { items } = get()
        const newItems = items.map(item => item.product.id === productId ? { ...item, quantity } : item)
        set({ items: newItems, ...calculatePosTotals(newItems) })
      },
      
      clearPos: () => {
        set({ 
          items: [], totalItems: 0, subtotal: 0, total: 0, pointsToEarn: 0, 
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
          ...calculatePosTotals(orderToResume.items)
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
