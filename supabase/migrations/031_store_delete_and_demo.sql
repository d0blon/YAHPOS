-- 031_store_delete_and_demo.sql
-- Borrado atómico de tienda + flag is_demo para reemplazar el hardcode
-- DEMO_HOST_PREFIX = 'master.' de src/app/api/products/route.ts.
--
-- Hoy un DELETE FROM stores falla por FK (las 10 tablas de 006 tienen
-- store_id NOT NULL sin ON DELETE). Esta migración crea un RPC SECURITY
-- DEFINER que borra en orden de dependencia dentro de una sola transacción.

BEGIN;

-- ============================================================
-- 1. Flag is_demo en stores
-- ============================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.stores.is_demo IS
  'Marca explícita de tienda demo. Reemplaza el hardcode DEMO_HOST_PREFIX = ''master.''.';

-- ============================================================
-- 2. Función delete_store(p_store_id UUID)
-- ============================================================
-- Roles reales del CHECK constraint check_role (010_roles.sql):
--   'customer','employee','picker','owner','developer','admin',
--   'manager','cashier','warehouse'
--
-- Permiso de borrado:
--   a) Rol plataforma 'owner' o 'developer' en profiles.role (008/010) —
--      son los únicos que operan la plataforma YAHPOS!, no una tienda.
--   b) Miembro de la tienda en user_stores (017) con rol 'owner', 'developer'
--      o 'admin' — el dueño/admin legítimo de esa tienda específica.
--
-- No se crea policy DELETE en public.stores (ver justificación al final).
CREATE OR REPLACE FUNCTION public.delete_store(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_caller_id   UUID;
  v_caller_role TEXT;
  v_us_role     TEXT;
BEGIN
  -- 2a. Identificar al llamador
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'No autenticado: se requiere usuario autenticado para borrar una tienda';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

  -- 2b. Verificar permiso: rol plataforma o membresía en la tienda
  IF v_caller_role NOT IN ('owner', 'developer') THEN
    -- No es plataforma → verificar membresía en user_stores
    SELECT role INTO v_us_role
      FROM public.user_stores
     WHERE user_id = v_caller_id AND store_id = p_store_id;

    IF v_us_role IS NULL OR v_us_role NOT IN ('owner', 'developer', 'admin') THEN
      RAISE EXCEPTION 'No autorizado: solo owner/developer de plataforma o miembro owner/developer/admin de la tienda pueden borrarla';
    END IF;
  END IF;

  -- 2c. Verificar que la tienda existe
  IF NOT EXISTS (SELECT 1 FROM public.stores WHERE id = p_store_id) THEN
    RAISE EXCEPTION 'Tienda % no existe', p_store_id;
  END IF;

  -- 2d. Borrar en orden de dependencia.
  -- Orden: primero tablas con FK NOT NULL sin CASCADE (bloquean el DELETE),
  -- luego las nullable sin CASCADE, luego SET NULL explícito, y al final stores.
  -- subscriptions y user_stores tienen ON DELETE CASCADE — se limpian solas,
  -- pero las borramos explícito para que el orden sea visible y determinista.

  -- (1) inventory → FK NOT NULL a stores + FK a branches (borrar antes que branches)
  DELETE FROM public.inventory WHERE store_id = p_store_id;

  -- (2) branches → FK NOT NULL a stores
  DELETE FROM public.branches WHERE store_id = p_store_id;

  -- (3) payments → FK a stores (order_id FK a orders no bloquea porque orders no tiene FK a stores)
  DELETE FROM public.payments WHERE store_id = p_store_id;

  -- (4) shifts → FK a stores
  DELETE FROM public.shifts WHERE store_id = p_store_id;

  -- (5) pos_drafts → FK a stores
  DELETE FROM public.pos_drafts WHERE store_id = p_store_id;

  -- (6) cash_movements → FK a stores (session_id FK a cash_sessions no bloquea)
  DELETE FROM public.cash_movements WHERE store_id = p_store_id;

  -- (7) sii_config → FK NOT NULL a stores
  DELETE FROM public.sii_config WHERE store_id = p_store_id;

  -- (8) sii_folios → FK NOT NULL a stores
  DELETE FROM public.sii_folios WHERE store_id = p_store_id;

  -- (9) sii_documents → FK NOT NULL a stores
  DELETE FROM public.sii_documents WHERE store_id = p_store_id;

  -- (10) sii_logs → FK NOT NULL a stores
  DELETE FROM public.sii_logs WHERE store_id = p_store_id;

  -- (11) sii_certification_cases → FK NOT NULL a stores
  DELETE FROM public.sii_certification_cases WHERE store_id = p_store_id;

  -- (12) ai_usage_logs → FK nullable a stores (002)
  DELETE FROM public.ai_usage_logs WHERE store_id = p_store_id;

  -- (13) master_catalog_submissions → FK nullable a stores (024, columna submitted_by_store_id)
  DELETE FROM public.master_catalog_submissions WHERE submitted_by_store_id = p_store_id;

  -- (14) admin_finances → ON DELETE SET NULL (011). Borramos explícito para que
  --     no queden filas huérfanas con store_id = NULL en la tabla de finanzas.
  DELETE FROM public.admin_finances WHERE store_id = p_store_id;

  -- (15) subscriptions → ON DELETE CASCADE (012). Borramos explícito.
  DELETE FROM public.subscriptions WHERE store_id = p_store_id;

  -- (16) user_stores → ON DELETE CASCADE (017). Borramos explícito.
  DELETE FROM public.user_stores WHERE store_id = p_store_id;

  -- (17) Finalmente, la tienda.
  DELETE FROM public.stores WHERE id = p_store_id;
END;
$func$;

COMMENT ON FUNCTION public.delete_store IS
  'Borrado atómico de tienda con doble verificación de rol. Toda la función corre en una sola transacción.';

-- ============================================================
-- 3. Policy DELETE en stores — INTENCIONALMENTE NO SE CREA
-- ============================================================
-- No se crea ninguna policy DELETE en public.stores. Justificación:
--   - El único camino legítimo para borrar una tienda es el RPC delete_store(),
--     que corre con SECURITY DEFINER (bypassea RLS) y tiene su propia verificación
--     de permisos (rol plataforma owner/developer, o membresía owner/developer/admin).
--   - Sin policy DELETE, un .delete() suelto desde el cliente Supabase falla con
--     "new row violates row-level security" incluso si el usuario es owner de la tienda.
--   - service_role (admin client desde Server Actions) bypassea RLS igual, así que
--     el backend sigue pudiendo llamar al RPC sin problema.
-- Esto garantiza que el borrado NUNCA se dispara accidentalmente desde el cliente.

-- ============================================================
-- 4. GRANT / REVOKE en delete_store
-- ============================================================
-- Ejecución solo para authenticated (dueños/miembros logueados) y service_role.
-- anon NO puede ejecutar — un visitante anónimo no debería poder borrar nada.
REVOKE ALL ON FUNCTION public.delete_store(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_store(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_store(UUID) TO service_role;

COMMIT;
