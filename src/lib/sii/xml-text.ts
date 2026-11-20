/**
 * Escapa texto para nodos de contenido XML.
 *
 * No se borran caracteres: un `&` en la razón social no debe mutilar el nombre legal
 * (`Inversiones A&B` se emite como `Inversiones A&amp;B`, no como `Inversiones AB`).
 * El truncado se aplica antes del escapado, para que el límite cuente caracteres
 * reales y no los de la entidad.
 */
export function xmlText(value: unknown, maxLength?: number): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (maxLength !== undefined && text.length > maxLength) {
    text = text.substring(0, maxLength);
  }
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
