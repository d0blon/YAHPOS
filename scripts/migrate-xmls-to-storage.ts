import { createClient } from '@supabase/supabase-js';
import path from 'path';

// dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Necesitamos service role para bypass RLS si es necesario

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Falta configuración de Supabase en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateXmls() {
  console.log('🚀 Iniciando migración de XMLs a Storage...');

  // 1. Obtener documentos que no tengan storage_path o que necesiten respaldo
  const { data: docs, error } = await supabase
    .from('sii_documents')
    .select('id, store_id, tipo_dte, folio, xml_content, storage_path')
    .is('storage_path', null); // Solo los que no han sido migrados

  if (error) {
    console.error('❌ Error al consultar documentos:', error.message);
    return;
  }

  if (!docs || docs.length === 0) {
    console.log('✅ No hay documentos pendientes de migración.');
    return;
  }

  console.log(`📦 Encontrados ${docs.length} documentos para migrar.`);

  for (const doc of docs) {
    try {
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const storagePath = `${doc.store_id}/${year}/${month}/DTE_${doc.tipo_dte}_F${doc.folio}.xml`;

      console.log(`📤 Migrando DTE ${doc.tipo_dte} Folio ${doc.folio} -> ${storagePath}`);

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from('sii-xml-archive')
        .upload(storagePath, doc.xml_content, {
          contentType: 'application/xml',
          upsert: true
        });

      if (uploadError) {
        console.error(`  ❌ Error subiendo a storage:`, uploadError.message);
        continue;
      }

      // Actualizar registro en DB con el path
      const { error: updateError } = await supabase
        .from('sii_documents')
        .update({ storage_path: storagePath })
        .eq('id', doc.id);

      if (updateError) {
        console.error(`  ❌ Error actualizando DB:`, updateError.message);
      } else {
        console.log(`  ✅ Migrado exitosamente.`);
      }

    } catch (err: any) {
      console.error(`  💥 Error inesperado en documento ${doc.id}:`, err.message);
    }
  }

  console.log('\n🏁 Migración finalizada.');
}

migrateXmls();
