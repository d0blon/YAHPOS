import { NextResponse } from 'next/server';
import { SiiEngine } from '@/lib/sii/engine';
import { withAuth, apiError } from '@/lib/api-utils';

export async function POST(req: Request) {
  try {
    const auth = await withAuth();
    if (auth.error) return auth.error;

    const { id, payload, folio, xml: tedXml, storeId } = await req.json();

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es requerido' }, { status: 400 });
    }

    if (storeId !== auth.storeId) {
      return apiError('No autorizado para esta tienda', 403);
    }

    const engine = new SiiEngine();
    await engine.initForStore(storeId);

    const finalPayload = {
      ...payload,
      Encabezado: {
        ...payload.Encabezado,
        Folio: folio || 0,
        TipoDTE: payload.type || 39,
        FchEmis: payload.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        MntTotal: payload.totals?.total || payload.total
      }
    };

    const result: any = await engine.emitirBoleta(finalPayload, storeId);

    if (!result.success) {
      if (result.error?.includes('duplicado')) {
         return NextResponse.json({ success: true, message: 'Ya procesado anteriormente' });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (id && id.startsWith('POS-')) {
       await auth.supabase.from('orders').update({ sii_status: 'sent', folio: result.folio }).eq('offline_id', id);
    }

    return NextResponse.json({
      success: true,
      folio: result.folio,
      documentId: result.documentId
    });

  } catch (error: any) {
    console.error('[SII Sync Error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
