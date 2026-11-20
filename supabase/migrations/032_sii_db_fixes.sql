-- 032_sii_db_fixes.sql
-- Cierra 3 gaps de robustez en el motor DTE:
--   Gap 11: trigger de folio duplicado con mensaje descriptivo (SQLSTATE 23505).
--   Gap 12: restringe get_next_folio a service_role (SECURITY DEFINER no puede escaparse al cliente).
--   Gap 13: reemplaza LIKE laxo en get_store_by_domain por matching exacto de dominios plataforma.

BEGIN;

---------------------------------------------------------------------------
-- Gap 11: Trigger BEFORE INSERT en sii_documents con mensaje descriptivo.
-- Replica la semántica del índice parcial de 030 (excluye metadata.test=true)
-- pero lanza error con contexto: folio, tipo DTE y store_id.
---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sii_documents_check_folio_duplicate()
RETURNS TRIGGER AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Saltar el chequeo si el documento es de prueba (certificación reemite folios a propósito).
    IF NEW.metadata IS NOT NULL AND (NEW.metadata->>'test') = 'true' THEN
        RETURN NEW;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.sii_documents d
        WHERE d.store_id = NEW.store_id
          AND d.tipo_dte = NEW.tipo_dte
          AND d.folio    = NEW.folio
          -- Coherente con el índice parcial 030: los tests existentes tampoco
          -- deberían chocar con uno real, pero la colisión real es contra no-tests.
          AND (d.metadata->>'test') IS DISTINCT FROM 'true'
    ) INTO v_exists;

    IF v_exists THEN
        RAISE EXCEPTION 'Folio % tipo % ya existe en tienda %',
            NEW.folio, NEW.tipo_dte, NEW.store_id
            USING ERRCODE = '23505';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sii_documents_folio_duplicate ON public.sii_documents;

CREATE TRIGGER trg_sii_documents_folio_duplicate
    BEFORE INSERT ON public.sii_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.sii_documents_check_folio_duplicate();

---------------------------------------------------------------------------
-- Gap 12: Restringir get_next_folio a service_role.
-- La función es SECURITY DEFINER; sin estos REVOKEs cualquier usuario
-- autenticado puede reservar folios desde el cliente, lo cual es un
-- hueco de escalada de privilegios (el cliente nunca debe decidir
-- qué folio se consume).
---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.get_next_folio(UUID, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.get_next_folio(UUID, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_folio(UUID, INTEGER) TO service_role;

---------------------------------------------------------------------------
-- Gap 13: Reemplazar LIKE laxo en get_store_by_domain por matching exacto.
-- El LIKE original (`p_host LIKE s.subdomain || '.%'`) aceptaba
-- `master.evil.com` como match de subdomain `master`. Ahora solo matchean:
--   1) custom_domain exacto (ya configurado por el dueño),
--   2) subdominio oficial de plataforma: <sub>.yahpos.cl,
--   3) entorno local de desarrollo: <sub>.localhost:3000.
-- Nota: el dominio oficial de plataforma será .yahpos.cl (pendiente de compra).
---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_store_by_domain(p_host TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    tier TEXT,
    subdomain TEXT,
    custom_domain TEXT,
    is_active BOOLEAN,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id, s.name, s.slug, s.tier, s.subdomain, s.custom_domain, s.is_active, s.config
    FROM public.stores s
    WHERE s.is_active = true AND (
        s.custom_domain = p_host OR
        s.subdomain || '.yahpos.cl' = p_host OR
        s.subdomain || '.localhost:3000' = p_host
    )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
