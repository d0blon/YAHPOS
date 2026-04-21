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

const categories = [
  {
    id: '1',
    name: 'Alimentos',
    slug: 'alimentos',
    description: 'Arroz, pastas, conserves y más',
    icon: Coffee,
    color: 'from-orange-500 to-red-500',
    productCount: 2500,
  },
  {
    id: '2',
    name: 'Frescos',
    slug: 'frescos',
    description: 'Frutas, verduras y lácteos',
    icon: Apple,
    color: 'from-green-500 to-emerald-500',
    productCount: 800,
  },
  {
    id: '3',
    name: 'Lácteos',
    slug: 'lacteos',
    description: 'Leches, quesos y yogures',
    icon: Milk,
    color: 'from-blue-500 to-cyan-500',
    productCount: 450,
  },
  {
    id: '4',
    name: 'Limpieza',
    slug: 'limpieza',
    description: 'Productos para el hogar',
    icon: Sparkles,
    color: 'from-purple-500 to-pink-500',
    productCount: 600,
  },
  {
    id: '5',
    name: 'Hogar',
    slug: 'hogar',
    description: 'Artículos para tu casa',
    icon: Home,
    color: 'from-amber-500 to-yellow-500',
    productCount: 900,
  },
  {
    id: '6',
    name: 'Carnes',
    slug: 'carnes',
    description: 'Carnes rojas, blancas y pescados',
    icon: Beef,
    color: 'from-red-500 to-rose-500',
    productCount: 350,
  },
  {
    id: '7',
    name: 'Bebidas',
    slug: 'bebidas',
    description: 'Jugos, gaseosas y aguas',
    icon: Wine,
    color: 'from-teal-500 to-cyan-500',
    productCount: 550,
  },
  {
    id: '8',
    name: 'Bebés',
    slug: 'bebes',
    description: 'Pañales, fórmulas y más',
    icon: Baby,
    color: 'from-pink-400 to-rose-400',
    productCount: 280,
  },
]

export default async function Categories() {
  const products = await getProducts();

  return (
    <section className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Categorías
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Explora por <span className="text-corporate-blue dark:text-accent-yellow">Categoría</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Encuentra todo lo que necesitas organizado por categorías. 
            Desde alimentos frescos hasta productos de limpieza.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => {
            const displayCount = products.filter(p => (p.category?.slug || p.category) === category.slug).length;
            
            return (
              <Link key={category.slug} href={`/categoria/${category.slug}`}
                className="group relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: `linear-gradient(135deg, ${category.color.includes('orange') ? '#f97316' : 
                    category.color.includes('green') ? '#22c55e' :
                    category.color.includes('blue') ? '#3b82f6' :
                    category.color.includes('purple') ? '#a855f7' :
                    category.color.includes('amber') ? '#f59e0b' :
                    category.color.includes('red') ? '#ef4444' :
                    category.color.includes('teal') ? '#14b8a6' :
                    '#ec4899'}15 0%, ${category.color.includes('orange') ? '#ef4444' : 
                    category.color.includes('green') ? '#10b981' :
                    category.color.includes('blue') ? '#06b6d4' :
                    category.color.includes('purple') ? '#ec4899' :
                    category.color.includes('amber') ? '#eab308' :
                    category.color.includes('red') ? '#f43f5e' :
                    category.color.includes('teal') ? '#06b6d4' :
                    '#fb7185'}15 100%)`
                }}
              >
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <category.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-corporate-blue dark:group-hover:text-accent-yellow transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {category.description}
                </p>
                
                {/* Product Count & Arrow */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-500">
                    {displayCount} productos
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/50 dark:bg-gray-700/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  </div>
                </div>

                {/* Hover Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
