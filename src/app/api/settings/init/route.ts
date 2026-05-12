import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el store_id del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'Usuario no tiene tienda asociada' }, { status: 403 });
    }

    // Verificar si ya existen configuraciones para esta tienda
    const { count } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', profile.store_id);

    if (count && count > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'La configuración ya existe para esta tienda.',
        alreadyExists: true 
      });
    }

    // Configuraciones por defecto
    const defaultSettings = [
      { key: 'loyalty_enabled', value: 'true' },
      { key: 'loyalty_name', value: 'Puntos' },
      { key: 'loyalty_accumulation_rate', value: '100' }, // 1 punto por cada $100
      { key: 'loyalty_redemption_rate', value: '1' },     // $1 por cada punto
      { key: 'receipt_message', value: '¡Gracias por su compra!' },
      { key: 'receipt_show_logo', value: 'true' },
      { key: 'receipt_show_powered_by', value: 'true' },
      { key: 'receipt_powered_by_text', value: 'Powered by YAHPOS!.cl' },
      { key: 'pos_tax_rate', value: '19' },
      { key: 'pos_currency', value: 'CLP' }
    ];

    const { error } = await supabase
      .from('settings')
      .insert(
        defaultSettings.map(s => ({
          ...s,
          store_id: profile.store_id
        }))
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Configuración inicializada correctamente.' 
    });
  } catch (error: any) {
    console.error('[POST /api/settings/init] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
