/**
 * Plomería común de los servicios SOAP del SII (`*.jws`).
 *
 * Todos comparten la misma forma: un `Envelope` con la operación en `DefaultNamespace`,
 * y la respuesta trae el XML del SII **escapado** dentro de un nodo `…Return`. Además el
 * SII contesta HTTP 200 incluso cuando rechaza la operación, así que hay que leer el
 * `<ESTADO>` del cuerpo, no el status HTTP.
 *
 * Y exige este User-Agent: sin él responde 401 o devuelve el portal HTML.
 */

export const SII_USER_AGENT = 'Mozilla/4.0 (compatible; PROG 1.0; Windows NT)';

/** `maullin` es certificación y `palena` producción (mismo reparto que en DTEUpload). */
export const SII_HOSTS = {
  certification: 'https://maullin.sii.cl',
  production: 'https://palena.sii.cl',
} as const;

export type SiiAmbiente = keyof typeof SII_HOSTS;

export const SII_TIMEOUT_MS = 30_000;

export function desescapar(texto: string): string {
  return texto
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

export function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Busca una etiqueta en crudo y, si no está, en el texto desescapado. Las respuestas del
 * SII pueden venir escapadas (`&lt;SEMILLA&gt;`) o no, según el servicio.
 */
export function extraerEtiqueta(xml: string, etiqueta: string): string | undefined {
  const patron = new RegExp(`<${etiqueta}>([\\s\\S]*?)</${etiqueta}>`, 'i');
  const limpiarEntidades = (valor: string) =>
    valor
      .replace(/&#xd;|&#13;|&#10;|&#9;/g, '')
      .trim();
  const crudo = xml.match(patron)?.[1];
  if (crudo !== undefined) return limpiarEntidades(crudo);
  const limpio = desescapar(xml).match(patron)?.[1];
  return limpio === undefined ? undefined : limpiarEntidades(limpio);
}

export function estadoYGlosa(xml: string): { estado?: string; glosa?: string } {
  return {
    estado: extraerEtiqueta(xml, 'ESTADO'),
    glosa: extraerEtiqueta(xml, 'GLOSA'),
  };
}

/**
 * Extrae un bloque completo tolerando prefijos de namespace (`<SII:RESP_BODY>`), que es
 * como el SII nombra los nodos de su propio XML.
 */
export function extraerBloque(xml: string, etiqueta: string): string | undefined {
  const patron = new RegExp(`<(?:[\\w.-]+:)?${etiqueta}>([\\s\\S]*?)</(?:[\\w.-]+:)?${etiqueta}>`, 'i');
  const crudo = xml.match(patron)?.[1];
  if (crudo !== undefined) return crudo;
  return desescapar(xml).match(patron)?.[1];
}

/** Sobre SOAP con la operación en el namespace `DefaultNamespace` que usa el SII. */
export function sobreSoap(operacion: string, contenido = ''): string {
  return (
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" ' +
    'xmlns:def="http://DefaultNamespace"><soapenv:Header/><soapenv:Body>' +
    `<def:${operacion}>${contenido}</def:${operacion}>` +
    '</soapenv:Body></soapenv:Envelope>'
  );
}

/**
 * POST a `https://<host>/DTEWS/<servicio>`. Devuelve el cuerpo crudo: la interpretación
 * del `<ESTADO>` queda en cada módulo, porque el código de éxito no es el mismo en todos
 * los servicios (`00` para semilla/token, `000` para las consultas).
 */
export async function postSoap(host: string, servicio: string, sobre: string): Promise<string> {
  const response = await fetch(`${host}/DTEWS/${servicio}`, {
    method: 'POST',
    body: sobre,
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': '""',
      'User-Agent': SII_USER_AGENT,
    },
    signal: AbortSignal.timeout(SII_TIMEOUT_MS),
  });

  const xml = await response.text();
  if (!response.ok && !estadoYGlosa(xml).estado) {
    throw new Error(
      `SII ${servicio} respondió HTTP ${response.status}: ${xml.replace(/\s+/g, ' ').slice(0, 200)}`,
    );
  }
  return xml;
}
