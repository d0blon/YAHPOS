import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 });

    const { data: config, error } = await supabase
      .from('sii_config')
      .select('*')
      .eq('store_id', profile.store_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // No devolver el certificado cifrado ni el password al frontend por seguridad
    if (config) {
      delete config.certificado_pfx_encrypted;
      delete config.certificado_password_encrypted;
    }

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('[GET /api/sii/config] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 });

    const body = await req.json();
    const { 
      rut_emisor, 
      razon_social, 
      giro, 
      direccion, 
      comuna, 
      ciudad, 
      environment,
      pfx_base64,
      password
    } = body;

    const updateData: any = {
      store_id: profile.store_id,
      rut_emisor,
      razon_social,
      giro,
      direccion,
      comuna,
      ciudad,
      environment
    };

    // Solo actualizar si vienen nuevos
    if (pfx_base64) {
      updateData.certificado_pfx_encrypted = encrypt(pfx_base64);
    }
    if (password) {
      updateData.certificado_password_encrypted = encrypt(password);
    }

    const { data, error } = await supabase
      .from('sii_config')
      .upsert(updateData, { onConflict: 'store_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[POST /api/sii/config] Error:', error)
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 })
  }
}
