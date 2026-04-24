'use client'

import React, { useEffect, useRef } from 'react'
import { usePosStore } from '@/stores/posStore'
import { toast } from 'sonner'

export function OfflineSyncManager() {
  const isSyncing = useRef(false)

  useEffect(() => {
    // Escuchar el evento cuando vuelve el internet de forma natural
    const handleOnline = () => {
      syncPendingOrders()
    }
    
    window.addEventListener('online', handleOnline)
    
    // Y además tener un latido de seguridad cada 15 segundos
    const heartbeat = setInterval(() => {
      if (navigator.onLine) {
        syncPendingOrders()
      }
    }, 15000)

    return () => {
      window.removeEventListener('online', handleOnline)
      clearInterval(heartbeat)
    }
  }, [])

  const syncPendingOrders = async () => {
    const { pendingSyncOrders, removeOrderFromQueue, currentUser, cashSession, settings } = usePosStore.getState()
    
    if (pendingSyncOrders.length === 0 || isSyncing.current) return
    
    isSyncing.current = true
    
    // Mostramos un Toast discreto con ID para no spammar la pantalla si son varios
    const toastId = toast.loading(`Sincronizando ${pendingSyncOrders.length} pre-folios SII...`, { position: 'bottom-right' })

    let successCount = 0;
    
    // Procesamos 1 a 1 para no saturar Supabase ni la API SII
    for (const order of pendingSyncOrders) {
      try {
        // 1. Enviar a Supabase
        const orderBody = {
          userId: currentUser?.id || '1',
          registerId: cashSession?.terminal_id ?? null,
          total: order.total,
          discount: order.discount,
          paymentMethod: order.paymentMethod,
          status: 'completed',
          paymentStatus: 'completed',
          customerRut: order.customerRut,
          pointsToEarn: order.pointsToEarn,
          pointsRedeemed: order.pointsRedeemed,
          items: order.items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.price
          }))
        };

        const supRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderBody)
        });

        if (!supRes.ok) throw new Error('Fallo Supabase');
        
        // 2. Emitir Boleta Electrónica SII (Vía SimpleAPI/Mock)
        const siiRes = await fetch('/api/sii', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                amount: order.total, 
                customerRut: order.customerRut,
                items: order.items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.product.price }))
            })
        });
        
        if (siiRes.ok) {
           const siiData = await siiRes.json();
           console.log(`[OflineSync] Orden ${order.id} validada por SII con folio:`, siiData.folio);
        }
        
        // Si sobrevivió a ambas promesas, borramos de la cola
        removeOrderFromQueue(order.id);
        successCount++;
        
      } catch (err) {
        console.error(`[OfflineSync] Error subiendo orden ${order.id}`, err);
        // Dejamos de procesar si hubo error grave de red de nuevo para reintentar luego
        break; 
      }
    }
    
    isSyncing.current = false;
    
    if (successCount > 0) {
       toast.success(`Nube Actualizada: ${successCount} Boletas SII emitidas.`, { id: toastId });
    } else {
       toast.dismiss(toastId);
    }
  }

  return null; // Componente invisible, sin UI
}
