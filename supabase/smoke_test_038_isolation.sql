-- Prueba real + negativa de la migración 038.
-- Ejecutar como postgres (management API). No imprime PII: solo conteos.

-- 1) Usuarios de prueba: uno por tienda, elegidos del propio profiles.
--    Se guardan en variables de sesión para no hardcodear UUIDs.
select set_config('test.user_a', (select id::text from public.profiles
  where store_id = '45be9c55-5a5b-47c2-b06c-d1b6a487b388' limit 1), false);
select set_config('test.user_b', (select id::text from public.profiles
  where store_id = 'c828f16e-4572-4700-97e6-66b6180d6a9d' limit 1), false);

-- 2) Perfil de A actuando como A: debe ver exactamente 1 fila (la suya).
begin;
set local role authenticated;
set local request.jwt.claim.sub = current_setting('test.user_a');
select 'A_ve_sus_productos' as prueba, count(*) as esperado_distinto_de_cero
  from public.products;
select 'A_ve_solo_su_perfil' as prueba, count(*) as esperado_1
  from public.profiles;
rollback;

-- 3) Perfil de B actuando como B: debe ver solo los productos de B (22).
begin;
set local role authenticated;
set local request.jwt.claim.sub = current_setting('test.user_b');
select 'B_productos' as prueba, count(*) as esperado_22
  from public.products;
select 'B_categorias' as prueba, count(*) as esperado_2
  from public.categories;
rollback;

-- 4) Negativo: A NO puede ver categorías de B. El conteo debe ser 16 (las de A),
--    nunca 18 (16 + 2 de B).
begin;
set local role authenticated;
set local request.jwt.claim.sub = current_setting('test.user_a');
select 'A_no_ve_categorias_de_B' as prueba, count(*) as esperado_16
  from public.categories;
rollback;

-- 5) Negativo: intento de escalada de A insertando un perfil en la tienda de B
--    debe fallar (sin policy de INSERT para authenticated + trigger de inserción).
begin;
set local role authenticated;
set local request.jwt.claim.sub = current_setting('test.user_a');
do $$
begin
  begin
    insert into public.profiles (id, email, role, store_id)
    values (gen_random_uuid(), 'escalada@test.invalid', 'admin',
            'c828f16e-4572-4700-97e6-66b6180d6a9d');
    raise exception 'FALLO: inserción cross-tenant permitida';
  exception when insufficient_privilege or check_violation then
    null;
  end;
end $$;
rollback;
