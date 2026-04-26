// @ts-ignore
import * as forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import * as fs from 'fs';

export class SiiSigner {
  private p12: forge.pkcs12.Pkcs12P12;

  constructor(pfxData: string | Buffer, password: string) {
    let pfxDer;
    if (typeof pfxData === 'string') {
      // Si es un Data URL (base64)
      const base64 = pfxData.includes('base64,') ? pfxData.split('base64,')[1] : pfxData;
      pfxDer = forge.util.decode64(base64);
    } else {
      pfxDer = pfxData.toString('binary');
    }
    
    this.p12 = forge.pkcs12.pkcs12FromP12(pfxDer, password);
  }

  /**
   * Extrae el certificado en formato PEM (para el SII)
   */
  public getCertificatePem(): string {
    const bags = this.p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag];
    if (!certBag || !certBag[0]) throw new Error('No se encontró certificado en el archivo PFX');
    
    const cert = certBag[0].cert;
    if (!cert) throw new Error('Certificado inválido');
    
    return forge.pki.certificateToPem(cert)
      .replace(/\r?\n|\r/g, '')
      .replace('-----BEGIN CERTIFICATE-----', '')
      .replace('-----END CERTIFICATE-----', '');
  }

  /**
   * Firma un XML usando el estándar XMLDSig exigido por el SII
   */
  public signXml(xml: string, tagToSign: string): string {
    const bags = this.p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag];
    if (!keyBag || !keyBag[0]) throw new Error('No se encontró llave privada en el archivo PFX');
    
    const privateKey = forge.pki.privateKeyToPem(keyBag[0].key as forge.pki.PrivateKey);
    const certPem = forge.pki.certificateToPem(this.p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]![0].cert!);

    const sig = new SignedXml();
    
    // Configuración específica requerida por el SII
    ;(sig as any).addReference(
      `//*[local-name()='${tagToSign}']`,
      ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
      "http://www.w3.org/2000/09/xmldsig#sha1"
    );
    
    // @ts-ignore
    sig.keyInfoProvider = {
      // @ts-ignore
      getKeyInfo: () => `<X509Data><X509Certificate>${this.getCertificatePem()}</X509Certificate></X509Data>`,
      getKey: () => Buffer.from(privateKey)
    };

    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
    sig.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
    
    sig.computeSignature(xml, {
        prefix: '',
        location: { reference: `//*[local-name()='${tagToSign}']`, action: 'after' }
    });

    return sig.getSignedXml();
  }
}
