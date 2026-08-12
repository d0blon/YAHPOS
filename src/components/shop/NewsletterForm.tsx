"use client"

import { useState } from 'react'
import { Award } from 'lucide-react'
import { toast } from 'sonner'

export default function NewsletterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email) {
      toast.error('Por favor, ingresa tu nombre y correo electrónico.')
      return
    }

    setSubmitted(true)
    toast.success('¡Suscripción exitosa!', {
      description: 'Te hemos enviado el cupón de $2.000 a tu correo.',
      duration: 3000
    })
  }

  if (submitted) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 border border-emerald-100 dark:border-emerald-950/30 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <Award className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-gray-900 dark:text-white font-heading">¡Felicidades {name}!</h3>
        <p className="text-sm text-gray-650 dark:text-gray-400">
          Tu suscripción ha sido confirmada. Aquí tienes tu cupón de bienvenida:
        </p>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-2 border-dashed border-emerald-300 dark:border-emerald-850 p-4 rounded-xl">
          <span className="text-2xl font-black text-emerald-800 dark:text-emerald-400 tracking-wider font-heading">YAHPOS2000</span>
        </div>
        <p className="text-xs text-gray-450 dark:text-gray-500">
          Usa este código al finalizar tu compra para obtener $2.000 de descuento.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 border border-gray-100 dark:border-gray-800">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Tu Nombre</label>
          <input
            type="text"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-gray-950 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all dark:text-white font-medium"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Correo Electrónico</label>
          <input
            type="email"
            placeholder="tucorreo@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-gray-200 dark:border-gray-850 bg-gray-50 dark:bg-gray-950 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all dark:text-white font-medium"
            required
          />
        </div>
        <button
          type="submit"
          className="w-full h-12 bg-brand-primary hover:bg-brand-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-brand-primary/25 cursor-pointer font-heading"
        >
          Quiero mi descuento
        </button>
        <p className="text-[11px] text-gray-400 dark:text-gray-550 text-center leading-relaxed">
          Al suscribirte aceptas el envío de catálogos y nuestras políticas de privacidad.
        </p>
      </form>
    </div>
  )
}
