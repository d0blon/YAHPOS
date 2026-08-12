'use client'

import React, { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import ShopBackdrop from '@/components/layout/ShopBackdrop'
import ProductCard from '@/components/shop/ProductCard'
import { getProducts } from '@/lib/api'
import type { Product } from '@/types'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { ensureGsapRegistered } from '@/lib/gsap'

const sortOptions = [
  { value: 'relevance', label: 'RELEVANCIA' },
  { value: 'price-asc', label: 'PRECIO: MENOR A MAYOR' },
  { value: 'price-desc', label: 'PRECIO: MAYOR A MENOR' },
  { value: 'newest', label: 'MÁS NUEVOS' },
]

function BuscarContent() {
  ensureGsapRegistered()
  const searchParams = useSearchParams()
  const q = searchParams?.get('q') || ''
  const [sortBy, setSortBy] = useState('relevance')
  const containerRef = useRef<HTMLDivElement>(null)

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    async function loadData() {
      if (!q) {
        setProducts([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const results = await getProducts(undefined, undefined, q)
        setProducts(results)
      } catch (err) {
        console.error('Failed to search products:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [q])

  useGSAP(() => {
    if (loading) return
    const tl = gsap.timeline()
    tl.from('.search-header > *', {
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
  }, { scope: containerRef, dependencies: [loading, q] })

  let displayProducts = [...products]
  if (sortBy === 'price-asc') {
    displayProducts.sort((a, b) => a.price - b.price)
  } else if (sortBy === 'price-desc') {
    displayProducts.sort((a, b) => b.price - a.price)
  } else if (sortBy === 'newest') {
    displayProducts.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }

  return (
    <>
      <ShopBackdrop />
      <Header />
      <main ref={containerRef} className="min-h-screen pt-32 pb-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="search-header mb-16 relative overflow-hidden rounded-[3rem] border border-white/10 glass-card p-10 md:p-16">
            <div className="relative z-10">
              <nav className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-gray-500 mb-8">
                <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
                <ChevronRight className="w-3 h-3 text-gray-700" />
                <span className="text-blue-400">Búsqueda</span>
              </nav>

              <Badge variant="outline" className="mb-6 border-blue-500/30 text-blue-400 px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em]">
                Resultados
              </Badge>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6 leading-[0.95]">
                {q ? `"${q}"` : 'Buscar productos'}
              </h1>
              {!loading && q && (
                <div className="flex items-center gap-4 text-sm font-black text-white/40 uppercase tracking-widest">
                  <span className="w-8 h-[2px] bg-blue-500" />
                  {displayProducts.length} PRODUCTOS ENCONTRADOS
                </div>
              )}

              {!loading && displayProducts.length > 0 && (
                <div className="mt-8 flex justify-end">
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
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-500 gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest">Buscando productos...</p>
            </div>
          ) : !q ? (
            <div className="flex flex-col items-center justify-center py-32 glass-card rounded-[40px] border-white/5 bg-white/5">
              <Search className="w-12 h-12 text-gray-700 mb-6" />
              <p className="text-xl font-black text-gray-500 uppercase tracking-tighter">Escribí algo para buscar</p>
              <p className="text-xs font-bold text-gray-600 mt-2">USÁ LA BARRA DE BÚSQUEDA ARRIBA</p>
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 glass-card rounded-[40px] border-white/5 bg-white/5">
              <Search className="w-12 h-12 text-gray-700 mb-6" />
              <p className="text-xl font-black text-gray-500 uppercase tracking-tighter">Sin resultados</p>
              <p className="text-xs font-bold text-gray-600 mt-2">NO ENCONTRAMOS PRODUCTOS PARA "{q.toUpperCase()}"</p>
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
        </div>
      </main>
      <Footer />
    </>
  )
}

export default function BuscarPage() {
  return (
    <Suspense fallback={null}>
      <BuscarContent />
    </Suspense>
  )
}
