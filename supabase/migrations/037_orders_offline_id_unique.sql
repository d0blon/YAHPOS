-- 037_orders_offline_id_unique.sql
-- Un `offline_id` identifica una venta por tienda. El dedupe de /api/orders
-- (maybeSingle + insert) tiene carrera: dos requests concurrentes pueden insertar
-- dos órdenes para el mismo pago. Este índice parcial lo hace imposible.
-- No toca filas legacy sin offline_id. No crea tabla nueva ⇒ NO requiere nueva
-- policy RLS: siguen aplicando las policies existentes de public.orders.
-- Idempotente. Ejecutar en Supabase SQL Editor.
CREATE UNIQUE INDEX IF NOT EXISTS orders_store_offline_id_unique
  ON public.orders (store_id, (metadata->>'offline_id'))
  WHERE metadata->>'offline_id' IS NOT NULL;
