-- 033_update_sii_config_emisor.sql
--
-- Actualiza sii_config del store master con los datos reales del emisor
-- para emisin de boletas electrnicas contra ambiente de certificacin (maullin.sii.cl).
--
-- Datos del emisor real:
--   RUT: 21012281-8
--   Razn social: RODRIGO ALEJANDRO NUNEZ CHAURA
--   Acteco: 620200 (Servicios de contabilidad/asesora tributaria)
--
-- Ejecutar en Supabase SQL Editor.

BEGIN;

-- Asegurar columnas necesarias (idempotente)
ALTER TABLE public.sii_config
    ADD COLUMN IF NOT EXISTS acteco INTEGER,
    ADD COLUMN IF NOT EXISTS fch_resol DATE,
    ADD COLUMN IF NOT EXISTS nro_resol INTEGER;

-- Actualizar fila del store master
UPDATE public.sii_config
SET
    rut_emisor = '21012281-8',
    dv_emisor  = '8',
    razon_social = 'RODRIGO ALEJANDRO NUNEZ CHAURA',
    acteco = 620200,
    nro_resol = 0,
    fch_resol = '2024-01-01',
    environment = 'certification',
    updated_at = now()
WHERE store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d';

-- Nota: dv_emisor es columna adicional que algunos endpoints esperan.
-- Si no existe, el UPDATE la ignora silenciosamente. Se puede agregar con:
-- ALTER TABLE public.sii_config ADD COLUMN IF NOT EXISTS dv_emisor VARCHAR(1);

COMMIT;
