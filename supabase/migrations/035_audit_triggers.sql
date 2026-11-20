-- 035_audit_triggers.sql
--
-- Auditoría 2026-11-18 / 2026-11-19 (ítem 13 del checklist de seguridad).
-- Registra quién, cuándo y qué cambió en profiles, stores y sii_config.
-- Valores sensibles (password/token/secret/encrypted/private_key) se redactan.
--
-- Ejecutar en Supabase SQL Editor. Idempotente.

BEGIN;

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  actor uuid,
  actor_email text,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id text,
  store_id uuid,
  changed_columns text[] NOT NULL,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log FORCE ROW LEVEL SECURITY;

-- Solo service_role escribe/lee: no se crean policies para anon/authenticated.
REVOKE ALL ON public.security_audit_log FROM anon, authenticated;
GRANT SELECT, INSERT ON public.security_audit_log TO service_role;

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
    audited_cols := ARRAY['store_id', 'rut_emisor', 'acteco', 'nro_resol', 'fch_resol', 'ambiente', 'certificado_pfx_encrypted', 'certificado_password_encrypted', 'updated_at'];
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
    actor,
    actor_email,
    table_name,
    operation,
    record_id,
    store_id,
    changed_columns,
    old_values,
    new_values
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

DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_stores_changes ON public.stores;
CREATE TRIGGER audit_stores_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_sii_config_changes ON public.sii_config;
CREATE TRIGGER audit_sii_config_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.sii_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_changes();

COMMIT;
