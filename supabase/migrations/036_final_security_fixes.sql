-- 036_final_security_fixes.sql
--
-- Cierre de la revalidación final 2026-11-19:
--  * R8: la auditoría 035 miraba `ambiente` (columna inexistente); la real es `environment`.
--  * R3: evitar duplicados de staff por (store_id, rut) sin tocar perfiles de clientes.
--  * Ítems 4/7: hacer explícito el fail-closed de las 3 tablas sin policies.
--
-- Idempotente. Ejecutar en Supabase SQL Editor.

BEGIN;

-- R8: redefinir la función conservando el nombre: los triggers ya apuntan a ella.
CREATE OR REPLACE FUNCTION public.audit_sensitive_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $audit$
DECLARE
  old_json jsonb := '{}'::jsonb;
  new_json jsonb := '{}'::jsonb;
  audited_cols text[] := ARRAY[]::text[];
  changed text[] := ARRAY[]::text[];
  old_vals jsonb := '{}'::jsonb;
  new_vals jsonb := '{}'::jsonb;
  col text;
  sensitive boolean;
  rec_store text;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    audited_cols := ARRAY['id', 'store_id', 'role', 'first_name', 'last_name', 'email', 'phone', 'is_full_account', 'current_area', 'updated_at'];
  ELSIF TG_TABLE_NAME = 'stores' THEN
    audited_cols := ARRAY['id', 'name', 'subdomain', 'domain', 'owner_id', 'status', 'plan', 'updated_at'];
  ELSIF TG_TABLE_NAME = 'sii_config' THEN
    -- `environment` es la columna real (006_consolidate_schema.sql:80).
    audited_cols := ARRAY['store_id', 'rut_emisor', 'acteco', 'nro_resol', 'fch_resol', 'environment', 'certificado_pfx_encrypted', 'certificado_password_encrypted', 'updated_at'];
  ELSE
    RETURN NULL;
  END IF;

  IF TG_OP <> 'DELETE' THEN
    new_json := to_jsonb(NEW);
  END IF;
  IF TG_OP <> 'INSERT' THEN
    old_json := to_jsonb(OLD);
  END IF;

  FOREACH col IN ARRAY audited_cols LOOP
    IF (old_json ? col OR new_json ? col) AND (old_json -> col) IS DISTINCT FROM (new_json -> col) THEN
      sensitive := col ~* '(password|token|secret|encrypted|private_key|api_key)';
      changed := array_append(changed, col);
      old_vals := old_vals || jsonb_build_object(col, CASE WHEN sensitive THEN to_jsonb('[REDACTED]'::text) ELSE old_json -> col END);
      new_vals := new_vals || jsonb_build_object(col, CASE WHEN sensitive THEN to_jsonb('[REDACTED]'::text) ELSE new_json -> col END);
    END IF;
  END LOOP;

  IF array_length(changed, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  rec_store := coalesce(old_json ->> 'store_id', new_json ->> 'store_id');

  INSERT INTO public.security_audit_log (
    actor, actor_email, table_name, operation, record_id, store_id,
    changed_columns, old_values, new_values
  )
  VALUES (
    auth.uid(),
    auth.jwt() ->> 'email',
    TG_TABLE_NAME,
    TG_OP,
    coalesce(old_json ->> 'id', new_json ->> 'id', rec_store),
    CASE WHEN rec_store ~ '^[0-9a-fA-F-]{36}$' THEN rec_store::uuid ELSE NULL END,
    changed,
    old_vals,
    new_vals
  );

  RETURN NULL;
END
$audit$;

-- R3: unicidad solo para personal. Los clientes pueden repetir RUT entre tiendas.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_staff_store_rut_key
  ON public.profiles (store_id, rut)
  WHERE rut IS NOT NULL
    AND role IN ('admin', 'manager', 'cashier', 'warehouse');

-- Fail-closed explícito: sin policies ya estaba bloqueado, ahora queda documentado
-- en el catálogo y no depende de que nadie agregue una policy permisiva después.
-- CREATE POLICY no acepta IF NOT EXISTS en esta versión de Postgres.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_finances' AND policyname='deny_anon_admin_finances') THEN
    CREATE POLICY deny_anon_admin_finances ON public.admin_finances FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_finances' AND policyname='deny_authenticated_admin_finances') THEN
    CREATE POLICY deny_authenticated_admin_finances ON public.admin_finances FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='master_catalog_submissions' AND policyname='deny_anon_master_catalog_submissions') THEN
    CREATE POLICY deny_anon_master_catalog_submissions ON public.master_catalog_submissions FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='master_catalog_submissions' AND policyname='deny_authenticated_master_catalog_submissions') THEN
    CREATE POLICY deny_authenticated_master_catalog_submissions ON public.master_catalog_submissions FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='deny_anon_users') THEN
    CREATE POLICY deny_anon_users ON public.users FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='deny_authenticated_users') THEN
    CREATE POLICY deny_authenticated_users ON public.users FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;

COMMIT;
