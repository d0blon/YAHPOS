import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { parseParams } from '@/lib/validations/http';
import { siiDocumentIdSchema } from '@/lib/validations/sii';
import { roleIn, SII_MANAGEMENT_ROLES } from '@/lib/constants/roles';

const ROLES_XML = [...SII_MANAGEMENT_ROLES, 'superadmin'] as const;

/**
 * Entrega el XML firmado del DTE para verlo en el navegador.
 *
 * El panel de certificación (`SiiCertificationPanel.tsx:161`) apuntaba a
 * `/api/sii/document/{id}/xml`, ruta que no existía: el botón "View XML" daba 404.
 * Se respeta el mismo control que la ruta del PDF: RLS del cliente, y además el chequeo
 * explícito de `store_id` o rol `developer`, ambos leídos del perfil en DB.
 * R4: el visor de XML queda restringido a roles de gestión SII (no a operación).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsedParams = parseParams(await params, siiDocumentIdSchema);
  if ('error' in parsedParams) return parsedParams.error;
  const { id } = parsedParams.data;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('No autorizado', { status: 401 });

  // Perfil y rol ANTES del documento: nunca consultar XML de DTE sin permiso verificado.
  const { data: profile } = await supabase
    .from('profiles')
    .select('store_id, role')
    .eq('id', user.id)
    .single();

  if (!roleIn(profile?.role, ROLES_XML)) {
    return new NextResponse('Acceso denegado', { status: 403 });
  }

  const { data: doc, error: docError } = await supabase
    .from('sii_documents')
    .select('store_id, xml_content, tipo_dte, folio')
    .eq('id', id)
    .single();

  if (docError || !doc) {
    return new NextResponse('Documento no encontrado', { status: 404 });
  }

  // El rol de gestión habilita la lectura, pero el store del documento manda:
  // solo developer (rol leído de DB) puede leer documentos de otra tienda.
  if (profile?.store_id !== doc.store_id && !roleIn(profile?.role, ['developer'])) {
    return new NextResponse('Acceso denegado', { status: 403 });
  }

  if (!doc.xml_content) {
    return new NextResponse('El documento no tiene XML guardado', { status: 409 });
  }

  return new NextResponse(doc.xml_content, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `inline; filename="DTE-${doc.tipo_dte}-${doc.folio}.xml"`,
      'Cache-Control': 'no-store',
    },
  });
}
