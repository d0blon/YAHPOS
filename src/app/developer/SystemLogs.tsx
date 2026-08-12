'use client'

import { useState, useEffect, useRef } from 'react'
import { Terminal, Shield, AlertTriangle, CheckCircle2, Search, RefreshCw } from 'lucide-react'
import { getRealLogsAction } from './actions/logs'
import { cn } from '@/lib/utils'

import { SystemLog } from '@/types'

export default function SystemLogs({ storeId }: { storeId?: string }) {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [filter, setFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const realLogs = await getRealLogsAction(storeId)
      setLogs(realLogs as SystemLog[])
    } catch (err) {
      console.error("Error fetching real logs UI:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 15000) // Polling real cada 15s
    return () => clearInterval(interval)
  }, [storeId])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const filteredLogs = logs.filter(l => 
    l.message.toLowerCase().includes(filter.toLowerCase()) || 
    l.category.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="bg-black/40 border border-amber-500/10 rounded-none overflow-hidden shadow-2xl flex flex-col h-[500px] backdrop-blur-xl">
      <div className="bg-amber-500/5 p-4 border-b border-amber-500/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500/20 border border-orange-500/40" />
          </div>
          <h3 className="text-[13px] font-black uppercase tracking-widest text-amber-500/90 flex items-center gap-2 ml-2">
            <Terminal className="h-4 w-4" /> Monitor de Operaciones
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-1.5 rounded-none hover:bg-amber-500/10 text-amber-500/60 transition-colors disabled:opacity-50 border border-amber-500/20"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-amber-500/40" />
            <input 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filtrar eventos..."
              className="bg-black/60 border border-amber-500/20 rounded-none py-1.5 pl-9 pr-4 text-[11px] focus:outline-none focus:border-amber-500/60 w-48 text-amber-50 font-medium placeholder:text-amber-500/20"
            />
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[12px] space-y-2.5 scrollbar-hide bg-[#0c0c0e]"
      >
        {filteredLogs.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-amber-500/10 gap-3">
            <Terminal className="h-10 w-10" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-black">Sin eventos</span>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-amber-500/30 shrink-0 font-bold text-[10px]">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className={cn(
                "px-2 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest shrink-0 border border-current opacity-80",
                log.type === 'INFO' ? "bg-amber-500/5 text-amber-500/60" :
                log.type === 'SUCCESS' ? "bg-amber-500/10 text-amber-400" :
                log.type === 'WARN' ? "bg-orange-500/10 text-orange-400" :
                "bg-red-500/10 text-red-400"
              )}>
                {log.category}
              </span>
              <span className={cn(
                "break-all font-medium leading-relaxed",
                log.type === 'ERROR' ? "text-red-400" : "text-amber-50/80"
              )}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="bg-amber-500/5 p-3 text-[9px] text-amber-500/30 border-t border-amber-500/10 flex justify-between uppercase font-bold tracking-widest">
        <span>Historial: {logs.length} eventos</span>
        <span className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
          Conexión Live DB
        </span>
      </div>
    </div>
  )
}
