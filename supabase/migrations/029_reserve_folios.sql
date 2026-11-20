-- 029_reserve_folios.sql
-- Reserva un lote de folios de forma atómica y solo para la tienda del usuario.
-- Reemplaza el read-then-update de /api/sii/folios/offline, que no bloqueaba la fila
-- y permitía que dos terminales de la misma tienda reservaran el mismo rango.
CREATE OR REPLACE FUNCTION public.reserve_folios(
  p_store_id uuid,
  p_tipo_dte integer,
  p_count integer
)
RETURNS TABLE(v_start integer, v_end integer, v_caf_xml text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  target_id uuid;
  v_actual integer;
  v_hasta integer;
  v_tomar integer;
BEGIN
  IF p_store_id IS DISTINCT FROM public.get_store_id() THEN
    RAISE EXCEPTION 'No autorizado para esta tienda';
  END IF;

  IF p_count IS NULL OR p_count <= 0 THEN
    RAISE EXCEPTION 'count debe ser mayor que cero';
  END IF;

  SELECT f.id, f.folio_actual, f.folio_hasta
    INTO target_id, v_actual, v_hasta
  FROM public.sii_folios f
  WHERE f.store_id = p_store_id
    AND f.tipo_dte = p_tipo_dte
    AND f.activo = true
    AND f.folio_actual <= f.folio_hasta
  ORDER BY f.folio_desde ASC
  LIMIT 1
  FOR UPDATE;

  IF target_id IS NULL THEN
    RETURN;
  END IF;

  v_tomar := LEAST(p_count, v_hasta - v_actual + 1);

  UPDATE public.sii_folios
     SET folio_actual = v_actual + v_tomar
   WHERE id = target_id;

  RETURN QUERY
    SELECT v_actual, v_actual + v_tomar - 1,
           (SELECT caf_xml FROM public.sii_folios WHERE id = target_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reserve_folios(uuid, integer, integer) TO authenticated;
