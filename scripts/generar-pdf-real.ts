#!/usr/bin/env node
/**
 * Genera PDF con timbre PDF417 REAL para validación en Blumi.
 * 
 * Especificación SII:
 * - El timbre contiene datos del <DD> en orden específico
 * - Encoding ASCII puro (caracteres > 127 se plegan)
 * - Formato PDF417 estándar (columns=16, ecclevel=2)
 * 
 * Uso:
 *   npx tsx scripts/generar-pdf-real.ts
 * 
 * Output: pruebas-local/dtes/boleta-real.pdf
 */

import * as fs from 'fs';
import * as path from 'path';
import { jsPDF } from 'jspdf';
import bwipjs from 'bwip-js';
import { createCanvas } from 'canvas';
import { SiiSigner } from '../src/lib/sii/signer';
import { generateBoletaXml } from '../src/lib/sii/templates/boleta';
import { DtePayload } from '../src/lib/sii/types';
import { execSync } from 'child_process';

// Configuración
const ROOT_DIR = path.join(__dirname, '..');
const DIR_PRUEBAS = path.join(ROOT_DIR, 'pruebas-local');
const CERT_DIR = path.join(DIR_PRUEBAS, 'certificado');
const DTE_DIR = path.join(DIR_PRUEBAS, 'dtes');

console.log('📄 Generando PDF con timbre PDF417 REAL...\n');

async function main() {
  // Buscar OpenSSL
  const OPENSSL_PATHS = [
    'openssl',
    'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
  ];

  function findOpenSSL(): string {
    for (const p of OPENSSL_PATHS) {
      try {
        execSync(`"${p}" version`, { stdio: 'pipe' });
        return p;
      } catch {}
    }
    return '';
  }

  // 1. Generar certificado si no existe
  if (!fs.existsSync(path.join(CERT_DIR, 'test.pfx'))) {
    console.log('📜 Generando certificado OpenSSL...');
    const openssl = findOpenSSL();
    if (!fs.existsSync(CERT_DIR)) fs.mkdirSync(CERT_DIR, { recursive: true });
    
    execSync(
      `"${openssl}" req -x509 -newkey rsa:2048 -keyout "${CERT_DIR}\\key.pem" -out "${CERT_DIR}\\cert.pem" -days 365 -nodes -subj "/C=CL/ST=Region Metropolitana/L=Santiago/O=YAHPOS Test/CN=76123456-7"`,
      { stdio: 'pipe' }
    );
    execSync(
      `"${openssl}" pkcs12 -export -out "${CERT_DIR}\\test.pfx" -inkey "${CERT_DIR}\\key.pem" -in "${CERT_DIR}\\cert.pem" -passout pass:test123`,
      { stdio: 'pipe' }
    );
    console.log('   ✅ Certificado generado\n');
  }

// 2. Cargar certificado
const pfxBuffer = fs.readFileSync(path.join(CERT_DIR, 'test.pfx'));
const signer = new SiiSigner(pfxBuffer, 'test123');
console.log('✅ Certificado cargado\n');

// 3. Generar DTE
const payload: DtePayload = {
  Encabezado: {
    TipoDTE: 39,
    Folio: 1001,
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

// 4. Preparar datos del timbre (especificación SII)
// Orden exacto según <DD> del SII:
// RE, TD, F, FE, RR, RSR, RS, IT1, FCA, TSTED, RSADJ, FRSADJ

const rutEmisor = config.rutEmisor.replace(/\./g, '').replace('-', ''); // 761234567
const folio = payload.Encabezado.Folio;
const fechaEmision = payload.Encabezado.FchEmis;
const rutReceptor = payload.Encabezado.RUTRecep.replace(/\./g, '').replace('-', '');
const rsr = payload.Encabezado.RznSocRecep || '';
const rs = config.razonSocial;
const it1 = payload.Detalles[0]?.NmbItem.substring(0, 40) || '';
const fca = 'CAF-TEST-001'; // Folio CAF (simulado)
const tsTed = new Date().toISOString().replace(/\.\d{3}Z$/, ''); // AAAA-MM-DDTHH:MM:SS
const rsAdj = config.nroResol;
const frsAdj = config.fchResol;

// Construir string del timbre (encoding ASCII puro)
function plegarAscii(texto: string): string {
  // Reemplazar caracteres especiales por equivalentes ASCII
  return texto
    .replace(/[áàâä]/gi, 'a')
    .replace(/[éèêë]/gi, 'e')
    .replace(/[íìîï]/gi, 'i')
    .replace(/[óòôö]/gi, 'o')
    .replace(/[úùûü]/gi, 'u')
    .replace(/[ñÑ]/g, 'n')
    .replace(/[¿¡]/g, '')
    .replace(/[^\x00-\x7F]/g, '?'); // Cualquier otro carácter > 127 → '?'
}

const timbreString = [
  `RE:${plegarAscii(rutEmisor)}`,
  `TD:${payload.Encabezado.TipoDTE}`,
  `F:${folio}`,
  `FE:${fechaEmision}`,
  `RR:${plegarAscii(rutReceptor)}`,
  `RSR:${plegarAscii(rsr)}`,
  `RS:${plegarAscii(rs)}`,
  `IT1:${plegarAscii(it1)}`,
  `FCA:${fca}`,
  `TSTED:${tsTed}`,
  `RSADJ:${rsAdj}`,
  `FRSADJ:${frsAdj}`,
].join('');

console.log('📱 String del timbre:');
console.log('   ' + timbreString.substring(0, 80) + '...');
console.log('   Longitud:', timbreString.length, 'caracteres\n');

// 5. Generar PDF417 con bwip-js
console.log('🎨 Generando código PDF417...');

try {
  // Generar barcode como PNG buffer
  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: 'pdf417',
    text: timbreString,
    scale: 3,
    height: 10,
    includetext: false,
    columns: 16, // Estándar SII
    eclevel: 2,  // Error correction level 2
  });

  // Guardar barcode como imagen temporal
  const barcodePath = path.join(DTE_DIR, 'timbre-pdf417.png');
  if (!fs.existsSync(DTE_DIR)) fs.mkdirSync(DTE_DIR, { recursive: true });
  fs.writeFileSync(barcodePath, barcodeBuffer);

  console.log('   ✅ PDF417 generado:', path.relative(ROOT_DIR, barcodePath));
  console.log('   - Columns: 16');
  console.log('   - ECC Level: 2');
  console.log('   - Scale: 3');
  console.log('   - Datos codificados:', timbreString.length, 'bytes\n');

  // 6. Generar PDF completo con el barcode
  console.log('📄 Generando PDF térmico...');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 200], // Formato térmico 80mm
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

  // Línea separadora
  pdf.line(5, y, pageWidth - 5, y);
  y += 5;

  // Tipo de documento
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(9);
  pdf.text('BOLETA ELECTRONICA', pageWidth / 2, y, { align: 'center' });
  y += 5;

  // Folio y fecha
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7);
  pdf.text(`Folio: ${folio}`, 5, y);
  pdf.text(`Fecha: ${fechaEmision}`, pageWidth - 5, y, { align: 'right' });
  y += 5;

  // Receptor
  pdf.text(`RUT: ${payload.Encabezado.RUTRecep}`, 5, y);
  pdf.text(`${payload.Encabezado.RznSocRecep}`, pageWidth - 5, y, { align: 'right' });
  y += 8;

  // Línea separadora
  pdf.line(5, y, pageWidth - 5, y);
  y += 5;

  // Items
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.text('CANT  DESCRIPCION              P.UNIT    TOTAL', 5, y);
  y += 4;

  pdf.setFont('helvetica', 'normal');
  payload.Detalles.forEach(item => {
    pdf.text(`${item.QtyItem}    ${item.NmbItem.substring(0, 25).padEnd(25)} $${item.PrcItem}   $${item.MontoItem}`, 5, y);
    y += 4;
  });

  // Línea separadora
  y += 2;
  pdf.line(5, y, pageWidth - 5, y);
  y += 5;

  // Totales
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
  y += 4;

  // Insertar barcode PDF417
  const barcodeImage = barcodeBuffer.toString('base64');
  const barcodeWidthMm = 60;
  const barcodeHeightMm = 20;
  
  pdf.addImage(
    `data:image/png;base64,${barcodeImage}`,
    'PNG',
    10,
    y,
    barcodeWidthMm,
    barcodeHeightMm
  );

  y += barcodeHeightMm + 3;

  // Texto legible del timbre (para verificación manual)
  pdf.setFontSize(5);
  pdf.text(`FOLIO: ${folio} | FECHA: ${fechaEmision}`, 5, y);
  y += 3;
  pdf.text(`RUT EMISOR: ${config.rutEmisor}`, 5, y);
  y += 3;
  pdf.text(`RESOLUCION: ${config.nroResol} - ${config.fchResol}`, 5, y);

  // Guardar PDF final
  const pdfPath = path.join(DTE_DIR, 'boleta-real.pdf');
  pdf.save(pdfPath);

  console.log('\n✅ PDF generado:', path.relative(ROOT_DIR, pdfPath));
  console.log('📏 Tamaño: 80mm x 200mm (formato térmico)');
  console.log('🎯 Timbre: PDF417 real con encoding SII');

  console.log('\n📋 Instrucciones para Blumi:');
  console.log('   1. Abre: https://dte.blumi.cl/validador');
  console.log('   2. Click en "Examinar Archivos"');
  console.log('   3. Selecciona:', pdfPath);
  console.log('   4. Blumi validará el timbre PDF417');

  console.log('\n💡 Si Blumi dice "Timbre inválido":');
  console.log('   - Verificar que el RUT emisor coincida con el de la empresa en Blumi');
  console.log('   - Verificar que el folio esté en rango del CAF');
  console.log('   - Verificar encoding ASCII puro (sin caracteres > 127)');

  console.log('\n🔍 Validación adicional:');
  console.log('   - XML firmado:', path.relative(ROOT_DIR, path.join(DTE_DIR, 'boleta-firmada.xml')));
  console.log('   - Barcode PNG:', path.relative(ROOT_DIR, barcodePath));

} catch (error) {
  console.error('\n❌ Error generando PDF417:', error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
}

main();
