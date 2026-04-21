import Link from 'next/link';
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getProducts } from '@/lib/api'
import ProductCard from '@/components/ProductCard'

export default async function FeaturedProducts() {
  const products = await getProducts();
  const featuredProducts = products.filter(p => p.isFeatured).slice(0, 8);
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
          <div>
            <Badge variant="secondary" className="mb-4">
              Destacados
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Productos <span className="text-corporate-blue dark:text-accent-yellow">Destacados</span>
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xl">
              Descubre nuestra selección de productos más populares con los mejores precios del mercado.
            </p>
          </div>
          <Link href="/categoria/todos">
            <Button variant="outline" className="group">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
