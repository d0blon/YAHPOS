-- 011_admin_enhancements.sql
-- Metadata extendida para negocios y tracking financiero del administrador

-- 1. Añadir columnas de metadata a stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS owner_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS payment_months INTEGER DEFAULT 1;

-- 2. Crear tabla de finanzas administrativas
CREATE TABLE IF NOT EXISTS public.admin_finances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    type VARCHAR(10) CHECK (type IN ('income', 'expense')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS para admin_finances
ALTER TABLE public.admin_finances ENABLE ROW LEVEL SECURITY;

-- Solo el dueño del sistema (o desarrolladores) pueden ver/editar finanzas
CREATE POLICY "Admins can manage finances" ON public.admin_finances
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('owner', 'developer')
        )
    );

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_finances_type ON public.admin_finances(type);
CREATE INDEX IF NOT EXISTS idx_stores_owner_email ON public.stores(owner_email);

COMMENT ON TABLE public.admin_finances IS 'Registro de ingresos por suscripciones y gastos de infraestructura del sistema';
