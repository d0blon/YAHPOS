import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import type { DtePayload } from '@/lib/sii/types';
import { TENANT_MARKER_KEY, clearTenantState, createTenantStorage, getActiveStoreId, registerTenantResetHandler, registerTenantStoreSync } from '@/lib/tenant-state';

const storage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

function folioKey(storeId: string, tipoDte: number): string {
  return `${storeId}:${tipoDte}`;
}

function sanitizePool(input: unknown, storeId: string): Record<string, number[]> {
  const clean: Record<string, number[]> = {};
  if (!input || typeof input !== 'object') return clean;
  const prefix = `${storeId}:`;
  Object.entries(input as Record<string, unknown>).forEach(([key, value]) => {
    if (key.startsWith(prefix) && Array.isArray(value)) {
      clean[key] = value.filter((folio): folio is number => typeof folio === 'number');
    }
  });
  return clean;
}

export type SiiPayload = DtePayload;

interface SiiQueueItem {
  id: string;
  storeId: string;
  payload: SiiPayload;
  xml: string;
  timestamp: number;
  attempts: number;
  lastAttempt?: number;
}

interface SiiState {
  pendingQueue: SiiQueueItem[];
  offlineFolioPool: Record<string, number[]>;
  isSyncing: boolean;
  isOfflineMode: boolean;
  lastSync: number | null;
  foliosDisponibles: boolean;

  addToQueue: (item: Omit<SiiQueueItem, 'timestamp' | 'attempts'>) => void;
  removeFromQueue: (id: string) => void;
  updateAttempts: (id: string) => void;
  setFolioPool: (tipoDte: number, folios: number[]) => void;
  consumeFolio: (tipoDte: number) => number | null;
  setSyncing: (status: boolean) => void;
  setOfflineMode: (status: boolean) => void;
  clearQueue: () => void;
  refreshFolios: (tipoDte: number) => Promise<void>;
  setFoliosDisponibles: (val: boolean) => void;
  resetForStore: () => Promise<void>;
}

const initialSiiState = {
  pendingQueue: [] as SiiQueueItem[],
  offlineFolioPool: {} as Record<string, number[]>,
  isSyncing: false,
  isOfflineMode: false,
  lastSync: null as number | null,
  foliosDisponibles: true,
};

export const useSiiStore = create<SiiState>()(
  persist(
    (set, get) => ({
      ...initialSiiState,

      addToQueue: (item) => {
        const storeId = getActiveStoreId();
        if (!storeId || item.storeId !== storeId) return;
        set((state) => ({
          pendingQueue: [
            ...state.pendingQueue.filter((i) => i.storeId === storeId),
            { ...item, timestamp: Date.now(), attempts: 0 }
          ]
        }));
      },

      removeFromQueue: (id) => {
        const storeId = getActiveStoreId();
        if (!storeId) return;
        set((state) => ({
          pendingQueue: state.pendingQueue.filter((i) => i.storeId === storeId && i.id !== id)
        }));
      },

      updateAttempts: (id) => {
        const storeId = getActiveStoreId();
        if (!storeId) return;
        set((state) => ({
          pendingQueue: state.pendingQueue.map((i) =>
            i.storeId === storeId && i.id === id
              ? { ...i, attempts: i.attempts + 1, lastAttempt: Date.now() }
              : i
          )
        }));
      },

      setFolioPool: (tipoDte, folios) => {
        const storeId = getActiveStoreId();
        if (!storeId) return;
        const key = folioKey(storeId, tipoDte);
        set((state) => ({
          offlineFolioPool: { ...sanitizePool(state.offlineFolioPool, storeId), [key]: folios }
        }));
      },

      consumeFolio: (tipoDte) => {
        const storeId = getActiveStoreId();
        if (!storeId) return null;
        const key = folioKey(storeId, tipoDte);
        const pool = sanitizePool(get().offlineFolioPool, storeId)[key] || [];

        if (pool.length === 0) return null;

        const nextFolio = pool[0];
        const newPool = pool.slice(1);

        set((state) => ({
          offlineFolioPool: { ...sanitizePool(state.offlineFolioPool, storeId), [key]: newPool }
        }));

        if (newPool.length < 10) {
          get().refreshFolios(tipoDte).catch(err => console.warn(`[SiiStore] Error en auto-refresco: ${err}`));
        }

        return nextFolio;
      },

      refreshFolios: async (tipoDte) => {
        const storeId = getActiveStoreId();
        if (!storeId || get().isSyncing) return;

        try {
          const response = await fetch('/api/sii/folios/offline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipoDte, count: 50 })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.warn(`[SiiStore] Folios no disponibles: ${errData.error || response.statusText}`);
            return;
          }

          const data = await response.json();
          if (data.success) {
            const newFolios: number[] = [];
            for (let f = data.start; f <= data.end; f++) {
              newFolios.push(f);
            }

            const activeAfter = getActiveStoreId();
            if (!activeAfter || activeAfter !== storeId) return;

            set((state) => {
              const key = folioKey(storeId, tipoDte);
              const pool = sanitizePool(state.offlineFolioPool, storeId);
              const currentPool = pool[key] || [];
              const combinedPool = Array.from(new Set([...currentPool, ...newFolios])).sort((a, b) => a - b);

              return {
                offlineFolioPool: { ...pool, [key]: combinedPool }
              };
            });
          }
        } catch (e) {
          console.warn('[SiiStore] Error de red al refrescar folios:', e);
        }
      },

      setSyncing: (status) => set({ isSyncing: status }),

      setOfflineMode: (status) => set({ isOfflineMode: status }),

      clearQueue: () => {
        const storeId = getActiveStoreId();
        if (!storeId) return;
        set((state) => ({
          pendingQueue: state.pendingQueue.filter((i) => i.storeId !== storeId)
        }));
      },

      setFoliosDisponibles: (val) => set({ foliosDisponibles: val }),

      resetForStore: async () => {
        set({ ...initialSiiState });
        await clearTenantState();
      }
    }),
    {
      name: 'sii-storage',
      version: 2,
      storage: createJSONStorage(() => createTenantStorage(storage)),
      migrate: (persisted) => {
        const state = { ...(persisted as Record<string, unknown>) };
        delete state.activeCafs;
        delete state.digitalToken;
        delete state.lastTokenRefresh;
        const storeId = getActiveStoreId();
        state.offlineFolioPool = storeId ? sanitizePool(state.offlineFolioPool, storeId) : {};
        if (state.pendingQueue && Array.isArray(state.pendingQueue)) {
          state.pendingQueue = storeId
            ? state.pendingQueue.filter((item: SiiQueueItem) => item?.storeId === storeId)
            : [];
        }
        return state as unknown as SiiState;
      },
      merge: (persisted, current) => {
        const stored = persisted as (Partial<SiiState> & { __storeId?: string | null }) | undefined;
        const active = getActiveStoreId();
        if (!stored || !active || stored.__storeId !== active) return current;
        const safe: Record<string, unknown> = { ...stored };
        delete safe[TENANT_MARKER_KEY];
        const merged = safe as Partial<SiiState>;
        return {
          ...current,
          ...merged,
          pendingQueue: Array.isArray(merged.pendingQueue)
            ? merged.pendingQueue.filter((item) => item?.storeId === active)
            : [],
          offlineFolioPool: sanitizePool(merged.offlineFolioPool, active)
        };
      }
    }
  )
);

registerTenantResetHandler(() => { useSiiStore.setState({ ...initialSiiState }) })
registerTenantStoreSync(() => { void useSiiStore.persist.rehydrate() })
