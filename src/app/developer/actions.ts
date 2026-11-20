'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { verifyDeveloperRole } from './actions/_shared'

/**
 * Obtiene la configuración actual de la tienda (SaaS).
 */
export async function getStoreSettingsAction(explicitStoreId?: string | null) {
  const supabase = await createClient()

  if (explicitStoreId === null) {
    return null // Retornar explícitamente null para evitar el fallback (ej. dominio raíz)
  }

  // 1. Priorizar storeId explícito SOLO si el rol developer se verificó en DB.
  if (explicitStoreId) {
    let isDeveloper = false
    try {
      await verifyDeveloperRole(supabase)
      isDeveloper = true
    } catch {
      isDeveloper = false
    }

    if (isDeveloper) {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, tier, config, is_active')
        .eq('id', explicitStoreId)
        .single()
      if (!error) return data
    }
    // No-developer: jamás consultar stores con un id arbitrario del argumento;
    // se resuelve la tienda desde la sesión más abajo.
  }

  // 2. Fallback: Intentar obtener el store_id del usuario actual (cuando explicitStoreId === undefined)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Buscar membresía activa en user_stores
  const { data: membership } = await supabase
    .from('user_stores')
    .select('store_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (membership?.store_id) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, tier, config, is_active')
      .eq('id', membership.store_id)
      .maybeSingle()

    if (!error) return data
  }

  return null
}

type StoreSettings = {
  [key: string]: unknown
  appearance_logo_url?: string | null
  appearance_primary_color?: string
  appearance_secondary_color?: string
  store_logo?: string | null
  store_name?: string
  white_label_enabled?: boolean
  accent_color?: string
  surface_color?: string | null
}

/**
 * Actualiza la configuración de una tienda específica.
 */
export async function updateStoreSettingsAction(storeId: string, settings: StoreSettings) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  let authorized = false
  try {
    await verifyDeveloperRole(supabase)
    authorized = true
  } catch {
    // No developer: requieren pertenencia verificada a ESTA tienda.
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single()

    if (profile?.store_id === storeId) {
      authorized = true
    } else {
      const { data: membership } = await supabase
        .from('user_stores')
        .select('store_id')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .maybeSingle()
      authorized = !!membership
    }
  }

  if (!authorized) return { success: false, error: 'No autorizado para actualizar esta tienda' }

  // Mapear los ajustes al campo config de la tabla stores
  const { error } = await supabase
    .from('stores')
    .update({
      config: settings,
      name: settings.store_name || undefined // Sincronizar nombre si viene en settings
    })
    .eq('id', storeId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/developer')
  return { success: true }
}
