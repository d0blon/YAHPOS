#!/usr/bin/env node
/**
 * Genera PDF con TED completo según fixture real del motor.
 * El PDF417 debe contener <TED> completo (no solo <DD>).
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

console.log('📄 Generando TED completo según especificación SII oficial...\n');

async function main() {
  // 1. Certificado
  if (!fs.existsSync(path.join(CERT_DIR, 'test.pfx'))) {
    console.log('📜 Generando certificado OpenSSL...');
    execSync(
      `"C:\\Program Files\\Git\\usr\\bin\\openssl.exe" req -x509 -newkey rsa:2048 -keyout "${CERT_DIR}\\key.pem" -out "${CERT_DIR}\\cert.pem" -days 365 -nodes -subj "/C=CL/ST=Region Metropolitana/L=Santiago/O=EMISOR DE PRUEBA/CN=76123456-0"`,
      { stdio: 'pipe' }
    );
    execSync(
      `"C:\\Program Files\\Git\\usr\\bin\\openssl.exe" pkcs12 -export -out "${CERT_DIR}\\test.pfx" -inkey "${CERT_DIR}\\key.pem" -in "${CERT_DIR}\\cert.pem" -passout pass:test123`,
      { stdio: 'pipe' }
    );
    console.log('   ✅ Certificado generado\n');
  }

  const pfxBuffer = fs.readFileSync(path.join(CERT_DIR, 'test.pfx'));
  const signer = new SiiSigner(pfxBuffer, 'test123');

  // 2. CAF
  const CAF_PATH = path.join(ROOT_DIR, '..', 'dte-parity', 'fixtures', 'caf39.xml');
  const cafXml = fs.readFileSync(CAF_PATH, 'utf-8');
  const caf = SiiCafParser.parse(cafXml);
  console.log('✅ CAF: RUT=' + caf.rut + ' Tipo=' + caf.tipoDte + ' Folios=' + caf.desde + '-' + caf.hasta);

  // 3. DTE
  const payload: DtePayload = {
    Encabezado: {
      TipoDTE: caf.tipoDte,
      Folio: caf.desde,
      FchEmis: '2026-11-14',
      RUTEmisor: caf.rut,
      RUTRecep: '66666666-6',
      RznSocRecep: 'CONSUMIDOR FINAL',
      Giro: 'Venta de Alimentos',
      MntTotal: 1000,
      MntNeto: 840,
      IVA: 160,
      TasaIVA: 19,
    },
    Detalles: [{ NmbItem: 'Producto de prueba', QtyItem: 1, PrcItem: 840, MontoItem: 840 }],
  };

  const config = {
    rutEmisor: caf.rut,
    razonSocial: 'EMISOR DE PRUEBA',
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

  // 4. Construir <TED> completo según fixture real
  console.log('\n📋 Construyendo <TED> completo...');
  
  const tsTed = new Date().toISOString().replace(/\.\d{3}Z$/, '');

  // El <DD> según el fixture real:
  // - RE, TD, F, FE, RR, RSR, MNT, IT1 (datos del documento)
  // - CAF completo (con DA, RSAPK, IDK, FRMA)
  // - TSTED
  const ddXml = 
    `<DD version="1.0">` +
    `<RE>${caf.rut}</RE>` +
    `<TD>${caf.tipoDte}</TD>` +
    `<F>${caf.desde}</F>` +
    `<FE>${payload.Encabezado.FchEmis}</FE>` +
    `<RR>${payload.Encabezado.RUTRecep}</RR>` +
    `<RSR>${payload.Encabezado.RznSocRecep}</RSR>` +
    `<MNT>${payload.Encabezado.MntTotal}</MNT>` +
    `<IT1>${payload.Detalles[0].NmbItem.substring(0, 40)}</IT1>` +
    `<CAF version="1.0">` +
      `<DA>` +
        `<RE>${caf.rut}</RE>` +
        `<RS>EMISOR DE PRUEBA</RS>` +
        `<TD>${caf.tipoDte}</TD>` +
        `<RNG><D>${caf.desde}</D><H>${caf.hasta}</H></RNG>` +
        `<FA>${caf.fecha}</FA>` +
        `<RSAPK><M>${(caf.privateKey as any).M}</M><E>AQAB</E></RSAPK>` +
        `<IDK>100</IDK>` +
      `</DA>` +
      `<FRMA algoritmo="SHA1withRSA">${extractFrma(cafXml)}</FRMA>` +
    `</CAF>` +
    `<TSTED>${tsTed}</TSTED>` +
    `</DD>`;

  console.log('   <DD> length:', ddXml.length);

  // 5. Firmar <DD> con clave del EMISOR (certificado), no del CAF
  console.log('\n✍️  Firmando <DD> con clave del certificado...');
  
  // Extraer clave privada del certificado para firmar
  const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, 'test123');
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const bag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];
  
  let frmtBase64 = '';
  if (bag?.key) {
    const md = forge.md.sha1.create();
    md.update(ddXml, 'latin1');
    const signature = (bag.key as any).sign(md);
    frmtBase64 = forge.util.encode64(signature);
    console.log('   ✅ FRMT firmado:', frmtBase64.substring(0, 40) + '...');
  } else {
    frmtBase64 = 'FIRMA_SIMULADA';
    console.log('   ⚠️  Firma simulada');
  }

  // 6. Construir <TED> completo
  const tedCompleto = `<?xml version="1.0" encoding="ISO-8859-1"?>\n<TED version="1.0">${ddXml}<FRMT algoritmo="SHA1withRSA">${frmtBase64}</FRMT></TED>`;

  // Guardar TED
  const tedPath = path.join(DTE_DIR, 'ted-completo.xml');
  if (!fs.existsSync(DTE_DIR)) fs.mkdirSync(DTE_DIR, { recursive: true });
  fs.writeFileSync(tedPath, tedCompleto, 'utf-8');
  console.log('\n✅ <TED> completo:', path.relative(ROOT_DIR, tedPath));

  // 7. Codificar TED completo en PDF417
  console.log('\n🎨 Codificando TED completo en PDF417...');
  
  // Usar binary string para ISO-8859-1
  const tedBinary = Buffer.from(tedCompleto, 'latin1').toString('binary');
  
  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: 'pdf417',
    text: tedBinary,
    scale: 2,
    height: 10,
    includetext: false,
    columns: 16,
    eclevel: 2,
  });

  const barcodePath = path.join(DTE_DIR, 'ted-pdf417.png');
  fs.writeFileSync(barcodePath, barcodeBuffer);
  console.log('   ✅ PDF417 generado (' + tedCompleto.length + ' bytes)\n');

  // 8. Generar PDF tamaño carta
  console.log('📄 Generando PDF carta...');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = 216;
  let y = 20;

  // Encabezado
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text('EMISOR DE PRUEBA', pageWidth / 2, y, { align: 'center' });
  y += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('Venta de Alimentos', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('Av. Siempre Viva 123', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('Santiago - Santiago', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('RUT: 76.123.456-0', pageWidth / 2, y, { align: 'center' });
  y += 15;

  pdf.line(20, y, pageWidth - 20, y);
  y += 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('BOLETA ELECTRONICA', pageWidth / 2, y, { align: 'center' });
  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('Folio: 1', 20, y);
  pdf.text('Fecha: 2026-11-14', pageWidth - 20, y, { align: 'right' });
  y += 10;

  pdf.text('RUT Receptor: 66.666.666-6', 20, y);
  y += 8;
  pdf.text('Nombre: CONSUMIDOR FINAL', 20, y);
  y += 15;

  pdf.line(20, y, pageWidth - 20, y);
  y += 10;

  pdf.setFont('helvetica', 'bold');
  pdf.text('Cant.', 20, y);
  pdf.text('Descripcion', 40, y);
  pdf.text('P. Unit.', 140, y);
  pdf.text('Total', 180, y);
  y += 8;
  pdf.line(20, y, pageWidth - 20, y);
  y += 8;

  pdf.setFont('helvetica', 'normal');
  pdf.text('1', 20, y);
  pdf.text('Producto de prueba', 40, y);
  pdf.text('$840', 140, y);
  pdf.text('$840', 180, y);
  y += 14;

  pdf.line(20, y, pageWidth - 20, y);
  y += 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Neto: $840', pageWidth - 20, y, { align: 'right' });
  y += 8;
  pdf.text('IVA (19%): $160', pageWidth - 20, y, { align: 'right' });
  y += 8;
  pdf.text('TOTAL: $1.000', pageWidth - 20, y, { align: 'right' });
  y += 30;

  // TIMBRE PDF417
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('TIMBRE ELECTRONICO', 20, y);
  y += 8;

  const barcodeImage = barcodeBuffer.toString('base64');
  // Tamaño mínimo 25mm x 15mm según SII, usar 60mm x 30mm para mejor lectura
  pdf.addImage(`data:image/png;base64,${barcodeImage}`, 'PNG', 20, y, 60, 30);

  y += 38;
  pdf.setFontSize(8);
  pdf.text('FOLIO: 1 | FECHA: 2026-11-14', 20, y);
  y += 5;
  pdf.text('RUT: 76.123.456-0', 20, y);
  y += 5;
  pdf.text('RESOLUCION: 0 - 2024-01-01', 20, y);

  const pdfPath = path.join(DTE_DIR, 'ted-final.pdf');
  pdf.save(pdfPath);

  console.log(`\n✅ PDF: ${path.relative(ROOT_DIR, pdfPath)}`);
  console.log('📏 Tamaño: Carta (216mm x 279mm)');
  console.log('🎯 Timbre PDF417: 60mm x 30mm');
  console.log('📋 TED XML: ' + path.relative(ROOT_DIR, tedPath));
  console.log('🖼️  PNG: ' + path.relative(ROOT_DIR, barcodePath));
  
  console.log('\n📤 Sube este PDF a: https://dte.blumi.cl/validador');
}

function extractFrma(cafXml: string): string {
  const match = cafXml.match(/<FRMA[^>]*>([^<]+)<\/FRMA>/);
  return match ? match[1] : '';
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
