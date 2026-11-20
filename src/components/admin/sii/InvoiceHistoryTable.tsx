'use client'

import React, { useEffect, useState } from 'react'
import { 
  FileText, Search, Filter, Download, 
  AlertCircle,
  MoreVertical, Printer, RotateCcw
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getDteHistory, generateCreditNote } from '@/app/admin/facturacion/actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface DteDocument {
  id: string
  folio: number
  tipo_dte: number
  monto_total: number
  estado: string
  created_at: string
  storage_path: string
  store_id: string
  rut_receptor?: string
}

export function InvoiceHistoryTable() {
  const [documents, setDocuments] = useState<DteDocument[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    setIsLoading(true)
    const res = await getDteHistory()
    if (res.success && res.data) {
      setDocuments(res.data)
    } else {
      toast.error('Error al cargar el historial: ' + res.error)
    }
    setIsLoading(false)
  }

  const handleCreditNote = async (docId: string) => {
    if (!confirm('¿Estás seguro de que deseas anular este documento con una Nota de Crédito?')) return

    setProcessingId(docId)
    try {
      const result = await generateCreditNote('', docId)
      if (result.success) {
        toast.success(`Nota de Crédito generada con éxito (Folio: ${result.folio})`)
        loadHistory()
      } else {
        toast.error(result.error || 'Error al generar Nota de Crédito')
      }
    } catch {
      toast.error('Error de conexión al procesar Nota de Crédito')
    } finally {
      setProcessingId(null)
    }
  }

  const filteredDocuments = documents.filter(doc => 
    doc.folio?.toString().includes(searchTerm) || 
    doc.rut_receptor?.includes(searchTerm)
  )

  const getDteLabel = (tipo: number) => {
    switch (tipo) {
      case 33: return 'Factura Electrónica'
      case 39: return 'Boleta Electrónica'
      case 41: return 'Boleta Exenta'
      case 52: return 'Guía de Despacho'
      case 61: return 'Nota de Crédito'
      case 56: return 'Nota de Débito'
      default: return `DTE ${tipo}`
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FIRMADO':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-3 py-1 font-black text-[9px] tracking-widest">FIRMADO</Badge>
      case 'ENVIADO':
        return <Badge className="bg-blue-500/10 text-blue-600 border-none px-3 py-1 font-black text-[9px] tracking-widest">ENVIADO</Badge>
      case 'ACEPTADO':
        return <Badge className="bg-emerald-600 text-white border-none px-3 py-1 font-black text-[9px] tracking-widest">ACEPTADO</Badge>
      case 'RECHAZADO':
        return <Badge className="bg-red-500/10 text-red-600 border-none px-3 py-1 font-black text-[9px] tracking-widest">RECHAZADO</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-500 border-none px-3 py-1 font-black text-[9px] tracking-widest uppercase">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por Folio, RUT o Tipo..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 h-12 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm focus:ring-2 ring-brand-primary/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="h-12 px-6 rounded-2xl border-gray-200 dark:border-gray-700 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-gray-50 transition-all">
            <Filter className="w-4 h-4" />
            Filtrar
          </Button>
          <Button onClick={loadHistory} className="h-12 px-6 rounded-2xl bg-brand-primary text-white hover:bg-brand-700 text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/20">
            Actualizar
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 dark:border-gray-700">
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Documento</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Folio</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Fecha</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Monto</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Estado</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-8">
                      <div className="h-4 bg-gray-100 dark:bg-gray-900 rounded-full w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-[2rem] mb-4">
                        <FileText className="w-12 h-12 text-gray-200" />
                      </div>
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No se encontraron documentos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors group">
                    <td className="p-8">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-primary/5 rounded-2xl group-hover:scale-110 transition-transform">
                          <FileText className="w-5 h-5 text-brand-primary" />
                        </div>
                        <div>
                          <p className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{getDteLabel(doc.tipo_dte)}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">ID: {doc.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-8">
                      <span className="font-mono text-sm font-bold bg-gray-100 dark:bg-gray-900 px-3 py-1 rounded-lg">
                        #{doc.folio}
                      </span>
                    </td>
                    <td className="p-8">
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString('es-CL')}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(doc.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="p-8">
                      <span className="text-sm font-black text-gray-900 dark:text-white">
                        ${doc.monto_total.toLocaleString('es-CL')}
                      </span>
                    </td>
                    <td className="p-8">
                      {getStatusBadge(doc.estado)}
                    </td>
                    <td className="p-8 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all">
                          <Printer className="w-4 h-4 text-gray-500" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all">
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 p-2 rounded-2xl border-none shadow-2xl bg-white dark:bg-gray-800">
                            <DropdownMenuItem className="p-3 rounded-xl cursor-pointer flex items-center gap-3 group">
                              <Download className="w-4 h-4 text-gray-400 group-hover:text-brand-primary transition-colors" />
                              <span className="text-xs font-bold">Descargar XML</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              disabled={processingId === doc.id || doc.tipo_dte === 61 || doc.estado !== 'ACEPTADO'}
                              onClick={() => handleCreditNote(doc.id)}
                              className="p-3 rounded-xl cursor-pointer flex items-center gap-3 group"
                            >
                              <RotateCcw className={cn(
                                "w-4 h-4 text-gray-400 group-hover:text-amber-500 transition-colors",
                                processingId === doc.id && "animate-spin"
                              )} />
                              <span className="text-xs font-bold">
                                {processingId === doc.id ? 'Procesando...' : 'Generar Nota Crédito'}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="p-3 rounded-xl cursor-pointer flex items-center gap-3 group text-red-600">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-xs font-bold">Reportar Error</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
