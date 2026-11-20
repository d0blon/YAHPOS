import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SiiSigner } from '@/lib/sii/signer';
import { encrypt } from '@/lib/crypto';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';
import { parseFormData } from '@/lib/validations/http';
import { wizardCertificadoSchema } from '@/lib/validations/sii';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener store_id y rol del perfil (nunca de user_metadata)
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

    const parsed = await parseFormData(request, wizardCertificadoSchema);
    if ('error' in parsed) return parsed.error;
    const { pfx, password } = parsed.data;

    const pfxBuffer = Buffer.from(await pfx.arrayBuffer());

    // PKCS#12 (DER) arranca con SEQUENCE: 0x30
    if (pfxBuffer[0] !== 0x30) {
      return NextResponse.json(
        { error: 'El archivo no es un certificado PKCS#12 válido' },
        { status: 400 }
      );
    }

    // Validar certificado con SiiSigner (valida formato, vigencia, extrae info)
    try {
      const signer = new SiiSigner(pfxBuffer, password);
      const certInfo = signer.getCertificateInfo();

      // Cifrar .pfx antes de guardar
      const encryptedPfx = await encrypt(pfxBuffer.toString('base64'));
      const encryptedPassword = await encrypt(password);

      // Guardar en sii_config (columnas que initForStore lee: certificado_pfx_encrypted / certificado_password_encrypted)
      const { error: dbError } = await supabase
        .from('sii_config')
        .upsert({
          store_id: profile.store_id,
          certificado_pfx_encrypted: encryptedPfx,
          certificado_password_encrypted: encryptedPassword,
          rut_emisor: certInfo.rut,
          razon_social: certInfo.razonSocial,
          environment: 'certification',
        }, {
          onConflict: 'store_id'
        });

      if (dbError) {
        console.error('Error guardando certificado:', dbError);
        return NextResponse.json(
          { error: 'Error guardando certificado' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          rut: certInfo.rut,
          razonSocial: certInfo.razonSocial,
          notBefore: certInfo.notBefore,
          notAfter: certInfo.notAfter,
          environment: 'certification',
        }
      });

    } catch (error) {
      console.error('Error validando certificado:', error);
      return NextResponse.json(
        {
          error: 'Error validando certificado',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error en wizard/certificado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
