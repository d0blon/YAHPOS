import { XMLParser } from 'fast-xml-parser';

export interface CafData {
  rut: string;
  tipoDte: number;
  desde: number;
  hasta: number;
  fecha: string;
  privateKey: any;
  xmlCompleto: string;
  cafFragment: string;
}

export class SiiCafParser {
  /**
   * Toma el contenido de un archivo CAF (.xml) y extrae los datos clave.
   * Funciona tanto en cliente como en servidor.
   */
  public static parse(xmlContent: string): CafData {
    const parser = new XMLParser({ ignoreAttributes: false });
    const jsonObj = parser.parse(xmlContent);

    // El SII a veces usa diferentes estructuras dependiendo de cómo se generó el CAF
    const autorizacion = jsonObj.AUTORIZACION || jsonObj.Autorizacion;
    if (!autorizacion) {
      throw new Error('Archivo CAF inválido: Falta sección AUTORIZACION');
    }

    const caf = autorizacion.CAF || autorizacion.Caf;
    const rsask = autorizacion.RSASK || autorizacion.Rsask || {};

    if (!caf) {
      throw new Error('Archivo CAF inválido: Falta sección CAF');
    }

    // Extraer el fragmento <CAF>...</CAF> original para el TED (preserva el formato exacto para la firma)
    const cafMatch = xmlContent.match(/<CAF[\s\S]*?<\/CAF>/i);
    const cafFragment = cafMatch ? cafMatch[0] : '';

    const da = caf.DA || caf.Da;

    return {
      rut: da.RE,
      tipoDte: parseInt(da.TD),
      desde: parseInt(da.RNG.D),
      hasta: parseInt(da.RNG.H),
      fecha: da.FA,
      privateKey: rsask,
      xmlCompleto: xmlContent,
      cafFragment: cafFragment
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

      if (!rsask || !rsask.M) return null;

      // Helper para convertir base64 a base64url (requerido por JWK)
      const toBase64Url = (b64: string) => 
        b64.toString().replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

      return {
        kty: 'RSA',
        n: toBase64Url(rsask.M),
        e: toBase64Url(rsask.E),
        d: toBase64Url(rsask.D),
        p: toBase64Url(rsask.P),
        q: toBase64Url(rsask.Q),
        dp: toBase64Url(rsask.DP),
        dq: toBase64Url(rsask.DQ),
        qi: toBase64Url(rsask.InverseQ),
        alg: 'RS1', // RSASSA-PKCS1-v1_5 con SHA-1
        ext: true
      };
    } catch (error) {
      console.error('Error parsing CAF for JWK:', error);
      return null;
    }
  }
}
