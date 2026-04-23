'use client'

import React, { useState, useEffect } from 'react'
import { Monitor, DollarSign, User, Loader2, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'
import { CashSession } from '@/stores/posStore'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

interface Terminal {
  id: number
  name: string
  description?: string
  is_active: boolean
}

interface Props {
  isOpen: boolean
  cashierName: string
  onSessionOpened: (session: CashSession) => void
  onResumeSession: (session: CashSession) => void
}

export function CashOpeningModal({ isOpen, cashierName, onSessionOpened, onResumeSession }: Props) {
  const [step, setStep] = useState<'checking' | 'resume' | 'select-terminal' | 'opening-amount'>('checking')
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [existingSession, setExistingSession] = useState<CashSession | null>(null)

  useEffect(() => {
    if (!isOpen || !cashierName) return
    checkForExistingSession()
  }, [isOpen, cashierName])

  const checkForExistingSession = async () => {
    setStep('checking')
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      // El API ahora filtra por user_id automáticamente
      const res = await fetch('/api/cash-sessions', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const { session, tableExists } = await res.json()

      if (!tableExists) {
        await loadTerminals()
        setStep('select-terminal')
        return
      }

      if (session) {
        setExistingSession(session)
        // AUTO-RESUME: Si hay sesión, no preguntamos, la retomamos de inmediato
        handleResumeSession(session)
      } else {
        await loadTerminals()
        setStep('select-terminal')
      }
    } catch {
      // Network error, timeout, or abort — show terminal selection anyway
      setTerminals([{ id: 1, name: 'Caja 1', description: 'Terminal principal', is_active: true }])
      setStep('select-terminal')
    }
  }

  const loadTerminals = async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)
      
      const res = await fetch('/api/terminals', { signal: controller.signal })
      clearTimeout(timeoutId)
      
      const data = await res.json()
      setTerminals(Array.isArray(data) ? data : [{ id: 1, name: 'Caja 1', description: 'Terminal principal', is_active: true }])
    } catch {
      setTerminals([{ id: 1, name: 'Caja 1', description: 'Terminal principal', is_active: true }])
    }
  }

  const handleResumeSession = async (sessionToResume?: CashSession) => {
    const session = sessionToResume || existingSession
    if (session) {
      // 1. Notificar al POS que la sesión se retomó
      onResumeSession(session)
      
      // 2. Cargar borrador (carrito y ventas en espera) desde el servidor
      const { usePosStore } = await import('@/stores/posStore')
      await usePosStore.getState().loadDraftFromServer(session.id)
      
      // 3. Actualizar estado del personal
      const authUser = useAuthStore.getState().user
      if (authUser?.id) {
        await supabase
          .from('profiles')
          .update({ current_area: session.terminal_name ?? 'Caja' })
          .eq('id', authUser.id)
      }

      toast.success(`Sesión retomada — ${session.terminal_name ?? 'Caja'}`)
    }
  }

  const handleSelectTerminal = (terminal: Terminal) => {
    setSelectedTerminal(terminal)
    setStep('opening-amount')
  }

  const handleOpenSession = async () => {
    const amount = parseInt(openingAmount.replace(/\D/g, ''), 10) || 0
    setIsLoading(true)

    try {
      const res = await fetch('/api/cash-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terminal_id: selectedTerminal?.id ?? 1,
          cashier_name: cashierName,
          opening_amount: amount,
        }),
      })

      let sessionData: CashSession

      if (res.ok) {
        const data = await res.json()
        sessionData = {
          id: data.id,
          terminal_id: data.terminal_id,
          terminal_name: selectedTerminal?.name ?? 'Caja',
          cashier_name: cashierName,
          opening_amount: amount,
          opened_at: data.opened_at ?? new Date().toISOString(),
          status: 'open',
        }
      } else {
        // Offline or DB error — create a local-only session
        sessionData = {
          id: Date.now(),
          terminal_id: selectedTerminal?.id ?? 1,
          terminal_name: selectedTerminal?.name ?? 'Caja',
          cashier_name: cashierName,
          opening_amount: amount,
          opened_at: new Date().toISOString(),
          status: 'open',
        }
        toast.warning('Modo sin conexión — sesión guardada localmente')
      }

      onSessionOpened(sessionData)
      
      // Actualizar estado del personal en Supabase
      const authUser = useAuthStore.getState().user
      if (authUser?.id) {
        await supabase
          .from('profiles')
          .update({ current_area: selectedTerminal?.name ?? 'Caja' })
          .eq('id', authUser.id)
      }

      toast.success(`¡Caja abierta! Fondo: ${formatPrice(amount)}`)
    } catch {
      // Complete offline fallback
      const offlineSession: CashSession = {
        id: Date.now(),
        terminal_id: selectedTerminal?.id ?? 1,
        terminal_name: selectedTerminal?.name ?? 'Caja',
        cashier_name: cashierName,
        opening_amount: parseInt(openingAmount.replace(/\D/g, ''), 10) || 0,
        opened_at: new Date().toISOString(),
        status: 'open',
      }
      onSessionOpened(offlineSession)
      toast.warning('Sin conexión — sesión local creada')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 overflow-hidden">
      <div className="w-full max-w-lg animate-in fade-in zoom-in-95 duration-500">

        {/* Logo / Branding */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-patagonia-600 to-cyan-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-patagonia-600/40 border-2 border-white/20">
            <Monitor className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">PatagoniaPOS</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Bienvenido, <span className="text-patagonia-400">{cashierName}</span></p>
        </div>

        {/* Step: Checking */}
        {step === 'checking' && (
          <div className="bg-slate-900/50 rounded-[3rem] p-12 text-center border border-white/5 backdrop-blur-2xl">
            <div className="relative w-16 h-16 mx-auto mb-6">
                <RefreshCw className="w-16 h-16 text-patagonia-600 animate-spin opacity-20" />
                <Loader2 className="w-8 h-8 text-patagonia-400 animate-spin absolute inset-0 m-auto" />
            </div>
            <p className="text-slate-300 font-black uppercase tracking-widest text-xs">Verificando sesión activa...</p>
          </div>
        )}

        {/* Step: Resume existing session */}
        {step === 'resume' && existingSession && (
          <div className="bg-slate-900 rounded-[3rem] p-10 space-y-8 border border-white/10 shadow-2xl shadow-black">
            <div className="text-center">
              <p className="text-white font-black text-2xl uppercase tracking-tight">Sesión Encontrada</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Tienes una caja activa en otro terminal</p>
            </div>
            <div className="bg-white/5 rounded-3xl p-6 space-y-4 border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Terminal</span>
                <span className="text-white font-black">{existingSession.terminal_name ?? `Caja ${existingSession.terminal_id}`}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Apertura</span>
                <span className="text-white font-black">{new Date(existingSession.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fondo Inicial</span>
                <span className="text-emerald-400 font-black text-xl">{formatPrice(existingSession.opening_amount)}</span>
              </div>
            </div>
            <div className="space-y-4">
              <Button
                onClick={() => handleResumeSession()}
                className="w-full h-16 text-lg font-black bg-patagonia-600 hover:bg-patagonia-700 text-white rounded-2xl shadow-xl shadow-patagonia-600/30 active:scale-95 transition-all"
              >
                <RefreshCw className="w-5 h-5 mr-3" />
                RETOMAR SESIÓN
              </Button>
              <button
                onClick={async () => { await loadTerminals(); setStep('select-terminal') }}
                className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors py-2"
              >
                ← O ABRIR NUEVA EN OTRA CAJA
              </button>
            </div>
          </div>
        )}

        {/* Step: Select terminal */}
        {step === 'select-terminal' && (
          <div className="bg-slate-900 rounded-[3rem] p-10 space-y-8 border border-white/10 shadow-2xl shadow-black max-h-[60vh] flex flex-col">
            <div className="text-center">
              <p className="text-white font-black text-2xl uppercase tracking-tight">Estación de Trabajo</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">¿En qué caja operarás hoy?</p>
            </div>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {terminals.map(terminal => (
                <button
                  key={terminal.id}
                  onClick={() => handleSelectTerminal(terminal)}
                  className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/5 hover:border-patagonia-600/50 rounded-3xl p-6 transition-all group active:scale-95"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-patagonia-600/20 to-cyan-500/20 rounded-2xl flex items-center justify-center border border-patagonia-600/30 group-hover:scale-110 transition-transform">
                      <Monitor className="w-6 h-6 text-patagonia-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-black text-lg uppercase tracking-tight">{terminal.name}</p>
                      {terminal.description && <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{terminal.description}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-patagonia-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Opening Amount */}
        {step === 'opening-amount' && selectedTerminal && (
          <div className="bg-slate-900 rounded-[3rem] p-10 space-y-8 border border-white/10 shadow-2xl shadow-black">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-patagonia-600/20 text-patagonia-400 px-4 py-2 rounded-full mb-6 border border-patagonia-600/30">
                <Monitor className="w-4 h-4" />
                <span className="font-black text-[10px] uppercase tracking-widest">{selectedTerminal.name}</span>
              </div>
              <p className="text-white font-black text-3xl uppercase tracking-tighter leading-none">Fondo Inicial</p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-3">Sencillo disponible en gaveta</p>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-700 group-focus-within:text-patagonia-600 transition-colors">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={openingAmount}
                  onChange={e => setOpeningAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOpenSession()}
                  placeholder="0"
                  autoFocus
                  className="w-full bg-white/5 border-2 border-white/5 focus:border-patagonia-600 rounded-[2rem] text-center text-5xl font-black text-white py-10 focus:outline-none focus:ring-4 focus:ring-patagonia-600/20 transition-all shadow-inner tracking-tighter"
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-3">
                {[5000, 10000, 20000, 50000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setOpeningAmount(String(amount))}
                    className="bg-white/5 hover:bg-patagonia-600/20 border border-white/5 hover:border-patagonia-600/50 rounded-2xl py-4 text-xs font-black text-slate-400 hover:text-white transition-all uppercase tracking-tighter"
                  >
                    {formatPrice(amount)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleOpenSession}
                disabled={isLoading}
                className="w-full h-20 text-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] shadow-xl shadow-emerald-900/40 active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin mr-3" /> : <DollarSign className="w-6 h-6 mr-3" />}
                {openingAmount && parseInt(openingAmount) > 0 
                  ? `ABRIR CON ${formatPrice(parseInt(openingAmount))}` 
                  : 'ABRIR SIN FONDO'}
              </Button>
              <button
                onClick={() => setStep('select-terminal')}
                className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors py-2"
              >
                ← CAMBIAR CAJA
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] mt-10">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
