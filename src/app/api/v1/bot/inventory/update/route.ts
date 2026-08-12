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
    const updates: { sku: string; quantity: number }[] = body.updates;

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid body format. Expected { updates: [{ sku: string, quantity: number }] }' }, { status: 400 });
    }

    let updatedCount = 0;
    const notFoundSkus: string[] = [];

    // 4. Ejecutar las actualizaciones en la base de datos llamando al RPC
    for (const item of updates) {
      const { sku, quantity } = item;
      if (!sku || typeof quantity !== 'number') continue;

      const { data: rowsUpdated, error: updateError } = await supabase.rpc('increment_product_stock', {
        p_store_id: keyData.store_id,
        p_sku: sku,
        p_quantity: quantity
      });

      if (updateError || rowsUpdated === 0) {
        if (updateError) {
          console.error(`Error updating stock for SKU ${sku}:`, updateError);
        }
        notFoundSkus.push(sku);
      } else {
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      not_found: notFoundSkus
    });
  } catch (error: unknown) {
    console.error('[API Bot Inventory Update Error]:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 });
  }
}
