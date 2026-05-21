'use client'

import { printerManager } from './printer'
import { ESCPOS } from './types'

export class CashDrawerManager {
  private _connected = false

  get connected(): boolean { return this._connected }

  async open(): Promise<boolean> {
    if (printerManager.info.connected) {
      const result = await printerManager.openCashDrawer()
      return result
    }

    if (isWebUSBAvailable()) {
      try {
        const device = await navigator.usb.requestDevice({
          filters: [
            { vendorId: 0x0B0B }, // some cash drawer USB
          ]
        })
        if (device) {
          await device.open()
          if (device.configuration === null) {
            await device.selectConfiguration(1)
          }
          const iface = device.configuration!.interfaces[0]
          await device.claimInterface(iface.interfaceNumber)
          const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out')
          if (endpoint) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await device.transferOut(endpoint.endpointNumber, new Uint8Array(ESCPOS.CASH_DRAWER_PIN2) as any)
          }
          await device.close()
          this._connected = true
          return true
        }
      } catch { /* user cancelled or no device */ }
    }

    console.warn('[CashDrawer] No hay impresora ni gaveta USB conectada')
    return false
  }
}

export const cashDrawer = new CashDrawerManager()

function isWebUSBAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}
