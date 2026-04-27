'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  Settings, Store, Monitor, CreditCard, FileText, Palette,
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  Save, CheckCircle, AlertCircle, Loader2, Eye, EyeOff,
  Banknote, Wifi, Receipt, Terminal, Award, HelpCircle, ShieldCheck, Key, X,
  Image as ImageIcon, Maximize2, Info, Sparkles, ExternalLink
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AdminHeader } from '@/components/admin/AdminHeader'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { useAuthStore } from '@/stores/authStore'
import { useSaaS } from '@/providers/SaaSProvider'
import { cn } from '@/lib/utils'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const TABS = [
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'pos', label: 'POS', icon: Monitor },
  { id: 'terminals', label: 'Terminales', icon: Terminal },
  { id: 'payments', label: 'Pagos Online', icon: CreditCard },
  { id: 'loyalty', label: 'Fidelización', icon: Award },
  { id: 'appearance', label: 'Branding', icon: Palette },
  { id: 'design', label: 'Editor Visual', icon: Monitor },
]

function SectionCard({ title, description, children, icon: Icon }: { title: string, description?: string, children: React.ReactNode, icon?: any }) {
  return (
    <div className="glass-card overflow-hidden group hover:border-corporate-blue/30 transition-all duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center gap-4">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-corporate-blue/10 flex items-center justify-center text-corporate-blue">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">
            {title}
          </h3>
          {description && <p className="text-xs text-gray-500 font-medium mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="p-6 space-y-6">
        {children}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string, hint?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end px-1">
        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          {label}
        </Label>
        {hint && <span className="text-[10px] text-gray-400 font-medium italic">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function SecretInput({ value, onChange, placeholder }: { value: string, onChange: (v: string) => void, placeholder?: string }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative group">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••••••'}
        className="rounded-xl h-12 bg-white/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:ring-corporate-blue/20 transition-all pr-12 font-mono"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-corporate-blue hover:bg-corporate-blue/10 transition-all"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

function Toggle({ checked, onCheckedChange, label, description }: { checked: boolean, onCheckedChange: (v: boolean) => void, label: string, description?: string }) {
  return (
    <div 
      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
        checked 
          ? 'bg-corporate-blue/5 border-corporate-blue/20 ring-1 ring-corporate-blue/20' 
          : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className="pt-0.5">
        <Checkbox 
          checked={checked} 
          onCheckedChange={v => onCheckedChange(!!v)} 
          id={label}
          className="rounded-md border-gray-300 data-[state=checked]:bg-corporate-blue data-[state=checked]:border-corporate-blue"
        />
      </div>
      <div className="flex-1 space-y-1">
        <Label htmlFor={label} className="text-sm font-black uppercase tracking-tight cursor-pointer block">
          {label}
        </Label>
        {description && <p className="text-xs text-gray-500 font-medium leading-relaxed">{description}</p>}
      </div>
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
  const [loyalty, setLoyalty] = useState({ enabled: true, minRedemption: 0, accumulationRate: 100, redemptionRate: 1, requireIdVerification: true })
  const [appearance, setAppearance] = useState({ logoUrl: '', primaryColor: '#1e3a6e', secondaryColor: '#f5c518', darkMode: false })
  const [design, setDesign] = useState({
    heroImage: '',
    heroTitle: '',
    showPromotions: true,
    productCardStyle: 'glass',
    bannerType: 'simple'
  })
  const [terminalsList, setTerminalsList] = useState<any[]>([])
  const [newTerminalName, setNewTerminalName] = useState('')

  const { user: authUser } = useAuthStore()
  const { config: saasConfig } = useSaaS()

  // Control de Acceso: Dueño, Gerente o Desarrollador
  const role = authUser?.role || ''
  const hasFullAccess = ['admin', 'owner', 'manager', 'developer'].includes(role)
  const isBasicPlan = saasConfig.tier === 'basico'
  const isDev = role === 'developer' || role === 'admin'

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ settings, usingDefaults }) => {
        if (settings) {
          setStore(settings.store)
          setPos(settings.pos)
          setPayments(settings.payments)
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
  }, [store, pos, payments, appearance, loyalty])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-corporate-blue" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400 animate-pulse">Cargando Configuración...</p>
      </div>
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
      <SqlModal />
      <div className="space-y-8">
        {/* Header section with Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                    Configuración <span className="text-corporate-blue">General</span>
                  </h1>
                  <p className="text-gray-500 text-sm font-medium">Administra todos los parámetros del sistema</p>
                </div>
                
                <div className="flex items-center gap-3">
                  {usingDefaults && (
                    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 px-4 py-2 rounded-2xl border border-amber-200 dark:border-amber-800">
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-black uppercase tracking-widest">
                        ⚠ Tabla no inicializada
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[10px] h-7 rounded-lg border-amber-300 text-amber-700 hover:bg-amber-50 uppercase font-black"
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
                    className="bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl px-8 h-12 font-black uppercase tracking-widest shadow-lg shadow-corporate-blue/20 flex items-center gap-3"
                  >
                    {saveStatus === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saveStatus === 'saving' ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </div>
              </div>

              {/* Tabs Toolbar */}
              <div className="glass-card p-1.5 flex gap-1.5 overflow-x-auto">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                      activeTab === tab.id 
                        ? 'bg-corporate-blue text-white shadow-lg shadow-corporate-blue/20' 
                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'
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
                <div className={cn("space-y-4 relative", !hasFullAccess && "grayscale opacity-60 pointer-events-none select-none")}>
                  {!hasFullAccess && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-[2px]">
                      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-xl border border-amber-200 flex flex-col items-center text-center gap-3 max-w-xs">
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                          <Settings className="w-6 h-6 text-amber-600" />
                        </div>
                        <h4 className="font-black text-amber-900 dark:text-amber-100 uppercase tracking-tighter">Acceso Restringido</h4>
                        <p className="text-xs text-amber-800 dark:text-amber-200">Esta sección solo puede ser configurada por el <strong>Dueño</strong> o <strong>Gerente</strong> del negocio.</p>
                      </div>
                    </div>
                  )}
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

                  <SectionCard title="Categorías del POS" description="Personaliza las categorías que aparecen en el panel de ventas.">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder="Nombre de categoría (ej: Panadería)" className="rounded-xl h-11" />
                        <Button className="bg-patagonia-600 text-white rounded-xl px-6">Agregar</Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {['Abarrotes', 'Bebidas', 'Carnes', 'Frutas y Verduras', 'Limpieza', 'Lácteos', 'Congelados'].map(c => (
                          <div key={c} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center group">
                            <span className="text-sm font-bold">{c}</span>
                            <button className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Sincronización y Seguridad" description="Configura el comportamiento de respaldo automático.">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="Intervalo de Sincronización (segundos)" hint="Tiempo entre respaldos automáticos">
                        <Input className="rounded-xl h-11" type="number" defaultValue={5} />
                      </Field>
                      <Field label="Persistencia de Sesión" hint="Mantener carrito tras cerrar navegador">
                        <Toggle checked={true} onCheckedChange={() => {}} label="Habilitado" />
                      </Field>
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

              {/* Tab: Diseño (Visual Editor) */}
              {activeTab === 'design' && (
                <div className="space-y-6">
                  <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-900/50 flex gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shrink-0 border border-purple-200">
                      <Sparkles className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black italic uppercase text-purple-900 dark:text-purple-100 tracking-tighter">Editor Visual Inteligente</p>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        Personaliza cómo se ve tu tienda online. Sigue las guías de imagen para mantener un aspecto premium y profesional.
                      </p>
                    </div>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Hero Section Config */}
                    <SectionCard 
                      title="Banner Principal (Hero)" 
                      description="La primera imagen que verán tus clientes al entrar."
                      icon={ImageIcon}
                    >
                      <div className="space-y-4">
                        <div className="relative aspect-video rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-white/10 overflow-hidden group">
                          {design.heroImage ? (
                            <img src={design.heroImage} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                              <ImageIcon className="w-8 h-8" />
                              <span className="text-[10px] font-black uppercase">Click para subir banner</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="sm" className="bg-white text-black hover:bg-gray-100 rounded-xl">Cambiar Imagen</Button>
                          </div>
                        </div>

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 space-y-2">
                          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                            <Info className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Guía de Estilo: Banner</span>
                          </div>
                          <ul className="text-[11px] text-blue-600/80 dark:text-blue-400/80 space-y-1 list-disc pl-4">
                            <li><strong>Tamaño recomendado:</strong> 1920x600px (o 16:9).</li>
                            <li><strong>Contenido:</strong> Usa fotos de tu local o un ambiente general que represente tu marca.</li>
                            <li><strong>Calidad:</strong> Evita fotos con mucho texto, ya que el sistema pondrá el texto encima.</li>
                          </ul>
                          <a 
                            href="https://squoosh.app/" 
                            target="_blank" 
                            className="flex items-center gap-1.5 text-[10px] font-bold text-corporate-blue hover:underline mt-2"
                          >
                            Optimizar tamaño de imagen sin perder calidad <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>

                        <Field label="Título sobre el Banner">
                          <Input 
                            className="rounded-xl h-11" 
                            placeholder="Ej: Calidad que se siente en cada compra" 
                            value={design.heroTitle}
                            onChange={e => setDesign({...design, heroTitle: e.target.value})}
                          />
                        </Field>
                      </div>
                    </SectionCard>

                    {/* Product Grid Config */}
                    <SectionCard 
                      title="Sección de Productos" 
                      description="Configura cómo se muestran tus productos destacados."
                      icon={Package}
                    >
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Estilo de Tarjeta</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setDesign({...design, productCardStyle: 'glass'})}
                              className={cn(
                                "p-4 rounded-2xl border text-left transition-all",
                                design.productCardStyle === 'glass' ? "border-corporate-blue bg-corporate-blue/5 ring-1 ring-corporate-blue/10" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
                              )}
                            >
                              <div className="w-full aspect-square bg-white/50 dark:bg-white/10 rounded-lg mb-2 shadow-sm border border-white/20" />
                              <span className="text-[10px] font-black uppercase">Glassmorphism</span>
                            </button>
                            <button 
                              onClick={() => setDesign({...design, productCardStyle: 'minimal'})}
                              className={cn(
                                "p-4 rounded-2xl border text-left transition-all",
                                design.productCardStyle === 'minimal' ? "border-corporate-blue bg-corporate-blue/5 ring-1 ring-corporate-blue/10" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
                              )}
                            >
                              <div className="w-full aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg mb-2" />
                              <span className="text-[10px] font-black uppercase">Minimalista</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                            <Info className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Consejo de Fotografía</span>
                          </div>
                          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">
                            <strong>¡Importante!</strong> Para las fotos de producto, usa fondos neutros (blanco o gris claro). No pongas fotos de tu negocio aquí, solo del producto individual.
                          </p>
                        </div>

                        <Toggle 
                          checked={design.showPromotions} 
                          onCheckedChange={v => setDesign({...design, showPromotions: v})} 
                          label="Mostrar Etiqueta de 'Oferta'" 
                          description="Resalta automáticamente los productos que tengan precio rebajado."
                        />
                      </div>
                    </SectionCard>
                  </div>

                  <SectionCard title="Sorteos y Promociones" description="Funciones avanzadas para aumentar ventas." icon={Sparkles}>
                     <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600">
                          <Sparkles className="w-8 h-8" />
                        </div>
                        <div>
                          <h4 className="font-black italic uppercase tracking-tighter text-lg">Módulo de Sorteos IA</h4>
                          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1">Crea sorteos automáticos para tus seguidores y clientes. Esta función es parte del <strong>Centro de Innovación</strong>.</p>
                        </div>
                        <Button 
                           onClick={() => {
                              // Esto abriría el modal de innovación desde el header o similar
                              // Por ahora mostramos un toast informativo
                              toast.info('Solicita la activación en el Centro de Innovación IA (Arriba a la derecha)')
                           }}
                           className="bg-corporate-blue rounded-xl px-8 uppercase font-black italic text-xs tracking-widest"
                        >
                           Solicitar Implementación
                        </Button>
                     </div>
                  </SectionCard>
                </div>
              )}
      </div>
    </>
  )
}
