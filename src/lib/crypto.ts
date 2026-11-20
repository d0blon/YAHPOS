import crypto from 'crypto';

const CBC_ALGORITHM = 'aes-256-cbc';
const GCM_ALGORITHM = 'aes-256-gcm';
const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;
// Prefijo hexadecimal para que el detector legacy `^[0-9a-f]+:` siga reconociendo
// los valores cifrados sin tocar el motor DTE.
const GCM_PREFIX = '02:';

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
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv, { authTagLength: GCM_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${GCM_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(text: string): string {
  const key = getKey();

  if (text.startsWith(GCM_PREFIX)) {
    const parts = text.slice(GCM_PREFIX.length).split(':');
    if (parts.length !== 3) throw new Error('Cifrado GCM inválido');
    const [ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encryptedText = Buffer.from(dataHex, 'hex');
    if (iv.length !== GCM_IV_LENGTH || tag.length !== GCM_TAG_LENGTH) {
      throw new Error('Cifrado GCM inválido');
    }

    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv, { authTagLength: GCM_TAG_LENGTH });
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  }

  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(CBC_ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString();
}
