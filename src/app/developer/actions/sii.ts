'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

/**
 * Ejecuta la suite de certificación SII para una tienda.
 */
export async function runSiiCertificationAction(storeId: string, realMode: boolean = false) {
  const { SiiEngine } = await import('@/lib/sii/engine')
  const engine = new SiiEngine()
  const results: {
    desc: string
    success: boolean
    folio?: number
    documentId?: string
    trackId?: string | null
    error?: string
  }[] = []

  try {
    await engine.initForStore(storeId)

    const tests = [
      { tipo: 39, desc: "Boleta Electrónica Afecta" },
      { tipo: 41, desc: "Boleta Electrónica Exenta" },
      { tipo: 33, desc: "Factura Electrónica Afecta" },
      { tipo: 33, desc: "Factura Electrónica (Cliente Empresa)", receptor: { rut: "77777777-7", razon: "Empresa de Pruebas SpA", giro: "Servicios", dir: "Calle Falsa 123" } },
      { tipo: 52, desc: "Guía de Despacho (Traslado)" },
      { tipo: 61, desc: "Nota de Crédito (Anula Factura)", ref: { tipo: 33, folio: 1, fch: new Date().toISOString().split('T')[0], razon: "ANULACION POR ERROR" } },
      { tipo: 61, desc: "Nota de Crédito (Corrige Texto)", ref: { tipo: 33, folio: 2, fch: new Date().toISOString().split('T')[0], razon: "CORRIGE DIRECCION", cod: 2 } },
      { tipo: 56, desc: "Nota de Débito (Aumento de Intereses)", ref: { tipo: 33, folio: 1, fch: new Date().toISOString().split('T')[0], razon: "INTERESES POR MORA" } },
      { tipo: 33, desc: "Factura con Descuento Global", descGral: 10 },
      { tipo: 39, desc: "Boleta con múltiples ítems", multiItem: true },
      { tipo: 39, desc: "Boleta con Caracteres Especiales (ñ, á, é, í, ó, ú)", specialChars: true }
    ]

    for (const test of tests) {
      const payload: any = {
        Encabezado: {
          TipoDTE: test.tipo as 33 | 34 | 39 | 41 | 46 | 52 | 56 | 61,
          Folio: 0,
          FchEmis: new Date().toISOString().split('T')[0],
          MntTotal: test.tipo === 41 ? 1000 : 1190,
          MntExe: test.tipo === 41 ? 1000 : 0,
          RUTRecep: (test as any).receptor?.rut || '66666666-6',
          RznSocRecep: (test as any).receptor?.razon,
          GiroRecep: (test as any).receptor?.giro,
          DirRecep: (test as any).receptor?.dir,
          Referencias: (test as any).ref ? [
            {
              TpoDocRef: (test as any).ref.tipo,
              FolioRef: (test as any).ref.folio,
              FchRef: (test as any).ref.fch,
              RazonRef: (test as any).ref.razon,
              CodRef: (test as any).ref.cod
            }
          ] : undefined
        },
        Detalles: (test as any).multiItem ? [
          { NmbItem: 'Item 1', QtyItem: 1, PrcItem: 500, MontoItem: 500 },
          { NmbItem: 'Item 2', QtyItem: 1, PrcItem: 500, MontoItem: 500 }
        ] : (test as any).specialChars ? [
          {
            NmbItem: `Producto con Ñandú y Acción`,
            QtyItem: 1,
            PrcItem: 1000,
            MontoItem: 1000
          }
        ] : [
          {
            NmbItem: `Producto ${test.desc}`,
            QtyItem: 1,
            PrcItem: 1000,
            MontoItem: 1000,
            IndExe: test.tipo === 41 ? 1 : undefined
          }
        ]
      }

      const emission = await engine.emitirDocumento(payload, storeId, { test: !realMode })
      
      let trackId = null
      if (emission.success) {
        const envio = await engine.enviarDocumentoAlSII(emission.documentId!, storeId)
        if (envio.success) trackId = (envio as any).trackId
      }

      results.push({
        desc: test.desc,
        success: emission.success,
        folio: emission.folio,
        documentId: emission.documentId,
        trackId,
        error: emission.error
      })
    }

    return { success: true, results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Cambia el entorno del SII (certificación vs producción) para una tienda.
 */
export async function toggleSiiEnvironmentAction(storeId: string, environment: 'certification' | 'production') {
  const supabase = await createClient()
  
  try {
    const { data: store } = await supabase
      .from('stores')
      .select('config')
      .eq('id', storeId)
      .single()

    if (!store) throw new Error('Tienda no encontrada')

    const newConfig = {
      ...(store.config || {}),
      sii_environment: environment
    }

    const { error } = await supabase
      .from('stores')
      .update({ config: newConfig })
      .eq('id', storeId)

    if (error) throw error

    revalidatePath('/developer')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
