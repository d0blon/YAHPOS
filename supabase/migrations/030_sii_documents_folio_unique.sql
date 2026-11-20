-- 030_sii_documents_folio_unique.sql
-- Un folio real es único por tienda y tipo. Se excluyen las emisiones de prueba
-- (metadata.test = true): la certificación reemite los mismos folios a propósito.
CREATE UNIQUE INDEX IF NOT EXISTS sii_documents_store_folio_key
  ON public.sii_documents (store_id, tipo_dte, folio)
  WHERE (metadata->>'test') IS DISTINCT FROM 'true';
