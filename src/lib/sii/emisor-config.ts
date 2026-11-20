import { createClient } from '@supabase/supabase-js';
import { decrypt } from '../crypto';
import { decodeCaf } from './caf-store';
import { SiiCafParser, type CafData } from './caf';
import { dividirRut } from './rut';
import forge from 'node-forge';

export interface EmisorConfig {
  storeId: string;
  rutEmisor: string;
  dvEmisor: string;
  razonSocial: string;
  giro: string;
  acteco: number;
  direccion: string;
  comuna: string;
  ciudad: string;
  nroResol: number;
  fchResol: string;
  environment: 'certification' | 'production';
  certificatePem: string;
  certificateRut: string;
  pfxBase64: string;
  pfxPassword: string;
  caf: CafData;
  cafXml: string;
  privateKeyJwk: JsonWebKey;
}

export interface EmisorConfigError {
  code: string;
  message: string;
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    throw new Error('Variables de entorno Supabase faltantes: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(url, key);
}

function extraerRutDeCertificado(pfxBase64: string, password: string): string {
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  const p12Der = pfxBuffer.toString('binary');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) {
    throw new Error('El PFX no contiene certificado');
  }

  const cn = String(certBag.cert.subject.getField('CN')?.value ?? '');
  const ou = String(certBag.cert.subject.getField('OU')?.value ?? '');

  const rutMatch = cn.match(/(\d{1,8}(?:\.\d{3})*-\d|K)/);
  if (rutMatch) return rutMatch[0];

  const rutMatchOu = ou.match(/(\d{1,8}(?:\.\d{3})*-\d|K)/);
  if (rutMatchOu) return rutMatchOu[0];

  return '';
}

function pemFromPfx(pfxBase64: string, password: string): string {
  const pfxBuffer = Buffer.from(pfxBase64, 'base64');
  const p12Der = pfxBuffer.toString('binary');
  const p12Asn1 = forge.asn1.fromDer(p12Der);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certBag = certBags[forge.pki.oids.certBag]?.[0];
  if (!certBag?.cert) {
    throw new Error('El PFX no contiene certificado para extraer PEM');
  }
  return forge.pki.certificateToPem(certBag.cert);
}

function normalizarRut(rut: string): string {
  return rut.replace(/\./g, '').trim();
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function loadEmisorConfig(storeId: string): Promise<EmisorConfig> {
  const supabase = getServiceSupabase();

  const { data: config, error: configErr } = await supabase
    .from('sii_config')
    .select('rut_emisor, razon_social, giro, direccion, comuna, ciudad, acteco, nro_resol, fch_resol, environment, certificado_pfx_encrypted, certificado_password_encrypted')
    .eq('store_id', storeId)
    .single();

  if (configErr || !config) {
    throw new Error(`sii_config no encontrado para tienda ${storeId}: ${configErr?.message ?? 'sin datos'}`);
  }

  const errores: EmisorConfigError[] = [];

  const rutEmisor = normalizarRut(config.rut_emisor ?? '');
  if (!rutEmisor) {
    errores.push({ code: 'RUT_EMISOR_VACIO', message: 'sii_config.rut_emisor está vacío' });
  }

  const { dv: dvEmisor } = rutEmisor ? dividirRut(rutEmisor) : { dv: '' };

  const acteco: number | null = config.acteco ?? null;
  if (!acteco) {
    errores.push({ code: 'ACTECO_FALTANTE', message: 'sii_config.acteco es obligatorio' });
  }

  const nroResol: number | null = config.nro_resol ?? null;
  if (nroResol === null || nroResol < 0) {
    errores.push({ code: 'NRO_RESOL_INVALIDO', message: 'sii_config.nro_resol debe ser >= 0' });
  }

  const fchResol: string | null = config.fch_resol ?? null;
  if (!fchResol) {
    errores.push({ code: 'FCH_RESOL_FALTANTE', message: 'sii_config.fch_resol es obligatoria' });
  } else if (fchResol > hoyIso()) {
    errores.push({ code: 'FCH_RESOL_FUTURA', message: `fch_resol (${fchResol}) es posterior a hoy` });
  }

  // `pfx_encrypted`/`pfx_password_encrypted` no existen en sii_config (verificado en DB).
  const pfxEncrypted: string | null = config.certificado_pfx_encrypted ?? null;
  const pwEncrypted: string | null = config.certificado_password_encrypted ?? null;

  if (!pfxEncrypted || !pwEncrypted) {
    errores.push({ code: 'CERTIFICATO_FALTANTE', message: 'Falta certificado PFX cifrado en sii_config' });
  }

  let pfxBase64 = '';
  let pfxPassword = '';
  let certificatePem = '';
  let certificateRut = '';

  if (pfxEncrypted && pwEncrypted) {
    try {
      pfxBase64 = decrypt(pfxEncrypted);
      pfxPassword = decrypt(pwEncrypted);
      certificatePem = pemFromPfx(pfxBase64, pfxPassword);
      certificateRut = extraerRutDeCertificado(pfxBase64, pfxPassword);
    } catch (e) {
      errores.push({
        code: 'CERTIFICATO_DESCIFRADO_ERR',
        message: `No se pudo descifrar/leer el PFX: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  }

  if (certificateRut && rutEmisor && normalizarRut(certificateRut) !== rutEmisor) {
    errores.push({
      code: 'RUT_CERT_MISMATCH',
      message: `RUT del certificado (${certificateRut}) no coincide con rut_emisor (${rutEmisor})`,
    });
  }

  const { data: folios, error: foliosErr } = await supabase
    .from('sii_folios')
    .select('caf_xml')
    .eq('store_id', storeId)
    .eq('tipo_dte', 39)
    .eq('activo', true)
    .order('folio_desde', { ascending: true })
    .limit(1);

  if (foliosErr) {
    errores.push({ code: 'FOLIOS_QUERY_ERR', message: foliosErr.message });
  }

  let cafXml = '';
  let caf: CafData | null = null;
  let privateKeyJwk: JsonWebKey | null = null;

  if (folios && folios.length > 0) {
    const rawCaf: string = folios[0].caf_xml ?? '';
    try {
      cafXml = decodeCaf(rawCaf);
    } catch (e) {
      errores.push({
        code: 'CAF_DECRYPT_ERR',
        message: e instanceof Error ? e.message : 'No se pudo descifrar el CAF',
      });
    }

    try {
      caf = SiiCafParser.parse(cafXml);
    } catch (e) {
      errores.push({
        code: 'CAF_PARSE_ERR',
        message: `CAF no es XML válido: ${e instanceof Error ? e.message : String(e)}`,
      });
    }

    if (caf) {
      if (caf.tipoDte !== 39) {
        errores.push({ code: 'CAF_TIPO_ERR', message: `CAF tipo ${caf.tipoDte}, se espera 39` });
      }
      privateKeyJwk = SiiCafParser.getPrivateKeyJwk(cafXml);
      if (!privateKeyJwk) {
        errores.push({ code: 'CAF_SIN_LLAVE', message: 'El CAF no contiene llave privada RSASK' });
      }
    }
  } else {
    errores.push({ code: 'SIN_CAF', message: 'No hay CAF activo tipo 39 para esta tienda' });
  }

  if (errores.length > 0) {
    throw new Error(
      `Configuración de emisor incompleta:\n${errores.map((e) => `  - [${e.code}] ${e.message}`).join('\n')}`,
    );
  }

  return {
    storeId,
    rutEmisor,
    dvEmisor,
    razonSocial: config.razon_social ?? '',
    giro: config.giro ?? '',
    acteco: acteco as number,
    direccion: config.direccion ?? '',
    comuna: config.comuna ?? '',
    ciudad: config.ciudad ?? '',
    nroResol: nroResol as number,
    fchResol: fchResol as string,
    environment: (config.environment as 'certification' | 'production') ?? 'certification',
    certificatePem,
    certificateRut,
    pfxBase64,
    pfxPassword,
    caf: caf as CafData,
    cafXml,
    privateKeyJwk: privateKeyJwk as JsonWebKey,
  };
}
