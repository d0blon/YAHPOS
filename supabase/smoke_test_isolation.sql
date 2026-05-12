-- SMOKE TEST: AISLAMIENTO MULTI-TENANT (YAHPOS!) - VERSIÓN AUDITADA
-- Este script valida el aislamiento de Nivel 1 (Merchant) y Nivel 2 (Store)

-- 1. PREPARACIÓN (Ejecutar como superuser/postgres)
-- Creamos un escenario de prueba completo
DO $$
DECLARE
    v_merchant_id UUID;
    v_store_a_id UUID := '00000000-0000-0000-0000-00000000000a';
    v_store_b_id UUID := '00000000-0000-0000-0000-00000000000b';
    v_user_id UUID := '00000000-0000-0000-0000-000000000001'; -- ID ficticio para auth.uid()
BEGIN
    -- Limpieza
    DELETE FROM public.orders WHERE store_id IN (v_store_a_id, v_store_b_id);
    DELETE FROM public.stores WHERE id IN (v_store_a_id, v_store_b_id);
    DELETE FROM public.merchants WHERE user_id = v_user_id;

    -- Crear Merchant
    INSERT INTO public.merchants (user_id) VALUES (v_user_id) RETURNING id INTO v_merchant_id;

    -- Crear Tiendas vinculadas al mismo Merchant
    INSERT INTO public.stores (id, name, merchant_id, config) 
    VALUES (v_store_a_id, 'Tienda A', v_merchant_id, '{"consolidate_reports": false}');
    
    INSERT INTO public.stores (id, name, merchant_id, config) 
    VALUES (v_store_b_id, 'Tienda B', v_merchant_id, '{"consolidate_reports": false}');

    RAISE NOTICE 'Escenario preparado: Merchant %, Tienda A %, Tienda B %', v_merchant_id, v_store_a_id, v_store_b_id;
END $$;

-- 2. TEST: AISLAMIENTO NIVEL 2 (Tienda vs Tienda)
-- Probamos que la Tienda A no vea datos de la Tienda B
DO $$
DECLARE
    v_count INTEGER;
    v_store_a_id UUID := '00000000-0000-0000-0000-00000000000a';
    v_store_b_id UUID := '00000000-0000-0000-0000-00000000000b';
BEGIN
    -- Insertamos datos bypassando RLS para el setup
    INSERT INTO public.orders (id, store_id, total, status) 
    VALUES ('00000000-0000-0000-0000-00000000000a', v_store_a_id, 100, 'completed');
    
    INSERT INTO public.orders (id, store_id, total, status) 
    VALUES ('00000000-0000-0000-0000-00000000000b', v_store_b_id, 200, 'completed');

    -- Simulamos JWT de Tienda A
    PERFORM set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {"store_id": "00000000-0000-0000-0000-00000000000a"}}', true);
    
    -- Consulta bajo RLS
    SELECT count(*) INTO v_count FROM public.orders;
    
    IF v_count = 1 THEN
        RAISE NOTICE 'ÉXITO: Tienda A solo ve 1 orden (la suya).';
    ELSE
        RAISE EXCEPTION 'FALLO: Tienda A ve % órdenes. Aislamiento roto.', v_count;
    END IF;
END $$;

-- 3. TEST: AISLAMIENTO NIVEL 1 (Toggle de Consolidación)
DO $$
DECLARE
    v_count INTEGER;
    v_store_a_id UUID := '00000000-0000-0000-0000-00000000000a';
    v_store_b_id UUID := '00000000-0000-0000-0000-00000000000b';
BEGIN
    -- Activamos consolidación en Tienda B
    UPDATE public.stores SET config = config || '{"consolidate_reports": true}' WHERE id = v_store_b_id;

    -- Simulamos JWT de Tienda B
    PERFORM set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "user_metadata": {"store_id": "00000000-0000-0000-0000-00000000000b"}}', true);

    -- Consulta bajo RLS
    SELECT count(*) INTO v_count FROM public.orders;

    IF v_count = 2 THEN
        RAISE NOTICE 'ÉXITO: Tienda B ve 2 órdenes (Consolidación activa).';
    ELSE
        RAISE EXCEPTION 'FALLO: Tienda B ve % órdenes. Consolidación no funcionó.', v_count;
    END IF;

    -- Desactivamos consolidación
    UPDATE public.stores SET config = config || '{"consolidate_reports": false}' WHERE id = v_store_b_id;
    
    SELECT count(*) INTO v_count FROM public.orders;
    IF v_count = 1 THEN
        RAISE NOTICE 'ÉXITO: Al desactivar toggle, Tienda B vuelve a ver solo 1 orden.';
    ELSE
        RAISE EXCEPTION 'FALLO: Al desactivar toggle, Tienda B ve % órdenes.', v_count;
    END IF;
END $$;

RESET ALL;
