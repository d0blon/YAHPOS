import { NextResponse } from 'next/server';
import { SiiEngine } from '@/lib/sii/engine';
import { createClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    const { documentId } = await req.json();

    if (!documentId) return NextResponse.json({ error: 'documentId es requerido' }, { status: 400 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 });

    const engine = new SiiEngine();
    await engine.initForStore(profile.store_id);

    const result: any = await engine.enviarBoletaAlSII(documentId, profile.store_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      trackId: result.trackId,
      message: 'Documento enviado satisfactoriamente al SII'
    });

  } catch (error: any) {
    console.error('[API Enviar] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
