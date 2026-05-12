-- 009_subscriptions.sql
-- Añadir gestión de pagos y morosidad a las tiendas

ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS next_payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'overdue'));

-- Actualizar datos existentes para que no estén vacíos
UPDATE public.stores 
SET next_payment_date = CURRENT_DATE + INTERVAL '30 days' 
WHERE next_payment_date IS NULL;

-- Comentario para el log de migraciones
COMMENT ON COLUMN public.stores.next_payment_date IS 'Fecha del próximo cobro de la suscripción';
COMMENT ON COLUMN public.stores.payment_status IS 'Estado de pago del negocio: paid, pending, overdue';
