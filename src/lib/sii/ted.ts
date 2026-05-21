import { SiiCafParser } from './caf';
import iconv from 'iconv-lite';

export class SiiTedGenerator {
  /**
   * Genera el fragmento TED (Timbre Electrónico DTE) real y firmado usando WebCrypto API.
   * Este método es asíncrono porque la firma criptográfica en el navegador lo es.
   */
  public static async generateTed(dteData: any, cafXml: string, isTest: boolean = false): Promise<string> {
    const cafData = SiiCafParser.parse(cafXml);

    if (isTest) {
      const tstp = new Date().toISOString().replace(/\.\d{3}Z$/, '');
      const dd = `<DD><RE>${dteData.Encabezado.RUTEmisor}</RE><TD>${dteData.Encabezado.TipoDTE}</TD><F>${dteData.Encabezado.Folio}</F><FE>${dteData.Encabezado.FchEmis}</FE><RR>${dteData.Encabezado.RUTRecep || '66666666-6'}</RR><RSR>MOCK RECEPTOR</RSR><MNT>${dteData.Encabezado.MntTotal}</MNT><IT1>MOCK ITEM</IT1>${cafData.cafFragment}<TSTP>${tstp}</TSTP></DD>`;
      return `
<TED version="1.0">
${dd}
<FRMT algoritmo="SHA1withRSA">MOCK_TED_SIGNATURE</FRMT>
</TED>`.trim();
    }

    const rsaskJwk = SiiCafParser.getPrivateKeyJwk(cafXml);

    if (!rsaskJwk) {
      throw new Error('El CAF no contiene una llave privada válida para firmar el TED.');
    }

    // 1. Construir el nodo <DD> (Datos del DTE)
    // El orden y formato son estrictos para el SII
    const tstp = new Date().toISOString().replace(/\.\d{3}Z$/, ''); // Formato AAAA-MM-DDTHH:MM:SS
    
    // Limpiar IT1 (máximo 40 caracteres, sin caracteres especiales problemáticos)
    const it1 = (dteData.Encabezado.Detalles?.[0]?.NmbItem || dteData.Detalles?.[0]?.NmbItem || 'Venta de Productos')
      .substring(0, 40)
      .replace(/[<>&"']/g, '');

    const rutEmisor = dteData.Encabezado.RUTEmisor;
    const tipoDte = dteData.Encabezado.TipoDTE;
    const folio = dteData.Encabezado.Folio;
    const fchEmis = dteData.Encabezado.FchEmis;
    const rutRecep = dteData.Encabezado.RUTRecep || '66666666-6';
    const rznSocRecep = (dteData.Encabezado.RznSocRecep || '').substring(0, 40);
    const mntTotal = dteData.Encabezado.MntTotal;

    // ORDEN REQUERIDO POR SII: RE, TD, F, FE, RR, RSR, MNT, IT1, CAF, TSTP
    const dd = `<DD><RE>${rutEmisor}</RE><TD>${tipoDte}</TD><F>${folio}</F><FE>${fchEmis}</FE><RR>${rutRecep}</RR><RSR>${rznSocRecep}</RSR><MNT>${mntTotal}</MNT><IT1>${it1}</IT1>${cafData.cafFragment}<TSTP>${tstp}</TSTP></DD>`;

    // 2. Firmar DD usando WebCrypto (SHA1withRSA)
    const signature = await this.signDD(dd, rsaskJwk);

    return `
<TED version="1.0">
${dd}
<FRMT algoritmo="SHA1withRSA">${signature}</FRMT>
</TED>`.trim();
  }

  private static async signDD(dd: string, rsaskJwk: JsonWebKey): Promise<string> {
    try {
      // Obtener la interfaz de Crypto según el entorno (Browser vs Node.js)
      let cryptoProvider: Crypto = (globalThis as any).crypto;

      if (!cryptoProvider && typeof window === 'undefined') {
        // En Node.js (Servidor), si no está en global, usamos el módulo nativo 'crypto'
        // Usamos eval('require') para evitar que webpack intente empaquetarlo en el cliente
        try {
          const nodeCrypto = eval('require')('node:crypto');
          cryptoProvider = nodeCrypto.webcrypto as unknown as Crypto;
        } catch (e) {
          // Si falla, intentamos con 'crypto' a secas
          try {
            const nodeCrypto = eval('require')('crypto');
            cryptoProvider = nodeCrypto.webcrypto as unknown as Crypto;
          } catch (e2) {}
        }
      }

      if (!cryptoProvider) {
        throw new Error('No se encontró un proveedor de criptografía (WebCrypto) disponible.');
      }

      // 1. Importar la llave privada desde JWK
      const key = await cryptoProvider.subtle.importKey(
        'jwk',
        rsaskJwk,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-1' }
        },
        false,
        ['sign']
      );

      // 2. Firmar el nodo DD (usando codificación ISO-8859-1 requerida por el SII)
      const data = iconv.encode(dd, 'ISO-8859-1');
      const signature = await cryptoProvider.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        key,
        new Uint8Array(data)
      );

      // 3. Retornar Base64 compatible con ambos entornos
      const uint8 = new Uint8Array(signature);
      if (typeof btoa !== 'undefined') {
        let binary = '';
        for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        return btoa(binary);
      } else {
        // Fallback para entornos Node más antiguos o sin btoa global
        return Buffer.from(uint8).toString('base64');
      }
    } catch (error: any) {
      console.error('Error al firmar TED:', error);
      throw new Error(`Error en firma de TED: ${error.message}`);
    }
  }
}
