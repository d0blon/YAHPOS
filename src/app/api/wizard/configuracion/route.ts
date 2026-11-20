import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';
import { parseBody } from '@/lib/validations/http';
import { wizardConfiguracionSchema } from '@/lib/validations/sii';

/**
 * PUT /api/wizard/configuracion
 *
 * Actualiza los datos de emisor en sii_config: acteco, nro_resol, fch_resol,
 * rut_emisor, razon_social, environment. No toca el certificado ni el CAF
 * (esos tienen sus propios endpoints).
 */
export async function PUT(request: NextRequest) {
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

    const parsed = await parseBody(request, wizardConfiguracionSchema);
    if ('error' in parsed) return parsed.error;
    const { acteco, nroResol, fchResol, rutEmisor, razonSocial, environment } = parsed.data;

    const fecha = new Date(fchResol);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fchResol)
      || Number.isNaN(fecha.getTime())
      || fecha.toISOString().slice(0, 10) !== fchResol) {
      return NextResponse.json(
        { error: 'fchResol debe ser una fecha valida en formato AAAA-MM-DD' },
        { status: 400 },
      );
    }

    const rutLimpio = rutEmisor.replace(/\./g, '').trim();
    if (!/^\d{1,8}-[\dKk]$/.test(rutLimpio)) {
      return NextResponse.json(
        { error: 'rutEmisor debe tener formato 12345678-9' },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {
      nro_resol: nroResol,
      fch_resol: fchResol,
      rut_emisor: rutLimpio,
      updated_at: new Date().toISOString(),
    };

    if (acteco !== undefined) updateData.acteco = acteco;
    if (razonSocial !== undefined) updateData.razon_social = razonSocial.trim();
    if (environment !== undefined) updateData.environment = environment;

    const { error: dbError } = await supabase
      .from('sii_config')
      .update(updateData)
      .eq('store_id', profile.store_id);

    if (dbError) {
      console.error('Error guardando configuracion:', dbError);
      return NextResponse.json(
        { error: 'Error guardando configuracion' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: updateData,
    });
  } catch (error) {
    console.error('Error en wizard/configuracion:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
