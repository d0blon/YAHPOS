import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7);
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const supabase = createAdminClient();

    // 1. Validar API Key
    const { data: keyData, error: keyError } = await supabase
      .from('store_api_keys')
      .select('store_id, scopes, is_active')
      .eq('key_hash', hashedKey)
      .single();

    if (keyError || !keyData) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 });
    }

    if (!keyData.is_active) {
      return NextResponse.json({ error: 'API Key is revoked or inactive' }, { status: 403 });
    }

    // 2. Verificar permisos (scope: inventory:write)
    if (!keyData.scopes.includes('inventory:write')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient scopes' }, { status: 403 });
    }

    // 3. Obtener el cuerpo de la petición
    const body = await req.json();
    const { invoice_number, supplier_name, invoice_url, items, supplier_metadata } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid body format. Expected { items: [{ barcode: string, name: string, quantity: number }] }' }, { status: 400 });
    }

    // 4. Resolver mapeo inteligente para ítems sin código
    const resolvedItems = [];
    for (const item of items) {
      let resolvedBarcode = item.barcode || item.sku || '';

      if (!resolvedBarcode && item.name && supplier_name) {
        try {
          const { data: mapping } = await supabase
            .from('supplier_product_mappings')
            .select('mapped_product_id')
            .eq('store_id', keyData.store_id)
            .eq('supplier_name', supplier_name)
            .eq('supplier_product_name', item.name)
            .maybeSingle();

          if (mapping?.mapped_product_id) {
            const { data: prod } = await supabase
              .from('products')
              .select('barcode, sku')
              .eq('id', mapping.mapped_product_id)
              .maybeSingle();

            if (prod) {
              resolvedBarcode = prod.barcode || prod.sku || '';
            }
          }
        } catch (mapErr) {
          console.error('[Pending Route Mapping Lookup Error]:', mapErr);
        }
      }

      resolvedItems.push({
        ...item,
        barcode: resolvedBarcode
      });
    }

    // 5. Insertar en la tabla de ingresos pendientes
    const { data: adjustment, error: insertError } = await supabase
      .from('pending_inventory_adjustments')
      .insert([{
        store_id: keyData.store_id,
        invoice_number: invoice_number || null,
        supplier_name: supplier_name || null,
        supplier_metadata: supplier_metadata || {},
        invoice_url: invoice_url || null,
        items: resolvedItems,
        status: 'pending'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('[API Bot Pending Inventory Insert Error]:', insertError);
      return NextResponse.json({ error: 'Error al registrar el ingreso pendiente' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      id: adjustment.id,
      message: 'Ingreso pendiente registrado para revisión manual.'
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('[API Bot Pending Inventory Error]:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 });
  }
}
