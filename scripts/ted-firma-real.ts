/**
 * Harness de prueba: genera un TED real firmado con la clave privada del CAF fixture
 * y verifica que la firma sea vlida. NO sube a Maullin ni a ningn servidor.
 *
 * Uso:
 *   npx tsx scripts/ted-firma-real.ts
 *
 * PASS si <FRMT> tiene algoritmo RSA-SHA1 y la firma verifica con la pblica del CAF.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { SiiTedGenerator } from '../src/lib/sii/ted';
import { SiiCafParser } from '../src/lib/sii/caf';

const ROOT = path.resolve(__dirname, '..');
const CAF_PATH = path.join(ROOT, '..', 'dte-parity', 'fixtures', 'caf39.xml');

interface Resultado {
  pass: boolean;
  detalles: string[];
}

async function main(): Promise<void> {
  const detalles: string[] = [];
  let pass = true;

  console.log('=== Harness TED Firma Real ===\n');

  if (!fs.existsSync(CAF_PATH)) {
    console.error(`CAF fixture no encontrado: ${CAF_PATH}`);
    process.exit(1);
  }

  const cafXml = fs.readFileSync(CAF_PATH, 'utf-8');
  const cafData = SiiCafParser.parse(cafXml);
  detalles.push(`CAF RUT: ${cafData.rut}`);
  detalles.push(`CAF tipo: ${cafData.tipoDte}`);
  detalles.push(`CAF folios: ${cafData.desde}-${cafData.hasta}`);
  detalles.push(`CAF fecha: ${cafData.fecha}`);

  const jwk = SiiCafParser.getPrivateKeyJwk(cafXml);
  if (!jwk) {
    console.error('FAIL: No se pudo extraer la llave privada del CAF');
    process.exit(1);
  }
  detalles.push('Llave privada: OK (JWK extraido)');

  const dteData = {
    Encabezado: {
      TipoDTE: 39 as const,
      Folio: 1,
      FchEmis: '2026-11-16',
      RUTEmisor: cafData.rut,
      RUTRecep: '66666666-6',
      RznSocRecep: 'Consumidor Final',
      MntTotal: 1190,
    },
    Detalles: [
      {
        NmbItem: 'Producto de prueba',
        QtyItem: 1,
        PrcItem: 1000,
        MontoItem: 1190,
      },
    ],
  };

  let tedXml: string;
  try {
    tedXml = await SiiTedGenerator.generateTed(dteData, cafXml, false);
    detalles.push('TED generado: OK');
  } catch (e) {
    console.error(`FAIL: Error generando TED: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
    return;
  }

  const frmtMatch = tedXml.match(/<FRMT algoritmo="([^"]+)">([A-Za-z0-9+/=]+)<\/FRMT>/);
  if (!frmtMatch) {
    console.error('FAIL: No se encontro <FRMT> en el TED');
    console.error('TED:', tedXml);
    process.exit(1);
    return;
  }

  const algoritmo = frmtMatch[1];
  const firmaB64 = frmtMatch[2];
  detalles.push(`Algoritmo FRMT: ${algoritmo}`);

  if (algoritmo !== 'SHA1withRSA') {
    pass = false;
    detalles.push(`FAIL: Algoritmo esperado SHA1withRSA, obtenido ${algoritmo}`);
  } else {
    detalles.push('Algoritmo: SHA1withRSA OK');
  }

  if (firmaB64 === 'MOCK_TED_SIGNATURE') {
    pass = false;
    detalles.push('FAIL: Firma es MOCK (no se firmo con clave real)');
  }

  const ddMatch = tedXml.match(/(<DD>[\s\S]*?<\/DD>)/);
  if (!ddMatch) {
    console.error('FAIL: No se encontro <DD> en el TED');
    process.exit(1);
    return;
  }
  const ddStr = ddMatch[1];

  const firmaBytes = Buffer.from(firmaB64, 'base64');

  const webcrypto = crypto.webcrypto;
  const pubKey = await webcrypto.subtle.importKey(
    'jwk',
    {
      kty: 'RSA',
      n: jwk.n as string,
      e: jwk.e as string,
      alg: 'RS1',
      ext: true,
    },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' },
    true,
    ['verify'],
  );

  const iconv = await import('iconv-lite');
  const ddBytes = new Uint8Array(iconv.encode(ddStr, 'ISO-8859-1'));

  const valido = await webcrypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    pubKey,
    firmaBytes,
    ddBytes,
  );

  if (!valido) {
    pass = false;
    detalles.push('FAIL: Firma NO verifica con la clave publica del CAF');
  } else {
    detalles.push('Firma verifica: OK');
  }

  for (const d of detalles) {
    console.log(`  ${d}`);
  }

  console.log('');
  if (pass) {
    console.log('PASS: TED generado con clave real, algoritmo SHA1withRSA, firma verificable.');
  } else {
    console.log('FAIL: Hubo errores en la verificacion.');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error inesperado:', e);
  process.exit(1);
});
