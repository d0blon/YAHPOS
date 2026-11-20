/**
 * Genera los 5 PDFs de boleta del set de pruebas con el motor real (jsPDF + PDF417).
 * 
 * Uso: npx tsx scripts/render-set-pdf.ts
 * Salida: pruebas-local/set-boletas/Boleta-*.pdf
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateBoletaPdf } from '../src/lib/sii/pdf-generator';

const outDir = path.resolve(__dirname, '../pruebas-local/set-boletas');

function parseXmlSimple(xml: string) {
  const get = (tag: string) => {
    const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
    return m?.[1]?.trim() ?? '';
  };
  const getAll = (tag: string) => {
    const matches = xml.match(new RegExp(`<${tag}[\\s\\S]*?</${tag}>`, 'g')) || [];
    return matches;
  };

  return {
    tipoDTE: parseInt(get('TipoDTE')) || 39,
    folio: parseInt(get('Folio')) || 0,
    fecha: get('FchEmis'),
    rutEmisor: get('RUTEmisor'),
    rznSocEmisor: get('RznSocEmisor'),
    giro: get('GiroEmisor'),
    direccion: get('DirOrigen'),
    comuna: get('CmnaOrigen'),
    ciudad: get('CiudadOrigen'),
    rutRecep: get('RUTRecep'),
    rznSocRecep: get('RznSocRecep'),
    mntNeto: parseFloat(get('MntNeto')) || 0,
    mntExe: parseFloat(get('MntExe')) || 0,
    iva: parseFloat(get('IVA')) || 0,
    mntTotal: parseFloat(get('MntTotal')) || 0,
    detalles: getAll('<Detalle>').map(d => ({
      nmbItem: d.match(/<NmbItem>([^<]*)/)?.[1] ?? '',
      qtyItem: parseFloat(d.match(/<QtyItem>([^<]*)/)?.[1] ?? '0'),
      prcItem: parseFloat(d.match(/<PrcItem>([^<]*)/)?.[1] ?? '0'),
      montoItem: parseFloat(d.match(/<MontoItem>([^<]*)/)?.[1] ?? '0'),
    })),
  };
}

async function main() {
  console.log('🧾 Generando PDFs de boleta...\n');

  for (let i = 1; i <= 5; i++) {
    const xmlFile = `Boleta39_F${i}_CASO-${i}.xml`;
    const xmlPath = path.join(outDir, xmlFile);
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const d = parseXmlSimple(xml);

    const pdfBytes = await generateBoletaPdf({
      tipoDte: d.tipoDTE,
      folio: d.folio,
      fecha: d.fecha,
      total: d.mntTotal,
      items: d.detalles.map(det => ({
        nombre: det.nmbItem,
        cantidad: det.qtyItem,
        precio: det.prcItem,
        total: det.montoItem,
      })),
      emisor: {
        razonSocial: d.rznSocEmisor,
        rut: d.rutEmisor,
        giro: d.giro,
        direccion: `${d.direccion}, ${d.comuna}, ${d.ciudad}`,
      },
      receptor: {
        rut: d.rutRecep,
        nombre: d.rznSocRecep,
      },
      timbre: '', // Sin PDF417 por ahora (requiere TED firmado completo)
      receipt: {
        message: `CASO-${i} - Set de Pruebas SII`,
        showLogo: false,
        colorMode: 'bw',
        showPoweredBy: true,
        poweredByText: 'YAHPOS!',
      },
    });

    const pdfFile = `Boleta39_F${i}_CASO-${i}.pdf`;
    const pdfPath = path.join(outDir, pdfFile);
    fs.writeFileSync(pdfPath, Buffer.from(pdfBytes));
    console.log(`  ✅ ${pdfFile} (${pdfBytes.length} bytes)`);
  }

  console.log('\n💾 PDFs generados en:', outDir);
  console.log('Abrí cualquiera para ver la representación gráfica real de la boleta.');
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
