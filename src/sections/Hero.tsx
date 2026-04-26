import Link from 'next/link';
import { ArrowRight, ShoppingBag, Truck, Percent, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getProducts } from '@/lib/api'

import { getProducts } from '@/lib/api'
import HeroClient from './HeroClient'

export default async function Hero() {
  const products = await getProducts();
  const totalProducts = products.length;
  
  const displayTotal = totalProducts;
  const countAlimentos = products.filter(p => (p.category?.slug || p.category) === 'alimentos').length;
  const countBebidas = products.filter(p => (p.category?.slug || p.category) === 'bebidas').length;
  const countFrescos = products.filter(p => (p.category?.slug || p.category) === 'frescos').length;

  return (
    <HeroClient 
      displayTotal={displayTotal}
      countAlimentos={countAlimentos}
      countBebidas={countBebidas}
      countFrescos={countFrescos}
    />
  )
}
