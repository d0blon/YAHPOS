import { SignedXml } from 'xml-crypto';
import crypto from 'crypto';

/**
 * SiiSigner maneja la firma XMLDSig para DTEs y Envíos.
 * Optimizada para entornos Next.js.
 * Utiliza node-forge para el parseo de PFX (solo en servidor) 
 * y xml-crypto para la firma XMLDSig.
 */
export class SiiSigner {
  private privateKey: any;
  private certificate: string;

  constructor(pfxData: string | Buffer, password: string) {
    if (typeof window !== 'undefined') {
      throw new Error('SiiSigner solo puede ser utilizado en el servidor.');
    }

    try {
      // 1. Obtener el Buffer del PFX
      let pfxBuffer: Buffer;
      if (typeof pfxData === 'string') {
        const base64 = pfxData.includes('base64,') ? pfxData.split('base64,')[1] : pfxData;
        pfxBuffer = Buffer.from(base64, 'base64');
      } else {
        pfxBuffer = pfxData;
      }

      // 2. Extraer llave y certificado usando node-forge (Seguro en servidor)
      const forge = require('node-forge');
      const p12Der = pfxBuffer.toString('binary');
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extraer llave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const bag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      if (!bag) throw new Error('No se encontró llave privada en el PFX');
      
      // Convertir a PEM para xml-crypto
      this.privateKey = forge.pki.privateKeyToPem(bag.key);

      // Extraer certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag][0];
      if (!certBag) throw new Error('No se encontró certificado en el PFX');
      
      // Limpiar el certificado para el formato que requiere el SII (<X509Certificate>)
      this.certificate = forge.util.encode64(forge.pki.certificateToAsn1(certBag.cert).toDer())
        .replace(/\r?\n|\r/g, '');

    } catch (e: any) {
      console.error('[SiiSigner] Error al inicializar:', e.message);
      throw new Error(`Error al procesar certificado PFX: ${e.message}`);
    }
  }

  public getCertificatePem(): string {
    return this.certificate;
  }

  /**
   * Firma un XML usando el estándar XMLDSig (SHA1withRSA) exigido por el SII.
   */
  public signXml(xml: string, tagToSign: string): string {
    const sig = new SignedXml();
    
    // Configuración XMLDSig requerida por el SII
    ;(sig as any).addReference(
      `//*[local-name()='${tagToSign}']`,
      [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature", 
        "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"
      ],
      "http://www.w3.org/2000/09/xmldsig#sha1"
    );
    
    // @ts-ignore
    sig.keyInfoProvider = {
      // @ts-ignore
      getKeyInfo: () => `<X509Data><X509Certificate>${this.certificate}</X509Certificate></X509Data>`,
      getKey: () => this.privateKey
    };

    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    
    // Patch crypto.createHash para forzar codificación latin1 (ISO-8859-1) en el hash SHA1
    // Esto es crítico para que la firma sea válida ante el SII cuando hay caracteres especiales.
    const originalCreateHash = crypto.createHash;
    (crypto as any).createHash = (alg: string, options: any) => {
      const hash = originalCreateHash(alg, options);
      if (alg === 'sha1') {
        const originalUpdate = hash.update;
        (hash as any).update = (data: any, encoding: any) => {
          // Si recibimos un string, forzamos latin1. Si es Buffer, se usa tal cual.
          return originalUpdate.call(hash, data, typeof data === 'string' ? 'latin1' : encoding);
        };
      }
      return hash;
    };

    try {
      sig.computeSignature(xml, {
          prefix: '',
          location: { reference: `//*[local-name()='${tagToSign}']`, action: 'after' }
      });
    } finally {
      (crypto as any).createHash = originalCreateHash;
    }

    return sig.getSignedXml();
  }
}
