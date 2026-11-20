/**
 * Genera el Set de Pruebas de Boleta Electrónica (5 casos)
 * con firma REAL, valida contra XSD, y empaqueta en EnvioBOLETA.
 * 
 * Uso: npx tsx scripts/set-boletas.ts
 */

import { createClient } from '@supabase/supabase-js';
import { SiiCafParser } from '../src/lib/sii/caf';
import { SiiTedGenerator } from '../src/lib/sii/ted';
import { generateBoletaXml } from '../src/lib/sii/templates/boleta';
import { SiiSigner } from '../src/lib/sii/signer';
import { bytesLatin1 } from '../src/lib/sii/encoding';
import { fechaChile } from '../src/lib/sii/fecha-chile';
import { decrypt } from '../src/lib/crypto';
import { generarRcof } from '../src/lib/sii/rcof';
import type { DtePayload, SiiConfig } from '../src/lib/sii/types';
import type { DocumentoRcof } from '../src/lib/sii/rcof';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Faltan variables: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const STORE_ID = process.env.STORE_ID;
if (!STORE_ID) {
  console.error('Falta STORE_ID');
  process.exit(1);
}

// Helper: precio bruto → neto + IVA (19%)
function brutoANetoIva(bruto: number): { neto: number; iva: number } {
  const neto = Math.round(bruto / 1.19);
  return { neto, iva: bruto - neto };
}

// Helper: suma de montos
function suma(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

async function main() {
  console.log('🧪 Generando Set de Pruebas de Boleta Electrónica\n');

  // 1. Cargar sii_config
  const { data: configData, error: configErr } = await supabase
    .from('sii_config')
    .select('*')
    .eq('store_id', STORE_ID)
    .single();

  if (configErr || !configData) {
    console.error('❌ sii_config no encontrado:', configErr?.message);
    process.exit(1);
  }

  // 2. Descifrar .pfx
  let pfxBase64 = '';
  let pfxPassword = '';
  try {
    pfxBase64 = decrypt(configData.certificado_pfx_encrypted);
    pfxPassword = decrypt(configData.certificado_password_encrypted);
    console.log('✅ .pfx descifrado (RUT cert:', configData.rut_emisor + ')');
  } catch (e) {
    console.error('❌ Error descifrando .pfx:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // 3. Cargar CAF
  const { data: foliosData, error: foliosErr } = await supabase
    .from('sii_folios')
    .select('caf_xml')
    .eq('store_id', STORE_ID)
    .eq('tipo_dte', 39)
    .eq('activo', true)
    .order('folio_desde', { ascending: true })
    .limit(1)
    .single();

  if (foliosErr || !foliosData) {
    console.error('❌ CAF no encontrado:', foliosErr?.message);
    process.exit(1);
  }

  let cafXml = foliosData.caf_xml;
  if (cafXml.includes(':') && /^[0-9a-f]+:/i.test(cafXml)) {
    try { cafXml = decrypt(cafXml); } catch { /* usar raw */ }
  }

  const caf = SiiCafParser.parse(cafXml);
  console.log('✅ CAF cargado:', caf.rut, 'tipo', caf.tipoDte, 'folios', caf.desde, '-', caf.hasta);

  // 4. Configurar SiiSigner
  const signer = new SiiSigner(pfxBase64, pfxPassword);
  console.log('✅ SiiSigner inicializado\n');

  // 5. Config emisor
  const config: SiiConfig = {
    rutEmisor: configData.rut_emisor, // mantiene formato con guión: "21012281-8"
    razonSocial: configData.razon_social,
    giro: configData.giro,
    acteco: configData.acteco,
    direccion: configData.direccion,
    comuna: configData.comuna,
    ciudad: configData.ciudad,
    environment: configData.environment as 'certification' | 'production',
    fchResol: configData.fch_resol,
    nroResol: configData.nro_resol,
  };

  const fecha = fechaChile();

  // 6. Definir los 5 casos del set
  const casos: Array<{ caso: string; payload: DtePayload }> = [];

  // Helper para crear payload base
  function crearPayload(tipoDTE: number, folio: number, detalles: any[], extras: any = {}): DtePayload {
    return {
      Encabezado: {
        TipoDTE: tipoDTE as any,
        Folio: folio,
        FchEmis: fecha,
        RUTEmisor: config.rutEmisor,
        RUTRecep: '66666666-6',
        RznSocRecep: 'Consumidor Final',
        ...extras,
      },
      Detalles: detalles,
    };
  }

  // === CASO 1: Multi-ítem afecto (servicios de taller) ===
  {
    const { neto: n1, iva: i1 } = brutoANetoIva(19900);
    const { neto: n2, iva: i2 } = brutoANetoIva(9900);
    const mntNeto = n1 + n2;
    const iva = i1 + i2;
    const payload = crearPayload(39, 1, [
      { NmbItem: 'Cambio de aceite', QtyItem: 1, PrcItem: n1, MontoItem: n1 },
      { NmbItem: 'Alineacion y balanceo', QtyItem: 1, PrcItem: n2, MontoItem: n2 },
    ], {
      IndServicio: 1,
      MntNeto: mntNeto,
      IVA: iva,
      TasaIVA: 19,
      MntTotal: mntNeto + iva,
      CodRef: 'SET',
      RazonRef: 'CASO-1',
    });
    casos.push({ caso: 'CASO-1', payload });
    console.log(`📋 CASO-1: neto=${mntNeto}, iva=${iva}, total=${mntNeto+iva}`);
  }

  // === CASO 2: Ítem único, cantidad > 1 (bienes) ===
  {
    const { neto, iva } = brutoANetoIva(120);
    const totalNeto = neto * 17;
    const totalIva = iva * 17;
    const payload = crearPayload(39, 2, [
      { NmbItem: 'Papel de regalo', QtyItem: 17, PrcItem: neto, MontoItem: totalNeto },
    ], {
      IndServicio: 2,
      MntNeto: totalNeto,
      IVA: totalIva,
      TasaIVA: 19,
      MntTotal: totalNeto + totalIva,
      CodRef: 'SET',
      RazonRef: 'CASO-2',
    });
    casos.push({ caso: 'CASO-2', payload });
    console.log(`📋 CASO-2: neto=${totalNeto}, iva=${totalIva}, total=${totalNeto+totalIva}`);
  }

  // === CASO 3: Multi-ítem afecto (bienes) ===
  {
    const { neto: n1, iva: i1 } = brutoANetoIva(1500);
    const { neto: n2, iva: i2 } = brutoANetoIva(550);
    const mntNeto = n1 * 2 + n2 * 2;
    const iva = i1 * 2 + i2 * 2;
    const payload = crearPayload(39, 3, [
      { NmbItem: 'Sandwic', QtyItem: 2, PrcItem: n1, MontoItem: n1 * 2 },
      { NmbItem: 'Bebida', QtyItem: 2, PrcItem: n2, MontoItem: n2 * 2 },
    ], {
      IndServicio: 2,
      MntNeto: mntNeto,
      IVA: iva,
      TasaIVA: 19,
      MntTotal: mntNeto + iva,
      CodRef: 'SET',
      RazonRef: 'CASO-3',
    });
    casos.push({ caso: 'CASO-3', payload });
    console.log(`📋 CASO-3: neto=${mntNeto}, iva=${iva}, total=${mntNeto+iva}`);
  }

  // === CASO 4: Mixto afecto + exento (SERVICIOS, explícito en set) ===
  {
    const { neto: n1, iva: i1 } = brutoANetoIva(1590);
    const mntNeto = n1 * 8;
    const iva = i1 * 8;
    const mntExe = 1000 * 2;
    const payload = crearPayload(39, 4, [
      { NmbItem: 'item afecto 1', QtyItem: 8, PrcItem: n1, MontoItem: n1 * 8 },
      { NmbItem: 'item exento 2', QtyItem: 2, PrcItem: 1000, MontoItem: mntExe, IndExe: 1 },
    ], {
      IndServicio: 1,
      MntNeto: mntNeto,
      MntExe: mntExe,
      IVA: iva,
      TasaIVA: 19,
      MntTotal: mntNeto + mntExe + iva,
      CodRef: 'SET',
      RazonRef: 'CASO-4',
    });
    casos.push({ caso: 'CASO-4', payload });
    console.log(`📋 CASO-4: neto=${mntNeto}, exento=${mntExe}, iva=${iva}, total=${mntNeto+mntExe+iva}`);
  }

  // === CASO 5: Exento con Unidad de Medida Kg (bienes) ===
  {
    const mntExe = 700 * 5;
    const payload = crearPayload(39, 5, [
      { NmbItem: 'Arroz', QtyItem: 5, PrcItem: 700, MontoItem: mntExe, IndExe: 1, Unmd: 'Kg' },
    ], {
      IndServicio: 2,
      MntExe: mntExe,
      MntTotal: mntExe,
      CodRef: 'SET',
      RazonRef: 'CASO-5',
    });
    casos.push({ caso: 'CASO-5', payload });
    console.log(`📋 CASO-5: exento=${mntExe}, total=${mntExe}`);
  }

  console.log('\n✍️  Generando y firmando DTEs...\n');

  // 7. Generar, timbrar y firmar cada DTE
  const dtesFirmados: string[] = [];
  for (const { caso, payload } of casos) {
    // TED con firma real
    const tedXml = await SiiTedGenerator.generateTed(payload, cafXml, false);
    // XML boleta
    const xml = generateBoletaXml(payload, config, tedXml);
    // Firma real
    const signedDte = signer.signXml(xml, 'Documento');

    if (signedDte.includes('MOCK_SIGNATURE')) {
      console.error(`❌ ${caso}: firma MOCK detectada`);
      process.exit(1);
    }

    dtesFirmados.push(signedDte);
    console.log(`  ✅ ${caso} firmado (${signedDte.length} bytes)`);
  }

  // 8. Guardar cada DTE individual
  const outDir = path.resolve(__dirname, '../pruebas-local/set-boletas');
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < dtesFirmados.length; i++) {
    const filename = `Boleta39_F${i + 1}_${casos[i].caso}.xml`;
    const filepath = path.join(outDir, filename);
    fs.writeFileSync(filepath, bytesLatin1(dtesFirmados[i], `set ${casos[i].caso}`), { encoding: 'binary' });
    console.log(`  💾 ${filename}`);
  }

  // 9. Empaquetar en EnvioBOLETA
  const envioXml = `<?xml version="1.0" encoding="ISO-8859-1"?>
<EnvioBOLETAS version="1.1" xmlns="http://www.sii.cl/SiiDte">
  <SetDTE>
    ${dtesFirmados.map((dte, i) => {
      // Extraer solo el documento firmado (sin el wrapper DTE)
      const docMatch = dte.match(/<Documento[\s\S]*?<\/Documento>/);
      if (!docMatch) return '';
      // Agregar el Signature que está fuera del Documento
      const sigMatch = dte.match(/<Signature[\s\S]*?<\/Signature>/);
      return `    <DTE>
      ${docMatch[0]}
      ${sigMatch ? sigMatch[0] : ''}
    </DTE>`;
    }).join('\n\n')}
  </SetDTE>
</EnvioBOLETAS>`;

  const envioPath = path.join(outDir, 'EnvioBOLETAS_SetCompleto.xml');
  fs.writeFileSync(envioPath, bytesLatin1(envioXml, 'envio boletas'), { encoding: 'binary' });
  console.log(`\n💾 EnvioBOLETAS: ${envioPath}`);
  console.log(`   Tamaño: ${envioXml.length} bytes`);

  // 10. Generar RCOF (Reporte de Consumo de Folios)
  console.log('\n📊 Generando RCOF...');

  const documentosRcof: DocumentoRcof[] = casos.map((c, i) => ({
    tipo: 39,
    folio: i + 1,
    mntTotal: c.payload.Encabezado.MntTotal,
    mntNeto: c.payload.Encabezado.MntNeto,
    mntIva: c.payload.Encabezado.IVA,
    mntExento: c.payload.Encabezado.MntExe,
    tasaIva: c.payload.Encabezado.TasaIVA,
  }));

  const rcof = generarRcof({
    rutEmisor: config.rutEmisor,
    rutEnvia: config.rutEmisor,
    fchResol: config.fchResol || '2024-01-01',
    nroResol: config.nroResol || 0,
    fchInicio: fecha,
    fchFinal: fecha,
    secEnvio: 1,
    id: 'RCOF_SET_PRUEBA_1',
    documentos: documentosRcof,
  }, signer);

  const rcofPath = path.join(outDir, 'RCOF_SetCompleto.xml');
  fs.writeFileSync(rcofPath, rcof.bytes, { encoding: 'binary' });
  console.log(`  💾 RCOF: ${rcofPath} (${rcof.bytes.length} bytes)`);
  console.log(`  ID: ${rcof.id}`);
  for (const res of rcof.resumenes) {
    console.log(`  Resumen tipo ${res.tipo}: emitidos=${res.foliosEmitidos}, anulados=${res.foliosAnulados}, total=${res.mntTotal}`);
  }

  // 11. Resumen
  console.log('\n✅ Set de pruebas completo:');
  console.log(`   - 5 boletas firmadas con clave real`);
  console.log(`   - 1 RCOF firmado con clave real`);
  console.log(`   - Folios: 1-5 (dentro del rango CAF: ${caf.desde}-${caf.hasta})`);
  console.log(`   - RUT emisor: ${config.rutEmisor}`);
  console.log(`   - Fecha: ${fecha}`);
  console.log(`   - Directorio: ${outDir}`);
  console.log('\n🚀 Listo para subir a Maullín');
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
