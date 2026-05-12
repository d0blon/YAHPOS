import { headers } from 'next/headers'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BottomNav from '@/components/layout/BottomNav'
import EcommerceUpgradePage from '@/components/saas/EcommerceUpgradePage'
import ShopBackdrop from '@/components/layout/ShopBackdrop'
import RouteTransition from '@/components/gsap/RouteTransition'

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const tier = headersList.get('x-store-tier')
  const storeId = headersList.get('x-store-id')

  // Caso 1: Dominio Raíz (Plataforma YAHPOS!)
  // Si no hay storeId, estamos en el landing corporativo
  if (!storeId) {
    return <>{children}</>
  }

  // Caso 2: Tiendas con Ecommerce (Archipiélago, Patagonia, Premium)
  const currentTier = tier || 'austral'
  const hasEcommerce = currentTier === 'archipielago' || currentTier === 'patagonia' || currentTier === 'premium'

  if (!hasEcommerce) {
    return <EcommerceUpgradePage />
  }

  // Plan Archipiélago / Patagonia: mostrar el ecommerce completo
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

