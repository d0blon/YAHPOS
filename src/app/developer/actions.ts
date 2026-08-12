'use server'

import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

/**
 * Obtiene la configuración actual de la tienda (SaaS).
 */
export async function getStoreSettingsAction(explicitStoreId?: string | null) {
  const supabase = await createClient()
  
  if (explicitStoreId === null) {
    return null // Retornar explícitamente null para evitar el fallback (ej. dominio raíz)
  }

  // 1. Priorizar storeId explícito
  if (explicitStoreId) {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, tier, config, is_active')
      .eq('id', explicitStoreId)
      .single()
    if (!error) return data
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

/**
 * Actualiza la configuración de una tienda específica.
 */
export async function updateStoreSettingsAction(storeId: string, settings: any) {
  const supabase = await createClient()
  
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
