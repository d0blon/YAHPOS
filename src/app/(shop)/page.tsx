import Hero from '@/sections/Hero'
import FeaturedProducts from '@/sections/FeaturedProducts'
import Categories from '@/sections/Categories'
import OffersBanner from '@/sections/OffersBanner'

export const metadata = {
  title: 'PatagoniaPOS - Smart Commerce & Online Store',
  description: 'Gestiona tu negocio y compra online con la plataforma líder en la Patagonia. Envíos a domicilio y POS integrado.',
}

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <FeaturedProducts />
      <OffersBanner />
    </>
  )
}
