import { getProducts } from '@/lib/api';
import FeaturedProductsClient from './FeaturedProductsClient';

export default async function FeaturedProducts() {
  const products = await getProducts();
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 8);
  
  return <FeaturedProductsClient products={featuredProducts} />;
}
