import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SiiCafParser } from '@/lib/sii/caf';

export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    const { xmlContent } = await req.json();
    if (!xmlContent) {
      return NextResponse.json({ error: 'Contenido XML es requerido' }, { status: 400 });
    }

    // 1. Obtener sesión del usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // 2. Obtener store_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'Usuario no asociado a una tienda' }, { status: 403 });
    }

    // 3. Parsear el CAF para validar y extraer info
    const cafData = SiiCafParser.parse(xmlContent);

    // 4. Guardar en la base de datos
    const { data, error } = await supabase
      .from('sii_folios')
      .upsert({
        store_id: profile.store_id,
        tipo_dte: cafData.tipoDte,
        folio_desde: cafData.desde,
        folio_hasta: cafData.hasta,
        folio_actual: cafData.desde,
        caf_xml: xmlContent,
        fecha_autorizacion: cafData.fecha,
        activo: true
      }, { onConflict: 'store_id,tipo_dte,folio_desde' })
      .select();

    if (error) throw new Error(`Error guardando CAF: ${error.message}`);

    return NextResponse.json({
      success: true,
      message: `CAF para DTE ${cafData.tipoDte} (Folios ${cafData.desde}-${cafData.hasta}) cargado correctamente`,
      data
    });

  } catch (error: any) {
    console.error('[API CAF] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    const { data: cafs, error } = await supabase
      .from('sii_folios')
      .select('tipo_dte, caf_xml, folio_actual, folio_hasta')
      .eq('store_id', profile.store_id)
      .eq('activo', true);

    if (error) throw error;

    return NextResponse.json(cafs.map(c => ({
      tipo_dte: c.tipo_dte,
      xml: c.caf_xml,
      folio_actual: c.folio_actual,
      folio_hasta: c.folio_hasta
    })));

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
