'use client'

import { useState, useEffect, useRef } from 'react'
import { Terminal, Shield, AlertTriangle, CheckCircle2, Search } from 'lucide-react'

interface Log {
  id: string
  timestamp: string
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
  message: string
  service: string
}

export default function SystemLogs() {
  const [logs, setLogs] = useState<Log[]>([])
  const [filter, setFilter] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const addLog = (message: string, type: Log['type'] = 'INFO', service: string = 'API') => {
    const newLog: Log = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      service
    }
    setLogs(prev => [...prev.slice(-49), newLog])
  }

  useEffect(() => {
    // Simulated initial logs
    const initialLogs: Log[] = [
      { id: '1', timestamp: new Date().toLocaleTimeString(), type: 'SUCCESS', message: 'Núcleo de sistema iniciado correctamente', service: 'CORE' },
      { id: '2', timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'Conexión con Supabase establecida', service: 'DB' },
      { id: '3', timestamp: new Date().toLocaleTimeString(), type: 'INFO', message: 'Escuchando eventos de Webhooks...', service: 'WEBHOOK' },
    ]
    setLogs(initialLogs)

    // Simulation loop
    const messages = [
      { msg: 'Petición GET /api/products procesada', type: 'INFO', svc: 'API' },
      { msg: 'Nuevo pedido en E-commerce #882', type: 'SUCCESS', svc: 'ORDERS' },
      { msg: 'Sincronización de inventario completada', type: 'INFO', svc: 'SYNC' },
      { msg: 'Latencia de red detectada: 120ms', type: 'WARN', svc: 'NETWORK' },
      { msg: 'Intento de acceso denegado (IP: 192.168.1.1)', type: 'ERROR', svc: 'AUTH' },
      { msg: 'Backup automático generado', type: 'SUCCESS', svc: 'BACKUP' },
    ]

    const interval = setInterval(() => {
      const random = messages[Math.floor(Math.random() * messages.length)]
      addLog(random.msg, random.type as Log['type'], random.svc)
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const filteredLogs = logs.filter(l => 
    l.message.toLowerCase().includes(filter.toLowerCase()) || 
    l.service.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="bg-black/80 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl flex flex-col h-[500px]">
      <div className="bg-white/5 p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
            <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
            <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/40" />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2 ml-2">
            <Terminal className="h-3 w-3" /> Consola de Sistema
          </h3>
        </div>
        <div className="relative">
          <Search className="h-3 w-3 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filtrar logs..."
            className="bg-black/40 border border-white/10 rounded-full py-1.5 pl-8 pr-4 text-[10px] focus:outline-none focus:border-purple-500/50 w-48"
          />
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-1.5 scrollbar-hide"
      >
        {filteredLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 animate-slide-in">
            <span className="text-gray-600 shrink-0 font-bold">[{log.timestamp}]</span>
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter shrink-0",
              log.type === 'INFO' ? "bg-blue-500/10 text-blue-400" :
              log.type === 'SUCCESS' ? "bg-green-500/10 text-green-400" :
              log.type === 'WARN' ? "bg-amber-500/10 text-amber-400" :
              "bg-red-500/10 text-red-400"
            )}>
              {log.service}
            </span>
            <span className={cn(
              "break-all",
              log.type === 'ERROR' ? "text-red-400 font-bold" : "text-gray-300"
            )}>
              {log.message}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white/5 p-3 text-[9px] text-gray-500 border-t border-white/5 flex justify-between uppercase font-bold tracking-widest">
        <span>Total Eventos: {logs.length}</span>
        <span className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Socket Conectado
        </span>
      </div>
    </div>
  )
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}
