'use client'

import { useEffect, useRef } from 'react'
import { usePosStore } from '@/stores/posStore'
import { useSiiStore } from '@/stores/siiStore'
import { getActiveStoreId } from '@/lib/tenant-state'
import { toast } from 'sonner'

export function OfflineSyncManager() {
  const isSyncing = useRef(false)

  const syncAllPending = async () => {
    if (isSyncing.current || !navigator.onLine) return
    
    const { pendingSyncOrders, currentUser, cashSession, removeOrderFromQueue } = usePosStore.getState()
    const { pendingQueue, removeFromQueue, updateAttempts, offlineFolioPool, refreshFolios } = useSiiStore.getState()
    
    // 0. Si el pool de folios está bajo (< 10), intentar refrescar antes de seguir.
    // El pool está indexado por `${storeId}:${tipo}`; sin tienda activa no se lee
    // ni se refresca nada (fail-closed, nunca folios de otra tienda).
    const storeId = getActiveStoreId()
    const dteTypes = [33, 39, 41]; // Factura, Boleta, Boleta Exenta
    if (storeId) {
      for (const tipo of dteTypes) {
        const pool = offlineFolioPool[`${storeId}:${tipo}`] || [];
        if (pool.length < 10) {
          await refreshFolios(tipo);
        }
      }
    }

    if (pendingSyncOrders.length === 0 && pendingQueue.length === 0) return
    
    isSyncing.current = true
    const totalToSync = pendingSyncOrders.length + pendingQueue.length
    const toastId = toast.loading(`Sincronizando ${totalToSync} documentos con la nube...`, { position: 'bottom-right' })

    let successCount = 0;

    const allKnownOrders = [...pendingSyncOrders, ...usePosStore.getState().salesHistory]
    const isVoucherOrder = (saleId: string) => {
      const order = allKnownOrders.find(o => o.id === saleId)
      return order?.siiDecision
        ? order.siiDecision.kind !== 'dte'
        : Boolean(order?.siiSkipped)
    }
    
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
          offlineId: order.id, // Enviar ID local para evitar duplicados en DB
          documentKind: isVoucherOrder(order.id) ? 'voucher' : 'dte',
          siiSkipReason: order.siiDecision?.kind === 'voucher' ? order.siiDecision.reason : undefined
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
      if (isVoucherOrder(item.id)) {
        console.error(`[OfflineSync] Descartando DTE ${item.id}: la venta es voucher interno (sin SII)`);
        removeFromQueue(item.id);
        continue;
      }

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
          const data = await res.json().catch(() => null);
          removeFromQueue(item.id);
          if (data?.documentId) {
            // La venta ya está en el historial local: sin esto el botón "PDF" del
            // recibo reimpreso no sabe qué documento pedir.
            usePosStore.getState().setSaleSiiDocument(item.id, data.documentId);
          }
          successCount++;
        } else if (res.status === 422) {
          // El DTE no se puede emitir con ese payload (formato viejo o datos
          // inválidos). Reintentarlo cada 30 s no lo arregla y traba la cola.
          console.error(`[OfflineSync] Descartando ${item.id}: payload no emitible`);
          removeFromQueue(item.id);
        } else if (res.status === 409) {
          // El servidor detectó que la orden es voucher: no reintentar.
          console.error(`[OfflineSync] Descartando ${item.id}: orden voucher (409)`);
          removeFromQueue(item.id);
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
      const { refreshFolios, setFoliosDisponibles } = useSiiStore.getState();

      // 1. Verificar que el certificado SII sea usable. El token nunca se
      // envía al navegador ni se persiste en IndexedDB.
      const tokenRes = await fetch('/api/sii/auth/token');
      if (!tokenRes.ok) {
        // Tienda sin SII configurado (404) u otro error — no hay folios que refrescar
        setFoliosDisponibles(false);
        return;
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
