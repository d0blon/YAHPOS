'use client'

import { useState } from 'react'
import { 
  Zap, Crown, Star, LogOut, Save, Layout, Database,
  CheckCircle2, Globe, Building2, BarChart3, 
  Webhook, HeadphonesIcon, ShieldCheck, Truck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { updateStoreSettingsAction, logoutDeveloperAction } from './actions'
import { cn } from '@/lib/utils'

export default function DeveloperPanel({ initialSettings }: { initialSettings: any }) {
  const [settings, setSettings] = useState(initialSettings || {
    tier: 'basico',
    store_name: 'PatagoniaPOS',
    store_logo: '',
    white_label_enabled: false,
    accent_color: '#003399'
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateStoreSettingsAction(settings)
      if (result.success) {
        toast.success('✅ Configuración aplicada en tiempo real.')
      } else {
        toast.error(result.error || 'Error al guardar')
      }
    } catch (error) {
      toast.error('Error de red')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logoutDeveloperAction()
    window.location.reload()
  }

  const tiers = [
    { 
      id: 'basico', 
      name: 'Plan Básico', 
      desc: 'POS profesional + inventario',
      icon: Zap, 
      color: 'text-blue-400',
      border: 'border-blue-500/40',
      bg: 'bg-blue-500/10',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.15)]',
      features: [
        { icon: ShieldCheck, text: 'POS offline completo' },
        { icon: Database, text: 'Gestión de inventario' },
        { icon: Truck, text: 'Turnos y cierres de caja' },
        { icon: HeadphonesIcon, text: 'CRM básico de clientes' },
      ]
    },
    { 
      id: 'plus', 
      name: 'Plan Plus', 
      desc: 'Ecommerce + catálogo online',
      icon: Star, 
      color: 'text-fuchsia-400',
      border: 'border-fuchsia-500/40',
      bg: 'bg-fuchsia-500/10',
      glow: 'shadow-[0_0_30px_rgba(217,70,239,0.15)]',
      features: [
        { icon: Globe, text: 'Tienda online activada' },
        { icon: Truck, text: 'Pedidos y despacho' },
        { icon: BarChart3, text: 'Reportes de ventas' },
        { icon: HeadphonesIcon, text: 'Soporte estándar' },
      ]
    },
    { 
      id: 'elite', 
      name: 'Plan Élite', 
      desc: 'Multi-sucursal + IA + API',
      icon: Crown, 
      color: 'text-amber-400',
      border: 'border-amber-500/40',
      bg: 'bg-amber-500/10',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.15)]',
      features: [
        { icon: Building2, text: 'Múltiples sucursales' },
        { icon: BarChart3, text: 'Reportes avanzados con IA' },
        { icon: Webhook, text: 'API externa + Webhooks' },
        { icon: HeadphonesIcon, text: 'Soporte prioritario 24/7' },
      ]
    },
  ]

  const currentTier = tiers.find(t => t.id === settings.tier)

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-black/40 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter italic">
            Núcleo de Gestión <span className="text-purple-500">SaaS</span>
          </h2>
          <p className="text-gray-400 text-sm font-medium mt-1">Control maestro de infraestructura y licenciamiento</p>
        </div>
        <div className="flex items-center gap-3">
          {currentTier && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest",
              currentTier.border, currentTier.bg, currentTier.color
            )}>
              <currentTier.icon className="h-3.5 w-3.5" />
              {currentTier.name} Activo
            </div>
          )}
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-2xl px-6 border border-red-500/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Tier Selection */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 ml-2 flex items-center gap-2">
            <Layout className="h-4 w-4" /> Selección de Plan Activo
          </h3>
          
          <div className="grid md:grid-cols-3 gap-4">
            {tiers.map((t) => (
              <button
                key={t.id}
                onClick={() => setSettings({...settings, tier: t.id})}
                className={cn(
                  "relative p-5 rounded-[2rem] border transition-all duration-500 text-left group overflow-hidden",
                  settings.tier === t.id 
                    ? cn(t.border, t.bg, t.glow, "ring-2 ring-white/10 scale-[1.02]") 
                    : "border-white/5 bg-white/5 hover:bg-white/10 hover:scale-[1.01]"
                )}
              >
                {settings.tier === t.id && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 drop-shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
                  </div>
                )}
                <t.icon className={cn("h-7 w-7 mb-3", t.color)} />
                <h4 className="font-black uppercase tracking-tighter text-sm mb-0.5">{t.name}</h4>
                <p className={cn("text-[10px] font-medium mb-4 text-gray-400")}>{t.desc}</p>
                <div className="space-y-2">
                  {t.features.map(f => (
                    <p key={f.text} className="text-[10px] text-gray-400 font-medium flex items-center gap-2">
                      <f.icon className={cn("h-3 w-3 shrink-0", t.color)} />
                      {f.text}
                    </p>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Nombre del negocio - solo para identificación interna */}
          <div className="bg-black/40 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-md space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 flex items-center gap-2">
              <Database className="h-4 w-4" /> Identificación del Negocio
            </h3>
            <p className="text-xs text-gray-500">
              Nombre interno del negocio. Se usa para identificar la instalación en reportes y la administración.
              <strong className="text-gray-400 block mt-1">PatagoniaPOS siempre aparecerá en la interfaz pública.</strong>
            </p>
            <input
              value={settings.store_name}
              onChange={(e) => setSettings({...settings, store_name: e.target.value})}
              placeholder="Ej: Supermercado El Sur"
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:border-blue-500/50 transition-all text-white text-sm"
            />
          </div>
        </div>

        {/* System Info + Save */}
        <div className="space-y-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 ml-2 flex items-center gap-2">
            <Database className="h-4 w-4" /> Estado del Sistema
          </h3>

          <Card className="bg-black/40 border-white/5 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-6 space-y-5">
              <div className="p-4 bg-green-500/5 border border-green-500/20 rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Base de Datos</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                </div>
                <p className="text-sm font-black text-white">Supabase Cloud</p>
                <p className="text-[10px] text-green-400/60 font-medium">Conectado ✓</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Cifrado', value: 'AES-256-CBC' },
                  { label: '2FA', value: 'TOTP (Authy)' },
                  { label: 'Framework', value: 'Next.js 16' },
                  { label: 'Región', value: 'Chiloé, Chile' },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{item.label}</span>
                    <span className="text-[10px] font-black text-white uppercase">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-4">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_8px_20px_rgba(168,85,247,0.3)]"
                >
                  {saving ? 'Aplicando...' : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar y Desplegar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="p-5 bg-gradient-to-br from-purple-900/30 to-black rounded-[2rem] border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-purple-400" />
              <h4 className="text-xs font-black uppercase tracking-widest">Despliegue Local</h4>
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed">
              Este panel configura exclusivamente este negocio. Los cambios se sincronizan con Supabase en tiempo real.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
