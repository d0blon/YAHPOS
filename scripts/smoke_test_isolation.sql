-- smoke_test_isolation.sql
-- Scripts de validación para aislamiento de 2 niveles y toggles (Semana 2)

-- NOTA: Ejecutar estos bloques individualmente para verificar resultados.

-- ==========================================
-- TEST 1: Aislamiento Cross-Merchant (Nivel 1)
-- ==========================================
-- Comerciante A no debe ver tiendas del Comerciante B
DO $$
DECLARE
    merchant_a_id UUID;
    merchant_b_id UUID;
    count_stores INTEGER;
BEGIN
-- Simular Merchant A
    -- auth.uid() lee el campo 'sub' del JWT
    SET LOCAL "request.jwt.claims" = '{"sub": "00000000-0000-0000-0000-00000000000a"}';
    
    SELECT count(*) INTO count_stores FROM public.stores;
    RAISE NOTICE 'Merchant A ve % tiendas (Esperado: solo las suyas)', count_stores;
END $$;

-- ==========================================
-- TEST 2: Aislamiento Store vs Store (Nivel 2)
-- ==========================================
-- Con toggles OFF, Tienda 1 no ve datos de Tienda 2 (mismo merchant)
DO $$
DECLARE
    store_1_id UUID := 'c828f16e-4572-4700-97e6-66b6180d6a9d';
    count_orders INTEGER;
BEGIN
    -- Simular estar logueado en Tienda 1
    -- Se requiere 'sub' para auth.uid() y 'user_metadata->store_id' para auth.get_store_id()
    SET LOCAL "request.jwt.claims" = '{
        "sub": "00000000-0000-0000-0000-00000000000a",
        "user_metadata": {"store_id": "c828f16e-4572-4700-97e6-66b6180d6a9d"}
    }';
    
    -- Intentar ver órdenes (RLS debería filtrar solo store_1_id)
    SELECT count(*) INTO count_orders FROM public.orders WHERE store_id <> 'c828f16e-4572-4700-97e6-66b6180d6a9d';
    IF count_orders > 0 THEN
        RAISE EXCEPTION 'FALLO: Se ven órdenes de otras tiendas con toggle OFF';
    ELSE
        RAISE NOTICE 'EXITO: Aislamiento de tienda activo';
    END IF;
END $$;

-- ==========================================
-- TEST 3: Share Inventory (Toggle ON)
-- ==========================================
-- Activar share_inventory y validar visibilidad
DO $$
DECLARE
    active_store_id UUID := 'c828f16e-4572-4700-97e6-66b6180d6a9d';
BEGIN
    -- 1. Activar toggle
    UPDATE public.stores SET config = config || '{"share_inventory": true}' WHERE id = active_store_id;
    
    -- 2. Simular sesión
    SET LOCAL "request.jwt.claims" = '{
        "sub": "00000000-0000-0000-0000-00000000000a",
        "user_metadata": {"store_id": "c828f16e-4572-4700-97e6-66b6180d6a9d"}
    }';
    
    -- 3. Verificar si ve productos de otras tiendas del mismo merchant
    -- (Asumiendo que existen datos de prueba)
    RAISE NOTICE 'Toggle Share Inventory activado. Validar en UI/API.';
END $$;

-- ==========================================
-- TEST 4: Consolidate Reports (Toggle ON)
-- ==========================================
DO $$
BEGIN
    UPDATE public.stores SET config = config || '{"consolidate_reports": true}' WHERE id = 'c828f16e-4572-4700-97e6-66b6180d6a9d';
    RAISE NOTICE 'Toggle Consolidate Reports activado. El Merchant podrá ver ventas globales.';
END $$;

-- ==========================================
-- LIMPIEZA (Opcional, para dejar el entorno limpio)
-- ==========================================
-- UPDATE public.stores SET config = config || '{"share_inventory": false, "consolidate_reports": false}' WHERE id = 'c828f16e-4572-4700-97e6-66b6180d6a9d';
