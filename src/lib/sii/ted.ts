import { SiiCafParser } from './caf';
import { xmlText } from './xml-text';
import { timestampChile } from './fecha-chile';
import iconv from 'iconv-lite';

type TedDteData = {
  Encabezado: {
    RUTEmisor?: string | number;
    TipoDTE?: string | number;
    Folio?: string | number;
    FchEmis?: string | number;
    RUTRecep?: string | number;
    RznSocRecep?: string;
    MntTotal?: string | number;
    Detalles?: { NmbItem?: string }[];
  };
  Detalles?: { NmbItem?: string }[];
};

export class SiiTedGenerator {
  /**
   * Plegado ASCII exclusivo para los valores que entran en <DD> (PDF417): el lector del SII
   * pierde los bytes >=128, asi que acentos/dashes se normalizan SOLO aqui (el DTE conserva tildes).
   * Mapeo: aeiou/ü/ñ en cualquier caso -> vocal sin tilde; — y – -> '-'; cualquier otro >127 -> '?'.
   */
  private static foldAsciiForDd(input: string): string {
    if (!input) return '';
    const fold: Record<string, string> = {
      'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
      'Á': 'A', 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ã': 'A', 'Å': 'A',
      'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
      'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
      'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
      'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
      'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
      'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Ö': 'O', 'Õ': 'O',
      'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
      'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
      'ñ': 'n', 'Ñ': 'N',
      'ç': 'c', 'Ç': 'C',
      '—': '-', '–': '-',
    };
    let result = '';
    for (const ch of input) {
      const code = ch.codePointAt(0) ?? 0;
      if (code < 128) {
        result += ch;
      } else {
        result += fold[ch] ?? '?';
      }
    }
    return result;
  }

  /**
   * Genera el fragmento TED (Timbre Electrónico DTE) real y firmado usando WebCrypto API.
   * Este método es asíncrono porque la firma criptográfica en el navegador lo es.
   */
  public static async generateTed(dteData: TedDteData, cafXml: string, isTest: boolean = false): Promise<string> {
    const cafData = SiiCafParser.parse(cafXml);

    if (isTest) {
      const tsted = timestampChile();
      const rsrTest = this.foldAsciiForDd('MOCK RECEPTOR');
      const it1Test = this.foldAsciiForDd('MOCK ITEM').substring(0, 40);
      const dd = `<DD><RE>${dteData.Encabezado.RUTEmisor}</RE><TD>${dteData.Encabezado.TipoDTE}</TD><F>${dteData.Encabezado.Folio}</F><FE>${dteData.Encabezado.FchEmis}</FE><RR>${dteData.Encabezado.RUTRecep || '66666666-6'}</RR><RSR>${rsrTest}</RSR><MNT>${dteData.Encabezado.MntTotal}</MNT><IT1>${it1Test}</IT1>${cafData.cafFragment}<TSTED>${tsted}</TSTED></DD>`;
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
    const tsted = timestampChile(); // Formato AAAA-MM-DDTHH:MM:SS en hora Chile
    
    // Limpiar IT1 (máximo 40 caracteres) y escaparlo para que un `&` no rompa el XML.
    let it1 = (dteData.Encabezado.Detalles?.[0]?.NmbItem || dteData.Detalles?.[0]?.NmbItem || 'Venta de Productos')
      .substring(0, 40);
    it1 = this.foldAsciiForDd(it1);
    if (it1.length > 40) {
      it1 = it1.substring(0, 40);
    }
    it1 = xmlText(it1);

    const rutEmisor = dteData.Encabezado.RUTEmisor;
    const tipoDte = dteData.Encabezado.TipoDTE;
    const folio = dteData.Encabezado.Folio;
    const fchEmis = dteData.Encabezado.FchEmis;
    const rutRecep = dteData.Encabezado.RUTRecep || '66666666-6';
    let rznSocRecep = (dteData.Encabezado.RznSocRecep || '').substring(0, 40);
    rznSocRecep = this.foldAsciiForDd(rznSocRecep);
    if (rznSocRecep.length > 40) {
      rznSocRecep = rznSocRecep.substring(0, 40);
    }
    rznSocRecep = xmlText(rznSocRecep);
    const mntTotal = dteData.Encabezado.MntTotal;

    // ORDEN REQUERIDO POR SII: RE, TD, F, FE, RR, RSR, MNT, IT1, CAF, TSTED
    const dd = `<DD><RE>${rutEmisor}</RE><TD>${tipoDte}</TD><F>${folio}</F><FE>${fchEmis}</FE><RR>${rutRecep}</RR><RSR>${rznSocRecep}</RSR><MNT>${mntTotal}</MNT><IT1>${it1}</IT1>${cafData.cafFragment}<TSTED>${tsted}</TSTED></DD>`;

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
      let cryptoProvider: Crypto | undefined = (globalThis as { crypto?: Crypto }).crypto;

      if (!cryptoProvider && typeof window === 'undefined') {
        // En Node.js (Servidor), si no está en global, usamos el módulo nativo 'crypto'
        // Usamos eval('require') para evitar que webpack intente empaquetarlo en el cliente
        try {
          const nodeCrypto = eval('require')('node:crypto');
          cryptoProvider = nodeCrypto.webcrypto as unknown as Crypto;
        } catch {
          // Si falla, intentamos con 'crypto' a secas
          try {
            const nodeCrypto = eval('require')('crypto');
            cryptoProvider = nodeCrypto.webcrypto as unknown as Crypto;
          } catch {}
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
    } catch (error) {
      console.error('Error al firmar TED:', error);
      throw new Error(`Error en firma de TED: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
