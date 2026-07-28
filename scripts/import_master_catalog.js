const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const jsonPath = path.join(__dirname, '../public/data/catalog.json');
  console.log(`Leyendo datos desde: ${jsonPath}`);
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`Archivo no encontrado: ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  let data = [];
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    console.error('Error parseando el JSON:', e);
    process.exit(1);
  }

  console.log(`Total de registros en JSON: ${data.length}`);

  // Deduplicar por SKU y mapear
  const uniqueItemsMap = new Map();
  let duplicates = 0;

  for (const item of data) {
    if (!item.sku) continue;
    
    const sku = String(item.sku).trim();
    
    if (uniqueItemsMap.has(sku)) {
      duplicates++;
    } else {
      uniqueItemsMap.set(sku, {
        sku: sku,
        name: item.name || '',
        brand: item.brand || null,
        category: (item.categories && item.categories.length > 0) ? item.categories[0] : null,
        description: null, // Se enriquece después
        image_url: (item.images && item.images.length > 0) ? item.images[0] : null,
        reference_price: item.price || null
      });
    }
  }

  const uniqueItems = Array.from(uniqueItemsMap.values());
  console.log(`Duplicados ignorados: ${duplicates}`);
  console.log(`Registros únicos a importar: ${uniqueItems.length}`);

  const BATCH_SIZE = 500;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < uniqueItems.length; i += BATCH_SIZE) {
    const batch = uniqueItems.slice(i, i + BATCH_SIZE);
    
    try {
      const { data: result, error } = await supabase
        .from('master_catalog_products')
        .upsert(batch, { onConflict: 'sku', ignoreDuplicates: false });

      if (error) {
        console.error(`Error en el batch ${i} - ${i + batch.length}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        console.log(`[${Math.min(i + batch.length, uniqueItems.length)}/${uniqueItems.length}] Batch importado exitosamente.`);
      }
    } catch (err) {
      console.error(`Excepción en el batch ${i} - ${i + batch.length}:`, err);
      errorCount += batch.length;
    }
  }

  console.log('--- Resumen de importación ---');
  console.log(`Total importados: ${successCount}`);
  console.log(`Errores: ${errorCount}`);
  console.log('------------------------------');
}

run();
