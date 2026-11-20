import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { limiteVigenciaCaf } from '@/lib/sii/caf';
import { fechaChile } from '@/lib/sii/fecha-chile';
import { ingestarCaf } from '@/lib/sii/caf-ingest';
import { parseBody } from '@/lib/validations/http';
import { siiCafXmlSchema } from '@/lib/validations/sii';
import { roleIn, SII_MANAGEMENT_ROLES, SII_OPERATION_ROLES } from '@/lib/constants/roles';

/** Fallos de infraestructura/configuración del servidor, no del archivo recibido. */
const ERRORES_SERVIDOR = new Set([
  'CAF-STORE',
  'CAF-CONFIG-LEER',
  'CAF-CONFIG-GUARDAR',
  'CAF-FOLIOS-LEER',
  'CAF-CIFRADO',
  'CAF-FOLIOS-GUARDAR',
]);

export async function POST(req: Request) {
  const supabase = await createClient();

  try {
    // 1. Obtener sesión del usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    // 2. Obtener store_id y rol ANTES de parsear el body: el permiso se verifica
    // primero para no exponer el helper a usuarios sin rol.
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'Usuario no asociado a una tienda' }, { status: 403 });
    }

    if (!roleIn(profile.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: 'Sin permisos para gestionar el SII' }, { status: 403 });
    }

    const parsed = await parseBody(req, siiCafXmlSchema);
    if ('error' in parsed) {
      const cuerpo = await parsed.error.json();
      return NextResponse.json({ ...cuerpo, code: 'CAF-XML' }, { status: 400 });
    }

    // El CAF llega como string JSON; quitar un eventual BOM UTF-8 inicial.
    const xml = parsed.data.xmlContent.replace(/^\uFEFF/, '');
    const result = await ingestarCaf({ supabase, storeId: profile.store_id, xml });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code, details: result.details ?? '' },
        { status: ERRORES_SERVIDOR.has(result.code) ? 500 : 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data });

  } catch (error) {
    console.error('[API CAF] Error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'No asociado a tienda' }, { status: 403 });
    }

    // Lectura de tipos disponibles: mismos roles que la página de facturación (ST1).
    // 'superadmin' no está en roles.ts, se acepta como literal igual que en ST1.
    const allowedRoles = [...SII_OPERATION_ROLES, 'superadmin'] as const;
    if (!roleIn(profile?.role, allowedRoles)) {
      return NextResponse.json({ error: 'Sin permisos para consultar los CAF' }, { status: 403 });
    }

    const { data: cafs, error } = await supabase
      .from('sii_folios')
      .select('tipo_dte, folio_actual, folio_hasta, fecha_autorizacion')
      .eq('store_id', profile.store_id)
      .eq('activo', true)
      .limit(200);

    if (error) throw error;

    // Mismo criterio que el motor (validarCafParaEmision) y ST3: tipo con folios
    // disponibles y dentro de los 6 meses de vigencia del CAF. Se usa fecha de Chile
    // (no UTC) para evitar desfase de un día cerca de medianoche. Fecha inválida
    // se descarta (fail-closed) porque el motor también la rechazaría.
    const hoy = fechaChile();
    const tiposDisponibles = Array.from(new Set(
      (cafs ?? [])
        .filter((c) => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(hoy)) return false; // fail-closed si la fecha local falla
          const rawFecha = c.fecha_autorizacion;
          if (typeof rawFecha !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(rawFecha)) return false;
          const fecha = rawFecha.slice(0, 10);
          if (typeof c.folio_actual === 'number' && typeof c.folio_hasta === 'number' && c.folio_actual > c.folio_hasta) return false;
          try {
            return hoy <= limiteVigenciaCaf(fecha);
          } catch {
            return false;
          }
        })
        .map((c) => (c.tipo_dte == null ? NaN : Number(c.tipo_dte)))
        .filter((n) => Number.isInteger(n) && n > 0)
    )).sort((a, b) => a - b);

    // Contrato público: solo tipos habilitados para emitir. Nunca caf_xml,
    // RSASK/clave privada, RUT del emisor o folios: el cliente no los necesita.
    return NextResponse.json(
      { tipos_disponibles: tiposDisponibles },
      { headers: { 'Cache-Control': 'no-store' } }
    );

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}
