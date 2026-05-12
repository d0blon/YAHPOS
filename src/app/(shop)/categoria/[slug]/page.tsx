'use client'

import React, { useState, useRef } from 'react'
import { useParams } from 'next/navigation';
import { 
  ShoppingCart, 
  Heart, 
  Star, 
  Filter, 
  Grid3X3, 
  LayoutList, 
  ChevronDown, 
  SlidersHorizontal,
  ChevronRight,
  Search,
  X,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ShopBackdrop from '@/components/layout/ShopBackdrop'
import ProductCard from '@/components/shop/ProductCard'
import { getProducts } from '@/lib/api'
import type { Product } from '@/types'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered, toArray } from '@/lib/gsap'

const sortOptions = [
  { value: 'relevance', label: 'RELEVANCIA' },
  { value: 'price-asc', label: 'PRECIO: MENOR A MAYOR' },
  { value: 'price-desc', label: 'PRECIO: MAYOR A MENOR' },
  { value: 'newest', label: 'MÁS NUEVOS' },
]

export default function CategoryPage() {
  ensureGsapRegistered()
  const params = useParams()
  const slug = params?.slug as string
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const [products, setProducts] = useState<(Product & { computedBrand: string })[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Sort States
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [priceRanges, setPriceRanges] = useState<string[]>([])

  const KNOWN_BRANDS = ['Colún', 'Colun', 'Soprole', 'Nestlé', 'Coca-Cola', 'Escudo', 'Carozzi', 'Tucapel', 'Omo', 'Quix', 'Confort', 'Lucchetti', 'Maggi']

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const allProducts = await getProducts();
        const categoryProducts = allProducts.filter(p => {
          // La API devuelve categorySlug directamente ("alimentos", "bebidas", etc.)
          const c = (p as any).categorySlug?.toLowerCase() || (p.category as unknown as string)?.toLowerCase() || '';
          return c === slug.toLowerCase();
        }).map(p => {
          let foundBrand = 'Otra';
          for (const brand of KNOWN_BRANDS) {
             if (p.name.toLowerCase().includes(brand.toLowerCase())) {
                foundBrand = brand === 'Colun' ? 'Colún' : brand;
                break;
             }
          }
          return { ...p, computedBrand: foundBrand };
        });
        setProducts(categoryProducts as (Product & { computedBrand: string })[]);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  useGSAP(() => {
    if (loading) return
    
    const tl = gsap.timeline()
    tl.from('.category-header > *', {
      y: 20,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: 'power4.out'
    })
    .from('.product-grid-item', {
      scale: 0.9,
      opacity: 0,
      duration: 0.6,
      stagger: 0.05,
      ease: 'back.out(1.7)'
    }, '-=0.4')
  }, { scope: containerRef, dependencies: [loading, slug] })

  const availableBrands = Array.from(new Set(products.map(p => p.computedBrand))).sort();

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  }

  const handlePriceToggle = (range: string) => {
    setPriceRanges(prev => prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]);
  }

  let displayProducts = [...products];

  if (selectedBrands.length > 0) {
    displayProducts = displayProducts.filter(p => selectedBrands.includes(p.computedBrand));
  }

  if (priceRanges.length > 0) {
    displayProducts = displayProducts.filter(p => {
       if (priceRanges.includes('low') && p.price <= 2000) return true;
       if (priceRanges.includes('mid') && p.price > 2000 && p.price <= 5000) return true;
       if (priceRanges.includes('high') && p.price > 5000) return true;
       return false;
    });
  }

  if (sortBy === 'price-asc') {
    displayProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    displayProducts.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'newest') {
    displayProducts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  const categoryName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Colección';

  return (
    <>
      <ShopBackdrop />
      <Header />
      <main ref={containerRef} className="min-h-screen pt-32 pb-20 relative z-10">
        <div className="container mx-auto px-4">
          {/* Breadcrumb & Title Area */}
          <div className="category-header mb-16 relative overflow-hidden rounded-[3rem] border border-white/10 glass-card p-10 md:p-16">
            {/* Background Category Object (Specific User Request) */}
            <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-2/3 h-[120%] pointer-events-none select-none z-0 opacity-40">
              <div className="relative w-full h-full">
                <img 
                  src={
                    slug === 'alimentos' ? '/cat_alimentos_premium_1777248248786.png' :
                    slug === 'bebes' ? '/cat_bebes_premium_1777248344381.png' :
                    slug === 'bebidas' ? '/cat_bebidas_premium_1777248330158.png' :
                    slug === 'carnes' ? '/cat_carnes_premium_1777248318644.png' :
                    slug === 'frescos' ? '/cat_frescos_premium_1777248260950.png' :
                    slug === 'hogar' ? '/cat_hogar_premium_1777248304005.png' :
                    slug === 'lacteos' ? '/cat_lacteos_premium_1777248273407.png' :
                    slug === 'limpieza' ? '/cat_limpieza_premium_1777248288359.png' :
                    '/hero_ecommerce_premium_1777248177152.png'
                  } 
                  alt={categoryName}
                  className="w-full h-full object-contain blur-xl scale-110"
                />
              </div>
            </div>

            <div className="relative z-10">
              <nav className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-500 mb-8">
                <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
                <ChevronRight className="w-3 h-3 text-gray-700" />
                <span className="text-blue-400">{categoryName}</span>
              </nav>
              
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                <div className="max-w-2xl">
                  <Badge variant="outline" className="mb-6 border-blue-500/30 text-blue-400 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                    Colección Curada
                  </Badge>
                  <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter capitalize mb-6 leading-[0.85]">
                    {categoryName}
                  </h1>
                  <p className="text-gray-400 font-bold text-lg max-w-md leading-relaxed mb-8">
                    Descubre nuestra selección premium de {categoryName.toLowerCase()} con la frescura y calidad que nos caracteriza.
                  </p>
                  <div className="flex items-center gap-4 text-sm font-black text-white/40 uppercase tracking-widest">
                    <span className="w-8 h-[2px] bg-blue-500" />
                    {products.length} PRODUCTOS DISPONIBLES
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Sort Dropdown Premium */}
                  <div className="relative group">
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)} 
                      className="appearance-none bg-white/5 border border-white/10 rounded-2xl px-6 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-[10px] font-black tracking-widest text-white uppercase cursor-pointer hover:bg-white/10 transition-all"
                    >
                      {sortOptions.map((option) => <option key={option.value} value={option.value} className="bg-black text-white">{option.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none group-hover:text-white transition-colors" />
                  </div>

                  <Button 
                    variant="outline" 
                    className="h-14 px-6 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest md:hidden"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filtros
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar Filters */}
            <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-black/95 p-8 overflow-y-auto' : 'hidden'} lg:block w-full lg:w-72 shrink-0 lg:sticky lg:top-32 h-fit`}>
              <div className="flex lg:hidden justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Filtros</h2>
                <button onClick={() => setShowFilters(false)} className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <X className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="space-y-10">
                {/* Price Filter */}
                <div>
                  <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <span className="w-4 h-[2px] bg-blue-400" />
                    Rango de Precio
                  </h3>
                  <div className="space-y-3">
                    {[
                      { id: 'low', label: 'Hasta $2.000' },
                      { id: 'mid', label: '$2.000 - $5.000' },
                      { id: 'high', label: 'Más de $5.000' }
                    ].map(range => (
                      <label key={range.id} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${priceRanges.includes(range.id) ? 'border-blue-500 bg-blue-500' : 'border-white/10 bg-white/5 group-hover:border-white/30'}`}>
                          {priceRanges.includes(range.id) && <ArrowRight className="w-3 h-3 text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={priceRanges.includes(range.id)} 
                          onChange={() => handlePriceToggle(range.id)} 
                        />
                        <span className={`text-xs font-bold tracking-widest transition-colors ${priceRanges.includes(range.id) ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                          {range.label.toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brands Filter */}
                <div>
                  <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <span className="w-4 h-[2px] bg-blue-400" />
                    Marcas Destacadas
                  </h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                    {availableBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selectedBrands.includes(brand) ? 'border-blue-500 bg-blue-500' : 'border-white/10 bg-white/5 group-hover:border-white/30'}`}>
                          {selectedBrands.includes(brand) && <ArrowRight className="w-3 h-3 text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={selectedBrands.includes(brand)} 
                          onChange={() => handleBrandToggle(brand)} 
                        />
                        <span className={`text-xs font-bold tracking-widest transition-colors ${selectedBrands.includes(brand) ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                          {brand.toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Apply Filters Button (Mobile only) */}
                <Button 
                  className="w-full h-16 bg-white text-black font-black uppercase tracking-widest rounded-2xl lg:hidden mt-8"
                  onClick={() => setShowFilters(false)}
                >
                  Ver Resultados
                </Button>
              </div>
            </aside>

            {/* Product Grid */}
            <div className="flex-1">
              {loading ? (
                 <div className="flex flex-col items-center justify-center py-32 text-gray-500 gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Cargando selección premium...</p>
                 </div>
              ) : displayProducts.length === 0 ? (
                 <div className="flex flex-col items-center justify-center py-32 glass-card rounded-[40px] border-white/5 bg-white/5">
                    <Search className="w-12 h-12 text-gray-700 mb-6" />
                    <p className="text-xl font-black text-gray-500 uppercase tracking-tighter">Sin resultados exactos</p>
                    <p className="text-xs font-bold text-gray-600 mt-2">INTENTA AJUSTAR LOS FILTROS</p>
                 </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 lg:gap-8">
                  {displayProducts.map((product) => (
                    <div key={product.id} className="product-grid-item">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination Premium */}
              {!loading && displayProducts.length > 0 && (
                <div className="flex items-center justify-center gap-4 mt-20">
                  <Button 
                    variant="ghost" 
                    disabled 
                    className="w-14 h-14 rounded-2xl border border-white/5 bg-white/5 text-gray-500"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </Button>
                  <div className="flex gap-2">
                    <Button className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-sm">1</Button>
                    <Button variant="ghost" className="w-14 h-14 rounded-2xl border border-white/5 bg-white/5 text-gray-500 hover:text-white transition-colors font-black text-sm">2</Button>
                    <Button variant="ghost" className="w-14 h-14 rounded-2xl border border-white/5 bg-white/5 text-gray-500 hover:text-white transition-colors font-black text-sm">3</Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    className="w-14 h-14 rounded-2xl border border-white/5 bg-white/5 text-gray-500 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

