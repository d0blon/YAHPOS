'use client'

import React, { useState, useMemo } from 'react'
import { 
  Plus, Trash2, FileText, Send, 
  User, MapPin, Tag, Calculator, 
  Truck, AlertCircle, CheckCircle2, Loader2 
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { emitManualDte } from '@/app/admin/facturacion/actions'
import { useSaaS } from '@/providers/SaaSProvider'
import { Lock } from 'lucide-react'

interface ItemRow {
  id: string
  name: string
  qty: number
  price: number
  isExempt: boolean
}

export function ManualEmissionTabs() {
  const { isDocumentTypeEnabled, tier } = useSaaS()
  const [dteType, setDteType] = useState<33 | 39 | 41 | 52 | 56 | 61>(33)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const canEmitFactura = isDocumentTypeEnabled(33)
  const canEmitGuia = isDocumentTypeEnabled(52)
  
  // Receptor State
  const [receptor, setReceptor] = useState({
    rut: '',
    name: '',
    giro: '',
    address: '',
    commune: '',
    city: ''
  })

  // Specific Guia fields
  const [guiaConfig, setGuiaConfig] = useState({
    tipoDespacho: 1 as 1 | 2 | 3,
    indTraslado: 1 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
  })

  // Reference for Notas
  const [reference, setReference] = useState({
    tpoDocRef: 33,
    folioRef: '',
    razonRef: '',
    codRef: 1 as 1 | 2 | 3
  })

  // Items State
  const [items, setItems] = useState<ItemRow[]>([
    { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, price: 0, isExempt: false }
  ])

  // Calculations
  const totals = useMemo(() => {
    let net = 0
    let exempt = 0
    
    items.forEach(item => {
      const lineTotal = item.qty * item.price
      if (item.isExempt) {
        exempt += lineTotal
      } else {
        net += lineTotal
      }
    })

    const iva = Math.round(net * 0.19)
    const total = net + iva + exempt

    return { net, iva, exempt, total }
  }, [items])

  const addItem = () => {
    setItems([
      ...items, 
      { id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, price: 0, isExempt: false }
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(i => i.id !== id))
    }
  }

  const updateItem = (id: string, field: keyof ItemRow, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleEmit = async () => {
    // Basic validation
    if (!receptor.rut || !receptor.name) {
      toast.error('RUT y Razón Social del receptor son obligatorios')
      return
    }

    if (items.some(i => !i.name || i.price <= 0)) {
      toast.error('Todos los ítems deben tener nombre y precio mayor a 0')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        Encabezado: {
          TipoDTE: dteType,
          Folio: 0, // Engine handles folio
          FchEmis: new Date().toISOString().split('T')[0],
          RUTRecep: receptor.rut,
          RznSocRecep: receptor.name,
          GiroRecep: receptor.giro,
          DirRecep: receptor.address,
          CmnaRecep: receptor.commune,
          CiudadRecep: receptor.city,
          MntNeto: totals.net,
          IVA: totals.iva,
          MntExe: totals.exempt > 0 ? totals.exempt : undefined,
          MntTotal: totals.total,
          TasaIVA: 19,
            ...(dteType === 52 ? {
              TipoDespacho: guiaConfig.tipoDespacho,
              IndTraslado: guiaConfig.indTraslado
            } : {}),
            ...([56, 61].includes(dteType) ? {
              Referencias: [{
                TpoDocRef: reference.tpoDocRef,
                FolioRef: Number(reference.folioRef),
                FchRef: new Date().toISOString().split('T')[0],
                CodRef: reference.codRef,
                RazonRef: reference.razonRef
              }]
            } : {})
          },
        Detalles: items.map(i => ({
          NmbItem: i.name,
          QtyItem: i.qty,
          PrcItem: i.price,
          MontoItem: i.qty * i.price,
          IndExe: i.isExempt ? 1 : undefined
        }))
      }

      // We use a default store ID or we could pass it as prop
      const result = await emitManualDte('main_store', dteType, payload as any)

      if (result.success) {
        toast.success(`Documento emitido correctamente. Folio: ${result.folio}`)
        // Reset form
        setItems([{ id: Math.random().toString(36).substr(2, 9), name: '', qty: 1, price: 0, isExempt: false }])
        setReceptor({ rut: '', name: '', giro: '', address: '', commune: '', city: '' })
      } else {
        toast.error(`Error: ${result.error}`)
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Configuration & Receptor (Left) */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="border-none bg-white dark:bg-gray-800 shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-brand-primary/10 rounded-2xl">
                <FileText className="h-5 w-5 text-brand-primary" />
              </div>
              <CardTitle className="text-xl font-black uppercase tracking-tight">Emisión Directa</CardTitle>
            </div>
            <CardDescription className="text-xs font-medium italic">Emite documentos tributarios sin pasar por el carrito de ventas.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tipo de Documento</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 33, label: 'Factura', icon: FileText, tier: 'ARCHIPIELAGO' },
                  { id: 39, label: 'Boleta', icon: FileText, tier: 'AUSTRAL' },
                  { id: 41, label: 'B. Exenta', icon: FileText, tier: 'AUSTRAL' },
                  { id: 52, label: 'Guía', icon: Truck, tier: 'PATAGONIA' },
                  { id: 61, label: 'N. Crédito', icon: FileText, tier: 'ARCHIPIELAGO' },
                  { id: 56, label: 'N. Débito', icon: FileText, tier: 'ARCHIPIELAGO' }
                ].map((type) => {
                  const enabled = isDocumentTypeEnabled(type.id)
                  const Icon = type.icon
                  return (
                    <div key={type.id} className="relative group">
                      <Button 
                        variant={dteType === type.id ? 'default' : 'outline'}
                        onClick={() => enabled && setDteType(type.id as any)}
                        disabled={!enabled}
                        className={cn(
                          "w-full h-12 rounded-xl font-black uppercase tracking-tighter text-[10px] transition-all",
                          dteType === type.id ? "bg-brand-primary text-white shadow-lg" : "border-gray-100 text-gray-400",
                          !enabled && "opacity-50 grayscale"
                        )}
                      >
                        {!enabled ? <Lock className="w-3 h-3 mr-1.5 text-amber-500" /> : <Icon className="w-3 h-3 mr-1.5" />}
                        {type.label}
                      </Button>
                      {!enabled && (
                        <div className="absolute -top-10 left-0 w-full hidden group-hover:block z-20">
                          <div className="bg-gray-900 text-white text-[8px] p-1.5 rounded shadow-xl font-bold text-center">
                            Requiere {type.tier}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {dteType === 52 && (
              <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-3xl space-y-6">
                <div className="flex items-center gap-2 text-amber-600">
                  <Truck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Configuración de Traslado</span>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase text-gray-500">Tipo de Despacho</Label>
                    <select 
                      className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-bold px-3 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                      value={guiaConfig.tipoDespacho}
                      onChange={(e) => setGuiaConfig({...guiaConfig, tipoDespacho: Number(e.target.value) as any})}
                    >
                      <option value={1}>1 - Emisor a otros (Venta)</option>
                      <option value={2}>2 - Emisor a bodegas (Traslado)</option>
                      <option value={3}>3 - Traslado por receptor (Compra)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[9px] font-bold uppercase text-gray-500">Motivo del Traslado</Label>
                    <select 
                      className="w-full h-10 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl text-[10px] font-bold px-3 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                      value={guiaConfig.indTraslado}
                      onChange={(e) => setGuiaConfig({...guiaConfig, indTraslado: Number(e.target.value) as any})}
                    >
                      <option value={1}>1 - Operación constituye venta</option>
                      <option value={2}>2 - Ventas por efectuar</option>
                      <option value={3}>3 - Consignaciones</option>
                      <option value={4}>4 - Entrega gratuita</option>
                      <option value={5}>5 - Traslados internos</option>
                      <option value={6}>6 - Otros traslados no venta</option>
                      <option value={7}>7 - Guía de devolución</option>
                      <option value={8}>8 - Traslado para exportación</option>
                      <option value={9}>9 - Venta para exportación</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {[56, 61].includes(dteType) && (
              <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-3xl space-y-4">
                <div className="flex items-center gap-2 text-blue-600">
                  <FileText className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Referencia a Documento</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase text-gray-400">Tipo Doc Ref</Label>
                    <select 
                      className="w-full h-9 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-lg text-[10px] px-2 outline-none"
                      value={reference.tpoDocRef}
                      onChange={(e) => setReference({...reference, tpoDocRef: Number(e.target.value)})}
                    >
                      <option value={33}>Factura (33)</option>
                      <option value={39}>Boleta (39)</option>
                      <option value={52}>Guía (52)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase text-gray-400">Folio Ref</Label>
                    <Input 
                      placeholder="Ej: 123"
                      value={reference.folioRef}
                      onChange={(e) => setReference({...reference, folioRef: e.target.value})}
                      className="h-9 text-[10px] font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-gray-400">Motivo</Label>
                  <Input 
                    placeholder="Ej: Error en precio"
                    value={reference.razonRef}
                    onChange={(e) => setReference({...reference, razonRef: e.target.value})}
                    className="h-9 text-[10px]"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-700">
              <div className="flex items-center gap-2 text-brand-primary mb-2">
                <User className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Datos del Receptor</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-gray-400 ml-1">RUT Empresa</Label>
                  <Input 
                    placeholder="76.000.000-0"
                    value={receptor.rut}
                    onChange={e => setReceptor({...receptor, rut: e.target.value})}
                    className="h-11 bg-gray-50/50 border-none rounded-xl text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Razón Social</Label>
                  <Input 
                    placeholder="Nombre o Empresa"
                    value={receptor.name}
                    onChange={e => setReceptor({...receptor, name: e.target.value})}
                    className="h-11 bg-gray-50/50 border-none rounded-xl text-sm font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Giro</Label>
                  <Input 
                    placeholder="Actividad Económica"
                    value={receptor.giro}
                    onChange={e => setReceptor({...receptor, giro: e.target.value})}
                    className="h-11 bg-gray-50/50 border-none rounded-xl text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Comuna</Label>
                    <Input 
                      placeholder="Santiago"
                      value={receptor.commune}
                      onChange={e => setReceptor({...receptor, commune: e.target.value})}
                      className="h-11 bg-gray-50/50 border-none rounded-xl text-sm"
                    />
                  </div>
                   <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Ciudad</Label>
                    <Input 
                      placeholder="Santiago"
                      value={receptor.city}
                      onChange={e => setReceptor({...receptor, city: e.target.value})}
                      className="h-11 bg-gray-50/50 border-none rounded-xl text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Dirección</Label>
                  <Input 
                    placeholder="Calle, Número, Depto"
                    value={receptor.address}
                    onChange={e => setReceptor({...receptor, address: e.target.value})}
                    className="h-11 bg-gray-50/50 border-none rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details (Right) */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-none bg-white dark:bg-gray-800 shadow-2xl rounded-[2.5rem] overflow-hidden min-h-[500px] flex flex-col">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-2xl">
                <Tag className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Detalle de Productos</CardTitle>
                <CardDescription className="text-xs font-medium italic">Agrega los ítems que conformarán el documento.</CardDescription>
              </div>
            </div>
            <Button 
              onClick={addItem}
              variant="outline" 
              className="rounded-xl border-dashed border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-widest h-10 px-4"
            >
              <Plus className="w-3 h-3 mr-2" />
              Añadir Ítem
            </Button>
          </CardHeader>
          
          <CardContent className="p-8 pt-2 flex-grow overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-y-3">
              <thead>
                <tr>
                  <th className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-4">Descripción</th>
                  <th className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-4 w-24">Cant.</th>
                  <th className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-4 w-32">Precio Unit.</th>
                  <th className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-4 w-20 text-center">Exento</th>
                  <th className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 px-4 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="px-2">
                      <Input 
                        value={item.name}
                        onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                        placeholder="Nombre del producto o servicio"
                        className="h-12 bg-gray-50/50 border-none rounded-xl text-sm font-medium focus:bg-white transition-all"
                      />
                    </td>
                    <td className="px-2">
                      <Input 
                        type="number"
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, 'qty', Number(e.target.value))}
                        className="h-12 bg-gray-50/50 border-none rounded-xl text-sm font-bold text-center"
                      />
                    </td>
                    <td className="px-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">$</span>
                        <Input 
                          type="number"
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                          className="h-12 bg-gray-50/50 border-none rounded-xl text-sm font-bold pl-7 pr-2"
                        />
                      </div>
                    </td>
                    <td className="px-2 text-center">
                      <Checkbox 
                        checked={item.isExempt}
                        onCheckedChange={(val) => updateItem(item.id, 'isExempt', !!val)}
                        className="rounded-md border-gray-200"
                      />
                    </td>
                    <td className="px-2 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => removeItem(item.id)}
                        className="h-10 w-10 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>

          {/* Footer Totals */}
          <div className="mt-auto p-8 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
            <div className="grid md:grid-cols-2 gap-8 items-end">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 p-4 rounded-3xl border border-amber-500/20">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-[10px] font-bold leading-relaxed">
                    Asegúrate de que los datos del receptor sean correctos. Una vez emitido, el documento es legalmente vinculante.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs px-2">
                  <span className="font-bold text-gray-400 uppercase tracking-widest">Neto</span>
                  <span className="font-black text-gray-600 font-mono">${totals.net.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs px-2">
                  <span className="font-bold text-gray-400 uppercase tracking-widest">IVA (19%)</span>
                  <span className="font-black text-gray-600 font-mono">${totals.iva.toLocaleString()}</span>
                </div>
                {totals.exempt > 0 && (
                  <div className="flex justify-between items-center text-xs px-2">
                    <span className="font-bold text-gray-400 uppercase tracking-widest">Exento</span>
                    <span className="font-black text-gray-600 font-mono">${totals.exempt.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-brand-primary p-5 rounded-3xl shadow-xl shadow-brand-primary/20">
                  <span className="font-black text-white uppercase tracking-[0.2em] text-xs">Total</span>
                  <span className="text-2xl font-black text-white font-mono tracking-tighter">${totals.total.toLocaleString()}</span>
                </div>
                
                <Button 
                  onClick={handleEmit}
                  disabled={isSubmitting}
                  className="w-full h-16 rounded-[2rem] bg-brand-primary hover:bg-brand-700 text-white font-black uppercase tracking-[0.2em] text-xs shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-3" />
                      Emitir Documento
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
