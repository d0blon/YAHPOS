-- 008_roles_validation.sql
-- Refuerza la integridad de los roles en la tabla de perfiles

BEGIN;

-- 1. Eliminar restricciones de roles anteriores si existen
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS check_valid_role;

-- 2. Agregar la nueva restricción con los roles formalizados para YAHPOS!
ALTER TABLE public.profiles 
ADD CONSTRAINT check_valid_role 
CHECK (role IN ('customer', 'employee', 'owner', 'developer', 'admin', 'manager', 'cashier', 'warehouse'));

-- NOTA: Se mantienen manager, cashier y warehouse por compatibilidad con el motor POS actual, 
-- aunque el plan simplificado mencione 'employee'.

COMMIT;
