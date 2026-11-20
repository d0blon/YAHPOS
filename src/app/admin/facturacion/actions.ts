'use server'

import { createClient } from '@/lib/supabase'
import { SiiEngine, type ResultadoEmision } from '@/lib/sii/engine'
import type { DtePayload } from '@/lib/sii/types'
import { roleIn, SII_OPERATION_ROLES } from '@/lib/constants/roles'

const SII_FACTURACION_ROLES = [...SII_OPERATION_ROLES, 'superadmin'] as const
const SII_CROSS_STORE_ROLES = ['developer', 'superadmin'] as const
const TIPOS_DTE = [33, 39, 41, 52, 56, 61] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

type SiiSessionContext =
  | { ok: true; storeId: string; isCrossStore: boolean; supabase: SupabaseServer }
  | { ok: false; error: string }

function mensajeError(err: unknown): string {
  return err instanceof Error ? err.message : 'Error interno del servidor'
}

async function resolveSiiContext(requestedStoreId?: string): Promise<SiiSessionContext> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { ok: false, error: 'No autorizado' }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) return { ok: false, error: 'No se pudo verificar el perfil' }
    if (!profile?.store_id) return { ok: false, error: 'Perfil sin tienda' }
    if (!roleIn(profile.role, SII_FACTURACION_ROLES)) {
      return { ok: false, error: 'Sin permisos para operar el SII' }
    }

    if (!requestedStoreId || requestedStoreId === profile.store_id) {
      return { ok: true, storeId: profile.store_id, isCrossStore: false, supabase }
    }

    if (!roleIn(profile.role, SII_CROSS_STORE_ROLES)) {
      return { ok: false, error: 'No tienes permiso para operar otra tienda' }
    }
    if (!UUID_RE.test(requestedStoreId)) {
      return { ok: false, error: 'Tienda destino inválida' }
    }
    return { ok: true, storeId: requestedStoreId, isCrossStore: true, supabase }
  } catch (err) {
    console.error('[facturacion] Error resolviendo sesión:', err)
    return { ok: false, error: 'No se pudo verificar la sesión' }
  }
}

export async function getDteHistory() {
  const ctx = await resolveSiiContext()
  if (!ctx.ok) return { success: false, error: ctx.error }

  const { data, error } = await ctx.supabase
    .from('sii_documents')
    .select('id, folio, tipo_dte, monto_total, estado, created_at, store_id, storage_path')
    .eq('store_id', ctx.storeId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching DTE history:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function emitManualDte(storeId: string, tipo: number, payload: DtePayload): Promise<ResultadoEmision> {
  try {
    const ctx = await resolveSiiContext(storeId)
    if (!ctx.ok) return { success: false, error: ctx.error }

    if (!Number.isInteger(tipo) || !TIPOS_DTE.includes(tipo as (typeof TIPOS_DTE)[number])) {
      return { success: false, error: `Tipo de DTE inválido: ${String(tipo)}` }
    }

    const payloadTipo = payload?.Encabezado?.TipoDTE
    if (payloadTipo !== tipo) {
      return { success: false, error: `El tipo indicado (${tipo}) no coincide con el tipo del documento (${String(payloadTipo)})` }
    }

    if (!ctx.isCrossStore) {
      const { data: configData, error: configError } = await ctx.supabase
        .from('sii_config')
        .select('id')
        .eq('store_id', ctx.storeId)
        .maybeSingle()

      if (configError || !configData) {
        return { success: false, error: 'Configuración SII no encontrada' }
      }
    }

    const engine = new SiiEngine()
    await engine.initForStore(ctx.storeId)
    return await engine.emitirDocumento(payload, ctx.storeId)
  } catch (err) {
    console.error('Error in emitManualDte:', err)
    return { success: false, error: mensajeError(err) }
  }
}

export async function generateCreditNote(storeId: string, originalDocId: string): Promise<ResultadoEmision> {
  try {
    const ctx = await resolveSiiContext(storeId)
    if (!ctx.ok) return { success: false, error: ctx.error }

    const { data: originalDoc, error: docError } = await ctx.supabase
      .from('sii_documents')
      .select('tipo_dte, folio, created_at, monto_total')
      .eq('id', originalDocId)
      .eq('store_id', ctx.storeId)
      .maybeSingle()

    if (docError || !originalDoc) {
      return { success: false, error: 'Documento original no encontrado' }
    }

    const { data: logs, error: logError } = await ctx.supabase
      .from('sii_logs')
      .select('event_type, payload')
      .eq('store_id', ctx.storeId)
      .eq('tipo_dte', originalDoc.tipo_dte)
      .eq('folio', originalDoc.folio)
      .in('event_type', ['EMISSION_REQUEST', 'EMISSION_SUCCESS'])
      .order('created_at', { ascending: false })
      .limit(10)

    const logEntry = logs?.find((log) => log.payload != null)
    const loggedPayload = logEntry?.payload as DtePayload | null | undefined

    let payloadToUse: DtePayload

    if (logError || !loggedPayload?.Encabezado) {
      payloadToUse = {
        Encabezado: {
          TipoDTE: originalDoc.tipo_dte as DtePayload['Encabezado']['TipoDTE'],
          Folio: originalDoc.folio,
          FchEmis: originalDoc.created_at.split('T')[0],
          RUTRecep: '66666666-6',
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
      payloadToUse = loggedPayload
    }

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
            CodRef: 1,
            RazonRef: 'ANULACION TOTAL'
          }
        ]
      },
      Detalles: payloadToUse.Detalles
    }

    const engine = new SiiEngine()
    await engine.initForStore(ctx.storeId)
    return await engine.emitirDocumento(creditNotePayload, ctx.storeId)
  } catch (err) {
    console.error('Error generating credit note:', err)
    return { success: false, error: mensajeError(err) }
  }
}
