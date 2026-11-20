#!/usr/bin/env node
/**
 * Genera PDF con timbre PDF417 según especificación oficial SII.
 * 
 * El <DD> debe ser XML completo con:
 * - Datos del documento (RE, TD, F, FE, RR, RSR, RS, IT1)
 * - CAF completo (con firma RSA del CAF)
 * - Timestamp (TSTED)
 * - Firma RSA del timbre (FRMT)
 * 
 * Uso:
 *   npx tsx scripts/generar-dd-correcto.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { jsPDF } from 'jspdf';
import bwipjs from 'bwip-js';
import { SiiSigner } from '../src/lib/sii/signer';
import { SiiCafParser } from '../src/lib/sii/caf';
import { generateBoletaXml } from '../src/lib/sii/templates/boleta';
import { DtePayload } from '../src/lib/sii/types';
import { execSync } from 'child_process';
import * as forge from 'node-forge';

// Configuración
const ROOT_DIR = path.join(__dirname, '..');
const DIR_PRUEBAS = path.join(ROOT_DIR, 'pruebas-local');
const CERT_DIR = path.join(DIR_PRUEBAS, 'certificado');
const DTE_DIR = path.join(DIR_PRUEBAS, 'dtes');

console.log('📄 Generando PDF con <DD> según especificación SII...\n');

async function main() {
  // 1. Generar certificado si no existe
  if (!fs.existsSync(path.join(CERT_DIR, 'test.pfx'))) {
    console.log('📜 Generando certificado OpenSSL...');
    execSync(
      `"C:\\Program Files\\Git\\usr\\bin\\openssl.exe" req -x509 -newkey rsa:2048 -keyout "${CERT_DIR}\\key.pem" -out "${CERT_DIR}\\cert.pem" -days 365 -nodes -subj "/C=CL/ST=Region Metropolitana/L=Santiago/O=YAHPOS Test/CN=76123456-7"`,
      { stdio: 'pipe' }
    );
    execSync(
      `"C:\\Program Files\\Git\\usr\\bin\\openssl.exe" pkcs12 -export -out "${CERT_DIR}\\test.pfx" -inkey "${CERT_DIR}\\key.pem" -in "${CERT_DIR}\\cert.pem" -passout pass:test123`,
      { stdio: 'pipe' }
    );
    console.log('   ✅ Certificado generado\n');
  }

// 2. Cargar certificado del emisor
const pfxBuffer = fs.readFileSync(path.join(CERT_DIR, 'test.pfx'));
const signer = new SiiSigner(pfxBuffer, 'test123');
console.log('✅ Certificado del emisor cargado\n');

// 3. Cargar CAF fixture
const CAF_PATH = path.join(ROOT_DIR, '..', 'dte-parity', 'fixtures', 'caf39.xml');
let cafXml: string;
try {
  cafXml = fs.readFileSync(CAF_PATH, 'utf-8');
  console.log('✅ CAF cargado:', path.relative(ROOT_DIR, CAF_PATH));
} catch (error) {
  console.error('❌ No se encontró CAF fixture');
  process.exit(1);
}

// 4. Generar DTE
const payload: DtePayload = {
  Encabezado: {
    TipoDTE: 39,
    Folio: 1, // Usar folio 1 (dentro del rango 1-100 del CAF)
    FchEmis: '2026-11-14',
    RUTEmisor: '76123456-7',
    RUTRecep: '66666666-6',
    RznSocRecep: 'Consumidor Final',
    Giro: 'Venta de Alimentos',
    MntNeto: 840,
    MntTotal: 1000,
    IVA: 160,
    TasaIVA: 19,
  },
  Detalles: [
    {
      NmbItem: 'Producto de prueba YAHPOS!',
      QtyItem: 1,
      PrcItem: 840,
      MontoItem: 840,
    },
  ],
};

const config = {
  rutEmisor: '76123456-7',
  razonSocial: 'Austral Market SpA',
  giro: 'Venta de Alimentos',
  direccion: 'Av. Siempre Viva 123',
  comuna: 'Santiago',
  ciudad: 'Santiago',
  nroResol: '0',
  fchResol: '2024-01-01',
  environment: 'certification' as const,
};

const xmlSinFirma = generateBoletaXml(payload, config);
const xmlFirmado = signer.signXml(xmlSinFirma, 'Documento');

console.log('✅ DTE firmado generado');

// 5. Construir <DD> según especificación SII
console.log('\n📋 Construyendo <DD> (Datos del Timbre)...');

// Parsear CAF para obtener datos necesarios
const caf = SiiCafParser.parse(cafXml);
const cafXmlFragment = caf.cafFragment; // XML completo del CAF
const cafPrivateKey = caf.privateKey; // Clave privada del CAF para firmar

console.log('   - RUT CAF:', caf.rut);
console.log('   - Tipo DTE:', caf.tipoDte);
console.log('   - Folios:', caf.desde, '-', caf.hasta);
console.log('   - Fecha:', caf.fecha);

// Datos para el <DD>
const rutEmisor = config.rutEmisor;
const tipoDte = payload.Encabezado.TipoDTE;
const folio = payload.Encabezado.Folio;
const fechaEmision = payload.Encabezado.FchEmis;
const rutReceptor = payload.Encabezado.RUTRecep;
const rsr = payload.Encabezado.RznSocRecep || '';
const rs = config.razonSocial;
const it1 = payload.Detalles[0]?.NmbItem.substring(0, 40) || '';
const tsTed = new Date().toISOString().replace(/\.\d{3}Z$/, '');

// Construir XML del <DD>
const ddXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DD>
  <RE>${rutEmisor}</RE>
  <TD>${tipoDte}</TD>
  <F>${folio}</F>
  <FE>${fechaEmision}</FE>
  <RR>${rutReceptor}</RR>
  <RSR>${rsr}</RSR>
  <RS>${rs}</RS>
  <IT1>${it1}</IT1>
  ${cafXmlFragment}
  <TSTED>${tsTed}</TSTED>
</DD>`;

console.log('   ✅ <DD> construido');
console.log('   - RE:', rutEmisor);
console.log('   - TD:', tipoDte);
console.log('   - F:', folio);
console.log('   - FE:', fechaEmision);
console.log('   - CAF: incluido');
console.log('   - TSTED:', tsTed);

// Guardar <DD> para referencia
const ddPath = path.join(DTE_DIR, 'dd.xml');
if (!fs.existsSync(DTE_DIR)) fs.mkdirSync(DTE_DIR, { recursive: true });
fs.writeFileSync(ddPath, ddXml, 'utf-8');

// 6. Firmar el <DD> con la clave privada del CAF
console.log('\n✍️  Firmando <DD> con clave del CAF...');

let ddFirmado: string;
try {
  // Convertir clave privada del CAF a formato PEM
  const components = cafPrivateKey as any;
  const privateKeyPem = `-----BEGIN RSA PRIVATE KEY-----
${forge.util.encode64(
  forge.asn1.toDer(
    forge.pki.rsa.setPrivateKey(
      forge.util.createBuffer(forge.util.decode64(components.M || ''), 'raw'),
      forge.util.createBuffer(forge.util.decode64(components.E || ''), 'raw'),
      forge.util.createBuffer(forge.util.decode64(components.D || ''), 'raw')
    )
  ).getBytes()
)}
-----END RSA PRIVATE KEY-----`;
  
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha1.create();
  md.update(ddXml, 'latin1');
  const signature = privateKey.sign(md);
  const signatureBase64 = forge.util.encode64(signature);
  
  // Agregar firma al <DD>
  ddFirmado = ddXml.replace('</DD>', `  <FRMT algoritmo="SHA1withRSA">${signatureBase64}</FRMT>\n</DD>`);
  
  console.log('   ✅ <DD> firmado');
  console.log('   - Algoritmo: SHA1withRSA');
  console.log('   - Firma:', signatureBase64.substring(0, 50) + '...');
} catch (error) {
  console.error('   ⚠️  Error firmando con clave CAF:', error.message);
  console.error('   Usando firma simulada para pruebas');
  ddFirmado = ddXml.replace('</DD>', '  <FRMT algoritmo="SHA1withRSA">FIRMA_SIMULADA</FRMT>\n</DD>');
}

// 7. Codificar <DD> en PDF417
console.log('\n🎨 Codificando <DD> en PDF417...');

try {
  // El <DD> debe estar en encoding ISO-8859-1
  const ddBuffer = Buffer.from(ddFirmado, 'latin1');
  
  // Generar PDF417
  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: 'pdf417',
    text: ddFirmado,
    scale: 3,
    height: 10,
    includetext: false,
    columns: 16,
    eclevel: 2,
  });

  const barcodePath = path.join(DTE_DIR, 'timbre-real.png');
  fs.writeFileSync(barcodePath, barcodeBuffer);

  console.log('   ✅ PDF417 generado:', path.relative(ROOT_DIR, barcodePath));
  console.log('   - Tamaño <DD>:', ddFirmado.length, 'bytes');
  console.log('   - Columns: 16, ECC: 2');

  // 8. Generar PDF completo
  console.log('\n📄 Generando PDF térmico...');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200],
  });

  const pageWidth = 80;
  let y = 10;

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(config.razonSocial, pageWidth / 2, y, { align: 'center' });
  y += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(config.giro, pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text(config.direccion, pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text(`${config.comuna} - ${config.ciudad}`, pageWidth / 2, y, { align: 'center' });
  y += 4;
  pdf.text(`RUT: ${config.rutEmisor}`, pageWidth / 2, y, { align: 'center' });
  y += 8;

  pdf.line(5, y, pageWidth - 5, y);
  y += 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('BOLETA ELECTRONICA', pageWidth / 2, y, { align: 'center' });
  y += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`Folio: ${folio}`, 5, y);
  pdf.text(`Fecha: ${fechaEmision}`, pageWidth - 5, y, { align: 'right' });
  y += 5;

  pdf.text(`RUT: ${payload.Encabezado.RUTRecep}`, 5, y);
  pdf.text(`${payload.Encabezado.RznSocRecep}`, pageWidth - 5, y, { align: 'right' });
  y += 8;

  pdf.line(5, y, pageWidth - 5, y);
  y += 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('CANT  DESCRIPCION              P.UNIT    TOTAL', 5, y);
  y += 4;

  pdf.setFont('helvetica', 'normal');
  payload.Detalles.forEach(item => {
    pdf.text(`${item.QtyItem}    ${item.NmbItem.substring(0, 25).padEnd(25)} $${item.PrcItem}   $${item.MontoItem}`, 5, y);
    y += 4;
  });

  y += 2;
  pdf.line(5, y, pageWidth - 5, y);
  y += 5;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text(`Neto:   $${payload.Encabezado.MntNeto}`, pageWidth - 5, y, { align: 'right' });
  y += 4;
  pdf.text(`IVA (19%): $${payload.Encabezado.IVA}`, pageWidth - 5, y, { align: 'right' });
  y += 5;
  pdf.setFontSize(10);
  pdf.text(`TOTAL:  $${payload.Encabezado.MntTotal}`, pageWidth - 5, y, { align: 'right' });
  y += 10;

  // Timbre PDF417
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('TIMBRE ELECTRONICO:', 5, y);
  y += 3;

  // Insertar barcode
  const barcodeImage = barcodeBuffer.toString('base64');
  const barcodeWidthMm = 65;
  const barcodeHeightMm = 25;
  
  pdf.addImage(
    `data:image/png;base64,${barcodeImage}`,
    'PNG',
    7.5,
    y,
    barcodeWidthMm,
    barcodeHeightMm
  );

  y += barcodeHeightMm + 3;

  // Texto legible
  pdf.setFontSize(5);
  pdf.text(`FOLIO: ${folio} | FECHA: ${fechaEmision}`, 5, y);
  y += 3;
  pdf.text(`RUT: ${config.rutEmisor} | RES: ${config.nroResol} - ${config.fchResol}`, 5, y);

  // Guardar PDF
  const pdfPath = path.join(DTE_DIR, 'boleta-dd-real.pdf');
  pdf.save(pdfPath);

  console.log('\n✅ PDF generado:', path.relative(ROOT_DIR, pdfPath));
  
  console.log('\n📋 Instrucciones para Blumi:');
  console.log('   1. Abre: https://dte.blumi.cl/validador');
  console.log('   2. Click en "Examinar Archivos"');
  console.log('   3. Selecciona:', pdfPath);
  
  console.log('\n⚠️  Nota importante:');
  console.log('   - El RUT emisor (76.123.456-7) debe coincidir con el de Blumi');
  console.log('   - El folio (1) debe estar en rango del CAF (1-100)');
  console.log('   - La firma usa la clave del CAF fixture (no es tu clave real)');
  
  console.log('\n🔍 Archivos generados:');
  console.log('   - <DD> XML:', path.relative(ROOT_DIR, ddPath));
  console.log('   - PDF417 PNG:', path.relative(ROOT_DIR, barcodePath));
  console.log('   - PDF completo:', path.relative(ROOT_DIR, pdfPath));

} catch (error) {
  console.error('\n❌ Error:', error.message);
  if (error.stack) console.error(error.stack);
  process.exit(1);
}
}

main();
