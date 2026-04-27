import { getProducts } from '@/lib/api'
import HeroClient from './HeroClient'

export default async function Hero() {
  const products = await getProducts();
  const totalProducts = products.length;
  
  const countAlimentos = products.filter((p: any) => p.categorySlug === 'alimentos').length
  const countBebidas = products.filter((p: any) => p.categorySlug === 'bebidas').length
  const countFrescos = products.filter((p: any) => p.categorySlug === 'frescos').length

  return <HeroClient displayTotal={totalProducts} countAlimentos={countAlimentos} countBebidas={countBebidas} countFrescos={countFrescos} />
}
