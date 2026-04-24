import Hero from '@/sections/Hero'
import FeaturedProducts from '@/sections/FeaturedProducts'
import Categories from '@/sections/Categories'
import OffersBanner from '@/sections/OffersBanner'
import { createServerClient } from '@/lib/supabase'
import Link from 'next/link'
import { Store, MapPin, Gift, ArrowRight } from 'lucide-react'

export const metadata = {
  title: 'PatagoniaPOS - Smart Commerce & Online Store',
  description: 'Gestiona tu negocio y compra online con la plataforma líder en la Patagonia. Envíos a domicilio y POS integrado.',
}

export default async function Home() {
  const supabase = createServerClient()
  const { data: storeSettings } = await supabase.from('store_settings').select('tier').single()
  const tier = storeSettings?.tier || 'basico'

  if (tier === 'basico') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-50 to-white text-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-blue-50 opacity-50 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-purple-50 opacity-50 blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-white">
              <Store className="w-10 h-10" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">PatagoniaPOS</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
              Actualmente operamos exclusivamente en nuestra tienda física para brindarte la mejor atención presencial.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                <MapPin className="w-6 h-6 text-blue-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Encuéntranos</h3>
                <p className="text-sm text-gray-500">Visítanos en nuestra sucursal para conocer todo nuestro catálogo de productos.</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                <Gift className="w-6 h-6 text-purple-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Club de Puntos</h3>
                <p className="text-sm text-gray-500">Acumula Puntos Patagonia con cada compra en caja dictando tu RUT.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg hover:shadow-xl shadow-gray-900/20 flex items-center justify-center gap-2">
                Ver mis Puntos
              </Link>
              <Link href="/registro" className="w-full sm:w-auto px-8 py-3.5 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                Unirme al Club <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tienda Online para Plus y Élite
  return (
    <>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <OffersBanner />
    </>
  )
}
