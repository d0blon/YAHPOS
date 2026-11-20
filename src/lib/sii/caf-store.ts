import { decrypt, encrypt } from '../crypto';

/**
 * Server-only helpers for the CAF stored in `sii_folios.caf_xml`.
 *
 * The XML must be returned byte-for-byte: `SiiCafParser` extracts the `<CAF>`
 * fragment with a regex and that fragment is embedded in the TED signature.
 * Never re-serialize the XML here.
 */
export function encodeCaf(xml: string): string {
  return encrypt(xml);
}

/**
 * Accepts legacy plaintext XML, legacy AES-CBC (`iv:ciphertext`) and current
 * AES-256-GCM (`02:iv:tag:ciphertext`). Unknown formats fail closed: signing
 * with an unreadable CAF would produce an invalid DTE.
 */
export function decodeCaf(raw: string | null | undefined): string {
  if (!raw) return '';
  if (raw.trim().startsWith('<')) return raw;
  if (/^(02:)?[0-9a-f]+:/i.test(raw.trim())) return decrypt(raw.trim());
  throw new Error('Formato de CAF no reconocido: no se puede descifrar el archivo almacenado');
}
