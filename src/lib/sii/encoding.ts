import iconv from 'iconv-lite';

/**
 * Los documentos del SII se emiten declarando `encoding="ISO-8859-1"`.
 *
 * El XML vive como string en JavaScript (UTF-16), así que el byte que se sube al SII
 * o se archiva tiene que convertirse a ISO-8859-1 de forma controlada. `iconv` no
 * falla cuando un carácter no existe en el charset: lo reemplaza por `?` en silencio.
 * Un emoji en el nombre de un ítem convertiría el XML en otro documento distinto del
 * firmado y el SII respondería "firma inválida" sin decir por qué.
 *
 * Esta función convierte y verifica: si el round-trip no devuelve exactamente el
 * mismo texto, el documento no se firma ni se envía.
 */
export const LATIN1 = 'ISO-8859-1';

export function bytesLatin1(xml: string, contexto: string): Buffer {
  const bytes = iconv.encode(xml, LATIN1);
  const devuelto = iconv.decode(bytes, LATIN1);

  if (devuelto !== xml) {
    const posicion = [...xml].findIndex((caracter, i) => [...devuelto][i] !== caracter);
    const caracter = [...xml][posicion] ?? '';
    throw new Error(
      `${contexto}: el XML contiene "${caracter}" (U+${(caracter.codePointAt(0) ?? 0)
        .toString(16)
        .toUpperCase()
        .padStart(4, '0')}), que no existe en ISO-8859-1. ` +
        'El SII lee el archivo con el charset declarado y los bytes no coincidirían con lo firmado.',
    );
  }

  return bytes;
}

/**
 * Deja el XML representable en ISO-8859-1 sin perder texto: los caracteres que no
 * existen en el charset (emoji, `€`, cirílico) se convierten en referencia numérica.
 *
 * Se aplica DESPUÉS de firmar a propósito. xml-crypto re-serializa el documento al
 * insertar la `<Signature>` y devuelve las referencias numéricas como caracteres
 * literales; el digest no cambia porque la C14N expande la referencia al mismo
 * carácter antes de calcularlo.
 */
export function normalizarLatin1(xml: string, contexto: string): string {
  const escapado = xml.replace(/[^\u0000-\u00FF]/gu, (caracter) => `&#${caracter.codePointAt(0)};`);
  // Defensa: si algo quedó fuera del charset, el envío fallaría más lejos y con menos pistas.
  bytesLatin1(escapado, contexto);
  return escapado;
}
