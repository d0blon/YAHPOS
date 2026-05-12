-- 015_standardize_saas_tiers.sql
-- Actualización de nombres comerciales: Austral, Archipiélago, Patagonia
-- Actualización de precios según UF (Valor base ~45,220 CLP)

BEGIN;

-- 1. Asegurar que la columna slug existe
ALTER TABLE public.subscription_tiers ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Limpiar tiers existentes y poblar con los nuevos estándares
-- Usamos DELETE para asegurar una base limpia, pero cuidando las referencias
DO $$
BEGIN
    -- Actualizar registros existentes para que no se rompan las FKs temporalmente
    UPDATE public.subscription_tiers SET slug = 'austral' WHERE slug = 'basico' OR name = 'Básico';
    UPDATE public.subscription_tiers SET slug = 'archipielago' WHERE slug = 'plus' OR name = 'Pro';
    UPDATE public.subscription_tiers SET slug = 'patagonia' WHERE slug = 'elite' OR name = 'Enterprise';
END $$;

-- 3. Actualizar nombres, slugs y precios
-- Plan Austral (1 UF)
UPDATE public.subscription_tiers 
SET name = 'Austral', 
    slug = 'austral', 
    price_clp = 45220,
    features = '["Boletas Ilimitadas", "Control de Inventario", "Club de Puntos", "Soporte Local"]'::jsonb
WHERE slug = 'austral';

-- Plan Archipiélago (1.5 UF)
UPDATE public.subscription_tiers 
SET name = 'Archipiélago', 
    slug = 'archipielago', 
    price_clp = 67830,
    features = '["Todo lo de Austral", "Tienda Online (E-commerce)", "Facturación Electrónica", "Gestión de Pedidos"]'::jsonb
WHERE slug = 'archipielago';

-- Plan Patagonia (2.5 UF)
UPDATE public.subscription_tiers 
SET name = 'Patagonia', 
    slug = 'patagonia', 
    price_clp = 113050,
    features = '["Todo lo de Archipiélago", "Multi-sucursal", "Guías de Despacho", "API Pública", "Soporte 24/7"]'::jsonb
WHERE slug = 'patagonia';

-- 4. Si no existían (por si acaso), los insertamos
INSERT INTO public.subscription_tiers (name, slug, price_clp, features)
SELECT 'Austral', 'austral', 45220, '["Boletas Ilimitadas", "Control de Inventario", "Club de Puntos", "Soporte Local"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE slug = 'austral');

INSERT INTO public.subscription_tiers (name, slug, price_clp, features)
SELECT 'Archipiélago', 'archipielago', 67830, '["Todo lo de Austral", "Tienda Online (E-commerce)", "Facturación Electrónica", "Gestión de Pedidos"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE slug = 'archipielago');

INSERT INTO public.subscription_tiers (name, slug, price_clp, features)
SELECT 'Patagonia', 'patagonia', 113050, '["Todo lo de Archipiélago", "Multi-sucursal", "Guías de Despacho", "API Pública", "Soporte 24/7"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.subscription_tiers WHERE slug = 'patagonia');

-- 5. Actualizar la tabla stores para usar los nuevos slugs
UPDATE public.stores SET tier = 'austral' WHERE tier = 'basico' OR tier = 'basic';
UPDATE public.stores SET tier = 'archipielago' WHERE tier = 'plus' OR tier = 'pro';
UPDATE public.stores SET tier = 'patagonia' WHERE tier = 'elite';

COMMIT;
