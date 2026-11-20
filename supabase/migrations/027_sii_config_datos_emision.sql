-- 027_sii_config_datos_emision.sql
--
-- Datos obligatorios para emitir DTE reales. Sin ellos el XML no valida contra
-- los XSD oficiales del SII:
--
--   acteco     -> <Acteco> dentro de <Emisor>. Obligatorio en DTE_v10.xsd
--                 (factura 33, notas 56/61, guia 52). Codigo de 4 a 6 digitos
--                 del giro declarado ante el SII.
--   fch_resol  -> <FchResol> en la caratula del sobre. Fecha de la resolucion
--                 que autoriza al emisor como facturador electronico.
--   nro_resol  -> <NroResol> en la caratula del sobre. Numero de esa resolucion
--                 (0 solo es valido cuando el SII no asigno numero).
--
-- No se toca RLS: son columnas nuevas de una tabla que ya tiene
-- store_isolation_policy (025_fix_get_store_id_live_lookup.sql).

ALTER TABLE public.sii_config
    ADD COLUMN IF NOT EXISTS acteco INTEGER,
    ADD COLUMN IF NOT EXISTS fch_resol DATE,
    ADD COLUMN IF NOT EXISTS nro_resol INTEGER;

-- Codigo de actividad economica del SII: 4 a 6 digitos, sin puntos ni ceros a la izquierda.
ALTER TABLE public.sii_config
    DROP CONSTRAINT IF EXISTS sii_config_acteco_rango;
ALTER TABLE public.sii_config
    ADD CONSTRAINT sii_config_acteco_rango
    CHECK (acteco IS NULL OR (acteco >= 1000 AND acteco <= 999999));

ALTER TABLE public.sii_config
    DROP CONSTRAINT IF EXISTS sii_config_nro_resol_rango;
ALTER TABLE public.sii_config
    ADD CONSTRAINT sii_config_nro_resol_rango
    CHECK (nro_resol IS NULL OR nro_resol >= 0);

COMMENT ON COLUMN public.sii_config.acteco IS
    'Codigo de actividad economica del SII (<Acteco>). Obligatorio para DTE 33/52/56/61.';
COMMENT ON COLUMN public.sii_config.fch_resol IS
    'Fecha de la resolucion de facturador electronico (<FchResol> de la caratula).';
COMMENT ON COLUMN public.sii_config.nro_resol IS
    'Numero de la resolucion de facturador electronico (<NroResol> de la caratula).';
