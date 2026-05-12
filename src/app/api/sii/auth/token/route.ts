import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SiiEngine } from '@/lib/sii/engine';
import { SiiAuth } from '@/lib/sii/auth';

export async function GET() {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'No asociado a tienda' }, { status: 403 });
    }

    // 1. Obtener configuración de la tienda
    const { data: config, error: configError } = await supabase
      .from('sii_config')
      .select('*')
      .eq('store_id', profile.store_id)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Configuración SII no encontrada' }, { status: 404 });
    }

    // 2. Obtener Token
    // Nota: SiiAuth necesita pfxPath y password. Si están en la DB (encriptados), habría que manejarlos.
    // Asumimos que SiiAuth se encarga de la lógica de firma.
    const siiAuth = new SiiAuth(
      config.pfx_path || '', 
      config.pfx_password || '', 
      config.environment || 'certification'
    );

    const token = await siiAuth.getToken();

    return NextResponse.json({ token });

  } catch (error: any) {
    console.error('[API SII Token] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
