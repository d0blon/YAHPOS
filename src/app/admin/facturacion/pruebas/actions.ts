'use server'

import { createClient } from '@/lib/supabase'
import { emitManualDte } from '@/app/admin/facturacion/actions'
import { roleIn, SII_MANAGEMENT_ROLES } from '@/lib/constants/roles'
import { limiteVigenciaCaf } from '@/lib/sii/caf'
import { fechaChile } from '@/lib/sii/fecha-chile'
import { getCasoPrueba } from '@/lib/sii/test-cases'

const ROLES_GESTION = [...SII_MANAGEMENT_ROLES, 'superadmin'] as const

export type ResultadoCasoPrueba =
  | { success: true; folio: number; documentId: string }
  | { success: false; error: string }

type DisponibilidadCaf =
  | { ok: true; tipos: number[] }
  | { ok: false; error: string }

/**
 * Misma regla que GET /api/sii/caf, ejecutada en servidor: un cliente no puede
 * insistir que tiene CAF. Fecha local de Chile para no habilitar un CAF que el
 * motor rechazaría por vigencia.
 */
async function tiposConCafDeLaTienda(): Promise<DisponibilidadCaf> {
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
    if (!roleIn(profile.role, ROLES_GESTION)) {
      return { ok: false, error: 'Sin permisos para ejecutar pruebas SII' }
    }

    const { data: cafs, error: cafError } = await supabase
      .from('sii_folios')
      .select('tipo_dte, folio_actual, folio_hasta, fecha_autorizacion')
      .eq('store_id', profile.store_id)
      .eq('activo', true)
      .limit(200)

    if (cafError) return { ok: false, error: `No se pudo verificar el CAF: ${cafError.message}` }

    const hoy = fechaChile()
    const tipos = Array.from(new Set(
      (cafs ?? [])
        .filter((caf) => {
          const fecha = caf.fecha_autorizacion
          if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(fecha)) return false
          if (typeof caf.folio_actual === 'number' && typeof caf.folio_hasta === 'number' && caf.folio_actual > caf.folio_hasta) {
            return false
          }
          try {
            return hoy <= limiteVigenciaCaf(fecha.slice(0, 10))
          } catch {
            return false
          }
        })
        .map((caf) => (caf.tipo_dte == null ? NaN : Number(caf.tipo_dte)))
        .filter((tipo) => Number.isInteger(tipo) && tipo > 0)
    )).sort((a, b) => a - b)

    return { ok: true, tipos }
  } catch (err) {
    console.error('[pruebas SII] Error verificando CAF:', err)
    return { ok: false, error: 'No se pudo verificar el CAF' }
  }
}

/**
 * Emite un DTE real (firma + folio del CAF) para un caso del catálogo.
 * El envío al SII lo hace el cliente con la ruta existente `/api/sii/enviar`.
 */
export async function ejecutarCasoPrueba(caseId: string): Promise<ResultadoCasoPrueba> {
  if (typeof caseId !== 'string' || caseId.length > 100) {
    return { success: false, error: 'Identificador de caso inválido' }
  }

  const caso = getCasoPrueba(caseId)
  if (!caso) return { success: false, error: 'Caso de prueba desconocido' }

  const caf = await tiposConCafDeLaTienda()
  if (!caf.ok) return { success: false, error: caf.error }
  if (!caf.tipos.includes(caso.requiresCaf)) {
    return { success: false, error: `Sin CAF vigente para el tipo ${caso.requiresCaf}: caso bloqueado` }
  }

  const payload = caso.buildPayload(fechaChile())
  if (payload.Encabezado.TipoDTE !== caso.tipo) {
    return { success: false, error: 'El caso no coincide con el tipo de DTE declarado' }
  }

  // storeId vacío: el action de facturación deriva tienda y rol de la sesión.
  const resultado = await emitManualDte('', caso.tipo, payload)
  if (!resultado.success) return { success: false, error: resultado.error }

  return { success: true, folio: resultado.folio, documentId: resultado.documentId }
}
