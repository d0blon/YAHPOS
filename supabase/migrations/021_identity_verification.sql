-- ======================================================================
-- 021: Identity Verification + Store ID Fix
-- Agrega columnas para verificación de identidad y cuenta completa
-- ======================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_full_account boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false;

-- Marcar cuentas web existentes como full_account
-- (las que tienen email y no fueron creadas desde POS)
UPDATE public.profiles
SET is_full_account = true
WHERE email IS NOT NULL AND email != ''
  AND (is_full_account IS NULL OR is_full_account = false);
