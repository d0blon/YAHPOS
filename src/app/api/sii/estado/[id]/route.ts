import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SiiEngine } from '@/lib/sii/engine';
import { parseParams } from '@/lib/validations/http';
import { siiDocumentIdSchema } from '@/lib/validations/sii';
import { roleIn, SII_OPERATION_ROLES } from '@/lib/constants/roles';

const ROLES_CONSULTA = [...SII_OPERATION_ROLES, 'superadmin'] as const;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const parsedParams = parseParams(await params, siiDocumentIdSchema);
    if ('error' in parsedParams) return parsedParams.error;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 });
    if (!roleIn(profile.role, ROLES_CONSULTA)) {
      return NextResponse.json({ error: 'Sin permisos para consultar el estado SII' }, { status: 403 });
    }

    const { data: doc, error: docError } = await supabase
      .from('sii_documents')
      .select('id, track_id, estado')
      .eq('id', parsedParams.data.id)
      .eq('store_id', profile.store_id)
      .maybeSingle();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
    }

    const trackId = doc.track_id == null ? null : String(doc.track_id);
    const fecha = new Date().toISOString();
    const estadoLocal = String(doc.estado ?? '');

    if (!trackId) {
      return NextResponse.json({
        success: false,
        estado: estadoLocal,
        veredicto: 'DESCONOCIDO',
        track_id: null,
        fecha,
        error: 'El DTE no tiene track ID: el SII todavía no lo recibió',
      }, { status: 409 });
    }

    const engine = new SiiEngine();
    await engine.initForStore(profile.store_id);
    const resultado = await engine.consultarEstadoEnvio(parsedParams.data.id, profile.store_id);

    if (!resultado.success) {
      return NextResponse.json({
        success: false,
        estado: estadoLocal,
        veredicto: String(resultado.veredicto ?? 'DESCONOCIDO'),
        track_id: trackId,
        fecha,
        error: 'error' in resultado ? resultado.error : 'No se pudo consultar el veredicto del SII',
      }, { status: 502 });
    }

    const { data: actualizado } = await supabase
      .from('sii_documents')
      .select('estado')
      .eq('id', parsedParams.data.id)
      .eq('store_id', profile.store_id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      estado: String(actualizado?.estado ?? estadoLocal),
      veredicto: String(resultado.veredicto ?? 'DESCONOCIDO'),
      track_id: trackId,
      fecha,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: unknown) {
    console.error('[API Estado SII] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
