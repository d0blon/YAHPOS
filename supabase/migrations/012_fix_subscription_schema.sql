-- 012_fix_subscription_schema.sql
-- Sincronización de esquema SaaS: Tablas de Suscripción y Triggers de Perfil

BEGIN;

-- 1. Crear tabla de Tiers (Planes)
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    price_clp NUMERIC NOT NULL DEFAULT 0,
    max_products INTEGER NOT NULL DEFAULT 100,
    max_users INTEGER NOT NULL DEFAULT 2,
    max_terminals INTEGER NOT NULL DEFAULT 1,
    features JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para tiers (Lectura pública, Escritura Admin/Developer)
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on subscription tiers" 
ON public.subscription_tiers FOR SELECT USING (true);

-- 2. Crear tabla de Suscripciones (Vinculación Store -> Tier)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
    tier_id UUID REFERENCES public.subscription_tiers(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing')),
    current_period_start TIMESTAMPTZ DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id) -- Una suscripción activa por tienda
);

-- Habilitar RLS para subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stores can see their own subscription" 
ON public.subscriptions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() AND profiles.store_id = subscriptions.store_id
    )
);

-- 3. Poblado inicial de Tiers (Si no existen)
INSERT INTO public.subscription_tiers (name, price_clp, max_products, max_users, max_terminals, features)
VALUES 
('Básico', 15000, 500, 2, 1, '["POS Básico", "Reportes Mensuales", "Soporte Email"]'),
('plus', 35000, 5000, 10, 3, '["POS Avanzado", "Gestión de Inventario", "Soporte WhatsApp", "SII Integración"]'),
('elite', 65000, 999999, 100, 10, '["Multi-tienda", "API Acceso", "Soporte 24/7", "Personalización Branding"]')
ON CONFLICT (name) DO NOTHING;

-- 4. Trigger de Creación Automática de Perfiles (handle_new_user)
-- Esta función asegura que cada usuario de Auth tenga un registro en profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nuevo Usuario'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'cashier') -- Rol por defecto
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si ya existe para evitar errores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear el trigger en la tabla de auth.users (esquema auth)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Función de Automatización de Estados de Pago
CREATE OR REPLACE FUNCTION public.check_overdue_subscriptions()
RETURNS VOID AS $$
BEGIN
    -- Marcar como overdue en la tabla stores si la fecha ya pasó
    UPDATE public.stores
    SET payment_status = 'overdue'
    WHERE next_payment_date < CURRENT_DATE
    AND payment_status = 'paid';
    
    -- También actualizar el status en la tabla subscriptions
    UPDATE public.subscriptions
    SET status = 'past_due'
    WHERE current_period_end < NOW()
    AND status = 'active';
END;
$$ LANGUAGE plpgsql;

COMMIT;
