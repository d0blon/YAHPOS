/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { 
  Settings, Store, Monitor, CreditCard, FileText, Palette,
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  Save, CheckCircle, AlertCircle, Loader2, Eye, EyeOff,
  Banknote, Wifi, Receipt, Terminal, Award, HelpCircle, ShieldCheck, Key, X,
  Image as ImageIcon, Maximize2, Info, Sparkles, ExternalLink,
  Check, Zap, ArrowRight, Shield
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { useSaaS } from '@/providers/SaaSProvider'
import { cn } from '@/lib/utils'
import { CHILE_REGIONS } from '@/lib/chile-geography'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const TABS = [
  { id: 'store', label: 'Tienda', icon: Store },
  { id: 'billing', label: 'Plan / Suscripción', icon: CreditCard },
  { id: 'pos', label: 'POS', icon: Monitor },
  { id: 'terminals', label: 'Terminales', icon: Terminal },
  { id: 'receipts', label: 'Boleta / Recibo', icon: FileText },
  { id: 'payments', label: 'Pagos Online', icon: CreditCard },
  { id: 'sii', label: 'Facturación SII', icon: Receipt },
  { id: 'loyalty', label: 'Fidelización', icon: Award },
  { id: 'design', label: 'Editor Visual', icon: Monitor },
]

function safeCafDetail(value: unknown): string {
  if (typeof value === 'string') {
    const text = value.trim();
    return text.length <= 400 && !/-----BEGIN|<[A-Za-z!/]|[A-Za-z0-9+/]{80,}/.test(text) ? text : '';
  }
  if (Array.isArray(value)) {
    return value.map(safeCafDetail).filter(Boolean).join('; ');
  }
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const message = safeCafDetail(item.message);
    const path = typeof item.path === 'string' && /^[A-Za-z0-9_.-]{1,60}$/.test(item.path) ? item.path : '';
    return message && path ? `${path}: ${message}` : message;
  }
  return '';
}

function cafErrorMessage(data: unknown, fallback: string): string {
  const payload = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const rawCode = typeof payload.code === 'string' ? payload.code.trim() : '';
  const code = /^[A-Za-z0-9_-]{2,40}$/.test(rawCode) ? rawCode : '';
  const rawError = typeof payload.error === 'string' ? payload.error.trim() : '';
  const error = rawError && rawError.length <= 400 && !/-----BEGIN|<[A-Za-z!/]|[A-Za-z0-9+/]{80,}/.test(rawError) ? rawError : fallback;
  const details = safeCafDetail(payload.details);
  return [code ? `[${code}]` : '', error, details].filter(Boolean).join(' — ');
}

function ReceiptPreview({ settings, store, appearance }: { settings: any, store: any, appearance: any }) {
  return (
    <div className="bg-gray-100 dark:bg-black/40 p-8 rounded-3xl flex justify-center">
      <div className="w-[300px] bg-white text-black p-6 shadow-2xl font-mono text-[10px] leading-relaxed relative overflow-hidden">
        {/* Double border decoration - premium design */}
        <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600" />
        <div className="absolute top-2 left-0 w-full h-px bg-red-300" />
        
        <div className="text-center space-y-1 mb-4">
          {/* Logo preview if available */}
          {appearance?.logoUrl && (
            <div className="flex justify-center mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={appearance.logoUrl} 
                alt="Logo" 
                className={`h-10 w-auto object-contain ${settings.colorMode === 'bw' ? 'grayscale' : ''}`}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}
          <div className="text-[12px] font-bold uppercase tracking-tighter">{store.name || 'AustralMarket'}</div>
          <div>{store.address || 'Calle Principal 123'}</div>
          <div>{store.city || 'Castro, Chiloé'}</div>
          <div>RUT: {store.rut || '76.123.456-7'}</div>
        </div>

        <div className="border-y border-dashed border-gray-300 py-2 my-2 space-y-1">
          <div className="flex justify-between">
            <span>BOLETA ELECTRÓNICA</span>
            <span className="font-bold">N° 000123</span>
          </div>
          <div>FECHA: {new Date().toLocaleDateString()}</div>
        </div>

        <div className="space-y-1 mb-4">
          <div className="flex justify-between font-bold border-b border-gray-100 pb-1">
            <span>ITEM</span>
            <span>TOTAL</span>
          </div>
          <div className="flex justify-between">
            <span>1x Producto de Prueba</span>
            <span>$10.000</span>
          </div>
          <div className="flex justify-between">
            <span>2x Item Especial</span>
            <span>$5.000</span>
          </div>
        </div>

        <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 text-right">
          <div className="flex justify-between text-[12px] font-bold">
            <span>TOTAL</span>
            <span>$15.000</span>
          </div>
        </div>

        {settings.showLoyalty && (
          <div className="mt-4 p-2 border border-gray-200 rounded text-center bg-gray-50">
            <div className="font-bold uppercase text-[8px]">{settings.loyaltyName || 'Puntos Patagonia'}</div>
            <div className="text-[12px] font-bold text-red-600">+150 PTS</div>
            <div className="text-[7px]">¡ESTÁS A 500 PTS DE TU PRÓXIMO REGALO!</div>
          </div>
        )}

        <div className="mt-6 text-center space-y-2">
          <div className="italic text-gray-600">"{settings.message || '¡Gracias por su compra!'}"</div>
          
          <div className="flex justify-center py-2">
            <div className="w-20 h-20 border-2 border-red-600 flex items-center justify-center font-bold text-red-600 text-center p-1 leading-tight">
              TIMBRE ELECTRÓNICO SII<br/>VER CONSULTE EN<br/>WWW.SII.CL
            </div>
          </div>

          {settings.showPoweredBy && (
            <div className="text-[7px] text-gray-400 mt-4 uppercase tracking-widest">
              {settings.poweredByText || 'Powered by YAHPOS!.cl'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SubscriptionTab() {
  const { config, storeId, refreshConfig } = useSaaS()
  const [tiers, setTiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/subscriptions')
      .then(res => res.json())
      .then(data => {
        setTiers(data.tiers || [])
        setLoading(false)
      })
  }, [])

  const handleUpdatePlan = async (tierId: string) => {
    setUpdating(tierId)
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_id: tierId })
      })
      
      if (res.ok) {
        toast.success('Plan actualizado con éxito')
        await refreshConfig()
      } else {
        toast.error('Error al actualizar el plan')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-sm font-medium text-gray-500 animate-pulse uppercase tracking-widest">Cargando planes...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Current Plan Summary */}
      <div className="glass-card p-8 bg-gradient-to-br from-brand-primary/5 via-transparent to-brand-primary/10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:opacity-10 transition-opacity">
          <Shield className="w-48 h-48 text-brand-primary" />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-brand-primary text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                Tu Plan Actual
              </Badge>
              <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">ID: {storeId?.substring(0, 8)}...</span>
            </div>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">
              YAHPOS! <span className="text-brand-primary">{config.tier}</span>
            </h2>
            <p className="text-gray-500 font-medium max-w-md leading-relaxed">
              Disfruta de todas las herramientas necesarias para hacer crecer tu negocio con el respaldo de YAHPOS!.
            </p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur px-6 py-4 rounded-2xl border border-white/20 shadow-xl shadow-brand-primary/5">
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Estado de cuenta</p>
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-black text-lg">
                <CheckCircle className="w-5 h-5" />
                <span>ACTIVA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <div 
            key={tier.id} 
            className={cn(
              "glass-card p-8 flex flex-col relative transition-all duration-500",
              config.tier?.toLowerCase() === tier.name.toLowerCase() 
                ? "ring-2 ring-brand-primary border-transparent bg-brand-primary/[0.02]" 
                : "hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-brand-primary/10"
            )}
          >
            {config.tier?.toLowerCase() === tier.name.toLowerCase() && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-primary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-primary/30 flex items-center gap-2">
                <Check className="w-3 h-3" />
                Plan Activo
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">{tier.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-brand-primary">${tier.price_clp?.toLocaleString('es-CL')}</span>
                <span className="text-xs text-gray-400 font-bold uppercase">/ mes</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Emisión de Boletas Electrónicas</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Inventario en Tiempo Real</span>
              </li>
              <li className={cn("flex items-start gap-3", !tier.has_loyalty && "opacity-40 grayscale")}>
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0", tier.has_loyalty ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-white/5")}>
                  {tier.has_loyalty ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-gray-400" />}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Módulo de Fidelización (Puntos)</span>
              </li>
              <li className={cn("flex items-start gap-3", !tier.has_ai_assistant && "opacity-40 grayscale")}>
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0", tier.has_ai_assistant ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-white/5")}>
                  {tier.has_ai_assistant ? <Check className="w-3 h-3 text-green-600" /> : <X className="w-3 h-3 text-gray-400" />}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Asistente IA (Predictor Stock)</span>
              </li>
            </ul>

            <Button
              disabled={config.tier?.toLowerCase() === tier.name.toLowerCase() || updating !== null}
              onClick={() => handleUpdatePlan(tier.id)}
              className={cn(
                "w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all",
                config.tier?.toLowerCase() === tier.name.toLowerCase()
                  ? "bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed"
                  : "bg-brand-primary hover:bg-brand-700 text-white shadow-xl shadow-brand-primary/10"
              )}
            >
              {updating === tier.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : config.tier?.toLowerCase() === tier.name.toLowerCase() ? (
                'Plan Actual'
              ) : (
                'Cambiar a este Plan'
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="flex items-center gap-4 p-6 rounded-2xl border border-brand-primary/10 bg-brand-primary/[0.01]">
        <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white mb-1">Pagos Procesados de forma segura</h4>
          <p className="text-xs text-gray-500 font-medium">Toda la facturación es procesada mediante Transbank/Webpay cumpliendo con los más altos estándares de seguridad PCI-DSS.</p>
        </div>
      </div>
    </div>
  )
}

function SectionCard({ title, description, children, icon: Icon }: { title: string, description?: string, children: React.ReactNode, icon?: any }) {
  return (
    <div className="glass-card overflow-hidden group hover:border-brand-primary/30 transition-all duration-300">
      <div className="p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center gap-4">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
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
    <form onSubmit={(e) => e.preventDefault()} className="relative group">
      <Input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••••••'}
        className="rounded-xl h-12 bg-white/50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:ring-brand-primary/20 transition-all pr-12 font-mono"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 transition-all"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </form>
  )
}

function SecretSettingField({ label, configured, value, onChange, placeholder }: { label: string, configured: boolean, value: string, onChange: (v: string) => void, placeholder?: string }) {
  return (
    <Field label={label} hint={configured ? 'Configurado' : undefined}>
      <div className="space-y-2">
        {configured && (
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-none px-3 py-1 rounded-lg flex items-center gap-1.5 w-fit">
            <CheckCircle className="w-3 h-3" /> Configurado — dejar vacío para reemplazar
          </Badge>
        )}
        <SecretInput value={value} onChange={onChange} placeholder={placeholder} />
      </div>
    </Field>
  )
}

function Toggle({ checked, onCheckedChange, label, description }: { checked: boolean, onCheckedChange: (v: boolean) => void, label: string, description?: string }) {
  return (
    <div 
      className={`flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
        checked 
          ? 'bg-brand-primary/5 border-brand-primary/20 ring-1 ring-brand-primary/20' 
          : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10'
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className="pt-0.5">
        <Checkbox 
          checked={checked} 
          onCheckedChange={v => onCheckedChange(!!v)} 
          id={label}
          className="rounded-md border-gray-300 data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary"
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
  
  // All settings state
  const [store, setStore] = useState({ name: '', slogan: '', address: '', city: '', commune: '', region: '', phone: '', email: '', website: '' })
  const [pos, setPos] = useState({ 
    terminalName: '', taxRate: 19, currency: 'CLP', lowStockThreshold: 5, receiptMessage: '',
    region: 'REGIONES' as string,
    paymentCash: true, 
    paymentTransbank: true,
    paymentGetnet: false,
    paymentTuu: false,
    paymentSumup: false,
    paymentOtherCard: false,
    paymentTransfer: true 
  })
  const [payments, setPayments] = useState({ flowEnabled: false, flowApiKeyConfigured: false, flowApiSecretConfigured: false, webpayEnabled: false, webpayCommerceCodeConfigured: false, freeShippingMin: 30000, tuuApiKey: '', tuuApiKeyConfigured: false, tuuTerminalSerial: '', mercadopagoAccessToken: '', mercadopagoAccessTokenConfigured: false, mercadopagoTerminalId: '' })
  const [paymentSecrets, setPaymentSecrets] = useState({ flowApiKey: '', flowApiSecret: '', webpayCommerceCode: '' })
  const [loyalty, setLoyalty] = useState({ enabled: true, minRedemption: 0, accumulationRate: 100, redemptionRate: 1, requireIdVerification: true, name: 'Puntos' })
  const [appearance, setAppearance] = useState({ logoUrl: '', primaryColor: '#4b0082', secondaryColor: '#FFD100', darkMode: false })
  const [design, setDesign] = useState({
    heroImage: '',
    heroTitle: '',
    showPromotions: true,
    productCardStyle: 'glass',
    bannerType: 'simple'
  })
  const [siiConfig, setSiiConfig] = useState({
    rut_emisor: '',
    razon_social: '',
    giro: '',
    acteco: '',
    direccion: '',
    comuna: '',
    ciudad: '',
    fch_resol: '',
    nro_resol: '',
    environment: 'certification',
    pfx_base64: '',
    password: '',
    cert_info: null as any,
    caf_xml: null as any,
  })
  const [pfxFile, setPfxFile] = useState<File | null>(null)
  const [validatingCert, setValidatingCert] = useState(false)
  const validarCertificado = async () => {
    if (!pfxFile) {
      toast.error('Selecciona primero el archivo .pfx / .p12')
      return
    }
    if (!siiConfig.password) {
      toast.error('Ingresa la contraseña del certificado antes de validar')
      return
    }
    setValidatingCert(true)
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '')
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(pfxFile)
      })
      const formData = new FormData()
      formData.append('pfx', pfxFile)
      formData.append('password', siiConfig.password)
      const response = await fetch('/api/wizard/certificado', { method: 'POST', body: formData })
      const data = await response.json()
      if (response.ok) {
        setSiiConfig({ ...siiConfig, pfx_base64: base64, cert_info: data.data })
        toast.success(`✅ Certificado válido: ${data.data.rut} (${data.data.razonSocial})`)
      } else {
        toast.error(`❌ ${data.details ? `${data.error}: ${data.details}` : (data.error || 'Error al validar certificado')}`)
      }
    } catch {
      toast.error('Error al validar certificado')
    } finally {
      setValidatingCert(false)
    }
  }
  const [terminalsList, setTerminalsList] = useState<any[]>([])
  const [newTerminalName, setNewTerminalName] = useState('')
  const [receiptSettings, setReceiptSettings] = useState({
    message: '¡Gracias por su compra!',
    colorMode: 'bw' as 'bw' | 'color',
    showPoweredBy: true,
    poweredByText: 'YAHPOS!.cl',
    showLoyalty: true,
    loyaltyName: 'Puntos Patagonia'
  })

  const { user: authUser } = useAuthStore()
  const { config: saasConfig } = useSaaS()

  // Control de Acceso: Dueño, Gerente o Desarrollador
  const role = authUser?.role || ''
  const hasFullAccess = ['admin', 'owner', 'manager', 'developer'].includes(role)
  const isBasicPlan = saasConfig.tier === 'austral'
  const isDev = role === 'developer' || role === 'admin'

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(({ settings, usingDefaults }) => {
        if (settings) {
          setStore(settings.store)
          setPos(settings.pos)
          const p = settings.payments || {}
          // El API solo expone booleanos para secretos: nunca precargamos valores.
          setPayments({
            flowEnabled: !!p.flowEnabled,
            flowApiKeyConfigured: !!p.flowApiKeyConfigured,
            flowApiSecretConfigured: !!p.flowApiSecretConfigured,
            webpayEnabled: !!p.webpayEnabled,
            webpayCommerceCodeConfigured: !!p.webpayCommerceCodeConfigured,
            freeShippingMin: p.freeShippingMin ?? 30000,
            tuuApiKey: '',
            tuuApiKeyConfigured: !!p.tuuApiKeyConfigured,
            tuuTerminalSerial: p.tuuTerminalSerial || '',
            mercadopagoAccessToken: '',
            mercadopagoAccessTokenConfigured: !!p.mercadopagoAccessTokenConfigured,
            mercadopagoTerminalId: p.mercadopagoTerminalId || ''
          })
          setPaymentSecrets({ flowApiKey: '', flowApiSecret: '', webpayCommerceCode: '' })
          setLoyalty(settings.loyalty ? { ...{ enabled: true, minRedemption: 0, accumulationRate: 100, redemptionRate: 1, requireIdVerification: true, name: 'Puntos' }, ...settings.loyalty } : { enabled: true, minRedemption: 0, accumulationRate: 100, redemptionRate: 1, requireIdVerification: true, name: 'Puntos' })
          if (settings.appearance) {
            setAppearance(prev => ({...prev, ...settings.appearance}))
          }
          setReceiptSettings(settings.receipt || {
            message: '¡Gracias por su compra!',
            colorMode: 'bw',
            showPoweredBy: true,
            poweredByText: 'YAHPOS!.cl',
            showLoyalty: true,
            loyaltyName: 'Puntos Patagonia'
          })
          setUsingDefaults(usingDefaults)
        }
      })
      .catch(() => toast.error('No se pudo cargar la configuración'))
      .finally(() => setIsLoading(false))

    // Fetch SII config
    fetch('/api/sii/config')
      .then(r => r.json())
      .then(data => {
        if (data.config) {
          setSiiConfig(prev => ({
            ...prev,
            ...data.config,
            // `null` en la DB desmontaría el input controlado (React avisa y lo vuelve no controlado).
            acteco: data.config.acteco ?? '',
            nro_resol: data.config.nro_resol ?? '',
            fch_resol: data.config.fch_resol ?? '',
            pfx_base64: '', // No cargamos el certificado por seguridad
            password: ''    // No cargamos el password por seguridad
          }))
        }
      })
      .catch(() => console.error('Error al cargar configuración SII'))

    // Fetch terminals
    fetch('/api/terminals')
      .then(r => {
        if (!r.ok) throw new Error('Error fetching terminals')
        return r.json()
      })
      .then(data => {
        if (!Array.isArray(data)) {
          setTerminalsList([])
          return
        }
        setTerminalsList(data)
      })
      .catch(() => {
        setTerminalsList([])
        console.error('Error fetching terminals')
      })
  }, [])

  const handleSave = useCallback(async () => {
    setSaveStatus('saving')
    try {
      const flat: Record<string, string> = {
        store_name: store.name, store_slogan: store.slogan, store_address: store.address,
        store_city: store.city, store_commune: store.commune || '', store_region: store.region || '',
        store_phone: store.phone, store_email: store.email, store_website: store.website,
        pos_terminal_name: pos.terminalName, pos_tax_rate: String(pos.taxRate), pos_currency: pos.currency,
        pos_low_stock_threshold: String(pos.lowStockThreshold), pos_receipt_message: pos.receiptMessage,
        pos_region: pos.region,
        pos_payment_cash: String(pos.paymentCash), 
        pos_payment_transbank: String(pos.paymentTransbank),
        pos_payment_getnet: String(pos.paymentGetnet),
        pos_payment_tuu: String(pos.paymentTuu),
        pos_payment_sumup: String(pos.paymentSumup),
        pos_payment_other_card: String(pos.paymentOtherCard),
        pos_payment_transfer: String(pos.paymentTransfer),
        payment_flow_enabled: String(payments.flowEnabled), payment_flow_api_key: paymentSecrets.flowApiKey,
        payment_flow_api_secret: paymentSecrets.flowApiSecret, payment_webpay_enabled: String(payments.webpayEnabled),
        payment_webpay_commerce_code: paymentSecrets.webpayCommerceCode, payment_free_shipping_min: String(payments.freeShippingMin),
        payment_tuu_api_key: payments.tuuApiKey, payment_tuu_terminal_serial: payments.tuuTerminalSerial,
        payment_mercadopago_access_token: payments.mercadopagoAccessToken, payment_mercadopago_terminal_id: payments.mercadopagoTerminalId,
        loyalty_enabled: String(loyalty.enabled),
        loyalty_min_redemption: String(loyalty.minRedemption),
        loyalty_accumulation_rate: String(loyalty.accumulationRate),
        loyalty_redemption_rate: String(loyalty.redemptionRate),
        loyalty_require_id_verification: String(loyalty.requireIdVerification),
        loyalty_name: loyalty.name || 'Puntos',
        receipt_message: receiptSettings.message,
        receipt_color_mode: receiptSettings.colorMode,
        receipt_show_powered_by: String(receiptSettings.showPoweredBy),
        receipt_powered_by_text: receiptSettings.poweredByText,
        receipt_show_loyalty: String(receiptSettings.showLoyalty),
        receipt_loyalty_name: receiptSettings.loyaltyName,
      }

      const res = await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flat) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }

      // Save SII Config if we are on that tab or if it's dirty
      if (activeTab === 'sii') {
        const siiRes = await fetch('/api/sii/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(siiConfig)
        })
        if (!siiRes.ok) {
          const err = await siiRes.json()
          throw new Error(`Error SII: ${err.error}`)
        }
      }

      setSaveStatus('saved')
      toast.success('Configuración guardada correctamente')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (err: any) {
      setSaveStatus('error')
      toast.error(err.message)
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }, [store, pos, payments, paymentSecrets, appearance, loyalty, receiptSettings, siiConfig, activeTab])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-400 animate-pulse">Cargando Configuración...</p>
      </div>
    )
  }


  return (
    <>
      <div className="space-y-8">
        {/* Header section with Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-black tracking-tighter uppercase italic">
                    Configuración <span className="text-brand-primary">General</span>
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
                            if (data.success) {
                              toast.success('¡Tabla inicializada! Guarda la configuración.')
                              setUsingDefaults(false)
                            } else {
                              toast.error(data.error || 'Error al inicializar')
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
                    className="bg-brand-primary hover:bg-brand-700 text-white rounded-xl px-8 h-12 font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-3"
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
                        ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
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
                      <Field label="Región">
                        <select
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          value={store.region || ''}
                          onChange={e => {
                            const regName = e.target.value;
                            const regObj = CHILE_REGIONS.find(r => r.name === regName);
                            const firstCommune = regObj?.communes[0] || '';
                            setStore({
                              ...store,
                              region: regName,
                              commune: firstCommune,
                              city: firstCommune
                            });
                          }}
                        >
                          <option value="" disabled>Seleccione Región</option>
                          {CHILE_REGIONS.map(r => (
                            <option key={r.name} value={r.name}>{r.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Comuna">
                        <select
                          className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          value={store.commune || ''}
                          onChange={e => setStore({
                            ...store,
                            commune: e.target.value,
                            city: e.target.value
                          })}
                          disabled={!store.region}
                        >
                          <option value="" disabled>Seleccione Comuna</option>
                          {(CHILE_REGIONS.find(r => r.name === store.region)?.communes || []).map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Ciudad" hint="Se muestra en el topbar y boletas">
                        <Input className="rounded-xl h-11" value={store.city} onChange={e => setStore({...store, city: e.target.value})} placeholder="Santiago" />
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

              {/* Tab: Plan / Suscripción */}
              {activeTab === 'billing' && (
                <SubscriptionTab />
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
                        {pos.paymentTuu && (
                          <div className="ml-6 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-3 py-2">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                              ✅ Integración real — el monto se envía directo al terminal, sin digitar
                            </p>
                            <Field label="Número de serie del terminal">
                              <Input className="rounded-xl h-11" value={payments.tuuTerminalSerial} onChange={e => setPayments({...payments, tuuTerminalSerial: e.target.value})} placeholder="Ej: 1234567890" />
                            </Field>
                            <Field label={payments.tuuApiKeyConfigured ? 'API Key (ya configurada — dejar vacío para no cambiarla)' : 'API Key de TUU (Workspace > Pagos > Configuración > API)'}>
                              <form onSubmit={(e) => e.preventDefault()}>
                                <Input className="rounded-xl h-11" type="password" value={payments.tuuApiKey} onChange={e => setPayments({...payments, tuuApiKey: e.target.value})} placeholder={payments.tuuApiKeyConfigured ? '••••••••••••' : 'Pegar la API Key acá'} />
                              </form>
                            </Field>
                            <p className="text-[9px] text-gray-400 italic">
                              El terminal debe estar en "Modo Integración" (se activa desde el Workspace de TUU).
                            </p>
                          </div>
                        )}
                        <Toggle checked={pos.paymentSumup} onCheckedChange={v => setPos({...pos, paymentSumup: v})} label="💳  SumUp" />
                        <Toggle checked={pos.paymentOtherCard} onCheckedChange={v => setPos({...pos, paymentOtherCard: v})} label="💳  Mercado Pago (Point) / Compraquí / Otro lector" />
                        {pos.paymentOtherCard && (
                          <div className="ml-6 pl-4 border-l-2 border-emerald-200 dark:border-emerald-800 space-y-3 py-2">
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">
                              ✅ Integración real para Mercado Pago (Point / Redelcom) — requiere Terminal ID y Access Token
                            </p>
                            <p className="text-[9px] text-gray-400 italic">
                              Nota: Compraquí y otros terminales siguen funcionando de forma aislada, sin configuración adicional requerida.
                            </p>
                            <Field label="Terminal ID (Mercado Pago)">
                              <Input className="rounded-xl h-11" value={payments.mercadopagoTerminalId} onChange={e => setPayments({...payments, mercadopagoTerminalId: e.target.value})} placeholder="Ej: PDV_XXXXXX" />
                            </Field>
                            <Field label={payments.mercadopagoAccessTokenConfigured ? 'Access Token (ya configurado — dejar vacío para no cambiar)' : 'Access Token (Mercado Pago)'}>
                              <form onSubmit={(e) => e.preventDefault()}>
                                <Input className="rounded-xl h-11" type="password" value={payments.mercadopagoAccessToken} onChange={e => setPayments({...payments, mercadopagoAccessToken: e.target.value})} placeholder={payments.mercadopagoAccessTokenConfigured ? '••••••••••••' : 'APP_USR-...'} />
                              </form>
                            </Field>
                            <p className="text-[9px] text-gray-400 italic">
                              El terminal debe estar en "Modo PDV" para aceptar pagos remotos.
                            </p>
                          </div>
                        )}
                      </div>
                      <Toggle checked={pos.paymentTransfer} onCheckedChange={v => setPos({...pos, paymentTransfer: v})} label="📱  Transferencia bancaria (CuentaRUT, banco, etc.)" />
                      
                      <div className="col-span-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Región de operación</label>
                        <select 
                          value={pos.region || 'REGIONES'}
                          onChange={(e) => setPos({...pos, region: e.target.value})}
                          className="mt-2 w-full h-12 rounded-xl border bg-white dark:bg-slate-800 font-bold text-sm px-4 outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                        >
                          <option value="REGIONES">PROVINCIAS / REGIONES (Sodexo/Edenred habilitado)</option>
                          <option value="RM">SANTIAGO / RM (Sodexo/Edenred deshabilitado)</option>
                        </select>
                        <p className="text-[9px] text-gray-400 mt-2 italic font-medium">
                          * Esta opción controla la visibilidad de métodos de pago institucionales específicos por zona geográfica.
                        </p>
                      </div>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                        ℹ️ <strong>TUU</strong> se integra en vivo — YAHPOS! le manda el monto directo al terminal configurado arriba. Los demás terminales (Transbank, GetNet, SumUp, Otro) funcionan de forma <strong>independiente</strong> del software POS — el lector procesa el pago por su cuenta y el POS solo registra que el cobro fue "con tarjeta". Los pagos online (Flow, Webpay) están en la pestaña <strong>"Pagos Online"</strong>.
                      </p>
                    </div>
                  </SectionCard>

                  <SectionCard title="Categorías del POS" description="Personaliza las categorías que aparecen en el panel de ventas.">
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input placeholder="Nombre de categoría (ej: Panadería)" className="rounded-xl h-11" />
                        <Button className="bg-brand-primary text-white rounded-xl px-6">Agregar</Button>
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
                          className="bg-brand-primary text-white rounded-xl px-6"
                        >
                          Agregar
                        </Button>
                      </div>

                      <div className="grid gap-3">
                        {terminalsList.map(t => (
                          <div key={t.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700">
                                <Monitor className="w-5 h-5 text-brand-primary" />
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

              {/* Tab: Boleta / Recibo */}
              {activeTab === 'receipts' && (
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                  <div className="space-y-6">
                    <SectionCard title="Configuración del Recibo" description="Personaliza el diseño y mensaje de tus boletas térmicas (80mm).">
                      <div className="space-y-4">
                        <Field label="Mensaje de Agradecimiento">
                          <Textarea 
                            className="rounded-xl" 
                            value={receiptSettings.message} 
                            onChange={e => setReceiptSettings({...receiptSettings, message: e.target.value})} 
                            placeholder="¡Gracias por su compra! Vuelva pronto." 
                            rows={3} 
                          />
                        </Field>
                        
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-gray-500 px-1">Modo de Color</Label>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setReceiptSettings({...receiptSettings, colorMode: 'bw'})}
                              className={cn(
                                "p-4 rounded-2xl border text-left transition-all",
                                receiptSettings.colorMode === 'bw' ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/10" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
                              )}
                            >
                              <div className="w-full h-8 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
                              <span className="text-[10px] font-black uppercase">Blanco y Negro (Estándar)</span>
                            </button>
                            <button 
                              onClick={() => setReceiptSettings({...receiptSettings, colorMode: 'color'})}
                              className={cn(
                                "p-4 rounded-2xl border text-left transition-all",
                                receiptSettings.colorMode === 'color' ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/10" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
                              )}
                            >
                              <div className="w-full h-8 bg-gradient-to-r from-red-500 via-blue-500 to-yellow-500 rounded mb-2" />
                              <span className="text-[10px] font-black uppercase">Color (Logo y Detalles)</span>
                            </button>
                          </div>
                        </div>

                        <Toggle 
                          checked={receiptSettings.showPoweredBy} 
                          onCheckedChange={v => setReceiptSettings({...receiptSettings, showPoweredBy: v})} 
                          label="Créditos en Footer" 
                          description="Muestra un pequeño texto al final del recibo."
                        />
                        {receiptSettings.showPoweredBy && (
                          <Field label="Texto del Footer">
                            <Input 
                              className="rounded-xl h-11" 
                              value={receiptSettings.poweredByText} 
                              onChange={e => setReceiptSettings({...receiptSettings, poweredByText: e.target.value})} 
                              placeholder="Powered by YAHPOS!.cl" 
                            />
                          </Field>
                        )}
                      </div>
                    </SectionCard>

                    <SectionCard title="Lealtad en Recibo" description="Muestra el saldo de puntos y estrellas en la boleta.">
                      <div className="space-y-4">
                        <Toggle 
                          checked={receiptSettings.showLoyalty} 
                          onCheckedChange={v => setReceiptSettings({...receiptSettings, showLoyalty: v})} 
                          label="Mostrar Puntos de Lealtad" 
                          description="Los clientes podrán ver cuántos puntos ganaron en la compra."
                        />
                        {receiptSettings.showLoyalty && (
                          <Field label="Nombre del Programa">
                            <Input 
                              className="rounded-xl h-11" 
                              value={receiptSettings.loyaltyName} 
                              onChange={e => setReceiptSettings({...receiptSettings, loyaltyName: e.target.value})} 
                              placeholder="Puntos Patagonia" 
                            />
                          </Field>
                        )}
                      </div>
                    </SectionCard>
                  </div>

                  <div className="sticky top-24 space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Vista Previa en Vivo</h3>
                      <Badge variant="outline" className="text-[8px] font-bold border-brand-primary/30 text-brand-primary">80mm THERMAL</Badge>
                    </div>
                    <ReceiptPreview settings={receiptSettings} store={store} appearance={appearance} />
                    <p className="text-[10px] text-center text-gray-400 font-medium italic">
                      * El timbre TED real variará según el DTE emitido por el SII.
                    </p>
                  </div>
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
                        <SecretSettingField
                          label="API Key de Flow"
                          configured={payments.flowApiKeyConfigured}
                          value={paymentSecrets.flowApiKey}
                          onChange={v => setPaymentSecrets({...paymentSecrets, flowApiKey: v})}
                        />
                        <SecretSettingField
                          label="API Secret de Flow"
                          configured={payments.flowApiSecretConfigured}
                          value={paymentSecrets.flowApiSecret}
                          onChange={v => setPaymentSecrets({...paymentSecrets, flowApiSecret: v})}
                        />
                      </div>
                    )}
                  </SectionCard>

                  <SectionCard title="Transbank Webpay Plus — Pago online" description="Webpay para transacciones desde la tienda web (distinto del POS físico).">
                    <Toggle checked={payments.webpayEnabled} onCheckedChange={v => setPayments({...payments, webpayEnabled: v})} label="Habilitar Transbank Webpay en la tienda online" />
                    {payments.webpayEnabled && (
                      <div className="mt-4">
                        <SecretSettingField
                          label="Commerce Code"
                          configured={payments.webpayCommerceCodeConfigured}
                          value={paymentSecrets.webpayCommerceCode}
                          onChange={v => setPaymentSecrets({...paymentSecrets, webpayCommerceCode: v})}
                          placeholder="597055555532"
                        />
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
                  <div className="p-4 bg-brand-primary/5 rounded-xl border border-brand-primary/20 flex gap-4 items-center">
                    <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tighter text-brand-primary">Integración SII Oficial</p>
                      <p className="text-xs text-gray-500 font-medium">Configura los datos tributarios y el certificado digital para la emisión de boletas electrónicas.</p>
                    </div>
                  </div>

                  {/* Barra de progreso de configuración */}
                  <div className="p-4 bg-gradient-to-r from-brand-primary/10 to-brand-primary/5 rounded-xl border border-brand-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-brand-primary uppercase tracking-wider">Progreso de Configuración</span>
                      <span className="text-xs font-bold text-brand-primary">
                        {[
                          siiConfig.rut_emisor && siiConfig.razon_social,
                          siiConfig.acteco,
                          siiConfig.pfx_base64 && siiConfig.password,
                          siiConfig.nro_resol && siiConfig.fch_resol,
                          siiConfig.caf_xml
                        ].filter(Boolean).length} / 5 pasos
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-primary rounded-full transition-all duration-500"
                        style={{ width: `${([
                          siiConfig.rut_emisor && siiConfig.razon_social,
                          siiConfig.acteco,
                          siiConfig.pfx_base64 && siiConfig.password,
                          siiConfig.nro_resol && siiConfig.fch_resol,
                          siiConfig.caf_xml
                        ].filter(Boolean).length / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <SectionCard title="Datos de la Empresa" description="Información legal registrada ante el SII.">
                    <div className="grid md:grid-cols-2 gap-4">
                      <Field label="RUT Emisor" hint="Ej: 76.123.456-7">
                        <Input 
                          className="rounded-xl h-11" 
                          value={siiConfig.rut_emisor} 
                          onChange={e => setSiiConfig({...siiConfig, rut_emisor: e.target.value})} 
                          placeholder="76.123.456-7" 
                        />
                      </Field>
                      <Field label="Razón Social">
                        <Input 
                          className="rounded-xl h-11" 
                          value={siiConfig.razon_social} 
                          onChange={e => setSiiConfig({...siiConfig, razon_social: e.target.value})} 
                          placeholder="Mi Empresa SpA" 
                        />
                      </Field>
                      <Field label="Giro / Actividad">
                        <Input 
                          className="rounded-xl h-11" 
                          value={siiConfig.giro} 
                          onChange={e => setSiiConfig({...siiConfig, giro: e.target.value})} 
                          placeholder="Venta al por menor de abarrotes" 
                        />
                      </Field>
                      <Field label="Dirección">
                        <Input 
                          className="rounded-xl h-11" 
                          value={siiConfig.direccion} 
                          onChange={e => setSiiConfig({...siiConfig, direccion: e.target.value})} 
                          placeholder="Calle Principal 123" 
                        />
                      </Field>
                      <Field label="Comuna">
                        <Input 
                          className="rounded-xl h-11" 
                          value={siiConfig.comuna} 
                          onChange={e => setSiiConfig({...siiConfig, comuna: e.target.value})} 
                          placeholder="Castro" 
                        />
                      </Field>
                      <Field label="Ciudad">
                        <Input 
                          className="rounded-xl h-11" 
                          value={siiConfig.ciudad} 
                          onChange={e => setSiiConfig({...siiConfig, ciudad: e.target.value})} 
                          placeholder="Castro" 
                        />
                      </Field>
                      <Field label="Código de Actividad (Acteco)" hint="4 a 6 dígitos del giro declarado ante el SII. Obligatorio para facturas y notas.">
                        <Input 
                          type="number"
                          inputMode="numeric"
                          min={1000}
                          max={999999}
                          className="rounded-xl h-11" 
                          value={siiConfig.acteco} 
                          onChange={e => setSiiConfig({...siiConfig, acteco: e.target.value})} 
                          placeholder="471100" 
                        />
                      </Field>
                      <Field label="N° Resolución" hint="Número de la resolución que autoriza la emisión electrónica.">
                        <Input 
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="rounded-xl h-11" 
                          value={siiConfig.nro_resol} 
                          onChange={e => setSiiConfig({...siiConfig, nro_resol: e.target.value})} 
                          placeholder="0" 
                        />
                      </Field>
                      <Field label="Fecha Resolución" hint="Fecha de esa resolución.">
                        <Input 
                          type="date"
                          className="rounded-xl h-11" 
                          value={siiConfig.fch_resol} 
                          onChange={e => setSiiConfig({...siiConfig, fch_resol: e.target.value})} 
                        />
                      </Field>
                    </div>
                  </SectionCard>

                  <SectionCard title="Certificado Digital" description="Archivo .pfx y clave para firmar documentos electrónicos.">
                    <div className="space-y-4">
                      <Field label="Archivo de Certificado (.pfx / .p12)" hint="Se almacena de forma cifrada (AES-256)">
                        <div className="flex gap-3">
                          <Input 
                            type="file" 
                            accept=".pfx,.p12"
                            className="rounded-xl h-11 flex-1 cursor-pointer pt-2" 
                            onChange={(e) => setPfxFile(e.target.files?.[0] || null)}
                          />
                          {siiConfig.pfx_base64 && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-4 py-2 rounded-xl flex items-center gap-2">
                              <CheckCircle className="w-3 h-3" /> LISTO
                            </Badge>
                          )}
                        </div>
                        {pfxFile && (
                          <p className="text-xs text-gray-500 mt-2">
                            Archivo seleccionado: <span className="font-mono">{pfxFile.name}</span>. Ingresa la contraseña y presiona validar.
                          </p>
                        )}
                        {siiConfig.cert_info && (
                          <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-xs font-bold text-green-900 dark:text-green-100 mb-1">Información del Certificado:</p>
                            <p className="text-xs text-green-800 dark:text-green-200">
                              RUT certificado: {siiConfig.cert_info.rut}
                              {siiConfig.cert_info.rut && siiConfig.rut_emisor && (
                                (() => {
                                  const rutCert = String(siiConfig.cert_info.rut).replace(/\./g, '').trim();
                                  const rutEmisor = String(siiConfig.rut_emisor).replace(/\./g, '').trim();
                                  return rutCert === rutEmisor
                                    ? ' ✅ Coincide con emisor'
                                    : ' ⚠️ RUT no coincide con emisor';
                                })()
                              )}
                            </p>
                            <p className="text-xs text-green-800 dark:text-green-200">Razón Social: {siiConfig.cert_info.razonSocial}</p>
                            <p className="text-xs text-green-800 dark:text-green-200">Válido hasta: {new Date(siiConfig.cert_info.notAfter).toLocaleDateString('es-CL')}</p>
                          </div>
                        )}
                      </Field>
                      
                      <Field label="Contraseña del Certificado">
                        <SecretInput 
                          value={siiConfig.password} 
                          onChange={v => setSiiConfig({...siiConfig, password: v})} 
                          placeholder="Clave del certificado digital" 
                        />
                      </Field>
                      <Button
                        type="button"
                        className="bg-brand-primary text-white rounded-xl w-full"
                        disabled={!pfxFile || !siiConfig.password || validatingCert}
                        onClick={validarCertificado}
                      >
                        {validatingCert ? 'Validando…' : 'Validar y guardar certificado'}
                      </Button>
                    </div>
                  </SectionCard>

                  <SectionCard title="CAF (Código de Autorización de Folios)" description="Folios autorizados por el SII para emisión de documentos.">
                    <div className="space-y-4">
                      <Field label="Archivo CAF (.xml o .dat)" hint="Obtén este archivo del portal SII después de solicitar folios. El tipo de documento se toma del CAF">
                        <div className="flex gap-3">
                          <Input 
                            type="file" 
                            accept=".xml,.dat"
                            className="rounded-xl h-11 flex-1 cursor-pointer pt-2" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const formData = new FormData();
                                  formData.append('caf', file);
                                  
                                  const response = await fetch('/api/wizard/caf', {
                                    method: 'POST',
                                    body: formData,
                                  });
                                  
                                  const data = await response.json();
                                  
                                  if (response.ok) {
                                    setSiiConfig({
                                      ...siiConfig, 
                                      caf_xml: data.data,
                                    });
                                    const cafInfo = (data?.data && typeof data.data === 'object' ? data.data : {}) as Record<string, unknown>;
                                    const textField = (value: unknown) =>
                                      typeof value === 'number' || typeof value === 'string' ? String(value) : '';
                                    const tipo = textField(cafInfo.tipoDte);
                                    const desde = textField(cafInfo.folioDesde);
                                    const hasta = textField(cafInfo.folioHasta);
                                    const total = textField(cafInfo.totalFolios);
                                    const rutCaf = textField(cafInfo.rutEmisor);
                                    const fechaRaw = cafInfo.fechaAutorizacion ?? cafInfo.fecha_autorizacion ?? cafInfo.fchAutorizacion ?? cafInfo.fecha;
                                    let fecha = textField(fechaRaw);
                                    if (fecha) {
                                      const parsed = new Date(fecha);
                                      if (!Number.isNaN(parsed.getTime())) fecha = parsed.toLocaleDateString('es-CL');
                                    }
                                    const rutEmisor = String(siiConfig.rut_emisor || '').replace(/\./g, '').trim();
                                    const rutCafNorm = rutCaf.replace(/\./g, '').trim();
                                    const rutNota = !rutEmisor && rutCaf
                                      ? 'RUT tomado del CAF'
                                      : rutCaf && rutCafNorm === rutEmisor
                                        ? 'RUT coincide con emisor ✅'
                                        : rutCaf && rutEmisor
                                          ? '⚠️ RUT no coincide con emisor'
                                          : '';
                                    const msg = [
                                      '✅ CAF cargado',
                                      tipo ? `Tipo ${tipo}` : '',
                                      desde && hasta ? `Folios ${desde}-${hasta}` : '',
                                      total ? `${total} folios` : '',
                                      rutCaf ? `RUT CAF: ${rutCaf}` : '',
                                      fecha ? `Autorización: ${fecha}` : '',
                                      rutNota,
                                    ].filter(Boolean).join(' · ');
                                    toast.success(msg);
                                  } else {
                                    toast.error(`❌ ${cafErrorMessage(data, 'Error al cargar CAF')}`);
                                  }
                                } catch (err) {
                                  toast.error(`❌ Error al cargar CAF${err instanceof Error && err.message ? `: ${err.message.slice(0, 200)}` : ''}`);
                                }
                              }
                            }}
                          />
                          {siiConfig.caf_xml && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none px-4 py-2 rounded-xl flex items-center gap-2">
                              <CheckCircle className="w-3 h-3" /> {siiConfig.caf_xml.totalFolios || '✓'}
                            </Badge>
                          )}
                        </div>
                      </Field>
                      
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mb-2">¿No tienes CAF?</p>
                        <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                          Sigue estos pasos para obtener folios del SII:
                        </p>
                        <ol className="text-xs text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                          <li>Ingresa al portal SII (www.sii.cl)</li>
                          <li>Ve a: Factura Electrónica → Solicitar Folios</li>
                          <li>Selecciona tipo de documento (ej: Boleta 39)</li>
                          <li>Descarga el CAF firmado</li>
                          <li>Sube el archivo aquí</li>
                        </ol>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard title="Entorno de Ejecución" description="Define si los documentos se envían al ambiente de pruebas o producción.">
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setSiiConfig({...siiConfig, environment: 'certification'})}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all flex items-center gap-4",
                          siiConfig.environment === 'certification' ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500/20" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full", siiConfig.environment === 'certification' ? "bg-amber-500" : "bg-gray-300")} />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest">Certificación</p>
                          <p className="text-[10px] text-gray-500">Ambiente de pruebas (maullin)</p>
                        </div>
                      </button>
                      <button 
                        onClick={() => setSiiConfig({...siiConfig, environment: 'production'})}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all flex items-center gap-4",
                          siiConfig.environment === 'production' ? "border-red-500 bg-red-50 ring-1 ring-red-500/20" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full", siiConfig.environment === 'production' ? "bg-red-500 animate-pulse" : "bg-gray-300")} />
                        <div>
                          <p className="text-xs font-black uppercase tracking-widest">Producción</p>
                          <p className="text-[10px] text-gray-500">Documentos con validez legal (palena)</p>
                        </div>
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard title="Prueba de Emisión" description="Emite un DTE de prueba para validar tu configuración.">
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-700 dark:text-gray-300 mb-3">
                          Este es un DTE de prueba que <strong>NO se envía al SII</strong>. Sirve para validar que tu configuración esté correcta.
                        </p>
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <p>• Tipo: Boleta Electrónica (39)</p>
                          <p>• Monto: $1.000</p>
                          <p>• Receptor: Consumidor Final (66.666.666-6)</p>
                          <p>• Producto: "Producto de prueba"</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/wizard/prueba', {
                              method: 'POST',
                            });
                            const data = await response.json();
                            
                            if (response.ok) {
                              toast.success(`✅ DTE de prueba emitido: Folio ${data.data.folio}`);
                            } else {
                              toast.error(`❌ Error: ${data.error || data.details}`);
                            }
                          } catch (error) {
                            toast.error('Error al emitir DTE de prueba');
                          }
                        }}
                        className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl h-11 font-bold"
                      >
                        🚀 Emitir DTE de Prueba
                      </Button>
                    </div>
                  </SectionCard>

                  <SectionCard title="Blumi Sandbox" description="Valida tu motor contra el sandbox gratuito de Blumi DTE (sin costo, pruebas ilimitadas)">
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                          <strong>¿Qué es Blumi Sandbox?</strong>
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Entorno de pruebas aislado que simula el SII. Valida que nuestros DTEs sean correctos antes de certificación real.
                        </p>
                        <ul className="text-xs text-blue-700 dark:text-blue-300 mt-2 list-disc list-inside space-y-1">
                          <li>Pruebas ilimitadas sin costo</li>
                          <li>Servidor SII real (maullin.sii.cl)</li>
                          <li>Sin obligaciones tributarias</li>
                        </ul>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/blumi/test');
                              const data = await response.json();
                              
                              if (data.success) {
                                toast.success('✅ Conectado con Blumi Sandbox');
                              } else {
                                toast.error(`❌ ${data.error?.message || 'Error de conexión'}`);
                              }
                            } catch (error) {
                              toast.error('Error al conectar con Blumi');
                            }
                          }}
                          className="rounded-xl h-11"
                        >
                          🔌 Verificar Conexión
                        </Button>

                        <Button
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/blumi/test', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tipo_dte: 39, monto: 1000 }),
                              });
                              const data = await response.json();
                              
                              if (data.success) {
                                toast.success(`✅ ${data.data?.veredicto || 'DTE emitido'}`);
                              } else {
                                toast.error(`❌ ${data.error || 'Error al emitir'}`);
                              }
                            } catch (error) {
                              toast.error('Error al emitir DTE en Blumi');
                            }
                          }}
                          className="rounded-xl h-11 bg-brand-primary hover:bg-brand-primary/90"
                        >
                          🧪 Probar Motor
                        </Button>
                      </div>

                      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                        <p className="font-semibold mb-1">⚠️ Nota importante:</p>
                        <p>Blumi requiere certificado .pfx configurado en su portal web. Si recibes error de certificado, sube tu .pfx en <a href="https://dte.blumi.cl" target="_blank" className="text-brand-primary hover:underline">dte.blumi.cl</a> → Certificado & Folios CAF.</p>
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}

              {/* Tab: Fidelización */}
              {activeTab === 'loyalty' && (
                <div className="space-y-6">
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/40 rounded-xl flex items-center justify-center shrink-0">
                      <Award className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tighter text-amber-900 dark:text-amber-100">Programa de Fidelización</p>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 font-medium">
                        Recompensa a tus clientes frecuentes con puntos por cada compra. Los puntos se calculan automáticamente al cerrar una venta en el POS.
                      </p>
                    </div>
                  </div>

                  <SectionCard title="Configuración General" description="Activa y personaliza el programa de lealtad." icon={Award}>
                    <div className="space-y-4">
                      <Toggle
                        checked={loyalty.enabled}
                        onCheckedChange={v => setLoyalty({...loyalty, enabled: v})}
                        label="Activar Programa de Puntos"
                        description="Los clientes acumulan puntos con cada compra realizada en el POS."
                      />

                      {loyalty.enabled && (
                        <>
                          <Field label="Nombre del Programa" hint="Ej: Puntos Patagonia, Estrellas, Millas">
                            <Input
                              className="rounded-xl h-11"
                              value={loyalty.name}
                              onChange={e => setLoyalty({...loyalty, name: e.target.value})}
                              placeholder="Puntos Patagonia"
                            />
                          </Field>

                          <div className="grid md:grid-cols-2 gap-4">
                            <Field
                              label="Tasa de Acumulación"
                              hint={`$${loyalty.accumulationRate} = 1 punto`}
                            >
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                <Input
                                  className="rounded-xl h-11 pl-7"
                                  type="number"
                                  min="1"
                                  value={loyalty.accumulationRate}
                                  onChange={e => setLoyalty({...loyalty, accumulationRate: Number(e.target.value)})}
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 px-1">Por cada ${loyalty.accumulationRate || 100} CLP gastados, el cliente gana 1 punto.</p>
                            </Field>

                            <Field
                              label="Tasa de Canje"
                              hint={`1 punto = $${loyalty.redemptionRate}`}
                            >
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">$</span>
                                <Input
                                  className="rounded-xl h-11 pl-7"
                                  type="number"
                                  min="1"
                                  value={loyalty.redemptionRate}
                                  onChange={e => setLoyalty({...loyalty, redemptionRate: Number(e.target.value)})}
                                />
                              </div>
                              <p className="text-[10px] text-gray-400 px-1">Cada punto vale ${loyalty.redemptionRate || 1} CLP al momento de canjear.</p>
                            </Field>

                            <Field label="Mínimo para Canje" hint="Puntos mínimos para poder canjear">
                              <Input
                                className="rounded-xl h-11"
                                type="number"
                                min="0"
                                value={loyalty.minRedemption}
                                onChange={e => setLoyalty({...loyalty, minRedemption: Number(e.target.value)})}
                              />
                            </Field>
                          </div>

                          <Toggle
                            checked={loyalty.requireIdVerification}
                            onCheckedChange={v => setLoyalty({...loyalty, requireIdVerification: v})}
                            label="Requerir Verificación de Identidad"
                            description="El cajero debe verificar el RUT del cliente para acumular o canjear puntos."
                          />
                        </>
                      )}
                    </div>
                  </SectionCard>

                  {loyalty.enabled && (
                    <SectionCard title="Simulador de Puntos" description="Calcula cuántos puntos ganaría un cliente por una compra." icon={TrendingUp}>
                      <div className="space-y-4">
                        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/50">
                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Compra de</p>
                              <p className="text-2xl font-black text-amber-700">$10.000</p>
                            </div>
                            <div className="flex items-center justify-center">
                              <div className="text-3xl">→</div>
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{loyalty.name || 'Puntos'} ganados</p>
                              <p className="text-2xl font-black text-amber-600">{Math.floor(10000 / (loyalty.accumulationRate || 100))} pts</p>
                            </div>
                          </div>
                          <p className="text-[10px] text-center text-gray-400 mt-4 font-medium">
                            Estos puntos equivalen a ${Math.floor(10000 / (loyalty.accumulationRate || 100)) * (loyalty.redemptionRate || 1)} CLP en descuento
                          </p>
                        </div>
                      </div>
                    </SectionCard>
                  )}
                </div>
              )}

              {/* Tab: Diseño (Visual Editor) */}
              {activeTab === 'design' && (
                <div className="space-y-6">
                  <div className="p-4 bg-brand-50 dark:bg-brand-950/30 rounded-2xl border border-brand-100 dark:border-brand-900/50 flex gap-4">
                    <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-xl flex items-center justify-center shrink-0 border border-brand-200">
                      <Sparkles className="w-6 h-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-black italic uppercase text-brand-900 dark:text-brand-100 tracking-tighter">Editor Visual Inteligente</p>
                      <p className="text-xs text-brand-700 dark:text-brand-300 mt-1">
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
                            className="flex items-center gap-1.5 text-[10px] font-bold text-brand-primary hover:underline mt-2"
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
                                design.productCardStyle === 'glass' ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/10" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
                              )}
                            >
                              <div className="w-full aspect-square bg-white/50 dark:bg-white/10 rounded-lg mb-2 shadow-sm border border-white/20" />
                              <span className="text-[10px] font-black uppercase">Glassmorphism</span>
                            </button>
                            <button 
                              onClick={() => setDesign({...design, productCardStyle: 'minimal'})}
                              className={cn(
                                "p-4 rounded-2xl border text-left transition-all",
                                design.productCardStyle === 'minimal' ? "border-brand-primary bg-brand-primary/5 ring-1 ring-brand-primary/10" : "border-gray-100 dark:border-white/5 bg-gray-50/50"
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
                           className="bg-brand-primary rounded-xl px-8 uppercase font-black italic text-xs tracking-widest"
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
