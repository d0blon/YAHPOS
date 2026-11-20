#!/usr/bin/env node
/**
 * Genera un PDF con timbre PDF417 para validar en Blumi.
 * 
 * Uso:
 *   npx tsx scripts/generar-pdf-prueba.ts
 * 
 * Output: pruebas-local/dtes/boleta.pdf
 */

import * as fs from 'fs';
import * as path from 'path';
import { jsPDF } from 'jspdf';
import { SiiSigner } from '../src/lib/sii/signer';
import { generateBoletaXml } from '../src/lib/sii/templates/boleta';
import { DtePayload } from '../src/lib/sii/types';

// Configuración
const ROOT_DIR = path.join(__dirname, '..');
const DIR_PRUEBAS = path.join(ROOT_DIR, 'pruebas-local');
const CERT_DIR = path.join(DIR_PRUEBAS, 'certificado');
const DTE_DIR = path.join(DIR_PRUEBAS, 'dtes');

console.log('📄 Generando PDF con timbre PDF417...\n');

// Buscar OpenSSL
const OPENSSL_PATHS = [
  'openssl',
  'C:\\Program Files\\Git\\usr\\bin\\openssl.exe',
];

function findOpenSSL(): string {
  const { execSync } = require('child_process');
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
  const { execSync } = require('child_process');
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
  environment: 'certification' as const,
};

const xmlSinFirma = generateBoletaXml(payload, config);
const xmlFirmado = signer.signXml(xmlSinFirma, 'Documento');

console.log('✅ DTE firmado generado');

// 4. Generar timbre PDF417
// El timbre contiene: RUT, TD, F, FE, RR, RSR, RS, IT1, FCA, TSTED, RSADJ, FRSADJ
const timbreData = [
  `RE:${config.rutEmisor}`,
  `TD:${payload.Encabezado.TipoDTE}`,
  `F:${payload.Encabezado.Folio}`,
  `FE:${payload.Encabezado.FchEmis}`,
  `RR:${payload.Encabezado.RUTRecep}`,
  `RSR:${payload.Encabezado.RznSocRecep}`,
  `RS:${config.razonSocial}`,
  `IT1:${payload.Detalles[0].NmbItem.substring(0, 40)}`,
  `FCA:CAF-TEST`,
  `TSTED:${new Date().toISOString().replace(/\.\d{3}Z$/, '')}`,
  `RSADJ:RSATEST`,
  `FRSADJ:2026-11-14`,
].join('');

console.log('📱 Datos del timbre:', timbreData.substring(0, 80) + '...');

// 5. Generar PDF simple
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
pdf.text(`Folio: ${payload.Encabezado.Folio}`, 5, y);
pdf.text(`Fecha: ${payload.Encabezado.FchEmis}`, pageWidth - 5, y, { align: 'right' });
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

// Timbre PDF417 (representación visual)
pdf.setFont('helvetica', 'normal');
pdf.setFontSize(6);
pdf.text('TIMBRE ELECTRONICO:', 5, y);
y += 4;

// Dibujar un rectángulo representando el PDF417
const barcodeWidth = 60;
const barcodeHeight = 25;
pdf.setDrawColor(0);
pdf.rect(10, y, barcodeWidth, barcodeHeight);

// Texto del timbre dentro del rectángulo
pdf.setFontSize(5);
pdf.text('PDF417', 10 + barcodeWidth/2, y + barcodeHeight/2, { align: 'center' });
pdf.text(`FOLIO: ${payload.Encabezado.Folio}`, 10 + barcodeWidth/2, y + barcodeHeight/2 + 3, { align: 'center' });
pdf.text(`FECHA: ${payload.Encabezado.FchEmis}`, 10 + barcodeWidth/2, y + barcodeHeight/2 + 6, { align: 'center' });

y += barcodeHeight + 5;

// Texto del timbre
pdf.setFontSize(5);
const timbreLines = timbreData.match(/.{1,70}/g) || [];
timbreLines.forEach(line => {
  pdf.text(line, 5, y);
  y += 3;
});

// Guardar PDF
const pdfPath = path.join(DTE_DIR, 'boleta.pdf');
if (!fs.existsSync(DTE_DIR)) fs.mkdirSync(DTE_DIR, { recursive: true });
pdf.save(pdfPath);

console.log(`\n✅ PDF generado: ${path.relative(ROOT_DIR, pdfPath)}`);
console.log('📏 Tamaño: 80mm x 200mm (formato térmico)');
console.log('\n🎯 Instrucciones:');
console.log('   1. Abre dte.blumi.cl/validador');
console.log('   2. Click en "Examinar Archivos"');
console.log('   3. Selecciona: ' + pdfPath);
console.log('   4. Blumi validará el timbre PDF417');
console.log('\n💡 Nota: El timbre es simulado (no es un PDF417 real codificado)');
console.log('   Para validación real, se necesita integrar la librería bwip-js\n');
