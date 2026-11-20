'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Monitor, DollarSign, Loader2, ChevronRight, RefreshCw, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'
import { CashSession } from '@/stores/posStore'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

const OFFLINE_TERMINAL: Terminal = { id: 'offline-1', name: 'Caja 1', description: 'Terminal principal', is_active: true, status: 'closed' }

interface Terminal {
  id: string | number
  name: string
  description?: string
  is_active: boolean
  status: 'open' | 'closed'
  current_user_id?: string
  current_user_name?: string
  current_user?: {
    first_name: string
    last_name: string
  }
}

interface Props {
  isOpen: boolean
  cashierName: string
  onSessionOpened: (session: CashSession) => void
  onResumeSession: (session: CashSession) => void
}

export function CashOpeningModal({ isOpen, cashierName, onSessionOpened, onResumeSession }: Props) {
  const authUser = useAuthStore(state => state.user)
  const router = useRouter()
  const [step, setStep] = useState<'checking' | 'resume' | 'select-terminal' | 'opening-amount'>('checking')
  const [terminals, setTerminals] = useState<Terminal[]>([])
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null)
  const [openingAmount, setOpeningAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [existingSession, setExistingSession] = useState<CashSession | null>(null)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  const fetchTerminals = useCallback(async (): Promise<Terminal[]> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const res = await fetch('/api/terminals', { signal: controller.signal })
      clearTimeout(timeoutId)

      const data: unknown = await res.json()
      return Array.isArray(data) ? data as Terminal[] : [OFFLINE_TERMINAL]
    } catch {
      return [OFFLINE_TERMINAL]
    }
  }, [])

  const handleResumeSession = useCallback(async (session: CashSession) => {
    onResumeSession(session)

    const { usePosStore } = await import('@/stores/posStore')
    await usePosStore.getState().loadDraftFromServer(session.id)

    toast.success(`Sesión retomada — ${session.terminal_name ?? 'Caja'}`)
  }, [onResumeSession])

  const fetchExistingSession = useCallback(async (): Promise<{ session: CashSession | null; terminals: Terminal[] }> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      // El API ahora filtra por user_id automáticamente
      const res = await fetch('/api/cash-sessions', {
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const payload: { session?: CashSession; tableExists?: boolean } = await res.json()

      if (payload.session) return { session: payload.session, terminals: [] }
      return { session: null, terminals: await fetchTerminals() }
    } catch {
      // Network error, timeout, or abort — show terminal selection anyway
      return { session: null, terminals: [OFFLINE_TERMINAL] }
    }
  }, [fetchTerminals])

  useEffect(() => {
    if (!isOpen || !cashierName) return
    let cancelled = false

    fetchExistingSession().then(({ session, terminals }) => {
      if (cancelled) return
      if (session) {
        setExistingSession(session)
        void handleResumeSession(session)
      } else {
        setTerminals(terminals)
        setStep('select-terminal')
      }
    })

    return () => { cancelled = true }
  }, [isOpen, cashierName, fetchExistingSession, handleResumeSession])

  if (isOpen && !prevIsOpen) {
    setPrevIsOpen(true)
    setStep('checking')
  } else if (!isOpen && prevIsOpen) {
    setPrevIsOpen(false)
  }

  const reloadTerminals = async () => {
    setTerminals(await fetchTerminals())
    setStep('select-terminal')
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
          terminal_id: selectedTerminal?.id,
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
          terminal_id: Number(selectedTerminal?.id) || 0,
          terminal_name: selectedTerminal?.name ?? 'Caja',
          cashier_name: cashierName,
          opening_amount: amount,
          opened_at: new Date().toISOString(),
          status: 'open',
        }
        toast.warning('Modo sin conexión — sesión guardada localmente')
      }

      onSessionOpened(sessionData)
      
      // (Removido: El API ahora maneja el estado del perfil)

      toast.success(`¡Caja abierta! Fondo: ${formatPrice(amount)}`)
    } catch {
      // Complete offline fallback
      const offlineSession: CashSession = {
        id: Date.now(),
        terminal_id: Number(selectedTerminal?.id) || 0,
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
          <div className="w-20 h-20 bg-gradient-to-br from-brand-primary to-brand-accent-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-brand-primary/40 border-2 border-white/20">
            <Monitor className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">YAHPOS!</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] mt-2">Bienvenido, <span className="text-brand-primary/80">{cashierName}</span></p>
        </div>

        {/* Step: Checking */}
        {step === 'checking' && (
          <div className="bg-slate-900/50 rounded-[3rem] p-12 text-center border border-white/5 backdrop-blur-2xl">
            <div className="relative w-16 h-16 mx-auto mb-6">
                <RefreshCw className="w-16 h-16 text-brand-primary animate-spin opacity-20" />
                <Loader2 className="w-8 h-8 text-brand-primary/80 animate-spin absolute inset-0 m-auto" />
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
                onClick={() => handleResumeSession(existingSession)}
                className="w-full h-16 text-lg font-black bg-brand-primary hover:brightness-90 text-white rounded-2xl shadow-xl shadow-brand-primary/30 active:scale-95 transition-all"
              >
                <RefreshCw className="w-5 h-5 mr-3" />
                RETOMAR SESIÓN
              </Button>
              <button
                onClick={reloadTerminals}
                className="w-full text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-colors py-2"
              >
                ← O ABRIR NUEVA EN OTRA CAJA
              </button>
            </div>
          </div>
        )}

        {/* Step: Select terminal */}
        {step === 'select-terminal' && (
          <div className="bg-slate-900 rounded-[3rem] p-10 space-y-8 border border-white/10 shadow-2xl shadow-black max-h-[70vh] flex flex-col">
            <div className="text-center">
              <p className="text-white font-black text-2xl uppercase tracking-tight">Estación de Trabajo</p>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
                {terminals.every(t => t.status === 'open' && t.current_user_id !== authUser?.id)
                  ? '⚠️ Todas las cajas están en uso'
                  : '¿En qué caja operarás hoy?'}
              </p>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {terminals.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">No hay terminales configurados</p>
                </div>
              ) : (
                <>
                  {terminals.map(terminal => {
                    const isOccupied = terminal.status === 'open' && terminal.current_user_id !== authUser?.id
                    const isMine = terminal.status === 'open' && terminal.current_user_id === authUser?.id
                    const operatorName = terminal.current_user_name || 
                                   (terminal.current_user ? `${terminal.current_user.first_name} ${terminal.current_user.last_name}` : 'Otro Cajero')
                    
                    return (
                      <button
                        key={terminal.id}
                        disabled={isOccupied}
                        onClick={() => handleSelectTerminal(terminal)}
                        className={`w-full flex items-center justify-between border rounded-3xl p-6 transition-all group active:scale-95 ${
                          isOccupied 
                            ? 'bg-red-500/5 border-red-500/20 cursor-not-allowed opacity-60' 
                            : isMine
                              ? 'bg-brand-primary/10 border-brand-primary/40'
                              : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-brand-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-5">
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform ${
                            isOccupied 
                              ? 'bg-red-500/20 border-red-500/30' 
                              : 'bg-gradient-to-br from-brand-primary/20 to-brand-accent-500/20 border-brand-primary/30 group-hover:scale-110'
                          }`}>
                            <Monitor className={`w-6 h-6 ${isOccupied ? 'text-red-400' : 'text-brand-primary/80'}`} />
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-black text-lg uppercase tracking-tight">{terminal.name}</p>
                              {isOccupied && (
                                <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">En Uso</span>
                              )}
                            </div>
                            {isOccupied ? (
                              <p className="text-red-400/60 text-[10px] font-bold uppercase tracking-widest mt-1">
                                Ocupada por {operatorName}
                              </p>
                            ) : (
                              terminal.description && <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">{terminal.description}</p>
                            )}
                          </div>
                        </div>
                        {!isOccupied && <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-brand-primary/80 transition-colors" />}
                      </button>
                    )
                  })}
                </>
              )}
            </div>

            <div className="pt-6 border-t border-white/5 space-y-4">
              {terminals.every(t => t.status === 'open' && t.current_user_id !== authUser?.id) && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                   <p className="text-amber-200 text-[10px] font-black uppercase text-center tracking-widest">
                     No hay terminales disponibles en este momento.
                   </p>
                </div>
              )}
              <Button
                variant="ghost"
                onClick={() => router.replace('/admin')}
                className="w-full h-14 flex items-center justify-center gap-3 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl transition-all group"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Volver al Panel Administrativo</span>
              </Button>
            </div>
          </div>
        )}

        {/* Step: Opening Amount */}
        {step === 'opening-amount' && selectedTerminal && (
          <div className="bg-slate-900 rounded-[3rem] p-10 space-y-8 border border-white/10 shadow-2xl shadow-black">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-brand-primary/20 text-brand-primary/80 px-4 py-2 rounded-full mb-6 border border-brand-primary/30">
                <Monitor className="w-4 h-4" />
                <span className="font-black text-[10px] uppercase tracking-widest">{selectedTerminal.name}</span>
              </div>
              <p className="text-white font-black text-3xl uppercase tracking-tighter leading-none">Fondo Inicial</p>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-3">Sencillo disponible en gaveta</p>
            </div>

            <div className="space-y-6">
              <div className="relative group">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-slate-700 group-focus-within:text-brand-primary transition-colors">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={openingAmount}
                  onChange={e => setOpeningAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOpenSession()}
                  placeholder="0"
                  autoFocus
                  className="w-full bg-white/5 border-2 border-white/5 focus:border-brand-primary rounded-[2rem] text-center text-5xl font-black text-white py-10 focus:outline-none focus:ring-4 focus:ring-brand-primary/20 transition-all shadow-inner tracking-tighter"
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-3">
                {[5000, 10000, 20000, 50000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setOpeningAmount(String(amount))}
                    className="bg-white/5 hover:bg-brand-primary/20 border border-white/5 hover:border-brand-primary/50 rounded-2xl py-4 text-xs font-black text-slate-400 hover:text-white transition-all uppercase tracking-tighter"
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
