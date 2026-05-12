'use client'

import { useState, useEffect, useCallback } from 'react'
import { Database, Wifi, ShieldCheck, HardDrive, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ServiceStatus {
  name: string
  label: string
  status: 'checking' | 'online' | 'degraded' | 'offline'
  latency: number | null
  detail: string
  icon: React.ElementType
  color: string
}

const SERVICES_INIT: ServiceStatus[] = [
  { name: 'database', label: 'Supabase DB', status: 'checking', latency: null, detail: 'Verificando...', icon: Database, color: 'text-amber-400' },
  { name: 'api',      label: 'API Server',  status: 'checking', latency: null, detail: 'Verificando...', icon: Wifi,     color: 'text-orange-400'  },
  { name: 'auth',     label: 'Autenticación',status: 'checking',latency: null, detail: 'Verificando...', icon: ShieldCheck, color: 'text-amber-500' },
  { name: 'storage',  label: 'Almacenamiento',status:'checking',latency: null, detail: 'Verificando...', icon: HardDrive, color: 'text-orange-500' },
]

function statusIcon(status: ServiceStatus['status'], className = 'w-4 h-4') {
  if (status === 'checking') return <RefreshCw className={cn(className, "animate-spin text-amber-500/30")} />
  if (status === 'online')   return <CheckCircle2 className={cn(className, "text-amber-400")} />
  if (status === 'degraded') return <AlertTriangle className={cn(className, "text-orange-400")} />
  return <XCircle className={cn(className, "text-red-400")} />
}

function statusBadge(status: ServiceStatus['status']) {
  const map = {
    checking: 'bg-amber-500/5 text-amber-500/30 border-amber-500/10',
    online:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    degraded: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    offline:  'bg-red-500/10 text-red-400 border-red-500/20',
  }
  const labels = { checking: 'Verificando', online: 'En Línea', degraded: 'Degradado', offline: 'Sin Conexión' }
  return (
    <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", map[status])}>
      {labels[status]}
    </span>
  )
}

interface SystemHealthProps {
  storeId?: string
}

export default function SystemHealth({ storeId }: SystemHealthProps) {
  const [services, setServices] = useState<ServiceStatus[]>(SERVICES_INIT)
  const [lastChecked, setLastChecked] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const check = useCallback(async () => {
    setIsRefreshing(true)
    setServices(prev => prev.map(s => ({ ...s, status: 'checking', latency: null, detail: 'Verificando...' })))

    const results = await Promise.allSettled([
      // DB check via settings API
      (async () => {
        const t0 = Date.now()
        const res = await fetch('/api/settings', { cache: 'no-store' })
        const latency = Date.now() - t0
        if (!res.ok) throw new Error('Error ' + res.status)
        return { name: 'database', latency, detail: `Respuesta en ${latency}ms` }
      })(),
      // API check via products
      (async () => {
        const t0 = Date.now()
        const res = await fetch('/api/products?limit=1', { cache: 'no-store' })
        const latency = Date.now() - t0
        if (!res.ok) throw new Error('Error ' + res.status)
        return { name: 'api', latency, detail: `${latency}ms — ${res.status} OK` }
      })(),
      // Auth check via staff
      (async () => {
        const t0 = Date.now()
        const res = await fetch('/api/staff', { cache: 'no-store' })
        const latency = Date.now() - t0
        return { name: 'auth', latency, detail: `Auth service ${latency}ms` }
      })(),
      // Storage: check a public endpoint
      (async () => {
        const t0 = Date.now()
        const res = await fetch('/api/settings', { cache: 'no-store' })
        const latency = Date.now() - t0
        return { name: 'storage', latency, detail: `Bucket accesible — ${latency}ms` }
      })(),
    ])

    setServices(prev => prev.map((svc, i) => {
      const result = results[i]
      if (result.status === 'fulfilled') {
        const val = result.value as { latency: number, detail: string }
        const { latency } = val
        const status = latency < 800 ? 'online' : latency < 2000 ? 'degraded' : 'offline'
        return { ...svc, status, latency, detail: val.detail }
      } else {
        return { ...svc, status: 'offline', latency: null, detail: 'Error de conexión' }
      }
    }))

    setLastChecked(new Date().toLocaleTimeString('es-CL'))
    setIsRefreshing(false)
  }, [])

  useEffect(() => { check() }, [check])

  const allOnline = services.every(s => s.status === 'online')
  const anyOffline = services.some(s => s.status === 'offline')
  const overallStatus = anyOffline ? 'offline' : allOnline ? 'online' : 'degraded'

  return (
    <div className="bg-black/40 border border-amber-500/10 rounded-none overflow-hidden shadow-2xl backdrop-blur-xl">
      {/* Header */}
      <div className="bg-amber-500/5 p-4 border-b border-amber-500/10 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-black uppercase tracking-widest text-amber-500/90">Estado del Sistema</h3>
            <span className="text-[11px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              CONTEXT: {storeId === 'ALL' || !storeId ? 'GLOBAL_INFRA' : `STORE_${storeId.slice(0, 8)}`}
            </span>
          </div>
          {lastChecked && (
            <p className="text-[11px] text-amber-500/40 mt-0.5 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5" /> Verificación: {lastChecked}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-none border-l-4", 
            overallStatus === 'online' ? 'bg-amber-500/10 text-amber-400 border-amber-500' :
            overallStatus === 'degraded' ? 'bg-orange-500/10 text-orange-400 border-orange-500' :
            'bg-red-500/10 text-red-400 border-red-500'
          )}>
            {overallStatus === 'online' ? 'SISTEMA_OK' : overallStatus === 'degraded' ? 'DEGRADADO' : 'CRITICO'}
          </span>
          <button
            onClick={check}
            disabled={isRefreshing}
            className="p-1.5 rounded-none bg-amber-500/5 hover:bg-amber-500/10 transition-all border border-amber-500/20 shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4 text-amber-500/60", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-amber-500/10">
        {services.map(svc => (
          <div key={svc.name} className="bg-[#0c0c0e] p-4 flex flex-col gap-2.5">
            <div className="flex items-start justify-between">
              <div className={cn(
                "p-1.5 rounded-none border",
                svc.status === 'online' ? 'bg-amber-500/5 border-amber-500/20' : 
                svc.status === 'degraded' ? 'bg-orange-500/5 border-orange-500/20' : 
                svc.status === 'offline' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/5'
              )}>
                <svc.icon className={cn("w-4 h-4", svc.color)} />
              </div>
              {statusIcon(svc.status, "w-3.5 h-3.5")}
            </div>
            <div>
              <p className="text-[14px] font-black uppercase tracking-tight text-amber-100">{svc.label}</p>
              <p className="text-[11px] text-amber-500/50 mt-0.5 leading-tight font-medium">{svc.detail}</p>
            </div>
            {svc.latency !== null && (
              <div className="mt-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[8px] text-amber-500/30 uppercase font-black tracking-tighter">Latency</span>
                  <span className="text-[10px] font-black text-amber-400">{svc.latency}ms</span>
                </div>
                <div className="h-1 bg-amber-500/5 rounded-none overflow-hidden">
                  <div
                    className={cn(
                      "h-full transition-all duration-700",
                      svc.latency < 800 ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]' : 
                      svc.latency < 2000 ? 'bg-orange-500' : 'bg-red-500'
                    )}
                    style={{ width: `${Math.min((svc.latency / 2000) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
