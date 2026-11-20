/**
 * verify_040.mjs — verificación READ-ONLY del hardening 040 (privilegios, policies e índices).
 *
 * Objetivo: confirmar contra el catálogo del sistema que los permisos EXECUTE, el
 * search_path de las funciones SECURITY DEFINER, las policies y los índices quedaron
 * en el estado esperado. Fecha: 2026-11-19/20.
 *
 * NO modifica DB; solo lee; requiere credenciales ROTADAS; no reutilizar PAT expuesto.
 * Variables de la Management API: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF.
 * Uso: node --env-file=.env.local scripts/verify_040.mjs
 *
 * Output: solo `label: count` / PASS-FAIL. Sin filas, sin PII, sin tokens ni ref.
 */

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Falta variable de entorno requerida: ${name}`)
  return value
}

const token = requireEnv('SUPABASE_ACCESS_TOKEN')
const projectRef = requireEnv('SUPABASE_PROJECT_REF')
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
const failures = []

async function sql(label, query, expected) {
  let response

  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, read_only: true }),
    })
  } catch {
    console.error(`${label}: error de red (detalles omitidos)`)
    failures.push(label)
    return
  }

  if (!response.ok) {
    // Nunca imprimir el body: puede contener secretos o fragmentos de la query.
    console.error(`${label}: HTTP ${response.status} (consulta rechazada)`)
    failures.push(label)
    return
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    console.error(`${label}: respuesta inválida (detalles omitidos)`)
    failures.push(label)
    return
  }

  const count = Number(payload?.rows?.[0]?.count ?? -1)
  console.log(`${label}: ${count}`)
  if (count !== expected) failures.push(label)
}

// 1. anon NO debe tener EXECUTE sobre is_platform_role() (ni vía PUBLIC).
await sql('anon_execute_is_platform_role', `
  select count(*)::int as count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'is_platform_role'
    and (
      p.proacl is null
      or exists (
        select 1
        from aclexplode(p.proacl) a
        where a.privilege_type = 'EXECUTE'
          and (a.grantee = 0::oid or a.grantee = 'anon'::regrole::oid)
      )
    )
`, 0)

// 2. anon NO debe tener EXECUTE sobre protect_profile_insert().
await sql('anon_execute_protect_profile_insert', `
  select count(*)::int as count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'protect_profile_insert'
    and (
      p.proacl is null
      or exists (
        select 1
        from aclexplode(p.proacl) a
        where a.privilege_type = 'EXECUTE'
          and (a.grantee = 0::oid or a.grantee = 'anon'::regrole::oid)
      )
    )
`, 0)

// 3. authenticated SÍ debe conservar EXECUTE sobre is_platform_role().
await sql('authenticated_execute_is_platform_role', `
  select count(*)::int as count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(p.proacl) a
  where n.nspname = 'public'
    and p.proname = 'is_platform_role'
    and a.privilege_type = 'EXECUTE'
    and a.grantee = 'authenticated'::regrole::oid
`, 1)

// 4. get_store_by_domain() debe seguir pública para branding/signup.
await sql('anon_execute_get_store_by_domain', `
  select count(*)::int as count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(p.proacl) a
  where n.nspname = 'public'
    and p.proname = 'get_store_by_domain'
    and a.privilege_type = 'EXECUTE'
    and a.grantee = 'anon'::regrole::oid
`, 1)

// 5. reserve_folios() debe seguir disponible para sesiones autenticadas.
await sql('authenticated_execute_reserve_folios', `
  select count(*)::int as count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(p.proacl) a
  where n.nspname = 'public'
    and p.proname = 'reserve_folios'
    and a.privilege_type = 'EXECUTE'
    and a.grantee = 'authenticated'::regrole::oid
`, 1)

// 6. Toda función SECURITY DEFINER en public debe fijar search_path (incluye audit_sensitive_changes()).
await sql('mutable_search_path_security_definer', `
  select count(*)::int as count
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and not exists (
      select 1
      from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg(entry)
      where cfg.entry like 'search_path=%'
    )
`, 0)

// 7. No debe quedar lectura pública del bucket store-logos.
await sql('public_read_store_logos_policy', `
  select count(*)::int as count
  from pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'public_read_store_logos'
    and pg_get_expr(polqual, polrelid) like '%store-logos%'
`, 0)

// 8. Ninguna policy USING (true) sobre tablas de tienda.
await sql('using_true_on_tenant_tables', `
  select count(*)::int as count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('settings', 'terminals', 'cash_sessions')
    and pg_get_expr(polqual, polrelid) = 'true'
`, 0)

// 9. settings_pkey nunca se dropea: 0 es fallo fuerte.
await sql('settings_pkey_exists', `
  select count(*)::int as count
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'settings'
    and c.contype = 'p'
`, 1)

// 10. Índices uq_* de 038 duplicados por otro índice en la misma tabla y columnas.
await sql('duplicate_uq_indexes', `
  select count(*)::int as count
  from pg_index i1
  join pg_class c1 on c1.oid = i1.indexrelid
  join pg_class t1 on t1.oid = i1.indrelid
  join pg_namespace n on n.oid = t1.relnamespace
  where n.nspname = 'public'
    and left(c1.relname, 3) = 'uq_'
    and exists (
      select 1
      from pg_index i2
      join pg_class c2 on c2.oid = i2.indexrelid
      where i2.indrelid = i1.indrelid
        and i2.indexrelid <> i1.indexrelid
        and i2.indkey::text = i1.indkey::text
    )
`, 0)

if (failures.length) {
  console.error(`FALLOS: ${failures.join(', ')}`)
  process.exitCode = 1
} else {
  console.log('verify_040: OK')
}
