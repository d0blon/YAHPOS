-- 025_fix_get_store_id_live_lookup.sql (v2)
-- v1 fallo: permission denied for schema auth (no se puede escribir en auth.* desde
-- Supabase Studio SQL Editor, solo supabase_auth_admin puede).
-- Fix: crear la función en public en vez de auth, y reapuntar las 21 policies que
-- dependian de auth.get_store_id() (verificado contra pg_policies real, no contra
-- el historial de migraciones que tenia versiones desactualizadas/inconsistentes).

BEGIN;

CREATE OR REPLACE FUNCTION public.get_store_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT store_id FROM public.profiles WHERE id = auth.uid();
$$;

DROP POLICY IF EXISTS store_isolation_policy ON public.ai_usage_logs;
CREATE POLICY store_isolation_policy ON public.ai_usage_logs FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.branches;
CREATE POLICY store_isolation_policy ON public.branches FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.cash_sessions;
CREATE POLICY store_isolation_policy ON public.cash_sessions FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.categories;
CREATE POLICY store_isolation_policy ON public.categories FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.inventory;
CREATE POLICY store_isolation_policy ON public.inventory FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.order_items;
CREATE POLICY store_isolation_policy ON public.order_items FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.orders;
CREATE POLICY store_isolation_policy ON public.orders FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.payments;
CREATE POLICY store_isolation_policy ON public.payments FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.pending_inventory_adjustments;
CREATE POLICY store_isolation_policy ON public.pending_inventory_adjustments FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.pos_drafts;
CREATE POLICY store_isolation_policy ON public.pos_drafts FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.products;
CREATE POLICY store_isolation_policy ON public.products FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.profiles;
CREATE POLICY store_isolation_policy ON public.profiles FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.settings;
CREATE POLICY store_isolation_policy ON public.settings FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.shifts;
CREATE POLICY store_isolation_policy ON public.shifts FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_certification_cases;
CREATE POLICY store_isolation_policy ON public.sii_certification_cases FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_config;
CREATE POLICY store_isolation_policy ON public.sii_config FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_documents;
CREATE POLICY store_isolation_policy ON public.sii_documents FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_folios;
CREATE POLICY store_isolation_policy ON public.sii_folios FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_logs;
CREATE POLICY store_isolation_policy ON public.sii_logs FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.store_api_keys;
CREATE POLICY store_isolation_policy ON public.store_api_keys FOR ALL USING (store_id = public.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.terminals;
CREATE POLICY store_isolation_policy ON public.terminals FOR ALL USING (store_id = public.get_store_id());

COMMIT;
