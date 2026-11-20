import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SiiAuth } from '@/lib/sii/auth';
import { decrypt } from '@/lib/crypto';
import { roleIn, SII_OPERATION_ROLES } from '@/lib/constants/roles';

/**
 * Devuelve el token del SII para la tienda del usuario.
 *
 * Antes leía `config.pfx_path` / `config.pfx_password`, columnas que **no existen** en
 * `sii_config` (las reales son `certificado_pfx_encrypted` / `certificado_password_encrypted`).
 * Con `''` el signer fallaba, `SiiAuth` entraba en modo mock y este endpoint respondía
 * `MOCK_TOKEN_…` como si fuera un token válido. Ahora se descifra igual que en `engine.ts`
 * y un certificado ausente o ilegible es un error explícito.
 */
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

    if (!roleIn(profile?.role, SII_OPERATION_ROLES)) {
      return NextResponse.json({ error: 'Sin permisos para operar el SII' }, { status: 403 });
    }

    // 1. Obtener configuración de la tienda
    const { data: config, error: configError } = await supabase
      .from('sii_config')
      .select('certificado_pfx_encrypted, certificado_password_encrypted, environment')
      .eq('store_id', profile.store_id)
      .limit(1)
      .single();

    if (configError || !config) {
      return NextResponse.json({ error: 'Configuración SII no encontrada' }, { status: 404 });
    }

    if (!config.certificado_pfx_encrypted || !config.certificado_password_encrypted) {
      return NextResponse.json(
        { error: 'Certificado digital no cargado: sube el .pfx y su clave antes de pedir token' },
        { status: 409 },
      );
    }

    // 2. Obtener Token
    const siiAuth = new SiiAuth(
      decrypt(config.certificado_pfx_encrypted),
      decrypt(config.certificado_password_encrypted),
      config.environment || 'certification',
    );

    if (siiAuth.enModoMock()) {
      return NextResponse.json(
        { error: 'El certificado no se pudo abrir: revisa el .pfx y su clave' },
        { status: 422 },
      );
    }

    // El token de sesión SII no se devuelve al navegador: el motor lo obtiene
    // en servidor cuando emite. Este endpoint solo valida que el certificado sea usable.
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API SII Token] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error obteniendo token del SII' },
      { status: 500 },
    );
  }
}
