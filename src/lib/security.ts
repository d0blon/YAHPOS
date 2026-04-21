import crypto from 'crypto'
import { verifySync } from 'otplib'

/**
 * Utilidades de seguridad para PatagoniaPOS.
 * Administra el cifrado del Secreto Maestro y la validación de Authy.
 */

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

/**
 * Encripta un texto usando una contraseña.
 */
export function encrypt(text: string, password: string): string {
  const salt = crypto.scryptSync(password, 'patagonia-salt', 32)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, salt, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  // Guardamos el IV junto al texto encriptado para poder desencriptar luego
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Desencripta un texto usando una contraseña.
 */
export function decrypt(encryptedText: string, password: string): string {
  try {
    const textParts = encryptedText.split(':')
    const ivRaw = textParts.shift()
    if (!ivRaw) throw new Error('Invalid format')
    
    const iv = Buffer.from(ivRaw, 'hex')
    const encryptedData = textParts.join(':')
    
    const salt = crypto.scryptSync(password, 'patagonia-salt', 32)
    const decipher = crypto.createDecipheriv(ALGORITHM, salt, iv)
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    throw new Error('Contraseña maestra incorrecta o datos corruptos.')
  }
}

/**
 * Verifica si un código de Authy es válido contra el secreto encriptado.
 */
export async function verifyMasterTOTP(code: string, encryptedSecret: string, password: string): Promise<boolean> {
  try {
    const secret = decrypt(encryptedSecret, password)
    const result = verifySync({ token: code, secret: secret })
    return result.valid
  } catch (e) {
    return false
  }
}
