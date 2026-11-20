import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { encrypt } from '@/lib/crypto';
import { parseBody } from '@/lib/validations/http';
import { siiConfigSchema } from '@/lib/validations/sii';
import { roleIn, SII_MANAGEMENT_ROLES } from '@/lib/constants/roles';

interface SiiConfigUpsert {
  store_id: string
  rut_emisor?: string
  razon_social?: string
  giro?: string
  direccion?: string
  comuna?: string
  ciudad?: string
  environment?: string
  acteco?: number | null
  nro_resol?: number | null
  fch_resol?: string | null
  certificado_pfx_encrypted?: string
  certificado_password_encrypted?: string
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 });

    if (!roleIn(profile?.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: 'Sin permisos para gestionar el SII' }, { status: 403 });
    }

    const { data: config, error } = await supabase
      .from('sii_config')
      // Nunca seleccionar columnas cifradas: no deben llegar al navegador.
      .select('id, store_id, rut_emisor, razon_social, giro, direccion, comuna, ciudad, environment, acteco, fch_resol, nro_resol, certificado_expira, created_at')
      .eq('store_id', profile.store_id)
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('[GET /api/sii/config] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.store_id) return NextResponse.json({ error: 'Sin tienda' }, { status: 403 });

    if (!roleIn(profile?.role, SII_MANAGEMENT_ROLES)) {
      return NextResponse.json({ error: 'Sin permisos para gestionar el SII' }, { status: 403 });
    }

    const parsed = await parseBody(req, siiConfigSchema);
    if ('error' in parsed) return parsed.error;
    const body = parsed.data;
    const {
      rut_emisor,
      razon_social,
      giro,
      direccion,
      comuna,
      ciudad,
      environment,
      acteco,
      fch_resol,
      nro_resol,
      pfx_base64,
      password
    } = body;

    const updateData: SiiConfigUpsert = {
      store_id: profile.store_id,
      rut_emisor,
      razon_social,
      giro,
      direccion,
      comuna,
      ciudad,
      environment
    };

    // Datos de emisión: solo se pisan si el cliente los envía explícitamente, para
    // que un cliente que no los conoce no borre los que ya estaban configurados.
    const enteroONulo = (valor: unknown): number | null => {
      if (valor === null || valor === undefined || valor === '') return null;
      const numero = Number(valor);
      return Number.isFinite(numero) ? Math.trunc(numero) : null;
    };
    if ('acteco' in body) updateData.acteco = enteroONulo(acteco);
    if ('nro_resol' in body) updateData.nro_resol = enteroONulo(nro_resol);
    if ('fch_resol' in body) updateData.fch_resol = fch_resol || null;

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
      .select('id, store_id, rut_emisor, razon_social, giro, direccion, comuna, ciudad, environment, acteco, fch_resol, nro_resol, certificado_expira, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Nunca devolver el certificado cifrado ni su clave, ni siquiera en la respuesta del upsert.
    const safeData: Record<string, unknown> = { ...data };
    delete safeData.certificado_pfx_encrypted;
    delete safeData.certificado_password_encrypted;

    return NextResponse.json({ success: true, data: safeData });
  } catch (error) {
    console.error('[POST /api/sii/config] Error:', error)
    return NextResponse.json({ error: (error as { message?: string } | null)?.message || 'Error interno del servidor' }, { status: 500 })
  }
}
