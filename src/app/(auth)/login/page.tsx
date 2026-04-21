'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, Mail, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, setAuthSession } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Por favor completa todos los campos')
      return
    }
    try {
      await login(email, password)
      toast.success('¡Bienvenido de vuelta!')
      router.push('/')
    } catch (error) {
      toast.error('Credenciales inválidas. Intenta nuevamente.')
    }
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const metadata = session.user.user_metadata || {}
        const hasProfile = metadata.first_name || metadata.full_name
        
        // Sincronizar el usuario de Supabase con el store local (Zustand)
        const appUser = {
          id: session.user.id,
          email: session.user.email || '',
          firstName: metadata.first_name || metadata.full_name || 'Usuario',
          lastName: metadata.last_name || '',
          phone: metadata.phone || '',
          role: metadata.role || 'customer',
          loyaltyPoints: 0,
          wishlist: [],
          purchaseHistory: [],
          addresses: [],
          updatedAt: new Date().toISOString()
        }

        setAuthSession(appUser as any)

        // Si es la primera vez que se loguea (le falta el RUT), forzar el completado
        if (!hasProfile || !metadata.rut) {
          router.push('/completar-perfil?from=google')
        } else {
          toast.success('¡Autenticado exitosamente!')
          router.push('/')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router, setAuthSession])

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // El mismo archivo atrapará el token en la URL a la vuelta con el onAuthStateChange
          redirectTo: `${window.location.origin}/login`,
        },
      })
      if (error) throw error
    } catch (error) {
      toast.error('Error al conectar con Google. Intenta nuevamente.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 pt-28 pb-20">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">

            {/* Card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-blue-100/50 dark:shadow-black/40 border border-gray-100 dark:border-gray-800 overflow-hidden">

              {/* Top accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-corporate-blue via-blue-400 to-accent-yellow" />

              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-corporate-blue to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/20">
                    <span className="text-white font-black text-2xl">A</span>
                  </div>
                  <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Ingresa a tu cuenta
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Tu supermercado online de confianza
                  </p>
                </div>

                {/* Google Button */}
                <button
                  onClick={handleGoogleLogin}
                  disabled={isGoogleLoading}
                  className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-semibold text-sm text-gray-700 dark:text-gray-300 mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGoogleLoading ? (
                    <svg className="w-5 h-5 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 7.1 29.3 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19c9.7 0 18-7.3 18.9-16.9.1-.7.1-1.3.1-2z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 7.1 29.3 5 24 5 16.4 5 9.8 9 6.3 14.7z"/>
                      <path fill="#4CAF50" d="M24 43c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.5 34.4 26.9 35 24 35c-5.2 0-9.5-3.3-11.2-7.9l-6.5 5C9.5 39.6 16.2 43 24 43z"/>
                      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.3-4.4 5.7l6.2 5.3C42.4 35.7 45 30.2 45 24c0-1.3-.2-2.6-.4-3.9z"/>
                    </svg>
                  )}
                  {isGoogleLoading ? 'Conectando...' : 'Continuar con Google'}
                </button>

                {/* Divider */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white dark:bg-gray-900 px-4 text-xs text-gray-400 font-medium uppercase tracking-widest">
                      O con tu email
                    </span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="login-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/40 focus:border-corporate-blue transition-all text-sm"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Contraseña
                      </label>
                      <Link href="/recuperar-contrasena" className="text-xs text-corporate-blue hover:underline font-medium">
                        ¿Olvidaste tu contraseña?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-12 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-corporate-blue/40 focus:border-corporate-blue transition-all text-sm"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      id="remember-me"
                      type="checkbox"
                      className="rounded border-gray-300 text-corporate-blue focus:ring-corporate-blue"
                    />
                    <label htmlFor="remember-me" className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                      Recordarme en este dispositivo
                    </label>
                  </div>

                  <button
                    id="login-submit"
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-corporate-blue hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
                  >
                    {isLoading ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    ) : (
                      <>Ingresar <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                {/* Register link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    ¿No tienes cuenta?{' '}
                    <Link href="/registro" className="text-corporate-blue font-bold hover:underline">
                      Crear cuenta gratis
                    </Link>
                  </p>
                </div>

                {/* Dev credentials hint */}
                <div className="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-0.5">Credenciales de prueba</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500">
                        cliente@australmarket.cl / password
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
