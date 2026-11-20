import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { generateBoletaPdf } from '@/lib/sii/pdf-generator';
import { extraerDatosPdf } from '@/lib/sii/pdf-datos';
import { parseParams } from '@/lib/validations/http';
import { siiDocumentIdSchema } from '@/lib/validations/sii';
import { roleIn, SII_OPERATION_ROLES } from '@/lib/constants/roles';

const ROLES_PDF = [...SII_OPERATION_ROLES, 'superadmin'] as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const parsedParams = parseParams(await params, siiDocumentIdSchema);
  if ('error' in parsedParams) return parsedParams.error;
  const { id } = parsedParams.data;
  const supabase = await createClient();

  try {
    // 1. Obtener el usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('No autorizado', { status: 401 });

    // 2. Validar permisos ANTES de leer xml_content: rol de operación desde DB.
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id, role')
      .eq('id', user.id)
      .single();

    if (!roleIn(profile?.role, ROLES_PDF)) {
      return new NextResponse('Acceso denegado', { status: 403 });
    }

    // 3. Obtener el documento de la base de datos con info del emisor (store)
    const { data: doc, error: docError } = await supabase
      .from('sii_documents')
      .select('id, store_id, xml_content, metadata, tipo_dte, stores(name)')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return new NextResponse('Documento no encontrado', { status: 404 });
    }

    // El store del documento manda: solo developer (rol leído de DB) puede leer
    // documentos de otra tienda.
    if (profile?.store_id !== doc.store_id && !roleIn(profile?.role, ['developer'])) {
      return new NextResponse('Acceso denegado', { status: 403 });
    }

    // 4. Obtener configuraciones de la tienda
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .eq('store_id', doc.store_id);
    
    const settings: Record<string, string> = {};
    settingsData?.forEach(s => {
      settings[s.key] = s.value;
    });

    // 5. Traducir el XML del DTE a datos para el PDF
    const pdfData = extraerDatosPdf(doc.xml_content, {
      nombreTienda: (doc.stores as unknown as { name?: string } | null)?.name,
      settings,
      metadata: doc.metadata,
    });

    // 5. Generar PDF (Retorna Uint8Array)
    const pdfBytes = await generateBoletaPdf(pdfData);

    // 6. Retornar Response
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="dte_${pdfData.tipoDte ?? doc.tipo_dte}_F${pdfData.folio}.pdf"`,
        'Cache-Control': 'no-store, max-age=0'
      },
    });

  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error('[PDF API] Error:', error);
    return new NextResponse(`Error generando PDF: ${mensaje}`, { status: 500 });
  }
}
