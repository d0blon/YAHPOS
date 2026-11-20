/**
 * Renderiza las 5 boletas del set de pruebas como HTML visual.
 * 
 * Uso: npx tsx scripts/render-set-html.ts
 * Abre: pruebas-local/set-boletas/set-preview.html
 */

import * as fs from 'fs';
import * as path from 'path';

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
  const getAttr = (tag: string, attr: string) => {
    const m = xml.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i'));
    return m?.[1] ?? '';
  };

  return {
    tipoDTE: get('TipoDTE'),
    folio: get('Folio'),
    fecha: get('FchEmis'),
    rutEmisor: get('RUTEmisor'),
    rznSocEmisor: get('RznSocEmisor'),
    giro: get('GiroEmisor'),
    direccion: get('DirOrigen'),
    comuna: get('CmnaOrigen'),
    ciudad: get('CiudadOrigen'),
    rutRecep: get('RUTRecep'),
    rznSocRecep: get('RznSocRecep'),
    mntNeto: get('MntNeto'),
    mntExe: get('MntExe'),
    iva: get('IVA'),
    mntTotal: get('MntTotal'),
    codRef: get('CodRef'),
    razonRef: get('RazonRef'),
    detalles: getAll('<Detalle>').map(d => ({
      nmbItem: d.match(/<NmbItem>([^<]*)/)?.[1] ?? '',
      qtyItem: d.match(/<QtyItem>([^<]*)/)?.[1] ?? '',
      prcItem: d.match(/<PrcItem>([^<]*)/)?.[1] ?? '',
      montoItem: d.match(/<MontoItem>([^<]*)/)?.[1] ?? '',
      indExe: d.includes('<IndExe>1</IndExe>'),
      unmd: d.match(/<Unmd>([^<]*)/)?.[1] ?? '',
    })),
    tedPresente: xml.includes('<TED'),
    firmaPresente: xml.includes('<Signature'),
    firmaAlgoritmo: getAttr('FRMT', 'algoritmo'),
  };
}

function fmt(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) || 0 : num;
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function boletaHtml(data: ReturnType<typeof parseXmlSimple>, caso: string) {
  return `
    <div class="boleta">
      <div class="header">
        <div class="emisor">
          <h2>${data.rznSocEmisor || 'EMISOR'}</h2>
          <p>RUT: ${data.rutEmisor}</p>
          <p>Giro: ${data.giro}</p>
          <p>${data.direccion}, ${data.comuna}, ${data.ciudad}</p>
        </div>
        <div class="doc-info">
          <h1>BOLETA ELECTRÓNICA</h1>
          <p><strong>N° ${data.folio}</strong></p>
          <p>Tipo ${data.tipoDTE}</p>
          <p>Fecha: ${data.fecha}</p>
          ${data.codRef ? `<p class="ref">Ref: ${data.codRef} - ${data.razonRef}</p>` : ''}
        </div>
      </div>

      <div class="receptor">
        <h3>RUT: ${data.rutRecep}</h3>
        <p>${data.rznSocRecep}</p>
      </div>

      <table class="items">
        <thead>
          <tr>
            <th>#</th>
            <th>Descripción</th>
            <th>Cant.</th>
            <th>P. Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.detalles.map((d, i) => `
            <tr class="${d.indExe ? 'exento' : ''}">
              <td>${i + 1}</td>
              <td>${d.nmbItem}${d.unmd ? ` <small>(${d.unmd})</small>` : ''}${d.indExe ? ' <span class="badge-exento">Exento</span>' : ''}</td>
              <td>${d.qtyItem}</td>
              <td>${fmt(d.prcItem)}</td>
              <td>${fmt(d.montoItem)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totales">
        ${data.mntNeto ? `<div class="total-row"><span>Monto Neto:</span><span>${fmt(data.mntNeto)}</span></div>` : ''}
        ${data.mntExe ? `<div class="total-row"><span>Monto Exento:</span><span>${fmt(data.mntExe)}</span></div>` : ''}
        ${data.iva ? `<div class="total-row"><span>IVA (19%):</span><span>${fmt(data.iva)}</span></div>` : ''}
        <div class="total-row total-final"><span>TOTAL:</span><span>${fmt(data.mntTotal)}</span></div>
      </div>

      <div class="footer">
        <p class="ted-status">${data.tedPresente ? '✅ TED presente' : '❌ TED ausente'}</p>
        <p class="firma-status">${data.firmaPresente ? `✅ Firmada (${data.firmaAlgoritmo})` : '❌ Sin firma'}</p>
      </div>
    </div>
  `;
}

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Set de Pruebas - Boletas Electrónicas</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
      padding: 2rem;
      color: #1a1a1a;
    }
    h1.page-title {
      text-align: center;
      margin-bottom: 2rem;
      color: #2c3e50;
    }
    .set-info {
      background: #e8f4f8;
      border-left: 4px solid #3498db;
      padding: 1rem;
      margin-bottom: 2rem;
      border-radius: 4px;
    }
    .boleta {
      background: white;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #eee;
    }
    .emisor h2 {
      color: #2c3e50;
      font-size: 1.3rem;
      margin-bottom: 0.5rem;
    }
    .emisor p {
      color: #666;
      font-size: 0.9rem;
      margin: 0.2rem 0;
    }
    .doc-info {
      text-align: right;
    }
    .doc-info h1 {
      color: #e74c3c;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    .doc-info p {
      margin: 0.3rem 0;
      font-size: 0.95rem;
    }
    .doc-info p strong {
      font-size: 1.3rem;
      color: #2c3e50;
    }
    .ref {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      display: inline-block;
      margin-top: 0.5rem;
      font-size: 0.85rem;
    }
    .receptor {
      background: #f8f9fa;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1.5rem;
    }
    .receptor h3 {
      font-size: 1rem;
      margin-bottom: 0.3rem;
    }
    .receptor p {
      color: #666;
      font-size: 0.9rem;
    }
    .items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
    }
    .items th {
      background: #2c3e50;
      color: white;
      padding: 0.8rem;
      text-align: left;
      font-size: 0.9rem;
    }
    .items td {
      padding: 0.8rem;
      border-bottom: 1px solid #eee;
    }
    .items tr.exento {
      background: #fff8e1;
    }
    .badge-exento {
      background: #ffc107;
      color: #333;
      padding: 0.2rem 0.5rem;
      border-radius: 3px;
      font-size: 0.75rem;
      font-weight: bold;
    }
    .totales {
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }
    .total-row.total-final {
      border-top: 2px solid #2c3e50;
      border-bottom: none;
      font-size: 1.2rem;
      font-weight: bold;
      margin-top: 0.5rem;
      padding-top: 0.8rem;
    }
    .footer {
      margin-top: 1.5rem;
      padding-top: 1rem;
      border-top: 1px solid #eee;
      font-size: 0.85rem;
      color: #666;
    }
    .ted-status, .firma-status {
      margin: 0.3rem 0;
    }
    .caso-label {
      display: inline-block;
      background: #3498db;
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <h1 class="page-title">Set de Pruebas - Boletas Electrónicas</h1>
  
  <div class="set-info">
    <strong>RUT Emisor:</strong> 21012281-8<br>
    <strong>Contribuyente:</strong> RODRIGO ALEJANDRO NUNEZ CHAURA<br>
    <strong>Ambiente:</strong> Certificación (maullin.sii.cl)<br>
    <strong>Fecha:</strong> 2026-11-16<br>
    <strong>Folios:</strong> 1-5 (CAF: 1-10)
  </div>

  {{BOLETAS}}
</body>
</html>`;

const boletasHtml = [];
for (let i = 1; i <= 5; i++) {
  const file = `Boleta39_F${i}_CASO-${i}.xml`;
  const filepath = path.join(outDir, file);
  const xml = fs.readFileSync(filepath, 'utf8');
  const data = parseXmlSimple(xml);
  boletasHtml.push(`<div class="caso-label">CASO-${i}</div>${boletaHtml(data, `CASO-${i}`)}`);
}

const finalHtml = html.replace('{{BOLETAS}}', boletasHtml.join('\n'));
const outputPath = path.join(outDir, 'set-preview.html');
fs.writeFileSync(outputPath, finalHtml, 'utf8');
console.log('✅ Preview generado:', outputPath);
console.log('Abrí el archivo en tu navegador para ver las 5 boletas renderizadas.');
