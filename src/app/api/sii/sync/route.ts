import { NextResponse } from 'next/server';
import { SiiEngine } from '@/lib/sii/engine';
import { withAuth, apiError } from '@/lib/api-utils';
import type { DtePayload } from '@/lib/sii/types';
import { parseBody } from '@/lib/validations/http';
import { siiSyncSchema } from '@/lib/validations/sii';
import { roleIn, SII_OPERATION_ROLES } from '@/lib/constants/roles';

/** Fecha de emisión en hora de Chile, no en UTC (a las 21:00 ya es "mañana" en UTC). */
function hoyChile(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Santiago' });
}

/**
 * Recibe un ítem de la cola del POS, emite el DTE firmado y lo enlaza con la orden.
 *
 * Contrato del `payload`: `DtePayload` completo (`Encabezado` + `Detalles`), armado
 * por `payloadDesdeVentaPos()`. Antes el POS enviaba un objeto sin `Encabezado` y el
 * motor emitía un documento sin receptor ni líneas.
 */
export async function POST(req: Request) {
  try {
    const auth = await withAuth();
    if (auth.error) return auth.error;

    if (!roleIn(auth.profile?.role, SII_OPERATION_ROLES)) {
      return apiError('Sin permisos para operar el SII', 403);
    }

    const parsed = await parseBody(req, siiSyncSchema);
    if ('error' in parsed) return parsed.error;
    const { id, payload, folio, storeId } = parsed.data;

    if (storeId !== auth.storeId) {
      return apiError('No autorizado para esta tienda', 403);
    }

    const base = payload as unknown as Partial<DtePayload>;
    if (!base?.Encabezado || !Array.isArray(base.Detalles) || base.Detalles.length === 0) {
      // Un ítem viejo de la cola (formato anterior) no se puede emitir: reintentarlo
      // cinco veces solo retrasa el resto. El cliente lo descarta al recibir 422.
      return NextResponse.json(
        { error: 'Payload DTE incompleto: falta Encabezado o Detalles. Este ítem no se puede emitir.' },
        { status: 422 },
      );
    }

    // Cinturón de seguridad: un voucher jamás debe llegar al motor. Aunque el POS
    // encolara un DTE por error/race, la orden persistida como voucher bloquea la emisión.
    if (id) {
      const { data: orden } = await auth.supabase
        .from('orders')
        .select('id, metadata, sii_status')
        .eq('store_id', storeId)
        .eq('metadata->>offline_id', String(id))
        .maybeSingle()

      const metadata = orden?.metadata as { document_kind?: string } | null
      if (metadata?.document_kind === 'voucher' || orden?.sii_status === 'no_aplica') {
        console.error('[SII Sync] Intento de emitir DTE para voucher (offlineId=%s)', id)
        return NextResponse.json(
          { error: 'Voucher interno: no se emite DTE para esta venta', code: 'VOUCHER_NO_SII' },
          { status: 409 },
        )
      }
    }

    // Idempotencia: si el folio de esta orden ya se emitió (respuesta HTTP perdida,
    // reintento del latido), se devuelve el documento existente en vez de insertar
    // un segundo `sii_documents` para el mismo folio.
    if (id) {
      const { data: existente } = await auth.supabase
        .from('sii_documents')
        .select('id, folio')
        .eq('store_id', storeId)
        .contains('metadata', { offline_id: id })
        .maybeSingle();

      if (existente) {
        return NextResponse.json({
          success: true,
          folio: existente.folio,
          documentId: existente.id,
          yaEmitido: true,
        });
      }
    }

    const finalPayload: DtePayload = {
      ...base,
      Encabezado: {
        ...base.Encabezado,
        Folio: folio ?? base.Encabezado.Folio ?? 0,
        TipoDTE: base.Encabezado.TipoDTE ?? 39,
        FchEmis: base.Encabezado.FchEmis || hoyChile(),
      },
      Detalles: base.Detalles,
    };

    const engine = new SiiEngine();
    await engine.initForStore(storeId);

    // `metadata.offline_id` es la clave que permite encontrar la emisión después
    // (idempotencia) y enlazar la orden con su documento.
    const result = await engine.emitirDocumento(finalPayload, storeId, id ? { offline_id: id } : {});

    if (!result.success) {
      if (result.error?.includes('duplicado')) {
        return NextResponse.json({ success: true, message: 'Ya procesado anteriormente' });
      }
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Enlazar la orden con el documento emitido. El `offline_id` vive dentro de
    // `metadata` (así lo guarda `/api/orders`), no en una columna propia.
    if (id) {
      const { error: linkError } = await auth.supabase
        .from('orders')
        .update({
          sii_document_id: result.documentId,
          sii_status: 'firmado',
          folio: result.folio,
        })
        .eq('store_id', storeId)
        .eq('metadata->>offline_id', String(id));

      if (linkError) {
        // No se revierte la emisión: el DTE ya existe y es legal. Se reporta para
        // que la orden se pueda reenlazar sin reemitir el folio.
        console.error('[SII Sync] DTE emitido pero la orden no se pudo enlazar:', linkError.message);
      }
    }

    return NextResponse.json({
      success: true,
      folio: result.folio,
      documentId: result.documentId,
    });
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error('[SII Sync Error]', error);
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
