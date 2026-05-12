-- 005_rls_toggles.sql
-- Implementación de lógica dinámica para toggles de configuración (Plus/Elite)

BEGIN;

-- 1. Helper para obtener el merchant_id de cualquier tienda (Seguro)
CREATE OR REPLACE FUNCTION public.get_merchant_id_of_store(store_uuid UUID)
RETURNS UUID AS $$
  SELECT merchant_id FROM public.stores WHERE id = store_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Actualizar política de Órdenes (Consolidación de Reportes)
DROP POLICY IF EXISTS store_isolation_policy ON public.orders;
CREATE POLICY store_isolation_policy ON public.orders FOR ALL
USING (
    -- Caso base: Acceso a la tienda activa
    store_id = auth.get_store_id()
    OR 
    -- Caso consolidado: El merchant puede ver otras tiendas si el toggle está activo en la tienda actual
    (
        (SELECT (config->>'consolidate_reports')::boolean FROM public.stores WHERE id = auth.get_store_id())
        AND 
        public.get_merchant_id_of_store(store_id) = auth.get_merchant_id()
    )
);

-- 3. Actualizar política de Inventario (Inventario Compartido)
DROP POLICY IF EXISTS store_isolation_policy ON public.inventory;
CREATE POLICY store_isolation_policy ON public.inventory FOR ALL
USING (
    store_id = auth.get_store_id()
    OR 
    (
        (SELECT (config->>'share_inventory')::boolean FROM public.stores WHERE id = auth.get_store_id())
        AND 
        public.get_merchant_id_of_store(store_id) = auth.get_merchant_id()
    )
);

-- 4. Repetir lógica para productos si es necesario compartir catálogo
DROP POLICY IF EXISTS store_isolation_policy ON public.products;
CREATE POLICY store_isolation_policy ON public.products FOR ALL
USING (
    store_id = auth.get_store_id()
    OR 
    (
        (SELECT (config->>'share_inventory')::boolean FROM public.stores WHERE id = auth.get_store_id())
        AND 
        public.get_merchant_id_of_store(store_id) = auth.get_merchant_id()
    )
);

COMMIT;
