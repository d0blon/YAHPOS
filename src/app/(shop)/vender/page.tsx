import { CheckCircle2, Rocket, ShieldCheck, Zap, ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'

export default function SalesLanding() {
  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap items-center -mx-4">
            <div className="w-full lg:w-1/2 px-4 mb-12 lg:mb-0">
              <div className="max-w-lg">
                <span className="inline-block py-1 px-3 mb-4 text-xs font-semibold tracking-widest text-blue-600 uppercase bg-blue-50 rounded-full">
                  Lanzamiento Especial Chiloé
                </span>
                <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                  Lleva tu negocio al <span className="text-blue-600">siguiente nivel</span> con PatagoniaPOS
                </h1>
                <p className="text-xl text-slate-600 mb-10">
                  El sistema de ventas más rápido, moderno e independiente de la Patagonia. Boletas electrónicas ilimitadas sin pagar de más.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="https://wa.me/tu_numero" 
                    className="inline-flex items-center justify-center px-8 py-4 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition duration-200"
                  >
                    <MessageCircle className="mr-2" /> Hablar con un Asesor
                  </Link>
                  <Link 
                    href="#precios" 
                    className="inline-flex items-center justify-center px-8 py-4 font-bold text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition duration-200"
                  >
                    Ver Planes
                  </Link>
                </div>
              </div>
            </div>
            <div className="w-full lg:w-1/2 px-4">
               {/* Aquí irá una imagen hermosa del POS */}
               <div className="relative mx-auto max-w-md lg:max-w-none">
                  <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-2xl transform rotate-2">
                    <h3 className="text-2xl font-bold mb-4">Oferta de Lanzamiento</h3>
                    <p className="text-4xl font-black mb-2">50% OFF</p>
                    <p className="text-lg mb-6">En costo de instalación</p>
                    <hr className="border-blue-400 mb-6" />
                    <p className="text-xl font-bold">+ 1er MES GRATIS</p>
                    <p className="text-sm opacity-80 mt-2">*Válido para Castro y alrededores</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">¿Por qué elegir PatagoniaPOS?</h2>
            <p className="text-slate-500">Diseñado para la realidad del comercio local, con o sin internet estable.</p>
          </div>
          <div className="flex flex-wrap -mx-4">
            {[ 
              { title: 'Boletas Ilimitadas', desc: 'No cobramos por documento. Emite todas las boletas que necesites sin pagar extra.', icon: Zap },
              { title: 'Independencia Total', desc: 'Sin intermediarios como SimpleAPI. Tú eres el dueño de tu facturación.', icon: ShieldCheck },
              { title: 'Fácil de Usar', desc: 'Capacitamos a tu personal en 15 minutos. Interfaz intuitiva y moderna.', icon: CheckCircle2 },
              { title: 'Soporte Local', desc: 'Estamos en Chiloé. Soporte rápido y en tu mismo idioma.', icon: Rocket },
            ].map((f, i) => (
              <div key={i} className="w-full md:w-1/2 lg:w-1/4 px-4 mb-8">
                <div className="p-8 bg-slate-50 rounded-2xl h-full">
                  <f.icon className="w-12 h-12 text-blue-600 mb-6" />
                  <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                  <p className="text-slate-600">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing simple placeholder */}
      <section id="precios" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
           <div className="max-w-xl mx-auto bg-white p-12 rounded-3xl shadow-xl border border-blue-100 text-center">
              <h2 className="text-3xl font-bold mb-4">Plan Emprendedor</h2>
              <p className="text-5xl font-black mb-6">1 UF <span className="text-xl text-slate-400 font-normal">+ IVA / mes</span></p>
              <ul className="text-left mb-10 space-y-4">
                <li className="flex items-center"><CheckCircle2 className="text-green-500 mr-2" size={20} /> Boletas Electrónicas Ilimitadas</li>
                <li className="flex items-center"><CheckCircle2 className="text-green-500 mr-2" size={20} /> Control de Inventario</li>
                <li className="flex items-center"><CheckCircle2 className="text-green-500 mr-2" size={20} /> Reportes de Ventas Diarios</li>
                <li className="flex items-center"><CheckCircle2 className="text-green-500 mr-2" size={20} /> Club de Puntos (Fidelización)</li>
              </ul>
              <Link 
                href="https://wa.me/tu_numero" 
                className="block w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
              >
                ¡Quiero empezar hoy!
              </Link>
           </div>
        </div>
      </section>
    </div>
  )
}
