import Link from 'next/link';
import { 
  Apple, 
  Coffee, 
  Milk, 
  Sparkles, 
  Home, 
  Beef, 
  Wine, 
  Baby,
  ArrowRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getProducts } from '@/lib/api'

import { getProducts } from '@/lib/api'
import CategoriesClient from './CategoriesClient'

export default async function Categories() {
  const products = await getProducts();
  
  const categories = [
    'alimentos', 'frescos', 'lacteos', 'limpieza', 
    'hogar', 'carnes', 'bebidas', 'bebes'
  ];
  
  const counts = categories.reduce((acc, slug) => {
    acc[slug] = products.filter(p => (p.category?.slug || p.category) === slug).length;
    return acc;
  }, {} as Record<string, number>);

  return <CategoriesClient counts={counts} />
}
