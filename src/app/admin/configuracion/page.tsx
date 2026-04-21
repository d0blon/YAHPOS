'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Settings, Store, Monitor, CreditCard, FileText, Palette,
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  Save, CheckCircle, AlertCircle, Loader2, Eye, EyeOff,
  Banknote, Wifi, Receipt, Terminal, Award
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { toast } from 'sonner'
import AdminSidebar from '@/components/admin/AdminSidebar'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const TABS = [
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'pos', label: 'POS', icon: Monitor },
  { id: 'terminals', label: 'Terminales', icon: Terminal },
  { id: 'payments', label: 'Pagos Online', icon: CreditCard },
  { id: 'sii', label: 'Boletas SII', icon: FileText },
  { id: 'loyalty', label: 'Fidelización', icon: Award },
  { id: 'appearance', label: 'Apariencia', icon: Palette },
]

function SectionCard({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

function Field({ label, hint, children }: { label: string, hint?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</Label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function SecretInput({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••••••'}
        className="rounded-xl h-11 pr-10"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

function Toggle({ checked, onCheckedChange, label }: { checked: boolean, onCheckedChange: (v: boolean) => void, label: string }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
      <Checkbox checked={checked} onCheckedChange={v => onCheckedChange(!!v)} id={label} />
      <Label htmlFor={label} className="text-sm font-medium cursor-pointer">{label}</Label>
    </div>
  )
}

export default function AdminConfiguracion() {
  const [activeTab, setActiveTab] = useState('store')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [usingDefaults, setUsingDefaults] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showSqlModal, setShowSqlModal] = useState(false)
  const [sqlScript, setSqlScript] = useState('')
  
  // All settings state
  const [store, setStore] = useState({ name: '', slogan: '', address: '', city: '', phone: '', email: '', website: '' })
  const [pos, setPos] = useState({ 
    terminalName: '', taxRate: 19, currency: 'CLP', lowStockThreshold: 5, receiptMessage: '',
    paymentCash: true, 
    paymentTransbank: true,
    paymentGetnet: false,
    paymentTuu: false,
    paymentSumup: false,
    paymentOtherCard: false,
    paymentTransfer: true 
  })
  const [payments, setPayments] = useState({ flowEnabled: false, flowApiKey: '', flowApiSecret: '', webpayEnabled: false, webpayCommerceCode: '', freeShippingMin: 30000 })
  const [sii, setSii] = useState({ rut: '', razonSocial: '', giro: '', actividad: '', direccion: '', comuna: '', simpleApiKey: '' })
  const [loyalty, setLoyalty] = useState({ enabled: true, minRedemption: 0, accumulationRate: 100, redemptionRate: 1, requireIdVerification: true })
  const [appearance, setAppearance] = useState({ logoUrl: '', primaryColor: '#1e3a6e', secondaryColor: '#f5c518', darkMode: false })
  const [terminalsList, setTerminalsList] = useState<any[]>([])
  const [newTerminalName, setNewTerminalName] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ settings, usingDefaults }) => {
        if (settings) {
          setStore(settings.store)
          setPos(settings.pos)
          setPayments(settings.payments)
          setSii(settings.sii)
          setLoyalty(settings.loyalty || { enabled: true, minRedemption: 0, accumulationRate: 100, redemptionRate: 1, requireIdVerification: true })
          setAppearance(settings.appearance)
          setUsingDefaults(usingDefaults)
        }
      })
      .catch(() => toast.error('No se pudo cargar la configuración'))
      .finally(() => setIsLoading(false))

    // Fetch terminals
    fetch('/api/terminals')
      .then(r => r.json())
      .then(data => setTerminalsList(data))
      .catch(() => console.error('Error fetching terminals'))
  }, [])

  const handleSave = useCallback(async () => {
    setSaveStatus('saving')
    try {
      const flat: Record<string, string> = {
        store_name: store.name, store_slogan: store.slogan, store_address: store.address,
        store_city: store.city, store_phone: store.phone, store_email: store.email, store_website: store.website,
        pos_terminal_name: pos.terminalName, pos_tax_rate: String(pos.taxRate), pos_currency: pos.currency,
        pos_low_stock_threshold: String(pos.lowStockThreshold), pos_receipt_message: pos.receiptMessage,
        pos_payment_cash: String(pos.paymentCash), 
        pos_payment_transbank: String(pos.paymentTransbank),
        pos_payment_getnet: String(pos.paymentGetnet),
        pos_payment_tuu: String(pos.paymentTuu),
        pos_payment_sumup: String(pos.paymentSumup),
        pos_payment_other_card: String(pos.paymentOtherCard),
        pos_payment_transfer: String(pos.paymentTransfer),
        payment_flow_enabled: String(payments.flowEnabled), payment_flow_api_key: payments.flowApiKey,
        payment_flow_api_secret: payments.flowApiSecret, payment_webpay_enabled: String(payments.webpayEnabled),
        payment_webpay_commerce_code: payments.webpayCommerceCode, payment_free_shipping_min: String(payments.freeShippingMin),
        sii_rut: sii.rut, sii_razon_social: sii.razonSocial, sii_giro: sii.giro,
        sii_actividad: sii.actividad, sii_direccion: sii.direccion, sii_comuna: sii.comuna, sii_simple_api_key: sii.simpleApiKey,
        loyalty_enabled: String(loyalty.enabled),
        loyalty_min_redemption: String(loyalty.minRedemption),
        loyalty_accumulation_rate: String(loyalty.accumulationRate),
        loyalty_redemption_rate: String(loyalty.redemptionRate),
        loyalty_require_id_verification: String(loyalty.requireIdVerification),
        appearance_logo_url: appearance.logoUrl, appearance_primary_color: appearance.primaryColor,
        appearance_secondary_color: appearance.secondaryColor, appearance_dark_mode: String(appearance.darkMode),
      }

      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flat) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      setSaveStatus('saved')
      toast.success('Configuración guardada correctamente')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: any) {
      setSaveStatus('error')
      toast.error(err.message)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [store, pos, payments, sii, appearance])

  if (isLoading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-corporate-blue" />
        </main>
      </>
    )
  }

  // SQL Modal
  const SqlModal = () => showSqlModal ? (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-20 bg-black/60 backdrop-blur-sm" onClick={() => setShowSqlModal(false)}>
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl p-8 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-black">Crear tabla en Supabase</h3>
        <p className="text-sm text-gray-500">Copia y pega este SQL en <strong>Supabase Studio → SQL Editor</strong> y ejecuta (Run):</p>
        <div className="relative">
          <pre className="bg-gray-950 text-green-400 text-xs p-4 rounded-xl overflow-x-auto font-mono leading-relaxed">
{`CREATE TABLE IF NOT EXISTS public.terminals (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id                    SERIAL PRIMARY KEY,
  terminal_id           INTEGER REFERENCES public.terminals(id),
  cashier_name          TEXT,
  opened_at             TIMESTAMPTZ DEFAULT NOW(),
  closed_at             TIMESTAMPTZ,
  opening_amount        NUMERIC(12,0) NOT NULL,
  closing_amount        NUMERIC(12,0),
  total_cash_sales      NUMERIC(12,0) DEFAULT 0,
  total_card_sales      NUMERIC(12,0) DEFAULT 0,
  total_transfer_sales  NUMERIC(12,0) DEFAULT 0,
  notes                 TEXT,
  status                TEXT DEFAULT 'open'
);

ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.terminals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.cash_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all_settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.terminals (name, description) VALUES ('Caja 1', 'Terminal principal') ON CONFLICT DO NOTHING;`}
          </pre>
          <button
            className="absolute top-3 right-3 bg-gray-800 text-white text-xs px-3 py-1 rounded-lg hover:bg-gray-700"
            onClick={() => { 
                const sql = `CREATE TABLE IF NOT EXISTS public.terminals (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cash_sessions (
  id                    SERIAL PRIMARY KEY,
  terminal_id           INTEGER REFERENCES public.terminals(id),
  cashier_name          TEXT,
  opened_at             TIMESTAMPTZ DEFAULT NOW(),
  closed_at             TIMESTAMPTZ,
  opening_amount        NUMERIC(12,0) NOT NULL,
  closing_amount        NUMERIC(12,0),
  total_cash_sales      NUMERIC(12,0) DEFAULT 0,
  total_card_sales      NUMERIC(12,0) DEFAULT 0,
  total_transfer_sales  NUMERIC(12,0) DEFAULT 0,
  notes                 TEXT,
  status                TEXT DEFAULT 'open'
);

ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON public.terminals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON public.cash_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all_settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.terminals (name, description) VALUES ('Caja 1', 'Terminal principal') ON CONFLICT DO NOTHING;`;
                navigator.clipboard.writeText(sql); 
                toast.success('SQL copiado al portapapeles') 
            }}
          >
            Copiar
          </button>
        </div>
        <p className="text-xs text-gray-400">Después de ejecutarlo, regresa aquí y haz clic en <strong>Inicializar BD</strong> nuevamente.</p>
        <Button onClick={() => setShowSqlModal(false)} className="w-full rounded-xl">Cerrar</Button>
      </div>
    </div>
  ) : null

  return (
    <>
      <Header />
      <SqlModal />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <AdminSidebar activePath="/admin/configuracion" />

            {/* Main Content */}
            <div className="flex-1 space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración General</h1>
                  <p className="text-gray-600 dark:text-gray-400">Administra todos los parámetros del sistema</p>
                </div>
                <div className="flex items-center gap-3">
                  {usingDefaults && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full font-medium border border-amber-200">
                        ⚠ Tabla no inicializada
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 rounded-full border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/settings/init', { method: 'POST' })
                            const data = await res.json()
                            if (data.requiresManualSetup) {
                              setSqlScript(data.sql)
                              setShowSqlModal(true)
                            } else if (data.created || data.alreadyExists) {
                              toast.success('¡Tabla inicializada! Guarda la configuración.')
                              setUsingDefaults(false)
                            }
                          } catch { toast.error('Error al inicializar') }
                        }}
                      >
                        Inicializar BD
                      </Button>
                    </div>
                  )}
                  <Button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className="bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl px-6 h-11 font-bold shadow-lg shadow-corporate-blue/20 flex items-center gap-2"
                  >
                    {saveStatus === 'saving' && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saveStatus === 'saved' && <CheckCircle className="w-4 h-4" />}
                    {saveStatus === 'error' && <AlertCircle className="w-4 h-4" />}
                    {saveStatus === 'idle' && <Save className="w-4 h-4" />}
                    {saveStatus === 'saving' ? 'Guardando...' : saveStatus === 'saved' ? 'Guardado ✓' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                      activeTab === tab.id 
                        ? 'bg-corporate-blue text-white shadow-md shadow-corporate-blue/20' 
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab: Tienda */}
              {activeTab === 'store' && (
                <div className="space-y-4">
                  <SectionCard title="Información de la Tienda" description="Datos que aparecen en el header, footer y recibos.">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Nombre de la tienda">
                        <Input className="rounded-xl h-11" value={store.name} onChange={e => setStore({...store, name: e.target.value})} placeholder="AustralMarket" />
                      </Field>
                      <Field label="Slogan">
                        <Input className="rounded-xl h-11" value={store.slogan} onChange={e => setStore({...store, slogan: e.target.value})} placeholder="Tu supermercado online" />
                      </Field>
                      <Field label="Teléfono">
                        <Input className="rounded-xl h-11" value={store.phone} onChange={e => setStore({...store, phone: e.target.value})} placeholder="+56 9 1234 5678" />
                      </Field>
                      <Field label="Email de contacto">
                        <Input className="rounded-xl h-11" type="email" value={store.email} onChange={e => setStore({...store, email: e.target.value})} placeholder="contacto@austral.cl" />
                      </Field>
                      <Field label="Ciudad / Región" hint="Se muestra en el topbar y boletas">
                        <Input className="rounded-xl h-11" value={store.city} onChange={e => setStore({...store, city: e.target.value})} placeholder="Castro, Chiloé, Chile" />
                      </Field>
                      <Field label="Sitio web">
                        <Input className="rounded-xl h-11" value={store.website} onChange={e => setStore({...store, website: e.target.value})} placeholder="https://..." />
                      </Field>
                    </div>
                    <Field label="Dirección física" hint="Para boletas electrónicas SII">
                      <Input className="rounded-xl h-11" value={store.address} onChange={e => setStore({...store, address: e.target.value})} placeholder="Av. Los Robles 123" />
                    </Field>
                  </SectionCard>
                </div>
              )}

              {/* Tab: POS */}
              {activeTab === 'pos' && (
                <div className="space-y-4">
                  <SectionCard title="Configuración del Terminal" description="Parámetros generales del punto de venta físico.">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Nombre del terminal" hint="Aparece en los recibos">
                        <Input className="rounded-xl h-11" value={pos.terminalName} onChange={e => setPos({...pos, terminalName: e.target.value})} placeholder="Caja 1" />
                      </Field>
                      <Field label="IVA (%)" hint="Impuesto al valor agregado">
                        <Input className="rounded-xl h-11" type="number" min="0" max="50" value={pos.taxRate} onChange={e => setPos({...pos, taxRate: Number(e.target.value)})} />
                      </Field>
                      <Field label="Moneda">
                        <select className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 text-sm" value={pos.currency} onChange={e => setPos({...pos, currency: e.target.value})}>
                          <option value="CLP">CLP — Peso Chileno</option>
                          <option value="USD">USD — Dólar</option>
                        </select>
                      </Field>
                      <Field label="Alerta de stock bajo (unidades)">
                        <Input className="rounded-xl h-11" type="number" min="1" value={pos.lowStockThreshold} onChange={e => setPos({...pos, lowStockThreshold: Number(e.target.value)})} />
                      </Field>
                    </div>
                    <Field label="Mensaje en el recibo de venta">
                      <Textarea className="rounded-xl" value={pos.receiptMessage} onChange={e => setPos({...pos, receiptMessage: e.target.value})} placeholder="¡Gracias por su compra!" rows={2} />
                    </Field>
                  </SectionCard>

                  <SectionCard title="Métodos de Pago Físico" description="Formas de pago aceptadas en el POS. Activa solo los que uses para que aparezcan en el cobro.">
                    <div className="space-y-3">
                      <Toggle checked={pos.paymentCash} onCheckedChange={v => setPos({...pos, paymentCash: v})} label="💵  Efectivo" />
                      <div className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Terminales / Lectores de Tarjeta</p>
                        <Toggle checked={pos.paymentTransbank} onCheckedChange={v => setPos({...pos, paymentTransbank: v})} label="💳  Transbank (POS físico)" />
                        <Toggle checked={pos.paymentGetnet} onCheckedChange={v => setPos({...pos, paymentGetnet: v})} label="💳  GetNet (Santander)" />
                        <Toggle checked={pos.paymentTuu} onCheckedChange={v => setPos({...pos, paymentTuu: v})} label="💳  Tuu (ex-ComprAquí)" />
                        <Toggle checked={pos.paymentSumup} onCheckedChange={v => setPos({...pos, paymentSumup: v})} label="💳  SumUp" />
                        <Toggle checked={pos.paymentOtherCard} onCheckedChange={v => setPos({...pos, paymentOtherCard: v})} label="💳  Otro lector de tarjeta" />
                      </div>
                      <Toggle checked={pos.paymentTransfer} onCheckedChange={v => setPos({...pos, paymentTransfer: v})} label="📱  Transferencia bancaria (CuentaRUT, banco, etc.)" />
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        ℹ️ Estos terminales funcionan de forma <strong>independiente</strong> del software POS — el lector de tarjeta procesa el pago por su cuenta. El POS solo registra que el cobro fue "con tarjeta". Los pagos online (Flow, Webpay) están en la pestaña <strong>"Pagos Online"</strong>.
                      </p>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Tab: Terminales */}
              {activeTab === 'terminals' && (
                <div className="space-y-4">
                  <SectionCard title="Gestión de Cajas / Terminales" description="Configura los puntos de venta físicos de tu local.">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input 
                          placeholder="Nombre de la nueva caja (ej: Caja 2)" 
                          className="rounded-xl h-11"
                          value={newTerminalName}
                          onChange={e => setNewTerminalName(e.target.value)}
                        />
                        <Button 
                          onClick={async () => {
                            if (!newTerminalName) return
                            const res = await fetch('/api/terminals', {
                              method: 'POST',
                              body: JSON.stringify({ name: newTerminalName })
                            })
                            if (res.ok) {
                              setNewTerminalName('')
                              const data = await res.json()
                              setTerminalsList([...terminalsList, data])
                              toast.success('Caja creada')
                            }
                          }}
                          className="bg-corporate-blue text-white rounded-xl px-6"
                        >
                          Agregar
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        {terminalsList.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                <Monitor className="w-5 h-5 text-corporate-blue" />
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white">{t.name}</p>
                                <p className="text-xs text-gray-500 uppercase font-black tracking-tighter">Terminal ID: {t.id}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                  <span className="text-xs font-bold text-gray-500">{t.is_active ? 'ACTIVO' : 'INACTIVO'}</span>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-red-500 hover:bg-red-50"
                                  onClick={async () => {
                                      if (!confirm(`¿Desactivar ${t.name}?`)) return
                                      const res = await fetch(`/api/terminals/${t.id}`, { method: 'DELETE' })
                                      if (res.ok) {
                                          setTerminalsList(terminalsList.map(item => item.id === t.id ? { ...item, is_active: false } : item))
                                          toast.success('Terminal desactivado')
                                      }
                                  }}
                                >
                                  Desactivar
                                </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Tab: Pagos Online */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950 rounded-xl border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                      🛒 Estos métodos de pago aplican <strong>solo para la tienda online</strong> (carrito → checkout). No se usan en el POS físico.
                    </p>
                  </div>

                  <SectionCard title="Flow — Pagos en línea" description="Pasarela para recibir pagos online desde la tienda web.">
                    <Toggle checked={payments.flowEnabled} onCheckedChange={v => setPayments({...payments, flowEnabled: v})} label="Habilitar Flow en la tienda online" />
                    {payments.flowEnabled && (
                      <div className="grid md:grid-cols-2 gap-4 mt-4">
                        <Field label="API Key de Flow">
                          <SecretInput value={payments.flowApiKey} onChange={v => setPayments({...payments, flowApiKey: v})} />
                        </Field>
                        <Field label="API Secret de Flow">
                          <SecretInput value={payments.flowApiSecret} onChange={v => setPayments({...payments, flowApiSecret: v})} />
                        </Field>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Transbank Webpay Plus — Pago online" description="Webpay para transacciones desde la tienda web (distinto del POS físico).">
                    <Toggle checked={payments.webpayEnabled} onCheckedChange={v => setPayments({...payments, webpayEnabled: v})} label="Habilitar Transbank Webpay en la tienda online" />
                    {payments.webpayEnabled && (
                      <div className="mt-4">
                        <Field label="Commerce Code">
                          <Input className="rounded-xl h-11" value={payments.webpayCommerceCode} onChange={e => setPayments({...payments, webpayCommerceCode: e.target.value})} placeholder="597055555532" />
                        </Field>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Envío a domicilio" description="Configuración del costo de envío en la tienda online.">
                    <Field label="Monto mínimo para envío gratis ($CLP)" hint="Se muestra en el topbar de la tienda">
                      <Input className="rounded-xl h-11" type="number" min="0" value={payments.freeShippingMin} onChange={e => setPayments({...payments, freeShippingMin: Number(e.target.value)})} />
                    </Field>
                  </SectionCard>
                </div>
              )}

              {/* Tab: SII */}
              {activeTab === 'sii' && (
                <div className="space-y-4">
                  <SectionCard title="Datos del Emisor (SII)" description="Información para generar boletas electrónicas válidas ante el SII.">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="RUT del Emisor">
                        <Input className="rounded-xl h-11 font-mono" value={sii.rut} onChange={e => setSii({...sii, rut: e.target.value})} placeholder="12345678-9" />
                      </Field>
                      <Field label="Razón Social">
                        <Input className="rounded-xl h-11" value={sii.razonSocial} onChange={e => setSii({...sii, razonSocial: e.target.value})} placeholder="Tu Supermercado SpA" />
                      </Field>
                      <Field label="Giro">
                        <Input className="rounded-xl h-11" value={sii.giro} onChange={e => setSii({...sii, giro: e.target.value})} placeholder="Supermercado" />
                      </Field>
                      <Field label="Código de Actividad">
                        <Input className="rounded-xl h-11 font-mono" value={sii.actividad} onChange={e => setSii({...sii, actividad: e.target.value})} placeholder="522030" />
                      </Field>
                      <Field label="Dirección del local">
                        <Input className="rounded-xl h-11" value={sii.direccion} onChange={e => setSii({...sii, direccion: e.target.value})} placeholder="Av. Los Robles 123" />
                      </Field>
                      <Field label="Comuna">
                        <Input className="rounded-xl h-11" value={sii.comuna} onChange={e => setSii({...sii, comuna: e.target.value})} placeholder="Castro" />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title="SimpleAPI — Boletas Electrónicas" description="Credenciales para el servicio de emisión de boletas.">
                    <Field label="API Key de SimpleAPI" hint="Credencial para emitir boletas electrónicas">
                      <SecretInput value={sii.simpleApiKey} onChange={v => setSii({...sii, simpleApiKey: v})} placeholder="0000-0000-0000-0000-0000" />
                    </Field>
                  </SectionCard>
                </div>
              )}

              {/* Tab: Apariencia */}
              {activeTab === 'appearance' && (
                <div className="space-y-4">
                  <SectionCard title="Logotipo y Branding" description="Personaliza la imagen visual de la tienda.">
                    <Field label="URL del Logo" hint="Imagen cuadrada recomendada (PNG o SVG con fondo transparente)">
                      <Input className="rounded-xl h-11" value={appearance.logoUrl} onChange={e => setAppearance({...appearance, logoUrl: e.target.value})} placeholder="https://..." />
                    </Field>
                    {appearance.logoUrl && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center gap-4">
                        <img src={appearance.logoUrl} alt="Logo preview" className="w-16 h-16 object-contain rounded-lg border border-gray-200" onError={e => (e.currentTarget.style.display = 'none')} />
                        <p className="text-sm text-gray-500">Vista previa del logo</p>
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Colores" description="Paleta de colores del sistema.">
                    <div className="grid md:grid-cols-2 gap-6">
                      <Field label="Color Primario (azul corporativo)">
                        <div className="flex gap-3">
                          <input type="color" value={appearance.primaryColor} onChange={e => setAppearance({...appearance, primaryColor: e.target.value})} className="w-14 h-11 rounded-xl cursor-pointer border border-gray-200 p-1" />
                          <Input className="rounded-xl h-11 font-mono flex-1" value={appearance.primaryColor} onChange={e => setAppearance({...appearance, primaryColor: e.target.value})} placeholder="#1e3a6e" />
                        </div>
                      </Field>
                      <Field label="Color Secundario (amarillo acento)">
                        <div className="flex gap-3">
                          <input type="color" value={appearance.secondaryColor} onChange={e => setAppearance({...appearance, secondaryColor: e.target.value})} className="w-14 h-11 rounded-xl cursor-pointer border border-gray-200 p-1" />
                          <Input className="rounded-xl h-11 font-mono flex-1" value={appearance.secondaryColor} onChange={e => setAppearance({...appearance, secondaryColor: e.target.value})} placeholder="#f5c518" />
                        </div>
                      </Field>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: appearance.primaryColor }} />
                      <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: appearance.secondaryColor }} />
                      <span className="text-sm text-gray-500">Vista previa de la paleta</span>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Tab: Loyalty */}
              {activeTab === 'loyalty' && (
                <div className="space-y-4">
                  <SectionCard title="Configuración de Fidelización" description="Gestiona cómo tus clientes acumulan y usan sus puntos.">
                    <Toggle 
                      checked={loyalty.enabled} 
                      onCheckedChange={v => setLoyalty({...loyalty, enabled: v})} 
                      label="Habilitar sistema de puntos" 
                    />
                    
                    {loyalty.enabled && (
                      <div className="grid md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <Field label="Tasa de Acumulación" hint="Cuántos pesos equivalen a 1 punto">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-400">$</span>
                            <Input 
                              type="number" 
                              className="rounded-xl h-11" 
                              value={loyalty.accumulationRate} 
                              onChange={e => setLoyalty({...loyalty, accumulationRate: Number(e.target.value)})} 
                            />
                            <span className="text-sm font-bold text-gray-400">= 1 pto</span>
                          </div>
                        </Field>
                        
                        <Field label="Valor del Punto" hint="Cuánto descuento da 1 punto">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-gray-400">1 pto = $</span>
                            <Input 
                              type="number" 
                              className="rounded-xl h-11" 
                              value={loyalty.redemptionRate} 
                              onChange={e => setLoyalty({...loyalty, redemptionRate: Number(e.target.value)})} 
                            />
                          </div>
                        </Field>

                        <Field label="Mínimo para canjear" hint="Puntos necesarios para empezar a usar">
                          <Input 
                            type="number" 
                            className="rounded-xl h-11" 
                            value={loyalty.minRedemption} 
                            onChange={e => setLoyalty({...loyalty, minRedemption: Number(e.target.value)})} 
                          />
                        </Field>

                        <div className="flex flex-col justify-end">
                          <Toggle 
                            checked={loyalty.requireIdVerification} 
                            onCheckedChange={v => setLoyalty({...loyalty, requireIdVerification: v})} 
                            label="Exigir validación de Carnet (primera vez)" 
                          />
                        </div>
                      </div>
                    )}
                  </SectionCard>

                  <div className="p-4 bg-green-50 dark:bg-green-950 rounded-2xl border border-green-100 dark:border-green-900 flex gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shrink-0 border border-green-200">
                      <Award className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-green-900 dark:text-green-100">Resumen de Rentabilidad</p>
                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                        Con esta configuración, un cliente que gasta <strong>$10.000</strong> recibirá <strong>{Math.floor(10000 / (loyalty.accumulationRate || 1))} puntos</strong>, 
                        lo que equivale a <strong>${Math.floor((10000 / (loyalty.accumulationRate || 1)) * (loyalty.redemptionRate || 1))}</strong> de descuento (un <strong>{((loyalty.redemptionRate / loyalty.accumulationRate) * 100).toFixed(1)}%</strong> de cashback).
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
