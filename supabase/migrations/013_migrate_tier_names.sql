-- 013_migrate_tier_names.sql
-- Migrar nombres heredados al estándar comercial (plus, elite)

BEGIN;

-- 1. Agregar columna slug si no existe (CRÍTICO para el código)
ALTER TABLE public.subscription_tiers ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Actualizar datos en subscription_tiers (según migración 012)
UPDATE public.subscription_tiers SET name = 'plus', slug = 'plus' WHERE name = 'Pro';
UPDATE public.subscription_tiers SET name = 'elite', slug = 'elite' WHERE name = 'Enterprise';
UPDATE public.subscription_tiers SET slug = 'basico' WHERE name = 'Básico';

-- 3. Actualizar tiendas si tienen el texto antiguo
UPDATE public.stores SET tier = 'plus' WHERE tier = 'pro' OR tier = 'Pro';
UPDATE public.stores SET tier = 'elite' WHERE tier = 'enterprise' OR tier = 'Enterprise';

-- 4. Verificación de integridad (Lanza error si quedan nombres inválidos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.subscription_tiers WHERE slug NOT IN ('basico', 'plus', 'elite')) THEN
    RAISE EXCEPTION 'Tiers inválidos en subscription_tiers: %', (SELECT DISTINCT slug FROM public.subscription_tiers WHERE slug NOT IN ('basico', 'plus', 'elite'));
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.stores WHERE tier NOT IN ('basico', 'plus', 'elite')) THEN
    RAISE EXCEPTION 'Tiers inválidos en stores: %', (SELECT DISTINCT tier FROM public.stores WHERE tier NOT IN ('basico', 'plus', 'elite'));
  END IF;
END $$;

COMMIT;
