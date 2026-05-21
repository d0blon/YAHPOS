'use client'

import { ESCPOS, type PrinterInfo, type PrintOptions } from './types'

const STORAGE_KEY = 'yahpos_hardware_printer'

function savePrinterInfo(info: PrinterInfo) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info))
  } catch { /* noop */ }
}

function loadPrinterInfo(): PrinterInfo | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch { return null }
}

export function isWebUSBAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator
}

function textEncoder(text: string): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(text)
}

function buildReceiptData(opts: PrintOptions): Uint8Array {
  const parts: Uint8Array[] = []

  parts.push(new Uint8Array(ESCPOS.INIT))
  parts.push(new Uint8Array(ESCPOS.ALIGN_CENTER))

  if (opts.title) {
    parts.push(new Uint8Array(ESCPOS.BOLD_ON))
    parts.push(new Uint8Array(ESCPOS.FONT_DOUBLE_BOTH))
    parts.push(textEncoder(opts.title + '\n'))
    parts.push(new Uint8Array(ESCPOS.FONT_NORMAL))
    parts.push(new Uint8Array(ESCPOS.BOLD_OFF))
  }

  parts.push(new Uint8Array(ESCPOS.LF))

  if (opts.subtitle) {
    parts.push(new Uint8Array(ESCPOS.ALIGN_LEFT))
    parts.push(textEncoder(opts.subtitle + '\n'))
  }

  if (opts.headerLines) {
    for (const line of opts.headerLines) {
      parts.push(textEncoder(line + '\n'))
    }
  }

  parts.push(new Uint8Array(ESCPOS.ALIGN_LEFT))
  parts.push(textEncoder(ESCPOS.DOUBLE_DASHED))
  parts.push(new Uint8Array(ESCPOS.BOLD_ON))
  parts.push(textEncoder('ITEM\n'))
  parts.push(new Uint8Array(ESCPOS.BOLD_OFF))

  for (const item of opts.items) {
    parts.push(textEncoder(`${item.name}\n`))
    parts.push(textEncoder(`  ${item.quantity}    ${item.total}\n`))
  }

  parts.push(textEncoder(ESCPOS.DASHED_LINE))
  parts.push(new Uint8Array(ESCPOS.ALIGN_RIGHT))
  parts.push(new Uint8Array(ESCPOS.BOLD_ON))
  parts.push(new Uint8Array(ESCPOS.FONT_DOUBLE_HEIGHT))
  parts.push(textEncoder(`TOTAL: ${opts.total}\n`))
  parts.push(new Uint8Array(ESCPOS.FONT_NORMAL))
  parts.push(new Uint8Array(ESCPOS.BOLD_OFF))

  parts.push(new Uint8Array(ESCPOS.ALIGN_LEFT))
  parts.push(textEncoder(`PAGO: ${opts.paymentMethod}\n`))
  parts.push(new Uint8Array(ESCPOS.LF))

  if (opts.footer) {
    parts.push(new Uint8Array(ESCPOS.ALIGN_CENTER))
    for (const line of opts.footer) {
      parts.push(textEncoder(line + '\n'))
    }
  }

  parts.push(new Uint8Array(ESCPOS.LF))
  parts.push(new Uint8Array(ESCPOS.LF))
  parts.push(new Uint8Array(ESCPOS.CUT_PARTIAL))

  const totalLength = parts.reduce((acc, p) => acc + p.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const p of parts) {
    result.set(p, offset)
    offset += p.length
  }
  return result
}

export class PrinterManager {
  private device: USBDevice | null = null
  private listeners: Set<(info: PrinterInfo) => void> = new Set()
  private _info: PrinterInfo = { connected: false, name: null, vendorId: null, productId: null }

  get info(): PrinterInfo { return { ...this._info } }

  onChange(cb: (info: PrinterInfo) => void) {
    this.listeners.add(cb)
    return () => this.listeners.delete(cb)
  }

  private notify() {
    const info = this.info
    savePrinterInfo(info)
    this.listeners.forEach(cb => cb(info))
  }

  async autoConnect(): Promise<boolean> {
    if (!isWebUSBAvailable()) return false

    const saved = loadPrinterInfo()
    if (saved?.vendorId != null) {
      try {
        const devices = await navigator.usb.getDevices()
        const match = devices.find(
          d => d.vendorId === saved.vendorId && d.productId === saved.productId
        )
        if (match) {
          this.device = match
          this._info = { connected: true, name: saved.name, vendorId: saved.vendorId, productId: saved.productId }
          this.notify()
          return true
        }
      } catch { /* device no longer available */ }
    }
    return false
  }

  async requestDevice(): Promise<boolean> {
    if (!isWebUSBAvailable()) {
      console.warn('[Printer] WebUSB no disponible')
      return false
    }

    try {
      const device = await navigator.usb.requestDevice({
        filters: [
          { vendorId: 0x0416 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0483 }, // HPRT / Xprinter (STM)
          { vendorId: 0x1FC9 }, // Posiflex / many chinese
          { vendorId: 0x04B8 }, // Seiko / Bixolon
        ]
      })

      this.device = device
      this._info = {
        connected: true,
        name: device.productName || 'Impresora Térmica USB',
        vendorId: device.vendorId,
        productId: device.productId,
      }
      this.notify()
      return true
    } catch (err) {
      if ((err as DOMException)?.name !== 'NotFoundError' && (err as DOMException)?.name !== 'SecurityError') {
        console.warn('[Printer] Error al solicitar dispositivo:', err)
      }
      return false
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.device && this.device.opened) {
        await this.device.close()
      }
    } catch { /* ignore */ }
    this.device = null
    this._info = { connected: false, name: null, vendorId: null, productId: null }
    localStorage.removeItem(STORAGE_KEY)
    this.notify()
  }

  async sendReceipt(opts: PrintOptions): Promise<boolean> {
    if (!this.device) {
      console.warn('[Printer] No hay dispositivo conectado')
      const reconnected = await this.autoConnect()
      if (!reconnected) return false
    }
    if (!this.device) return false

    const data = buildReceiptData(opts)
    return this.sendRaw(data)
  }

  async sendRaw(data: Uint8Array): Promise<boolean> {
    if (!this.device) return false

    try {
      if (!this.device.opened) {
        await this.device.open()
      }

      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1)
      }

      const iface = this.device.configuration!.interfaces[0]
      await this.device.claimInterface(iface.interfaceNumber)

      const endpoint = iface.alternate.endpoints.find(e => e.direction === 'out')
      if (!endpoint) {
        throw new Error('No se encontró endpoint de salida')
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.device.transferOut(endpoint.endpointNumber, data as any)
      return true
    } catch (err) {
      console.error('[Printer] Error al enviar datos:', err)
      this._info.connected = false
      this.notify()
      return false
    }
  }

  async openCashDrawer(): Promise<boolean> {
    return this.sendRaw(new Uint8Array(ESCPOS.CASH_DRAWER_PIN2))
  }
}

export const printerManager = new PrinterManager()
