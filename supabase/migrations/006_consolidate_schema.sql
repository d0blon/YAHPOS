-- 006_consolidate_schema.sql
-- Consolidación de tablas faltantes y unificación de configuraciones

BEGIN;

-- 1. TABLA DE SUCURSALES (Branches)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABLA DE PAGOS (Payments)
CREATE TABLE IF NOT EXISTS public.payments (
    id BIGSERIAL PRIMARY KEY,
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    order_id UUID REFERENCES public.orders(id) NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    transaction_id TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABLA DE TURNOS (Shifts)
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    register_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    opening_cash INTEGER DEFAULT 0,
    closing_cash INTEGER DEFAULT 0,
    total_sales INTEGER DEFAULT 0
);

-- 4. TABLA DE MOVIMIENTOS DE CAJA (Cash Movements)
CREATE TABLE IF NOT EXISTS public.cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    session_id UUID REFERENCES public.cash_sessions(id), -- Referencia a cash_sessions(id)
    type VARCHAR NOT NULL,
    category VARCHAR NOT NULL,
    amount NUMERIC NOT NULL,
    reason TEXT,
    cashier_name VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. TABLA DE INVENTARIO (Inventory)
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    product_id UUID REFERENCES public.products(id),
    branch_id UUID REFERENCES public.branches(id),
    stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. TABLAS SII (Servicio de Impuestos Internos)
CREATE TABLE IF NOT EXISTS public.sii_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    rut_emisor VARCHAR NOT NULL,
    razon_social VARCHAR NOT NULL,
    giro VARCHAR,
    direccion VARCHAR,
    comuna VARCHAR,
    ciudad VARCHAR,
    certificado_pfx_encrypted TEXT,
    certificado_password_encrypted VARCHAR,
    environment VARCHAR DEFAULT 'certification',
    certificado_expira DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sii_folios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    tipo_dte INTEGER NOT NULL,
    folio_desde INTEGER NOT NULL,
    folio_hasta INTEGER NOT NULL,
    folio_actual INTEGER NOT NULL,
    caf_xml TEXT NOT NULL,
    fecha_autorizacion DATE,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sii_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    folio INTEGER NOT NULL,
    tipo_dte INTEGER NOT NULL,
    monto_total INTEGER NOT NULL,
    xml_content TEXT NOT NULL,
    xml_envio TEXT,
    track_id TEXT,
    estado TEXT DEFAULT 'FIRMADO',
    estado_sii VARCHAR DEFAULT 'PENDIENTE',
    sii_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sii_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    tipo_dte INTEGER,
    folio INTEGER,
    event_type TEXT NOT NULL,
    payload JSONB,
    response JSONB,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sii_certification_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id) NOT NULL,
    case_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending',
    xml_sent TEXT,
    sii_track_id TEXT,
    sii_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. UNIFICACIÓN DE CONFIGURACIONES
-- Mover datos de store_settings a stores.config si la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'store_settings') THEN
        UPDATE public.stores s
        SET config = s.config || jsonb_build_object(
            'store_logo', ss.store_logo,
            'accent_color', ss.accent_color,
            'white_label_enabled', ss.white_label_enabled,
            'site_content', ss.site_content,
            'tier', ss.tier -- Aseguramos que el tier también se mueva
        )
        FROM public.store_settings ss
        WHERE s.id = ss.store_id; -- Corregido join (ss.store_id)
        
        -- Opcional: Eliminar la tabla store_settings después de la migración
        -- DROP TABLE public.store_settings;
    END IF;
END $$;

-- 8. RLS PARA TABLAS CONSOLIDADAS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sii_certification_cases ENABLE ROW LEVEL SECURITY;

-- Aplicar política de aislamiento por store_id
DROP POLICY IF EXISTS store_isolation_policy ON public.branches;
CREATE POLICY store_isolation_policy ON public.branches FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.payments;
CREATE POLICY store_isolation_policy ON public.payments FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.shifts;
CREATE POLICY store_isolation_policy ON public.shifts FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.cash_movements;
CREATE POLICY store_isolation_policy ON public.cash_movements FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.inventory;
CREATE POLICY store_isolation_policy ON public.inventory FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_config;
CREATE POLICY store_isolation_policy ON public.sii_config FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_folios;
CREATE POLICY store_isolation_policy ON public.sii_folios FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_documents;
CREATE POLICY store_isolation_policy ON public.sii_documents FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_logs;
CREATE POLICY store_isolation_policy ON public.sii_logs FOR ALL USING (store_id = auth.get_store_id());

DROP POLICY IF EXISTS store_isolation_policy ON public.sii_certification_cases;
CREATE POLICY store_isolation_policy ON public.sii_certification_cases FOR ALL USING (store_id = auth.get_store_id());

COMMIT;
