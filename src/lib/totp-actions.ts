'use server'

import { generateSecret, generateURI } from 'otplib'
import QRCode from 'qrcode'

/**
 * Genera un nuevo secreto TOTP y su código QR correspondiente.
 * Esta función se ejecuta exclusivamente en el servidor por seguridad.
 * Utiliza la API funcional de otplib v13+.
 */
export async function generateMasterKeyAction() {
  try {
    // Generar un secreto Base32 (32 caracteres por defecto en otplib v13)
    const secret = generateSecret()
    
    // Generar el URI standard otpauth://
    const otpauth = generateURI({
      issuer: 'YAHPOS!',
      label: 'Developer',
      secret: secret
    })

    // Convertir el URI a una imagen QR (DataURL)
    const qrCodeUrl = await QRCode.toDataURL(otpauth)
    
    return {
      success: true,
      secret,
      qrCodeUrl
    }
  } catch (error) {
    console.error('Error generating TOTP:', error)
    return {
      success: false,
      error: 'No se pudo generar la clave maestra'
    }
  }
}
