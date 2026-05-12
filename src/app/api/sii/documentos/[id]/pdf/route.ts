import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { generateBoletaPdf, BoletaPdfData } from '@/lib/sii/pdf-generator';
import { XMLParser } from 'fast-xml-parser';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  try {
    // 1. Obtener el usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new NextResponse('No autorizado', { status: 401 });

    // 2. Obtener el documento de la base de datos con info del emisor (store)
    const { data: doc, error: docError } = await supabase
      .from('sii_documents')
      .select('*, stores(*)')
      .eq('id', id)
      .single();

    if (docError || !doc) {
      return new NextResponse('Documento no encontrado', { status: 404 });
    }

    // 3. Validar permisos (Mismo store_id o developer)
    const { data: profile } = await supabase
      .from('profiles')
      .select('store_id')
      .eq('id', user.id)
      .single();

    if (profile?.store_id !== doc.store_id && user.user_metadata.role !== 'developer') {
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

    // 5. Parsear el XML para extraer datos para el PDF
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const xmlObj = parser.parse(doc.xml_content);
    
    // El DTE está envuelto en <DTE><Documento>...
    const dte = xmlObj.DTE.Documento;
    const encabezado = dte.Encabezado;
    
    // Extraer detalles (pueden ser uno o varios)
    let detallesRaw = dte.Detalle;
    if (!Array.isArray(detallesRaw)) detallesRaw = [detallesRaw];

    // Mapear datos al formato esperado por el generador de PDF
    const pdfData: BoletaPdfData = {
      folio: encabezado.IdDoc.Folio,
      fecha: encabezado.IdDoc.FchEmis,
      total: encabezado.Totales.MntTotal,
      items: detallesRaw.map((d: any) => ({
        nombre: d.NmbItem,
        cantidad: d.QtyItem || 1,
        precio: d.PrcItem || d.MontoItem,
        total: d.MontoItem
      })),
      emisor: {
        rut: encabezado.Emisor.RUTEmisor,
        razonSocial: doc.stores?.name || encabezado.Emisor.RznSoc,
        giro: encabezado.Emisor.GiroEmis || 'Giro no especificado',
        direccion: encabezado.Emisor.DirOrigin || 'Dirección no especificada',
        logoUrl: settings.appearance_logo_url || ''
      },
      receptor: encabezado.Receptor?.RUTRecep ? {
        rut: encabezado.Receptor.RUTRecep,
        nombre: encabezado.Receptor.RznSocRecep
      } : undefined,
      timbre: doc.xml_content.match(/<TED[\s\S]*?<\/TED>/)?.[0] || '',
      receipt: {
        message: settings.receipt_message || '¡Gracias por su compra!',
        showLogo: settings.receipt_show_logo !== 'false',
        logoUrl: settings.appearance_logo_url || '',
        colorMode: (settings.receipt_color_mode as 'bw' | 'color') || 'bw',
        showPoweredBy: settings.receipt_show_powered_by !== 'false',
        poweredByText: settings.receipt_powered_by_text || 'Powered by YAHPOS!.cl',
        showLoyalty: settings.loyalty_enabled === 'true',
        loyaltyName: settings.loyalty_name || 'Puntos',
        pointsEarned: doc.metadata?.loyalty?.points_earned || 0,
        pointsRedeemed: doc.metadata?.loyalty?.points_redeemed || 0
      }
    };

    // 5. Generar PDF (Retorna Uint8Array)
    const pdfBytes = await generateBoletaPdf(pdfData);

    // 6. Retornar Response
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="boleta_${doc.folio}.pdf"`,
        'Cache-Control': 'no-store, max-age=0'
      },
    });

  } catch (error: any) {
    console.error('[PDF API] Error:', error);
    return new NextResponse(`Error generando PDF: ${error.message}`, { status: 500 });
  }
}
