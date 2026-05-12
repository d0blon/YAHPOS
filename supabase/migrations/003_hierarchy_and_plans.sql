-- 003_hierarchy_and_plans.sql
-- Implementación de Jerarquía Comerciante -> Tiendas y Planes de Servicio

BEGIN;

-- 1. Crear tabla merchants primero (Topología)
CREATE TABLE IF NOT EXISTS public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) NOT NULL,
    config JSONB DEFAULT '{"max_stores": 10, "global_branding": {}}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Función Helper para Merchant ID (Consultando la nueva tabla)
CREATE OR REPLACE FUNCTION auth.get_merchant_id() 
RETURNS UUID AS $$
  SELECT id FROM public.merchants WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 3. Renombrar owner_id a merchant_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'owner_id') THEN
        ALTER TABLE public.stores RENAME COLUMN owner_id TO merchant_id;
    END IF;
END $$;

-- 4. Expandir configuración de tienda
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{"share_inventory": false, "consolidate_reports": false, "max_terminals": 2}'::jsonb;

-- 5. Actualizar RLS de Stores (Aislamiento Nivel 1: Merchant vs Merchant)
-- Eliminamos políticas antiguas si existen
DROP POLICY IF EXISTS "Merchants manage their own stores" ON public.stores;
DROP POLICY IF EXISTS "Public read active stores" ON public.stores;
DROP POLICY IF EXISTS "Developers can manage all stores" ON public.stores;

-- Nota: La política principal se redefine en 004 después de vincular el merchant_id real.

-- Política para Desarrolladores (Solo Lectura para soporte)
CREATE POLICY "Developers see all stores" ON public.stores
FOR SELECT USING ( (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'developer' );

COMMIT;
