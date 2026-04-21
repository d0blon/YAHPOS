'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation';
import { ShoppingCart, Heart, Share2, Star, Truck, ShieldCheck, RotateCcw, Minus, Plus, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useCartStore } from '@/stores'
import { formatPrice } from '@/lib/utils'
import { toast } from 'sonner'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

const product = {
  id: '1',
  name: 'Leche Entera Colun 1 Litro',
  slug: 'leche-entera-colun-1l',
  description: 'Leche entera pasteurizada de alta calidad, fuente natural de calcio y proteínas.',
  price: 1290,
  originalPrice: 1590,
  discount: 19,
  image: 'https://placehold.co/600x600/003399/FFFFFF?text=Leche+Colun+1L',
  images: ['https://placehold.co/600x600/003399/FFFFFF?text=Leche+Colun+1L', 'https://placehold.co/600x600/FFD100/000000?text=Leche+Colun+Back', 'https://placehold.co/600x600/ffffff/003399?text=Leche+Colun+Side'],
  category: { id: '1', name: 'Lácteos', slug: 'lacteos', isActive: true, order: 1 },
  categoryId: '1',
  stock: 50,
  lowStockThreshold: 10,
  sku: 'LAC001',
  barcode: '7802900123456',
  weight: 1,
  unit: 'unidad',
  rating: 4.8,
  reviewCount: 124,
  isActive: true,
  isFeatured: true,
  nutritionalInfo: { calories: 64, protein: 3.2, carbohydrates: 4.8, fat: 3.5, servingSize: '100ml' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const relatedProducts = [
  { id: '2', name: 'Leche Descremada Colun 1L', slug: 'leche-descremada-colun-1l', price: 1390, image: 'https://placehold.co/300x300/003399/FFFFFF?text=Leche+Descremada', category: { name: 'Lácteos' }, rating: 4.6 },
  { id: '3', name: 'Yogurt Natural Colun 1L', slug: 'yogurt-natural-colun-1l', price: 2490, image: 'https://placehold.co/300x300/FFD100/000000?text=Yogurt+Natural', category: { name: 'Lácteos' }, rating: 4.7 },
  { id: '4', name: 'Queso Gauda Lácteos 500g', slug: 'queso-gauda-lacteos-500g', price: 4490, image: 'https://placehold.co/300x300/FFD100/000000?text=Queso+Gauda', category: { name: 'Lácteos' }, rating: 4.5 },
]

export default function ProductPage() {
  const { slug } = useParams()
  const { addItem } = useCartStore()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  const handleAddToCart = () => {
    addItem(product, quantity)
    toast.success(`${product.name} agregado al carrito`)
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-32 pb-20">
        <div className="container mx-auto px-4">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-8">
            <Link href="/" className="hover:text-corporate-blue">Inicio</Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/categoria/${product.category.slug}`} className="hover:text-corporate-blue">{product.category.name}</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white font-medium">{product.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="aspect-square bg-white dark:bg-gray-800 rounded-2xl overflow-hidden">
                <img src={product.images[selectedImage]} alt={product.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-4">
                {product.images.map((image, index) => (
                  <button key={index} onClick={() => setSelectedImage(index)} className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${selectedImage === index ? 'border-corporate-blue' : 'border-transparent hover:border-gray-300'}`}>
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Badge variant="secondary">{product.category.name}</Badge>
                  {product.discount && <Badge className="bg-red-500 text-white">-{product.discount}%</Badge>}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">{product.name}</h1>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-accent-yellow text-accent-yellow" />
                    <span className="font-medium">{product.rating}</span>
                    <span className="text-gray-500">({product.reviewCount} reseñas)</span>
                  </div>
                  <span className="text-gray-300">|</span>
                  <span className="text-green-600 font-medium">En stock</span>
                </div>
              </div>

              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-corporate-blue dark:text-white">{formatPrice(product.price)}</span>
                {product.originalPrice && <span className="text-xl text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>}
              </div>

              <p className="text-gray-600 dark:text-gray-400">{product.description}</p>

              <div className="flex items-center gap-4">
                <span className="font-medium">Cantidad:</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><Minus className="w-4 h-4" /></button>
                  <span className="w-12 text-center font-medium text-lg">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"><Plus className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={handleAddToCart} size="lg" className="flex-1 bg-corporate-blue hover:bg-corporate-dark text-white"><ShoppingCart className="w-5 h-5 mr-2" />Agregar al Carrito</Button>
                <Button variant="outline" size="lg" className="w-14"><Heart className="w-5 h-5" /></Button>
                <Button variant="outline" size="lg" className="w-14"><Share2 className="w-5 h-5" /></Button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center"><Truck className="w-6 h-6 mx-auto mb-2 text-corporate-blue" /><p className="text-xs text-gray-600 dark:text-gray-400">Envío gratis +$30.000</p></div>
                <div className="text-center"><ShieldCheck className="w-6 h-6 mx-auto mb-2 text-corporate-blue" /><p className="text-xs text-gray-600 dark:text-gray-400">Garantía de calidad</p></div>
                <div className="text-center"><RotateCcw className="w-6 h-6 mx-auto mb-2 text-corporate-blue" /><p className="text-xs text-gray-600 dark:text-gray-400">Devolución 30 días</p></div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p><span className="font-medium">SKU:</span> {product.sku}</p>
                <p><span className="font-medium">Código de barras:</span> {product.barcode}</p>
                <p><span className="font-medium">Peso:</span> {product.weight} {product.unit}</p>
              </div>
            </div>
          </div>

          {product.nutritionalInfo && (
            <div className="mt-16">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Información Nutricional</h2>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Porción: {product.nutritionalInfo.servingSize}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"><p className="text-2xl font-bold text-corporate-blue">{product.nutritionalInfo.calories}</p><p className="text-sm text-gray-600">Calorías</p></div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"><p className="text-2xl font-bold text-corporate-blue">{product.nutritionalInfo.protein}g</p><p className="text-sm text-gray-600">Proteínas</p></div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"><p className="text-2xl font-bold text-corporate-blue">{product.nutritionalInfo.carbohydrates}g</p><p className="text-sm text-gray-600">Carbohidratos</p></div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center"><p className="text-2xl font-bold text-corporate-blue">{product.nutritionalInfo.fat}g</p><p className="text-sm text-gray-600">Grasas</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Productos Relacionados</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {relatedProducts.map((related) => (
                <Link key={related.id} href={`/producto/${related.slug}`} className="group bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <div className="aspect-square overflow-hidden"><img src={related.image} alt={related.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>
                  <div className="p-4">
                    <p className="text-xs text-corporate-blue mb-1">{related.category.name}</p>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2 group-hover:text-corporate-blue transition-colors">{related.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-corporate-blue">{formatPrice(related.price)}</span>
                      <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-accent-yellow text-accent-yellow" /><span className="text-sm">{related.rating}</span></div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
