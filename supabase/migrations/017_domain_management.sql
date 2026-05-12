-- 017_domain_management.sql
-- Migración para soporte multi-tenant basado en dominios y gestión de membresías multi-tienda.

-- 1. Agregar columnas de dominio a la tabla stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

-- 2. Poblar subdomain inicial basado en el slug (solo si está vacío)
UPDATE public.stores 
SET subdomain = slug 
WHERE subdomain IS NULL;

-- 3. Crear tabla user_stores para membresías multi-tienda
CREATE TABLE IF NOT EXISTS public.user_stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'customer',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, store_id)
);

-- 4. Habilitar RLS en user_stores
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para user_stores
CREATE POLICY "Users can view their own store memberships" 
ON public.user_stores FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all memberships in their store" 
ON public.user_stores FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_stores 
        WHERE user_id = auth.uid() 
        AND store_id = public.user_stores.store_id 
        AND role IN ('admin', 'owner', 'developer')
    )
);

-- 6. Migrar datos existentes de profiles a user_stores (solo una vez)
INSERT INTO public.user_stores (user_id, store_id, role)
SELECT id, store_id, COALESCE(role, 'customer')
FROM public.profiles
WHERE store_id IS NOT NULL
ON CONFLICT (user_id, store_id) DO NOTHING;

-- 7. Función para resolver tienda por dominio
CREATE OR REPLACE FUNCTION get_store_by_domain(p_host TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    tier TEXT,
    subdomain TEXT,
    custom_domain TEXT,
    is_active BOOLEAN,
    config JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, s.name, s.slug, s.tier, s.subdomain, s.custom_domain, s.is_active, s.config
    FROM public.stores s
    WHERE 
        s.is_active = true AND (
            s.custom_domain = p_host OR 
            s.subdomain || '.yahpos.com' = p_host OR
            s.subdomain || '.localhost:3000' = p_host -- Para desarrollo local
        )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Comentarios
COMMENT ON COLUMN public.stores.subdomain IS 'Subdominio asignado (ej: pepito para pepito.yahpos.com)';
COMMENT ON COLUMN public.stores.custom_domain IS 'Dominio propio configurado (ej: tienda.cl)';
