'use server'

import { cookies } from 'next/headers'
import { verifyMasterTOTP } from '@/lib/security'
import { createServerClient } from '@/lib/supabase'
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
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .single()

  if (error) return null
  return data
}

/**
 * Actualiza la configuración de la tienda.
 */
export async function updateStoreSettingsAction(settings: any) {
  const supabase = createServerClient()
  
  const { error } = await supabase
    .from('store_settings')
    .update(settings)
    .eq('id', '00000000-0000-0000-0000-000000000000')

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { success: true }
}

/**
 * Cita de sesión de desarrollador.
 */
export async function logoutDeveloperAction() {
  const cookieStore = await cookies()
  cookieStore.delete('dev_token')
  return { success: true }
}
