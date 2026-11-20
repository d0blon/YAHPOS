import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';
import { normalizarLatin1 } from './encoding';

const RSA_SHA1 = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
const SHA1 = 'http://www.w3.org/2000/09/xmldsig#sha1';
const C14N = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
const ENVELOPED = 'http://www.w3.org/2000/09/xmldsig#enveloped-signature';

/** Entero RSA (hex) -> base64 CryptoBinary sin signo, como lo exige xmldsignature_v10.xsd. */
function rsaComponentToBase64(hex: string): string {
  let clean = hex.toLowerCase();
  if (clean.length % 2 !== 0) clean = `0${clean}`;
  while (clean.length > 2 && clean.startsWith('00')) clean = clean.slice(2);
  return Buffer.from(clean, 'hex').toString('base64');
}

/**
 * SiiSigner maneja la firma XMLDSig para DTEs y Envíos.
 * Optimizada para entornos Next.js.
 * Utiliza node-forge para el parseo de PFX (solo en servidor)
 * y xml-crypto para la firma XMLDSig.
 */
export class SiiSigner {
  private privateKey: string;
  private certificate: string;
  private certificatePem: string;
  private modulusB64: string;
  private exponentB64: string;
  private certSubject: forge.pki.CertificateField[];
  private certValidity: { notBefore: Date; notAfter: Date };

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
      const p12Der = pfxBuffer.toString('binary');
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extraer llave privada
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const bag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
      if (!bag?.key) throw new Error('No se encontró llave privada en el PFX');

      // Convertir a PEM para xml-crypto
      const rsaKey = bag.key as forge.pki.rsa.PrivateKey;
      this.privateKey = forge.pki.privateKeyToPem(rsaKey);

      // Componentes RSA en base64 (CryptoBinary sin signo) para <KeyValue>.
      this.modulusB64 = rsaComponentToBase64(rsaKey.n.toString(16));
      this.exponentB64 = rsaComponentToBase64(rsaKey.e.toString(16));

      // Extraer certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag]?.[0];
      if (!certBag?.cert) throw new Error('No se encontró certificado en el PFX');

      // Validar vigencia del certificado (fail-closed: no firmar con certs vencidos o no válidos aún)
      const now = new Date();
      const notBefore = certBag.cert.validity.notBefore;
      const notAfter = certBag.cert.validity.notAfter;
      if (now < notBefore || now > notAfter) {
        throw new Error(
          `Certificado vencido o no válido: válido desde ${notBefore.toISOString()} hasta ${notAfter.toISOString()}, hoy es ${now.toISOString()}`
        );
      }

      // Guardar info del certificado para getCertificateInfo()
      this.certSubject = certBag.cert.subject.attributes;
      this.certValidity = { notBefore, notAfter };

      // Certificado en PEM para <KeyInfo> y en base64 DER para el resto del código
      this.certificatePem = forge.pki.certificateToPem(certBag.cert);
      const derBytes = forge.asn1.toDer(forge.pki.certificateToAsn1(certBag.cert)).getBytes();
      this.certificate = forge.util.encode64(derBytes).replace(/\r?\n|\r/g, '');

    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error('[SiiSigner] Error al inicializar:', message);
      throw new Error(`Error al procesar certificado PFX: ${message}`);
    }
  }

  public getCertificatePem(): string {
    return this.certificate;
  }

  /**
   * Firma un XML usando el estándar XMLDSig (SHA1withRSA) exigido por el SII.
   */
  public signXml(xml: string, tagToSign: string, occurrence = 1): string {
    // XPath indexado siempre: si se usa el comodin sin indice y hay varios <Documento>
    // en un sobre, xml-crypto crea una <Reference> por cada coincidencia.
    const xpath = `(//*[local-name()='${tagToSign}'])[${occurrence}]`;

    const sig = new SignedXml({
      privateKey: this.privateKey,
      publicCert: this.certificatePem,
      signatureAlgorithm: RSA_SHA1,
      canonicalizationAlgorithm: C14N,
      // xmldsignature_v10.xsd exige KeyInfo con KeyValue y luego X509Data; xml-crypto
      // solo emite X509Data por defecto.
      getKeyInfoContent: () =>
        `<KeyValue><RSAKeyValue><Modulus>${this.modulusB64}</Modulus><Exponent>${this.exponentB64}</Exponent></RSAKeyValue></KeyValue>` +
        `<X509Data><X509Certificate>${this.certificate}</X509Certificate></X509Data>`,
    });

    sig.addReference({
      xpath,
      // xmldsignature_v10.xsd declara <Transform> con maxOccurs=1 (no es el XMLDSig
      // completo): el SII solo admite la transformada enveloped.
      transforms: [ENVELOPED],
      digestAlgorithm: SHA1,
    });

    // XMLDSig exige canonicalizar el node-set implicito antes del digest, pero
    // xml-crypto solo lo hace si C14N aparece en la lista de transforms. Se aplica
    // a mano para no declarar una segunda <Transform> que el XSD del SII prohibe.
    const getCanonXml = sig.getCanonXml.bind(sig);
    sig.getCanonXml = (_transforms, node, options) =>
      getCanonXml([ENVELOPED, C14N], node, options);

    // La firma se inserta como hermano posterior del nodo referenciado
    // (<Documento>...</Documento><Signature>...</Signature>).
    sig.computeSignature(xml, {
      location: { reference: xpath, action: 'after' },
    });

    // El documento declara ISO-8859-1: cualquier carácter fuera de ese charset se emite
    // como referencia numérica para que los bytes enviados al SII representen el mismo
    // texto que se firmó (ver encoding.ts).
    return normalizarLatin1(sig.getSignedXml(), `firma de <${tagToSign}>`);
  }

  /**
   * Extrae información del certificado digital (RUT, razón social, vigencia).
   * Usado por el wizard de onboarding para mostrar feedback al usuario.
   */
  public getCertificateInfo(): {
    rut: string;
    razonSocial: string;
    notBefore: string;
    notAfter: string;
  } {
    // En certificados digitales chilenos, el RUT suele estar en:
    // - CN (Common Name): formato "NOMBRE-RUT" o solo "RUT"
    // - O (Organization): razón social
    // - OU (Organizational Unit): a veces contiene el RUT
    const cn = String(this.certSubject.find(a => a.shortName === 'CN')?.value || '');
    const org = String(this.certSubject.find(a => a.shortName === 'O')?.value || '');
    const ou = String(this.certSubject.find(a => a.shortName === 'OU')?.value || '');

    // Intentar extraer RUT del CN (formato común: "NOMBRE-12345678-9" o "12345678-9")
    let rut = '';
    const rutMatch = cn.match(/(\d{1,8}(?:\.\d{3})*-\d|K)/);
    if (rutMatch) {
      rut = rutMatch[0];
    } else {
      // Intentar con OU
      const rutMatchOu = ou.match(/(\d{1,8}(?:\.\d{3})*-\d|K)/);
      if (rutMatchOu) {
        rut = rutMatchOu[0];
      }
    }

    // Extraer razón social del CN (parte antes del RUT) o del O
    let razonSocial = '';
    if (cn.includes('-')) {
      razonSocial = cn.split('-')[0].trim();
    } else if (org) {
      razonSocial = org;
    }

    return {
      rut,
      razonSocial,
      notBefore: this.certValidity.notBefore.toISOString(),
      notAfter: this.certValidity.notAfter.toISOString(),
    };
  }
}
