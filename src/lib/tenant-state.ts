import type { StateStorage } from 'zustand/middleware'

export const TENANT_STORAGE_PREFIX = 'yahpos-tenant:'
export const TENANT_MARKER_KEY = '__storeId'

const LEGACY_TENANT_KEYS = [
  'austral-market-pos-session',
  'sii-storage',
  'austral-market-cart',
  'yahpos-customer-display-state',
  'yahpos-auth',
] as const

let activeStoreId: string | null = null

const knownStoreIds = new Set<string>()
const registeredStorages = new Set<StateStorage>()
const trackedKeys = new WeakMap<StateStorage, Set<string>>()
const resetHandlers = new Set<() => void>()
const storeListeners = new Set<() => void>()
const storeSyncHandlers = new Set<() => void>()

let legacyPurged = false

function isBrowser(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return Boolean(window.localStorage)
  } catch {
    return false
  }
}

export function getActiveStoreId(): string | null {
  return activeStoreId
}

export function getServerActiveStoreId(): null {
  return null
}

export function subscribeActiveStore(listener: () => void): () => void {
  storeListeners.add(listener)
  return () => { storeListeners.delete(listener) }
}

export function registerTenantResetHandler(handler: () => void): () => void {
  resetHandlers.add(handler)
  return () => { resetHandlers.delete(handler) }
}

export function registerTenantStoreSync(handler: () => void): () => void {
  storeSyncHandlers.add(handler)
  return () => { storeSyncHandlers.delete(handler) }
}

export function setActiveStoreId(storeId: string | null): void {
  const normalized = typeof storeId === 'string' && storeId.trim() ? storeId.trim() : null
  if (normalized === activeStoreId) return

  activeStoreId = normalized
  if (normalized) knownStoreIds.add(normalized)

  storeListeners.forEach((listener) => {
    try { listener() } catch { /* listener aislado */ }
  })

  if (normalized) {
    storeSyncHandlers.forEach((handler) => {
      try { handler() } catch { /* handler aislado */ }
    })
    void purgeLegacyTenantKeys()
  }
}

function tenantKey(name: string, storeId: string | null): string | null {
  if (!storeId) return null
  return `${TENANT_STORAGE_PREFIX}${storeId}:${name}`
}

function trackKey(storage: StateStorage, key: string): void {
  let keys = trackedKeys.get(storage)
  if (!keys) {
    keys = new Set<string>()
    trackedKeys.set(storage, keys)
  }
  keys.add(key)
}

function withTenantMarker(value: string, storeId: string): string {
  try {
    const parsed: unknown = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return JSON.stringify({ ...(parsed as Record<string, unknown>), [TENANT_MARKER_KEY]: storeId })
    }
  } catch {
    return value
  }
  return value
}

export function createTenantStorage(base: StateStorage): StateStorage {
  registeredStorages.add(base)
  void purgeLegacyTenantKeys()

  return {
    getItem: (name) => {
      const storeId = getActiveStoreId()
      const key = tenantKey(name, storeId)
      if (!key || !isBrowser()) return null
      trackKey(base, key)
      return base.getItem(key)
    },
    setItem: (name, value) => {
      const storeId = getActiveStoreId()
      if (!storeId) return
      const key = tenantKey(name, storeId)
      if (!key || !isBrowser()) return
      trackKey(base, key)
      return base.setItem(key, withTenantMarker(value, storeId))
    },
    removeItem: (name) => {
      const storeId = getActiveStoreId()
      if (!storeId) return
      const key = tenantKey(name, storeId)
      if (!key || !isBrowser()) return
      const keys = trackedKeys.get(base)
      if (keys) keys.delete(key)
      return base.removeItem(key)
    },
  }
}

async function purgeLegacyTenantKeys(): Promise<void> {
  if (legacyPurged || !isBrowser()) return
  legacyPurged = true

  LEGACY_TENANT_KEYS.forEach((key) => {
    try { window.localStorage.removeItem(key) } catch { /* storage bloqueado */ }
  })

  if (typeof indexedDB !== 'undefined') {
    try {
      const { del } = await import('idb-keyval')
      await Promise.all(LEGACY_TENANT_KEYS.map((key) => del(key).catch(() => undefined)))
    } catch { /* IndexedDB no disponible */ }
  }
}

export async function clearTenantState(): Promise<void> {
  void purgeLegacyTenantKeys()

  resetHandlers.forEach((handler) => {
    try { handler() } catch { /* handler aislado */ }
  })

  const removals: unknown[] = []
  registeredStorages.forEach((storage) => {
    const keys = trackedKeys.get(storage)
    if (!keys) return
    keys.forEach((key) => {
      try { removals.push(storage.removeItem(key)) } catch { /* storage bloqueado */ }
    })
    keys.clear()
  })

  if (isBrowser()) {
    try {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith(TENANT_STORAGE_PREFIX))
        .forEach((key) => {
          try { window.localStorage.removeItem(key) } catch { /* storage bloqueado */ }
        })
    } catch { /* storage bloqueado */ }
  }

  if (typeof indexedDB !== 'undefined') {
    try {
      const { keys: idbKeys, del } = await import('idb-keyval')
      const allKeys = await idbKeys()
      await Promise.all(
        allKeys
          .filter((key): key is string => typeof key === 'string' && key.startsWith(TENANT_STORAGE_PREFIX))
          .map((key) => del(key).catch(() => undefined))
      )
    } catch { /* IndexedDB no disponible */ }
  }

  await Promise.allSettled(removals)
  knownStoreIds.clear()
}
