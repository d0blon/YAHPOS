'use client'

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { usePosStore } from '@/stores/posStore'
import { getActiveStoreId, getServerActiveStoreId, subscribeActiveStore } from '@/lib/tenant-state'

export interface CustomerDisplayItem {
  name: string
  quantity: number
  price: number
  total: number
  image?: string
  originalPrice?: number
  category?: string
  unit?: string
  packDescription?: string
  packQuantity?: number
  packPrice?: number
}

export interface CustomerDisplayData {
  type: 'cart-update' | 'payment-confirmed' | 'payment-qr' | 'payment-processing' | 'reset'
  items: CustomerDisplayItem[]
  subtotal: number
  total: number
  discount: number
  paymentMethod?: string
  qrData?: { url: string; token: string } | null
  customerName?: string
  customerRut?: string
  customerPoints?: number
  pointsToEarn?: number
  pointsRedeemed?: number
  itemsCount?: number
  terminalName?: string
  terminalId?: number
  cashierName?: string
  storeName?: string
  storeLogo?: string
  isFullAccount?: boolean
  documentKind?: 'dte' | 'voucher'
  identityVerified?: boolean
  registerUrl?: string
  storeId?: string
}

type CustomerDisplayMessage = (CustomerDisplayData & { storeId: string }) | { type: 'request-state'; storeId: string }

interface DisplayMetadata {
  cashierName?: string
  terminalName?: string
  terminalId?: number
  storeName?: string
  storeLogo?: string
}

function useActiveTenantStoreId(): string | null {
  return useSyncExternalStore(subscribeActiveStore, getActiveStoreId, getServerActiveStoreId)
}

function getChannelName(storeId: string): string {
  return `yahpos-pos:${storeId}`
}

function getStorageKey(storeId: string): string {
  return `yahpos-tenant:customer-display:${storeId}`
}

function emptyMetadata(): DisplayMetadata {
  return {}
}

function getCashierFromStore(): string | undefined {
  const user = useAuthStore.getState().user
  if (user?.firstName) return `${user.firstName} ${user.lastName || ''}`.trim()
  const posUser = usePosStore.getState().currentUser
  if (posUser?.firstName) return posUser.firstName
  return undefined
}

export function useCustomerDisplayBroadcast() {
  const tenantStoreId = useActiveTenantStoreId()
  const channelRef = useRef<BroadcastChannel | null>(null)
  const lastBroadcastStoreRef = useRef<string | null>(null)
  const metadataRef = useRef<DisplayMetadata>(emptyMetadata())
  const lastBroadcastRef = useRef<CustomerDisplayData | null>(null)

  useEffect(() => {
    if (!tenantStoreId) return

    if (lastBroadcastStoreRef.current && lastBroadcastStoreRef.current !== tenantStoreId) {
      lastBroadcastRef.current = null
      metadataRef.current = emptyMetadata()
    }
    lastBroadcastStoreRef.current = tenantStoreId

    const channel = new BroadcastChannel(getChannelName(tenantStoreId))
    channelRef.current = channel

    channel.onmessage = (event: MessageEvent) => {
      const incoming = event.data as CustomerDisplayMessage | null
      if (incoming?.type === 'request-state' && incoming.storeId === tenantStoreId && lastBroadcastRef.current) {
        channel.postMessage(lastBroadcastRef.current)
      }
    }

    return () => {
      channel.close()
      channelRef.current = null
    }
  }, [tenantStoreId])

  const broadcast = useCallback((data: CustomerDisplayData) => {
    if (!tenantStoreId) return

    if (data.cashierName) metadataRef.current.cashierName = data.cashierName
    if (data.terminalName) metadataRef.current.terminalName = data.terminalName
    if (data.terminalId) metadataRef.current.terminalId = data.terminalId
    if (data.storeName) metadataRef.current.storeName = data.storeName
    if (data.storeLogo) metadataRef.current.storeLogo = data.storeLogo

    const enriched: CustomerDisplayData = {
      ...data,
      storeId: tenantStoreId,
      cashierName: data.cashierName ?? metadataRef.current.cashierName ?? getCashierFromStore(),
      terminalName: data.terminalName ?? metadataRef.current.terminalName,
      terminalId: data.terminalId ?? metadataRef.current.terminalId,
      storeName: data.storeName ?? metadataRef.current.storeName,
      storeLogo: data.storeLogo ?? metadataRef.current.storeLogo,
    }

    lastBroadcastRef.current = enriched
    channelRef.current?.postMessage(enriched)
    try { localStorage.setItem(getStorageKey(tenantStoreId), JSON.stringify(enriched)) } catch {}
  }, [tenantStoreId])

  return { broadcast }
}

export function useCustomerDisplayReceiver() {
  const tenantStoreId = useActiveTenantStoreId()
  const [dataByStore, setDataByStore] = useState<{ storeId: string; data: CustomerDisplayData } | null>(null)
  const metadataRef = useRef<DisplayMetadata>(emptyMetadata())
  const data = dataByStore?.storeId === tenantStoreId ? dataByStore.data : null
  const isConnected = Boolean(tenantStoreId)

  const updateData = useCallback((incoming: CustomerDisplayData): CustomerDisplayData => {
    if (!tenantStoreId) return incoming
    if (incoming.cashierName === 'undefined') {
      incoming.cashierName = undefined;
    }
    if (incoming.type === 'payment-confirmed' && !incoming.documentKind) {
      const lastSale = usePosStore.getState().salesHistory[0]
      if (lastSale?.siiDecision) {
        incoming.documentKind = lastSale.siiDecision.kind === 'dte' ? 'dte' : 'voucher'
      } else if (lastSale?.siiSkipped) {
        incoming.documentKind = 'voucher'
      }
    }
    if (incoming.cashierName) metadataRef.current.cashierName = incoming.cashierName
    if (incoming.terminalName) metadataRef.current.terminalName = incoming.terminalName
    if (incoming.terminalId) metadataRef.current.terminalId = incoming.terminalId
    if (incoming.storeName) metadataRef.current.storeName = incoming.storeName
    if (incoming.storeLogo) metadataRef.current.storeLogo = incoming.storeLogo

    const enriched: CustomerDisplayData = {
      ...incoming,
      cashierName: incoming.cashierName ?? metadataRef.current.cashierName ?? getCashierFromStore(),
      terminalName: incoming.terminalName ?? metadataRef.current.terminalName,
      terminalId: incoming.terminalId ?? metadataRef.current.terminalId,
      storeName: incoming.storeName ?? metadataRef.current.storeName,
      storeLogo: incoming.storeLogo ?? metadataRef.current.storeLogo,
    }

    setDataByStore({ storeId: tenantStoreId, data: enriched })
    return enriched
  }, [tenantStoreId])

  useEffect(() => {
    metadataRef.current = emptyMetadata()
    if (!tenantStoreId) return

    try {
      const saved = localStorage.getItem(getStorageKey(tenantStoreId))
      if (saved) {
        const parsed = JSON.parse(saved) as CustomerDisplayData
        if (parsed?.storeId === tenantStoreId) updateData(parsed)
      }
    } catch {}

    const channel = new BroadcastChannel(getChannelName(tenantStoreId))

    channel.onmessage = (event: MessageEvent<CustomerDisplayMessage>) => {
      const incoming = event.data
      if (!incoming || incoming.storeId !== tenantStoreId || incoming.type === 'request-state') return
      const enriched = updateData(incoming)
      try { localStorage.setItem(getStorageKey(tenantStoreId), JSON.stringify(enriched)) } catch {}
    }

    channel.postMessage({ type: 'request-state', storeId: tenantStoreId } satisfies CustomerDisplayMessage)

    return () => {
      channel.close()
    }
  }, [tenantStoreId, updateData])

  return { data, isConnected }
}
