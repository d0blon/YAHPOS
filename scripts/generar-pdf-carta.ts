#!/usr/bin/env node
/**
 * Genera PDF tamaño carta con timbre PDF417 según especificación SII.
 * Formato: Carta (216mm x 279mm) con timbre en parte inferior.
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

const ROOT_DIR = path.join(__dirname, '..');
const DIR_PRUEBAS = path.join(ROOT_DIR, 'pruebas-local');
const CERT_DIR = path.join(DIR_PRUEBAS, 'certificado');
const DTE_DIR = path.join(DIR_PRUEBAS, 'dtes');

console.log('📄 Generando PDF tamaño carta con timbre PDF417...\n');

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

  // 2. Cargar certificado
  const pfxBuffer = fs.readFileSync(path.join(CERT_DIR, 'test.pfx'));
  const signer = new SiiSigner(pfxBuffer, 'test123');
  console.log('✅ Certificado cargado\n');

  // 3. Cargar CAF
  const CAF_PATH = path.join(ROOT_DIR, '..', 'dte-parity', 'fixtures', 'caf39.xml');
  const cafXml = fs.readFileSync(CAF_PATH, 'utf-8');
  const caf = SiiCafParser.parse(cafXml);
  console.log('✅ CAF cargado (RUT:', caf.rut, ', Folios:', caf.desde + '-' + caf.hasta + ')\n');

  // 4. Generar DTE
  const payload: DtePayload = {
    Encabezado: {
      TipoDTE: 39,
      Folio: 1,
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
    Detalles: [{ NmbItem: 'Producto de prueba', QtyItem: 1, PrcItem: 840, MontoItem: 840 }],
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
  console.log('✅ DTE firmado generado\n');

  // 5. Construir <DD> XML
  console.log('📋 Construyendo <DD>...');
  const ddXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<DD>
  <RE>${config.rutEmisor}</RE>
  <TD>${payload.Encabezado.TipoDTE}</TD>
  <F>${payload.Encabezado.Folio}</F>
  <FE>${payload.Encabezado.FchEmis}</FE>
  <RR>${payload.Encabezado.RUTRecep}</RR>
  <RSR>${payload.Encabezado.RznSocRecep}</RSR>
  <RS>${config.razonSocial}</RS>
  <IT1>${payload.Detalles[0].NmbItem.substring(0, 40)}</IT1>
  ${caf.cafFragment}
  <TSTED>${new Date().toISOString().replace(/\.\d{3}Z$/, '')}</TSTED>
</DD>`;

  // 6. Firmar <DD> (simulada)
  const ddFirmado = ddXml.replace('</DD>', '  <FRMT algoritmo="SHA1withRSA">FIRMA_SIMULADA</FRMT>\n</DD>');
  console.log('   ✅ <DD> construido (firma simulada)\n');

  // 7. Generar PDF417
  console.log('🎨 Generando PDF417...');
  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: 'pdf417',
    text: ddFirmado,
    scale: 2,
    height: 10,
    includetext: false,
    columns: 16,
    eclevel: 2,
  });

  const barcodePath = path.join(DTE_DIR, 'timbre-pdf417.png');
  if (!fs.existsSync(DTE_DIR)) fs.mkdirSync(DTE_DIR, { recursive: true });
  fs.writeFileSync(barcodePath, barcodeBuffer);
  console.log('   ✅ PDF417 generado\n');

  // 8. Generar PDF tamaño carta
  console.log('📄 Generando PDF tamaño carta (216mm x 279mm)...');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter', // Carta: 216mm x 279mm
  });

  const pageWidth = 216;
  let y = 20;

  // Encabezado
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(config.razonSocial, pageWidth / 2, y, { align: 'center' });
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(config.giro, pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text(config.direccion, pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text(`${config.comuna} - ${config.ciudad}`, pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text(`RUT: ${config.rutEmisor}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // Línea
  pdf.line(20, y, pageWidth - 20, y);
  y += 10;

  // Título documento
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('BOLETA ELECTRÓNICA', pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Folio y fecha
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Folio: ${payload.Encabezado.Folio}`, 20, y);
  pdf.text(`Fecha: ${payload.Encabezado.FchEmis}`, pageWidth - 20, y, { align: 'right' });
  y += 8;

  // Receptor
  pdf.text(`RUT Receptor: ${payload.Encabezado.RUTRecep}`, 20, y);
  y += 8;
  pdf.text(`Nombre: ${payload.Encabezado.RznSocRecep}`, 20, y);
  y += 12;

  // Línea
  pdf.line(20, y, pageWidth - 20, y);
  y += 10;

  // Tabla de items
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Cant.', 20, y);
  pdf.text('Descripción', 40, y);
  pdf.text('P. Unitario', 140, y);
  pdf.text('Total', 180, y);
  y += 6;

  pdf.line(20, y, pageWidth - 20, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  payload.Detalles.forEach(item => {
    pdf.text(`${item.QtyItem}`, 20, y);
    pdf.text(item.NmbItem, 40, y);
    pdf.text(`$${item.PrcItem}`, 140, y);
    pdf.text(`$${item.MontoItem}`, 180, y);
    y += 8;
  });

  y += 4;
  pdf.line(20, y, pageWidth - 20, y);
  y += 10;

  // Totales
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(`Neto: $${payload.Encabezado.MntNeto}`, pageWidth - 20, y, { align: 'right' });
  y += 7;
  pdf.text(`IVA (19%): $${payload.Encabezado.IVA}`, pageWidth - 20, y, { align: 'right' });
  y += 7;
  pdf.setFontSize(13);
  pdf.text(`TOTAL: $${payload.Encabezado.MntTotal}`, pageWidth - 20, y, { align: 'right' });
  y += 20;

  // TIMBRE PDF417 (parte inferior)
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('TIMBRE ELECTRÓNICO', 20, y);
  y += 5;

  // Insertar barcode (tamaño mínimo 25mm x 15mm según SII)
  const barcodeImage = barcodeBuffer.toString('base64');
  pdf.addImage(`data:image/png;base64,${barcodeImage}`, 'PNG', 20, y, 50, 30);

  y += 35;

  // Texto del timbre
  pdf.setFontSize(8);
  pdf.text(`RUT Emisor: ${config.rutEmisor}`, 20, y);
  y += 5;
  pdf.text(`Tipo DTE: ${payload.Encabezado.TipoDTE}`, 20, y);
  y += 5;
  pdf.text(`Folio: ${payload.Encabezado.Folio}`, 20, y);
  y += 5;
  pdf.text(`Fecha Emisión: ${payload.Encabezado.FchEmis}`, 20, y);
  y += 5;
  pdf.text(`Resolución: ${config.nroResol} - ${config.fchResol}`, 20, y);

  // Guardar PDF
  const pdfPath = path.join(DTE_DIR, 'boleta-carta.pdf');
  pdf.save(pdfPath);

  console.log(`\n✅ PDF generado: ${path.relative(ROOT_DIR, pdfPath)}`);
  console.log('📏 Formato: Carta (216mm x 279mm)');
  console.log('🎯 Timbre PDF417 en parte inferior (50mm x 30mm)');

  console.log('\n📋 Instrucciones para Blumi:');
  console.log('   1. Abre: https://dte.blumi.cl/validador');
  console.log('   2. Click en "Examinar Archivos"');
  console.log('   3. Selecciona:', pdfPath);

  console.log('\n⚠️  Notas:');
  console.log('   - El RUT emisor (76.123.456-7) difiere del CAF (76.123.456-0)');
  console.log('   - La firma es simulada (no es clave real del CAF)');
  console.log('   - Blumi debería decodificar los campos pero marcar errores de validación');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
