-- 001_fix_multitenancy_rls.sql
-- Auditoría y Blindaje Multi-tenant YAHPOS!

BEGIN;

-- 1. Función Auxiliar para obtener store_id del JWT
CREATE OR REPLACE FUNCTION auth.get_store_id() 
RETURNS UUID AS $$
  SELECT (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'store_id')::uuid;
$$ LANGUAGE sql STABLE;

-- 2. Estandarización de Columnas (business_id -> store_id)
DO $$ 
BEGIN
    -- sii_documents
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sii_documents' AND column_name = 'business_id') THEN
        ALTER TABLE public.sii_documents RENAME COLUMN business_id TO store_id;
    END IF;
    -- sii_folios
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sii_folios' AND column_name = 'business_id') THEN
        ALTER TABLE public.sii_folios RENAME COLUMN business_id TO store_id;
    END IF;
    -- sii_logs
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sii_logs' AND column_name = 'business_id') THEN
        ALTER TABLE public.sii_logs RENAME COLUMN business_id TO store_id;
    END IF;
END $$;

-- 3. Agregar store_id a tablas faltantes
DO $$
BEGIN
    -- payments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'store_id') THEN
        ALTER TABLE public.payments ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;
    -- shifts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shifts' AND column_name = 'store_id') THEN
        ALTER TABLE public.shifts ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;
    -- pos_drafts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_drafts' AND column_name = 'store_id') THEN
        ALTER TABLE public.pos_drafts ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;
    -- cash_movements
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_movements' AND column_name = 'store_id') THEN
        ALTER TABLE public.cash_movements ADD COLUMN store_id UUID REFERENCES public.stores(id);
    END IF;
END $$;

-- 4. Migración de Datos Existentes (Tienda Principal)
-- Usamos 'c828f16e-4572-4700-97e6-66b6180d6a9d' como ID de la tienda maestra
UPDATE public.products SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.orders SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.order_items SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.payments SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.shifts SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.settings SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.profiles SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.categories SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.terminals SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.cash_sessions SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.pos_drafts SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.branches SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.inventory SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.sii_certification_cases SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.sii_documents SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.sii_folios SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.sii_logs SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;
UPDATE public.sii_config SET store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' WHERE store_id IS NULL;

-- 5. Habilitar RLS en todas las tablas
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_certification_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_config ENABLE ROW LEVEL SECURITY;

-- 6. Crear Politicas Genéricas (Aislamiento por store_id)
-- Nota: Usamos DO para aplicar a múltiples tablas si fuera necesario, pero lo haremos explícito para mayor seguridad.

CREATE POLICY store_isolation_policy ON public.products FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.orders FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.order_items FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.payments FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.shifts FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.settings FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.profiles FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.categories FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.terminals FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.cash_sessions FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.pos_drafts FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.branches FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.inventory FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.sii_certification_cases FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.sii_documents FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.sii_folios FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.sii_logs FOR ALL USING (store_id = auth.get_store_id());
CREATE POLICY store_isolation_policy ON public.sii_config FOR ALL USING (store_id = auth.get_store_id());

-- 7. Blindaje de user_metadata (Evitar suplantación de store_id)
CREATE OR REPLACE FUNCTION public.protect_store_id_in_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    -- Bloquear si el usuario intenta cambiar su propio store_id en metadata
    -- EXCEPCIÓN: Permitir si es service_role (backend/admin)
    IF current_setting('role') <> 'service_role' THEN
      IF (OLD.raw_user_meta_data->>'store_id' IS DISTINCT FROM NEW.raw_user_meta_data->>'store_id') THEN
        RAISE EXCEPTION 'Seguridad: No se permite la modificación manual del store_id.';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_store_id ON auth.users;
CREATE TRIGGER tr_protect_store_id
BEFORE UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.protect_store_id_in_metadata();

COMMIT;
