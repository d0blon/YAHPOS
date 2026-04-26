'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { 
  Search, ShoppingCart, User, Plus, Minus, Trash2, MapPin,
  CreditCard, Banknote, History, PauseCircle, PlayCircle, 
  Loader2, Settings, ShieldAlert, LogOut, Terminal, AlertTriangle,
  Award, PackageOpen, Monitor, DollarSign, Lock, ChevronRight, X, TrendingUp,
  Sun, Moon, Wifi, WifiOff, Cloud, CloudOff, Store, LayoutDashboard, Zap, PlusCircle, Calculator, Archive, RefreshCw,
  Smartphone, Tablet
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { usePosStore } from '@/stores/posStore'
import { formatPrice, cn } from '@/lib/utils'
import { useTheme } from 'next-themes'
import { useSaaS } from '@/providers/SaaSProvider'
import { getProducts, getBranches } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { PosReceiptModal } from '@/components/pos/PosReceiptModal'
import { WeightInputModal } from '@/components/pos/WeightInputModal'
import { SalesHistoryModal } from '@/components/pos/SalesHistoryModal'
import { DailyClosureModal } from '@/components/pos/DailyClosureModal'
import { PosSettingsModal } from '@/components/pos/PosSettingsModal'
import { ManagerPinModal } from '@/components/pos/ManagerPinModal'
import { CashOpeningModal } from '@/components/pos/CashOpeningModal'
import CustomerModal from '@/components/pos/CustomerModal'
import { Product, Branch } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'
import { OrderRecord, CashMovement } from '@/stores/posStore'
import { PosSidebar } from '@/components/pos/PosSidebar'
import { PosHeader } from '@/components/pos/PosHeader'
import { OfflineSyncManager } from '@/components/pos/OfflineSyncManager'
import { CashMovementModal } from '@/components/pos/CashMovementModal'
import { MovementReceiptModal } from '@/components/pos/MovementReceiptModal'
import { PaymentModal } from '@/components/pos/PaymentModal'
import { SyncOverlay } from '@/components/pos/SyncOverlay'

// --- FLYING ITEM PARTICLE ---
const FlyingItem = ({ x, y, onComplete }: { x: number, y: number, onComplete: () => void }) => {
  return (
    <motion.div
      initial={{ x, y, scale: 1, opacity: 1 }}
      animate={{ 
        x: window.innerWidth - 320, // Aproximadamente donde está el carrito
        y: 60, 
        scale: 0.2, 
        opacity: 0.5 
      }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={onComplete}
      className="fixed top-0 left-0 w-12 h-12 bg-patagonia-600 rounded-full z-[9999] pointer-events-none flex items-center justify-center shadow-lg"
    >
      <ShoppingCart className="w-6 h-6 text-white" />
    </motion.div>
  )
}

// --- OFFLINE INDICATOR COMPONENT ---
const OfflineIndicator = ({ isSyncing }: { isSyncing: boolean }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2 rounded-2xl transition-all duration-500 border backdrop-blur-md shadow-sm",
      isOnline 
        ? "bg-white/50 dark:bg-slate-900/50 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
        : "bg-rose-500/10 border-rose-500/20 text-rose-500 animate-pulse"
    )}>
      <div className="relative flex items-center justify-center">
        {isOnline ? (
          <Wifi className={cn("w-4 h-4 transition-all", isSyncing && "opacity-20")} />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        
        {/* Subtle Sync LED Indicator */}
        {isSyncing && isOnline && (
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className="w-3 h-3 animate-spin text-patagonia-400" />
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase tracking-tighter leading-none">
          {isOnline ? 'SISTEMA ONLINE' : 'MODO OFFLINE'}
        </span>
        {isSyncing && (
          <span className="text-[7px] font-black text-patagonia-500 animate-pulse tracking-[0.2em] mt-0.5">
            SINCRONIZANDO...
          </span>
        )}
      </div>

      {/* Connection status light */}
      <div className={cn(
        "w-1.5 h-1.5 rounded-full shadow-lg",
        isOnline ? "bg-emerald-500 shadow-emerald-500/50" : "bg-rose-500 shadow-rose-500/50"
      )} />
    </div>
  );
};

// --- MEMOIZED COMPONENTS (Senior Frontend Performance) ---
const ProductCard = React.memo(({ p, onClick }: { p: Product, onClick: (p: Product, e: React.MouseEvent) => void }) => {
  const [imgError, setImgError] = useState(false);
  const isLowStock = p.stock <= p.lowStockThreshold;
  const isWeighable = p.unit === 'kg';

  const categoryThumb = (() => {
    const cat = (typeof p.category === 'string' ? p.category : p.category?.name || '').toLowerCase();
    if (cat.includes('bebida') || cat.includes('botilleria')) return '/pos/thumbnails/bebidas.png';
    if (cat.includes('carne')) return '/pos/thumbnails/carnes.png';
    if (cat.includes('fruta') || cat.includes('verdura') || cat.includes('alimento')) return '/pos/thumbnails/frutas_verduras.png';
    if (cat.includes('limpieza')) return '/pos/thumbnails/limpieza.png';
    return '/pos/thumbnails/abarrotes.png';
  })();

  return (
    <button 
      onClick={(e) => onClick(p, e)}
      className="group relative flex flex-col bg-white dark:bg-slate-900 rounded-[2rem] p-4 text-left border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:border-patagonia-600 transition-all duration-500 ease-out active:scale-[0.98] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
      style={{ animationDelay: `${((p.id.charCodeAt(p.id.length - 1) || 0) % 10) * 30}ms` }}
    >
      <div className="w-full aspect-square bg-slate-50 dark:bg-slate-800/50 rounded-3xl mb-4 relative overflow-hidden flex items-center justify-center border border-slate-100 dark:border-slate-800">
        {p.image && !imgError ? (
          <img 
            src={p.image} 
            alt={p.name} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal group-hover:scale-110 transition-transform duration-700 ease-out" 
          />
        ) : (
          <img 
            src={categoryThumb} 
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
          />
        )}
        
        <div className={cn(
          "absolute top-3 left-3 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase z-10 backdrop-blur-md shadow-sm border",
          isLowStock 
            ? 'bg-rose-500 text-white border-rose-400' 
            : 'bg-white/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-700'
        )}>
          {p.stock} {p.unit}
        </div>

        {isWeighable && (
          <div className="absolute top-3 right-3 w-8 h-8 bg-patagonia-600 rounded-full flex items-center justify-center shadow-lg shadow-patagonia-600/30 z-10 animate-pulse">
            <Monitor className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <div className="space-y-1.5 mt-auto px-1">
        <p className="font-black text-slate-600 dark:text-slate-400 group-hover:text-patagonia-600 transition-colors line-clamp-2 leading-tight text-[10px] uppercase tracking-tighter">{p.name}</p>
        <div className="flex items-center justify-between">
           <p className="font-black text-xl text-slate-900 dark:text-white tracking-tighter">{formatPrice(p.price)}</p>
           <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-patagonia-600 transition-all shadow-sm group-hover:bg-patagonia-600 group-hover:text-white group-hover:scale-110">
              <Plus className="w-5 h-5" />
           </div>
        </div>
      </div>
    </button>
  );
}, (prev, next) => prev.p.id === next.p.id && prev.p.stock === next.p.stock && prev.p.price === next.p.price);

ProductCard.displayName = 'ProductCard';

import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// --- QUICK ADD MODAL (NUMPAD) ---
const QuickAddModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: (name: string, price: number) => void }) => {
  const [amount, setAmount] = useState('')
  const [name, setName] = useState('PRODUCTO GENÉRICO')

  const handleKey = (key: string) => {
    if (key === 'C') setAmount('')
    else if (amount.length < 9) setAmount(prev => prev + key)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-white/10 flex flex-col">
        <div className="p-10 pb-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-patagonia-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-patagonia-600/20">
                  <Calculator className="w-6 h-6"/>
               </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">Venta Rápida</h3>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Ingreso Manual de Items</p>
              </div>
           </div>
           <button onClick={onClose} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all active:scale-90 group">
            <X className="w-6 h-6 text-slate-400 group-hover:rotate-90 transition-transform" />
          </button>
        </div>
        <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] ml-6">Descripción del Item</label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="h-16 px-8 text-lg font-black rounded-2xl border-none bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white uppercase tracking-tighter" 
              />
           </div>
           <div className="bg-slate-100 dark:bg-slate-800/50 rounded-[2.5rem] p-8 shadow-inner border-2 border-slate-200 dark:border-slate-800 relative group">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4 text-center">Monto a Cobrar</div>
              <div className="text-6xl font-black text-slate-900 dark:text-white text-center tracking-tighter mb-10 group-hover:scale-110 transition-transform duration-500">{formatPrice(parseInt(amount) || 0)}</div>
              <div className="grid grid-cols-3 gap-4">
                 {[1,2,3,4,5,6,7,8,9,'C',0,'OK'].map(k => (
                    <button 
                      key={k} 
                      onClick={() => k === 'OK' ? (parseInt(amount) > 0 && onConfirm(name, parseInt(amount))) : handleKey(k.toString())}
                      className={cn(
                        "h-20 rounded-[1.5rem] text-2xl font-black transition-all active:scale-95 shadow-sm",
                        k === 'OK' ? "bg-emerald-500 text-white shadow-xl shadow-emerald-900/30" : 
                        k === 'C' ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" : 
                        "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-100 dark:border-slate-800 hover:border-patagonia-600"
                      )}
                    >
                      {k}
                    </button>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- BRANCH SELECTION MODAL ---
const BranchSelectionModal = ({ isOpen, branches, onSelect }: { isOpen: boolean, branches: Branch[], onSelect: (id: string) => void }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-500">
        <div className="p-10 text-center space-y-4">
          <div className="w-20 h-20 bg-patagonia-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-patagonia-600/30 mx-auto mb-6">
            <Store className="w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Seleccionar Sucursal</h2>
          <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Identifica el local donde estás operando para gestionar el stock correctamente</p>
        </div>
        
        <div className="p-10 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branches.map(branch => (
            <button
              key={branch.id}
              onClick={() => onSelect(branch.id)}
              className="group relative bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] text-left border-2 border-transparent hover:border-patagonia-600 hover:bg-white dark:hover:bg-slate-800 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-patagonia-600 shadow-sm transition-colors">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter">{branch.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{branch.address || 'Sin dirección'}</p>
                </div>
              </div>
              <ChevronRight className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 group-hover:text-patagonia-600 group-hover:translate-x-2 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function PosTerminal() {
  const { theme, setTheme } = useTheme()
  const { config } = useSaaS()
  const router = useRouter()
  const { user: authUser, isAuthenticated } = useAuthStore()
  
  const { 
    items, totalItems, total, subtotal, addItem, updateQuantity, removeItem, clearPos, 
    customerRut, customerName, customerPoints, pointsToEarn, setCustomer, suspendCurrentOrder, resumeOrder, removeSuspendedOrder, suspendedOrders,
    inventory, setInventory, processCheckoutStock, salesHistory, addSale, isTrainingMode, setTrainingMode,
    currentUser, setCurrentUser, settings, cashSession, setCashSession,
    addGenericItem, pointsRedeemed, setPointsRedeemed, isSyncing, isInitialLoading,
    selectedBranchId, setSelectedBranchId
  } = usePosStore()

  const [branches, setBranches] = useState<Branch[]>([])
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)

  // 0. Seguridad de Salida (Prevenir pérdida de datos)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSyncing || items.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Muestra el diálogo estándar del navegador
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isSyncing, items.length]);

  // Determinar marca a mostrar
  const displayName = config.white_label_enabled && config.tier === 'elite' 
    ? config.store_name 
    : 'PatagoniaPOS'
  
  const displayBrand = displayName.includes('Patagonia') 
    ? <>Patagonia<span className="text-patagonia-600 italic">POS</span></>
    : displayName


  const [search, setSearch] = useState('')
  const [viewSuspended, setViewSuspended] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<OrderRecord | null>(null)
  const [isRedeeming, setIsRedeeming] = useState(false)
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | 'Todos'>('Todos')
  
  const [viewHistory, setViewHistory] = useState(false)
  const [viewClosure, setViewClosure] = useState(false)
  const [viewSettings, setViewSettings] = useState(false)
  const [viewMovements, setViewMovements] = useState(false)
  const [activeMovement, setActiveMovement] = useState<CashMovement | null>(null)
  const [pinAction, setPinAction] = useState<{ name: string, onConfirm: () => void } | null>(null)
  
  const [weightModalProduct, setWeightModalProduct] = useState<Product | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [viewQuickAdd, setViewQuickAdd] = useState(false)
  const [flyingItems, setFlyingItems] = useState<{id: number, x: number, y: number}[]>([])
  const [isCartBouncing, setIsCartBouncing] = useState(false)

  // 1. Hidratación y Protección de Ruta (Optimizado)
  useEffect(() => {
    if (!isHydrated) {
      setIsHydrated(true)
      return
    }
    
    if (!isAuthenticated) {
       router.push('/login?callback=/pos')
       return
    }

    const allowedRoles = ['admin', 'manager', 'cashier', 'cajero', 'developer']
    if (authUser && !allowedRoles.includes(authUser.role)) {
       toast.error('No tienes permisos para acceder al POS')
       router.push('/')
       return
    }

    if (authUser && (!currentUser || currentUser.id !== authUser.id)) {
       setCurrentUser(authUser)
    }

    // Cargar sucursales si es Plan Élite
    if (config.tier === 'elite') {
      getBranches().then(res => {
        setBranches(res)
        // Si solo hay una sucursal, seleccionarla automáticamente
        if (res.length === 1 && !selectedBranchId) {
          setSelectedBranchId(res[0].id)
        } else if (res.length > 1 && !selectedBranchId) {
          setIsBranchModalOpen(true)
        }
      })
    }

    // Solo cargar inventario si no hay o si cambió la sucursal
    getProducts(selectedBranchId || undefined).then(res => {
      if (res && res.length > 0) setInventory(res)
    }).catch(() => console.warn('[POS] Error al sincronizar inventario'))

    // 1.1 Cargar Configuraciones Globales (Lealtad, Terminales, etc.)
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          const { loyalty, pos } = data.settings;
          usePosStore.getState().updateSettings({
            loyaltyEnabled: loyalty?.enabled ?? true,
            loyalty: {
              accumulationRate: 1 / (Number(loyalty?.accumulationRate) || 100),
              redemptionRate: Number(loyalty?.redemptionRate) || 1,
              redemptionMultiple: Number(loyalty?.minRedemption) || 1
            },
            activeTerminals: {
              cash: pos?.paymentCash ?? true,
              transbank: pos?.paymentTransbank ?? true,
              getnet: pos?.paymentGetnet ?? false,
              tuu: pos?.paymentTuu ?? false,
              sumup: pos?.paymentSumup ?? false,
              transfer: pos?.paymentTransfer ?? true
            }
          });
          console.log('[POS] Configuraciones sincronizadas ✅');
        }
      })
      .catch(err => console.warn('[POS] Error al cargar configuraciones', err));

  }, [isHydrated, isAuthenticated, authUser, router, setCurrentUser, currentUser, setInventory, selectedBranchId, config.tier])

  // -- REALTIME INVENTORY SYNC --
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('pos-products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          console.log('[POS] Cambio detectado en productos:', payload);
          // Recargar el inventario si hay cambios
          getProducts().then(res => {
            if (res && res.length > 0) setInventory(res);
          }).catch(err => console.warn('[POS] Error actualizando inventario en tiempo real', err));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, setInventory]);

  // -- SERVER DRAFT RECOVERY (F5 / Login) --
  useEffect(() => {
    if (cashSession && isAuthenticated && isHydrated) {
      usePosStore.getState().loadDraftFromServer(cashSession.id);
    }
  }, [cashSession?.id, isAuthenticated, isHydrated]);
  
  const getCategoryIcon = (catName: string) => {
    const map: Record<string, string> = {
      'Todos': '📦',
      'bebidas': '🥤',
      'abarrotes': '🍞',
      'alimentos': '🍎',
      'limpieza': '🧹',
      'congelados': '❄️',
      'lacteos': '🧀',
      'carnes': '🥩',
      'frutas': '🍐',
      'verduras': '🥦',
      'panaderia': '🥐',
      'confiteria': '🍬',
      'mascotas': '🐶',
      'ferreteria': '🛠️',
      'botilleria': '🍺'
    }
    return map[catName.toLowerCase()] || '🏷️'
  }

  const categories = Array.from(new Set(inventory.map(p => typeof p.category === 'string' ? p.category : p.category?.name || 'Otro'))).filter(Boolean)

  const filteredProducts = inventory.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const catName = typeof p.category === 'string' ? p.category : p.category?.name || 'Otro';
    const matchesCategory = selectedCategory === 'Todos' || catName === selectedCategory;
    return matchesSearch && matchesCategory;
  })


  // -- BARCODE SCANNER --
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) barcodeBuffer = '';
      if (e.key === 'Enter' && barcodeBuffer.length >= 12) {
        e.preventDefault();
        
        // --- LÓGICA DE BALANZA (EAN-13 VARIABLE) ---
        // Formato: 20 + KKKKK (PLU) + WWWWW (Peso/Precio) + C
        if (barcodeBuffer.startsWith('20') && barcodeBuffer.length >= 12) {
          const plu = barcodeBuffer.substring(2, 7);
          const weightString = barcodeBuffer.substring(7, 12);
          const weight = parseInt(weightString) / 1000; // Convertir 01250 a 1.250kg
          
          const found = inventory.find(p => p.sku === plu || p.barcode === plu || p.id.includes(plu));
          if (found) {
            usePosStore.getState().addItem(found, weight);
            toast.success(`${found.name} (${weight}kg) Pesado ✅`);
          } else {
            toast.error(`Producto PLU ${plu} no encontrado`);
          }
        } else {
          // --- LÓGICA NORMAL ---
          const found = inventory.find(p => p.barcode === barcodeBuffer || p.sku === barcodeBuffer);
          if (found) {
             if (found.unit === 'kg') setWeightModalProduct(found);
             else {
               usePosStore.getState().addItem(found);
               toast.success(`${found.name} Escaneado ✅`);
             }
          } else {
            toast.error("Código no reconocido");
          }
        }
        
        barcodeBuffer = '';
        return;
      }
      if (e.key.length === 1 && /[0-9A-Za-z]/.test(e.key)) barcodeBuffer += e.key;
      lastKeyTime = currentTime;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory]);

  // -- SERVER SYNC (DRAFTS) - Gated to prevent 401 loop --
  useEffect(() => {
    if (cashSession && isAuthenticated) {
        const timer = setTimeout(() => {
            usePosStore.getState().syncDraftToServer();
        }, 10000); // 10s de calma antes de sincronizar
        return () => clearTimeout(timer);
    }
  }, [items, suspendedOrders, cashSession, isAuthenticated]);

  const handleCheckout = async (paymentMethod: 'EFECTIVO' | 'TARJETA' | 'TERMINAL' | 'PUNTOS', receivedAmount?: number, terminalType?: string) => {
    setIsProcessing(true);
    setIsPaymentModalOpen(false);
    try {
      if (paymentMethod === 'TARJETA' || paymentMethod === 'TERMINAL') {
        const msg = paymentMethod === 'TERMINAL' ? `Enviando monto a ${terminalType}...` : 'Procesando Pago con Tarjeta...';
        toast.info(msg);
        await new Promise(r => setTimeout(r, 1500));
      }
      
      const isOnline = navigator.onLine;
      const temporalId = `POS-${Date.now()}`;
      
      const orderProof = {
        id: temporalId,
        items: [...items],
        subtotal,
        total: total,
        discount: pointsRedeemed * (settings.loyalty?.redemptionRate || 1),
        pointsToEarn: pointsToEarn,
        pointsRedeemed: pointsRedeemed,
        customerRut,
        customerName,
        date: new Date().toLocaleString('es-CL'),
        paymentMethod: paymentMethod === 'TERMINAL' ? `TERMINAL (${terminalType})` : paymentMethod,
        isOffline: !isOnline,
        timestamp: Date.now()
      };

      if (!isTrainingMode) {
        // Enviar a Supabase (api/orders handles reduction and points)
        try {
          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: currentUser?.id || '1',
              registerId: cashSession?.terminal_id,
              total: total,
              discount: pointsRedeemed * (settings.loyalty?.redemptionRate || 1),
              paymentMethod: paymentMethod,
              customerRut: customerRut,
              pointsToEarn: pointsToEarn,
              pointsRedeemed: pointsRedeemed,
              branchId: selectedBranchId,
              items: items.map(i => ({ productId: i.product.id, quantity: i.quantity, unitPrice: i.product.price }))
            })
          });
          if (response.ok) toast.success('Venta Registrada ✅');
          else throw new Error('Error API');
        } catch (err) {
          usePosStore.getState().queueOrderForSync(orderProof);
          toast.warning('Venta guardada localmente (Offline) 📶');
        }
      }
      
      setReceiptData(orderProof);
      addSale(orderProof);
      processCheckoutStock();
      clearPos();
      setPointsRedeemed(0);
      setIsRedeeming(false);
      
      if (receivedAmount && receivedAmount > total) {
        toast.success(`Vuelto: ${formatPrice(receivedAmount - total)}`, {
          duration: 10000,
          position: 'top-center',
          style: { background: '#10b981', color: '#fff', fontSize: '20px', fontWeight: 'bold' }
        });
      }
    } catch (error) {
      toast.error('Error procesando el pago');
    } finally {
      setIsProcessing(false);
    }
  }

  const handleProductClick = useCallback((p: Product, e: React.MouseEvent) => {
    // Capturar coordenadas del click
    const x = e.clientX
    const y = e.clientY
    
    // Añadir partícula de vuelo
    setFlyingItems(prev => [...prev, { id: Date.now(), x, y }])

    if (p.unit === 'kg') setWeightModalProduct(p)
    else {
      addItem(p)
      toast.success(`${p.name} +1`, {duration: 800, position: 'bottom-right'})
    }
  }, [addItem]);

  const handleParticleComplete = (id: number) => {
    setFlyingItems(prev => prev.filter(item => item.id !== id))
    // Efecto de rebote en el carrito
    setIsCartBouncing(true)
    setTimeout(() => setIsCartBouncing(false), 300)
  }

  const handleWeightConfirm = (weight: number) => {
    if (weightModalProduct) {
      addItem(weightModalProduct, weight)
      setWeightModalProduct(null)
    }
  }

  const handleProtectedRemove = (productId: string, productName: string) => {
    if (settings.pinRequiredForDelete) {
        setPinAction({
            name: `Anular: ${productName}`,
            onConfirm: () => removeItem(productId)
        });
    } else removeItem(productId);
  }

  const handleDashboardNav = () => {
    // Esta función se mantiene como respaldo
    window.location.href = '/admin';
  };

  if (!isHydrated) return null;

  return (
    <div className="h-screen bg-background flex overflow-hidden font-sans text-foreground">
      <SyncOverlay isVisible={isInitialLoading} status="syncing" />
      <OfflineSyncManager />

      <CashOpeningModal 
        isOpen={!cashSession && isHydrated}
        cashierName={authUser?.firstName || 'Cajero'}
        onSessionOpened={setCashSession}
        onResumeSession={setCashSession}
      />
      
      {cashSession && (
        <>
          {/* 1. LEFT NAVIGATION (Sidebar) */}
      <div className={cn(
        "bg-card flex flex-col items-center py-6 gap-6 border-r border-border shrink-0 z-30 shadow-2xl transition-all duration-300 relative",
        isSidebarExpanded ? "w-64" : "w-22"
      )}>
      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-patagonia-600 text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all z-[100] border-2 border-border"
      >
        <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", isSidebarExpanded && "rotate-180")} />
      </button>

      <Link 
        href="/"
        className="w-14 h-14 bg-accent-yellow rounded-2xl flex items-center justify-center shadow-lg shadow-accent-yellow/20 active:scale-90 transition-all cursor-pointer group relative shrink-0"
        title="Ver Tienda Online"
      >
        <Store className="w-7 h-7 text-foreground group-hover:scale-110 transition-transform" />
      </Link>
      
      <div className="flex-1 flex flex-col gap-6 mt-4 w-full px-4">
        <button 
          onClick={handleDashboardNav}
          className={cn(
            "h-14 rounded-2xl bg-muted text-muted-foreground hover:bg-patagonia-600 hover:text-white flex items-center transition-all group shadow-lg cursor-pointer",
            isSidebarExpanded ? "px-6 w-full gap-4" : "justify-center w-14 mx-auto"
          )}
          title="Panel de Admin"
        >
           <LayoutDashboard className="w-7 h-7 shrink-0 group-hover:scale-110 transition-transform" />
           {isSidebarExpanded && <span className="font-black uppercase tracking-widest text-xs whitespace-nowrap">Panel de Admin</span>}
        </button>

        <button 
          className={cn(
            "h-14 rounded-2xl flex items-center transition-all group shadow-lg",
            isTrainingMode ? "bg-amber-500 text-white shadow-amber-500/20" : "bg-muted text-muted-foreground hover:bg-amber-500 hover:shadow-amber-500/20 hover:text-white",
            isSidebarExpanded ? "px-6 w-full gap-4" : "justify-center w-14 mx-auto"
          )}
          onClick={() => setTrainingMode(!isTrainingMode)}
          title="Modo Entrenamiento"
        >
           <Zap className="w-7 h-7 shrink-0 group-hover:scale-110 transition-transform" />
           {isSidebarExpanded && <span className="font-black uppercase tracking-widest text-xs whitespace-nowrap">Entrenar</span>}
        </button>
           <button 
             onClick={() => setViewHistory(true)} 
             className={cn(
               "h-14 rounded-2xl text-muted-foreground hover:bg-patagonia-600 hover:shadow-lg hover:shadow-patagonia-600/20 hover:text-white flex items-center transition-all hover:scale-105 active:scale-95 group overflow-hidden",
               isSidebarExpanded ? "px-6 w-full gap-4" : "justify-center w-14 mx-auto"
             )}
           >
             <History className="w-7 h-7 shrink-0"/>
             {isSidebarExpanded && <span className="font-black uppercase tracking-widest text-xs whitespace-nowrap">Historial</span>}
           </button>

           <button 
             onClick={() => setViewMovements(true)} 
             className={cn(
               "h-14 rounded-2xl text-muted-foreground hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 hover:text-white flex items-center transition-all hover:scale-105 active:scale-95 group overflow-hidden",
               isSidebarExpanded ? "px-6 w-full gap-4" : "justify-center w-14 mx-auto"
             )}
           >
             <DollarSign className="w-7 h-7 shrink-0"/>
             {isSidebarExpanded && <span className="font-black uppercase tracking-widest text-xs whitespace-nowrap">Caja</span>}
           </button>

           <button 
             onClick={() => {
               setPinAction({
                 name: "Acceso a Ajustes",
                 onConfirm: () => setViewSettings(true)
               });
             }}
             className={cn(
               "h-14 rounded-2xl text-muted-foreground hover:bg-slate-700 dark:hover:bg-slate-600 hover:shadow-lg hover:text-white flex items-center transition-all hover:scale-105 active:scale-95 group overflow-hidden",
               isSidebarExpanded ? "px-6 w-full gap-4" : "justify-center w-14 mx-auto"
             )}
           >
             <Settings className="w-7 h-7 shrink-0"/>
             {isSidebarExpanded && <span className="font-black uppercase tracking-widest text-xs whitespace-nowrap">Ajustes</span>}
           </button>
           
           <div className="h-px bg-muted mx-auto my-2 w-full max-w-[40px]" />
           
           <button 
             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
             className={cn(
               "h-14 rounded-2xl text-amber-500 hover:bg-amber-500/10 flex items-center transition-all group overflow-hidden",
               isSidebarExpanded ? "px-6 w-full gap-4" : "justify-center w-14 mx-auto"
             )}
           >
              {theme === 'dark' ? <Moon className="w-7 h-7 shrink-0" /> : <Sun className="w-7 h-7 shrink-0" />}
              {isSidebarExpanded && <span className="font-black uppercase tracking-widest text-xs whitespace-nowrap">Tema</span>}
           </button>
        </div>

        <div className="w-full px-4 mt-auto">
          <button 
            onClick={() => setViewClosure(true)} 
            className={cn(
              "h-14 rounded-2xl bg-rose-500/10 text-rose-500 dark:text-rose-400 hover:bg-rose-500 hover:text-white flex items-center transition-all hover:scale-105 active:scale-95 mb-4 shadow-lg shadow-rose-500/10 overflow-hidden shrink-0 w-full",
              isSidebarExpanded ? "px-6 gap-4" : "justify-center w-14 mx-auto"
            )}
          >
            <Lock className="w-7 h-7 shrink-0"/>
            {isSidebarExpanded && <span className="font-black uppercase tracking-widest text-xs whitespace-nowrap">Cerrar</span>}
          </button>
        </div>
      </div>

      {/* 2. MAIN AREA */}
      <div className="flex-1 flex flex-col min-w-0 bg-background transition-colors duration-500 relative">
        {/* Header Section */}
        <header className="h-20 bg-card border-b border-border px-8 flex items-center justify-between shrink-0 shadow-sm z-10 transition-colors duration-500">
           <div className="flex items-center gap-4">
                  <img 
                    src={theme === 'dark' ? '/logos/logo-dark.png' : '/logos/logo-light.png'} 
                    alt="Logo" 
                    className={cn(
                      "h-12 w-auto object-contain",
                      theme === 'dark' ? "mix-blend-screen" : "mix-blend-multiply"
                    )} 
                  />
                  <div className="flex flex-col">
                    <h1 className="text-xl font-black text-foreground tracking-tighter leading-none">
                      Patagonia<span className="text-patagonia-600 italic">POS</span>
                    </h1>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Smart Commerce</p>
                  </div>
                </div>

           <div className="flex-1 max-w-lg mx-8">
             <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar Producto..." 
                  className="w-full h-10 pl-11 bg-input border-none rounded-xl focus-visible:ring-2 focus-visible:ring-patagonia-600 text-sm font-medium transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
             </div>
           </div>

           <div className="flex items-center gap-6">
              {config.tier === 'elite' && (
                <button 
                  onClick={() => setIsBranchModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-patagonia-600/10 text-patagonia-600 border border-patagonia-600/20 hover:bg-patagonia-600 hover:text-white transition-all group"
                >
                  <MapPin className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {branches.find(b => b.id === selectedBranchId)?.name || 'Sucursal'}
                  </span>
                </button>
              )}
              <OfflineIndicator isSyncing={isSyncing} />
              <div className="text-right hidden sm:block">
                 <p className="text-xs font-black text-foreground leading-tight">{authUser?.firstName} {authUser?.lastName}</p>
                 <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{cashSession?.terminal_name || 'Caja Central'}</p>
              </div>
           </div>
        </header>

        {/* Categories Section */}
        <div className="px-8 py-5 bg-muted dark:bg-muted/50 backdrop-blur-md border-b border-border flex overflow-x-auto whitespace-nowrap gap-4 shrink-0 scroll-smooth items-center touch-pan-x custom-scrollbar">
           <button 
             className={cn(
                "rounded-xl px-6 font-black h-12 text-xs transition-all shadow-sm flex items-center gap-2 uppercase tracking-wide min-w-max",
                selectedCategory === 'Todos' 
                  ? "bg-patagonia-600 text-white shadow-patagonia-500/20" 
                  : "bg-card text-muted-foreground border border-border hover:bg-background"
             )}
             onClick={() => setSelectedCategory('Todos')}
           >
             {getCategoryIcon('Todos')} TODOS
           </button>
           {categories.map(cat => (
             <button 
               key={cat}
               className={cn(
                  "rounded-xl px-6 font-black h-12 text-xs transition-all shadow-sm flex items-center gap-2 uppercase tracking-wide min-w-max",
                  selectedCategory === cat 
                    ? "bg-patagonia-600 text-white shadow-patagonia-500/20" 
                    : "bg-card text-muted-foreground border border-border hover:bg-background"
               )}
               onClick={() => setSelectedCategory(cat)}
             >
               {getCategoryIcon(cat)} {cat}
             </button>
           ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredProducts.map(p => (
              <ProductCard key={p.id} p={p} onClick={handleProductClick} />
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-400">
                <PackageOpen className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-bold">Sin resultados</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. RIGHT SIDEBAR (Cart / Checkout) */}
      <div className="w-full max-w-[420px] bg-card flex flex-col border-l border-border shrink-0 shadow-2xl relative hidden lg:flex">
        
        {/* Cart Header */}
        <div className="p-6 flex items-center justify-between border-b border-border">
           <div className="flex items-center gap-3">
              <motion.div 
                animate={isCartBouncing ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.3 }}
                className="w-10 h-10 bg-patagonia-500/20 rounded-xl flex items-center justify-center"
              >
                 <ShoppingCart className="w-5 h-5 text-patagonia-400" />
              </motion.div>
              <h2 className="text-xl font-black text-foreground dark:text-white tracking-tight">Ticket Venta</h2>
           </div>
           
           <div className="flex items-center gap-1">
              <div className="flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => { clearPos(); toast.success('Nueva Venta Iniciada'); }}
                  className="w-10 h-10 p-0 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all group"
                  title="Nueva Venta"
                >
                   <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Button>
                <span className="text-[7px] font-black uppercase text-muted-foreground tracking-tighter mt-1">Nueva</span>
              </div>

              <div className="flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setViewQuickAdd(true)}
                  className="w-10 h-10 p-0 rounded-xl bg-patagonia-500/20 text-patagonia-400 hover:bg-blue-500 hover:text-white transition-all group"
                  title="Teclado Numérico"
                >
                   <Calculator className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Button>
                <span className="text-[7px] font-black uppercase text-muted-foreground tracking-tighter mt-1">Numpad</span>
              </div>

              <div className="flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                     if (items.length > 0) {
                        suspendCurrentOrder();
                        toast.success('Carrito guardado en espera');
                     } else {
                        toast.error('El carrito está vacío');
                     }
                  }}
                  className="w-10 h-10 p-0 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all group"
                  title="Pausar Venta Actual"
                >
                   <Archive className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </Button>
                <span className="text-[7px] font-black uppercase text-muted-foreground tracking-tighter mt-1">Guardar</span>
              </div>

              <div className="flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => setViewSuspended(!viewSuspended)}
                  className={cn(
                     "w-10 h-10 p-0 rounded-xl transition-all relative group",
                     viewSuspended ? "bg-amber-500 text-white" : "bg-muted text-muted-foreground hover:text-white hover:bg-muted"
                  )}
                  title="Ver Tickets en Pausa"
                >
                   <History className="w-5 h-5 group-hover:scale-110 transition-transform" />
                   {suspendedOrders.length > 0 && (
                     <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-bounce">
                        {suspendedOrders.length}
                     </span>
                   )}
                </Button>
                <span className="text-[7px] font-black uppercase text-muted-foreground tracking-tighter mt-1">En Espera</span>
              </div>

              <div className="flex flex-col items-center">
                <Button 
                  variant="ghost" 
                  onClick={() => { clearPos(); toast.success('Carrito Limpiado'); }}
                  className="w-10 h-10 p-0 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                  title="Borrar Carrito"
                >
                   <Trash2 className="w-5 h-5" />
                </Button>
                <span className="text-[7px] font-black uppercase text-muted-foreground tracking-tighter mt-1">Borrar</span>
              </div>
            </div>
        </div>

        {/* Customer Selection */}
        <div className="px-6 py-4 border-b border-border">
           <button 
             onClick={() => setIsCustomerModalOpen(true)}
             className="w-full p-4 bg-muted hover:bg-muted border border-border rounded-2xl flex items-center gap-4 transition-all text-left group"
           >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                customerRut ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "bg-patagonia-600/40 border-patagonia-600/50 text-white"
              )}>
                 <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                 <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest group-hover:text-patagonia-400 transition-colors">Cliente Registrado</p>
                 <p className="text-foreground dark:text-white font-bold truncate">{customerName || 'Público General'}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-white" />
           </button>
        </div>

        {/* Cart Items Area */}
        {!viewSuspended ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-2">
               {items.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-white/20 gap-4 opacity-50">
                    <ShoppingCart className="w-20 h-20" />
                    <p className="font-black text-xs uppercase tracking-[0.3em]">Carrito Vacío</p>
                 </div>
               ) : (
                 items.map((item) => (
                    <div key={item.product.id} className="pos-card-glass p-3 rounded-2xl border-slate-100 dark:border-slate-800/50 hover:border-patagonia-600/30 transition-all group animate-in slide-in-from-right-4 duration-300">
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0 pr-3">
                             <p className="text-[8px] font-black text-patagonia-600 dark:text-patagonia-400 uppercase tracking-[0.2em] mb-0.5">
                                {typeof item.product.category === 'string' ? item.product.category : (item.product.category as { name?: string })?.name || 'GENÉRICO'}
                             </p>
                             <p className="text-slate-900 dark:text-white font-black leading-tight text-sm group-hover:text-patagonia-600 transition-colors uppercase tracking-tighter line-clamp-2">{item.product.name}</p>
                          </div>
                          <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter whitespace-nowrap">{formatPrice(item.product.price * item.quantity)}</p>
                       </div>
                       <div className="flex items-center justify-between gap-3">
                          {item.product.unit === 'kg' ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-patagonia-600/10 rounded-xl border-2 border-patagonia-600/20 shadow-inner">
                              <Monitor className="w-4 h-4 text-patagonia-600" />
                              <span className="text-sm font-black text-patagonia-600 tracking-tight">{item.quantity.toFixed(3)} KG</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl p-1 border border-slate-200/50 dark:border-slate-800">
                              <button 
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm hover:text-rose-500 transition-all active:scale-90"
                              ><Minus className="w-4 h-4" /></button>
                              <span className="w-8 text-center text-slate-900 dark:text-white font-black text-base tracking-tighter">{item.quantity}</span>
                              <button 
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm hover:text-emerald-500 transition-all active:scale-90"
                              ><Plus className="w-4 h-4" /></button>
                            </div>
                          )}
                          
                          <button 
                            onClick={() => handleProtectedRemove(item.product.id, item.product.name)}
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-rose-500/70 bg-rose-500/10 border border-rose-500/20 hover:text-white hover:bg-rose-500 hover:scale-105 transition-all active:scale-95 shadow-sm"
                            title="Eliminar Producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                 ))
               )}
            </div>

            {/* Loyalty Redemption Zone */}
            {customerRut && items.length > 0 && settings.loyaltyEnabled && (
              <div className="px-6 py-4 bg-amber-500/5 border-t border-amber-500/10">
                 <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-widest flex items-center gap-1"><Award className="w-3.5 h-3.5"/> Canje de Puntos</span>
                    <span className="text-xs font-black text-amber-400">Max: {customerPoints || 0}</span>
                 </div>
                 <div className="flex gap-2">
                    <select 
                      className="flex-1 bg-background dark:bg-muted border border-border rounded-xl text-foreground dark:text-white font-black text-xs h-10 px-3 outline-none focus:ring-2 focus:ring-amber-500/50"
                      value={pointsRedeemed}
                      onChange={(e) => setPointsRedeemed(parseInt(e.target.value))}
                    >
                       <option value={0}>0 Puntos</option>
                       {Array.from({ length: Math.floor((customerPoints || 0) / (settings.loyalty?.redemptionMultiple || 100)) }, (_, i) => (i + 1) * (settings.loyalty?.redemptionMultiple || 100)).map(p => (
                         <option key={p} value={p}>{p} Puntos (-{formatPrice(p * (settings.loyalty?.redemptionRate || 1))})</option>
                       ))}
                    </select>
                 </div>
              </div>
            )}

            {/* Order Totals (Fixed Bottom) */}
             <div className="p-5 bg-muted border-t border-border space-y-4">
                <div className="space-y-1 px-2">
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>Neto</span>
                      <span>{formatPrice(Math.round(subtotal / 1.19))}</span>
                   </div>
                   <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <span>IVA (19%)</span>
                      <span>{formatPrice(subtotal - Math.round(subtotal / 1.19))}</span>
                   </div>
                   {pointsRedeemed > 0 && (
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-amber-400">
                        <span>Puntos</span>
                        <span>-{formatPrice(pointsRedeemed * (settings.loyalty?.redemptionRate || 1))}</span>
                     </div>
                   )}
                </div>

                <div className="flex justify-between items-end px-2">
                   <div className="flex flex-col">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">Total Final</span>
                      <span className="text-4xl font-black text-foreground dark:text-white tracking-tighter leading-none">{formatPrice(total)}</span>
                   </div>
                   <div className="text-right">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-1">Ganas</span>
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold text-xs leading-none">+{pointsToEarn} pts</p>
                   </div>
                </div>

                <Button 
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={items.length === 0 || isProcessing}
                  className="w-full h-16 text-xl bg-patagonia-600 hover:bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-patagonia-500/20 flex items-center justify-center gap-3 group transition-all active:scale-[0.98] relative overflow-hidden"
                >
                   <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                   {isProcessing ? (
                     <Loader2 className="w-6 h-6 animate-spin" />
                   ) : (
                     <>
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
                           <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <span className="uppercase tracking-tight">Cobrar Ahora</span>
                     </>
                   )}
                </Button>
             </div>
          </>
       ) : (
          /* Suspended Orders View */
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
             <h3 className="text-amber-500 font-black text-xs uppercase tracking-widest mb-6 px-2">Ticket en Pausa ({suspendedOrders.length})</h3>
             {suspendedOrders.map(order => (
                <div key={order.id} className="pos-card-glass p-6 rounded-3xl mb-4 border-amber-500/20">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Ticket #{order.id.slice(-6)}</p>
                         <p className="text-3xl font-black text-white">{formatPrice(order.total)}</p>
                      </div>
                      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                         <PauseCircle className="w-5 h-5 text-amber-500" />
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <Button 
                        onClick={() => { resumeOrder(order.id); setViewSuspended(false); }}
                        className="flex-1 h-12 bg-white text-foreground hover:bg-slate-200 rounded-2xl font-black"
                      >
                         RETOMAR
                      </Button>
                      <Button 
                        variant="ghost"
                        onClick={() => removeSuspendedOrder(order.id)}
                        className="w-12 h-12 p-0 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl"
                      >
                         <Trash2 className="w-5 h-5" />
                      </Button>
                   </div>
                </div>
             ))}
          </div>
        )}
      </div>

      {/* MODALS */}
      <CustomerModal 
        isOpen={isCustomerModalOpen} 
        onClose={() => setIsCustomerModalOpen(false)} 
      />

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        onConfirm={handleCheckout} 
      />

      <DailyClosureModal 
        isOpen={viewClosure} 
        onClose={() => setViewClosure(false)}
        sales={salesHistory}
      />

      {weightModalProduct && (
        <WeightInputModal
          isOpen={!!weightModalProduct}
          product={weightModalProduct}
          onConfirm={handleWeightConfirm}
          onClose={() => setWeightModalProduct(null)}
        />
      )}

      {/* Other Utility Modals */}
      <SalesHistoryModal isOpen={viewHistory} onClose={() => setViewHistory(false)} sales={salesHistory} onReprint={setReceiptData} />
      <PosSettingsModal isOpen={viewSettings} onClose={() => setViewSettings(false)} />
      <CashMovementModal isOpen={viewMovements} onClose={() => setViewMovements(false)} onSuccess={setActiveMovement} />
      <MovementReceiptModal isOpen={!!activeMovement} onClose={() => setActiveMovement(null)} movement={activeMovement} />
      <ManagerPinModal isOpen={!!pinAction} onClose={() => setPinAction(null)} onSuccess={() => { pinAction?.onConfirm(); setPinAction(null); }} actionDisplayName={pinAction?.name || ''} />
      <PosReceiptModal isOpen={!!receiptData} onClose={() => setReceiptData(null)} orderData={receiptData} />
      
      <QuickAddModal 
        isOpen={viewQuickAdd} 
        onClose={() => setViewQuickAdd(false)} 
        onConfirm={(name: string, price: number) => {
          addGenericItem(name, price);
          setViewQuickAdd(false);
          toast.success(`'${name}' añadido al carrito`);
        }} 
      />

      <BranchSelectionModal 
        isOpen={isBranchModalOpen}
        branches={branches}
        onSelect={(id) => {
          setSelectedBranchId(id);
          setIsBranchModalOpen(false);
          toast.success('Sucursal actualizada');
        }}
      />

      <AnimatePresence>
        {flyingItems.map(item => (
          <FlyingItem 
            key={item.id} 
            x={item.x} 
            y={item.y} 
            onComplete={() => handleParticleComplete(item.id)} 
          />
        ))}
      </AnimatePresence>
        </>
      )}
    </div>
  )
}
