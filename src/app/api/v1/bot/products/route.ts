import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import crypto from 'crypto';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or malformed Authorization header' }, { status: 401 });
    }

    const apiKey = authHeader.substring(7); // Extraer token limpio
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

    const supabase = createAdminClient();

    // 1. Validar la API Key y comprobar estado
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

    // 2. Verificar permisos/scopes
    if (!keyData.scopes.includes('products:read')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient scopes' }, { status: 403 });
    }

    // 3. Obtener el query de búsqueda del URL
    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get('q') || '';

    // 4. Buscar productos pertenecientes al store_id
    let query = supabase
      .from('products')
      .select('id, name, price, stock, description, sku, barcode, category')
      .eq('store_id', keyData.store_id);

    if (searchQuery) {
      query = query.ilike('name', `%${searchQuery}%`);
    }

    const { data: products, error: prodError } = await query.limit(20);

    if (prodError) throw prodError;

    return NextResponse.json({ products });
  } catch (error: unknown) {
    console.error('[API Bot Products Error]:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Internal Server Error', message }, { status: 500 });
  }
}
