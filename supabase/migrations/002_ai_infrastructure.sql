-- 002_ai_infrastructure.sql
-- Infraestructura para control de costos de IA por Tienda

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES public.stores(id),
    user_id UUID REFERENCES auth.users(id),
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    cost NUMERIC(10, 5) DEFAULT 0,
    feature TEXT, -- e.g., 'description_gen', 'sales_prediction'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Aplicar la misma política de aislamiento que el resto del sistema
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ai_usage_logs' AND policyname = 'store_isolation_policy'
    ) THEN
        CREATE POLICY store_isolation_policy ON public.ai_usage_logs 
        FOR ALL USING (store_id = auth.get_store_id());
    END IF;
END $$;

COMMIT;
