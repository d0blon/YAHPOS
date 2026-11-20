-- 038 — Aislamiento multi-tenant estricto
-- Regla: todo dato por store_id. Ninguna policy USING(true) sobre datos de tienda.
-- Verificado en vivo antes de aplicar: get_store_id() corre como postgres (BYPASSRLS),
-- por lo que usarlo en policies de profiles no genera recursión RLS.

begin;

-- ---------------------------------------------------------------------------
-- 1. Helper de rol de plataforma (nunca confiar en claims del JWT)
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_role()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('developer', 'superadmin')
  );
$$;

revoke all on function public.is_platform_role() from public;
grant execute on function public.is_platform_role() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Bajar policies permisivas confirmadas en vivo
-- ---------------------------------------------------------------------------
drop policy if exists "Allow public read for products" on public.products;
drop policy if exists "Allow public read for categories" on public.categories;
drop policy if exists "Allow public read for store_settings" on public.store_settings;
drop policy if exists "self_access" on public.profiles;
drop policy if exists "perfil_propio" on public.profiles;
drop policy if exists "Users can manage their own drafts" on public.pos_drafts;
drop policy if exists "Allow public read access for stores" on public.stores;
drop policy if exists "Allow select for everyone" on public.stores;

-- Reemplazo con scope de tienda. Las policies de aislamiento ya existentes
-- (store_isolation_policy) se conservan; las nuevas son SELECT explícito.
create policy "tenant_select_products" on public.products
  for select to authenticated
  using (store_id = public.get_store_id());

create policy "tenant_select_categories" on public.categories
  for select to authenticated
  using (store_id = public.get_store_id());

-- store_settings no tiene columna store_id y no tiene consumidores en src/:
-- se baja su lectura pública y queda inaccesible para clientes.

-- Perfiles: solo el propio row, con tienda de la sesión. Los 17 perfiles
-- customer con store_id NULL conservan lectura de su propio row, nunca de otro.
create policy "tenant_select_own_profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() and (store_id = public.get_store_id() or store_id is null));

create policy "tenant_update_own_profile" on public.profiles
  for update to authenticated
  using (id = auth.uid() and store_id = public.get_store_id())
  with check (id = auth.uid() and store_id = public.get_store_id() and role = 'customer');

create policy "tenant_own_drafts" on public.pos_drafts
  for all to authenticated
  using (user_id = auth.uid() and store_id = public.get_store_id())
  with check (user_id = auth.uid() and store_id = public.get_store_id());

-- stores es el tenant root: sin config pública (contiene supervisorPin y config SII).
create policy "tenant_select_own_store" on public.stores
  for select to authenticated
  using (id = public.get_store_id() or public.is_platform_role());

-- Catálogos globales legacy: sin consumidor en src/. Se cierra a service_role.
revoke select on public.catalogo_global from anon, authenticated;
revoke select on public.catalogo_global_distribuidores from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. get_store_by_domain: devolver solo campos públicos de branding.
--    Antes devolvía stores.config completo (supervisorPin, config SII) a anon.
--    Los callers solo usan id/tier/slug/name y colores de appearance.
-- ---------------------------------------------------------------------------
create or replace function public.get_store_by_domain(p_host text)
returns table(id uuid, name text, slug text, tier text, subdomain text,
              custom_domain text, is_active boolean, config jsonb)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    s.id, s.name, s.slug, s.tier, s.subdomain, s.custom_domain, s.is_active,
    jsonb_build_object(
      'appearance_primary_color', s.config ->> 'appearance_primary_color',
      'accent_color', s.config ->> 'accent_color',
      'surface_color', s.config ->> 'surface_color'
    )
  from public.stores s
  where s.is_active = true and (
    s.custom_domain = p_host or
    s.subdomain || '.yahpos.cl' = p_host or
    s.subdomain || '.localhost:3000' = p_host or
    s.subdomain || '.localtest.me:3000' = p_host
  )
  limit 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. handle_new_user: sin emails hardcodeados, sin rol desde metadata.
--    store_id solo si la RPC de registro lo resolvió desde el Host y existe.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_store uuid := null;
begin
  begin
    v_store := (new.raw_user_meta_data ->> 'store_id')::uuid;
  exception when others then
    v_store := null;
  end;

  if v_store is not null and not exists (select 1 from public.stores where id = v_store) then
    v_store := null;
  end if;

  insert into public.profiles (id, email, first_name, last_name, role, store_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'given_name',
             new.raw_user_meta_data ->> 'first_name',
             split_part(new.raw_user_meta_data ->> 'name', ' ', 1), 'Usuario'),
    coalesce(new.raw_user_meta_data ->> 'family_name',
             new.raw_user_meta_data ->> 'last_name',
             split_part(new.raw_user_meta_data ->> 'name', ' ', 2), ''),
    'customer',
    v_store
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    updated_at = now();

  return new;
end;
$$;

-- Defensa en profundidad: un INSERT directo desde cliente nunca puede elegir
-- rol ni tienda. Las escrituras de plataforma (service_role / auth) pasan.
create or replace function public.protect_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- handle_new_user corre como SECURITY DEFINER dueño postgres: su INSERT debe
  -- conservar el store_id ya validado contra public.stores. Un INSERT directo
  -- desde cliente (anon/authenticated) se fuerza a customer sin tienda.
  if current_setting('role') in ('anon', 'authenticated') then
    if new.role is distinct from 'customer' then
      raise exception 'Seguridad: no se permite elegir rol en el perfil';
    end if;
    new.store_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tr_protect_profile_insert on public.profiles;
create trigger tr_protect_profile_insert
  before insert on public.profiles
  for each row execute function public.protect_profile_insert();

-- ---------------------------------------------------------------------------
-- 5. Backfill de categorías huérfanas a su tienda real.
--    Las 16 categorías sin store_id son las que usan los 1.742 productos de
--    Austral Market (45be9c55-...). La otra tienda ya tiene sus 2 categorías.
-- ---------------------------------------------------------------------------
update public.categories
set store_id = '45be9c55-5a5b-47c2-b06c-d1b6a487b388'
where store_id is null;

-- ---------------------------------------------------------------------------
-- 6. UNIQUE que exigen los onConflict del código (0 duplicados verificados)
-- ---------------------------------------------------------------------------
create unique index if not exists uq_sii_config_store
  on public.sii_config (store_id);
create unique index if not exists uq_sii_folios_store_tipo_desde
  on public.sii_folios (store_id, tipo_dte, folio_desde);
create unique index if not exists uq_sii_cert_store_case
  on public.sii_certification_cases (store_id, case_number);
create unique index if not exists uq_settings_store_key
  on public.settings (store_id, key);
create unique index if not exists uq_inventory_product_branch
  on public.inventory (product_id, branch_id);
create unique index if not exists uq_supplier_map_store_names
  on public.supplier_product_mappings (store_id, supplier_name, supplier_product_name);

-- ---------------------------------------------------------------------------
-- 7. Storage: toda escritura por carpeta = store_id
-- ---------------------------------------------------------------------------
drop policy if exists "Authenticated Upload" on storage.objects;
drop policy if exists "Authenticated Delete" on storage.objects;
drop policy if exists "Store admins can manage their own SII XMLs" on storage.objects;
drop policy if exists "sii_files_isolation" on storage.objects;

create policy "tenant_upload_site_assets" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-assets'
              and (storage.foldername(name))[1] = public.get_store_id()::text);

create policy "tenant_delete_site_assets" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-assets'
         and (storage.foldername(name))[1] = public.get_store_id()::text);

create policy "tenant_manage_sii_xml" on storage.objects
  for all to authenticated
  using (bucket_id = 'sii-xml-archive'
         and (storage.foldername(name))[1] = public.get_store_id()::text)
  with check (bucket_id = 'sii-xml-archive'
              and (storage.foldername(name))[1] = public.get_store_id()::text);

create policy "tenant_manage_sii_files" on storage.objects
  for all to authenticated
  using (bucket_id = 'sii_files'
         and (storage.foldername(name))[1] = public.get_store_id()::text)
  with check (bucket_id = 'sii_files'
              and (storage.foldername(name))[1] = public.get_store_id()::text);

-- bucket usado por /api/settings/upload-logo (no existía en vivo)
insert into storage.buckets (id, name, public)
values ('store-logos', 'store-logos', true)
on conflict (id) do nothing;

create policy "public_read_store_logos" on storage.objects
  for select using (bucket_id = 'store-logos');

create policy "tenant_upload_store_logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-logos'
              and (storage.foldername(name))[1] = public.get_store_id()::text);

create policy "tenant_delete_store_logos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-logos'
         and (storage.foldername(name))[1] = public.get_store_id()::text);

commit;
