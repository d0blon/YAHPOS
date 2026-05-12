-- 010_roles.sql
-- Asegurar que la tabla profiles acepte el rol 'picker' y otros
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS check_role;

ALTER TABLE public.profiles 
ADD CONSTRAINT check_role 
CHECK (role IN ('customer', 'employee', 'picker', 'owner', 'developer', 'admin', 'manager', 'cashier', 'warehouse'));
