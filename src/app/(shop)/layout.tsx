import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase'
import EcommerceUpgradePage from '@/components/saas/EcommerceUpgradePage'
import ShopBackdrop from '@/components/layout/ShopBackdrop'
import RouteTransition from '@/components/gsap/RouteTransition'

/**
 * ShopLayout — Layout del ecommerce público
 * 
 * Verifica el plan de la tienda en el servidor antes de renderizar.
 * - Plan Básico → muestra pantalla de upgrade (no hay ecommerce)
 * - Plan Plus / Elite → muestra el ecommerce completo
 */
async function getTierFromDB(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('store_settings')
      .select('tier')
      .single()
    return data?.tier || 'basico'
  } catch {
    return 'basico'
  }
}

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tier = await getTierFromDB()
  const hasEcommerce = true // tier === 'plus' || tier === 'elite'

  // Plan Básico: mostrar pantalla de upgrade en lugar del ecommerce
  if (!hasEcommerce) {
    return <EcommerceUpgradePage />
  }

  // Plan Plus / Elite: mostrar el ecommerce completo
  return (
    <>
      <ShopBackdrop />
      <RouteTransition />
      <Header />
      <main className="relative z-10 min-h-screen flex flex-col pt-0">
        {children}
      </main>
      <BottomNav />
    </>
  )
}

