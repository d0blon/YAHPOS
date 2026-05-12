'use client';

import { useEffect, useCallback } from 'react';
import { useSiiStore } from '@/stores/siiStore';

export function SiiSyncManager() {
  const { pendingQueue, isSyncing, setSyncing, removeFromQueue, updateAttempts } = useSiiStore();

  const syncDocument = useCallback(async (item: any) => {
    try {
      // Intentar enviar a la API de emisión
      const response = await fetch('/api/sii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload)
      });

      if (response.ok) {
        removeFromQueue(item.id);
        console.log(`[SiiSync] Documento ${item.id} sincronizado exitosamente.`);
      } else {
        updateAttempts(item.id);
      }
    } catch (error) {
      console.error(`[SiiSync] Error sincronizando documento ${item.id}:`, error);
      updateAttempts(item.id);
    }
  }, [removeFromQueue, updateAttempts]);

  useEffect(() => {
    if (pendingQueue.length > 0 && !isSyncing && navigator.onLine) {
      const processQueue = async () => {
        setSyncing(true);
        // Procesar secuencialmente para evitar problemas de concurrencia con folios si no se reservaron
        for (const item of pendingQueue) {
          if (item.attempts < 5) {
            await syncDocument(item);
          }
        }
        setSyncing(false);
      };

      processQueue();
    }
  }, [pendingQueue, isSyncing, syncDocument, setSyncing]);

  // Monitorear cambios de conexión
  useEffect(() => {
    const handleOnline = () => {
      console.log('[SiiSync] Conexión restaurada. Intentando sincronizar...');
      // El useEffect de arriba se disparará por el cambio de dependencias si es necesario
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return null; // Componente sin UI
}
