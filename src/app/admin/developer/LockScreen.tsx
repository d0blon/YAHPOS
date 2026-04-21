'use client'

import { useState } from 'react'
import { KeyRound, ShieldCheck, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { verifyDeveloperAccessAction } from './actions'

export default function LockScreen() {
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !code) {
      toast.error('Completa todos los campos')
      return
    }

    setLoading(true)
    try {
      const result = await verifyDeveloperAccessAction(password, code)
      if (result.success) {
        toast.success('Acceso concedido. Entrando en el núcleo...')
        // Recargar la página para que el servidor detecte la nueva cookie
        window.location.reload()
      } else {
        toast.error(result.error || 'Credenciales inválidas')
      }
    } catch (error) {
      toast.error('Error de sistema crítico')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] animate-fade-in">
      <Card className="w-full max-w-md bg-black/60 backdrop-blur-xl border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] rounded-[2rem] overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 animate-shimmer" />
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-purple-500/10 rounded-3xl flex items-center justify-center mb-4 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <ShieldCheck className="h-10 w-10 text-purple-400" />
            </div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 uppercase tracking-tighter italic">
              Patagonia<span className="text-purple-500">POS</span>
            </h1>
            <p className="text-purple-400/60 text-xs font-bold uppercase tracking-[0.2em] mt-2">
              Terminal de Seguridad Encriptada
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Clave de Bóveda</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-purple-500/50" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce contraseña..."
                  className="w-full bg-white/5 border border-purple-500/20 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-purple-500/50 transition-all text-white placeholder:text-gray-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 ml-1">Código Authy</label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-fuchsia-500/50" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 dígitos"
                  className="w-full bg-white/5 border border-fuchsia-500/20 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-fuchsia-500/50 transition-all text-white text-center text-2xl tracking-[0.5em] font-black placeholder:text-gray-600"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-[0_10px_20px_rgba(168,85,247,0.3)] group overflow-hidden relative"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span className="relative z-10">Desbloquear Acceso</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-12 group-hover:translate-y-0 transition-transform duration-300" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-[9px] text-gray-600 font-medium uppercase tracking-widest leading-loose">
            ADVERTENCIA: Todo acceso fallido es registrado.<br/>
            Propiedad de PatagoniaPOS Technology v0.1.0
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
