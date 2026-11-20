import { XMLParser } from 'fast-xml-parser';

export interface CafData {
  rut: string;
  tipoDte: number;
  desde: number;
  hasta: number;
  fecha: string;
  privateKey: unknown;
  xmlCompleto: string;
  cafFragment: string;
  razonSocial?: string;
}

/** Problema detectado al usar un CAF; `codigo` sigue los del SII cuando existen. */
export interface ProblemaCaf {
  codigo: string;
  mensaje: string;
}

/**
 * Un CAF autoriza a emitir desde `FA` (fecha de autorización) y sólo por 6 meses: un DTE
 * firmado después de ese plazo se rechaza con `CAF-3-517` aunque el folio esté en rango.
 */
const MESES_VIGENCIA_CAF = 6;

function isoValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const base = new Date(Date.UTC(anio, mes - 1 + meses, 1));
  const ultimoDia = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 0)).getUTCDate();
  base.setUTCDate(Math.min(dia, ultimoDia));
  return base.toISOString().slice(0, 10);
}

/** Última fecha (inclusive) en que se puede firmar un DTE con este CAF. */
export function limiteVigenciaCaf(fechaCaf: string): string {
  return sumarMeses(fechaCaf, MESES_VIGENCIA_CAF);
}

/**
 * Canonicaliza un RUT para comparar el `<RE>` del CAF con `sii_config.rut_emisor`.
 * Quita guion/puntos/espacios, acepta `K`mayúscula y elimina ceros a la izquierda:
 * `07612345-7` y `7612345-7` son el mismo emisor. Devuelve `''` si no es comparable.
 */
export function normalizarRutEmisor(rut: string | null | undefined): string {
  const limpio = String(rut ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
  if (limpio.length < 8) return '';
  const dv = limpio.slice(-1);
  const cuerpo = limpio.slice(0, -1);
  if (!/^\d{6,}$/.test(cuerpo) || !/^[0-9K]$/.test(dv)) return '';
  return `${Number(cuerpo)}-${dv}`;
}

/** Revisa emisor, tipo de DTE, rango de folio y vigencia de 6 meses antes de timbrar. */
export function validarCafParaEmision(
  caf: Pick<CafData, 'rut' | 'tipoDte' | 'desde' | 'hasta' | 'fecha'>,
  uso: { tipoDte: number; folio: number; fechaFirma: string; rutEmisor?: string },
): ProblemaCaf[] {
  const problemas: ProblemaCaf[] = [];

  // `rutEmisor` es opcional para herramientas offline (scripts/validacion-emision-real.ts).
  // El motor SIEMPRE lo pasa: un CAF ajeno al contribuyente configurado se rechaza.
  if (uso.rutEmisor !== undefined) {
    const rutCaf = normalizarRutEmisor(caf.rut);
    const rutConfig = normalizarRutEmisor(uso.rutEmisor);
    if (!rutCaf || !rutConfig) {
      problemas.push({
        codigo: 'LOCAL-RE',
        mensaje: 'No se puede comparar el RE del CAF con el RUT emisor configurado: falta o es inválido',
      });
    } else if (rutCaf !== rutConfig) {
      problemas.push({
        codigo: 'LOCAL-RE',
        mensaje: `El RE del CAF (${rutCaf}) no coincide con el RUT emisor configurado (${rutConfig})`,
      });
    }
  }

  if (caf.tipoDte !== uso.tipoDte) {
    problemas.push({
      codigo: 'LOCAL-TIPO',
      mensaje: `El CAF es del tipo ${caf.tipoDte} y se intenta emitir tipo ${uso.tipoDte}`,
    });
  }

  if (!Number.isInteger(uso.folio) || uso.folio < caf.desde || uso.folio > caf.hasta) {
    problemas.push({
      codigo: 'LOCAL-FOLIO',
      mensaje: `Folio ${uso.folio} fuera del rango autorizado ${caf.desde}-${caf.hasta}`,
    });
  }

  if (!isoValida(caf.fecha)) {
    problemas.push({
      codigo: 'LOCAL-FA-CAF',
      mensaje: `FA del CAF inválida (${caf.fecha}): se espera AAAA-MM-DD`,
    });
    return problemas;
  }

  const limite = limiteVigenciaCaf(caf.fecha);
  if (!isoValida(uso.fechaFirma)) {
    problemas.push({
      codigo: 'LOCAL-FIRMA',
      mensaje: `Fecha de firma inválida (${uso.fechaFirma}): se espera AAAA-MM-DD`,
    });
    return problemas;
  }

  if (uso.fechaFirma > limite) {
    problemas.push({
      codigo: 'CAF-3-517',
      mensaje: `CAF vencido: autorizado el ${caf.fecha}, la firma del ${uso.fechaFirma} excede el plazo de 6 meses (último día ${limite})`,
    });
  }

  return problemas;
}

/** Componentes RSA del formato interno del parser (RSASK con <M><E><D>...). */
interface RsaComponents {
  M?: string;
  E?: string;
  D?: string;
  P?: string;
  Q?: string;
  DP?: string;
  DQ?: string;
  InverseQ?: string;
}

/** Mínimo de `node:crypto` que se usa acá (sin import estático para no romper el bundle). */
interface NodeKeyObjectLike {
  export(options: { format: 'jwk' }): JsonWebKey;
}

interface NodeCryptoLike {
  createPrivateKey(options: { key: string; format: 'pem' }): NodeKeyObjectLike;
}

/** Texto de un nodo, tolerando que fast-xml-parser lo deje como número o bajo `#text`. */
function textoNodoCaf(valor: unknown): string {
  if (typeof valor === 'string' || typeof valor === 'number') return String(valor).trim();
  if (valor && typeof valor === 'object') {
    const nodo = valor as Record<string, unknown>;
    if (typeof nodo['#text'] === 'string') return nodo['#text'].trim();
    if (typeof nodo.text === 'string') return nodo.text.trim();
  }
  return '';
}

function campoRequeridoCaf(valor: unknown, campo: string): string {
  const texto = textoNodoCaf(valor);
  if (!texto) throw new Error(`Archivo CAF inválido: falta el campo ${campo}`);
  return texto;
}

function enteroRequeridoCaf(valor: unknown, campo: string): number {
  const texto = textoNodoCaf(valor);
  if (!/^\d+$/.test(texto)) {
    throw new Error(`Archivo CAF inválido: falta o es inválido el campo ${campo}`);
  }
  const numero = Number(texto);
  if (!Number.isSafeInteger(numero)) {
    throw new Error(`Archivo CAF inválido: el campo ${campo} excede el rango permitido`);
  }
  return numero;
}

export class SiiCafParser {
  /**
   * Toma el contenido de un archivo CAF (.xml/.dat) y extrae los datos clave.
   * Acepta prefijos de namespace (`<s:CAF>`, `<s:RE>`, ...) y valida los campos
   * obligatorios. Funciona tanto en cliente como en servidor.
   */
  public static parse(xmlContent: string): CafData {
    if (typeof xmlContent !== 'string' || !xmlContent.trim()) {
      throw new Error('Archivo CAF inválido: contenido vacío');
    }

    const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
    const jsonObj = parser.parse(xmlContent);

    // El SII a veces usa diferentes estructuras dependiendo de cómo se generó el CAF
    const autorizacion = jsonObj.AUTORIZACION || jsonObj.Autorizacion;
    if (!autorizacion) {
      throw new Error('Archivo CAF inválido: Falta sección AUTORIZACION');
    }

    const caf = autorizacion.CAF || autorizacion.Caf;
    if (!caf) {
      throw new Error('Archivo CAF inválido: Falta sección CAF');
    }

    // El fragmento se recorta del string ORIGINAL (nunca se reserializa): va dentro
    // del TED firmado, así que cualquier cambio de bytes invalidaría la firma.
    const fragmento = /<((?:[A-Za-z_][\w.-]*:)?)CAF(?:\s[^>]*)?>[\s\S]*?<\/\1CAF\s*>/i.exec(xmlContent);
    if (!fragmento) {
      throw new Error('Archivo CAF inválido: no se encontró el fragmento <CAF> original');
    }
    const cafFragment = xmlContent.slice(fragmento.index, fragmento.index + fragmento[0].length);

    const da = caf.DA || caf.Da;
    if (!da) {
      throw new Error('Archivo CAF inválido: Falta sección DA');
    }
    const rng = da.RNG || da.Rng;
    if (!rng) {
      throw new Error('Archivo CAF inválido: Falta el rango RNG');
    }

    const rut = campoRequeridoCaf(da.RE, 'RE');
    const tipoDte = enteroRequeridoCaf(da.TD, 'TD');
    const desde = enteroRequeridoCaf(rng.D, 'RNG.D');
    const hasta = enteroRequeridoCaf(rng.H, 'RNG.H');
    const fecha = campoRequeridoCaf(da.FA, 'FA');
    if (!isoValida(fecha)) {
      throw new Error(`Archivo CAF inválido: FA inválida (${fecha}): se espera AAAA-MM-DD`);
    }

    const razonSocial = textoNodoCaf(da.RS);
    const rsask = autorizacion.RSASK || autorizacion.Rsask || {};

    return {
      rut,
      tipoDte,
      desde,
      hasta,
      fecha,
      privateKey: rsask,
      xmlCompleto: xmlContent,
      cafFragment,
      ...(razonSocial ? { razonSocial } : {}),
    };
  }

  /**
   * Convierte los componentes RSA del CAF a un formato JWK (JSON Web Key)
   * para ser usado con WebCrypto API en el navegador.
   */
  public static getPrivateKeyJwk(xmlContent: string): JsonWebKey | null {
    try {
      const data = this.parse(xmlContent);
      const rsask = data.privateKey;

      // Helper para convertir base64 a base64url (requerido por JWK)
      const toBase64Url = (b64: string) =>
        b64.toString().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      // 1) Formato interno: RSASK como objeto con componentes M,E,D,...
      const components = rsask as RsaComponents | null;
      if (components && typeof components === 'object' && components.M) {
        return {
          kty: 'RSA',
          n: toBase64Url(components.M),
          e: toBase64Url(components.E ?? ''),
          d: toBase64Url(components.D ?? ''),
          p: toBase64Url(components.P ?? ''),
          q: toBase64Url(components.Q ?? ''),
          dp: toBase64Url(components.DP ?? ''),
          dq: toBase64Url(components.DQ ?? ''),
          qi: toBase64Url(components.InverseQ ?? ''),
          alg: 'RS1', // RSASSA-PKCS1-v1_5 con SHA-1
          ext: true
        };
      }

      // 2) Formato real SII: RSASK como string PEM
      let pem: string | null = null;
      if (typeof rsask === 'string') {
        pem = rsask;
      } else if (rsask && typeof rsask === 'object') {
        // fast-xml-parser puede dejar el texto en #text si el nodo trae atributos
        const record = rsask as Record<string, unknown>;
        if (typeof record['#text'] === 'string') pem = record['#text'];
        else if (typeof record.text === 'string') pem = record.text;
      }

      if (pem && pem.includes('-----BEGIN') && pem.includes('PRIVATE KEY')) {
        // Normalizar CRLF/CR y espacios sobrantes de la indentación del XML
        pem = pem
          .replace(/\r\n/g, '\n')
          .replace(/\r/g, '\n')
          .split('\n')
          .map((line) => line.trim())
          .join('\n')
          .trim();

        // crypto nativo solo en Node. Se carga con require diferido (mismo patrón que
        // ted.ts:61-73) para que webpack no intente empaquetarlo si algún día un client
        // component importa este archivo.
        let nodeCrypto: NodeCryptoLike | null = null;
        if (typeof window === 'undefined') {
          try {
            nodeCrypto = eval('require')('node:crypto') as NodeCryptoLike;
          } catch {
            try {
              nodeCrypto = eval('require')('crypto') as NodeCryptoLike;
            } catch {
              nodeCrypto = null;
            }
          }
        }
        if (!nodeCrypto) return null;

        const key = nodeCrypto.createPrivateKey({ key: pem, format: 'pem' });
        const jwk = key.export({ format: 'jwk' });
        return {
          kty: 'RSA',
          n: jwk.n,
          e: jwk.e,
          d: jwk.d,
          p: jwk.p,
          q: jwk.q,
          dp: jwk.dp,
          dq: jwk.dq,
          qi: jwk.qi,
          alg: 'RS1', // RSASSA-PKCS1-v1_5 con SHA-1
          ext: true
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing CAF for JWK:', error);
      return null;
    }
  }
}
