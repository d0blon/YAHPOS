import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// Default settings - fallback if table doesn't exist
const DEFAULTS: Record<string, string> = {
  // Tienda
  store_name: 'AustralMarket',
  store_slogan: 'Tu supermercado online',
  store_address: 'Dirección 123',
  store_city: 'Castro, Chiloé, Chile',
  store_phone: '+56 9 1234 5678',
  store_email: 'contacto@austral.cl',
  store_website: 'http://localhost:3000',

  // POS
  pos_terminal_name: 'Caja 1',
  pos_tax_rate: '19',
  pos_currency: 'CLP',
  pos_low_stock_threshold: '5',
  pos_receipt_message: '¡Gracias por su compra!',
  pos_payment_cash: 'true',
  pos_payment_transbank: 'true',
  pos_payment_getnet: 'false',
  pos_payment_tuu: 'false',
  pos_payment_sumup: 'false',
  pos_payment_other_card: 'false',
  pos_payment_transfer: 'true',

  // Pagos Online (solo tienda online, NO para POS)
  payment_flow_enabled: 'false',
  payment_flow_api_key: '',
  payment_flow_api_secret: '',
  payment_webpay_enabled: 'false',
  payment_webpay_commerce_code: '',
  payment_free_shipping_min: '30000',

  // SII - Boletas Electrónicas
  sii_rut: '21012281-8',
  sii_razon_social: 'Tu Supermercado',
  sii_giro: 'Supermercado',
  sii_actividad: '522030',
  sii_direccion: 'Dirección 123',
  sii_comuna: 'Santiago',
  sii_simple_api_key: '',

  // Apariencia
  appearance_logo_url: '',
  appearance_primary_color: '#1e3a6e',
  appearance_secondary_color: '#f5c518',
  appearance_dark_mode: 'false',
  
  // Fidelización
  loyalty_enabled: 'true',
  loyalty_min_redemption: '0',
  loyalty_accumulation_rate: '100',
  loyalty_redemption_rate: '1',
  loyalty_require_id_verification: 'true',
}

// Group settings by prefix for structured response
function groupSettings(flat: Record<string, string>) {
  return {
    store: {
      name: flat.store_name,
      slogan: flat.store_slogan,
      address: flat.store_address,
      city: flat.store_city,
      phone: flat.store_phone,
      email: flat.store_email,
      website: flat.store_website,
    },
    pos: {
      terminalName: flat.pos_terminal_name,
      taxRate: Number(flat.pos_tax_rate),
      currency: flat.pos_currency,
      lowStockThreshold: Number(flat.pos_low_stock_threshold),
      receiptMessage: flat.pos_receipt_message,
      paymentCash: flat.pos_payment_cash === 'true',
      paymentTransbank: flat.pos_payment_transbank === 'true',
      paymentGetnet: flat.pos_payment_getnet === 'true',
      paymentTuu: flat.pos_payment_tuu === 'true',
      paymentSumup: flat.pos_payment_sumup === 'true',
      paymentOtherCard: flat.pos_payment_other_card === 'true',
      paymentTransfer: flat.pos_payment_transfer === 'true',
    },
    payments: {
      flowEnabled: flat.payment_flow_enabled === 'true',
      flowApiKey: flat.payment_flow_api_key,
      flowApiSecret: flat.payment_flow_api_secret,
      webpayEnabled: flat.payment_webpay_enabled === 'true',
      webpayCommerceCode: flat.payment_webpay_commerce_code,
      freeShippingMin: Number(flat.payment_free_shipping_min),
    },
    sii: {
      rut: flat.sii_rut,
      razonSocial: flat.sii_razon_social,
      giro: flat.sii_giro,
      actividad: flat.sii_actividad,
      direccion: flat.sii_direccion,
      comuna: flat.sii_comuna,
      simpleApiKey: flat.sii_simple_api_key,
    },
    appearance: {
      logoUrl: flat.appearance_logo_url,
      primaryColor: flat.appearance_primary_color,
      secondaryColor: flat.appearance_secondary_color,
      darkMode: flat.appearance_dark_mode === 'true',
    },
    loyalty: {
      enabled: flat.loyalty_enabled === 'true',
      minRedemption: Number(flat.loyalty_min_redemption),
      accumulationRate: Number(flat.loyalty_accumulation_rate),
      redemptionRate: Number(flat.loyalty_redemption_rate),
      requireIdVerification: flat.loyalty_require_id_verification === 'true',
    },
  }
}

export async function GET() {
  const supabase = createServerClient()

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')

    if (error) {
      // Table might not exist — return defaults
      console.warn('[settings] Using defaults:', error.message)
      return NextResponse.json({ 
        settings: groupSettings(DEFAULTS), 
        usingDefaults: true 
      })
    }

    // Merge DB values over defaults
    const flat = { ...DEFAULTS }
    for (const row of data ?? []) {
      flat[row.key] = row.value ?? flat[row.key]
    }

    return NextResponse.json({ 
      settings: groupSettings(flat), 
      usingDefaults: false 
    })
  } catch (err: any) {
    return NextResponse.json({ 
      settings: groupSettings(DEFAULTS), 
      usingDefaults: true 
    })
  }
}

export async function PATCH(req: Request) {
  const supabase = createServerClient()

  try {
    const body = await req.json() as Record<string, string>

    // Upsert each key-value pair
    const rows = Object.entries(body).map(([key, value]) => ({
      key,
      value: String(value),
    }))

    const { error } = await supabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
