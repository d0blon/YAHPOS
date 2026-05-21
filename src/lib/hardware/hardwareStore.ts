'use client'

import { create } from 'zustand'
import { printerManager, isWebUSBAvailable } from './printer'
import { cashDrawer } from './cashDrawer'
import { bluetoothScanner, isBluetoothAvailable } from './bluetooth'
import type { PrinterInfo, ScannerInfo } from './types'

interface HardwareStore {
  printer: PrinterInfo
  cashDrawerConnected: boolean
  scanner: ScannerInfo
  bluetoothAvailable: boolean
  webusbAvailable: boolean

  init: () => Promise<void>
  connectPrinter: () => Promise<boolean>
  disconnectPrinter: () => Promise<void>
  openCashDrawer: () => Promise<boolean>
  connectScanner: () => Promise<boolean>
  disconnectScanner: () => Promise<void>
}

export const useHardwareStore = create<HardwareStore>((set) => ({
  printer: { connected: false, name: null, vendorId: null, productId: null },
  cashDrawerConnected: false,
  scanner: { connected: false, name: null },
  bluetoothAvailable: false,
  webusbAvailable: false,

  init: async () => {
    const webusbAvail = isWebUSBAvailable()
    const btAvail = isBluetoothAvailable()
    set({ webusbAvailable: webusbAvail, bluetoothAvailable: btAvail })

    printerManager.onChange((info: PrinterInfo) => {
      set({ printer: info })
    })

    if (webusbAvail) {
      const autoConnected = await printerManager.autoConnect()
      if (autoConnected) {
        set({ printer: printerManager.info })
      }
    }
  },

  connectPrinter: async () => {
    const ok = await printerManager.requestDevice()
    if (ok) set({ printer: printerManager.info })
    return ok
  },

  disconnectPrinter: async () => {
    await printerManager.disconnect()
    set({ printer: { connected: false, name: null, vendorId: null, productId: null } })
  },

  openCashDrawer: async () => {
    const ok = await cashDrawer.open()
    if (ok) set({ cashDrawerConnected: true })
    return ok
  },

  connectScanner: async () => {
    const ok = await bluetoothScanner.connect()
    if (ok) set({ scanner: bluetoothScanner.info })
    return ok
  },

  disconnectScanner: async () => {
    await bluetoothScanner.disconnect()
    set({ scanner: { connected: false, name: null } })
  },
}))
