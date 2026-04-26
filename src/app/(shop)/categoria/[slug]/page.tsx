'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation';
import { ShoppingCart, Heart, Star, Filter, Grid3X3, LayoutList, ChevronDown, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCartStore } from '@/stores'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

import { getProducts } from '@/lib/api'
import type { Product } from '@/types'

const sortOptions = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price-asc', label: 'Precio: Menor a Mayor' },
  { value: 'price-desc', label: 'Precio: Mayor a Menor' },
  { value: 'newest', label: 'Más Nuevos' },
]

function ProductCard({ product, view }: { product: Product, view: 'grid' | 'list' }) {
  const { addItem } = useCartStore()
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem(product as any)
    toast.success(`${product.name} agregado al carrito`)
  }

  if (view === 'list') {
    return (
      <div className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow hover:shadow-lg transition-all duration-300">
        <Link href={`/producto/${product.slug}`} className="shrink-0">
          <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
        </Link>
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <Link href={`/producto/${product.slug}`}>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white hover:text-corporate-blue dark:hover:text-accent-yellow transition-colors">{product.name}</h3>
            </Link>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{product.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <Star className="w-4 h-4 fill-accent-yellow text-accent-yellow" />
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-sm text-gray-500">({product.reviewCount})</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-corporate-blue dark:text-white">{formatPrice(product.price)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Heart className="w-4 h-4" /></Button>
              <Button size="sm" onClick={handleAddToCart} className="bg-corporate-blue hover:bg-corporate-dark"><ShoppingCart className="w-4 h-4 mr-2" />Agregar</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <Link href={`/producto/${product.slug}`} className="block relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        {product.discount && <Badge className="absolute top-3 left-3 bg-red-500 text-white border-0">-{product.discount}%</Badge>}
        <button className="absolute top-3 right-3 w-9 h-9 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-500"><Heart className="w-4 h-4" /></button>
      </Link>
      <div className="p-4">
        <p className="text-xs text-corporate-blue dark:text-accent-yellow font-medium mb-1">{typeof product.category === 'object' ? product.category.name : product.category}</p>
        <Link href={`/producto/${product.id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-corporate-blue dark:hover:text-accent-yellow transition-colors">{product.name}</h3>
        </Link>
        {product.rating && (
          <div className="flex items-center gap-1 mb-3">
            <Star className="w-4 h-4 fill-accent-yellow text-accent-yellow" />
            <span className="text-sm font-medium">{product.rating}</span>
            <span className="text-sm text-gray-500">({product.reviewCount})</span>
          </div>
        )}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-bold text-corporate-blue dark:text-white">{formatPrice(product.price)}</span>
        </div>
        <Button onClick={handleAddToCart} className="w-full bg-corporate-blue hover:bg-corporate-dark text-white"><ShoppingCart className="w-4 h-4 mr-2" />Agregar</Button>
      </div>
    </div>
  )
}

export default function CategoryPage() {
  const params = useParams()
  const slug = params?.slug as string
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState('relevance')
  const [showFilters, setShowFilters] = useState(false)
  
  const [products, setProducts] = useState<(Product & { computedBrand: string })[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Sort States
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [priceRanges, setPriceRanges] = useState<string[]>([])

  // Known brands dictionary to extract from string
  const KNOWN_BRANDS = ['Colún', 'Colun', 'Soprole', 'Nestlé', 'Coca-Cola', 'Escudo', 'Carozzi', 'Tucapel', 'Omo', 'Quix', 'Confort', 'Lucchetti', 'Maggi']

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const allProducts = await getProducts();
        const categoryProducts = allProducts.filter(p => {
          const catStr = p.category as unknown as string;
          const c = typeof catStr === 'string' ? catStr.toLowerCase() : p.category?.slug?.toLowerCase() || '';
          return c === slug.toLowerCase();
        }).map(p => {
          // Dynamic brand extraction
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

  // Derived filter calculations
  const availableBrands = Array.from(new Set(products.map(p => p.computedBrand))).sort();

  const handleBrandToggle = (brand: string) => {
    setSelectedBrands(prev => prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]);
  }

  const handlePriceToggle = (range: string) => {
    setPriceRanges(prev => prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]);
  }

  // Execution of filters and sorting
  let displayProducts = [...products];

  // 1. Filter by Brands
  if (selectedBrands.length > 0) {
    displayProducts = displayProducts.filter(p => selectedBrands.includes(p.computedBrand));
  }

  // 2. Filter by Price Range
  if (priceRanges.length > 0) {
    displayProducts = displayProducts.filter(p => {
       if (priceRanges.includes('low') && p.price <= 2000) return true;
       if (priceRanges.includes('mid') && p.price > 2000 && p.price <= 5000) return true;
       if (priceRanges.includes('high') && p.price > 5000) return true;
       return false;
    });
  }

  // 3. Sort
  if (sortBy === 'price-asc') {
    displayProducts.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-desc') {
    displayProducts.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'newest') {
    displayProducts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  const categoryName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : 'Categoría';

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-20">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Link href="/" className="hover:text-corporate-blue">Inicio</Link>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-medium capitalize">{categoryName}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2 capitalize">{categoryName}</h1>
              <p className="text-gray-600 dark:text-gray-400">{products.length} productos encontrados</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                <button onClick={() => setView('grid')} className={`p-2 rounded-md transition-colors ${view === 'grid' ? 'bg-corporate-blue text-white' : 'text-gray-500 hover:text-gray-700'}`}><Grid3X3 className="w-5 h-5" /></button>
                <button onClick={() => setView('list')} className={`p-2 rounded-md transition-colors ${view === 'list' ? 'bg-corporate-blue text-white' : 'text-gray-500 hover:text-gray-700'}`}><LayoutList className="w-5 h-5" /></button>
              </div>
              <div className="relative">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-corporate-blue/50">
                  {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>
              <Button variant="outline" className="md:hidden" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="w-4 h-4 mr-2" />Filtros</Button>
            </div>
          </div>

          <div className="flex gap-8">
            <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-64 shrink-0`}>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2"><Filter className="w-5 h-5" />Filtros</h3>
                </div>
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Precio</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={priceRanges.includes('low')} onChange={() => handlePriceToggle('low')} className="rounded border-gray-300" /><span className="text-sm">Hasta $2.000</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={priceRanges.includes('mid')} onChange={() => handlePriceToggle('mid')} className="rounded border-gray-300" /><span className="text-sm">$2.000 - $5.000</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={priceRanges.includes('high')} onChange={() => handlePriceToggle('high')} className="rounded border-gray-300" /><span className="text-sm">Más de $5.000</span></label>
                  </div>
                </div>
                <div className="mb-6">
                  <h4 className="font-medium mb-3">Marcas Listadas</h4>
                  <div className="space-y-2">
                    {availableBrands.map(brand => (
                      <label key={brand} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => handleBrandToggle(brand)} className="rounded border-gray-300" /><span className="text-sm">{brand}</span></label>
                    ))}
                    {availableBrands.length === 0 && <span className="text-sm text-gray-400">Sin marcas</span>}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Valoración</h4>
                  <div className="space-y-2">
                    {[5, 4, 3].map((rating) => (
                      <label key={rating} className="flex items-center gap-2">
                        <input type="checkbox" className="rounded border-gray-300" />
                        <div className="flex items-center gap-1">
                          {[...Array(rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-accent-yellow text-accent-yellow" />)}
                          <span className="text-sm ml-1">o más</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <div className="flex-1">
              {loading ? (
                 <div className="flex justify-center py-20 px-4 text-gray-500">Cargando productos de esta categoría...</div>
              ) : displayProducts.length === 0 ? (
                 <div className="flex justify-center py-20 px-4 text-gray-500">No hay productos que coincidan con los filtros aplicados.</div>
              ) : (
                <div className={view === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6' : 'space-y-4'}>
                  {displayProducts.map((product) => <ProductCard key={product.id} product={product} view={view} />)}
                </div>
              )}
              <div className="flex items-center justify-center gap-2 mt-12">
                <Button variant="outline" size="sm" disabled>Anterior</Button>
                <Button variant="default" size="sm" className="bg-corporate-blue">1</Button>
                <Button variant="outline" size="sm">2</Button>
                <Button variant="outline" size="sm">3</Button>
                <Button variant="outline" size="sm">Siguiente</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
