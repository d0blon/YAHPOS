import { NextResponse } from 'next/server';
import { SiiEngine } from '@/lib/sii/engine';
import { createClient } from '@/lib/supabase';
import { parseBody } from '@/lib/validations/http';
import { siiEnviarSchema } from '@/lib/validations/sii';
import { roleIn, SII_OPERATION_ROLES } from '@/lib/constants/roles';

const ROLES_ENVIO = [...SII_OPERATION_ROLES, 'superadmin'] as const;

export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const parsed = await parseBody(req, siiEnviarSchema);
    if ('error' in parsed) return parsed.error;
    const { documentId } = parsed.data;

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 });

    if (!roleIn(profile?.role, ROLES_ENVIO)) {
      return NextResponse.json({ error: 'Sin permisos para operar el SII' }, { status: 403 });
    }

    const engine = new SiiEngine();
    await engine.initForStore(profile.store_id);

    const result = await engine.enviarBoletaAlSII(documentId, profile.store_id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      trackId: result.trackId,
      message: 'Documento enviado satisfactoriamente al SII'
    });

  } catch (error: unknown) {
    console.error('[API Enviar] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
