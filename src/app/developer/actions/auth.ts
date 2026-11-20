'use server'

import { cookies } from 'next/headers'
import { verifyMasterTOTP } from '@/lib/security'
import { createDevToken, DEV_TOKEN_MAX_AGE } from '@/lib/dev-auth'

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
      const token = createDevToken()
      if (!token) {
        return { success: false, error: 'Configuración de sesión developer no disponible' }
      }

      // Token firmado (HMAC) con expiración embebida; ya no es un valor estático.
      const cookieStore = await cookies()
      cookieStore.set('dev_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: DEV_TOKEN_MAX_AGE,
        path: '/'
      })

      return { success: true }
    }

    return { success: false, error: 'Código o contraseña incorrectos' }
  } catch (e) {
    console.error("Action error:", e)
    return { success: false, error: (e instanceof Error ? e.message : '') || 'Error de servidor' }
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
