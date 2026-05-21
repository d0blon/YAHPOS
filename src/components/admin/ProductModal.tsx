'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Package, Tag, DollarSign, Archive, Barcode, Scale, Info, AlertCircle, Loader2, MapPin, Wand2 } from 'lucide-react'
import { useSaaS } from '@/providers/SaaSProvider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import SqlModal from '@/components/modals/SqlModal'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: any
  onSaved: () => void
}

export default function ProductModal({ isOpen, onClose, product, onSaved }: ProductModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showSqlModal, setShowSqlModal] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [branchStocks, setBranchStocks] = useState<{[key: string]: number}>({})
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)  // moved here
  const { config, isFeatureEnabled } = useSaaS()
  const isMultiBranch = isFeatureEnabled('multi-branch')
  
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    lowStockThreshold: 5,
    category: '',
    description: '',
    image: '',
    unit: 'un',
    discount: 0,
    isActive: true,
    isFeatured: false,
    nutritionalSeals: 0,
    isRealtimeTracked: false
  })

  // Cargar categorías y sucursales al abrir
  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCategories(data)
          }
        })
        .catch(err => console.error('Error cargando categorías:', err))

      if (isMultiBranch) {
        fetch('/api/branches')
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) {
              setBranches(data)
            }
          })
          .catch(err => console.error('Error cargando sucursales:', err))
      }
    }
  }, [isOpen, isMultiBranch])

  // Cargar datos del producto si estamos editando
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        sku: product.sku || '',
        price: product.price || 0,
        stock: product.stock || 0,
        lowStockThreshold: product.lowStockThreshold || 5,
        category: product.category || '',
        description: product.description || '',
        image: product.image || '',
        unit: product.unit || 'un',
        discount: product.discount || 0,
        isActive: product.isActive !== undefined ? product.isActive : true,
        isFeatured: product.isFeatured || false,
        nutritionalSeals: product.nutritional_seals || 0,
        isRealtimeTracked: product.is_realtime_tracked || false
      })

      // Cargar stocks por sucursal si existen en el producto
      if (product.inventory && Array.isArray(product.inventory)) {
        const stocks: {[key: string]: number} = {}
        product.inventory.forEach((inv: any) => {
          stocks[inv.branch_id] = inv.stock
        })
        setBranchStocks(stocks)
      }
    } else {
      setFormData({
        name: '',
        sku: '',
        price: 0,
        stock: 0,
        lowStockThreshold: 5,
        category: '',
        description: '',
        image: '',
        unit: 'un',
        discount: 0,
        isActive: true,
        isFeatured: false,
        nutritionalSeals: 0,
        isRealtimeTracked: false
      })
      setBranchStocks({})
    }
  }, [product, isOpen])

  // Autocompletado Mágico vía SKU/Barcode
  useEffect(() => {
    const code = formData.sku
    if (!code || code.length < 8) return

    const timer = setTimeout(async () => {
      setIsSearchingBarcode(true)
      try {
        const res = await fetch(`/api/products/lookup?code=${code}`)
        const data = await res.json()
        
        if (data.success && data.product) {
          setFormData(prev => ({
            ...prev,
            name: prev.name || data.product.name || '',
            category: prev.category || data.product.category || prev.category,
            image: prev.image || data.product.image_url || '',
            nutritionalSeals: data.product.nutritionalSeals ?? prev.nutritionalSeals,
            barcode: prev.sku // Asegurar que barcode se llene si no existe
          }))
          toast.success('✨ Producto encontrado en catálogo global', {
            description: `Se autocompletó: ${data.product.name}`
          })
        }
      } catch (err) {
        console.error('Error in lookup:', err)
      } finally {
        setIsSearchingBarcode(false)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [formData.sku])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PATCH' : 'POST'

      const payload = {
        ...formData,
        branchStocks: isMultiBranch ? Object.entries(branchStocks).map(([branchId, stock]) => ({
          branchId,
          stock
        })) : []
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar producto')
      }

      toast.success(product ? 'Producto actualizado' : 'Producto creado')
      onSaved()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Descripción

  const isElite = config?.tier === 'patagonia'

  const generateWithAI = async () => {
    if (!formData.name) {
      toast.error('Ingresa el nombre del producto primero')
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: formData.name,
          productCategory: categories.find(c => c.id === formData.category)?.name || '',
          attributes: formData.description, // Usar lo que ya hay como base si existe
          tone: 'profesional'
        })
      })

      if (!res.ok) throw new Error('Error al generar descripción')
      
      const data = await res.json()
      setFormData(prev => ({ ...prev, description: data.description }))
      toast.success('✨ Descripción generada con éxito')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <SqlModal show={showSqlModal} onClose={() => setShowSqlModal(false)} />
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                {product ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">AustralPOS Catalog</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <Info className="w-4 h-4 text-brand-primary" /> Nombre del Producto
              </Label>
              <Input 
                required
                placeholder="Ej: Agua Mineral 500ml"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="rounded-xl border-gray-200 h-11"
              />
            </div>

            {/* SKU */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <Barcode className="w-4 h-4 text-brand-primary" /> SKU / Código de Barras
              </Label>
              <div className="relative">
                <Input 
                  placeholder="Ej: 780123456789"
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  className="rounded-xl border-gray-200 h-11 pr-10"
                />
                {isSearchingBarcode && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                  </div>
                )}
              </div>
            </div>

            {/* Sellos Nutricionales */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Sellos Nutricionales (0-4)
              </Label>
              <Input 
                type="number"
                min="0"
                max="4"
                value={formData.nutritionalSeals}
                onChange={e => {
                  const val = Math.min(4, Math.max(0, Number(e.target.value)))
                  setFormData({...formData, nutritionalSeals: val})
                }}
                className="rounded-xl border-gray-200 h-11"
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <Tag className="w-4 h-4 text-brand-primary" /> Categoría
              </Label>
              <select 
                required
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="">Seleccionar categoría...</option>
                {Array.isArray(categories) && categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Unidad */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <Scale className="w-4 h-4 text-brand-primary" /> Unidad de Venta
              </Label>
              <select 
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 text-sm"
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
              >
                <option value="un">Unidad (un)</option>
                <option value="kg">Kilogramo (kg)</option>
                <option value="lt">Litro (lt)</option>
                <option value="pack">Pack</option>
              </select>
            </div>

            {/* Precio */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <DollarSign className="w-4 h-4 text-brand-primary" /> Precio de Venta ($)
              </Label>
              <Input 
                type="number"
                required
                min="0"
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                className="rounded-xl border-gray-200 h-11 font-bold"
              />
            </div>

            {/* Descuento (Desactivado hasta que exista columna en DB) */}
            {/* 
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <Info className="w-4 h-4 text-brand-primary" /> Descuento (%)
              </Label>
              <Input 
                type="number"
                min="0"
                max="100"
                value={formData.discount}
                onChange={e => setFormData({...formData, discount: Number(e.target.value)})}
                className="rounded-xl border-gray-200 h-11"
              />
            </div>
            */}

            {/* Stock Section */}
            <div className="col-span-full">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <Label className="flex items-center gap-2 text-sm font-bold mb-4">
                  <Archive className="w-4 h-4 text-brand-primary" /> Control de Inventario
                </Label>
                
                {!isMultiBranch ? (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Stock Global</Label>
                    <Input 
                      type="number"
                      required
                      min="0"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                      className="rounded-xl border-gray-200 h-11"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {branches.length === 0 && (
                      <p className="text-sm text-gray-500 italic">Cargando sucursales...</p>
                    )}
                    {branches.map(branch => (
                      <div key={branch.id} className="space-y-2 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <Label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-400">
                          <MapPin className="w-3 h-3 text-blue-400" /> {branch.name}
                        </Label>
                        <Input 
                          type="number"
                          min="0"
                          placeholder="Stock en este local..."
                          value={branchStocks[branch.id] || 0}
                          onChange={e => setBranchStocks({
                            ...branchStocks, 
                            [branch.id]: Number(e.target.value)
                          })}
                          className="h-9 text-sm rounded-lg border-gray-100"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Umbral Bajo Stock */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold text-red-500">
                <AlertCircle className="w-4 h-4" /> Alerta de Stock Bajo (un)
              </Label>
              <Input 
                type="number"
                min="1"
                value={formData.lowStockThreshold}
                onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})}
                className="rounded-xl border-red-100 bg-red-50/30 h-11"
              />
            </div>
          </div>

          {/* URL de Imagen */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm font-bold">
              URL de Imagen
            </Label>
            <Input 
              placeholder="https://ejemplo.com/imagen.jpg"
              value={formData.image}
              onChange={e => setFormData({...formData, image: e.target.value})}
              className="rounded-xl border-gray-200 h-11"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Descripción</Label>
              {isElite && (
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm"
                  onClick={generateWithAI}
                  disabled={isGenerating}
                  className="text-xs font-black text-brand-primary hover:text-brand-accent hover:bg-brand-primary/10 gap-2 h-8 px-3 rounded-lg border border-brand-primary/20 animate-pulse-slow"
                >
                  {isGenerating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  Generar con IA
                </Button>
              )}
            </div>
            <Textarea 
              placeholder="Detalles del producto..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="rounded-xl border-gray-200 min-h-[100px]"
            />
          </div>

          <div className="flex flex-wrap gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="isActive" 
                checked={formData.isActive}
                onCheckedChange={checked => setFormData({...formData, isActive: !!checked})}
              />
              <Label htmlFor="isActive" className="text-sm font-bold cursor-pointer">Producto Activo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="isFeatured" 
                checked={formData.isFeatured}
                onCheckedChange={checked => setFormData({...formData, isFeatured: !!checked})}
              />
              <Label htmlFor="isFeatured" className="text-sm font-bold cursor-pointer">Destacar en Catálogo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="isRealtimeTracked" 
                checked={formData.isRealtimeTracked}
                onCheckedChange={checked => setFormData({...formData, isRealtimeTracked: !!checked})}
              />
              <Label htmlFor="isRealtimeTracked" className="text-sm font-bold cursor-pointer text-green-600">
                Seguimiento en Tiempo Real
              </Label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-12 rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving}
              className="flex-[2] h-12 bg-brand-primary hover:bg-brand-700 text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {product ? 'Actualizar Producto' : 'Crear Producto'}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
