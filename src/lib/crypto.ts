import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // Para AES, siempre es 16

/**
 * Returns the validated encryption key.
 * Throws only at runtime (inside a function call), NOT at module load time,
 * so that the build doesn't fail when SII_ENCRYPTION_KEY is not set.
 */
function getKey(): Buffer {
  const key = process.env.SII_ENCRYPTION_KEY || '';
  if (process.env.NODE_ENV === 'production' && key.length !== 32) {
    throw new Error(
      `CRITICAL SECURITY ERROR: SII_ENCRYPTION_KEY must be exactly 32 characters in production. Current length: ${key.length}`
    );
  }
  // In development/test, pad/truncate to 32 bytes so local dev still works
  const normalized = key.padEnd(32, '0').substring(0, 32);
  return Buffer.from(normalized);
}

export function encrypt(text: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const key = getKey();
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
