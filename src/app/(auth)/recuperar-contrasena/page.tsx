'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export default function RecuperarContrasenaPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/v3/reset-password`,
      })

      if (error) throw error

      setIsSent(true)
      toast.success('Correo de recuperación enviado')
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el correo')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <Link 
          href="/login" 
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-corporate-blue transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
        </Link>

        <div className="glass-card p-8 md:p-10">
          <div className="w-16 h-16 bg-corporate-blue/10 rounded-2xl flex items-center justify-center mb-6">
            <KeyRound className="w-8 h-8 text-corporate-blue" />
          </div>

          <h1 className="text-3xl font-black tracking-tighter uppercase italic mb-2">
            ¿Olvidaste tu <span className="text-corporate-blue">contraseña?</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium mb-8">
            No te preocupes, dinos tu correo y te enviaremos las instrucciones para recuperarla.
          </p>

          {!isSent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-gray-400 pl-1">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input 
                    id="email"
                    type="email"
                    placeholder="ejemplo@correo.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-14 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-corporate-blue/20"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-14 bg-corporate-blue hover:bg-corporate-dark text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-corporate-blue/20 transition-all"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  'Enviar Instrucciones'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">¡Correo enviado!</h3>
              <p className="text-sm text-gray-500 mb-6">
                Hemos enviado un enlace de recuperación a <strong>{email}</strong>. Revisa tu bandeja de entrada y spam.
              </p>
              <Button 
                variant="outline"
                onClick={() => setIsSent(false)}
                className="w-full h-12 rounded-xl font-bold border-gray-200"
              >
                Intentar con otro correo
              </Button>
            </div>
          )}
        </div>

        <p className="text-center mt-8 text-xs text-gray-400 font-medium">
          AustralMarket Security System v3.1
        </p>
      </div>
    </div>
  )
}
