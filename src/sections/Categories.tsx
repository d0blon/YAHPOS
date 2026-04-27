import { getProducts } from '@/lib/api'
import CategoriesClient from './CategoriesClient'

export default async function Categories() {
  const products = await getProducts();
  
  const categories = [
    'alimentos', 'frescos', 'lacteos', 'limpieza', 
    'hogar', 'carnes', 'bebidas', 'bebes'
  ];
  
  const counts = categories.reduce((acc, slug) => {
    acc[slug] = products.filter((p: any) => p.categorySlug === slug).length
    return acc;
  }, {} as Record<string, number>);

  return <CategoriesClient counts={counts} />
}
