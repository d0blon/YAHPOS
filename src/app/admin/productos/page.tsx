'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { 
  Package, Plus, Search, Edit2, Trash2, 
  Loader2, AlertTriangle, Settings, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import ProductModal from '@/components/admin/ProductModal'
import PendingAdjustmentsTab from '@/components/admin/PendingAdjustmentsTab'
import type { MissingProductItem } from '@/components/admin/PendingAdjustmentsTab'

interface AdminProduct {
  id: string
  name: string
  sku?: string
  barcode?: string
  image?: string
  category?: string | { name?: string } | null
  price: number
  discount?: number
  stock: number
  lowStockThreshold: number
  unit?: string
  isActive: boolean
}

interface ProductDraft {
  name?: string
  sku?: string
  brand?: string
  volume?: string
  supplierName?: string
  supplierMetadata?: Record<string, unknown>
  stock?: number
  price?: number
  category?: string
  image?: string
}

export default function AdminProducts() {
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductDraft | null>(null)
  const [activeTab, setActiveTab] = useState<'catalog' | 'ia_pending'>('catalog')

  const handleAddMissingProduct = (item: MissingProductItem) => {
    setSelectedProduct({
      name: item.name,
      sku: item.barcode,
      brand: item.brand || '',
      volume: item.volume || '',
      supplierName: item.supplierName || '',
      supplierMetadata: item.supplierMetadata || {},
      stock: item.quantity,
      price: item.price || 0,
      category: '',
      image: ''
    })
    setIsModalOpen(true)
  }

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Error al cargar productos')
      const json = await res.json()
      setProducts(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchProductsRef = useRef(fetchProducts)
  const hasFetchedRef = useRef(false)

  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
    void fetchProductsRef.current()
  }, [])

  const handleEdit = (product: AdminProduct) => {
    setSelectedProduct({
      ...product,
      category: typeof product.category === 'string' ? product.category : undefined
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar producto')
      toast.success('Producto eliminado')
      fetchProducts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar producto')
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedProduct(null)
  }

  const handleProductSaved = () => {
    handleModalClose()
    fetchProducts()
  }

  return (
    <>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">
              Gestión de <span className="text-brand-primary">Inventario</span>
            </h1>
            <p className="text-gray-500 text-sm font-medium">Catálogo de productos y control de stock centralizado</p>
          </div>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-primary hover:bg-brand-primary/90 text-white rounded-2xl px-8 h-14 font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-primary/20 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </Button>
        </div>

        {/* Tabs switcher */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-3 px-6 font-bold uppercase tracking-wider text-xs border-b-2 transition-all ${
              activeTab === 'catalog'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Catálogo de Productos
          </button>
          <button
            onClick={() => setActiveTab('ia_pending')}
            className={`py-3 px-6 font-bold uppercase tracking-wider text-xs border-b-2 transition-all ${
              activeTab === 'ia_pending'
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Ingresos con IA (Facturas)
          </button>
        </div>

        {activeTab === 'catalog' ? (
          <>
            {error && (
              <div role="alert" className="flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-medium text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-white/50 dark:bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/20 dark:border-white/10 shadow-xl">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input 
                  placeholder="Buscar por nombre, SKU o categoría..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-6 bg-white dark:bg-gray-900/50 border-none rounded-2xl text-lg font-medium shadow-inner w-full"
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" className="flex-1 md:flex-none rounded-2xl py-6 border-white/40 bg-white/40 dark:bg-gray-800/40">
                  <Settings className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
                <Button variant="outline" className="flex-1 md:flex-none rounded-2xl py-6 border-white/40 bg-white/40 dark:bg-gray-800/40">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Stocks Bajos
                </Button>
              </div>
            </div>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-black uppercase tracking-tighter italic">Lista de <span className="text-brand-primary">Productos</span></CardTitle>
                  <Badge className="bg-brand-primary/10 text-brand-primary border-none font-bold">{filteredProducts.length} Ítems</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/50 text-left">
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="py-4 px-6 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {isLoading ? (
                        <tr>
                          <td colSpan={6} className="py-20 text-center">
                            <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
                            <p className="mt-2 text-gray-500 font-medium">Cargando catálogo...</p>
                          </td>
                        </tr>
                      ) : filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-20 text-center text-gray-500">
                            No se encontraron productos
                          </td>
                        </tr>
                      ) : (
                        filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                                  {p.image ? (
                                    <Image src={p.image} alt={p.name} width={48} height={48} unoptimized className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      <Package className="w-6 h-6 text-gray-300" />
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 dark:text-white leading-tight">{p.name}</p>
                                  <p className="text-xs text-gray-500 font-mono mt-1">{p.sku || 'SIN SKU'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <Badge variant="secondary" className="font-medium text-xs bg-gray-100 text-gray-600">
                                {typeof p.category === 'string' ? p.category : p.category?.name ?? 'Sin categoría'}
                              </Badge>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-bold text-gray-900 dark:text-white">
                                ${p.price.toLocaleString()}
                                {p.discount != null && p.discount > 0 && (
                                  <span className="ml-2 text-xs font-bold text-green-600">-{p.discount}%</span>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${p.stock <= p.lowStockThreshold ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {p.stock}
                                </span>
                                <span className="text-xs text-gray-500">{p.unit}</span>
                                {p.stock <= p.lowStockThreshold && (
                                  <AlertTriangle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <button className="flex items-center gap-2 group">
                                {p.isActive ? (
                                  <Badge variant="success" className="gap-1.5 font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                    Activo
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1.5 font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                    Inactivo
                                  </Badge>
                                )}
                              </button>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleEdit(p)}
                                  className="h-9 w-9 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/5"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDelete(p.id, p.name)}
                                  className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <PendingAdjustmentsTab 
            products={products}
            onProductSaved={fetchProducts}
            onAddMissingProduct={handleAddMissingProduct}
          />
        )}
      </div>

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        product={selectedProduct ?? undefined}
        onSaved={handleProductSaved}
      />
    </>
  )
}
