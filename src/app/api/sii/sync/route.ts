import { NextResponse } from 'next/server';
import { SiiEngine } from '@/lib/sii/engine';
import { createClient } from '@/lib/supabase';

export async function POST(req: Request) {
  const supabase = await createClient();
  
  try {
    const { id, payload, folio, xml: tedXml, storeId } = await req.json();

    if (!storeId) {
      return NextResponse.json({ error: 'storeId es requerido' }, { status: 400 });
    }

    // 1. Inicializar el motor
    const engine = new SiiEngine();
    await engine.initForStore(storeId);

    // 2. Preparar el payload final
    // Si el payload viene del POS, ya tiene los items y totales
    const finalPayload = {
      ...payload,
      Encabezado: {
        ...payload.Encabezado,
        Folio: folio || 0, // Si ya tenemos folio reservado offline, lo usamos
        TipoDTE: payload.type || 39,
        FchEmis: payload.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        MntTotal: payload.totals?.total || payload.total
      }
    };

    // 3. Emitir Boleta (El motor manejará la firma completa y el TED)
    // Si ya enviamos un tedXml, el motor debería ser capaz de usarlo o regenerarlo
    const result: any = await engine.emitirBoleta(finalPayload, storeId);

    if (!result.success) {
      // Si el error es por folio duplicado, quizás ya se emitió en otro intento
      if (result.error?.includes('duplicado')) {
         return NextResponse.json({ success: true, message: 'Ya procesado anteriormente' });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 4. Marcar la orden como sincronizada si es necesario
    if (id && id.startsWith('POS-')) {
       await supabase.from('orders').update({ sii_status: 'sent', folio: result.folio }).eq('offline_id', id);
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
