
import { SiiEngine } from '../src/lib/sii/engine';
import { DtePayload } from '../src/lib/sii/types';

async function runFullCertificationSuite() {
  console.log('🚀 Iniciando Suite Completa de Certificación SII (Set de 10 Pruebas)...');

  const storeId = 'c828f16e-4572-4700-97e6-66b6180d6a9d'; 
  const engine = new SiiEngine();

  try {
    console.log(`\n1. Inicializando motor para tienda: ${storeId}...`);
    await engine.initForStore(storeId);
    console.log('✅ Motor inicializado correctamente.');

    const setDePruebas = [
      { tipo: 39, desc: "Boleta Electrónica Afecta" },
      { tipo: 41, desc: "Boleta Electrónica Exenta" },
      { tipo: 33, desc: "Factura Electrónica Afecta" },
      { tipo: 33, desc: "Factura Electrónica (Cliente Empresa)", receptor: { rut: "77777777-7", razon: "Empresa de Pruebas SpA", giro: "Servicios", dir: "Calle Falsa 123", cmna: "SANTIAGO", ciudad: "SANTIAGO" } },
      { tipo: 52, desc: "Guía de Despacho (Traslado)" },
      { tipo: 61, desc: "Nota de Crédito (Anula Factura)", ref: { tipo: 33, folio: 1, fch: "2026-05-01", razon: "ANULACION POR ERROR" } },
      { tipo: 61, desc: "Nota de Crédito (Corrige Texto)", ref: { tipo: 33, folio: 2, fch: "2026-05-01", razon: "CORRIGE DIRECCION", cod: 2 } },
      { tipo: 56, desc: "Nota de Débito (Aumento de Intereses)", ref: { tipo: 33, folio: 1, fch: "2026-05-01", razon: "INTERESES POR MORA" } },
      { tipo: 39, desc: "Boleta MIXTA (Afecto + Exento)", mixed: true },
      { tipo: 33, desc: "Factura con múltiples ítems", multiItem: true }
    ];

    for (let i = 0; i < setDePruebas.length; i++) {
      const prueba = setDePruebas[i];
      console.log(`\n--- [PRUEBA ${i + 1}/10]: ${prueba.desc} ---`);

      const payload: DtePayload = {
        Encabezado: {
          TipoDTE: prueba.tipo as any,
          Folio: 0,
          FchEmis: new Date().toISOString().split('T')[0],
          FchVenc: prueba.tipo === 33 ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : undefined,
          MntTotal: 0, // El motor lo calculará
          RUTRecep: (prueba as any).receptor?.rut || '66666666-6',
          RznSocRecep: (prueba as any).receptor?.razon,
          GiroRecep: (prueba as any).receptor?.giro,
          DirRecep: (prueba as any).receptor?.dir,
          CmnaRecep: (prueba as any).receptor?.cmna,
          CiudadRecep: (prueba as any).receptor?.ciudad,
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
        Detalles: (prueba as any).mixed ? [
          { NmbItem: 'Producto Afecto', QtyItem: 1, PrcItem: 1190, MontoItem: 1190 },
          { NmbItem: 'Producto Exento', QtyItem: 1, PrcItem: 1000, MontoItem: 1000, IndExe: 1 }
        ] : (prueba as any).multiItem ? [
          { NmbItem: 'Item 1', QtyItem: 2, PrcItem: 1000, MontoItem: 2000 },
          { NmbItem: 'Item 2', QtyItem: 1, PrcItem: 5000, MontoItem: 5000 }
        ] : [
          {
            NmbItem: `Producto ${prueba.desc}`,
            QtyItem: 1,
            PrcItem: (prueba.tipo === 41) ? 1000 : 1190,
            MontoItem: (prueba.tipo === 41) ? 1000 : 1190,
            IndExe: (prueba.tipo === 41) ? 1 : undefined
          }
        ]
      };

      const result = await engine.emitirDocumento(payload, storeId, { test: true });

      if (result.success) {
        console.log(`✅ ${prueba.desc} emitida (Folio: ${result.folio})`);
        
        const envioResult = await engine.enviarDocumentoAlSII(result.documentId!, storeId);
        if (envioResult.success) {
          console.log(`✅ Envío exitoso (TrackID: ${(envioResult as any).trackId})`);
        } else {
          console.error(`❌ Falló envío: ${envioResult.error}`);
        }
      } else {
        console.error(`❌ Falló emisión: ${result.error}`);
      }
    }

    console.log('\n🏁 Suite de Certificación finalizada.');

  } catch (error) {
    console.error('💥 Error crítico durante la suite:', error);
  }
}

runFullCertificationSuite();
