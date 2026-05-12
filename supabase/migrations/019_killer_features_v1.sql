-- 019_killer_features_v1.sql
-- Fase 1: Índice para búsqueda rápida de SKU/Barcode
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- Fase 2: Sellos nutricionales
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS nutritional_seals INTEGER DEFAULT 0;
COMMENT ON COLUMN public.products.nutritional_seals IS 'Cantidad de sellos de advertencia (0-4)';

-- Fase 3: Real-time Stock tracking flag
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_realtime_tracked BOOLEAN DEFAULT false;
