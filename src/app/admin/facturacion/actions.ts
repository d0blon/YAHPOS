'use server'

import { createClient } from '@/lib/supabase'
import { SiiEngine } from '@/lib/sii/engine'
import { DtePayload } from '@/lib/sii/types'

export async function getDteHistory() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('sii_documents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching DTE history:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function emitManualDte(storeId: string, tipo: number, payload: DtePayload) {
  try {
    const supabase = await createClient()
    
    // Get store config
    const { data: configData, error: configError } = await supabase
      .from('sii_config')
      .select('*')
      .eq('store_id', storeId)
      .single()

    if (configError || !configData) {
      return { success: false, error: 'Configuración SII no encontrada' }
    }

    const engine = new SiiEngine()
    await engine.initForStore(storeId)
    const result = await engine.emitirDocumento(payload, storeId)

    return result
  } catch (err: any) {
    console.error('Error in emitManualDte:', err)
    return { success: false, error: err.message }
  }
}

export async function generateCreditNote(storeId: string, originalDocId: string) {
  try {
    const supabase = await createClient()

    // 1. Get original document
    const { data: originalDoc, error: docError } = await supabase
      .from('sii_documents')
      .select('*')
      .eq('id', originalDocId)
      .single()

    if (docError || !originalDoc) {
      throw new Error('Documento original no encontrado')
    }

    // 2. Try to find the payload in logs
    const { data: logEntry, error: logError } = await supabase
      .from('sii_logs')
      .select('payload')
      .eq('tipo_dte', originalDoc.tipo_dte)
      .eq('folio', originalDoc.folio)
      .eq('event_type', 'EMISION_DTE')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    let payloadToUse: DtePayload

    if (logError || !logEntry) {
      // Recreate a minimal payload if log is missing
      payloadToUse = {
        Encabezado: {
          TipoDTE: originalDoc.tipo_dte as any,
          Folio: originalDoc.folio,
          FchEmis: originalDoc.created_at.split('T')[0],
          RUTRecep: '66666666-6', // Default if unknown
          RznSocRecep: 'RECEPTOR ORIGINAL',
          MntNeto: Math.round(originalDoc.monto_total / 1.19),
          IVA: originalDoc.monto_total - Math.round(originalDoc.monto_total / 1.19),
          MntTotal: originalDoc.monto_total
        },
        Detalles: [
          {
            NmbItem: `ANULACION DOCUMENTO ${originalDoc.folio}`,
            QtyItem: 1,
            PrcItem: Math.round(originalDoc.monto_total / 1.19),
            MontoItem: Math.round(originalDoc.monto_total / 1.19)
          }
        ]
      }
    } else {
      payloadToUse = logEntry.payload as any
    }

    // 3. Prepare Credit Note Payload
    const creditNotePayload: DtePayload = {
      Encabezado: {
        ...payloadToUse.Encabezado,
        TipoDTE: 61,
        Folio: 0,
        FchEmis: new Date().toISOString().split('T')[0],
        MntNeto: payloadToUse.Encabezado.MntNeto,
        IVA: payloadToUse.Encabezado.IVA,
        MntExe: payloadToUse.Encabezado.MntExe,
        MntTotal: payloadToUse.Encabezado.MntTotal,
        Referencias: [
          {
            TpoDocRef: originalDoc.tipo_dte,
            FolioRef: originalDoc.folio,
            FchRef: originalDoc.created_at.split('T')[0],
            CodRef: 1, // 1: Anula Documento de Referencia
            RazonRef: 'ANULACION TOTAL'
          }
        ]
      },
      Detalles: payloadToUse.Detalles
    }

    // 4. Emit
    const engine = new SiiEngine()
    await engine.initForStore(storeId)
    const result = await engine.emitirDocumento(creditNotePayload, storeId)

    return result
  } catch (err: any) {
    console.error('Error generating credit note:', err)
    return { success: false, error: err.message }
  }
}
