import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { parseBody } from '@/lib/validations/http';
import { siiFoliosOfflineSchema } from '@/lib/validations/sii';
import { roleIn, SII_OPERATION_ROLES } from '@/lib/constants/roles';

/**
 * Reservar un lote de folios para uso offline.
 * La reserva es atómica y por tienda: la hace el RPC `reserve_folios`, que toma la
 * fila con FOR UPDATE y valida que `p_store_id` sea la tienda del usuario.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const parsed = await parseBody(req, siiFoliosOfflineSchema);
    if ('error' in parsed) return parsed.error;
    const { tipoDte, count } = parsed.data;

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Tienda no encontrada' }, { status: 403 });

    if (!roleIn(profile?.role, SII_OPERATION_ROLES)) {
      return NextResponse.json({ error: 'Sin permisos para operar el SII' }, { status: 403 });
    }

    // Reserva atómica del rango de folios (reemplaza el read-then-update no bloqueante).
    const { data, error } = await supabase.rpc('reserve_folios', {
      p_store_id: profile.store_id,
      p_tipo_dte: tipoDte,
      p_count: count,
    });
    if (error) throw error;
    const reserva = Array.isArray(data) ? data[0] : data;
    if (!reserva) return NextResponse.json({ error: 'No hay folios disponibles para reservar' }, { status: 404 });

    // 4. Retornar solo el rango reservado. El CAF (con RSASK) nunca sale del
    // servidor: el motor lo vuelve a leer y descifrar al emitir (engine.ts:245-264).
    return NextResponse.json({
      success: true,
      start: reserva.v_start,
      end: reserva.v_end,
      tipoDte
    });

  } catch (error) {
    console.error('[API Folios Offline] Error:', error);
    return NextResponse.json({ error: (error as { message?: string } | null)?.message }, { status: 500 });
  }
}
