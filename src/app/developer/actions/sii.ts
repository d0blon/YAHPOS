'use server'

import { createAdminClient, createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { verifyDeveloperRole } from './_shared'
import type { DtePayload } from '@/lib/sii/types'

interface CertificationTest {
  tipo: 33 | 39 | 41 | 52 | 56 | 61
  desc: string
  receptor?: { rut: string, razon: string, giro: string, dir: string }
  ref?: { tipo: number, folio: number, fch: string, razon: string, cod?: number }
  descGral?: number
  multiItem?: boolean
  specialChars?: boolean
}

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
    const authClient = await createClient()
    await verifyDeveloperRole(authClient)

    await engine.initForStore(storeId)

    const tests: CertificationTest[] = [
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
      const payload: DtePayload = {
        Encabezado: {
          TipoDTE: test.tipo,
          Folio: 0,
          FchEmis: new Date().toISOString().split('T')[0],
          MntTotal: test.tipo === 41 ? 1000 : 1190,
          MntExe: test.tipo === 41 ? 1000 : 0,
          RUTRecep: test.receptor?.rut || '66666666-6',
          RznSocRecep: test.receptor?.razon,
          GiroRecep: test.receptor?.giro,
          DirRecep: test.receptor?.dir,
          Referencias: test.ref ? [
            {
              TpoDocRef: test.ref.tipo,
              FolioRef: test.ref.folio,
              FchRef: test.ref.fch,
              RazonRef: test.ref.razon,
              CodRef: test.ref.cod
            }
          ] : undefined
        },
        Detalles: test.multiItem ? [
          { NmbItem: 'Item 1', QtyItem: 1, PrcItem: 500, MontoItem: 500 },
          { NmbItem: 'Item 2', QtyItem: 1, PrcItem: 500, MontoItem: 500 }
        ] : test.specialChars ? [
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
      
      let trackId: string | null = null
      if (emission.success) {
        const envio = await engine.enviarDocumentoAlSII(emission.documentId!, storeId)
        if (envio.success) trackId = envio.trackId ?? null
      }

      results.push({
        desc: test.desc,
        success: emission.success,
        // `emission` es una unión discriminada: fuera de un `if (emission.success)` el
        // compilador no ve `folio`/`documentId`, así que se elige por rama.
        folio: emission.success ? emission.folio : 0,
        documentId: emission.success ? emission.documentId : undefined,
        trackId,
        error: emission.success ? undefined : emission.error
      })
    }

    return { success: true, results }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error de servidor' }
  }
}

/**
 * Cambia el entorno del SII (certificación vs producción) para una tienda.
 */
export async function toggleSiiEnvironmentAction(storeId: string, environment: 'certification' | 'production') {
  const supabase = await createClient()

  try {
    await verifyDeveloperRole(supabase)

    const { data: config, error: readError } = await supabase
      .from('sii_config')
      .select('id')
      .eq('store_id', storeId)
      .single()

    if (readError || !config) throw new Error('Configuración SII no encontrada para la tienda')

    // El motor lee `sii_config.environment` (src/lib/sii/engine.ts), no `stores.config`.
    // Se usa admin client porque el desarrollador no tiene store_id y la policy
    // store_isolation_policy no permite operar sobre la tienda de otro usuario.
    const admin = createAdminClient()
    const { error } = await admin
      .from('sii_config')
      .update({ environment })
      .eq('id', config.id)

    if (error) throw error

    revalidatePath('/developer')
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error de servidor' }
  }
}
