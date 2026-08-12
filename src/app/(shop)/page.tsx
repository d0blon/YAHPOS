import { headers } from 'next/headers'
import Link from 'next/link'
import Image from 'next/image'
import {
  Truck, ShoppingCart, Heart, Sparkles,
  Apple, Beef, Package, Wine, PawPrint, Candy,
  Droplets, Baby, Globe, Tag, Clock, Award, Leaf,
  ArrowRight, Star, ShieldCheck,
  Timer, Flame, TrendingUp, ChefHat
} from 'lucide-react'
import { Home as HomeIcon } from 'lucide-react'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/layout/WhatsAppButton'
import PlatformLanding from '@/sections/PlatformLanding'
import { createClient } from '@/lib/supabase'
import CategoryNav from '@/components/shop/CategoryNav'

interface Product {
  id: string
  name: string
  description: string
  price: number
  original_price: number | null
  category: string
  categorySlug: string
  image: string | null
  stock: number
  nutritionalSeals: number
  unit: string | null
  sku: string | null
  barcode: string | null
  brand: string | null
  min_stock: number
  max_stock: number
  is_active: boolean
  category_id: string | null
  tags: string | null
  created_at: string
  updated_at: string
  store_id: string | null
}

const MOCK_PRODUCTS: Product[] = (() => {
  const despensaNames = ['Leche Entera 1L', 'Pan Molde 800g', 'Arroz Grado 1 1kg', 'Fideos Tallarín 500g', 'Aceite Maravilla 1L', 'Azúcar Granulada 1kg', 'Harina 0000 1kg', 'Sal Fina 500g', 'Yogurt Natural 190cc', 'Queso Mantecoso 500g', 'Mermelada Frutilla 380g', 'Té en Bolsas 50un', 'Café Molido 250g', 'Galletas Surtidas 300g', 'Chocolate Tableta 100g', 'Cereal Integral 400g']
  const carniceriaNames = ['Posta Rosada x kg', 'Sobrecosillo x kg', 'Pollo Entero x kg', 'Pechuga Pollo x kg', 'Vacuno Molido x kg', 'Costillar Cerdo x kg', 'Salmon x kg', 'Merluza x kg', 'Tomate x kg', 'Lechuga Escarola', 'Plátano x kg', 'Manzana Roja x kg', 'Palta x kg', 'Limón x kg', 'Cebolla x kg', 'Zapallo x kg']
  const despensaPrices = [1290, 1890, 1590, 990, 2490, 1390, 1190, 690, 490, 4990, 2290, 2590, 3490, 1290, 1390, 2990]
  const carniceriaPrices = [4990, 5990, 3890, 4590, 5490, 4290, 8990, 6990, 1590, 890, 1290, 1890, 2990, 990, 690, 1190]
  const originalPrices = [1590, 2390, 1990, 1290, 2990, 1790, 1490, 890, 690, 5990, 2890, 3290, 4290, 1690, 1790, 3590]
  return Array.from({ length: 16 }, (_, i) => ({
    id: i.toString(),
    name: i % 2 === 0 ? despensaNames[i % 16] : carniceriaNames[i % 16],
    description: '',
    price: i % 2 === 0 ? despensaPrices[i % 16] : carniceriaPrices[i % 16],
    original_price: i % 3 === 0 ? originalPrices[i % 16] : null,
    category: i % 2 === 0 ? 'despensa' : 'carniceria',
    categorySlug: i % 2 === 0 ? 'despensa' : 'carniceria',
    image: `https://placehold.co/400x400/f7f5f2/4b0082?text=Producto+${i+1}`,
    stock: 10 + i,
    nutritionalSeals: 0,
    unit: i % 2 === 0 ? 'unidad' : 'kg',
    sku: `SKU-${1000 + i}`,
    barcode: null,
    brand: null,
    min_stock: 5,
    max_stock: 100,
    is_active: true,
    category_id: null,
    tags: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    store_id: null,
  }))
})()

interface DynamicCategory {
  name: string
  slug?: string
  icon?: React.ComponentType<{ className?: string }>
  iconName?: string
  color: string
  bg: string
  subcats?: string[]
}

const CATEGORIES: DynamicCategory[] = [
  { name: 'Ofertas', icon: Tag, iconName: 'Tag', color: 'text-rose-600', bg: 'bg-rose-50' },
  { name: 'Frutas y Verduras', icon: Apple, iconName: 'Apple', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Carnicería', icon: Beef, iconName: 'Beef', color: 'text-red-600', bg: 'bg-red-50' },
  { name: 'Despensa', icon: Package, iconName: 'Package', color: 'text-amber-600', bg: 'bg-amber-50' },
  { name: 'Bebidas', icon: Wine, iconName: 'Wine', color: 'text-violet-600', bg: 'bg-violet-50' },
  { name: 'Limpieza', icon: Sparkles, iconName: 'Sparkles', color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { name: 'Hogar', icon: HomeIcon, iconName: 'Home', color: 'text-orange-600', bg: 'bg-orange-50' },
  { name: 'Mascotas', icon: PawPrint, iconName: 'PawPrint', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  { name: 'Lácteos', icon: Droplets, iconName: 'Droplets', color: 'text-sky-600', bg: 'bg-sky-50' },
  { name: 'Dulces', icon: Candy, iconName: 'Candy', color: 'text-pink-600', bg: 'bg-pink-50' },
  { name: 'Bebé', icon: Baby, iconName: 'Baby', color: 'text-teal-600', bg: 'bg-teal-50' },
  { name: 'Importados', icon: Globe, iconName: 'Globe', color: 'text-indigo-600', bg: 'bg-indigo-50' },
]

const BASKETS = [
  {
    name: 'Para el asado del finde',
    products: 'Carne, condimentos, carbón, bebida, ensalada',
    savings: 4500,
    total: 28990,
    icon: Flame,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
  {
    name: 'Desayuno familiar completo',
    products: 'Leche, cereal, pan, mermelada, jugo, café',
    savings: 3200,
    total: 15990,
    icon: ChefHat,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    name: 'Limpieza mensual básica',
    products: 'Detergente, cloro, limpiapisos, esponjas, bolsas',
    savings: 2800,
    total: 12490,
    icon: Sparkles,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
]

const TOP_PRODUCTS = [
  { rank: 1, name: 'Leche Entera 1L', price: 1290, sales: '1.234 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=L' },
  { rank: 2, name: 'Pan Molde 800g', price: 1890, sales: '987 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=P' },
  { rank: 3, name: 'Arroz Grado 1 1kg', price: 1590, sales: '756 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=A' },
  { rank: 4, name: 'Aceite Maravilla 1L', price: 2490, sales: '543 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=AM' },
  { rank: 5, name: 'Fideos Tallarín 500g', price: 990, sales: '432 vendidos', image: 'https://placehold.co/60x60/f7f5f2/4b0082?text=F' },
]

const RECIPES = [
  {
    title: 'Cazuela de Vacuno',
    difficulty: 'Fácil',
    time: '45 min',
    image: 'https://placehold.co/400x225/f7f5f2/4b0082?text=Cazuela',
    ingredients: ['Vacuno 500g', 'Zapallo 200g', 'Papas 3un', 'Arroz 1 taza', 'Choclo 1un'],
  },
  {
    title: 'Ensalada César',
    difficulty: 'Fácil',
    time: '20 min',
    image: 'https://placehold.co/400x225/f7f5f2/4b0082?text=Cesar',
    ingredients: ['Lechuga', 'Pechuga Pollo', 'Queso Parmesano', 'Crutones', 'Aderezo César'],
  },
]



// --- ZONE COMPONENTS ---

function ZoneBarraLogistica() {
  return (
    <div className="bg-brand-primary text-white text-[13px] font-medium py-2 px-4 flex items-center justify-center gap-6 flex-wrap">
      <span className="flex items-center gap-1.5">
        <Truck className="w-3.5 h-3.5" />
        <span>Despacho GRATIS en compras +$30.000</span>
      </span>
      <span className="hidden sm:flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Entrega en 24hrs</span>
      </span>
      <span className="hidden sm:flex items-center gap-1.5">
        <MapPinIcon className="w-3.5 h-3.5" />
        <span>Radio urbano 5km</span>
      </span>
    </div>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function HeroOfertaAncla({ product }: { product?: Product }) {
  if (!product) return null
  const discount = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : 0
  const savings = product.original_price ? product.original_price - product.price : 0
  const pricePerUnit = product.unit ? `por ${product.unit === 'kg' ? 'kg' : 'unidad'}` : ''

  return (
    <section className="bg-[#f7f5f2]">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div className="relative aspect-[4/3] md:aspect-auto md:h-[400px] rounded-2xl overflow-hidden bg-white shadow-lg">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                className="object-contain p-6"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">Sin imagen</div>
            )}
            <div className="absolute top-4 left-4 bg-brand-accent text-brand-primary text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1">
              <Tag className="w-3 h-3" />
              OFERTA SEMANA
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{product.category}</p>
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              {product.name}
            </h2>
            <div className="flex items-baseline gap-3">
              {product.original_price && (
                <span className="text-2xl text-gray-400 line-through font-bold">${product.original_price.toLocaleString('es-CL')}</span>
              )}
              <span className="text-5xl md:text-6xl font-black text-brand-primary price-lg">${product.price.toLocaleString('es-CL')}</span>
            </div>
            {pricePerUnit && <p className="text-sm text-gray-500">{pricePerUnit}</p>}
            {savings > 0 && (
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm font-bold px-3 py-1.5 rounded-lg">
                <Award className="w-4 h-4" />
                Ahorras ${savings.toLocaleString('es-CL')} ({discount}%)
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <Timer className="w-4 h-4 text-rose-500" />
              <span>Oferta válida hasta: <strong className="text-gray-900">23:59:59</strong></span>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="flex-1 bg-brand-primary hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-xl transition-all text-sm shadow-lg shadow-brand-primary/20">
                Agregar al carrito
              </button>
              <button className="w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-brand-primary flex items-center justify-center transition-colors">
                <Heart className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Tag,
  Apple,
  Beef,
  Package,
  Wine,
  Sparkles,
  Home: HomeIcon,
  PawPrint,
  Droplets,
  Candy,
  Baby,
  Globe,
}

function ZonaCategorias({ categories }: { categories: DynamicCategory[] }) {
  const items = categories.length > 0 ? categories : CATEGORIES
  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>Compra por categoría</h2>
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            {['Ofertas', 'Catálogo', 'Recetas', 'Noticias', 'Ventas Corp'].map(item => (
              <Link key={item} href="#" className="text-gray-400 hover:text-brand-primary transition-colors">{item}</Link>
            ))}
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {items.map(cat => {
            const Icon = cat.icon || (cat.iconName ? ICON_MAP[cat.iconName] : Package)
            return (
              <Link
                key={cat.name}
                href={`/categoria/${cat.slug || cat.name.toLowerCase().replace(/\s+/g, '-')}`}
                className="flex flex-col items-center gap-2 min-w-[80px] p-3 rounded-xl border border-gray-100 hover:border-brand-primary/30 hover:shadow-md transition-all group"
              >
                <div className={`w-10 h-10 rounded-lg ${cat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 ${cat.color}`} />
                </div>
                <span className="text-[11px] font-semibold text-gray-600 text-center leading-tight">{cat.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ZonaOfertas({ products }: { products: Product[] }) {
  const offers = products.filter(p => p.original_price && p.original_price > p.price).slice(0, 8)
  if (offers.length === 0) return null
  return (
    <section className="bg-[#f7f5f2]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>Ofertas de la semana</h2>
            <p className="text-sm text-gray-500 mt-0.5">Precios especiales por tiempo limitado</p>
          </div>
          <Link href="/categoria/ofertas" className="hidden sm:flex items-center gap-1 text-sm font-bold text-brand-primary hover:underline">
            Ver todas <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="super-grid">
          {offers.map((product) => (
            <ProductCardSuper key={product.id} product={product} variant="offer" />
          ))}
        </div>
        <Link href="/categoria/ofertas" className="mt-4 sm:hidden flex items-center justify-center gap-1 text-sm font-bold text-brand-primary py-3">
          Ver todas las ofertas <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  )
}

function ZonaFrutasCarnes({ products }: { products: Product[] }) {
  const feriaList = ['frescos', 'frutas-y-verduras', 'frutas', 'verduras', 'feria']
  const carnesList = ['carnes', 'carniceria', 'pollo', 'cerdo', 'vacuno']
  
  const frutas = products.filter(p => feriaList.includes(p.categorySlug)).slice(0, 8)
  const carnes = products.filter(p => carnesList.includes(p.categorySlug)).slice(0, 8)
  
  if (frutas.length === 0 && carnes.length === 0) return null
  
  return (
    <section className="bg-white">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {frutas.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-emerald-500 rounded-full" />
              <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  La Gran Feria
                </h2>
                <p className="text-sm text-emerald-700 font-medium flex items-center gap-1">
                  <Leaf className="w-3.5 h-3.5" /> Frescas y seleccionadas — Llegadas hoy
                </p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                <Truck className="w-3 h-3" /> Entrega el mismo día
              </span>
            </div>
            <div className="super-grid">
              {frutas.map((product) => (
                <ProductCardSuper key={product.id} product={product} variant="fresh" />
              ))}
            </div>
            <Link href="/categoria/frutas-y-verduras" className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-emerald-700 py-2 hover:underline">
              Ver toda la feria <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        
        {carnes.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-rose-500 rounded-full" />
              <div className="flex-1">
                <h2 className="text-2xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Carnicería — Cortes seleccionados
                </h2>
                <p className="text-sm text-rose-600 font-medium">Cortes premium, directo del campo</p>
              </div>
            </div>
            <div className="super-grid">
              {carnes.map((product) => (
                <ProductCardSuper key={product.id} product={product} variant="meat" />
              ))}
            </div>
            <Link href="/categoria/carniceria" className="mt-3 flex items-center justify-center gap-1 text-sm font-bold text-rose-600 py-2 hover:underline">
              Ver cortes <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function ZonaCanastas() {
  return (
    <section className="bg-[#f7f5f2]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-black text-gray-900 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Arma tu canasta</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {BASKETS.map(basket => (
            <div key={basket.name} className={`bg-white rounded-2xl border ${basket.border} p-5 hover:shadow-lg transition-shadow`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${basket.bg} flex items-center justify-center`}>
                  <basket.icon className={`w-5 h-5 ${basket.color}`} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{basket.name}</h3>
              </div>
              <p className="text-xs text-gray-500 mb-3">{basket.products}</p>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-400 line-through">${(basket.total + basket.savings).toLocaleString('es-CL')}</span>
                  <span className="text-xl font-black text-brand-primary ml-2 price-lg">${basket.total.toLocaleString('es-CL')}</span>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">-${basket.savings.toLocaleString('es-CL')}</span>
              </div>
              <button className="w-full mt-3 py-2.5 bg-brand-primary hover:bg-brand-700 text-white text-sm font-bold rounded-xl transition-colors">
                Agregar todo al carrito
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ZonaCategoriasMenorFrecuencia() {
  const cats = [CATEGORIES[8], CATEGORIES[5], CATEGORIES[4]]
  return (
    <section className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {cats.map(cat => {
            const Icon = cat.icon || (cat.iconName ? ICON_MAP[cat.iconName] : Package)
            return (
              <Link key={cat.name} href={`/categoria/${cat.slug || cat.name.toLowerCase()}`} className="group">
                <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-brand-primary/30 hover:shadow-md transition-all">
                  <div className={`w-14 h-14 rounded-xl ${cat.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-7 h-7 ${cat.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{cat.name}</h3>
                    <p className="text-xs text-gray-400">Ver productos →</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ZonaRankingRecetas({ products }: { products: Product[] }) {
  const rankingProducts = products.length > 0 
    ? products.slice(0, 5).map((p, idx) => ({
        rank: idx + 1,
        name: p.name,
        price: p.price,
        sales: `${1000 - idx * 120} vendidos`,
        image: p.image || `https://placehold.co/60x60/f7f5f2/4b0082?text=${p.name.charAt(0)}`
      }))
    : TOP_PRODUCTS;

  return (
    <section className="bg-[#f7f5f2]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Ranking */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-5 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <TrendingUp className="w-5 h-5 text-brand-primary" />
              Top ventas esta semana
            </h2>
            <div className="space-y-3">
              {rankingProducts.map(p => (
                <div key={p.rank} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black ${
                    p.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                    p.rank === 2 ? 'bg-gray-100 text-gray-500' :
                    p.rank === 3 ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-50 text-gray-400'
                  }`}>{p.rank}</span>
                  <div className="relative w-10 h-10 shrink-0">
                    <Image src={p.image} alt={p.name} fill className="rounded-lg object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sales}</p>
                  </div>
                  <span className="text-base font-black text-brand-primary price-lg">${p.price.toLocaleString('es-CL')}</span>
                  <button className="w-8 h-8 rounded-full bg-brand-primary text-white text-lg font-bold flex items-center justify-center hover:bg-brand-700 transition-colors">+</button>
                </div>
              ))}
            </div>
          </div>
          {/* Recetas */}
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-5 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
              <ChefHat className="w-5 h-5 text-brand-primary" />
              Recetas de la semana
            </h2>
            <div className="space-y-4">
              {RECIPES.map(recipe => (
                <div key={recipe.title} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative aspect-[16/9]">
                    <Image src={recipe.image} alt={recipe.title} fill className="object-cover" />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      <span className="bg-white/90 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Timer className="w-3 h-3" /> {recipe.time}
                      </span>
                      <span className="bg-white/90 text-xs font-bold px-2 py-1 rounded-full">{recipe.difficulty}</span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 mb-2">{recipe.title}</h3>
                    <div className="space-y-1 mb-3">
                      {recipe.ingredients.map(ing => (
                        <p key={ing} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <Star className="w-3 h-3 text-emerald-500" /> {ing}
                        </p>
                      ))}
                    </div>
                    <button className="w-full py-2.5 border-2 border-brand-primary text-brand-primary font-bold text-sm rounded-xl hover:bg-brand-primary hover:text-white transition-all">
                      Agregar ingredientes al carrito
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ZonaImportados({ products }: { products: Product[] }) {
  const importados = products.filter(p => p.categorySlug === 'importados' || p.categorySlug === 'importado').slice(0, 4)
  if (importados.length === 0) return null

  return (
    <section className="bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>Del mundo a tu despensa</h2>
          <p className="text-brand-accent text-sm font-medium mt-1">Productos importados seleccionados</p>
        </div>
        <div className="super-grid">
          {importados.map(item => (
            <div key={item.id} className="bg-[#2a2a2a] border border-gray-800 rounded-2xl p-4 hover:border-brand-accent/30 transition-all group">
              <div className="relative aspect-square rounded-xl overflow-hidden mb-3 bg-gray-800">
                {item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">Sin imagen</div>
                )}
              </div>
              <span className="text-xs font-medium text-brand-accent">{item.brand || 'Importado'}</span>
              <h3 className="text-sm font-bold text-white mt-1 mb-1 line-clamp-2 min-h-[2.5em]">{item.name}</h3>
              <p className="text-xs text-gray-400 mb-2 line-clamp-1">{item.description || 'Producto especial seleccionado'}</p>
              <span className="text-lg font-black text-brand-accent price-lg">${item.price.toLocaleString('es-CL')}</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <Link href="/categoria/importados" className="inline-flex items-center gap-2 border-2 border-white/20 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-all text-sm">
            Explorar importados <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function ZonaNewsletter() {
  return (
    <section className="bg-brand-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-black text-gray-900 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Tu primer pedido con descuento</h2>
            <p className="text-gray-600 text-sm mb-4">Suscríbete y recibe un cupón de <strong>$2.000</strong> en tu primera compra online.</p>
            <ul className="space-y-2">
              {['Ofertas exclusivas antes que nadie', 'Catálogos semanales en tu correo', 'Recetas y tips de cocina'].map(item => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="space-y-3">
              <input type="text" placeholder="Tu nombre" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" />
              <input type="email" placeholder="tucorreo@email.com" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all" />
              <button className="w-full py-3 bg-brand-primary hover:bg-brand-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-brand-primary/20">
                Quiero mi descuento
              </button>
              <p className="text-[11px] text-gray-400 text-center">Al suscribirte aceptas nuestras políticas de privacidad</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// --- PRODUCT CARD ---

function ProductCardSuper({ product, variant }: { product: Product; variant?: 'offer' | 'fresh' | 'meat' }) {
  const isOffer = variant === 'offer' || !!product.original_price
  const isFresh = variant === 'fresh'
  const isMeat = variant === 'meat'
  const discount = product.original_price ? Math.round((1 - product.price / product.original_price) * 100) : 0

  return (
    <Link
      href={`/producto/${product.sku || product.id}`}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all group"
    >
      <div className="relative aspect-square bg-[#f7f5f2]">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-contain p-3 group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">Sin imagen</div>
        )}
        {isOffer && (
          <div className="absolute top-2 left-2 bg-brand-primary text-white text-[10px] font-black px-2 py-1 rounded-md flex items-center gap-1">
            <Tag className="w-2.5 h-2.5" />
            OFERTA
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-brand-accent text-brand-primary text-[10px] font-black px-2 py-1 rounded-md">
            -{discount}%
          </div>
        )}
        {isFresh && (
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-md">
            Nacional
          </div>
        )}
        {isMeat && (
          <div className="absolute top-2 right-2 bg-white/90 text-gray-900 text-[10px] font-black px-2 py-1 rounded-md shadow-sm border">
            Cortes Frescos
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{product.category}</p>
        <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2 mb-2 min-h-[2.5em]">{product.name}</h3>
        {product.unit && (
          <p className="text-[11px] text-gray-400 mb-1">por {product.unit === 'kg' ? 'kg' : 'unidad'}</p>
        )}
        <div className="flex items-baseline gap-1.5">
          {product.original_price && (
            <span className="text-xs text-gray-400 line-through">${product.original_price.toLocaleString('es-CL')}</span>
          )}
          <span className="text-lg font-black text-brand-primary price-lg">${product.price.toLocaleString('es-CL')}</span>
        </div>
        {isOffer && discount > 0 && (
          <p className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <Award className="w-3 h-3" />
            Ahorras ${(product.original_price! - product.price).toLocaleString('es-CL')}
          </p>
        )}
        <button className="w-full mt-2 py-2 bg-brand-primary/10 hover:bg-brand-primary hover:text-white text-brand-primary text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1">
          <ShoppingCart className="w-3 h-3" />
          Agregar
        </button>
      </div>
    </Link>
  )
}

// --- HOME PAGE ---

export const metadata = {
  title: 'YAHPOS! — Smart Commerce & Online Store',
  description: 'Gestiona tu negocio y compra online con la plataforma líder en la Patagonia. Envíos a domicilio y POS integrado.',
}

interface DbProduct {
  id: string | number
  name: string
  description?: string | null
  price: number
  original_price?: number | null
  category?: string | null
  image?: string | null
  stock?: number | null
  nutritional_seals?: number | null
  unit?: string | null
  sku?: string | null
  barcode?: string | null
  brand?: string | null
  min_stock?: number | null
  max_stock?: number | null
  is_active?: boolean | null
  category_id?: string | null
  tags?: string | null
  created_at?: string | null
  updated_at?: string | null
  store_id?: string | null
}

function normalizeDbProduct(p: DbProduct): Product {
  const categorySlug = (p.category ?? '').toLowerCase().replace(/\s+/g, '-')
  const categoryName = categorySlug
    ? categorySlug.charAt(0).toUpperCase() + categorySlug.slice(1)
    : 'Sin categoría'
  
  return {
    id: String(p.id),
    name: p.name,
    description: p.description ?? '',
    price: p.price,
    original_price: p.original_price ?? null,
    category: categoryName,
    categorySlug: categorySlug,
    image: p.image ?? null,
    stock: p.stock ?? 0,
    nutritionalSeals: p.nutritional_seals ?? 0,
    unit: p.unit ?? 'un',
    sku: p.sku ?? null,
    barcode: p.barcode ?? null,
    brand: p.brand ?? null,
    min_stock: p.min_stock ?? 5,
    max_stock: p.max_stock ?? 100,
    is_active: p.is_active ?? true,
    category_id: p.category_id ?? null,
    tags: p.tags ?? null,
    created_at: p.created_at || new Date().toISOString(),
    updated_at: p.updated_at || new Date().toISOString(),
    store_id: p.store_id ?? null,
  }
}

export default async function Home() {
  const headersList = await headers()
  const storeId = headersList.get('x-store-id')
  const storeTier = headersList.get('x-store-tier')

  const tier: string = storeId ? (storeTier ?? 'austral') : 'platform_landing'

  if (tier === 'platform_landing') {
    return <PlatformLanding />
  }

  if (tier === 'austral') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 shop-bg text-center">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl p-8 sm:p-12 border border-gray-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-brand-accent-50 opacity-50 blur-3xl" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-brand-50 opacity-50 blur-3xl" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-brand-accent-100 text-brand-accent-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-white">
              <Package className="w-10 h-10" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
              Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-accent-600 to-brand-600">YAHPOS!</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg mx-auto leading-relaxed">
              Actualmente operamos exclusivamente en nuestra tienda física para brindarte la mejor atención presencial.
            </p>
            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                <Truck className="w-6 h-6 text-brand-accent-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Encuéntranos</h3>
                <p className="text-sm text-gray-500">Visítanos en nuestra sucursal para conocer todo nuestro catálogo de productos.</p>
              </div>
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 text-left hover:shadow-md transition-shadow">
                <Award className="w-6 h-6 text-brand-500 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-1">Club de Puntos</h3>
                <p className="text-sm text-gray-500">Acumula YAHPOS! Puntos con cada compra en caja dictando tu RUT.</p>
              </div>
            </div>
            <Link href="/login" className="inline-flex px-8 py-3.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors shadow-lg shadow-gray-900/20">
              Ver mis Puntos
            </Link>
          </div>
        </div>
        <WhatsAppButton />
      </div>
    )
  }

  // Carga de productos dinámicos desde base de datos
  let products: Product[] = []
  let isDemo = false

  if (storeId) {
    try {
      const supabase = await createClient()
      const { data: dbProducts, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)

      if (!error && dbProducts && dbProducts.length > 0) {
        products = dbProducts.map(normalizeDbProduct)
      } else {
        products = MOCK_PRODUCTS
        isDemo = true
      }
    } catch (err) {
      console.error('Error fetching dynamic store products:', err)
      products = MOCK_PRODUCTS
      isDemo = true
    }
  } else {
    products = MOCK_PRODUCTS
    isDemo = true
  }

  // Ofertas simuladas si no hay ofertas reales definidas en base de datos
  const hasRealOffers = products.some(p => p.original_price && p.original_price > p.price)
  if (!hasRealOffers && !isDemo) {
    products = products.map((p, idx) => {
      if (idx < 12) {
        return {
          ...p,
          original_price: Math.round(p.price * 1.25)
        }
      }
      return p
    })
  }

  // Extracción de categorías dinámicas
  const uniqueCategorySlugs = Array.from(new Set(products.map(p => p.categorySlug)))
  const dynamicCategories = uniqueCategorySlugs.map(slug => {
    const existing = CATEGORIES.find(c => c.name.toLowerCase().replace(/\s+/g, '-') === slug)
    if (existing) {
      return {
        name: existing.name,
        slug: slug,
        iconName: existing.iconName || 'Package',
        color: existing.color,
        bg: existing.bg,
        subcats: [existing.name]
      }
    } else {
      const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ')
      return {
        name: name,
        slug: slug,
        iconName: 'Package',
        color: 'text-brand-primary',
        bg: 'bg-brand-primary/5',
        subcats: [name]
      }
    }
  })

  // Obtener producto destacado para Hero (primer producto en oferta o primer producto general)
  const featuredProduct = products.find(p => p.original_price) || products[0]

  // Supermercado completo — Ecommerce para Archipiélago / Patagonia
  return (
    <div className="shop-bg min-h-screen">
      {/* Z1 — Barra logística */}
      <ZoneBarraLogistica />

      {/* Menú de categorías dinámico */}
      <CategoryNav categories={dynamicCategories} />

      {/* Z2 — Hero oferta ancla */}
      {featuredProduct && <HeroOfertaAncla product={featuredProduct} />}

      {/* Z3 — Mapa tienda: categorías */}
      <ZonaCategorias categories={dynamicCategories} />

      {/* Z4 — Ofertas agrupadas */}
      <ZonaOfertas products={products} />

      {/* Z5 — Frutas y verduras + Carnicería */}
      <ZonaFrutasCarnes products={products} />

      {/* Z6 — Canastas sugeridas */}
      <ZonaCanastas />

      {/* Z7 — Categorías menor frecuencia */}
      <ZonaCategoriasMenorFrecuencia />

      {/* Z8 — Ranking + Recetas */}
      <ZonaRankingRecetas products={products} />

      {/* Z9 — Importados premium */}
      <ZonaImportados products={products} />

      {/* Z10 — Newsletter */}
      <ZonaNewsletter />

      {/* Z11 — Footer */}
      <Footer />

      <WhatsAppButton />
    </div>
  )
}
