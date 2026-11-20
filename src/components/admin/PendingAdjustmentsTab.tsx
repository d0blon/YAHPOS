'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  FileText, CheckCircle, AlertTriangle, Plus, Trash2, 
  Loader2, ExternalLink, ArrowRight, RefreshCw, Camera
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface AdjustmentItem {
  barcode: string
  name: string
  quantity: number
  brand: string
  volume: string
}

export interface MissingProductItem extends AdjustmentItem {
  price?: number
  supplierName?: string
  supplierMetadata?: Record<string, unknown>
}

interface ExtractedItem {
  barcode?: string
  sku?: string
  name?: string
  quantity?: number | string
  brand?: string
  volume?: string
}

interface AdjustmentRecord {
  id: string
  invoice_number?: string | null
  supplier_name?: string | null
  supplier_metadata?: Record<string, unknown> | null
  invoice_url?: string | null
  items?: ExtractedItem[] | null
  status: string
  created_at: string
}

interface CatalogProduct {
  sku?: string
  barcode?: string
  stock: number
  price: number
}

interface PendingAdjustmentsTabProps {
  products: CatalogProduct[]
  onProductSaved: () => void
  onAddMissingProduct: (item: MissingProductItem) => void
}

export default function PendingAdjustmentsTab({ 
  products, 
  onProductSaved,
  onAddMissingProduct 
}: PendingAdjustmentsTabProps) {
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Detalle del ajuste seleccionado para revisión
  const [selectedAdjustment, setSelectedAdjustment] = useState<AdjustmentRecord | null>(null)
  const [editedItems, setEditedItems] = useState<AdjustmentItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/admin/inventory/adjustments/upload', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al procesar la factura')
      }

      const data = await res.json()
      toast.success('✨ Factura subida y procesada con éxito por la IA')
      
      // Volver a cargar la lista y abrir automáticamente el validador del nuevo ajuste
      await fetchAdjustments()
      if (data.adjustment) {
        handleOpenReview(data.adjustment)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar la factura')
    } finally {
      setIsUploading(false)
      // Limpiar input file
      e.target.value = ''
    }
  }

  const fetchAdjustments = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/admin/inventory/adjustments')
      if (!res.ok) throw new Error('Error al cargar ingresos pendientes')
      const json = await res.json()
      setAdjustments(json)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar ingresos pendientes'
      setError(message)
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAdjustments()
  }, [])

  const handleOpenReview = (adj: AdjustmentRecord) => {
    setSelectedAdjustment(adj)
    // Clonar los ítems para poder editarlos localmente
    setEditedItems(
      Array.isArray(adj.items) 
        ? adj.items.map((item: ExtractedItem) => ({
            barcode: item.barcode || item.sku || '',
            name: item.name || '',
            quantity: Number(item.quantity) || 0,
            brand: item.brand || '',
            volume: item.volume || ''
          })) 
        : []
    )
  }

  const handleCloseReview = () => {
    setSelectedAdjustment(null)
    setEditedItems([])
  }

  const handleItemChange = (index: number, field: keyof AdjustmentItem, value: AdjustmentItem[keyof AdjustmentItem]) => {
    const updated = [...editedItems]
    updated[index] = { ...updated[index], [field]: value }
    setEditedItems(updated)
  }

  const handleRemoveItem = (index: number) => {
    const updated = editedItems.filter((_, i) => i !== index)
    setEditedItems(updated)
  }

  const handleApprove = async () => {
    if (!selectedAdjustment) return

    // Validar que al menos haya un ítem y que todos los ítems tengan código y cantidad
    if (editedItems.length === 0) {
      toast.error('No hay artículos para procesar')
      return
    }

    const invalidItems = editedItems.filter(item => !item.barcode || !item.quantity || item.quantity <= 0)
    if (invalidItems.length > 0) {
      toast.error('Hay artículos con código o cantidad inválidos')
      return
    }

    // Verificar si hay artículos que no están en el catálogo local
    const unmatchedItems = editedItems.filter(item => {
      return !products.some(p => p.sku === item.barcode || p.barcode === item.barcode)
    })

    if (unmatchedItems.length > 0) {
      toast.error('No puedes cargar stock de artículos que no existen en el catálogo', {
        description: `Por favor, agrega los ${unmatchedItems.length} artículos faltantes al catálogo primero.`
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/inventory/adjustments/${selectedAdjustment.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: editedItems })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al aprobar el ajuste')
      }

      const data = await res.json()
      toast.success('¡Stock cargado con éxito!', {
        description: `Se actualizó el stock de ${data.updated} productos.`
      })
      
      // Actualizar listas
      handleCloseReview()
      fetchAdjustments()
      onProductSaved() // Actualizar el catálogo en el componente principal
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aprobar el ajuste')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {isUploading && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 text-center max-w-sm mx-4 space-y-4 animate-in zoom-in-95 duration-200">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto" />
            <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white">Procesando con IA</h3>
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              Gemini 1.5 Flash está leyendo el documento para extraer artículos, códigos de barras, cantidades y el distribuidor. Esto tomará sólo unos segundos...
            </p>
          </div>
        </div>
      )}

      <Card className="border-none shadow-sm overflow-hidden bg-white/50 dark:bg-white/5 backdrop-blur-md">
        <CardHeader className="border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tighter italic">
                Ingresos pendientes <span className="text-brand-primary">con IA</span>
              </CardTitle>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Facturas escaneadas que requieren aprobación manual para actualizar inventario
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="file"
                id="invoice-upload-input"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <input
                type="file"
                id="invoice-camera-input"
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                onClick={() => document.getElementById('invoice-camera-input')?.click()}
                disabled={isUploading}
                variant="outline"
                className="rounded-xl border-brand-primary/30 text-brand-primary hover:bg-brand-primary/10 font-bold h-11 flex items-center gap-2 shadow-sm"
                title="Tomar foto de la factura"
              >
                <Camera className="w-4 h-4" />
                <span className="hidden sm:inline">Tomar Foto</span>
                <span className="sm:hidden">Cámara</span>
              </Button>
              <Button
                onClick={() => document.getElementById('invoice-upload-input')?.click()}
                disabled={isUploading}
                className="rounded-xl bg-brand-primary hover:bg-brand-primary/95 text-white font-bold h-11"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Subir Factura
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchAdjustments} 
                disabled={isLoading || isUploading}
                className="rounded-xl h-11"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-20 text-center">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin mx-auto" />
              <p className="mt-2 text-gray-500 font-medium">Buscando ingresos pendientes...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">Ocurrió un error</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : adjustments.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-pulse" />
              <p className="font-bold">No hay ingresos pendientes de revisión</p>
              <p className="text-sm mt-1">Las facturas procesadas por la IA aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {adjustments.map((adj) => {
                const isPending = adj.status === 'pending'
                return (
                  <div 
                    key={adj.id} 
                    className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-brand-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white leading-tight">
                          Factura #{adj.invoice_number || 'S/N'}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          Proveedor: <span className="font-semibold">{adj.supplier_name || 'Desconocido'}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={isPending ? 'warning' : 'success'} className="font-bold text-xs uppercase tracking-wide px-2 py-0.5">
                            {isPending ? 'Pendiente' : 'Aprobado'}
                          </Badge>
                          <span className="text-xs text-gray-500 font-mono">
                            {new Date(adj.created_at).toLocaleString('es-CL')}
                          </span>
                          <span className="text-xs text-brand-primary font-bold">
                            • {Array.isArray(adj.items) ? adj.items.length : 0} artículos
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {isPending ? (
                        <Button 
                          onClick={() => handleOpenReview(adj)}
                          className="bg-brand-primary hover:bg-brand-primary/95 text-white rounded-xl font-bold uppercase tracking-wider text-xs px-5 py-3.5 flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-md shadow-brand-primary/20"
                        >
                          Revisar y Cargar
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="font-bold px-3 py-1 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 border-none">
                          Procesado
                        </Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pantalla Dividida de Validación de Facturas (Modal de Pantalla Completa) */}
      {selectedAdjustment && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-gray-50 dark:bg-gray-950 animate-in fade-in slide-in-from-bottom duration-300">
          {/* Header del Validador */}
          <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-8 py-5 flex items-center justify-between shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-brand-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight italic">
                  Validador de Factura <span className="text-brand-primary">#{selectedAdjustment.invoice_number || 'S/N'}</span>
                </h3>
                <p className="text-xs text-gray-500 font-semibold">
                  Proveedor: {selectedAdjustment.supplier_name || 'Desconocido'} • AI Extraction Verification
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={handleCloseReview}
                className="rounded-xl border-gray-200"
              >
                Cerrar
              </Button>
              <Button 
                onClick={handleApprove}
                disabled={isSubmitting}
                className="bg-brand-primary hover:bg-brand-750 text-white font-bold rounded-xl px-6"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Confirmar y Cargar Stock
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Cuerpo Dividido */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
            {/* Panel Izquierdo: Documento Adjunto */}
            <div className="p-6 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full bg-gray-100/50 dark:bg-gray-900/30 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span>Documento de Respaldo</span>
                </h4>
                {selectedAdjustment.invoice_url && (
                  <a 
                    href={selectedAdjustment.invoice_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs text-brand-primary font-bold flex items-center gap-1 hover:underline"
                  >
                    Abrir en nueva pestaña
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="flex-1 min-h-[350px] relative bg-white dark:bg-gray-950 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-inner overflow-hidden flex items-center justify-center">
                {selectedAdjustment.invoice_url ? (
                  selectedAdjustment.invoice_url.toLowerCase().endsWith('.pdf') ? (
                    <iframe 
                      src={`${selectedAdjustment.invoice_url}#toolbar=0`} 
                      className="w-full h-full border-none"
                      title="PDF Factura"
                    />
                  ) : (
                    <Image
                      src={selectedAdjustment.invoice_url}
                      alt="Factura"
                      width={1200}
                      height={1600}
                      unoptimized
                      className="max-w-full max-h-full object-contain p-2"
                    />
                  )
                ) : (
                  <div className="text-center p-8">
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                    <p className="font-bold text-gray-700 dark:text-gray-300">Sin archivo digital adjunto</p>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm">
                      La información de esta factura fue registrada, pero no se subió una imagen o PDF del documento físico.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Panel Derecho: Tabla de Artículos Extraídos */}
            <div className="p-6 flex flex-col h-full overflow-hidden bg-white dark:bg-gray-950">
              <div className="mb-4">
                <h4 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
                  Artículos Detectados ({editedItems.length})
                </h4>
                <p className="text-xs text-gray-500 font-medium">
                  Corrige los datos leídos por la IA y asocia los productos que no se reconozcan.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs font-bold text-gray-500 uppercase border-b border-gray-100 dark:border-gray-800">
                      <th className="py-3 px-4">Artículo</th>
                      <th className="py-3 px-4">Código (SKU)</th>
                      <th className="py-3 px-4 w-28">Cant.</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                    {editedItems.map((item, index) => {
                      // Buscar si el producto ya existe en el catálogo local por SKU o código de barra
                      const matchedProduct = products.find(p => p.sku === item.barcode || p.barcode === item.barcode)
                      const isMatched = !!matchedProduct

                      return (
                        <tr key={index} className="hover:bg-gray-50/40 dark:hover:bg-gray-900/40 transition-colors">
                          {/* Nombre */}
                          <td className="py-3.5 px-4">
                            <Input 
                              value={item.name}
                              onChange={e => handleItemChange(index, 'name', e.target.value)}
                              className="h-9 px-2 text-sm rounded-lg border-gray-200/80 font-medium shadow-none focus:ring-1 focus:ring-brand-primary"
                            />
                            {item.brand && (
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold px-1.5 py-0.5 rounded mt-1 inline-block mr-1">
                                {item.brand}
                              </span>
                            )}
                            {item.volume && (
                              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold px-1.5 py-0.5 rounded mt-1 inline-block">
                                {item.volume}
                              </span>
                            )}
                          </td>
                          
                          {/* Código / SKU */}
                          <td className="py-3.5 px-4">
                            <Input 
                              value={item.barcode}
                              onChange={e => handleItemChange(index, 'barcode', e.target.value)}
                              className="h-9 px-2 font-mono text-xs rounded-lg border-gray-200/80 shadow-none focus:ring-1 focus:ring-brand-primary"
                            />
                          </td>

                          {/* Cantidad */}
                          <td className="py-3.5 px-4">
                            <Input 
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleItemChange(index, 'quantity', Math.max(1, Number(e.target.value)))}
                              className="h-9 px-2 text-sm font-bold text-center rounded-lg border-gray-200/80 shadow-none focus:ring-1 focus:ring-brand-primary"
                            />
                          </td>

                          {/* Estado de Asociación */}
                          <td className="py-3.5 px-4">
                            {isMatched ? (
                              <div className="flex flex-col">
                                <Badge className="bg-green-500/10 text-green-600 border-none font-bold text-[10px] uppercase py-0.5 px-1.5 w-fit flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />
                                  Asociado
                                </Badge>
                                <span className="text-[10px] text-gray-400 font-semibold mt-1">
                                  Stock: {matchedProduct.stock} | Ref: {matchedProduct.price ? `$${matchedProduct.price.toLocaleString()}` : 'Sin precio'}
                                </span>
                              </div>
                            ) : (
                              <Badge className="bg-yellow-500/10 text-yellow-600 border-none font-bold text-[10px] uppercase py-0.5 px-1.5 w-fit flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Sin Catálogo
                              </Badge>
                            )}
                          </td>

                          {/* Acción (Eliminar / Agregar) */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isMatched && (
                                <Button
                                  size="sm"
                                  onClick={() => onAddMissingProduct({ 
                                    ...item, 
                                    supplierName: selectedAdjustment.supplier_name ?? undefined,
                                    supplierMetadata: selectedAdjustment.supplier_metadata || {}
                                  })}
                                  className="h-8 bg-brand-primary hover:bg-brand-primary/90 text-white font-bold text-xs rounded-lg px-2 flex items-center gap-1"
                                  title="Registrar artículo en el catálogo"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Agregar
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleRemoveItem(index)}
                                className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                                title="Quitar de esta carga"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
