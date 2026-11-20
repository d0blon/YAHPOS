import { SiiSigner } from './signer';
import { SiiAuthResponse } from './types';
import { escapar, estadoYGlosa, extraerEtiqueta, postSoap, SII_HOSTS, sobreSoap } from './soap';

/**
 * Autenticación contra el SII: semilla + token.
 *
 * Los endpoints CGI históricos (`cgi_rtc/RTC/crseed.cgi`, `gettoken.cgi`) ya no existen:
 * verificado 2026-11-13 — `maullin.sii.cl/cgi_rtc/RTC/crseed.cgi` responde 404 y
 * `palena.sii.cl/cgi_rtc/RTC/crseed.cgi` responde "Transaccion Rechazada". El canal vigente
 * son los servicios SOAP `DTEWS/CrSeed.jws` y `DTEWS/GetTokenFromSeed.jws`.
 *
 * Además `w1.sii.cl` (host de producción que usaba este archivo) no resuelve por DNS.
 * Producción es `palena.sii.cl`; certificación es `maullin.sii.cl`.
 *
 * El SII responde 200 con un XML de error cuando la petición no le gusta, así que el
 * `<ESTADO>` manda: sin `ESTADO=00` no hay semilla ni token, aunque el HTTP sea 200.
 */

/** `<ESTADO>` de éxito en semilla y token. */
const ESTADO_OK = '00';

/** Prefijo reservado al token simulado; el SII nunca devuelve un token con él. */
const PREFIJO_TOKEN_MOCK = 'MOCK_TOKEN';

/** True cuando el token no vino del SII. El motor lo usa para fallar cerrado. */
export function esTokenMock(token: string | null | undefined): boolean {
  return typeof token === 'string' && token.trim().startsWith(PREFIJO_TOKEN_MOCK);
}

function detalleError(xml: string): string {
  const { estado, glosa } = estadoYGlosa(xml);
  if (estado) return `ESTADO ${estado}${glosa ? `: ${glosa}` : ''}`;
  return `respuesta no reconocida: ${xml.replace(/\s+/g, ' ').slice(0, 200)}`;
}

export function parsearSemilla(respuestaSoap: string): string {
  const { estado } = estadoYGlosa(respuestaSoap);
  if (estado !== ESTADO_OK) {
    throw new Error(`SII no entregó semilla (${detalleError(respuestaSoap)})`);
  }
  const semilla = extraerEtiqueta(respuestaSoap, 'SEMILLA');
  if (!semilla || !/^\d+$/.test(semilla)) {
    throw new Error(`SII no entregó una semilla válida: ${semilla || '(vacía)'}`);
  }
  return semilla;
}

export function parsearToken(respuestaSoap: string): string {
  const { estado } = estadoYGlosa(respuestaSoap);
  if (estado !== ESTADO_OK) {
    throw new Error(`SII no entregó token (${detalleError(respuestaSoap)})`);
  }
  const token = extraerEtiqueta(respuestaSoap, 'TOKEN');
  if (!token) {
    throw new Error('SII respondió ESTADO 00 sin TOKEN');
  }
  return token;
}

/** Sobre SOAP de `CrSeed.getSeed` (sin parámetros). */
export function sobreSemilla(): string {
  return sobreSoap('getSeed');
}

/** Sobre SOAP de `GetTokenFromSeed.getToken`: el XML firmado viaja escapado en `pszXml`. */
export function sobreToken(xmlFirmado: string): string {
  return sobreSoap('getToken', `<pszXml>${escapar(xmlFirmado)}</pszXml>`);
}

export class SiiAuth {
  private signer: SiiSigner | null = null;
  private environment: 'certification' | 'production';
  private cacheToken: SiiAuthResponse | null = null;

  private isMock: boolean = false;

  constructor(pfxPath: string, password: string, environment: 'certification' | 'production' = 'certification') {
    try {
      this.signer = new SiiSigner(pfxPath, password);
    } catch {
      // Si falla la inicialización del signer (ej: certificado mock), marcamos como mock
      console.warn('⚠️ SiiAuth: No se pudo inicializar el signer real. Entrando en modo MOCK.');
      this.isMock = true;
      this.signer = null;
    }
    this.environment = environment;
  }

  public setMock(value: boolean) {
    this.isMock = value;
  }

  /** `true` cuando no hay certificado usable y `getToken()` devolvería un token falso. */
  public enModoMock(): boolean {
    return this.isMock;
  }

  /**
   * Obtiene una semilla nueva del SII
   */
  private async getSeed(): Promise<string> {
    const xml = await postSoap(SII_HOSTS[this.environment], 'CrSeed.jws', sobreSemilla());
    return parsearSemilla(xml);
  }

  /**
   * Firma la semilla y obtiene el Token de Acceso
   */
  public async getToken(): Promise<string> {
    // 0. Si estamos en modo mock, retornar un token de prueba
    if (this.isMock) {
      console.log('🧪 SiiAuth: Generando Token MOCK.');
      return PREFIJO_TOKEN_MOCK + '_' + Date.now();
    }

    // 1. Revisar si tenemos un token en cache que todavía sea válido (menos de 15 min)
    const now = Date.now();
    if (this.cacheToken && (now - this.cacheToken.created_at < 15 * 60 * 1000)) {
      return this.cacheToken.token;
    }

    // 2. Obtener semilla
    const seed = await this.getSeed();

    // 3. Crear XML de solicitud de token y firmarlo
    if (!this.signer) {
      throw new Error('SiiAuth sin certificado: no se puede firmar la semilla del SII');
    }
    const xmlToSign = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`;
    const signedXml = this.signer.signXml(xmlToSign, 'getToken');

    // 4. Enviar al SII para obtener el Token
    const resultXml = await postSoap(SII_HOSTS[this.environment], 'GetTokenFromSeed.jws', sobreToken(signedXml));

    const token = parsearToken(resultXml);
    this.cacheToken = {
      token,
      glosa: extraerEtiqueta(resultXml, 'GLOSA') ?? '',
      created_at: Date.now(),
    };
    return token;
  }
}
