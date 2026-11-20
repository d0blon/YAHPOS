-- 028_orders_sii_link.sql
--
-- Enlaza una venta del POS con el DTE que la representa.
--
-- Hasta ahora el POS imprimia pidiendo `/api/sii/documentos/<id>/pdf` con el id
-- local de la orden (`POS-<timestamp>`). Ese valor no es un `sii_documents.id`,
-- asi que la ruta respondia 404 siempre. Para imprimir el DTE real hace falta
-- guardar el documento emitido en la orden.
--
--   sii_document_id -> fila de public.sii_documents con el XML firmado.
--   sii_status      -> estado de emision (firmado / enviado / aceptado / rechazado).
--   folio           -> folio del DTE, para mostrar y para reimprimir sin joins.
--
-- Se agregan con IF NOT EXISTS: `sii_status` y `folio` ya se usan en
-- `src/app/api/sii/sync/route.ts` y pueden existir en la base viva aunque no
-- estuvieran declaradas en una migracion.
--
-- RLS: `orders` ya tiene store_isolation_policy sobre `store_id`
-- (025_fix_get_store_id_live_lookup.sql). No se agrega una politica nueva: la
-- escritura de estas columnas la hace el servidor con el cliente autenticado del
-- dueno de la tienda, bajo esa misma politica.

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS sii_document_id UUID
        REFERENCES public.sii_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS sii_status TEXT,
    ADD COLUMN IF NOT EXISTS folio BIGINT;

CREATE INDEX IF NOT EXISTS orders_sii_document_id_idx
    ON public.orders (sii_document_id);

COMMENT ON COLUMN public.orders.sii_document_id IS
    'DTE firmado que representa esta venta (public.sii_documents.id).';
COMMENT ON COLUMN public.orders.sii_status IS
    'Estado de emision del DTE: firmado | enviado | aceptado | rechazado.';
COMMENT ON COLUMN public.orders.folio IS
    'Folio del DTE asociado a la venta.';
