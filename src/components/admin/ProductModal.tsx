'use client'

import React, { useState, useEffect } from 'react'
import { X, Save, Package, Tag, DollarSign, Archive, Barcode, Scale, Info, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product?: any
  onSaved: () => void
}

export default function ProductModal({ isOpen, onClose, product, onSaved }: ProductModalProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  
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
    isFeatured: false
  })

  // Cargar categorías al abrir
  useEffect(() => {
    if (isOpen) {
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setCategories(data)
          } else {
            console.warn('Categorías no es un array:', data)
            setCategories([])
          }
        })
        .catch(err => {
          console.error('Error cargando categorías:', err)
          setCategories([])
        })
    }
  }, [isOpen])

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
        isFeatured: product.isFeatured || false
      })
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
        isFeatured: false
      })
    }
  }, [product, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products'
      const method = product ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-8 py-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-corporate-blue/10 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-corporate-blue" />
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
                <Info className="w-4 h-4 text-corporate-blue" /> Nombre del Producto
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
                <Barcode className="w-4 h-4 text-corporate-blue" /> SKU / Código de Barras
              </Label>
              <Input 
                placeholder="Ej: 780123456789"
                value={formData.sku}
                onChange={e => setFormData({...formData, sku: e.target.value})}
                className="rounded-xl border-gray-200 h-11"
              />
            </div>

            {/* Categoría */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <Tag className="w-4 h-4 text-corporate-blue" /> Categoría
              </Label>
              <select 
                required
                className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-corporate-blue/20"
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
                <Scale className="w-4 h-4 text-corporate-blue" /> Unidad de Venta
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
                <DollarSign className="w-4 h-4 text-corporate-blue" /> Precio de Venta ($)
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
                <Info className="w-4 h-4 text-corporate-blue" /> Descuento (%)
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

            {/* Stock */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-bold">
                <Archive className="w-4 h-4 text-corporate-blue" /> Stock Inicial
              </Label>
              <Input 
                type="number"
                required
                min="0"
                value={formData.stock}
                onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                className="rounded-xl border-gray-200 h-11"
              />
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
            <Label className="text-sm font-bold">Descripción</Label>
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
              className="flex-[2] h-12 bg-corporate-blue hover:bg-corporate-dark text-white rounded-xl font-bold shadow-lg shadow-corporate-blue/20"
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
