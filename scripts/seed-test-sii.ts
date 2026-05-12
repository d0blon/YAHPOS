import { createAdminClient } from '../src/lib/supabase';
import { encrypt } from '../src/lib/crypto';

async function seedSii() {
  const supabase = createAdminClient();
  const storeId = 'c828f16e-4572-4700-97e6-66b6180d6a9d';

  console.log('🌱 Sembrando datos de prueba SII para la tienda Austral Market...');

  // Mock de un certificado PFX (base64)
  // Nota: Este es un mock, no funcionará para firmas reales ante el SII 
  // pero permitirá que el motor pase la fase de inicialización y guardado en DB.
  const mockPfxBase64 = Buffer.from('MOCK_PFX_CONTENT').toString('base64');
  const encryptedPfx = encrypt(mockPfxBase64);
  const encryptedPassword = encrypt('test_password');

  // 1. Configuración SII
  const { error: configError } = await supabase
    .from('sii_config')
    .upsert({
      store_id: storeId,
      rut_emisor: '76123456-7',
      razon_social: 'Austral Market SpA',
      giro: 'Venta de Alimentos',
      direccion: 'Av. Siempre Viva 123',
      comuna: 'Puerto Montt',
      ciudad: 'Puerto Montt',
      environment: 'certification',
      certificado_pfx_encrypted: encryptedPfx,
      certificado_password_encrypted: encryptedPassword,
      fch_resol: '2024-01-01',
      nro_resol: 0
    }, { onConflict: 'store_id' });

  if (configError) {
    console.error('❌ Error al sembrar sii_config:', configError);
  } else {
    console.log('✅ Configuración SII sembrada.');
  }

  // 2. Folios (CAF)
  const dteTypes = [33, 39, 41, 52, 56, 61];
  
  for (const tipo of dteTypes) {
    const mockCafXml = `
<AUTORIZACION>
  <CAF>
    <DA>
      <RE>76123456-7</RE>
      <RS>Austral Market Test</RS>
      <TD>${tipo}</TD>
      <RNG><D>1</D><H>1000</H></RNG>
      <FA>2026-05-01</FA>
      <RSAPK><M>tG1RveXdJ0Rgkor/ibYPJ0aIY9t7LkYpquwc+jYmJc/xamhv9kr8N1jv65I+dIioLpudFEVeDEYVz6Tecd9TakVwa9rHJmATxXpx9+N4BJdsz7rH6hOdZGbTkBB3+l+SeCJQZKf4dDoCoKyp5/945KDvUc4k9Wic/x9M8w38LV8=</M><E>AQAB</E></RSAPK>
      <IDK>100</IDK>
    </DA>
    <FRMA algoritmo="SHA1withRSA">MOCK_SIGNATURE</FRMA>
  </CAF>
  <RSASK>MOCK_RSA_KEY</RSASK>
</AUTORIZACION>
    `.trim();

    const { error: folioError } = await supabase
      .from('sii_folios')
      .upsert({
        store_id: storeId,
        tipo_dte: tipo,
        folio_desde: 1,
        folio_hasta: 1000,
        folio_actual: 1,
        caf_xml: mockCafXml,
        activo: true
      }, { onConflict: 'store_id,tipo_dte,folio_desde' });

    if (folioError) {
      console.error(`❌ Error al sembrar sii_folios para tipo ${tipo}:`, folioError);
    } else {
      console.log(`✅ Folios SII (CAF) para tipo ${tipo} sembrados.`);
    }
  }
}

seedSii();

