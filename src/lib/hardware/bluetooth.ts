'use client'

import type { ScannerInfo } from './types'

export function isBluetoothAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator
}

export class BluetoothScanner {
  private device: BluetoothDevice | null = null
  private _connected = false
  private onBarcodeCallback: ((barcode: string) => void) | null = null
  private listeners: Set<(info: ScannerInfo) => void> = new Set()

  get connected(): boolean { return this._connected }
  get info(): ScannerInfo {
    return {
      connected: this._connected,
      name: this.device?.name || null,
    }
  }

  onChange(cb: (info: ScannerInfo) => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify() {
    const info = this.info
    this.listeners.forEach(cb => cb(info))
  }

  onBarcode(cb: (barcode: string) => void) {
    this.onBarcodeCallback = cb
  }

  /**
   * Scanners HID (Bluetooth keyboard emulation) don't need special handling
   * since they send keystrokes like a keyboard.
   * This method is for BLE scanners that use a custom service.
   */
  async connect(): Promise<boolean> {
    if (!isBluetoothAvailable()) {
      console.warn('[Bluetooth] Web Bluetooth no disponible')
      return false
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          0xFFF0, // Common barcode scanner service
          0xFFF1,
          '0000fff0-0000-1000-8000-00805f9b34fb',
          '0000fff1-0000-1000-8000-00805f9b34fb',
        ],
      })

      if (!this.device) return false

      this.device.addEventListener('gattserverdisconnected', () => {
        this._connected = false
        this.notify()
      })

      const server = await this.device.gatt!.connect()
      this._connected = true
      this.notify()

      try {
        const service = await server.getPrimaryService(0xFFF0)
        const characteristics = await service.getCharacteristics()
        for (const char of characteristics) {
          if (char.properties.read || char.properties.notify) {
            char.addEventListener('characteristicvaluechanged', (event) => {
              const value = (event.target as BluetoothRemoteGATTCharacteristic).value
              if (value && this.onBarcodeCallback) {
                const decoder = new TextDecoder('utf-8')
                const barcode = decoder.decode(value).replace(/[\r\n]/g, '')
                if (barcode.length >= 4) {
                  this.onBarcodeCallback(barcode)
                }
              }
            })
            if (char.properties.notify) {
              await char.startNotifications()
            }
          }
        }
      } catch {
        console.warn('[Bluetooth] Servicio 0xFFF0 no encontrado, scanner puede ser HID')
      }

      return true
    } catch (err) {
      if ((err as DOMException)?.name !== 'NotFoundError') {
        console.warn('[Bluetooth] Error al conectar:', err)
      }
      return false
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect()
    }
    this.device = null
    this._connected = false
    this.notify()
  }
}

export const bluetoothScanner = new BluetoothScanner()
