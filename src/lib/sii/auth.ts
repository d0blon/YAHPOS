import { XMLParser } from 'fast-xml-parser';
import { SiiSigner } from './signer';
import { SiiAuthResponse } from './types';

const ENV_URLS = {
  certification: 'https://maullin.sii.cl/cgi_rtc/RTC',
  production: 'https://w1.sii.cl/cgi_rtc/RTC'
};

export class SiiAuth {
  private signer: SiiSigner;
  private environment: 'certification' | 'production';
  private cacheToken: SiiAuthResponse | null = null;

  constructor(pfxPath: string, password: string, environment: 'certification' | 'production' = 'certification') {
    this.signer = new SiiSigner(pfxPath, password);
    this.environment = environment;
  }

  /**
   * Obtiene una semilla nueva del SII
   */
  private async getSeed(): Promise<string> {
    const url = `${ENV_URLS[this.environment]}/crseed.cgi`;
    const response = await fetch(url);
    const xml = await response.text();
    
    const parser = new XMLParser();
    const jsonObj = parser.parse(xml);
    
    if (jsonObj.SEMILLA) {
       return jsonObj.SEMILLA.toString();
    }
    
    // Si el SII responde con estructura completa
    if (jsonObj?.RESPUESTA?.RESP_BODY?.SEMILLA) {
      return jsonObj.RESPUESTA.RESP_BODY.SEMILLA.toString();
    }

    throw new Error(`No se pudo obtener la semilla del SII. Respuesta: ${xml}`);
  }

  /**
   * Firma la semilla y obtiene el Token de Acceso
   */
  public async getToken(): Promise<string> {
    // 1. Revisar si tenemos un token en cache que todavía sea válido (menos de 15 min)
    const now = Date.now();
    if (this.cacheToken && (now - this.cacheToken.created_at < 15 * 60 * 1000)) {
      return this.cacheToken.token;
    }

    // 2. Obtener semilla
    const seed = await this.getSeed();

    // 3. Crear XML de solicitud de token
    const xmlToSign = `<getToken><item><Semilla>${seed}</Semilla></item></getToken>`;
    
    // 4. Firmar el XML
    const signedXml = this.signer.signXml(xmlToSign, 'getToken');

    // 5. Enviar al SII para obtener el Token
    const url = `${ENV_URLS[this.environment]}/gettoken.cgi`;
    const response = await fetch(url, {
      method: 'POST',
      body: signedXml,
      headers: { 'Content-Type': 'application/xml' }
    });

    const resultXml = await response.text();
    const parser = new XMLParser();
    const resultObj = parser.parse(resultXml);

    if (resultObj?.RESPUESTA?.RESP_BODY?.TOKEN) {
      const token = resultObj.RESPUESTA.RESP_BODY.TOKEN;
      this.cacheToken = {
        token,
        glosa: resultObj.RESPUESTA.RESP_HDR.GLOSA || '',
        created_at: Date.now()
      };
      return token;
    }

    throw new Error(`Error al obtener Token del SII: ${resultXml}`);
  }
}
