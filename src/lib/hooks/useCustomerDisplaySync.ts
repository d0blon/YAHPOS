'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { usePosStore } from '@/stores/posStore'

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
  identityVerified?: boolean
  registerUrl?: string
}

const CHANNEL_NAME = 'yahpos-pos'
const STORAGE_KEY = 'yahpos-customer-display-state'

function getCashierFromStore(): string | undefined {
  const user = useAuthStore.getState().user
  if (user?.firstName) return `${user.firstName} ${user.lastName || ''}`.trim()
  const posUser = usePosStore.getState().currentUser
  if (posUser?.firstName) return posUser.firstName
  return undefined
}

export function useCustomerDisplayBroadcast() {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const metadataRef = useRef({ cashierName: undefined as string | undefined, terminalName: undefined as string | undefined, terminalId: undefined as number | undefined, storeName: undefined as string | undefined, storeLogo: undefined as string | undefined })
  const lastBroadcastRef = useRef<CustomerDisplayData | null>(null)

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    channel.onmessage = (event: MessageEvent) => {
      if ((event.data as any)?.type === 'request-state' && lastBroadcastRef.current) {
        channel.postMessage(lastBroadcastRef.current)
      }
    }

    return () => {
      channel.close()
    }
  }, [])

  const broadcast = useCallback((data: CustomerDisplayData) => {
    if (data.cashierName) metadataRef.current.cashierName = data.cashierName
    if (data.terminalName) metadataRef.current.terminalName = data.terminalName
    if (data.terminalId) metadataRef.current.terminalId = data.terminalId
    if (data.storeName) metadataRef.current.storeName = data.storeName
    if (data.storeLogo) metadataRef.current.storeLogo = data.storeLogo

    const enriched: CustomerDisplayData = {
      ...data,
      cashierName: data.cashierName ?? metadataRef.current.cashierName ?? getCashierFromStore(),
      terminalName: data.terminalName ?? metadataRef.current.terminalName,
      terminalId: data.terminalId ?? metadataRef.current.terminalId,
      storeName: data.storeName ?? metadataRef.current.storeName,
      storeLogo: data.storeLogo ?? metadataRef.current.storeLogo,
    }

    lastBroadcastRef.current = enriched
    channelRef.current?.postMessage(enriched)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched)) } catch {}
  }, [])

  return { broadcast }
}

export function useCustomerDisplayReceiver() {
  const [data, setData] = useState<CustomerDisplayData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const metadataRef = useRef({ cashierName: undefined as string | undefined, terminalName: undefined as string | undefined, terminalId: undefined as number | undefined, storeName: undefined as string | undefined, storeLogo: undefined as string | undefined })

  const updateData = useCallback((incoming: CustomerDisplayData): CustomerDisplayData => {
    // Sanitize: if cashierName is the string "undefined" from broken JSON, ignore
    if (incoming.cashierName === 'undefined') {
      incoming.cashierName = undefined;
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

    setData(enriched)
    return enriched
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved) as CustomerDisplayData
        updateData(parsed)
      }
    } catch {}

    const channel = new BroadcastChannel(CHANNEL_NAME)
    setIsConnected(true)

    channel.onmessage = (event: MessageEvent<CustomerDisplayData>) => {
      const enriched = updateData(event.data)
      try { if (enriched) localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched)) } catch {}
    }

    channel.postMessage({ type: 'request-state' } as any)

    return () => {
      channel.close()
      setIsConnected(false)
    }
  }, [updateData])

  return { data, isConnected }
}
