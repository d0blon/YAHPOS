-- ======================================================================
-- 024: Catálogo Maestro YAHPOS! Compartido (cross-tenant, intencional)
-- Tabla global de productos conocidos por SKU, propiedad del Product Owner.
-- Las tiendas individuales SOLO leen (para autocompletar); la escritura al
-- catálogo maestro pasa siempre por la cola de revisión (tabla de abajo).
-- ======================================================================

CREATE TABLE IF NOT EXISTS public.master_catalog_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR NOT NULL UNIQUE, -- código de barra real (EAN-13)
    name VARCHAR NOT NULL,
    brand VARCHAR,
    category VARCHAR,
    description TEXT,
    image_url TEXT, -- ruta relativa self-hosted, ej. /data/images/7804454001506.webp
    reference_price NUMERIC, -- precio distribuidor, solo informativo, no se autofillea al store
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_master_catalog_sku ON public.master_catalog_products(sku);

-- Cola de productos nuevos aportados por tiendas, pendientes de revisión del Product Owner
CREATE TABLE IF NOT EXISTS public.master_catalog_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR NOT NULL,
    name VARCHAR NOT NULL,
    brand VARCHAR,
    category VARCHAR,
    description TEXT,
    image_url TEXT,
    submitted_by_store_id UUID REFERENCES public.stores(id),
    status VARCHAR NOT NULL DEFAULT 'pending', -- pending | approved | rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_master_catalog_submissions_status ON public.master_catalog_submissions(status);

-- Lectura del catálogo maestro: cualquier usuario autenticado puede leer (autocompletado)
ALTER TABLE public.master_catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_catalog_read_all ON public.master_catalog_products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Escritura al catálogo maestro: SOLO vía service role (admin client en el endpoint de
-- aprobación), igual que el patrón ya usado en pending_inventory_adjustments/approve.
-- No se crea policy de INSERT/UPDATE para 'authenticated' — bypass exclusivo por admin client.

-- Submissions: cada tienda solo puede insertar/ver las suyas; el Product Owner (rol
-- 'developer') las revisa vía admin client en el endpoint de developer panel.
ALTER TABLE public.master_catalog_submissions ENABLE ROW LEVEL SECURITY;
