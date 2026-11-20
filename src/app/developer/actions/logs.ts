'use server'

import { createClient } from '@/lib/supabase'
import { verifyDeveloperRole } from './_shared'

/**
 * Obtiene logs reales de actividad del sistema para el Monitor Real.
 */
export async function getRealLogsAction(storeId?: string) {
  const supabase = await createClient()
  
  try {
    await verifyDeveloperRole(supabase)

    // 1. Logs de SII (Emisiones)
    let siiQuery = supabase
      .from('sii_logs')
      .select('id, store_id, event_type, message, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (storeId && storeId !== 'ALL') {
      siiQuery = siiQuery.eq('store_id', storeId)
    }

    const { data: siiLogs } = await siiQuery

    // 2. Logs de creación de tiendas (audit simple)
    let storeQuery = supabase
      .from('stores')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (storeId && storeId !== 'ALL') {
      storeQuery = storeQuery.eq('id', storeId)
    }

    const { data: storeLogs } = await storeQuery

    const formattedLogs = [
      ...(siiLogs || []).map(l => ({
        id: l.id,
        timestamp: l.created_at,
        type: l.event_type === 'ERROR' ? 'ERROR' as const : 'SUCCESS' as const,
        message: `SII [Tienda ${l.store_id.slice(0,5)}]: ${l.message}`,
        category: 'BILLING'
      })),
      ...(storeLogs || []).map(l => ({
        id: l.id,
        timestamp: l.created_at,
        type: 'INFO' as const,
        message: `Sistema: Actividad de negocio detectada - ${l.name}`,
        category: 'AUDIT'
      }))
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return formattedLogs
  } catch (err) {
    console.error("Error fetching real logs:", err)
    return []
  }
}
