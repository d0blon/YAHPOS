'use server'

import { cookies } from 'next/headers'
import { verifyMasterTOTP } from '@/lib/security'
import { createClient } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

const MASTER_ENCRYPTED = process.env.MASTER_KEY_ENCRYPTED || ''

/**
 * Verifica la identidad del desarrollador mediante la contraseña maestra y el código Authy.
 */
export async function verifyDeveloperAccessAction(password: string, code: string) {
  try {
    if (!MASTER_ENCRYPTED) {
      return { success: false, error: 'Configuración maestra no encontrada' }
    }

    const isValid = await verifyMasterTOTP(code, MASTER_ENCRYPTED, password)

    if (isValid) {
      // Establecer una cookie de sesión para el modo developer (expira en 2 horas)
      const cookieStore = await cookies()
      cookieStore.set('dev_token', 'patagonia_dev_active', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 2,
        path: '/'
      })

      return { success: true }
    }

    return { success: false, error: 'Código o contraseña incorrectos' }
  } catch (e: any) {
    console.error("Action error:", e)
    return { success: false, error: e.message || 'Error de servidor' }
  }
}

/**
 * Obtiene la configuración actual de la tienda (SaaS).
 */
export async function getStoreSettingsAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .single()

  if (error) return null
  return data
}

/**
 * Actualiza la configuración de una tienda específica.
 */
export async function updateStoreSettingsAction(storeId: string, settings: any) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('store_settings')
    .update(settings)
    .eq('id', storeId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/admin/developer')
  return { success: true }
}

/**
 * Elimina un negocio y sus configuraciones.
 */
export async function deleteStoreAction(storeId: string) {
  const supabase = await createClient()
  
  try {
    // 1. Eliminar settings (cascada manual si no está en DB)
    await supabase.from('store_settings').delete().eq('id', storeId)
    
    // 2. Eliminar store
    const { error } = await supabase
      .from('stores')
      .delete()
      .eq('id', storeId)

    if (error) throw error

    revalidatePath('/admin/developer')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Cita de sesión de desarrollador.
 */
export async function logoutDeveloperAction() {
  const cookieStore = await cookies()
  cookieStore.delete('dev_token')
  return { success: true }
}

/**
 * Obtiene todos los negocios (tenants) registrados.
 */
export async function listStoresAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }
  return data || []
}

/**
 * Crea un nuevo negocio (tenant) y sus ajustes iniciales.
 */
export async function createStoreAction(storeData: { name: string, slug: string, tier: string }) {
  const supabase = await createClient()
  
  try {
    // 1. Crear el registro del negocio
    const { data: newStore, error: storeError } = await supabase
      .from('stores')
      .insert({
        name: storeData.name,
        slug: storeData.slug,
        tier: storeData.tier,
        is_active: true
      })
      .select()
      .single()

    if (storeError) throw storeError

    // 2. Crear los ajustes iniciales para este negocio en store_settings
    const { error: settingsError } = await supabase
      .from('store_settings')
      .insert({
        id: newStore.id, // Usamos el ID del store como ID de settings
        store_name: storeData.name,
        tier: storeData.tier
      })

    if (settingsError) {
      console.warn('Could not create store_settings:', settingsError.message)
      // No fallamos la creación del store, pero avisamos
    }

    revalidatePath('/admin/developer')
    return { success: true, store: newStore }
  } catch (error: any) {
    console.error('Error creating store:', error)
    return { success: false, error: error.message }
  }
}

