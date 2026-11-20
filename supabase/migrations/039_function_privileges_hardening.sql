-- 039_function_privileges_hardening.sql
-- Objetivo: quitar EXECUTE implícito de PUBLIC/anon/authenticated en funciones
-- SECURITY DEFINER que consumen folios, stock o borran tiendas. Los callers reales
-- usan service_role (engine.ts, bot/inventory/update, admin/inventory/approve) o
-- sesión verificada (api/sii/folios/offline -> reserve_folios).
-- NO APLICADA aún: requiere ejecución en SQL Editor con permisos de dueño.

-- 1. Funciones críticas: solo service_role
revoke all on function public.increment_product_stock(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.increment_product_stock(uuid, text, integer) to service_role;

revoke all on function public.get_next_folio(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_next_folio(uuid, integer) to service_role;

-- delete_store no tiene caller en src/. Si se necesita desde developer console,
-- invocarlo con service_role.
revoke all on function public.delete_store(uuid) from public, anon, authenticated;
grant execute on function public.delete_store(uuid) to service_role;

-- reserve_folios sí lo llama una sesión autenticada autorizada.
revoke all on function public.reserve_folios(uuid, integer, integer) from public, anon;
grant execute on function public.reserve_folios(uuid, integer, integer) to authenticated, service_role;

-- 2. Trigger functions: el trigger sigue funcionando; se quita RPC directa
revoke all on function public.audit_sensitive_changes() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.protect_profile_role_and_store_id() from public, anon, authenticated;
revoke all on function public.protect_store_id_in_metadata() from public, anon, authenticated;
revoke all on function public.sync_product_to_global_catalog() from public, anon, authenticated;
revoke all on function public.sync_product_distributor_to_global() from public, anon, authenticated;
grant execute on function public.sync_product_to_global_catalog() to service_role;
grant execute on function public.sync_product_distributor_to_global() to service_role;

-- 3. Helpers: anon no los necesita. get_store_by_domain sigue público para signup/branding.
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.es_admin() from public, anon;
revoke all on function public.get_current_store_id() from public, anon;
revoke all on function public.get_store_id() from public, anon;
revoke all on function public.get_merchant_id() from public, anon;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.es_admin() to authenticated, service_role;
grant execute on function public.get_current_store_id() to authenticated, service_role;
grant execute on function public.get_store_id() to authenticated, service_role;
grant execute on function public.get_merchant_id() to authenticated, service_role;

revoke all on function public.get_store_by_domain(text) from public;
grant execute on function public.get_store_by_domain(text) to anon, authenticated, service_role;

-- 4. search_path fijo (lint function_search_path_mutable)
alter function public.es_admin() set search_path = public, pg_temp;
alter function public.get_current_store_id() set search_path = public, pg_temp;
alter function public.protect_profile_role_and_store_id() set search_path = public, pg_temp;
alter function public.current_user_role() set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.sync_product_to_global_catalog() set search_path = public, pg_temp;
alter function public.protect_store_id_in_metadata() set search_path = public, pg_temp;
alter function public.increment_product_stock(uuid, text, integer) set search_path = public, pg_temp;
alter function public.sync_product_distributor_to_global() set search_path = public, pg_temp;
alter function public.sii_documents_check_folio_duplicate() set search_path = public, pg_temp;
alter function public.get_next_folio(uuid, integer) set search_path = public, pg_temp;
alter function public.get_store_by_domain(text) set search_path = public, pg_temp;

-- 5. Storage: quitar listado público de site-assets. El bucket sigue público
-- para URLs directas; lo que se elimina es la política SELECT amplia sobre storage.objects.
drop policy if exists "Public Access" on storage.objects;

-- 6. Fail-closed explícito para tabla interna de auditoría
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'security_audit_log'
      and policyname = 'deny_anon_security_audit_log') then
    create policy deny_anon_security_audit_log on public.security_audit_log
      for all to anon using (false) with check (false);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'security_audit_log'
      and policyname = 'deny_authenticated_security_audit_log') then
    create policy deny_authenticated_security_audit_log on public.security_audit_log
      for all to authenticated using (false) with check (false);
  end if;
end $$;

-- Verificación negativa esperada tras aplicar:
-- anon -> rpc/increment_product_stock  = 42501 permission denied
-- anon -> rpc/get_next_folio           = 42501 permission denied
-- anon -> rpc/delete_store             = 42501 permission denied
-- anon -> rpc/reserve_folios           = 42501 permission denied
-- anon -> rpc/get_store_by_domain      = 200 (branding)
