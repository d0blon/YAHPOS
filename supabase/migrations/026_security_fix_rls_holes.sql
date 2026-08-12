-- 026_security_fix_rls_holes.sql
-- Cierra agujeros reales de RLS encontrados en auditoría completa (2026-08-12).
-- Ver TASK_HANDOFF.md para el detalle de cada hallazgo.

BEGIN;

-- ============================================================
-- 1. profiles: bloquear auto-escalada de role/store_id
-- ============================================================
-- Las policies de "propio perfil" (perfil_propio, self_access) permiten editar
-- CUALQUIER columna sin restricción, incluidas role y store_id -- confirmado explotable
-- con prueba real. Un trigger BEFORE UPDATE bloquea esas dos columnas específicas para
-- cualquier rol que no sea service_role, sin afectar la edición legítima de
-- nombre/telefono/rut/etc por el propio usuario.
CREATE OR REPLACE FUNCTION public.protect_profile_role_and_store_id()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('role') <> 'service_role' THEN
    IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.store_id IS DISTINCT FROM NEW.store_id) THEN
      RAISE EXCEPTION 'Seguridad: no se permite modificar role/store_id directamente. Use una acción de servidor autorizada.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profile_role_store_id ON public.profiles;
CREATE TRIGGER tr_protect_profile_role_store_id
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role_and_store_id();

-- ============================================================
-- 2. stores: sacar el "cualquiera puede editar/borrar cualquier tienda"
-- ============================================================
-- auth.get_merchant_id() (migración 003) NUNCA se aplicó de verdad a esta DB (mismo
-- permission wall del schema auth que ya vimos con get_store_id) -- se verificó con
-- pg_proc que no existe en ningún schema. La tabla merchants sí existe. Creamos el
-- equivalente en public, mismo patrón que public.get_store_id().
CREATE OR REPLACE FUNCTION public.get_merchant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.merchants WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.stores;

CREATE POLICY "Merchants manage own stores - insert" ON public.stores
FOR INSERT WITH CHECK (merchant_id = public.get_merchant_id());

CREATE POLICY "Merchants manage own stores - update" ON public.stores
FOR UPDATE USING (merchant_id = public.get_merchant_id());

-- Las policies de SELECT público existentes (Allow public read access for stores,
-- Allow select for everyone) quedan intactas -- son necesarias para el storefront público.

-- ============================================================
-- 3. merchants: restaurar el scope "own" que decía la policy pero no cumplía
-- ============================================================
DROP POLICY IF EXISTS "Users can manage their own merchant profile" ON public.merchants;
CREATE POLICY "Users can manage their own merchant profile" ON public.merchants
FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- 4. admin_finances: acceso total sin restricción -> bloqueado completo
-- ============================================================
-- Tabla interna de YAHPOS! (finanzas de la plataforma, no de un tenant). Todo el acceso
-- legítimo pasa por Server Actions con createAdminClient() (ver Parte 2 de este handoff)
-- -- no necesita ninguna policy para authenticated/anon, service_role bypassea RLS igual.
DROP POLICY IF EXISTS "Admins can manage finances" ON public.admin_finances;

-- ============================================================
-- 5. cash_movements: acceso total sin restricción -> scope por tienda
-- ============================================================
DROP POLICY IF EXISTS "Permitir todo a cash_movements" ON public.cash_movements;
CREATE POLICY store_isolation_policy ON public.cash_movements
FOR ALL USING (store_id = public.get_store_id());

-- ============================================================
-- 6. shifts: sacar el "cualquiera puede leer/escribir cualquier turno"
-- ============================================================
-- Las otras 3 policies existentes (Admins pueden gestionar los turnos, Todos los
-- trabajadores pueden ver sus turnos, store_isolation_policy) ya cubren los casos
-- legítimos -- esta era la única sin ninguna restricción.
DROP POLICY IF EXISTS "Permitir gestión de turnos" ON public.shifts;

-- ============================================================
-- 7. store_settings: tabla sin uso en el código actual, acceso total -> bloqueado
-- ============================================================
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.store_settings;
-- Se deja "Allow public read for store_settings" intacta (solo lectura, sin riesgo).

-- ============================================================
-- 8. supplier_product_mappings: nombre decía "admin users", condición real era
--    "cualquier usuario autenticado" -> scope por tienda
-- ============================================================
DROP POLICY IF EXISTS "Enable all actions for admin users" ON public.supplier_product_mappings;
DROP POLICY IF EXISTS "Enable select for all authenticated users" ON public.supplier_product_mappings;
CREATE POLICY store_isolation_policy ON public.supplier_product_mappings
FOR ALL USING (store_id = public.get_store_id());

COMMIT;
