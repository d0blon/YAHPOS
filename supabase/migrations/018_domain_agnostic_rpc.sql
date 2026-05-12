-- 018_domain_agnostic_rpc.sql
-- Hace que get_store_by_domain sea agnóstica al dominio real.
-- Soporta .cl, .com, .localhost, cualquier TLD.

DROP FUNCTION IF EXISTS get_store_by_domain(TEXT);

CREATE FUNCTION get_store_by_domain(p_host TEXT)
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
            p_host LIKE s.subdomain || '.%'
        )
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
