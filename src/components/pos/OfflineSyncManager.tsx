'use client'

import { useEffect, useRef } from 'react'
import { usePosStore } from '@/stores/posStore'
import { useSiiStore } from '@/stores/siiStore'
import { toast } from 'sonner'

export function OfflineSyncManager() {
  const isSyncing = useRef(false)

  const syncAllPending = async () => {
    if (isSyncing.current || !navigator.onLine) return
    
    const { pendingSyncOrders, currentUser, cashSession, removeOrderFromQueue } = usePosStore.getState()
    const { pendingQueue, removeFromQueue, updateAttempts, offlineFolioPool, refreshFolios } = useSiiStore.getState()
    
    // 0. Si el pool de folios está bajo (< 10), intentar refrescar antes de seguir
    const dteTypes = [33, 39, 41]; // Factura, Boleta, Boleta Exenta
    for (const tipo of dteTypes) {
      const pool = offlineFolioPool[tipo.toString()] || [];
      if (pool.length < 10) {
        await refreshFolios(tipo);
      }
    }

    if (pendingSyncOrders.length === 0 && pendingQueue.length === 0) return
    
    isSyncing.current = true
    const totalToSync = pendingSyncOrders.length + pendingQueue.length
    const toastId = toast.loading(`Sincronizando ${totalToSync} documentos con la nube...`, { position: 'bottom-right' })

    let successCount = 0;
    
    // 1. Procesar Órdenes Pendientes (Ventas que fallaron al subir)
    for (const order of pendingSyncOrders) {
      try {
        const orderBody = {
          userId: currentUser?.id || '1',
          registerId: cashSession?.terminal_id ?? null,
          total: order.total,
          discount: order.discount,
          paymentMethod: order.paymentMethod,
          customerRut: order.customerRut,
          items: order.items.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.product.price
          })),
          offlineId: order.id // Enviar ID local para evitar duplicados en DB
        };

        const supRes = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderBody)
        });

        if (supRes.ok) {
          removeOrderFromQueue(order.id);
          successCount++;
        }
      } catch (err) {
        console.warn(`[OfflineSync] Error subiendo orden ${order.id}`, err);
        break; 
      }
    }

    // 2. Procesar Cola SII (DTEs ya firmados o por emitir)
    const BASE_DELAY = 60000; // 1 minuto base
    
    for (const item of pendingQueue) {
      if (item.attempts >= 5) continue; 

      // Lógica de Backoff Exponencial
      if (item.lastAttempt) {
        const delay = Math.pow(2, item.attempts) * BASE_DELAY;
        if (Date.now() - item.lastAttempt < delay) {
          console.log(`[OfflineSync] Saltando ${item.id} (Backoff activo: ${Math.round((delay - (Date.now() - item.lastAttempt))/1000)}s restantes)`);
          continue;
        }
      }

      try {
        const res = await fetch('/api/sii/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        
        if (res.ok) {
          removeFromQueue(item.id);
          successCount++;
        } else {
          updateAttempts(item.id);
        }
      } catch (err) {
        console.warn(`[OfflineSync] Error subiendo boleta SII ${item.id}`, err);
        updateAttempts(item.id);
        // No rompemos el loop aquí para permitir que otros items (tal vez nuevos) se procesen
      }
    }
    
    isSyncing.current = false;
    
    if (successCount > 0) {
       toast.success(`Nube Sincronizada: ${successCount} documentos procesados.`, { id: toastId });
    } else {
       toast.dismiss(toastId);
    }
  }

  const syncCafs = async () => {
    try {
      const { setToken, refreshFolios, setFoliosDisponibles } = useSiiStore.getState();
      const { settings } = usePosStore.getState();

      // Fix 3: Verificar si SII está configurado antes de intentar sincronizar
      if (!settings?.sii?.enabled) {
        console.warn('[OfflineSync] SII no configurado, saltando sincronización de folios');
        setFoliosDisponibles(false);
        return;
      }
      
      // 1. Obtener Token de Sesión SII
      const tokenRes = await fetch('/api/sii/auth/token');
      if (tokenRes.ok) {
        const { token } = await tokenRes.json();
        if (token) setToken(token);
      }

      // 2. Refrescar pools de folios básicos si están vacíos
      const dteTypes = [39, 41]; 
      for (const tipo of dteTypes) {
        await refreshFolios(tipo);
      }

      // Si llegamos aquí y no hubo errores fatales (que tirarían al catch), 
      // asumimos que los folios están intentando sincronizarse o ya están listos.
      // Sin embargo, refreshFolios maneja su propio éxito/error.

    } catch (err) {
      console.warn('[OfflineSync] Error sincronizando CAFs/Tokens', err);
      const { setFoliosDisponibles } = useSiiStore.getState();
      setFoliosDisponibles(false);
    }
  }

  useEffect(() => {
    // Escuchar el evento cuando vuelve el internet de forma natural
    const handleOnline = () => {
      syncAllPending()
    }
    
    window.addEventListener('online', handleOnline)
    
    // Y además tener un latido de seguridad cada 30 segundos
    const heartbeat = setInterval(() => {
      if (navigator.onLine) {
        syncAllPending()
        syncCafs()
      }
    }, 30000)

    // Inicial
    if (navigator.onLine) syncCafs()

    return () => {
      window.removeEventListener('online', handleOnline)
      clearInterval(heartbeat)
    }
  }, [])

  return null;
}
