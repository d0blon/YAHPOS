-- ======================================================================
-- 023: Habilitar Supabase Realtime para la tabla products
-- El componente RealTimeStockBadge.tsx ya suscribe a postgres_changes
-- sobre 'products', pero la tabla nunca fue añadida a la publicación
-- supabase_realtime, por lo que las suscripciones no reciben eventos
-- en producción.
-- ======================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
