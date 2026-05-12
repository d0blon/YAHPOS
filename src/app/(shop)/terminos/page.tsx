'use client'

import React from 'react'
import { ShieldCheck, FileText, Scale, Lock, Globe, Mail } from 'lucide-react'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-corporate-blue/10 text-corporate-blue text-xs font-black uppercase tracking-widest mb-4">
            <ShieldCheck className="w-4 h-4" /> Legal & Transparencia
          </div>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic mb-4">
            Términos y <span className="text-corporate-blue">Condiciones</span>
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto font-medium">
            Última actualización: 30 de Abril, 2026. Por favor, lee atentamente estos términos antes de utilizar nuestros servicios.
          </p>
        </div>

        {/* Content */}
        <div className="glass-card p-10 space-y-12">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corporate-blue/5 flex items-center justify-center">
                <FileText className="w-5 h-5 text-corporate-blue" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">1. Aceptación de los Términos</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Al acceder y utilizar este sitio web y los servicios de YAHPOS! (AustralMarket), usted acepta cumplir y estar sujeto a los siguientes términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar nuestros servicios.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corporate-blue/5 flex items-center justify-center">
                <Scale className="w-5 h-5 text-corporate-blue" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">2. Uso del Servicio</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              El usuario se compromete a utilizar el servicio de forma lícita y ética. Queda prohibido el uso de la plataforma para actividades fraudulentas, spam o cualquier acción que comprometa la integridad del sistema o la privacidad de otros usuarios.
            </p>
            <ul className="list-disc pl-6 space-y-2 text-gray-500 text-sm">
              <li>No intentar vulnerar las medidas de seguridad del sitio.</li>
              <li>No utilizar bots o scripts automáticos para extraer datos.</li>
              <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corporate-blue/5 flex items-center justify-center">
                <Lock className="w-5 h-5 text-corporate-blue" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">3. Propiedad Intelectual</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Todo el contenido presente en esta plataforma, incluyendo textos, gráficos, logotipos, iconos e imágenes, es propiedad de YAHPOS! o de sus respectivos dueños y está protegido por las leyes de propiedad intelectual internacionales.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-corporate-blue/5 flex items-center justify-center">
                <Globe className="w-5 h-5 text-corporate-blue" />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">4. Limitación de Responsabilidad</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              YAHPOS! no se hace responsable por daños indirectos, incidentales o consecuentes que surjan del uso o la imposibilidad de uso del servicio, incluyendo pero no limitado a la pérdida de beneficios o datos.
            </p>
          </section>

          <div className="pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
              <Mail className="w-4 h-4" /> contacto@yahpos.com
            </div>
            <button className="px-8 py-3 bg-corporate-blue text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-corporate-blue/20 hover:bg-corporate-dark transition-all">
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
