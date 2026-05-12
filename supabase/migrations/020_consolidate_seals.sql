-- 020_consolidate_seals.sql
-- Migración para consolidar sellos nutricionales y eliminar redundancia

-- 1. Migrar datos de sellos_count a nutritional_seals si este último está en 0
UPDATE public.products 
SET nutritional_seals = sellos_count 
WHERE (nutritional_seals IS NULL OR nutritional_seals = 0) 
AND (sellos_count IS NOT NULL AND sellos_count > 0);

-- 2. Eliminar la columna redundante sellos_count
ALTER TABLE public.products 
DROP COLUMN IF EXISTS sellos_count;

-- 3. Asegurar que los índices para SKU y Barcode existan (por si acaso no se corrió la 019 correctamente)
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- 4. Actualizar comentario para mayor claridad
COMMENT ON COLUMN public.products.nutritional_seals IS 'Cantidad de sellos de advertencia (0-4). Reemplaza a sellos_count.';
