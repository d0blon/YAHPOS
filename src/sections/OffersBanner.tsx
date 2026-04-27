import { getProducts } from '@/lib/api'
import OffersBannerClient from './OffersBannerClient'

export default async function OffersBanner() {
  const products = await getProducts();
  const maxDiscount = products.reduce((max, p) => Math.max(max, p.discount || 0), 0);
  const displayDiscount = maxDiscount > 0 ? maxDiscount : 50; // fallback

  return <OffersBannerClient displayDiscount={displayDiscount} />
}
