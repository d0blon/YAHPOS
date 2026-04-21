'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, Plus, Search, Edit2, Trash2, 
  LayoutDashboard, ShoppingCart, Users, TrendingUp,
  Loader2, AlertCircle, Eye, EyeOff, AlertTriangle, Settings
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { toast } from 'sonner'
import ProductModal from '@/components/admin/ProductModal'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  const fetchProducts = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Error al cargar productos')
      const json = await res.json()
      setProducts(json)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const handleEdit = (product: any) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${name}"? Esta acción no se puede deshacer.`)) return

    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar producto')
      toast.success('Producto eliminado')
      fetchProducts()
    } catch (err: any) {
      toast.error(err.message)
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
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-20">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            <AdminSidebar activePath="/admin/productos" />

            <div className="flex-1 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Productos</h1>
                  <p className="text-gray-600 dark:text-gray-400">Administra el catálogo de AustralPOS</p>
                </div>
                <Button 
                  onClick={() => setIsModalOpen(true)}
                  className="bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-corporate-blue/20 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Producto
                </Button>
              </div>

              <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input 
                      placeholder="Buscar por nombre o SKU..." 
                      className="pl-10 h-10 bg-gray-50 border-none rounded-lg"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                              <Loader2 className="w-8 h-8 text-corporate-blue animate-spin mx-auto" />
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
                                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
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
                                  {p.discount > 0 && (
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
                                    className="h-9 w-9 text-gray-400 hover:text-corporate-blue hover:bg-corporate-blue/5"
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
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        product={selectedProduct}
        onSaved={handleProductSaved}
      />
    </>
  )
}
