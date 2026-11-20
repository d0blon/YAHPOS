import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';
import { parseBody } from '@/lib/validations/http';
import { wizardResolucionSchema } from '@/lib/validations/sii';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) {
      return NextResponse.json({ error: 'Perfil sin tienda' }, { status: 400 });
    }

    if (!roleIn(profile.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json(
        { error: 'No tienes permiso para gestionar la configuración SII' },
        { status: 403 }
      );
    }

    const parsed = await parseBody(request, wizardResolucionSchema);
    if ('error' in parsed) return parsed.error;
    const { nroResol, fchResol, acteco } = parsed.data;

    const fecha = new Date(fchResol);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fchResol)
      || Number.isNaN(fecha.getTime())
      || fecha.toISOString().slice(0, 10) !== fchResol) {
      return NextResponse.json(
        { error: 'fchResol debe ser una fecha válida en formato AAAA-MM-DD' },
        { status: 400 }
      );
    }

    // Actualizar sii_config
    const updateData: Record<string, unknown> = {
      nro_resol: nroResol,
      fch_resol: fchResol,
      updated_at: new Date().toISOString(),
    };

    if (acteco !== undefined) updateData.acteco = acteco;

    const { error: dbError } = await supabase
      .from('sii_config')
      .update(updateData)
      .eq('store_id', profile.store_id);

    if (dbError) {
      console.error('Error guardando resolución:', dbError);
      return NextResponse.json(
        { error: 'Error guardando resolución' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        nroResol,
        fchResol,
        acteco: acteco ?? null,
      }
    });

  } catch (error) {
    console.error('Error en wizard/resolucion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
