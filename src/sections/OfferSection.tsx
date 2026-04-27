import { getProducts } from '@/lib/api';
import OfferSectionClient from './OfferSectionClient';

export default async function OfferSection() {
  const products = await getProducts();
  return <OfferSectionClient products={products} />;
}
