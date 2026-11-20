import { SiiConfig } from './types';
import { SiiSigner } from './signer';
import { bytesLatin1 } from './encoding';
import { parsearRespuestaRecepcion } from './recepcion';
import { dividirRut } from './rut';

const TIPOS_BOLETA = new Set([39, 41]);

function tipoDte(dte: string): number {
  return Number(dte.match(/<TipoDTE>(\d+)<\/TipoDTE>/)?.[1] ?? 0);
}

/**
 * El DTE llega ya firmado desde engine.ts, pero su firma se calculó cuando el
 * <Documento> era raíz. La C14N inclusiva hereda los namespaces de los ancestros,
 * así que al meterlo en el sobre esa firma deja de verificar: se descarta y se
 * vuelve a firmar dentro del envío definitivo.
 */
function limpiarDte(dte: string): string {
  return dte
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<Signature\b[\s\S]*?<\/Signature>/g, '')
    .trim();
}

/** xs:dateTime en hora de Chile (sin zona), como exige la carátula. */
function tmstFirmaEnv(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'America/Santiago' }).replace(' ', 'T');
}

/**
 * La carátula debe llevar la resolución que autorizó al emisor. Un valor inventado
 * (`2014-08-22`) hace que el SII rechace el envío completo, así que se falla antes de
 * armar el sobre en vez de emitir algo que el SII va a devolver.
 */
function fechaResolucion(config: SiiConfig): string {
  const fch = (config.fchResol ?? '').trim();
  if (!fch) {
    throw new Error(
      'Falta FchResol: carga la fecha de resolución del emisor (sii_config.fch_resol) antes de emitir',
    );
  }
  const fecha = new Date(`${fch}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fch) || Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== fch) {
    throw new Error(`FchResol inválida (${fch}): se espera una fecha AAAA-MM-DD`);
  }
  return fch;
}

/**
 * `NroResol` 0 aparece en los ejemplos oficiales del SII y en las boletas, así que sólo se
 * bloquea cuando la config no trae el campo o trae un número imposible. La fecha sí es
 * obligatoria: un default inventado hace que el SII rechace el envío completo.
 */
function numeroResolucion(config: SiiConfig): number {
  const nro = config.nroResol;
  if (nro === undefined || nro === null) {
    throw new Error(
      'Falta NroResol: carga el número de resolución del emisor (sii_config.nro_resol) antes de emitir',
    );
  }
  if (!Number.isInteger(nro) || nro < 0) {
    throw new Error(`NroResol inválida (${nro}): se espera un entero >= 0`);
  }
  return nro;
}

export function generateEnvioXml(
  dtes: string[],
  config: SiiConfig,
  rutEnvia: string,
  rutReceptor = '66666666-6',
): string {
  const limpios = dtes.map(limpiarDte);
  const tipos = limpios.map(tipoDte);
  const esBoleta = tipos.every((tipo) => TIPOS_BOLETA.has(tipo));
  const raiz = esBoleta ? 'EnvioBOLETA' : 'EnvioDTE';
  const esquema = esBoleta ? 'EnvioBOLETA_v11.xsd' : 'EnvioDTE_v10.xsd';
  const idSet = `SET_${Math.floor(Date.now() / 1000)}`;
  const fchResol = fechaResolucion(config);
  const nroResol = numeroResolucion(config);

  const conteo = new Map<number, number>();
  for (const tipo of tipos) conteo.set(tipo, (conteo.get(tipo) ?? 0) + 1);
  const subtotales = [...conteo.entries()]
    .map(([tipo, n]) => `<SubTotDTE><TpoDTE>${tipo}</TpoDTE><NroDTE>${n}</NroDTE></SubTotDTE>`)
    .join('\n            ');

  const envio = `<?xml version="1.0" encoding="ISO-8859-1"?>
<${raiz} xmlns="http://www.sii.cl/SiiDte" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sii.cl/SiiDte ${esquema}" version="1.0">
    <SetDTE ID="${idSet}">
        <Caratula version="1.0">
            <RutEmisor>${config.rutEmisor}</RutEmisor>
            <RutEnvia>${rutEnvia}</RutEnvia>
            <RutReceptor>${rutReceptor}</RutReceptor>
            <FchResol>${fchResol}</FchResol>
            <NroResol>${nroResol}</NroResol>
            <TmstFirmaEnv>${tmstFirmaEnv()}</TmstFirmaEnv>
            ${subtotales}
        </Caratula>
        ${limpios.join('\n        ')}
    </SetDTE>
</${raiz}>`;

  if (!config.pfxPath || !config.pfxPassword) return envio;

  // Cada Documento se firma ya envuelto: la C14N inclusiva hereda los namespaces de
  // los ancestros, asi que una firma calculada antes de envolver deja de verificar.
  // La firma del SetDTE queda para el llamador (engine.ts la agrega despues).
  const signer = new SiiSigner(config.pfxPath, config.pfxPassword);
  let firmado = envio;
  for (let i = 1; i <= limpios.length; i++) {
    firmado = signer.signXml(firmado, 'Documento', i);
  }
  return firmado;
}

/**
 * Envía el XML firmado al SII
 */
export async function enviarAlSII(xml: string, fileName: string, token: string, environment: 'certification' | 'production' = 'certification') {
  const url = environment === 'certification' 
    ? 'https://maullin.sii.cl/cgi_dte/UPL/DTEUpload' 
    : 'https://palena.sii.cl/cgi_dte/UPL/DTEUpload';

  // El SII requiere campos de multipart con nombres específicos del vendor:
  // rutSender/dvSender (quien envía) y rutCompany/dvCompany (dueño del DTE).
  // El RUT se extrae de la carátula `<RutEmisor>76123456-7</RutEmisor>`.
  const rutEmisorMatch = xml.match(/<RutEmisor>(.*)<\/RutEmisor>/)?.[1] ?? '';
  const { numero: rutNumero, dv: rutDv } = dividirRut(rutEmisorMatch);

  // El envío se reintenta hasta 5 veces con backoff 1.5x (máx 10s) para sobrevivir
  // cortes breves de red y 5xx transitorios del SII. Los 4xx no se reintentan: el
  // SII rechazó el payload y reenviar lo mismo sólo devuelve el mismo rechazo.
  const maxIntentos = 5;
  const backoffBase = 1000;
  const backoffFactor = 1.5;
  const backoffMax = 10000;

  // Convertir XML a ISO-8859-1 antes de enviar. `bytesLatin1` falla explícito si algún
  // carácter no existe en el charset (iconv lo cambiaría por '?' sin avisar y el SII
  // recibiría bytes distintos de los firmados).
  const xmlBuffer = bytesLatin1(xml, 'envío al SII');

  let lastError: unknown;
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const body = new FormData();
      body.append('rutSender', rutNumero);
      body.append('dvSender', rutDv);
      body.append('rutCompany', rutNumero);
      body.append('dvCompany', rutDv);
      body.append('archivo', new Blob([new Uint8Array(xmlBuffer)], { type: 'application/xml' }), fileName);

      const response = await fetch(url, {
        method: 'POST',
        body,
        headers: {
          'Cookie': `TOKEN=${token}`,
          'User-Agent': 'Mozilla/4.0 (compatible; PROG 1.0; Windows NT)'
        }
      });

      if (response.status >= 500 && intento < maxIntentos) {
        const delay = Math.min(backoffBase * Math.pow(backoffFactor, intento - 1), backoffMax);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      const responseText = await response.text();
      const respuesta = parsearRespuestaRecepcion(responseText);

      if (respuesta.success) {
        return respuesta;
      }

      return {
        ...respuesta,
        error: respuesta.error ?? (responseText || 'Respuesta vacía del SII'),
        status: respuesta.status,
      };
    } catch (error) {
      lastError = error;
      if (intento < maxIntentos) {
        const delay = Math.min(backoffBase * Math.pow(backoffFactor, intento - 1), backoffMax);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Todos los intentos agotados en errores de red.
  throw lastError instanceof Error
    ? lastError
    : new Error(`Envío al SII falló tras ${maxIntentos} intentos: ${String(lastError)}`);
}
