'use client'

import React from 'react'
import { ShieldCheck, Eye, Database, Share2, Bell, Mail } from 'lucide-react'

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-black uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4" /> Privacidad Asegurada
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic mb-4">
            Política de <span className="text-emerald-600">Privacidad</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto font-medium">
            En YAHPOS!, tu privacidad es nuestra prioridad. Descubre cómo protegemos y gestionamos tus datos.
          </p>
        </div>

        {/* Content */}
        <div className="glass-card p-10 space-y-12">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center">
                <Eye className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">1. Recolección de Información</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Recopilamos información personal necesaria para la prestación de nuestros servicios, como nombre, RUT, correo electrónico y datos transaccionales. Esta información se obtiene directamente de usted o mediante el uso de nuestra plataforma.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center">
                <Database className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">2. Uso de los Datos</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Sus datos son utilizados exclusivamente para:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-500 text-sm">
              <li>Procesar sus pedidos y transacciones.</li>
              <li>Gestionar su cuenta de usuario y puntos de fidelización.</li>
              <li>Mejorar nuestros servicios y personalizar su experiencia.</li>
              <li>Cumplir con obligaciones legales y tributarias (SII).</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">3. Protección de Terceros</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              No vendemos ni alquilamos su información personal a terceros. Solo compartimos datos con proveedores de servicios críticos (como pasarelas de pago) que cumplen con altos estándares de seguridad y privacidad.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/5 flex items-center justify-center">
                <Bell className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">4. Tus Derechos</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Usted tiene derecho a acceder, rectificar o eliminar sus datos personales en cualquier momento. Para ejercer estos derechos, puede contactarnos a través de los canales oficiales.
            </p>
          </section>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
              <Mail className="w-4 h-4" /> privacidad@yahpos.com
            </div>
            <p className="text-xs text-gray-400 italic">Protegido por encriptación de grado militar AES-256.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
