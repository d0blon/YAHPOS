'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

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
  type: 'cart-update' | 'payment-confirmed' | 'payment-qr' | 'reset'
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
  itemsCount?: number
  terminalName?: string
  terminalId?: number
  cashierName?: string
}

const CHANNEL_NAME = 'yahpos-pos'
const STORAGE_KEY = 'yahpos-customer-display-state'

export function useCustomerDisplayBroadcast() {
  const channelRef = useRef<BroadcastChannel | null>(null)
  const metadataRef = useRef({ cashierName: undefined as string | undefined, terminalName: undefined as string | undefined, terminalId: undefined as number | undefined })

  useEffect(() => {
    channelRef.current = new BroadcastChannel(CHANNEL_NAME)
    return () => {
      channelRef.current?.close()
    }
  }, [])

  const broadcast = useCallback((data: CustomerDisplayData) => {
    if (data.cashierName) metadataRef.current.cashierName = data.cashierName
    if (data.terminalName) metadataRef.current.terminalName = data.terminalName
    if (data.terminalId) metadataRef.current.terminalId = data.terminalId

    const enriched: CustomerDisplayData = {
      ...data,
      cashierName: data.cashierName ?? metadataRef.current.cashierName,
      terminalName: data.terminalName ?? metadataRef.current.terminalName,
      terminalId: data.terminalId ?? metadataRef.current.terminalId,
    }

    channelRef.current?.postMessage(enriched)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(enriched)) } catch {}
  }, [])

  return { broadcast }
}

export function useCustomerDisplayReceiver() {
  const [data, setData] = useState<CustomerDisplayData | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const metadataRef = useRef({ cashierName: undefined as string | undefined, terminalName: undefined as string | undefined, terminalId: undefined as number | undefined })

  const updateData = useCallback((incoming: CustomerDisplayData): CustomerDisplayData => {
    if (incoming.cashierName) metadataRef.current.cashierName = incoming.cashierName
    if (incoming.terminalName) metadataRef.current.terminalName = incoming.terminalName
    if (incoming.terminalId) metadataRef.current.terminalId = incoming.terminalId

    const enriched: CustomerDisplayData = {
      ...incoming,
      cashierName: incoming.cashierName ?? metadataRef.current.cashierName,
      terminalName: incoming.terminalName ?? metadataRef.current.terminalName,
      terminalId: incoming.terminalId ?? metadataRef.current.terminalId,
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

    return () => {
      channel.close()
      setIsConnected(false)
    }
  }, [updateData])

  return { data, isConnected }
}
