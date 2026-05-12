-- 004_create_merchants.sql
-- Migración de datos y vinculación de jerarquía

BEGIN;

-- 1. Habilitar RLS en merchants (ya creada en 003)
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own merchant profile" ON public.merchants;
CREATE POLICY "Users can manage their own merchant profile" ON public.merchants
FOR ALL USING (user_id = auth.uid());

-- 2. Migración de Datos Existentes
-- Insertamos merchants basados en los user_id actuales de las tiendas
INSERT INTO public.merchants (user_id)
SELECT DISTINCT merchant_id FROM public.stores
ON CONFLICT (user_id) DO NOTHING;

-- Actualizamos stores.merchant_id para que use el ID de la tabla merchants (UUID real)
-- en lugar del ID de auth.users
UPDATE public.stores s
SET merchant_id = m.id
FROM public.merchants m
WHERE s.merchant_id = m.user_id;

-- 3. Actualizar stores.merchant_id para referenciar public.merchants(id)
-- Primero eliminamos la referencia antigua si existe
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_merchant_id_fkey;
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS fk_merchant;

-- Agregamos la nueva FK
ALTER TABLE public.stores ADD CONSTRAINT fk_merchant FOREIGN KEY (merchant_id) REFERENCES public.merchants(id);

-- 4. Política Definitiva para Stores (Nivel 1)
DROP POLICY IF EXISTS "Merchants manage their own stores" ON public.stores;
CREATE POLICY "Merchants manage their own stores" ON public.stores
FOR ALL USING (merchant_id = auth.get_merchant_id());

COMMIT;
