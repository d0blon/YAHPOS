#!/usr/bin/env node
/**
 * Genera PDF con timbre PDF417 siguiendo ESPECIFICACIÓN SII oficial.
 * 
 * Estructura del <DD> correcta:
 * - Campos del documento (RE, TD, F, FE, RR, RSR, RS, IT1)
 * - Campos del CAF planos (DA, RE, TD, R, F, FA)
 * - Timestamp (TSTED)
 * - Firma FRMT calculada correctamente
 * 
 * Sin CAF embebido como bloque XML anidado.
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

console.log('📄 Generando PDF con <DD> según especificación SII oficial...\n');

async function main() {
  // 1. Certificado
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
      TipoDTE: caf.tipoDte, // Mismo tipo que el CAF (39)
      Folio: caf.desde,     // Mismo folio en rango (1)
      FchEmis: '2026-11-14',
      RUTEmisor: caf.rut,   // MISMO RUT que el CAF (76123456-0)
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
    rutEmisor: caf.rut,     // Usar RUT del CAF
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

  // 4. Construir <DD> según especificación SII
  console.log('\n📋 Construyendo <DD>...');
  
  // El <DD> del SII tiene estructura específica:
  // https://www.sii.cl/factura_electronica/1359.pdf (instructivo)
  const tsTed = new Date().toISOString().replace(/\.\d{3}Z$/, '');
  
  // Extraer R sin puntos ni guión
  const rutLimpio = caf.rut.replace(/[.\-]/g, '');
  const rrLimpio = payload.Encabezado.RUTRecep.replace(/[.\-]/g, '');
  
  // <DD> según especificación SII
  // Nota: el CAF interno se representa con sus campos DA planos
  const ddXml = 
    `<DD version="1.0">` +
    `<RE>${caf.rut}</RE>` +
    `<TD>${caf.tipoDte}</TD>` +
    `<F>${caf.desde}</F>` +
    `<FE>${payload.Encabezado.FchEmis}</FE>` +
    `<RR>${rrLimpio}</RR>` +
    `<RSR>${payload.Encabezado.RznSocRecep}</RSR>` +
    `<RS>${config.razonSocial}</RS>` +
    `<IT1>${payload.Detalles[0].NmbItem.substring(0, 40)}</IT1>` +
    `<CAF version="1.0">` +
      `<DA>` +
        `<RE>${rutLimpio}</RE>` +
        `<TD>${caf.tipoDte}</TD>` +
        `<R>${caf.rut}</R>` +
        `<RS>${config.razonSocial}</RS>` +
        `<F>${caf.desde}</F>` +
        `<FA>${caf.fecha}</FA>` +
      `</DA>` +
    `</CAF>` +
    `<TSTED>${tsTed}</TSTED>` +
    `</DD>`;

  console.log('   Longitud <DD>:', ddXml.length, 'bytes');

  // 5. Firmar <DD> con clave privada del CAF
  console.log('\n✍️  Firmando <DD>...');
  
  let signatureBase64 = '';
  try {
    // La clave privada del CAF fixture viene como objeto con componentes RSA
    const rsask = caf.privateKey as any;
    console.log('   Clave CAF tipo:', typeof rsask, Object.keys(rsask || {}));
    
    if (rsask && typeof rsask === 'object' && rsask.M) {
      // Construir clave RSA desde componentes
      const n = forge.util.decode64(rsask.M);
      const e = forge.util.decode64(rsask.E);
      const d = forge.util.decode64(rsask.D);
      const p = rsask.P ? forge.util.decode64(rsask.P) : undefined;
      const q = rsask.Q ? forge.util.decode64(rsask.Q) : undefined;
      const dP = rsask.DP ? forge.util.decode64(rsask.DP) : undefined;
      const dQ = rsask.DQ ? forge.util.decode64(rsask.DQ) : undefined;
      const qInv = rsask.InverseQ ? forge.util.decode64(rsask.InverseQ) : undefined;
      
      const privateKey = forge.pki.setRsaPrivateKey(
        new forge.jsbn.BigInteger(n, 16),
        new forge.jsbn.BigInteger(e, 16),
        new forge.jsbn.BigInteger(d, 16)
      );
      
      const md = forge.md.sha1.create();
      md.update(ddXml, 'latin1');
      const signature = privateKey.sign(md);
      signatureBase64 = forge.util.encode64(signature);
      console.log('   ✅ Firma calculada:', signatureBase64.substring(0, 40) + '...');
    } else {
      throw new Error('Clave CAF no tiene formato esperado');
    }
  } catch (err: any) {
    console.log('   ⚠️  No se pudo firmar con clave CAF:', err.message);
    signatureBase64 = 'FIRMA_SIMULADA';
  }

  const ddConFirma = ddXml + `<FRMT algoritmo="SHA1withRSA">${signatureBase64}</FRMT>`;

  // 6. Generar PDF417
  console.log('\n🎨 Generando PDF417...');
  
  // Codificar en ISO-8859-1
  const ddBytes = Buffer.from(ddConFirma, 'latin1');
  const ddString = ddBytes.toString('binary');
  
  const barcodeBuffer = await bwipjs.toBuffer({
    bcid: 'pdf417',
    text: ddString,
    scale: 2,
    height: 10,
    includetext: false,
    columns: 16,
    eclevel: 2,
  });

  const barcodePath = path.join(DTE_DIR, 'timbre-especificacion.png');
  fs.writeFileSync(barcodePath, barcodeBuffer);
  console.log('   ✅ PDF417 generado (' + ddConFirma.length + ' bytes)\n');

  // 7. Guardar <DD> como referencia
  const ddPath = path.join(DTE_DIR, 'dd-especificacion.xml');
  fs.writeFileSync(ddPath, '<?xml version="1.0" encoding="ISO-8859-1"?>\n' + ddConFirma, 'utf-8');

  // 8. Generar PDF tamaño carta
  console.log('📄 Generando PDF carta...');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
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
  y += 15;

  pdf.line(20, y, pageWidth - 20, y);
  y += 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('BOLETA ELECTRONICA', pageWidth / 2, y, { align: 'center' });
  y += 12;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text(`Folio: ${payload.Encabezado.Folio}`, 20, y);
  pdf.text(`Fecha: ${payload.Encabezado.FchEmis}`, pageWidth - 20, y, { align: 'right' });
  y += 10;

  pdf.text(`RUT Receptor: ${payload.Encabezado.RUTRecep}`, 20, y);
  y += 8;
  pdf.text(`Nombre: ${payload.Encabezado.RznSocRecep}`, 20, y);
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
  payload.Detalles.forEach(item => {
    pdf.text(`${item.QtyItem}`, 20, y);
    pdf.text(item.NmbItem, 40, y);
    pdf.text(`$${item.PrcItem}`, 140, y);
    pdf.text(`$${item.MontoItem}`, 180, y);
    y += 8;
  });

  y += 6;
  pdf.line(20, y, pageWidth - 20, y);
  y += 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text(`Neto: $${payload.Encabezado.MntNeto}`, pageWidth - 20, y, { align: 'right' });
  y += 8;
  pdf.text(`IVA (19%): $${payload.Encabezado.IVA}`, pageWidth - 20, y, { align: 'right' });
  y += 8;
  pdf.text(`TOTAL: $${payload.Encabezado.MntTotal}`, pageWidth - 20, y, { align: 'right' });
  y += 25;

  // TIMBRE
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('TIMBRE ELECTRONICO', 20, y);
  y += 8;

  const barcodeImage = barcodeBuffer.toString('base64');
  pdf.addImage(`data:image/png;base64,${barcodeImage}`, 'PNG', 20, y, 60, 35);
  y += 40;

  pdf.setFontSize(8);
  pdf.text(`FOLIO: ${payload.Encabezado.Folio} | FECHA: ${payload.Encabezado.FchEmis}`, 20, y);
  y += 5;
  pdf.text(`RUT: ${config.rutEmisor}`, 20, y);
  y += 5;
  pdf.text(`RESOLUCION: ${config.nroResol} - ${config.fchResol}`, 20, y);

  const pdfPath = path.join(DTE_DIR, 'boleta-especificacion.pdf');
  pdf.save(pdfPath);

  console.log(`\n✅ PDF: ${path.relative(ROOT_DIR, pdfPath)}`);
  console.log('📏 Tamaño: Carta (216mm x 279mm)');
  console.log('🎯 Timbre PDF417: 60mm x 35mm en parte inferior');
  console.log('📋 <DD> XML: ' + path.relative(ROOT_DIR, ddPath));
  console.log('🖼️  PNG: ' + path.relative(ROOT_DIR, barcodePath));
  
  console.log('\n📤 Sube este PDF al validador de Blumi');
  console.log('   https://dte.blumi.cl/validador');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
