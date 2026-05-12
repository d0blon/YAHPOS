import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

/**
 * Reservar un lote de folios para uso offline.
 * Esto 'bloquea' los folios en la base de datos central.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    const { tipoDte, count = 50 } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 403 });

    // 1. Obtener el CAF activo
    const { data: folioInfo, error } = await supabase
      .from('sii_folios')
      .select('*')
      .eq('store_id', profile.store_id)
      .eq('tipo_dte', tipoDte)
      .eq('activo', true)
      .lte('folio_actual', 'folio_hasta')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error || !folioInfo) {
      return NextResponse.json({ error: 'No hay folios disponibles para reservar' }, { status: 404 });
    }

    // 2. Calcular cuántos podemos dar
    const available = folioInfo.folio_hasta - folioInfo.folio_actual + 1;
    const toReserve = Math.min(count, available);
    const startFolio = folioInfo.folio_actual;
    const endFolio = startFolio + toReserve - 1;

    // 3. Actualizar el folio_actual en la DB para 'saltar' estos folios
    const { error: updateError } = await supabase
      .from('sii_folios')
      .update({ folio_actual: endFolio + 1 })
      .eq('id', folioInfo.id);

    if (updateError) throw updateError;

    // 4. Retornar los folios reservados y el CAF necesario para firmar el TED
    return NextResponse.json({
      success: true,
      start: startFolio,
      end: endFolio,
      cafXml: folioInfo.caf_xml,
      tipoDte
    });

  } catch (error: any) {
    console.error('[API Folios Offline] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
