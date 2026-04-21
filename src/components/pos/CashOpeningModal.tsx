'use client'

import React, { useState, useEffect } from 'react'
import { Monitor, DollarSign, User, Loader2, ChevronRight, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatPrice } from '@/lib/utils'
import { CashSession } from '@/stores/posStore'
import { toast } from 'sonner'

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

      const res = await fetch(`/api/cash-sessions?cashier=${encodeURIComponent(cashierName)}`, {
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
        setStep('resume')
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

  const handleResumeSession = () => {
    if (existingSession) {
      onResumeSession(existingSession)
      toast.success(`Sesión retomada — ${existingSession.terminal_name ?? 'Caja'}`)
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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-gray-950/95 backdrop-blur-md">
      <div className="w-full max-w-md mx-4">

        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-corporate-blue to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xl shadow-blue-500/30">
            <Monitor className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">AustralPOS</h1>
          <p className="text-gray-400 text-sm mt-1">Bienvenido, <span className="text-white font-bold">{cashierName}</span></p>
        </div>

        {/* Step: Checking */}
        {step === 'checking' && (
          <div className="bg-gray-900 rounded-3xl p-8 text-center">
            <Loader2 className="w-8 h-8 text-corporate-blue animate-spin mx-auto mb-3" />
            <p className="text-gray-300 font-medium">Verificando sesión activa...</p>
          </div>
        )}

        {/* Step: Resume existing session */}
        {step === 'resume' && existingSession && (
          <div className="bg-gray-900 rounded-3xl p-8 space-y-6">
            <div className="text-center">
              <p className="text-white font-black text-lg">Sesión activa encontrada</p>
              <p className="text-gray-400 text-sm mt-1">Tienes una caja abierta desde otro dispositivo</p>
            </div>
            <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Terminal</span>
                <span className="text-white font-bold">{existingSession.terminal_name ?? `Caja ${existingSession.terminal_id}`}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Abierta a las</span>
                <span className="text-white font-bold">{new Date(existingSession.opened_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Fondo inicial</span>
                <span className="text-green-400 font-black">{formatPrice(existingSession.opening_amount)}</span>
              </div>
            </div>
            <div className="space-y-3">
              <Button
                onClick={handleResumeSession}
                className="w-full h-14 text-lg font-black bg-corporate-blue hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-900/40"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Retomar esta sesión
              </Button>
              <button
                onClick={async () => { await loadTerminals(); setStep('select-terminal') }}
                className="w-full text-gray-400 text-sm hover:text-white transition-colors py-2"
              >
                Abrir nueva sesión en otra caja
              </button>
            </div>
          </div>
        )}

        {/* Step: Select terminal */}
        {step === 'select-terminal' && (
          <div className="bg-gray-900 rounded-3xl p-8 space-y-5">
            <div className="text-center">
              <p className="text-white font-black text-lg">¿Qué caja vas a usar?</p>
              <p className="text-gray-400 text-sm mt-1">Selecciona el terminal de esta sesión</p>
            </div>
            <div className="space-y-3">
              {terminals.map(terminal => (
                <button
                  key={terminal.id}
                  onClick={() => handleSelectTerminal(terminal)}
                  className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-corporate-blue/50 rounded-2xl p-5 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 bg-gradient-to-br from-corporate-blue/20 to-blue-500/20 rounded-xl flex items-center justify-center border border-corporate-blue/30">
                      <Monitor className="w-5 h-5 text-corporate-blue" />
                    </div>
                    <div className="text-left">
                      <p className="text-white font-bold">{terminal.name}</p>
                      {terminal.description && <p className="text-gray-400 text-sm">{terminal.description}</p>}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-corporate-blue transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Opening Amount */}
        {step === 'opening-amount' && selectedTerminal && (
          <div className="bg-gray-900 rounded-3xl p-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full mb-4">
                <Monitor className="w-4 h-4 text-corporate-blue" />
                <span className="text-white font-bold text-sm">{selectedTerminal.name}</span>
              </div>
              <p className="text-white font-black text-xl">Fondo de Caja</p>
              <p className="text-gray-400 text-sm mt-1">¿Cuánto dinero en efectivo hay en la caja para dar vuelto?</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={openingAmount}
                  onChange={e => setOpeningAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleOpenSession()}
                  placeholder="0"
                  autoFocus
                  className="w-full bg-gray-800 border border-gray-700 focus:border-corporate-blue rounded-2xl text-center text-4xl font-black text-white py-6 pl-10 focus:outline-none focus:ring-2 focus:ring-corporate-blue/30 transition-all"
                />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2">
                {[5000, 10000, 20000, 50000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setOpeningAmount(String(amount))}
                    className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-corporate-blue/50 rounded-xl py-2 text-sm font-bold text-gray-300 hover:text-white transition-all"
                  >
                    {formatPrice(amount)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleOpenSession}
                disabled={isLoading}
                className="w-full h-16 text-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-900/40"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <DollarSign className="w-5 h-5 mr-2" />}
                {openingAmount && parseInt(openingAmount) > 0 
                  ? `Abrir con ${formatPrice(parseInt(openingAmount))}` 
                  : 'Abrir Caja sin Fondo'}
              </Button>
              <button
                onClick={() => setStep('select-terminal')}
                className="w-full text-gray-400 text-sm hover:text-white transition-colors py-2"
              >
                ← Cambiar terminal
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-gray-600 text-xs mt-6">
          {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
