'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, ShoppingCart, User, Plus, Minus, Trash2, 
  CreditCard, Banknote, History, PauseCircle, PlayCircle, 
  Loader2, Settings, ShieldAlert, LogOut, Terminal, AlertTriangle,
  Award
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePosStore } from '@/stores/posStore'
import { formatPrice, cn } from '@/lib/utils'
import { getProducts } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'
import { PosReceiptModal } from '@/components/pos/PosReceiptModal'
import { WeightInputModal } from '@/components/pos/WeightInputModal'
import { SalesHistoryModal } from '@/components/pos/SalesHistoryModal'
import { DailyClosureModal } from '@/components/pos/DailyClosureModal'
import { PosSettingsModal } from '@/components/pos/PosSettingsModal'
import { ManagerPinModal } from '@/components/pos/ManagerPinModal'
import { CashOpeningModal } from '@/components/pos/CashOpeningModal'
import CustomerModal from '@/components/pos/CustomerModal'
import { Product } from '@/types'
import { OrderRecord, CashMovement } from '@/stores/posStore'
import { PosSidebar } from '@/components/pos/PosSidebar'
import { PosHeader } from '@/components/pos/PosHeader'
import { OfflineSyncManager } from '@/components/pos/OfflineSyncManager'
import { CashMovementModal } from '@/components/pos/CashMovementModal'
import { MovementReceiptModal } from '@/components/pos/MovementReceiptModal'

export default function PosTerminal() {
  const { 
    items, totalItems, total, subtotal, addItem, updateQuantity, removeItem, clearPos, 
    customerRut, customerName, customerPoints, pointsToEarn, setCustomer, suspendCurrentOrder, resumeOrder, removeSuspendedOrder, suspendedOrders,
    inventory, setInventory, processCheckoutStock, salesHistory, addSale, isTrainingMode, setTrainingMode,
    currentUser, setCurrentUser, settings, cashSession, setCashSession
  } = usePosStore()
  
  const [search, setSearch] = useState('')
  const [viewSuspended, setViewSuspended] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any | null>(null)
  const [pointsToRedeem, setPointsToRedeem] = useState(0)
  const [isRedeeming, setIsRedeeming] = useState(false)
  
  // Advanced POS States
  const [showFastTender, setShowFastTender] = useState(false)
  const [changeToGive, setChangeToGive] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | 'Todos'>('Todos')
  
  const [viewHistory, setViewHistory] = useState(false)
  const [viewClosure, setViewClosure] = useState(false)
  const [viewSettings, setViewSettings] = useState(false)
  const [viewMovements, setViewMovements] = useState(false)
  const [activeMovement, setActiveMovement] = useState<CashMovement | null>(null)
  const [pinAction, setPinAction] = useState<{ name: string, onConfirm: () => void } | null>(null)
  
  const [weightModalProduct, setWeightModalProduct] = useState<Product | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  
  useEffect(() => {
    setIsHydrated(true)
    getProducts().then(res => {
      if (res && res.length > 0) {
        setInventory(res)
      }
    }).catch(() => {
      console.warn('[POS] No se pudo sincronizar con Supabase, usando inventario local.')
    })
  }, [])
  
  const categories = Array.from(new Set(inventory.map(p => typeof p.category === 'string' ? p.category : p.category?.name || 'Otro'))).filter(Boolean)

  const filteredProducts = inventory.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const catName = typeof p.category === 'string' ? p.category : p.category?.name || 'Otro';
    const matchesCategory = selectedCategory === 'Todos' || catName === selectedCategory;
    return matchesSearch && matchesCategory;
  })

  const pointValue = settings?.loyalty?.redemptionRate || 1
  const pointsDiscount = pointsToRedeem * pointValue
  const finalTotal = Math.max(0, total - pointsDiscount)

  // -- BARCODE SCANNER ENGINE --
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow humans to type in the search bar normally without triggering this
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const currentTime = Date.now();
      
      // Fast typing heuristic -> Barcode scanners type 13 digits in ~20-50ms
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = '';
      }

      if (e.key === 'Enter' && barcodeBuffer.length > 3) {
        e.preventDefault();
        const found = inventory.find(p => p.barcode === barcodeBuffer || p.sku === barcodeBuffer);
        
        if (found) {
           if (found.unit === 'kg') {
             setWeightModalProduct(found);
           } else {
             usePosStore.getState().addItem(found);
             toast.success(`${found.name} Escaneado ✅`);
           }
        } else {
           toast.error('Scanner: Código no encontrado (' + barcodeBuffer + ')');
        }
        barcodeBuffer = '';
        return;
      }

      if (e.key.length === 1 && /[0-9A-Za-z]/.test(e.key)) {
        barcodeBuffer += e.key;
      }
      
      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inventory]);

  // -- FAST TENDER HEURISTICS --
  const getQuickTenderOptions = (amount: number) => {
    if (amount <= 0) return [];
    const opts = new Set<number>();
    opts.add(amount); // Exact
    if (amount < 2000) opts.add(2000);
    if (amount < 5000) opts.add(5000);
    if (amount < 10000) opts.add(10000);
    if (amount < 20000) opts.add(20000);
    
    // Nearest round thousand
    const roundedThousand = Math.ceil(amount / 1000) * 1000;
    if (roundedThousand > amount && roundedThousand <= 20000) opts.add(roundedThousand);
    
    return Array.from(opts).sort((a,b) => a - b).slice(0, 4);
  }

  const handleCheckout = async (paymentMethod: 'EFECTIVO' | 'TARJETA' | 'PUNTOS') => {
    setIsProcessing(true);
    try {
      if (paymentMethod === 'TARJETA') {
        toast.info('Esperando Terminal Transbank...');
        await new Promise(r => setTimeout(r, 1500));
      }
      
      const isOnline = navigator.onLine;
      const temporalId = `OFFLINE-${Date.now()}`;
      
      const orderProof = {
        id: isOnline ? `EXT-${Math.floor(Math.random()*1000000)}` : temporalId,
        orderId: isOnline ? `EXT-${Math.floor(Math.random()*1000000)}` : temporalId,
        items: [...items],
        subtotal,
        total: finalTotal,
        discount: pointsDiscount,
        pointsToEarn: Math.floor(finalTotal / (settings?.loyalty?.accumulationRate || 100)),
        pointsRedeemed: pointsToRedeem,
        customerRut,
        customerName,
        customerPoints: (customerPoints || 0) - pointsToRedeem + Math.floor(finalTotal / (settings?.loyalty?.accumulationRate || 100)),
        date: new Date().toLocaleString('es-CL'),
        paymentMethod,
        isOffline: !isOnline,
        timestamp: Date.now()
      };

      // 1. Sincronizar con Supabase si no estamos en modo entrenamiento
      if (!isTrainingMode) {
        if (isOnline) {
          try {
            const orderBody = {
              user_id: currentUser?.id || '1',
              register_id: cashSession?.terminal_id ?? null,
              total: finalTotal,
              discount: pointsDiscount,
              payment_method: paymentMethod,
              status: 'completed',
              payment_status: 'completed',
              customer_rut: customerRut,
              items: items.map(item => ({
                productId: item.product.id,
                quantity: item.quantity,
                unitPrice: item.product.price
              }))
            };

            const response = await fetch('/api/orders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderBody)
            });

            if (!response.ok) throw new Error('Error al guardar en la nube');
            
            // 2. Actualizar puntos si hay cliente vinculado
            if (customerRut) {
              const accumulationRate = settings?.loyalty?.accumulationRate || 100;
              const earnedPoints = Math.floor(finalTotal / accumulationRate);
              const netoPoints = (customerPoints || 0) - pointsToRedeem + earnedPoints;
              
              await fetch('/api/customers', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ 
                      rut: customerRut, 
                      name: customerName, 
                      points: netoPoints 
                  })
              });
              if (earnedPoints > 0) toast.success(`+${earnedPoints} puntos acumulados`);
              if (pointsToRedeem > 0) toast.info(`${pointsToRedeem} puntos canjeados`);
            }

            toast.success('Venta Sincronizada ✅');
          } catch (apiError) {
            console.warn('[POS] API Error, falling back to offline queue:', apiError);
            usePosStore.getState().queueOrderForSync(orderProof);
            toast.warning('Onda de red: Enviado a cola oculta (SII en espera)');
          }
        } else {
            // Literally offline
            usePosStore.getState().queueOrderForSync(orderProof);
            toast.warning('Caja Desconectada: Guardado en cola local segura.');
        }
      }
      
      setReceiptData(orderProof);
      addSale(orderProof);

      processCheckoutStock();
      clearPos();
      
      if (isTrainingMode) {
        toast.info('Modo Entrenamiento: Venta no registrada.');
      }
    } catch (error) {
      toast.error('Error procesando el pago');
    } finally {
      setIsProcessing(false);
    }
  }

  const handleProductClick = (p: Product) => {
    if (p.unit === 'kg') {
      setWeightModalProduct(p)
    } else {
      addItem(p)
      toast.success(`${p.name} al ticket`, {duration: 1000})
    }
  }

  const handleWeightConfirm = (weight: number) => {
    if (weightModalProduct) {
      addItem(weightModalProduct, weight)
      toast.success(`${weightModalProduct.name} (${weight}kg) al ticket`)
      setWeightModalProduct(null)
    }
  }

  const handleReprint = (sale: any) => {
    setReceiptData({
      ...sale,
      date: new Date(sale.timestamp).toLocaleString('es-CL'),
    });
    toast.info(`Re-imprimiendo ticket #${sale.id}`);
  }

  const handleMovementSuccess = (mov: CashMovement) => {
    setViewMovements(false);
    setActiveMovement(mov);
  }

  const handleProtectedRemove = (productId: string, productName: string) => {
    if (settings.pinRequiredForDelete) {
        setPinAction({
            name: `Anulación: ${productName}`,
            onConfirm: () => removeItem(productId)
        });
    } else {
        removeItem(productId);
    }
  }

  const toggleRole = () => {
    const isCurrentlyAdmin = currentUser?.role === 'admin';
    setCurrentUser({
        ...currentUser!,
        role: (isCurrentlyAdmin ? 'cashier' : 'admin') as any
    });
    toast.info(`Rol: ${isCurrentlyAdmin ? 'Cajero' : 'Administrador'}`);
  }

  if (!isHydrated) return null;

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      
      <PosSidebar 
        onShowHistory={() => setViewHistory(true)}
        onShowClosure={() => setViewClosure(true)}
        onShowSettings={() => setViewSettings(true)}
        onShowMovements={() => setViewMovements(true)}
      />

      <main className="flex-1 flex flex-col min-w-0 relative">
        <OfflineSyncManager />
        {isTrainingMode && (
          <div className="bg-orange-500 text-white px-6 py-2 flex items-center justify-center gap-3 z-[40]">
             <AlertTriangle className="w-5 h-5 animate-pulse" />
             <p className="text-sm font-black uppercase tracking-widest italic">Sesión de Entrenamiento Práctica</p>
          </div>
        )}

        <PosHeader 
          search={search}
          onSearchChange={setSearch}
          onToggleRole={toggleRole}
        />

        <div className="flex-1 flex min-w-0 overflow-hidden">
            {/* CATALOG */}
            <div className="flex-1 flex flex-col p-6 bg-gray-50/50 overflow-y-auto custom-scrollbar relative">
                
                {/* CATEGORIES STRIP */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar shrink-0">
                  <Button 
                    className={cn("rounded-full font-black whitespace-nowrap shadow-sm", selectedCategory === 'Todos' ? "bg-corporate-blue text-white hover:bg-corporate-dark" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-corporate-blue")}
                    onClick={() => setSelectedCategory('Todos')}
                  >
                    Todos
                  </Button>
                  {categories.map(cat => (
                    <Button 
                      key={cat} 
                      className={cn("rounded-full font-black whitespace-nowrap shadow-sm", selectedCategory === cat ? "bg-corporate-blue text-white hover:bg-corporate-dark" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-corporate-blue")}
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-20">
                    {filteredProducts.map(p => (
                    <button 
                        key={p.id}
                        onClick={() => handleProductClick(p)}
                        className="bg-white rounded-[2rem] p-5 shadow-sm hover:shadow-2xl border-2 border-transparent hover:border-corporate-blue/30 transition-all text-left flex flex-col aspect-square active:scale-95 group relative overflow-hidden"
                    >
                        <div className="flex-1 w-full bg-gray-50 rounded-2xl mb-4 overflow-hidden relative border border-gray-100/50">
                          <img 
                            src={p.image || 'https://images.unsplash.com/photo-1540340334550-971ef971b6ad?w=500&q=80'} 
                            alt={p.name} 
                            className="w-full h-full object-cover mix-blend-multiply group-hover:scale-110 transition-transform duration-500" 
                          />
                          <div className={cn(
                              "absolute bottom-3 right-3 px-3 py-1 rounded-xl text-[10px] font-black z-10 shadow-lg",
                              p.stock <= p.lowStockThreshold ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-900/80 text-white'
                          )}>
                              {p.stock} {p.unit}
                          </div>
                        </div>
                        <div className="space-y-1">
                            <p className="font-extrabold text-[#2d3748] group-hover:text-corporate-blue transition-colors truncate">{p.name}</p>
                            <p className="font-black text-2xl text-corporate-blue">{formatPrice(p.price)}</p>
                        </div>
                    </button>
                    ))}
                </div>
            </div>
      
            {/* CART PANEL */}
            <div className={cn(
              "w-[480px] flex flex-col bg-white border-l border-gray-100 shadow-[-10px_0_40px_rgba(0,0,0,0.03)] z-10 relative overflow-hidden transition-all duration-300",
              isTrainingMode ? "bg-orange-50/10" : ""
            )}>
              <div className="flex-1 flex flex-col relative z-10">
                {/* CART HEADER */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between shadow-sm bg-white">
                  {!viewSuspended ? (
                    <div className="flex flex-col flex-1 mr-2">
                       <Button 
                         variant="ghost" 
                         onClick={() => setIsCustomerModalOpen(true)}
                         className={cn(
                           "h-11 justify-start px-3 gap-3 rounded-xl border transition-all",
                           customerRut 
                             ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" 
                             : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                         )}
                       >
                         {customerRut ? (
                           <>
                             <div className="w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
                               <User className="w-4 h-4" />
                             </div>
                             <div className="text-left overflow-hidden">
                               <p className="text-[10px] font-black uppercase leading-none opacity-60">Cliente vinculado</p>
                               <p className="font-bold text-sm truncate">{customerName}</p>
                             </div>
                             <div className="ml-auto bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-black text-emerald-600">
                               {customerPoints} pts
                             </div>
                           </>
                         ) : (
                           <>
                             <User className="h-5 w-5 opacity-40" />
                             <span className="text-sm font-bold">Identificar Cliente...</span>
                           </>
                         )}
                       </Button>
                    </div>
                  ) : (
                    <div className="flex-1 text-lg font-bold text-corporate-blue truncate">Colas Suspendidas</div>
                  )}
                  <Button variant="ghost" onClick={() => setViewSuspended(!viewSuspended)} className="font-bold">
                    {viewSuspended ? 'Volver' : 'En Espera'}
                  </Button>
                </div>

                {/* LOYALTY REDEMPTION BAR */}
                {!viewSuspended && customerRut && (
                  <div className={cn(
                    "px-4 py-2 flex items-center justify-between border-b transition-all",
                    isRedeeming ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-100"
                  )}>
                    <div className="flex items-center gap-2">
                      <Award className={cn("w-4 h-4", isRedeeming ? "text-amber-600" : "text-gray-400")} />
                      <span className="text-[10px] font-black uppercase text-gray-500">Canje de Puntos</span>
                    </div>
                    
                    {usePosStore.getState().isFullAccount && usePosStore.getState().identityVerified ? (
                      <div className="flex items-center gap-2">
                        {isRedeeming ? (
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              max={customerPoints} 
                              className="h-7 w-20 text-xs font-black rounded-lg" 
                              value={pointsToRedeem}
                              onChange={(e) => {
                                const val = Math.min(Number(e.target.value), customerPoints || 0)
                                const maxPointsForTotal = Math.ceil(total / pointValue)
                                setPointsToRedeem(Math.min(val, maxPointsForTotal))
                              }}
                            />
                            <Button size="sm" variant="ghost" className="h-7 text-[10px] font-black text-rose-500" onClick={() => { setIsRedeeming(false); setPointsToRedeem(0); }}>Quitar</Button>
                          </div>
                        ) : (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-[10px] font-black border-amber-200 text-amber-700 bg-white hover:bg-amber-50"
                            onClick={() => setIsRedeeming(true)}
                          >
                            Usar Puntos
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-[8px] font-black text-rose-500 uppercase bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                        Requiere Registro Web + ID
                      </span>
                    )}
                  </div>
                )}
                
                {/* CART BODY */}
                {!viewSuspended ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fbfa] custom-scrollbar">
                      {items.map(item => (
                        <div key={item.product.id} className="p-3 bg-white border border-gray-100 shadow-sm rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-bold text-[15px] text-gray-800">{item.product.name}</p>
                            <button onClick={() => handleProtectedRemove(item.product.id, item.product.name)} className="text-gray-300 hover:text-red-500"><Trash2 className="h-5 w-5"/></button>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                              <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-2"><Minus className="h-4 w-4"/></button>
                              <span className="font-mono font-black w-8 text-center">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-2"><Plus className="h-4 w-4"/></button>
                            </div>
                            <p className="font-extrabold text-lg">{formatPrice(item.product.price * item.quantity)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-6 bg-white border-t border-gray-100">
                      <div className="flex justify-between items-end mb-6">
                        <div className="flex flex-col">
                          {pointsDiscount > 0 && <span className="text-[10px] font-black text-amber-600">AHORRO PUNTOS: -{formatPrice(pointsDiscount)}</span>}
                          <span className="text-gray-500 font-bold">TOTAL</span>
                        </div>
                        <span className="text-4xl font-black text-corporate-blue">{formatPrice(finalTotal)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 relative">
                        {/* FAST TENDER OVERLAY */}
                        {showFastTender ? (
                          <div className="absolute inset-0 bg-white grid grid-cols-2 gap-2 z-20">
                            {getQuickTenderOptions(finalTotal).map(opt => (
                               <Button key={opt} onClick={() => {
                                 const change = opt - finalTotal;
                                 if (change > 0) toast.error(`ENTREGAR VUELTO: ${formatPrice(change)}`, { duration: 8000, position: 'top-center' });
                                 setShowFastTender(false);
                                 handleCheckout('EFECTIVO');
                               }} className={cn("h-16 text-lg font-black rounded-2xl text-white", opt === finalTotal ? "bg-emerald-600" : "bg-emerald-400 hover:bg-emerald-500")}>
                                 {opt === finalTotal ? 'Monto Exacto' : formatPrice(opt)}
                               </Button>
                            ))}
                            <Button variant="outline" className="col-span-2 text-gray-400 h-8 mt-[-8px]" onClick={() => setShowFastTender(false)}>Volver a metódos</Button>
                          </div>
                        ) : null}

                        {/* STANDARD CHECKOUT BUTTONS */}
                        <Button onClick={() => setShowFastTender(true)} disabled={items.length === 0 || isProcessing} className="h-16 text-xl bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black disabled:opacity-50">
                            {isProcessing ? <Loader2 className="animate-spin" /> : 'Efectivo'}
                        </Button>
                        <Button onClick={() => handleCheckout('TARJETA')} disabled={items.length === 0 || isProcessing} className="h-16 text-xl bg-corporate-blue hover:bg-corporate-dark text-white rounded-2xl font-black disabled:opacity-50">
                            {isProcessing ? <Loader2 className="animate-spin" /> : 'Tarjeta'}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 p-4 bg-gray-50">
                    {suspendedOrders.map(order => (
                      <div key={order.id} className="bg-white p-4 rounded-xl mb-4 border border-gray-200">
                         <p className="font-bold truncate">Ticket #{order.id.slice(-6)}</p>
                         <p className="text-2xl font-black text-corporate-blue mt-2">{formatPrice(order.total)}</p>
                         <Button onClick={() => { resumeOrder(order.id); setViewSuspended(false); }} className="w-full mt-4 bg-corporate-blue text-white">Retomar</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
        </div>
      </main>

      {isHydrated && (
        <CashOpeningModal 
          isOpen={!cashSession}
          cashierName={currentUser?.firstName || 'Cajero'}
          onSessionOpened={(session) => setCashSession(session)}
          onResumeSession={(session) => setCashSession(session)}
        />
      )}
      <PosReceiptModal isOpen={!!receiptData} onClose={() => setReceiptData(null)} orderData={receiptData} />
      <WeightInputModal isOpen={!!weightModalProduct} onClose={() => setWeightModalProduct(null)} onConfirm={handleWeightConfirm} product={weightModalProduct} />
      <SalesHistoryModal isOpen={viewHistory} onClose={() => setViewHistory(false)} sales={salesHistory} onReprint={handleReprint} />
      <DailyClosureModal isOpen={viewClosure} onClose={() => setViewClosure(false)} sales={salesHistory} />
      <PosSettingsModal isOpen={viewSettings} onClose={() => setViewSettings(false)} />
      <CashMovementModal 
        isOpen={viewMovements} 
        onClose={() => setViewMovements(false)} 
        onSuccess={handleMovementSuccess}
      />
      <MovementReceiptModal 
        isOpen={!!activeMovement} 
        onClose={() => setActiveMovement(null)} 
        movement={activeMovement} 
      />
      <ManagerPinModal isOpen={!!pinAction} onClose={() => setPinAction(null)} onSuccess={() => { pinAction?.onConfirm(); setPinAction(null); }} actionDisplayName={pinAction?.name || ''} />
      <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} />
    </div>
  )
}
