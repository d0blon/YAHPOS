'use client'

export interface PrinterInfo {
  connected: boolean
  name: string | null
  vendorId: number | null
  productId: number | null
}

export interface ScannerInfo {
  connected: boolean
  name: string | null
}

export interface HardwareState {
  printer: PrinterInfo
  cashDrawer: boolean
  scanner: ScannerInfo
  bluetoothAvailable: boolean
  webusbAvailable: boolean
  webserialAvailable: boolean
}

export type HardwareEventCallback = (state: HardwareState) => void

export interface PrintOptions {
  title?: string
  subtitle?: string
  headerLines?: string[]
  items: { name: string; quantity: string; total: string }[]
  total: string
  paymentMethod: string
  footer?: string[]
  /** Leyendas obligatorias (ej. voucher NO SII). Se imprimen en negrita/doble ancho antes del cut. */
  disclaimerLines?: string[]
}

export const ESCPOS = {
  LF: 0x0A,
  ESC: 0x1B,
  GS: 0x1D,
  
  INIT: [0x1B, 0x40],
  CUT_FULL: [0x1D, 0x56, 0x00],
  CUT_PARTIAL: [0x1D, 0x56, 0x01],
  
  BOLD_ON: [0x1B, 0x45, 0x01],
  BOLD_OFF: [0x1B, 0x45, 0x00],
  
  ALIGN_LEFT: [0x1B, 0x61, 0x00],
  ALIGN_CENTER: [0x1B, 0x61, 0x01],
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],
  
  FONT_NORMAL: [0x1D, 0x21, 0x00],
  FONT_DOUBLE_HEIGHT: [0x1D, 0x21, 0x01],
  FONT_DOUBLE_WIDTH: [0x1D, 0x21, 0x10],
  FONT_DOUBLE_BOTH: [0x1D, 0x21, 0x11],
  
  CASH_DRAWER_PIN2: [0x1B, 0x70, 0x00, 0x19, 0xFA],
  CASH_DRAWER_PIN5: [0x1B, 0x70, 0x01, 0x19, 0xFA],

  DASHED_LINE: '--------------------------------\n',
  DOUBLE_DASHED: '================================\n',
} as const

// Terminales que emiten su propio DTE (boleta fiscal) — NO duplicar SII
export const TERMINALS_WITH_DTE: Record<string, boolean> = {
  'TUU': true,        // API tiene campo dteType, emite boleta electrónica
  'Getnet': true,     // Smart POS emite boleta vía Global API
  'SumUp Solo': true, // Conexión SII integrada
  'SumUp Air': false, // Solo lector Bluetooth, no emite DTE
}

// Métodos que son solo pasarelas de pago (NO emiten DTE)
export const GATEWAY_METHODS = ['WEBPAY_QR', 'MERCADOPAGO_QR', 'FLOW'] as const

// Métodos que son vouchers exentos de IVA
export const VOUCHER_METHODS = ['JUNAEB', 'PLUXE', 'EDENRED'] as const
