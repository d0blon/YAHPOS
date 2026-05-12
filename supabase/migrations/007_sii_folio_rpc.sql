-- 007_sii_folio_rpc.sql
-- Función atómica para obtener el siguiente folio disponible y marcarlo como usado

CREATE OR REPLACE FUNCTION public.get_next_folio(
    p_store_id UUID,
    p_tipo_dte INTEGER
)
RETURNS TABLE (
    v_id UUID,
    v_folio_actual INTEGER,
    v_folio_hasta INTEGER,
    v_caf_xml TEXT
) AS $$
DECLARE
    r_folio RECORD;
BEGIN
    -- Bloquear la fila para evitar condiciones de carrera (FOR UPDATE)
    SELECT id, folio_actual, folio_hasta, caf_xml
    INTO r_folio
    FROM public.sii_folios
    WHERE store_id = p_store_id 
      AND tipo_dte = p_tipo_dte
      AND activo = true
      AND folio_actual <= folio_hasta
    ORDER BY folio_desde ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No hay folios disponibles para el tipo %', p_tipo_dte;
    END IF;

    -- Retornar los datos actuales
    v_id := r_folio.id;
    v_folio_actual := r_folio.folio_actual;
    v_folio_hasta := r_folio.folio_hasta;
    v_caf_xml := r_folio.caf_xml;

    -- Incrementar el folio para la próxima vez
    UPDATE public.sii_folios
    SET folio_actual = folio_actual + 1,
        activo = (CASE WHEN folio_actual + 1 > folio_hasta THEN false ELSE true END)
    WHERE id = r_folio.id;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
