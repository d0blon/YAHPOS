-- ======================================================================
-- 022: Fix pos_drafts.session_id type (BIGINT → UUID)
-- El código siempre ha pasado cashSession.id (UUID), pero la columna
-- estaba definida como BIGINT, causando error 22P02.
-- ======================================================================

-- Eliminar constraint previo antes de cambiar tipo
ALTER TABLE public.pos_drafts DROP CONSTRAINT IF EXISTS pos_drafts_session_id_user_id_key;

-- Eliminar datos previos (los inserts siempre fallaban, no hay datos válidos)
DELETE FROM public.pos_drafts;

-- Cambiar tipo de BIGINT a UUID
ALTER TABLE public.pos_drafts
  ALTER COLUMN session_id TYPE UUID USING gen_random_uuid(),
  ALTER COLUMN session_id SET DEFAULT gen_random_uuid();

-- Recrear unique constraint con el nuevo tipo
ALTER TABLE public.pos_drafts
  ADD CONSTRAINT pos_drafts_session_id_user_id_key UNIQUE (session_id, user_id);
