'use client'

import React, { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Phone, FileText, ArrowRight, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatRut, cleanRut } from '@/lib/utils'

function CompletarPerfilForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromGoogle = searchParams.get('from') === 'google'

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [rut, setRut] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName || !lastName) {
      toast.error('Por favor ingresa tu nombre y apellido')
      return
    }

    setIsLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          rut: cleanRut(rut),
          profile_completed: true,
        }
      })
      if (error) throw error

      if (authData.user) {
        // Almacenar explícitamente en public.profiles
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            phone,
            rut: cleanRut(rut)
          })
          .eq('id', authData.user.id)
          
        if (profileError) throw profileError
      }

      toast.success('¡Perfil completado! Bienvenido a AustralMarket.')
      router.push('/')
    } catch {
      toast.error('Error al guardar el perfil. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center py-16 w-full">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-brand-accent-100/50 dark:shadow-black/40 border border-white/20 dark:border-gray-800/50 overflow-hidden">
              <div className="h-1.5 bg-gradient-to-r from-brand-primary via-brand-accent-400 to-brand-accent" />

              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-green-500/20">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    {fromGoogle ? '¡Cuenta Google conectada!' : 'Completa tu perfil'}
                  </h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Solo necesitamos un par de datos más para comenzar
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Nombre <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          id="complete-first-name"
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="Juan"
                          className="w-full pl-9 pr-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Apellido <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          id="complete-last-name"
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Pérez"
                          className="w-full pl-9 pr-3 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="complete-phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+56 9 1234 5678"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      RUT <span className="text-gray-400 font-normal">(para boletas y puntos)</span>
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="complete-rut"
                        type="text"
                        value={rut}
                        onChange={(e) => setRut(formatRut(e.target.value))}
                        placeholder="12.345.678-9"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition-all text-sm"
                      />
                    </div>
                  </div>

                  <button
                    id="complete-profile-submit"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-brand-primary hover:bg-brand-accent-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-brand-accent-500/25 hover:shadow-brand-accent-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                  >
                    {isLoading ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <>Ir a AustralMarket <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
  )
}

export default function CompletarPerfilPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full" /></div>}>
      <CompletarPerfilForm />
    </Suspense>
  )
}
