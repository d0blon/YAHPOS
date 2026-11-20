-- 040 — Endurecimiento de lints residuales (fail-closed, verificación en vivo)
-- Objetivo: cerrar los residuales del snapshot de lints 2026-11-19T20:15:39.171Z
-- contrastado con el CSV local 02:52Z, SIN reescrituras a ciegas:
--   * function_search_path_mutable 12→0 (ya resuelto por 039) → re-verificar
--     en vivo; residual previo: audit_sensitive_changes() con search_path=public.
--   * anon-definer 15→3 → quitar EXECUTE en anon a is_platform_role() y
--     protect_profile_insert(), INCLUYENDO el grant implícito a PUBLIC.
--   * duplicate_index: 6 nuevos → uq_* de 038:195-206 SOLO si la definición
--     coincide exactamente con otro índice único; settings_pkey NUNCA se dropea.
--   * storage.objects: retirar la policy de lectura pública exacta de
--     store-logos, verificando nombre y definición en pg_policies.
-- Fecha: 2026-11-19.
-- ADVERTENCIA: NO APLICAR sin verificación previa contra el catálogo en vivo.
-- El snapshot pudo ser PRE-039: si el catálogo no coincide con lo esperado,
-- cada bloque NOTIFICA y omite el cambio, o RAISE EXCEPTION y revierte el
-- bloque (fail-closed). NO asumir éxito: reconsultar lints después de aplicar.
-- PRERREQUISITO: credenciales rotadas (PAT Supabase expuesto en chat, service
-- keys y PFX). Este archivo NO contiene credenciales ni tokens.
-- Este handoff SOLO crea el archivo: no ejecuta SQL contra ninguna DB.
--
-- Invariantes NO negociables (no se tocan en esta migración):
--   - store_isolation_policy (025_fix_get_store_id_live_lookup.sql:20-81):
--     única FOR ALL con WITH_CHECK implícito por tienda. NO dropear.
--   - helpers SECURITY DEFINER conservan EXECUTE en authenticated; NO se
--     convierten a SECURITY INVOKER.
--   - get_store_by_domain(text) conserva EXECUTE en anon (login/branding público).
--   - reserve_folios(uuid, integer, integer) conserva EXECUTE en authenticated
--     (029 valida membresía de tienda).
--   - settings_pkey es PK legítima: NUNCA se dropea; el DROP siempre recae
--     sobre el uq_* duplicado.
--   - src/lib/sii/signar.ts (SHA1/C14N/ENVELOPED), src/lib/sii/engine.ts,
--     @ducanh2912/next-pwa, src/proxy.ts, src/providers/SaaSProvider.tsx,
--     src/app/(auth)/login/page.tsx y src/sections/PlatformLanding.tsx:
--     zonas rojas, fuera de alcance.
--   - auth_leaked_password_protection: OFF; se atiende SOLO en Dashboard, no SQL.

-- ---------------------------------------------------------------------------
-- 1. Re-verificación en vivo de function_search_path_mutable (039 ya aplicada)
--    Solo informa: NO fija search_path a ciegas. audit_sensitive_changes()
--    se trata puntualmente en §5.
-- ---------------------------------------------------------------------------
do $$
declare
  v_mutables integer;
  v_detalle text;
begin
  select count(*),
         coalesce(string_agg(p.proname, ', ' order by p.proname), '-')
    into v_mutables, v_detalle
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and (
       p.proconfig is null
       or not exists (
         select 1
           from unnest(p.proconfig) cfg
          where split_part(cfg, '=', 1) = 'search_path'
       )
     );

  raise notice '040 §1: % función(es) SECURITY DEFINER en public sin search_path fijo: %',
               v_mutables, v_detalle;
  if v_mutables > 0 then
    raise notice '040 §1: catálogo distinto del esperado (12→0 tras 039). NO se reescriben funciones; revisar cada una manualmente.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. anon-definer residual: is_platform_role() y protect_profile_insert()
--    038:24-25 revocó PUBLIC a is_platform_role() pero NO a protect_profile_insert();
--    por defecto PostgreSQL concede EXECUTE a PUBLIC, y 039:26 revocó
--    protect_profile_role_and_store_id (otra función). Por eso se revoca
--    PUBLIC y anon en AMBAS, y se re-granta a authenticated y service_role
--    (regla 2: no revocar helpers SECURITY DEFINER a authenticated).
--    is_platform_role() lo usa la policy tenant_select_own_store (038:71).
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn text;
  v_sig text;
  v_anon boolean;
  v_auth boolean;
  v_svc  boolean;
begin
  foreach v_fn in array array['is_platform_role', 'protect_profile_insert'] loop
    v_sig := 'public.' || v_fn || '()';

    if not exists (
      select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = v_fn
         and p.proargtypes = '{}'::oidvector
    ) then
      raise notice '040 §2: % no existe en public; skip (fail-closed)', v_sig;
      continue;
    end if;

    select has_function_privilege('anon', v_sig, 'EXECUTE') into v_anon;
    raise notice '040 §2: % tiene EXECUTE en anon ANTES = %', v_sig, coalesce(v_anon, false);

    execute format('revoke all on function %s from public, anon', v_sig);

    select has_function_privilege('anon', v_sig, 'EXECUTE') into v_anon;
    if coalesce(v_anon, false) then
      raise exception '040 §2 FAIL-CLOSED: anon conserva EXECUTE en % tras REVOKE ALL FROM PUBLIC, anon; abortar', v_sig;
    end if;

    -- Conservar callers legítimos: NO se revoca a authenticated ni service_role.
    execute format('grant execute on function %s to authenticated, service_role', v_sig);

    select has_function_privilege('authenticated', v_sig, 'EXECUTE') into v_auth;
    select has_function_privilege('service_role',  v_sig, 'EXECUTE') into v_svc;
    if not coalesce(v_auth, false) or not coalesce(v_svc, false) then
      raise exception '040 §2 FAIL-CLOSED: % perdió EXECUTE en authenticated/service_role; abortar', v_sig;
    end if;

    if v_fn = 'is_platform_role' and not coalesce(v_auth, false) then
      raise exception '040 §2 FAIL-CLOSED: is_platform_role() requerido por tenant_select_own_store (038:71); abortar';
    end if;

    raise notice '040 §2: % REVOKE ALL FROM PUBLIC, anon aplicado y verificado; authenticated/service_role conservados', v_sig;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Guardia de privilegios que SÍ deben conservarse (solo informa, no grant)
-- ---------------------------------------------------------------------------
do $$
begin
  if not coalesce(has_function_privilege('anon', 'public.get_store_by_domain(text)', 'EXECUTE'), false) then
    raise notice '040 §3: get_store_by_domain(text) NO tiene EXECUTE en anon; revisar flujo público de login/branding. NO se re-granta automáticamente.';
  else
    raise notice '040 §3: get_store_by_domain(text) conserva EXECUTE en anon (flujo público).';
  end if;

  if not coalesce(has_function_privilege('authenticated', 'public.reserve_folios(uuid, integer, integer)', 'EXECUTE'), false) then
    raise notice '040 §3: reserve_folios(...) NO tiene EXECUTE en authenticated; revisar 029. NO se re-granta automáticamente.';
  else
    raise notice '040 §3: reserve_folios(...) conserva EXECUTE en authenticated (validación de membresía).';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. storage.objects: retirar SOLO la policy permisiva de lectura pública
--    exacta de store-logos creada en 038:245-246. Se verifica nombre real,
--    cmd, permissive, ausencia de WITH CHECK y qual en pg_policies.
--    Si no coincide, NOTICE y skip (no se droppea nada más).
-- ---------------------------------------------------------------------------
do $$
declare
  v_nombre text := 'public_read_store_logos';
  v_qual text;
begin
  select qual into v_qual
    from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname = v_nombre
     and permissive = 'PERMISSIVE'
     and cmd = 'SELECT'
     and with_check is null
     and (cardinality(roles) = 0 or array_to_string(roles, ',') = 'public')
     and qual is not null
     and qual ilike '%bucket_id%store-logos%'
     and qual not ilike '%get_store_id%'
     and qual not ilike '%foldername%';

  if v_qual is null then
    raise notice '040 §4: no existe policy de lectura pública exacta % en storage.objects (o difiere del catálogo esperado); skip, no se dropea nada', v_nombre;
    return;
  end if;

  raise notice '040 §4: policy % verificada en pg_policies (QUAL=%); se dropea solo esa policy', v_nombre, v_qual;
  execute format('drop policy %I on storage.objects', v_nombre);

  if exists (
    select 1 from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and policyname = v_nombre
  ) then
    raise exception '040 §4 FAIL-CLOSED: % sigue existiendo tras DROP; abortar', v_nombre;
  end if;

  raise notice '040 §4: DROP de % verificado; policies tenant_* de storage.objects intactas', v_nombre;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Índices duplicados (uq_* de 038:195-206)
--    El equivalente se elige SOLO por definición: misma tabla, mismas columnas
--    y orden (indkey/indnkeyatts/indnatts), mismo predicado, ambos únicos.
--    Se compara además pg_get_indexdef() normalizado (sin el nombre del
--    índice). NUNCA se dropea por coincidencia de nombre; settings_pkey puede
--    ser el equivalente canónico pero jamás el objetivo del DROP.
--    Si no hay coincidencia exacta o hay más de un candidato: NOTICE y skip.
-- ---------------------------------------------------------------------------
do $$
declare
  v_uqs text[] := array[
    'uq_sii_config_store',
    'uq_sii_folios_store_tipo_desde',
    'uq_sii_cert_store_case',
    'uq_settings_store_key',
    'uq_inventory_product_branch',
    'uq_supplier_map_store_names'
  ];
  v_uq text;
  v_uq_oid oid;
  v_cand_oid oid;
  v_cand_name text;
  v_cand_ct integer;
  v_def_uq text;
  v_def_cand text;
begin
  foreach v_uq in array v_uqs loop
    if v_uq = 'settings_pkey' then
      raise exception '040 §5 FAIL-CLOSED: settings_pkey es PK legítima, nunca objetivo de DROP';
    end if;

    select c.oid into v_uq_oid
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = v_uq and c.relkind = 'i';

    if v_uq_oid is null then
      raise notice '040 §5: % no existe en public; skip', v_uq;
      continue;
    end if;

    if not coalesce((select i.indisunique from pg_index i where i.indexrelid = v_uq_oid), false) then
      raise notice '040 §5: % no es UNIQUE; skip (fail-closed)', v_uq;
      continue;
    end if;

    select count(*) into v_cand_ct
      from pg_index cand
      join pg_class c on c.oid = cand.indexrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_index u on u.indexrelid = v_uq_oid
     where n.nspname = 'public'
       and cand.indrelid = u.indrelid
       and cand.indexrelid <> u.indexrelid
       and cand.indisunique
       and cand.indkey = u.indkey
       and cand.indnkeyatts = u.indnkeyatts
       and cand.indnatts = u.indnatts
       and pg_get_expr(cand.indpred, cand.indrelid, true) is not distinct from
           pg_get_expr(u.indpred, u.indrelid, true)
       and c.relname::text <> all(v_uqs);

    if v_cand_ct = 0 then
      raise notice '040 §5: % no tiene equivalente único por definición; skip (no se dropea)', v_uq;
      continue;
    elsif v_cand_ct > 1 then
      raise notice '040 §5: % tiene % equivalentes exactos; ambiguo, skip (fail-closed)', v_uq, v_cand_ct;
      continue;
    end if;

    select c.oid, c.relname::text into v_cand_oid, v_cand_name
      from pg_index cand
      join pg_class c on c.oid = cand.indexrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_index u on u.indexrelid = v_uq_oid
     where n.nspname = 'public'
       and cand.indrelid = u.indrelid
       and cand.indexrelid <> u.indexrelid
       and cand.indisunique
       and cand.indkey = u.indkey
       and cand.indnkeyatts = u.indnkeyatts
       and cand.indnatts = u.indnatts
       and pg_get_expr(cand.indpred, cand.indrelid, true) is not distinct from
           pg_get_expr(u.indpred, u.indrelid, true)
       and c.relname::text <> all(v_uqs);

    v_def_uq    := regexp_replace(pg_get_indexdef(v_uq_oid),    '^CREATE( UNIQUE)? INDEX [^ ]+ ON ', 'CREATE\1 INDEX ON ');
    v_def_cand  := regexp_replace(pg_get_indexdef(v_cand_oid),  '^CREATE( UNIQUE)? INDEX [^ ]+ ON ', 'CREATE\1 INDEX ON ');

    if v_def_uq is distinct from v_def_cand then
      raise notice '040 §5: % difiere de % en pg_get_indexdef normalizado; skip. uq=% / equivalente=%',
                   v_uq, v_cand_name, v_def_uq, v_def_cand;
      continue;
    end if;

    if v_cand_name = 'settings_pkey' then
      raise notice '040 §5: equivalente de % es settings_pkey (PK legítima): se conserva la PK, se dropea solo el uq', v_uq;
    end if;

    raise notice '040 §5: % duplica definición de %; DROP solo sobre %', v_uq, v_cand_name, v_uq;
    execute format('drop index public.%I', v_uq);

    if exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = v_uq and c.relkind = 'i'
    ) then
      raise exception '040 §5 FAIL-CLOSED: % sigue existiendo tras DROP; abortar', v_uq;
    end if;
    if not exists (
      select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname = v_cand_name and c.relkind = 'i'
    ) then
      raise exception '040 §5 FAIL-CLOSED: equivalente % desapareció; abortar', v_cand_name;
    end if;

    raise notice '040 §5: DROP de % verificado; equivalente % intacto', v_uq, v_cand_name;
  end loop;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'settings_pkey' and c.relkind = 'i'
  ) then
    raise exception '040 §5 FAIL-CLOSED: settings_pkey no existe en public; verificar catálogo antes de continuar';
  end if;

  raise notice '040 §5: settings_pkey conservado (PK legítima; nunca se dropea)';
end $$;

-- ---------------------------------------------------------------------------
-- 6. audit_sensitive_changes(): search_path fijo. Si no existe, NOTICE y skip.
-- ---------------------------------------------------------------------------
do $$
declare
  v_oid oid;
  v_cfg text[];
  v_ok boolean;
begin
  select p.oid, p.proconfig
    into v_oid, v_cfg
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'audit_sensitive_changes'
     and p.proargtypes = '{}'::oidvector;

  if v_oid is null then
    raise notice '040 §6: audit_sensitive_changes() no existe en public; skip';
    return;
  end if;

  select exists (
    select 1
      from unnest(coalesce(v_cfg, '{}'::text[])) cfg
     where replace(cfg, ' ', '') = 'search_path=public,pg_temp'
  ) into v_ok;

  if coalesce(v_ok, false) then
    raise notice '040 §6: audit_sensitive_changes() ya tiene search_path=public, pg_temp; skip';
    return;
  end if;

  if coalesce(array_length(v_cfg, 1), 0) > 0 then
    raise notice '040 §6: audit_sensitive_changes() tiene proconfig=% distinto de search_path=public, pg_temp; se fija', v_cfg;
  else
    raise notice '040 §6: audit_sensitive_changes() sin search_path fijo; se aplica ALTER ... SET search_path = public, pg_temp';
  end if;

  execute 'alter function public.audit_sensitive_changes() set search_path = public, pg_temp';

  select p.proconfig into v_cfg from pg_proc p where p.oid = v_oid;
  select exists (
    select 1
      from unnest(coalesce(v_cfg, '{}'::text[])) cfg
     where replace(cfg, ' ', '') = 'search_path=public,pg_temp'
  ) into v_ok;

  if not coalesce(v_ok, false) then
    raise exception '040 §6 FAIL-CLOSED: audit_sensitive_changes() no quedó con search_path=public, pg_temp; abortar';
  end if;

  raise notice '040 §6: search_path fijado y verificado en audit_sensitive_changes()';
end $$;

-- ---------------------------------------------------------------------------
-- 7. Guardia de store_isolation_policy: SOLO informa. NO se dropea, NO se
--    reescribe. Es la única FOR ALL con WITH_CHECK implícito por tienda
--    (025_fix_get_store_id_live_lookup.sql:20-81).
-- ---------------------------------------------------------------------------
do $$
declare
  v_ct integer;
  v_tablas text;
begin
  select count(*), coalesce(string_agg(tablename, ', ' order by tablename), '-')
    into v_ct, v_tablas
    from pg_policies
   where schemaname = 'public' and policyname = 'store_isolation_policy';

  raise notice '040 §7: store_isolation_policy presente en % tabla(s): %', v_ct, v_tablas;
  if v_ct = 0 then
    raise notice '040 §7: catálogo inesperado; NO se dropea ni se recrea store_isolation_policy (revisar 025:20-81)';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Lints NO automatizados (documentación; NO ejecutar)
--
-- 8.1 auth_rls_initplan (17, sin cambio): NO reescribir policies a ciegas.
--     Requiere revisión manual de las 17 policies del snapshot. Patrón a
--     corregir: llamadas directas a public.get_store_id() (y auth.uid())
--     dentro de USING / WITH CHECK → envolver en (select ... ) para forzar
--     InitPlan. Afecta al menos a las policies tenant_* creadas en 038
--     (tenant_select_products, tenant_select_categories,
--     tenant_select_own_profile, tenant_update_own_profile, tenant_own_drafts,
--     tenant_select_own_store, tenant_manage_sii_xml, tenant_manage_sii_files,
--     tenant_upload_store_logos, tenant_delete_store_logos, etc.).
--     Plantilla COMENTADA — NO ejecutar:
--
--     -- do $$
--     -- declare v_policy record;
--     -- begin
--     --   for v_policy in
--     --     select schemaname, tablename, policyname, cmd, roles,
--     --            qual, with_check
--     --       from pg_policies
--     --      where schemaname = 'public'
--     --        and (qual ilike '%get_store_id()%' or with_check ilike '%get_store_id()%')
--     --   loop
--     --     raise notice 'Revisar manualmente: %.% / % / %',
--     --       v_policy.schemaname, v_policy.tablename,
--     --       v_policy.policyname, v_policy.cmd;
--     --   end loop;
--     -- end $$;
--
--     -- Ejemplo de reescritura manual (NO ejecutar sobre 280 policies):
--     -- drop policy tenant_select_products on public.products;
--     -- create policy tenant_select_products on public.products
--     --   for select to authenticated
--     --   using (store_id = (select public.get_store_id()));
--
-- 8.2 multiple_permissive_policies (280, sin cambio): NO automatizar. Cada
--     combinación de policies permisivas tiene semántica propia (OR). Dropear
--     una cambia quién ve/escribe datos y puede romper el aislamiento por
--     tienda. Requiere revisión semántica policy por policy. NO se droppea
--     ninguna policy en este archivo salvo la excepción exacta de §4.
--
-- 8.3 auth_leaked_password_protection: OFF. Se atiende SOLO desde el
--     Dashboard de Supabase Auth. NO hay cambio SQL en esta migración.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 9. Verificación final: conteos en vivo. Solo informa; NO asume éxito.
-- ---------------------------------------------------------------------------
do $$
declare
  v_anon_ct integer;
  v_anon_fns text;
  v_dup_ct integer;
  v_dupes text;
  v_mutable_ct integer;
  v_mutable_fns text;
begin
  select count(*),
         coalesce(string_agg(format('%s.%s()', n.nspname, p.proname), ', ' order by n.nspname, p.proname), '-')
    into v_anon_ct, v_anon_fns
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and has_function_privilege('anon', p.oid, 'EXECUTE');

  select count(*),
         coalesce(string_agg(ca.relname || ' ≡ ' || cb.relname, ', '), '-')
    into v_dup_ct, v_dupes
    from pg_index ia
    join pg_index ib
      on ia.indrelid = ib.indrelid
     and ia.indexrelid < ib.indexrelid
     and ia.indisunique
     and ib.indisunique
     and ia.indkey = ib.indkey
     and ia.indnkeyatts = ib.indnkeyatts
     and ia.indnatts = ib.indnatts
     and pg_get_expr(ia.indpred, ia.indrelid, true) is not distinct from
         pg_get_expr(ib.indpred, ib.indrelid, true)
    join pg_class ca on ca.oid = ia.indexrelid
    join pg_class cb on cb.oid = ib.indexrelid
    join pg_namespace na on na.oid = ca.relnamespace
   where na.nspname = 'public';

  select count(*),
         coalesce(string_agg(p.proname, ', ' order by p.proname), '-')
    into v_mutable_ct, v_mutable_fns
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prosecdef
     and (
       p.proconfig is null
       or not exists (
         select 1
           from unnest(p.proconfig) cfg
          where split_part(cfg, '=', 1) = 'search_path'
       )
     );

  raise notice '040 §9 VERIFICACIÓN FINAL (no asumir éxito):';
  raise notice '  - funciones SECURITY DEFINER en public con EXECUTE en anon: % (%)', v_anon_ct, v_anon_fns;
  raise notice '  - pares de índices únicos duplicados en public: % (%)', v_dup_ct, v_dupes;
  raise notice '  - funciones SECURITY DEFINER con search_path mutable: % (%)', v_mutable_ct, v_mutable_fns;
  raise notice '040 §9: reconsultar el Dashboard de lints tras aplicar. Este bloque solo informa: no corrige nada.';
end $$;
