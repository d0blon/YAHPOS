-- 034_security_fix_cross_tenant_and_rls.sql
--
-- Auditoría 2026-11-18 (ítems 4, 7 del checklist de seguridad).
-- Cierra policies con scope incompleto y activa FORCE ROW LEVEL SECURITY.
--
-- Ver: docs/seguridad/CHECKLIST_SEGURIDAD.md
--
-- Ejecutar en Supabase SQL Editor. Idempotente.

BEGIN;

-- ============================================================
-- 1. profiles: admin_total / manager_profile_access sin store_id
-- ============================================================
-- Verificado en vivo: ambas policies usaban SOLO (auth.jwt() ->> 'role'),
-- sin ningún filtro por tienda. En Supabase el claim JWT 'role' suele ser
-- 'authenticated', así que hoy probablemente son inertes — pero dejan la
-- puerta abierta si el claim pasa a poblarse con roles custom.
-- store_isolation_policy ya cubre el acceso legítimo dentro de la propia
-- tienda, así que agregar el scope no quita ningún permiso real.
DROP POLICY IF EXISTS "admin_total" ON public.profiles;
CREATE POLICY "admin_total" ON public.profiles
  FOR ALL
  USING (
    store_id = public.get_store_id()
    AND (auth.jwt() ->> 'role') = 'admin'
  )
  WITH CHECK (
    store_id = public.get_store_id()
    AND (auth.jwt() ->> 'role') = 'admin'
  );

DROP POLICY IF EXISTS "manager_profile_access" ON public.profiles;
CREATE POLICY "manager_profile_access" ON public.profiles
  FOR ALL
  USING (
    store_id = public.get_store_id()
    AND (auth.jwt() ->> 'role') = 'manager'
  )
  WITH CHECK (
    store_id = public.get_store_id()
    AND (auth.jwt() ->> 'role') = 'manager'
  );

-- ============================================================
-- 2. sii_logs: insert libre (with_check = true)
-- ============================================================
-- Verificado en vivo: "System can insert logs" tenía with_check: true,
-- permitiendo insertar logs con cualquier store_id. Los inserts del motor
-- DTE pasan por service_role (BYPASSRLS), así que este cambio no los afecta.
DROP POLICY IF EXISTS "System can insert logs" ON public.sii_logs;
CREATE POLICY "System can insert logs" ON public.sii_logs
  FOR INSERT
  WITH CHECK (store_id = public.get_store_id());

-- ============================================================
-- 3. FORCE ROW LEVEL SECURITY en todas las tablas con RLS
-- ============================================================
-- Defensa en profundidad: el dueño de la tabla también queda sujeto a RLS.
-- service_role tiene BYPASSRLS y sigue operando igual; superusers tampoco
-- se ven afectados. El cliente (anon/authenticated) ya estaba sujeto a RLS,
-- así que NO cambia el comportamiento de la app.
-- Si algún proceso interno se conectara como dueño de tabla y se rompe,
-- revertir con: ALTER TABLE public.<tabla> NO FORCE ROW LEVEL SECURITY;
DO $force_rls$
DECLARE
  tbl text;
  affected integer := 0;
BEGIN
  FOR tbl IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
    ORDER BY c.relname
  LOOP
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl);
    affected := affected + 1;
  END LOOP;
  RAISE NOTICE 'FORCE RLS aplicado a % tablas', affected;
END
$force_rls$;

COMMIT;
