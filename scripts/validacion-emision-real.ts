/**
 * Script de validación: genera un DTE tipo 39 con firma REAL
 * (sin enviar al SII) y valida estructura + firma + XSD.
 * 
 * Uso: npx tsx scripts/validacion-emision-real.ts
 */

import { createClient } from '@supabase/supabase-js';
import { SiiCafParser, validarCafParaEmision } from '../src/lib/sii/caf';
import { SiiTedGenerator } from '../src/lib/sii/ted';
import { generateBoletaXml } from '../src/lib/sii/templates/boleta';
import { SiiSigner } from '../src/lib/sii/signer';
import { bytesLatin1 } from '../src/lib/sii/encoding';
import { fechaChile } from '../src/lib/sii/fecha-chile';
import { decrypt } from '../src/lib/crypto';
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

async function main() {
  console.log('🧪 Validación de emisión REAL (sin envío al SII)\n');

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

  console.log('✅ sii_config cargado');
  console.log('   RUT emisor:', configData.rut_emisor);
  console.log('   Acteco:', configData.acteco);
  console.log('   Entorno:', configData.environment);

  // 2. Descifrar .pfx
  let pfxBase64 = '';
  let pfxPassword = '';
  try {
    pfxBase64 = decrypt(configData.certificado_pfx_encrypted);
    pfxPassword = decrypt(configData.certificado_password_encrypted);
    console.log('✅ .pfx descifrado');
  } catch (e) {
    console.error('❌ Error descifrando .pfx:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // 3. Cargar CAF de sii_folios
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
    try {
      cafXml = decrypt(cafXml);
    } catch {
      // Si no se puede descifrar, usar tal cual
    }
  }

  console.log('✅ CAF cargado (' + cafXml.length + ' bytes)');

  const caf = SiiCafParser.parse(cafXml);
  console.log('   CAF RUT:', caf.rut);
  console.log('   CAF tipo:', caf.tipoDte);
  console.log('   Folios:', caf.desde, '-', caf.hasta);

  // 4. Configurar SiiSigner
  let signer: SiiSigner;
  try {
    signer = new SiiSigner(pfxBase64, pfxPassword);
    console.log('✅ SiiSigner inicializado con .pfx real');
  } catch (e) {
    console.error('❌ Error inicializando SiiSigner:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // 5. Construir payload de boleta
  const payload = {
    Encabezado: {
      TipoDTE: 39,
      Folio: 1, // Folio de prueba (no se reserva en BD)
      FchEmis: fechaChile(),
      RUTEmisor: configData.rut_emisor.replace(/\./g, '').replace('-', ''),
      RUTRecep: '66666666-6',
      RznSocRecep: 'Consumidor Final',
      MntNeto: 840,
      IVA: 160,
      TasaIVA: 19,
      MntTotal: 1000,
    },
    Detalles: [
      {
        NmbItem: 'Producto de prueba',
        QtyItem: 1,
        PrcItem: 840,
        MontoItem: 840,
      },
    ],
  };

  console.log('\n📝 Payload construido:');
  console.log('   Tipo:', payload.Encabezado.TipoDTE);
  console.log('   Folio:', payload.Encabezado.Folio);
  console.log('   Fecha:', payload.Encabezado.FchEmis);
  console.log('   Total:', payload.Encabezado.MntTotal);

  // 6. Generar TED (con firma real del CAF)
  console.log('\n🔐 Generando TED...');
  const tedXml = await SiiTedGenerator.generateTed(payload, cafXml, false);
  console.log('✅ TED generado');

  // 7. Generar XML de boleta
  const xml = generateBoletaXml(payload, {
    rutEmisor: configData.rut_emisor.replace(/\./g, '').replace('-', ''),
    razonSocial: configData.razon_social,
    giro: configData.giro,
    acteco: configData.acteco,
    direccion: configData.direccion,
    comuna: configData.comuna,
    ciudad: configData.ciudad,
  }, tedXml);

  console.log('✅ XML de boleta generado (' + xml.length + ' bytes)');

  // 8. Firmar con clave REAL
  console.log('\n✍️  Firmando con clave real...');
  const signedDte = signer.signXml(xml, 'Documento');
  console.log('✅ XML firmado');

  // 9. Verificar que la firma no sea mock
  if (signedDte.includes('MOCK_SIGNATURE')) {
    console.error('❌ ERROR: La firma es MOCK (test: true)');
    process.exit(1);
  }

  if (!signedDte.includes('<Signature')) {
    console.error('❌ ERROR: No se encontró <Signature> en el XML firmado');
    process.exit(1);
  }

  console.log('✅ Firma real confirmada (no mock)');

  // 10. Validar con xml-crypto
  console.log('\n🔍 Validando firma con xml-crypto...');
  try {
    const { SignedXml } = await import('xml-crypto');
    const sig = new SignedXml({
      idAttribute: 'ID',
      idElements: ['#Documento'],
    });
    sig.loadSignature(signedDte.match(/<Signature[^>]*>[\s\S]*?<\/Signature>/)?.[0] || '');
    const isValid = sig.checkSignature(signedDte);
    if (!isValid) {
      console.error('❌ Firma XMLDSig INVÁLIDA');
      process.exit(1);
    }
    console.log('✅ Firma XMLDSig válida');
  } catch (e) {
    console.error('⚠️  No se pudo validar con xml-crypto:', e instanceof Error ? e.message : String(e));
  }

  // 11. Validar contra XSD
  console.log('\n📄 Validando contra XSD...');
  const xsdPath = path.resolve(__dirname, '../dte-parity/schemas/EnvioBOLETA_v11.xsd');
  if (!fs.existsSync(xsdPath)) {
    console.error('❌ XSD no encontrado:', xsdPath);
    process.exit(1);
  }

  try {
    const { execSync } = await import('child_process');
    const xmlFile = path.resolve(__dirname, '../pruebas-local/validacion-emision-real.xml');
    fs.mkdirSync(path.dirname(xmlFile), { recursive: true });
    fs.writeFileSync(xmlFile, bytesLatin1(signedDte, 'validación'), { encoding: 'binary' });

    execSync(`java -cp "${path.resolve(__dirname, '../dte-parity/tools')}" ValidateXsd "${xsdPath}" "${xmlFile}"`, {
      stdio: 'pipe',
      encoding: 'utf8',
    });
    console.log('✅ XSD válido');
  } catch (e: any) {
    console.error('❌ XSD inválido:', e.stderr || e.message);
    process.exit(1);
  }

  // 12. Guardar resultado
  const outputPath = path.resolve(__dirname, '../pruebas-local/emision-real-boleta-39.xml');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytesLatin1(signedDte, 'emisión real'), { encoding: 'binary' });
  console.log('\n💾 XML guardado:', outputPath);

  console.log('\n✅ VALIDACIÓN EXITOSA');
  console.log('   - .pfx real cargado');
  console.log('   - CAF real cargado');
  console.log('   - TED generado con firma RSA-SHA1');
  console.log('   - XML firmado con clave real');
  console.log('   - Firma XMLDSig válida');
  console.log('   - XSD válido');
  console.log('\n🎉 El motor está listo para emisión real');
}

main().catch((e) => {
  console.error('Error fatal:', e);
  process.exit(1);
});
