
import { SiiEngine } from '../src/lib/sii/engine';
import { DtePayload } from '../src/lib/sii/types';
import * as fs from 'fs';
import * as path from 'path';

async function generateSimulationReport() {
  console.log('🚀 Generando Reporte de Simulación SII...');

  const storeId = process.env.STORE_ID;
  if (!storeId) throw new Error('Falta STORE_ID');
  const engine = new SiiEngine();
  await engine.initForStore(storeId);

  const setDePruebas = [
    { tipo: 39, desc: "Boleta Electrónica Afecta" },
    { tipo: 41, desc: "Boleta Electrónica Exenta" },
    { tipo: 33, desc: "Factura Electrónica Afecta" },
    { tipo: 33, desc: "Factura Electrónica (Cliente Empresa)", receptor: { rut: "77777777-7", razon: "Empresa de Pruebas SpA", giro: "Servicios", dir: "Calle Falsa 123" } },
    { tipo: 52, desc: "Guía de Despacho (Traslado)" },
    { tipo: 61, desc: "Nota de Crédito (Anula Factura)", ref: { tipo: 33, folio: 1, fch: "2026-05-01", razon: "ANULACION POR ERROR" } },
    { tipo: 61, desc: "Nota de Crédito (Corrige Texto)", ref: { tipo: 33, folio: 2, fch: "2026-05-01", razon: "CORRIGE DIRECCION", cod: 2 } },
    { tipo: 56, desc: "Nota de Débito (Aumento de Intereses)", ref: { tipo: 33, folio: 1, fch: "2026-05-01", razon: "INTERESES POR MORA" } },
    { tipo: 33, desc: "Factura con ítems exentos", exento: true },
    { tipo: 39, desc: "Boleta con múltiples ítems", multiItem: true }
  ];

  let reportMd = `# Reporte de Simulación de Certificación SII\n\n`;
  reportMd += `Fecha: ${new Date().toLocaleString()}\n`;
  reportMd += `Tienda: ${storeId}\n\n`;

  for (let i = 0; i < setDePruebas.length; i++) {
    const prueba = setDePruebas[i];
    console.log(`Ejecutando Caso ${i + 1}: ${prueba.desc}...`);

    const payload: DtePayload = {
      Encabezado: {
        TipoDTE: prueba.tipo as any,
        Folio: 0,
        FchEmis: new Date().toISOString().split('T')[0],
        MntTotal: prueba.tipo === 41 || (prueba as any).exento ? 1000 : 1190,
        MntExe: (prueba.tipo === 41 || (prueba as any).exento) ? 1000 : 0,
        RUTRecep: (prueba as any).receptor?.rut || '66666666-6',
        RznSocRecep: (prueba as any).receptor?.razon,
        GiroRecep: (prueba as any).receptor?.giro,
        DirRecep: (prueba as any).receptor?.dir,
        Referencias: (prueba as any).ref ? [
          {
            TpoDocRef: (prueba as any).ref.tipo,
            FolioRef: (prueba as any).ref.folio,
            FchRef: (prueba as any).ref.fch,
            RazonRef: (prueba as any).ref.razon,
            CodRef: (prueba as any).ref.cod
          }
        ] : undefined
      },
      Detalles: (prueba as any).multiItem ? [
        { NmbItem: 'Item 1', QtyItem: 1, PrcItem: 500, MontoItem: 500 },
        { NmbItem: 'Item 2', QtyItem: 1, PrcItem: 500, MontoItem: 500 }
      ] : [
        {
          NmbItem: `Producto ${prueba.desc}`,
          QtyItem: 1,
          PrcItem: 1000,
          MontoItem: 1000,
          IndExe: (prueba.tipo === 41 || (prueba as any).exento) ? 1 : undefined
        }
      ]
    };

    const result = await engine.emitirDocumento(payload, storeId, { test: true });

    if (result.success) {
      reportMd += `## Caso ${i + 1}: ${prueba.desc}\n`;
      reportMd += `- **Folio**: ${result.folio}\n`;
      reportMd += `- **Estado**: FIRMADO (MOCK)\n`;
      reportMd += `- **Total**: $${payload.Encabezado.MntTotal}\n\n`;
      reportMd += `### XML Generado:\n\`\`\`xml\n${result.xml}\n\`\`\`\n\n`;
      reportMd += `---\n\n`;
    } else {
      reportMd += `## Caso ${i + 1}: ${prueba.desc}\n`;
      reportMd += `❌ **Error**: ${result.error}\n\n---\n\n`;
    }
  }

  const reportPath = path.join(process.cwd(), 'simulation-report.md');
  fs.writeFileSync(reportPath, reportMd);
  console.log(`✅ Reporte generado en: ${reportPath}`);
}

generateSimulationReport();
