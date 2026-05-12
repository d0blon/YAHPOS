import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// Custom storage for idb-keyval
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

export interface SiiPayload {
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    isExempt?: boolean;
  }>;
  totals: {
    total: number;
  };
  type: string | number;
  folio: number | null;
}

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
  activeCafs: Record<string, string>; // key: tipoDte, value: xml
  offlineFolioPool: Record<string, number[]>; // key: tipoDte, value: array de folios disponibles
  digitalToken: string | null;
  lastTokenRefresh: number | null;
  isSyncing: boolean;
  isOfflineMode: boolean;
  lastSync: number | null;
  foliosDisponibles: boolean;

  // Actions
  addToQueue: (item: Omit<SiiQueueItem, 'timestamp' | 'attempts'>) => void;
  removeFromQueue: (id: string) => void;
  updateAttempts: (id: string) => void;
  setCaf: (tipoDte: number, xml: string) => void;
  setFolioPool: (tipoDte: number, folios: number[]) => void;
  consumeFolio: (tipoDte: number) => number | null;
  setToken: (token: string) => void;
  setSyncing: (status: boolean) => void;
  setOfflineMode: (status: boolean) => void;
  clearQueue: () => void;
  refreshFolios: (tipoDte: number) => Promise<void>;
  setFoliosDisponibles: (val: boolean) => void;
}

export const useSiiStore = create<SiiState>()(
  persist(
    (set, get) => ({
      pendingQueue: [],
      activeCafs: {},
      offlineFolioPool: {},
      digitalToken: null,
      lastTokenRefresh: null,
      isSyncing: false,
      isOfflineMode: false,
      lastSync: null,
      foliosDisponibles: true,

      addToQueue: (item) => set((state) => ({
        pendingQueue: [...state.pendingQueue, { ...item, timestamp: Date.now(), attempts: 0 }]
      })),

      removeFromQueue: (id) => set((state) => ({
        pendingQueue: state.pendingQueue.filter((i) => i.id !== id)
      })),

      updateAttempts: (id) => set((state) => ({
        pendingQueue: state.pendingQueue.map((i) => 
          i.id === id ? { ...i, attempts: i.attempts + 1, lastAttempt: Date.now() } : i
        )
      })),

      setCaf: (tipoDte, xml) => set((state) => ({
        activeCafs: { ...state.activeCafs, [tipoDte.toString()]: xml }
      })),

      setFolioPool: (tipoDte, folios) => set((state) => ({
        offlineFolioPool: { ...state.offlineFolioPool, [tipoDte.toString()]: folios }
      })),

      consumeFolio: (tipoDte) => {
        const state = get();
        const key = tipoDte.toString();
        const pool = state.offlineFolioPool[key] || [];
        
        if (pool.length === 0) return null;
        
        const nextFolio = pool[0];
        const newPool = pool.slice(1);
        
        set((state) => ({
          offlineFolioPool: { ...state.offlineFolioPool, [key]: newPool }
        }));

        // Si el pool está bajo, intentar refrescar (fire and forget)
        if (newPool.length < 10) {
          get().refreshFolios(tipoDte).catch(err => console.warn(`[SiiStore] Error en auto-refresco: ${err}`));
        }

        return nextFolio;
      },

      refreshFolios: async (tipoDte) => {
        // Evitar refrescos concurrentes para el mismo tipo
        const state = get();
        if (state.isSyncing) return;
        
        try {
          console.log(`[SiiStore] Solicitando lote de folios para DTE ${tipoDte}...`);
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
            
            set((state) => {
              const currentPool = state.offlineFolioPool[tipoDte.toString()] || [];
              // Filtrar posibles duplicados (aunque no deberían ocurrir con la API de reserva)
              const combinedPool = Array.from(new Set([...currentPool, ...newFolios])).sort((a, b) => a - b);
              
              return {
                offlineFolioPool: { 
                  ...state.offlineFolioPool, 
                  [tipoDte.toString()]: combinedPool 
                },
                activeCafs: {
                  ...state.activeCafs,
                  [tipoDte.toString()]: data.cafXml
                }
              };
            });
            console.log(`[SiiStore] ✅ Reservados folios ${data.start}-${data.end} para DTE ${tipoDte}`);
          }
        } catch (e) {
          console.warn('[SiiStore] Error de red al refrescar folios:', e);
        }
      },

      setToken: (token) => set({ 
        digitalToken: token, 
        lastTokenRefresh: Date.now() 
      }),

      setSyncing: (status) => set({ isSyncing: status }),

      setOfflineMode: (status) => set({ isOfflineMode: status }),

      clearQueue: () => set({ pendingQueue: [] }),

      setFoliosDisponibles: (val) => set({ foliosDisponibles: val }),
    }),
    {
      name: 'sii-storage',
      storage: createJSONStorage(() => storage),
    }
  )
);
