import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { createServerClient } from '@/lib/supabase'
import EcommerceUpgradePage from '@/components/saas/EcommerceUpgradePage'

/**
 * ShopLayout — Layout del ecommerce público
 * 
 * Verifica el plan de la tienda en el servidor antes de renderizar.
 * - Plan Básico → muestra pantalla de upgrade (no hay ecommerce)
 * - Plan Plus / Elite → muestra el ecommerce completo
 */
async function getTierFromDB(): Promise<string> {
  try {
    const supabase = createServerClient()
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
  const hasEcommerce = tier === 'plus' || tier === 'elite'

  // Plan Básico: mostrar pantalla de upgrade en lugar del ecommerce
  if (!hasEcommerce) {
    return <EcommerceUpgradePage />
  }

  // Plan Plus / Elite: mostrar el ecommerce completo
  return (
    <>
      <Header />
      <main className="min-h-screen flex flex-col pt-20">
        {children}
      </main>
      <Footer />
    </>
  )
}
