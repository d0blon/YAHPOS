import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { SiiSigner } from '@/lib/sii/signer';
import { decrypt } from '@/lib/crypto';
import { SII_MANAGEMENT_ROLES, roleIn } from '@/lib/constants/roles';
import { parseBody } from '@/lib/validations/http';
import { wizardCafSolicitarSchema } from '@/lib/validations/sii';

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Prepara la solicitud de CAF: genera y firma el XML en servidor.
 *
 * Flujo:
 * 1. Cliente pide "Solicitar CAF"
 * 2. YAHPOS! genera y firma el XML en servidor
 * 3. Cliente gestiona la solicitud en el portal SII con su certificado
 * 4. SII devuelve CAF firmado
 * 5. Cliente sube CAF a YAHPOS! (POST /api/wizard/caf)
 *
 * R4: el XML firmado NO se expone en la respuesta (ni se ofrece otro endpoint
 * para descargarlo). Se genera/firma en servidor para preparar/validar la
 * solicitud; la descarga del CAF se hace desde el portal del SII.
 */
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

    const parsed = await parseBody(request, wizardCafSolicitarSchema);
    if ('error' in parsed) return parsed.error;
    const { tipoDte, folioDesde, folioHasta } = parsed.data;

    // Obtener certificado cifrado (columnas reales de sii_config)
    const { data: config } = await supabase
      .from('sii_config')
      .select('certificado_pfx_encrypted, certificado_password_encrypted, rut_emisor')
      .eq('store_id', profile.store_id)
      .single();

    if (!config?.certificado_pfx_encrypted || !config.certificado_password_encrypted) {
      return NextResponse.json(
        { error: 'No hay certificado configurado. Sube el .pfx primero.' },
        { status: 400 }
      );
    }

    // Descifrar certificado
    const pfxBase64 = await decrypt(config.certificado_pfx_encrypted);
    const password = await decrypt(config.certificado_password_encrypted);

    // Crear signer
    const signer = new SiiSigner(pfxBase64, password);

    // Generar XML de solicitud CAF
    // Formato según instructivo SII (simplificado)
    const fechaSolicitud = new Date().toISOString().split('T')[0];
    const xmlSolicitud = `<?xml version="1.0" encoding="ISO-8859-1"?>
<SolicitanFolios xmlns="http://www.sii.cl/SiiDte">
  <Caratula>
    <RutEmisor>${escapeXml(config.rut_emisor)}</RutEmisor>
    <TipoSolicitud>SOLICITUD</TipoSolicitud>
    <FechaSolicitud>${escapeXml(fechaSolicitud)}</FechaSolicitud>
  </Caratula>
  <Detalle>
    <TipoDTE>${escapeXml(tipoDte)}</TipoDTE>
    <FolioDesde>${escapeXml(folioDesde)}</FolioDesde>
    <FolioHasta>${escapeXml(folioHasta)}</FolioHasta>
  </Detalle>
</SolicitanFolios>`;

    // Firmar XML con certificado. El resultado se valida en servidor pero nunca
    // se devuelve al cliente: R4 prohíbe exponer XML firmado en respuestas.
    const xmlFirmado = signer.signXml(xmlSolicitud, 'SolicitanFolios');
    if (!xmlFirmado) {
      return NextResponse.json(
        { error: 'No se pudo generar la solicitud firmada' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        instrucciones: {
          paso1: 'Ingresa al portal SII (www.sii.cl)',
          paso2: 'Ve a: Factura Electrónica > Solicitar Folios',
          paso3: 'Genera y descarga el XML firmado con tu certificado en el portal SII',
          paso4: 'El SII te devolverá un CAF firmado',
          paso5: 'Sube el CAF recibido en el paso "Cargar CAF"',
        }
      }
    });

  } catch (error) {
    console.error('Error en wizard/caf/solicitar:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
