-- 014_populate_subscriptions.sql
-- Poblar tabla subscriptions con datos reales basados en las tiendas existentes.

BEGIN;

-- 1. Insertar suscripciones para tiendas existentes que no tengan una
INSERT INTO public.subscriptions (store_id, tier_id, status, current_period_start, current_period_end)
SELECT 
    s.id as store_id,
    t.id as tier_id,
    CASE 
        WHEN s.payment_status = 'paid' THEN 'active'::VARCHAR(20)
        WHEN s.payment_status = 'overdue' THEN 'past_due'::VARCHAR(20)
        ELSE 'active'::VARCHAR(20)
    END as status,
    COALESCE(s.next_payment_date - INTERVAL '1 month' * s.payment_months, NOW() - INTERVAL '1 month') as current_period_start,
    COALESCE(s.next_payment_date, NOW() + INTERVAL '1 month') as current_period_end
FROM public.stores s
LEFT JOIN public.subscriptions sub ON sub.store_id = s.id
LEFT JOIN public.subscription_tiers t ON t.slug = s.tier
WHERE sub.id IS NULL
  AND t.id IS NOT NULL;

-- 2. Actualizar tier_id en stores si no tiene (para consistencia)
UPDATE public.stores s
SET tier_id = t.id
FROM public.subscription_tiers t
WHERE s.tier = t.slug
  AND (s.tier_id IS NULL OR s.tier_id != t.id);

-- 3. Verificar integridad (Lanza error si hay tiendas sin suscripción)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.stores s
    LEFT JOIN public.subscriptions sub ON sub.store_id = s.id
    WHERE sub.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Hay tiendas sin suscripción: %', (SELECT COUNT(*) FROM public.stores s LEFT JOIN public.subscriptions sub ON sub.store_id = s.id WHERE sub.id IS NULL);
  END IF;
END $$;

COMMIT;
