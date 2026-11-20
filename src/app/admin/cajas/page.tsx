'use client'

import React, { useState, useEffect } from 'react'
import { 
  Monitor, 
  User, 
  Clock, 
  DollarSign, 
  PowerOff, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react'
import { SectionCard, SectionHeader } from '@/components/admin/SectionCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ForceClosureModal } from '@/components/admin/ForceClosureModal'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale/es'
import { supabase } from '@/lib/supabase'
import { useSaaS } from '@/providers/SaaSProvider'

interface CashSession {
  id: string;
  terminal_id: string;
  cashier_name: string;
  opened_at: string;
  opening_amount: number;
  terminals?: {
    name: string;
  };
}

export default function AdminCajasPage() {
  const { storeId } = useSaaS()
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null)

  const fetchSessions = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/cash-sessions')
      if (!res.ok) throw new Error('No se pudieron cargar las sesiones')
      const data = await res.json()
      setSessions(data)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const fetchSessionsWithCheck = async () => {
      try {
        setIsLoading(true)
        const res = await fetch('/api/admin/cash-sessions')
        if (!res.ok) throw new Error('No se pudieron cargar las sesiones')
        const data = await res.json()
        if (isMounted) setSessions(data)
      } catch (err: unknown) {
        if (isMounted) {
          const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
          setError(errorMessage)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchSessionsWithCheck()

    if (!storeId) {
      return () => { isMounted = false }
    }

    const channel = supabase
      .channel(`admin_cash_sessions-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cash_sessions',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          fetchSessionsWithCheck()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [storeId])

  const filteredSessions = sessions.filter(s => 
    s.cashier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.terminals?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <SectionHeader 
          title="Gestión de Cajas" 
          subtitle="Supervise y gestione las sesiones de terminales en tiempo real"
        />
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-primary transition-colors" />
            <Input 
              placeholder="Buscar por cajero o terminal..."
              className="pl-10 w-[300px] h-11 bg-white border-gray-100 rounded-xl focus:ring-brand-primary/20 transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={fetchSessions}
            className="h-11 rounded-xl border-gray-100 hover:bg-white"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Sincronizar
          </Button>
        </div>
      </div>

      <SectionCard>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
            <p className="font-medium animate-pulse">Obteniendo estado de terminales...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-500 bg-red-50/50 rounded-3xl border border-red-100">
            <AlertCircle className="w-10 h-10" />
            <p className="font-bold">{error}</p>
            <Button variant="outline" onClick={fetchSessions} className="rounded-xl border-red-200 text-red-600 hover:bg-red-100">
              Reintentar
            </Button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400">
            <div className="p-6 bg-gray-50 rounded-full border border-gray-100">
              <Monitor className="w-12 h-12 opacity-20" />
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-gray-600">No hay sesiones abiertas</p>
              <p className="text-sm">Todos los terminales están disponibles o cerrados.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-2">
            {filteredSessions.map((session) => (
              <div 
                key={session.id}
                className="group relative overflow-hidden bg-white border border-gray-100 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-primary/5 hover:-translate-y-1"
              >
                {/* Glass Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
                
                <div className="relative flex flex-col h-full">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-brand-primary/10 rounded-2xl">
                        <Monitor className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{session.terminals?.name || 'Terminal Desconocido'}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary/60">ID: {session.id.slice(0,8)}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-50 text-green-600 border-green-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                      Activo
                    </Badge>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-gray-600">
                      <User className="w-4 h-4 opacity-40" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tighter text-gray-400 leading-none">Cajero</p>
                        <p className="text-sm font-bold text-gray-700">{session.cashier_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <Clock className="w-4 h-4 opacity-40" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tighter text-gray-400 leading-none">Abierta desde</p>
                        <p className="text-sm font-medium">
                          {format(new Date(session.opened_at), "HH:mm 'hrs' — dd MMM", { locale: es })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-gray-600">
                      <DollarSign className="w-4 h-4 opacity-40" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-tighter text-gray-400 leading-none">Monto Apertura</p>
                        <p className="text-sm font-bold text-gray-900">
                          ${session.opening_amount?.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Estado Real-time</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-green-600">Sincronizado</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setSelectedSession(session)}
                      variant="ghost" 
                      className="h-12 px-6 rounded-2xl text-red-500 hover:text-red-600 hover:bg-red-50 group-hover:bg-red-50 transition-all font-bold text-xs"
                    >
                      <PowerOff className="w-4 h-4 mr-2" />
                      Cierre Forzado
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {selectedSession && (
        <ForceClosureModal 
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
          onSuccess={() => {
            setSelectedSession(null)
            fetchSessions()
          }}
        />
      )}
    </div>
  )
}
