---
status: open
goal: "Auditoría 20 controles + set E2E + voucher POS + hardening multi-tenant: fixes aplicados; residuales y E2E real en handoff"
branch: "main"
created: 2026-11-19
updated: 2026-11-20
requires-plan: true
zona-roja: true
---

## Triaje de lints 20:15Z (2026-11-19) — plan pendiente de autorización

Nuevo snapshot del dueño (`observed_at 2026-11-19T20:15:39Z`), distinto de los 4 CSV versionados
(`02:52Z`). Resumen y evidencia en `BITACORA.md` § «triaje de lints Supabase snapshot 20:15Z».
Estado: **solo lectura**. No se ejecutó SQL, no se usó el PAT, no se tocó código, no hay commit.

### Descomposición

| ST | Tipo | Scope | DoD |
|---|---|---|---|
| 1 | independiente | `BITACORA.md` | diff de snapshots, hallazgos priorizados con evidencia `archivo:línea`, decisión del dueño |
| 2 | independiente | `TASK_HANDOFF.md` | plan ordenado, gates, prueba real + negativa por fase |
| 3 | **bloqueado** | vivo (Supabase) | requiere autorización explícita + rotación de credenciales; **no ejecutado** |
| 4 | independiente | `AGENTS.md` | registro del cambio en «Últimos cambios» (regla 8) |

Ningún archivo de código en scope. No se solapa con el trabajo de lint ESLint ni con zonas rojas.

### Plan ordenado (requiere autorización)

| # | Acción | Gate / prueba |
|---|---|---|
| 0 | Rotar PAT expuesto, service keys y contraseña del PFX. Sin reutilizar el token del chat | Confirmación del dueño por escrito |
| 1 | Volcar en vivo `pg_proc.proacl`, `pg_policies` (rol/cmd/qual/with_check) y `pg_get_constraintdef` + `pg_indexes` de las 6 tablas con `duplicate_index`. Guardar como evidencia | Dataset completo; sin este volcado, **ningún DROP** |
| 2 | Activar `auth_leaked_password_protection` en Dashboard → Authentication → Password Protection | Lint OFF → ON; OAuth Google intacto |
| 3 | **Alto:** probar signup directo a Auth con `store_id` de otra tienda en metadata (`038:124-131`, `001:131-134`). Si confirma, migración para derivar tienda en servidor, no de metadata | Usuarios desechables + limpieza; negativo: metadata ajena no debe crear perfil en otra tienda |
| 4 | `store-logos`: dropear `public_read_store_logos` o acotar a carpeta del store (`038:245-246`) | `getPublicUrl` sigue 200; negativo: anon no puede `list()` el bucket |
| 5 | REVOKE de `anon` a `is_platform_role()` y `protect_profile_insert()`; mantener `authenticated`/`service_role` en la primera (`038:24-25`, 039 no los tocó) | Negativo: anon `rpc/is_platform_role` → `42501`; positivo: developer ve su tienda (`038:69-71`) |
| 6 | `auth_rls_initplan` (17): envolver `auth.uid()/auth.jwt()/auth.role()` en `(select …)` leyendo el `qual` vivo | Sin cambio de semántica; re-correr lint → 0 |
| 7 | `multiple_permissive_policies` (280): verificar ausencia de `USING(true)` residual en `settings`/`terminals`/`cash_sessions`; dropear solo la policy **más estrecha** cuando la genérica cubra mismo cmd/rol/qual | Positivo: aislamiento A/B; negativo: INSERT cross-tienda sigue bloqueado. **No dropear `store_isolation_policy`** |
| 8 | `duplicate_index` (6): dropear los `uq_*` de `038:195-206` tras comparar definiciones; si `settings_pkey` resulta `(store_id,key)`, dropear `uq_settings_store_key`. **Nunca dropear `settings_pkey`** | Upserts existentes siguen funcionando (`product_id,branch_id`, `store_id`, `store_id,case_number`, `store_id,tipo_dte,folio_desde`, `store_id,supplier_name,supplier_product_name`) |

### Gates finales

- Prueba real y negativa para cada fase que toque auth/RLS/escritura (regla de oro §0 de `AGENTS.md`).
- `npx tsc --noEmit` 0; Jest 7 suites/76 tests; `npm run build` global verde; HTTP root 200.
- `npm run lint`: baseline actual 5 errores / 242 warnings residuales, por decisión del dueño.
- Re-correr lints Supabase y comparar contra este snapshot; cualquier `42501`/`USING(true)` nuevo → STOP.
- Sin commit ni push hasta autorización del dueño.

### No tocar

`get_store_id()`, `get_current_store_id()`, `current_user_role()`, `es_admin()`, `get_merchant_id()`,
`is_platform_role()` para `authenticated`, `get_store_by_domain()` para `anon`, ni convertirlas a
`SECURITY INVOKER`: son SECURITY DEFINER por diseño y sostienen RLS y resolución de tenant.
`reserve_folios` ya valida `p_store_id = get_store_id()` en `029:21-23`; no revocar su grant a
`authenticated`. No dropear triggers de `026`/`038` ni policies `FOR ALL` de `025:20-81`.

## Descomposición — limpieza de lint global (2026-11-20)

Breakdown exacto de 241 errores: 173 `no-explicit-any`, 29 `set-state-in-effect`,
15 `purity`, 8 `prefer-const`, 6 `no-unescaped-entities`, 6 `immutability`, 2 `refs`,
2 `no-require-imports`. 89 archivos.

Scopes exclusivos (ningún archivo repetido):
| ST | Scope | DoD |
|---|---|---|
| A | `src/app/api/**` (17 archivos: admin, ai, auth, cash, categories, customers, dashboard, health) | eslint 0 en scope + `tsc --noEmit` 0 |
| B | `src/app/api/**` (11 archivos: orders, pos, settings, sii, staff, subscriptions, terminals, verify-dns) | ídem; sin tocar lógica auth/RLS/SII |
| C | `src/app/admin/**`, `src/app/developer/**`, `src/app/layout.tsx`, `src/app/upgrade/page.tsx` | ídem; purity/immutability/entities reales; set-state only supresión puntual si refactor es riesgoso |
| D | `src/components/**`, `src/sections/**` salvo `PlatformLanding.tsx` | ídem; refs/purity reales |
| E | `src/lib/**`, `src/providers/**` salvo `SaaSProvider.tsx`, `src/stores/authStore.ts`, test SII, `scratch/**`, `eslint.config.mjs` | ídem; `scratch/**` se ignora en config |
| F | `src/app/(auth)/recuperar…`, `(cart)/**`, `(portal)/**`, `(pos)/**`, `(shop)/**` salvo `login/page.tsx` | ídem; POS sin cambios de lógica |

Resultado: 236/241 errores corregidos. Lint final **247 problemas (5 errores / 242 warnings)**.
Gates: `tsc --noEmit` 0; Jest 7 suites/76 tests; `npm run build` global verde; HTTP root 200;
SW 10 cachés de assets / 0 handlers `/api/`. 7 errores TS inducidos por el tipado corregido
también se cerraron sin cambios de comportamiento.

Excluidos por decisión (no se tocan): `src/app/(auth)/login/page.tsx` (1 error) y
`src/sections/PlatformLanding.tsx` (1) — lista "NO tocar" de `AGENTS.md`;
`src/providers/SaaSProvider.tsx` (3) — zona roja, requiere plan de pruebas antes de mover valores
a DB/env. Los 5 errores restantes quedan como residual documentado hasta autorización del dueño.

**Decisión del dueño (2026-11-20):** dejar el residual; no tocar esos 3 archivos; **no hacer commit
todavía**. Git tiene 298 cambios (incluye ~20 borrados de docs de sesiones previas). Sin push.

# Handoff final — Auditoría 20 controles (v1.5) + set SII / voucher POS (2026-11-19)

## Hardening multi-tenant (2026-11-20) — regla del dueño: todo por `store_id`

Seis frentes (A DB/RLS, B APIs, C secretos, D estado compartido, D2 regresiones/PWA, E docs).
Migration `038_multi_tenant_hardening.sql` **aplicada en vivo**. Sin commits ni pushes.

### Gates reales after-changes

| Gate | Resultado |
|---|---|
| `npx jest --runInBand` | **7 suites / 76 tests** ✅ |
| `npx tsc --noEmit` global | **0 errores** ✅ (`scripts/**` excluido de forma permanente en `tsconfig.json`) |
| `npm run build` | **global verde**, sin exclusiones temporales ✅ |
| `npm run lint` global | 509 problemas (241 errores / 268 warnings) ⚠️; baseline previo 509/239 (no introducido por este cambio, requiere confirming de baseline) |
| HTTP root `127.0.0.1:3000` | **200** ✅ |
| `/api/products` Host `master.localhost:3000` | 200 (catálogo demo) ✅ |
| `/api/products` Host `localhost:3000` sin tienda | **404 fail-closed** ✅ |
| CSP en 7 rutas | nonce same-request en 6/6 rutas 200; `/api/settings` → 401 ✅ |
| DB policies `USING(true)` sobre datos de tienda | 0 ✅ (quedan 3 en catálogos/tiers globales con `REVOKE` a anon/authenticated) |
| RLS + FORCE | 36/36 tablas; 0 tablas con RLS sin FORCE ✅ |
| Huérfanos | 0 categorías, 0 productos ✅; 17 perfiles `customer` sin tienda (decisión pendiente) |

### Revisión de lints Supabase + hardcodeos (2026-11-19/20)

Cuatro CSV de lints: 383 filas. Conteo: 44 SECURITY WARN, 4 RLS sin policy INFO,
297 RLS WARN (280 `multiple_permissive_policies`, 17 `auth_rls_initplan`), 38 PERF INFO
(26 FK sin índice, 12 índice sin uso).

**Hallazgo CRÍTICO en vivo — RESUELTO (2026-11-20):** `anon` ejecutaba
`increment_product_stock`, `get_next_folio`, `delete_store` y `reserve_folios`.
Aplicada `supabase/migrations/039_function_privileges_hardening.sql` en vivo vía
Management API con PAT del dueño (rol DB `postgres`, `read_only=false`).

Evidencia post-aplicación:
- ACLs: las 4 críticas sin `=X`/`anon`; `reserve_folios` queda en `authenticated`+`service_role`;
  `get_store_by_domain` conserva `anon`. 10 funciones con `search_path=public, pg_temp`.
- Storage: política `Public Access` eliminada; `site-assets` sigue público (URLs directas OK).
- `security_audit_log`: 2 deny policies creadas (antes 0).
- REST con anon key: 4 RPC → `42501 permission denied`; `get_store_by_domain` → 200 `[]`.
- 021/022/037 ya aplicadas; `pos_drafts.session_id uuid`, índice `orders_store_offline_id_unique`.

Residual DB: `sii_documents_check_folio_duplicate()` mantiene EXECUTE en PUBLIC (helper de trigger);
`audit_sensitive_changes()` quedó con `search_path=public`. Policies duplicadas comparadas: ambas
resuelven el mismo `store_id` desde `profiles` por `auth.uid()`; no se dropearon.
**Urgente:** revocar el PAT `sbp_…ff0c` (expuesto en el chat), rotar service keys y PFX.

**Hardcodeos corregidos en este handoff:**
- `scripts/setup_test_user.mjs`, `test-supabase.mjs`, `scratch/*.mjs|ts`: service key
  literal reemplazada por `SUPABASE_SERVICE_ROLE_KEY`; 5 scripts SII pasaron a `STORE_ID` desde env.
- `EditorProvider.tsx` y `api/v1/bot/inventory/pending/route.ts`: `.eq('store_id', …)` agregado.
- `api/blumi/prueba-motor`: emisor ajeno ya no se usa como fallback; fail-closed si falta config.
- `lib/blumi/client.ts`: `BLUMI_SANDBOX_URL` obligatoria en producción (agregada a `.env.example`).
- `developer/actions/stores.ts`: inserción de `admin_finances` con `createAdminClient()` y error chequeado.
- `tsconfig.json`: `scripts/**` excluido del type-check; build global verde.

**Hardcodeos que requieren decisión / zona roja (reportados, no tocados):**
- `DEVELOPER_EMAILS` en `lib/constants.ts` decide rol `developer` desde el cliente y
  `proxy.ts` (zona roja). Mover a `profiles.is_developer`/`user_stores.role` con plan de pruebas.
- `proxy.ts`, `auth/callback`, `login`, `auth/sso`: dominio raíz `yahpos.cl`/localhost fijo.
- `contacto/page.tsx` muestra emails/WhatsApp de un tenant real en UI compartida.
- `next.config.ts` allowlist de imágenes atada a proveedores de un tenant.
- Migraciones 001/033/038 con UUID de tienda literal (ya aplicadas; no re-ejecutar).
- `dev-auth.ts` fallback de secreto en dev, precios UF/IVA fijos en `developer/actions/stores.ts`.

**Lints restantes (no urgentes, requieren diagnóstico en SQL Editor):**
`multiple_permissive_policies`: anon ve 0 filas en las 16 tablas (CSV viejo); queda comparar
`qual` de `store_isolation` vs `store_isolation_policy` para authenticated. No dropear a ciegas.
`rls_enabled_no_policy`: 4 tablas internas; no crear policies; el deny de `security_audit_log` ya fue aplicado con 039.
17 `auth_rls_initplan`: envolver `auth.*` en `(select …)` leyendo el `qual` real.
26 FK sin índice / 12 índices sin uso: performance, no seguridad; no dropear índices sin ciclo representativo.
`auth_leaked_password_protection`: activar en Dashboard → Authentication → Password Protection.

### Prueba real + negativa (aislamiento A/B en vivo)

| Caso | Resultado |
|---|---|
| Usuario A (tienda `45be9c55…`) ve products | **1742** ✅ |
| A ve categories | **16** ✅ |
| A ve profiles | **37** (solo su tienda) ✅ |
| Usuario B (tienda `c828f16e…`) ve products | **22** ✅ |
| B ve categories | **2** ✅ |
| anon lee `stores` | **0 filas** ✅ |
| anon llama `get_store_by_domain` | solo 3 keys de branding (`appearance_primary_color`, `accent_color`, `surface_color`); `supervisorPin`/config SII **no se filtran** ✅ |
| A intenta INSERT perfil `role=admin` en tienda B | **BLOQUEADO** ✅ |
| Registro con `store_id` válido en metadata | conserva tienda, rol `customer` ✅ (fix de trigger verificado) |
| Registro con `store_id` inválido | cae a `null` (fail-closed), rol `customer` ✅ |

Script reproducible: `supabase/smoke_test_038_isolation.sql`. 3 perfiles residuo de las probes se
borraron (confirmado 17).

### Cambios por frente

| Frente | Archivos | Resultado |
|---|---|---|
| A — DB/RLS | `supabase/migrations/038_multi_tenant_hardening.sql` (nuevo), `src/proxy.ts` | Policies `USING(true)` bajadas; `get_store_by_domain` redactado; `handle_new_user` sin emails hardcodeados; trigger anti-escalada INSERT; 6 UNIQUEs; Storage por carpeta `store_id`; backfill 16 categorías |
| B — APIs | `customers`, `developer/actions`, `dashboard*`, `orders*`, `cash-sessions*`, `products` | store desde sesión/Host vía AdminClient; RUT cross-tenant eliminado; auth antes del body; sin catálogo falso en tienda real |
| C — secretos | `settings`, `transbank.ts`, `webpay/*`, `blumi/*`, `configuracion/page.tsx`, `.env*`, `scripts/{migrate,rotate}-*.mjs` | Flow/Webpay/Blumi cifrados AES-256-GCM en `settings` por store; GET solo booleanos; sin `TRANSBANK_*`/`BLUMI_API_KEY`/`FLOW_*` en entorno; UI con 3 password inputs dentro de `<form>` y badge "Configurado" |
| D — estado | `src/lib/tenant-state.ts` (nuevo), 4 stores, `SessionSync`, `useCustomerDisplaySync`, `sw.js`, logs, Realtime | clave persist por store + `__storeId`; merge descarta estado ajeno; cola SII/folios por `${storeId}:${tipo}`; BroadcastChannel por store; SW sin caché `/api/*`; logs sin email/RUT; Realtime con `filter store_id` |
| E — docs | este handoff, `BITACORA.md`, `CHECKLIST_SEGURIDAD.md` | evidencia y residuales |

### Rotación de clave (irreversible, ejecutada)

- Clave nueva de 32 chars generada, **nunca impresa**. Guardada solo en `.env.local` (`SII_ENCRYPTION_KEY`).
- Antes: 8/8 valores cifrados (PFX, password, 6 CAF) descifraban con clave anterior; después: **8/8 GCM y descifran con clave nueva**.
- `settings` migrados para `c828f16e…`: 3/3 secretos (Webpay commerce/API key, Blumi) en GCM.
- `.env.local` quedó sin secretos de tienda: solo variables globales de plataforma + `SII_ENCRYPTION_KEY`.

### Zona roja — plan de pruebas (`src/proxy.ts`)

Tocado para resolver TODOS los hosts por RPC (`get_store_by_domain`) en vez de leer `stores` directo,
porque `stores.config` expone `supervisorPin` y config SII. Plan ejecutado:
1. `tsc --noEmit` → 0 errores en `src/`.
2. HTTP root → 200.
3. Host `master.localhost:3000` → catálogo 200; Host sin tienda → 404.
4. DB: anon lee 0 `stores`; RPC devuelve solo 3 keys de branding (sin secretos).
No se tocó `signar.ts`, `supabase.ts` ni el motor DTE (`engine.ts`).

### Residuales nuevos (requieren decisión del dueño)

1. **17 perfiles `customer` con `store_id=NULL`** — conservan solo lectura de su propio row. Backfill
   a tienda real o policy acotada: decidir.
2. **Catálogos globales** (`master_catalog_products`, `catalogo_global*`) — sin consumidor en `src/`
   salvo `developer/actions/catalog.ts` y `/api/products/lookup`. No son datos de un cliente, pero la
   regla absoluta del dueño pediría esquema por tienda: decidir.
3. **`sii_config.rut_emisor` vacío** y CAF 39 agotado (`folio_actual=11`, `folio_hasta=10`). E2E real
   bloqueado hasta cargar certificado + CAF vigente.
4. **Contraseña del PFX en logs históricos** — rotarla. No se repitió el valor.
5. **`serialize-javascript` high vía `next-pwa`** — downgrade vetado; aceptado.
6. **Lint global 241 errores preexistentes** ⚠️; `scripts/**` ya no rompe el build (excluido de `tsconfig`).
7. **Token Supabase `sbp_…ff0c`** (proyecto `bddpzqayurvhgpllykku`) — revocar al terminar.
8. **Webpay status/commit con `withAuth()`** — antes permitían polling anónimo; verificar retorno/cookie
   con sesión real.

### Descomposición ejecutada (scopes exclusivos)

| ST | Tipo | Archivos | DoD |
|---|---|---|---|
| A | Independiente | `supabase/migrations/038_*.sql`, `supabase/smoke_test_038_isolation.sql`, `src/proxy.ts` | prueba real + negativa A/B ✅ |
| B | Independiente | `customers`, `developer/actions`, `dashboard*`, `orders*`, `cash-sessions*`, `products` | tsc 0 ✅ |
| C | Independiente | `settings`, `transbank`, `webpay/*`, `blumi/*`, `configuracion/page.tsx`, `.env*`, scripts | tsc 0, rotación verificada ✅ |
| D | Independiente | `tenant-state.ts`, 4 stores, `SessionSync`, `useCustomerDisplaySync`, `sw.js`, logs, Realtime | tsc 0 ✅ |
| D2 | Secuencial (D) | `next.config.ts`, `sw.js`, `OfflineSyncManager`, `PosHeader`, `RealTimeStockBadge`×2, `RemoteClosureListener` | 0 errores nuevos; SW post-build 10 routes estáticos, 0 handlers `/api/` ✅ |
| E | Secuencial (todo) | este handoff, `BITACORA.md`, `CHECKLIST_SEGURIDAD.md` | cerrado ✅ |

### Cierre D2 (regresiones del frente D + PWA)

`next.config.ts` usa `workboxOptions.runtimeCaching` explícito desde el export real de `next-pwa@10.2.9`
(allowlist de 10 cachés de assets; `cacheStartUrl/dynamicStartUrl/cacheOnFrontEndNav/extendDefaultRuntimeCaching`
en `false`). Sin cambiar versión del paquete. `public/sw.js` regenerado por build verificado:
**10 `registerRoute`**, 0 `url(/api/)`, 0 reglas `start-url`/`next-data`/`pages-rsc`/`cross-origin`,
10 `cacheName`s todos de assets. `OfflineSyncManager` lee `offlineFolioPool[`${storeId}:${tipo}`]`
con `getActiveStoreId()` y fail-closed sin store; `PosHeader` muestra solo el sufijo del tipo;
`shop/RealTimeStockBadge` y `RemoteClosureListener` usan `useSaaS().storeId` con filtro
`id`+`store_id` y no suscriben sin store. `pos/RealTimeStockBadge` es presentacional (sin canal,
no se creó uno); el realtime POS ya estaba filtrado en `pos/page.tsx:626`.


## Resultado

15 ✅ / 5 ⚠️ / 0 ❌ abiertos. v1.4 afirmaba 20 ✅ pero una auditoría independiente de 4 bloques
encontró afirmaciones falsas y regresiones. Todo lo accionable se corrigió contra código real.
Lo no verificable en repo o que exige tocar zona roja queda abajo. **Sin commits ni pushes.**

## Gates finales (evidencia real)

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` filtrando `^src/` | 0 errores ✅ |
| `npx jest --runInBand` | **6 suites / 46 tests** ✅ (incluye matriz POS 25, fail-closed SII 6, voucher 5) |
| Golden DTE + roundtrip CAF | byte-idéntico en 2 procesos, `signature_valid=true`, **SHA nuevo `6a4182ed…f67e89`** ✅. SHA histórico `782b84fc…0912` **no reproducible**: no quedaron script/payload/timestamp originales ⚠️ |
| `npm run build` | global verde; `scripts/**` excluido de forma permanente en `tsconfig.json` ✅ |
| `npx eslint src` | 509 problemas (247 errores / 262 warnings) preexistentes ⚠️ |
| `npm audit --omit=dev` | 5 totales: 0 critical / 1 high / 4 moderate ✅ |
| Matriz HTTP dev | 20/20 protegidas → 401; catálogo 200; registro inválido 400 ✅ |
| CSP dev | 4/4 checks; nonces rotan; 7/7 scripts nonceados; `SAME_REQUEST_MATCH=True` ✅ |
| DB en vivo | 36/36 RLS+FORCE; `caf_plaintext=0`, `caf_gcm=5`, `dup_staff=0`, `staff_index=1`, `deny_policies=6`, `audit_rows=0`, `orphan_profiles=1`, `sii_env=certification` ✅ |
| Grep `select('*')`/`.select()` en `src` | 0 ✅ |
| Grep `secure: false` en `src` | 0 ✅ |

## Fixes aplicados en esta tanda (v1.5)

| Archivo | Fix |
|---|---|
| `src/lib/validations/api.ts`, `api/customers/route.ts` | `customerDeleteSchema` + `parseQuery` en DELETE |
| `src/app/api/auth/session-sync/route.ts` | `safeRedirectTo` escapa `<`/`>`/`&`; usado en `window.location.replace` |
| `src/app/api/auth/sso/route.ts` | `secure` derivado del `rootOrigin` (ya no `false` hardcodeado) |
| `src/app/api/auth/register/route.ts` | lookup y delete de perfil con scope `store_id` |
| `src/app/api/sii/caf/route.ts` | rol antes de parsear el body |
| `src/app/api/sii/documentos/[id]/xml/route.ts`, `.../pdf/route.ts` | perfil/rol antes de leer `xml_content` |
| `src/lib/security.ts` | `getSecuritySalt()` único para `encrypt`/`decrypt` |
| `.env.example` | `SII_ENCRYPTION_KEY` (32 chars) |
| `src/lib/validations/{orders,staff}.ts` | `.strict()`; se quitó el campo muerto `folio` del POST POS |
| `src/app/api/wizard/caf/route.ts` | RUT del CAF fail-closed |
| 9 agentes de selects (10 + 8 + 1 sitios) | columnas explícitas + `.limit()`; 4 errores TS resultantes corregidos |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md` | v1.5: tabla honesta + §2.5 + secciones 3/9/10/16/17/19/20 corregidas |
| `BITACORA.md`, `AGENTS.md` | changelog de la auditoría final |

## Residuales — requieren decisión del dueño

1. **Service key fuera de `createAdminClient()`** — `src/lib/sii/engine.ts:60-63`, `emisor-config.ts:35-42`,
   `dev-auth.ts:19`. Enrutar por helper `server-only` y dar a `dev-auth` su propio `DEV_TOKEN_SECRET`.
   **No se tocó**: modificar el motor DTE exige repetir el golden test completo; zona roja.
2. **`httpOnly:false` en cookies Supabase SSR** — default de `@supabase/ssr`; `createBrowserClient` necesita
   leer cookies desde JS. Cambiarlo rompe auth. Mitigación vigente: CSP con nonce, sin `unsafe-inline`.
   Decisión: **diseño aceptado**, no bug.
3. **Sin redirect HTTP→HTTPS en código** — no hay `x-forwarded-proto`/`redirects()`/regla en `vercel.json`.
   Verificar si Vercel lo fuerza en edge; si no, agregar upgrade en `proxy.ts`.
4. **Storage buckets/policies sin evidencia en repo** — 0 menciones en `supabase/**/*.sql`. El código usa
   `store-logos` (público) mientras la doc vieja nombra `site-assets`/`sii_files`. Verificar en vivo y
   versionar una migración con nombres alineados.
5. **`serialize-javascript@6.0.2` (high)** — vía `@rollup/plugin-terser` (cadena Workbox→`next-pwa@10.2.9`).
   Fix propuesto = downgrade major de `next-pwa`, **vetado**. Aceptado y documentado.
6. **DEK/KMS por tienda** — hoy clave global (`SII_ENCRYPTION_KEY`). Cifrado en reposo sí pasa; mejora defensiva.
7. **Paginación cursor** en listados grandes — hoy `.limit()` fijo. Mejora, no control fallido.
8. **Antivirus de uploads** — no implementado; validación por magic bytes sí.
9. **Trigger anti-escalada solo cubre UPDATE** — `026` no cubre INSERT. Evaluar `BEFORE INSERT` para
   bloquear perfiles creados con `role='owner'` directamente.
10. **IP del rate limit spoofable** — `x-forwarded-for` primer valor sin proxy de confianza que lo sobrescriba.
11. **Errores crudos en 500** de `/api/v1/bot/*` (`message` del error) — fuga interna menor en v1.
12. **`maxAge` implícito 400 días** en cookies Supabase — no acotado explícitamente en `proxy.ts`/`supabase.ts`.
13. **Auditoría de `environment` depende de migración 036** — si solo se ejecuta 035, no se audita.
14. **1 perfil `owner` con `store_id` huérfano** (`92674aea-…`) — dato en vivo, no se borró.
15. **`certificado_password_encrypted` original (CBC) no recuperable** — se reemplazó por GCM funcional durante
    prueba de redacción del trigger 035. **Verificar con el PFX real antes de producción.**
16. `.strict()` en esquemas SII/wizard se dejó como excepción intencional (`.passthrough()`/defaults) para DTE;
    confirmar si se quiere cerrar también.
17. **Cuota de 1 folio del set es solo UI** (`sessionStorage`): cerrar la pestaña la libera y el server
    action no la conoce. No es control de seguridad.
18. `GET /api/sii/estado/[id]` usa roles de operación (incluye `cashier`) aunque la página es gestión;
    es solo lectura, sin secretos.
19. PDFs emitidos antes del cambio no traen `metadata.resolucion`; el visor mostrará resolución solo en DTE nuevos.
20. `superadmin` se acepta como literal en actions/páginas/rutas SII; no existe en `src/lib/constants/roles.ts`.
    Decidir si se agrega como rol formal.

## Cierre funcional — set SII y voucher POS (2026-11-19)

| Pieza | Resultado |
|---|---|
| `/admin/facturacion` | `store_id` y rol desde sesión; `tipo` validado; botones habilitados **solo con CAF vigente** (hoy 39). Set en `/admin/facturacion/pruebas` con 4 casos 39 y otros 5 tipos bloqueados hasta tener CAF |
| Set de pruebas | Emite → verifica documento en BD → envía por `/api/sii/enviar` → muestra folio/track_id/estado y links XML/PDF. Botón "Consultar estado SII" usa `GET /api/sii/estado/[id]` (veredicto real separado del estado local). Track `9999999999`/MOCK se rechaza como error |
| POS | Decisión pura `dte/voucher/blocked` con 25 tests; bloqueo **antes** de cobrar; `SumUp`→`SumUp Solo`; terminal ya no se hereda al cambiar método |
| Voucher | `VOUCHER / COMPROBANTE INTERNO` + `NO ES BOLETA ELECTRÓNICA SII` + `NO VÁLIDO COMO DOCUMENTO TRIBUTARIO` en HTML y térmica; sin falso "Folio"; customer display diferenciado |
| Cero duplicación | Voucher no consume folio, no encola DTE, no llama a `/api/sii/sync` (409 si intenta); `document_kind`/`sii_skip_reason` persistidos; `sii_status='no_aplica'`; índice único `orders_store_offline_id_unique` **aplicado en vivo** (0 duplicados previos) |
| Motor (zona roja autorizada) | Fail-closed ante PFX/token MOCK; CAF `RE` vs RUT; PDF con Neto/IVA/Tasa/Exento/resolución/referencias. Bitácora de líneas en § "Bitácora de cambios en motor DTE" |

**No ejecutado:** ningún caso real contra el SII (consume folio). Requiere login del dueño y certificado cargado.

## Pruebas que el dueño debe hacer

- Revocar el token Supabase `sbp_…ff0c` (proyecto `supermercado-sf`,
  ref `bddpzqayurvhgpllykku`). **No se guardó en el repo**; solo se usó en variables temporales de shell.
- Subir el certificado `.pfx` **ya comprado** y verificar su cifrado con el valor de `SII_ENCRYPTION_KEY` de producción.
- Verificar login cross-subdominio y SSO (el flag `secure` del bridge SSO cambió en v1.5).
- Confirmar que el reset RUT de `register` no rompe el flujo de clientes POS con RUT repetido entre tiendas.
- Con sesión real, abrir `/admin/facturacion/pruebas` y ejecutar **1 solo caso de boleta 39**; revisar
  folio, `track_id` y el botón "Consultar estado SII" (veredicto real vs estado local).
- En POS, cobrar con JUNAEB/PLUXE/EDENRED y con "Sin emisión SII → sólo voucher": imprimir en pantalla
  y térmica, y confirmar que el texto no-SII aparece y que **no** se creó documento en `/admin/facturacion`.
- Aplicar la migración `037_orders_offline_id_unique.sql` también en el entorno de producción cuando
  corresponda (en desarrollo ya está aplicada y verificada).

## Observación del dueño — alcance real de las pruebas del motor SII (2026-11-19)

El dueño señaló que las pruebas del entorno de certificación se hicieron con un PFX autofirmado
generado por mí, "en otro lado", y no en el flujo que sus clientes usarían:
`http://master.localhost:3000/admin/facturacion` y el POS. **Tiene razón en el fondo.** Aclaración:

- El **golden DTE** es prueba de **regresión criptográfica**: mismo XML firmado dos veces con el
  mismo PFX local → `signature_valid=true`, SHA-idéntico. Sirve para detectar que un cambio de
  dependencia o de cifrado no alteró SHA1/C14N/ENVELOPED. **NO** es certificación ante el SII
  ni valida el flujo del cliente.
- Las pruebas HTTP (20/20 → 401), CSP y DB son de **seguridad**, no funcionales. No demuestran que
  "emitir desde `/admin/facturacion` y desde el POS funcione al 100%".
- Estado verificado ahora, sin sesión: `GET /admin/facturacion` → **307** (ruta protegida, esperado);
  `GET /api/sii/config` → **401**. No se pudo evaluar el flujo real sin login.

**Estado SII real del dueño (actualizado 2026-11-19):**
- **Certificado: YA COMPRADO.** Existe el PFX del contribuyente; queda subirlo/configurarlo en la app.
- **CAF: solo boleta electrónica tipo 39 disponible**, ya pedida y cargable desde el wizard.
- **Facturas y demás documentos: EN TRÁMITE.** El dueño está esperando la **verificación del SII**
  para pedir esos CAF; lo hará la **próxima semana o cuando lo verifiquen**. No se puede emitir
  factura u otros tipos todavía: no hay CAF vigente para ellos.
- El certificado comprado NO está en el repo (correcto); con él se hará la validación E2E real.

**Pendiente funcional (con cuenta, certificado comprado y CAF 39 ya disponibles):**
1. Login en `master.localhost` → `/admin/facturacion`, configurar RUT/razón social/resolución y subir el PFX **ya comprado**.
2. Cargar el CAF de boleta 39 desde el wizard (`POST /api/wizard/caf`, ahora fail-closed con `rut_emisor`).
3. Emitir una **boleta 39** de prueba desde `/admin/facturacion` y confirmar estado SII (track_id/estado).
4. Repetir emisión desde el POS con el mismo certificado/CAF 39 y verificar folios consecutivos.
5. Abrir visor XML y PDF del documento emitido (roles verificados antes de leer `xml_content`).
6. Confirmar que la cola offline sincroniza sin persistir secretos en IndexedDB.
7. **Tras la verificación SII (próxima semana):** pedir/cargar CAF de facturas y demás documentos,
   repetir emisión E2E para cada tipo habilitado.

No se ejecutó porque requiere login real y el certificado cargado en la app. Queda como handoff
explícito, no como ✅ de la auditoría de seguridad.

## Decisiones tomadas

- No tocar SHA1/C14N/ENVELOPED en `src/lib/sii/signar.ts`.
- No downgradear `@ducanh2912/next-pwa`.
- No tocar `src/lib/sii/engine.ts` salvo con plan de pruebas + golden test.
  **Autorizado por el dueño 2026-11-19** (ST5 abajo), con bitácora de cambios para la revisión
  de certificación del motor. Ver § "Bitácora de cambios en motor DTE".
- No maquillar el build: `scripts/**` son herramientas operativas, fuera del grafo de la app; lint global preexistente queda documentado.
- Sin commits ni pushes.

## Descomposición — set de pruebas en `/admin/facturacion` + voucher POS (2026-11-19)

Decisiones del dueño:
- **ST5 autorizado** (zona roja `engine.ts`): fail-closed ante PFX/token mock. Dejar anotado cada
  cambio para revisar durante la certificación del motor.
- Set de pruebas: **firma + envío de 1 boleta real tipo 39** (consume 1 folio del CAF disponible).
- Voucher: **flag por tienda** + método de pago/terminal que emite fuera del sistema.

| ST | Tipo | Archivos (scope exclusivo) | DoD |
|---|---|---|---|
| 1 | Independiente | `src/app/admin/facturacion/actions.ts`, `src/app/admin/facturacion/page.tsx` | `store_id` desde sesión, rol `SII_OPERATION_ROLES`, `tipo` validado contra payload, notas de crédito corregidas (args + event_type) |
| 2 | Independiente | `src/app/admin/facturacion/components/DocumentTabs.tsx`, `src/app/api/sii/caf/route.ts` | Solo tipos con CAF vigente habilitados; link a `/admin/facturacion/pruebas` |
| 3 | Secuencial (1,2) | nuevos `src/app/admin/facturacion/pruebas/**`, `src/lib/sii/test-cases.ts` | Set dentro de facturación: emite → envía → folio/track_id/estado → XML/PDF. Hoy solo 39 |
| 4a | Independiente | nuevo `src/lib/pos/sii-decision.ts`, nuevo `src/__tests__/unit/sii-decision.test.ts`, `src/app/(pos)/pos/page.tsx`, `src/components/pos/PaymentModal.tsx`, `src/components/pos/PosSettingsModal.tsx`, `src/stores/posStore.ts` | Decisión pura `dte/voucher/bloqueado`; bloqueo antes de cobrar; matriz de tests |
| 4b | Secuencial (4a) | `src/components/pos/PosReceiptModal.tsx`, `src/lib/hardware/types.ts`, `src/lib/hardware/printer.ts`, `src/lib/hooks/useCustomerDisplaySync.ts`, `src/app/(pos)/pos/customer-display/page.tsx`, `src/lib/validations/orders.ts`, `src/app/api/orders/route.ts`, `src/app/api/sii/sync/route.ts`, `src/components/pos/OfflineSyncManager.tsx`, nueva `supabase/migrations/037_orders_offline_id_unique.sql` | Voucher no-SII explícito, sin pseudo-folio; `documentKind` persistido; `offline_id` único; cero folio/cola/DTE en voucher |
| 5 | Independiente — **zona roja autorizada** | `src/lib/sii/auth.ts`, `src/lib/sii/engine.ts`, `src/lib/sii/caf.ts`, `src/lib/sii/pdf-generator.ts`, `src/lib/sii/pdf-datos.ts`, nuevo `src/__tests__/unit/sii_failclosed.test.ts` | Fail-closed PFX/token MOCK en modo real; CAF `RE` vs RUT; PDF con Neto/IVA/resolución/referencias. Golden byte-idéntico + test negativo |
| 6 | Secuencial (todo) | `docs/seguridad/CHECKLIST_SEGURIDAD.md`, `TASK_HANDOFF.md`, `BITACORA.md`, `AGENTS.md` | Gates: tsc, Jest, build, lint, HTTP 401/403, golden; E2E real marcado hasta tener sesión |

## Bitácora de cambios en motor DTE (para certificación)

Se llena con cada ST5: archivo, líneas, qué cambió, por qué, y resultado del golden. **No se tocan**
SHA1/C14N/ENVELOPED en `src/lib/sii/signar.ts`.

Ejecutado 2026-11-19 (ST5, zona roja autorizada). **No se tocó** SHA1/C14N/ENVELOPED ni el orden
de `<DD>` del TED en `src/lib/sii/signar.ts`.

| Archivo | Líneas | Cambio | Por qué |
|---|---|---|---|
| `src/lib/sii/auth.ts` | 23-29 | `PREFIJO_TOKEN_MOCK` + `esTokenMock()` | Detectar token simulado antes de enviar |
| `src/lib/sii/engine.ts` | 43-62 | `exigirSignerReal()` / `exigirTokenReal()` | Cortar modo real con signer/token mock |
| `src/lib/sii/engine.ts` | 245-247 | `emitirDocumento` exige signer real salvo `metadata.test === true` | Evita timbrar/insertar con PFX caído |
| `src/lib/sii/engine.ts` | 308, 320 | Pasa `rutEmisor` a `validarCafParaEmision`; TED usa `metadata.test` | CAF ajeno y simulación controlada |
| `src/lib/sii/engine.ts` | 364-372 | `metadata.resolucion = { fchResol, nroResol }` | La ruta PDF no consulta `sii_config`; resolución viaja en metadata, **no altera el XML firmado** |
| `src/lib/sii/engine.ts` | 463-498 | Modo test decidido por `metadata.test`, no por token; token real validado antes de sobre/firma/POST | Cero éxito falso |
| `src/lib/sii/engine.ts` | 552-586 | `consultarEstadoEnvio` rechaza docs de prueba y token/signer mock | Evita veredicto inventado (sin callers en repo) |
| `src/lib/sii/caf.ts` | 45-82 | `normalizarRutEmisor()`, `rutEmisor?` opcional, error `LOCAL-RE` | Mismo criterio que `wizard/caf/route.ts:69-89` |
| `src/lib/sii/pdf-generator.ts` | 4-24, 31-33, 198-205, 265-287 | `PdfTotales`/`PdfResolucion`/`PdfReferencia`, resolución y desglose | Entregar detalle tributario real en el impreso |
| `src/lib/sii/pdf-datos.ts` | 2, 53-86, 116-136 | Extrae totales, resolución y referencias de XML + metadata | Sin inventar valores ausentes |
| `src/__tests__/unit/sii_failclosed.test.ts` | 173-270 | 6 tests (3 fail-closed, 2 CAF, 1 PDF) | Evidencia ejecutable |

**Evidencia:** Jest 5 suites / 41 tests; tsc 0 errores en `src/`; golden con PFX autofirmado
`deterministic=true`, `signature_valid=true`, SHA `6a4182ed…f67e89`, byte-idéntico en dos procesos.

**Golden histórico NO revalidado:** el SHA `782b84fc…0912` documentado antes no es reproducible —
el script, el payload y el timestamp originales no están en repo ni en temp. El golden nuevo usa otro
payload/timestamp, por eso da otro SHA. **No afirmar que el SHA viejo sigue vigente.** Script y
artefactos fuera del repo: `C:\Users\Blaz Baez\AppData\Local\Temp\opencode\golden\`.

**Otros riesgos:** PDFs emitidos antes de este cambio no traen `metadata.resolucion` (el visor
mostrará resolución solo en DTE nuevos); service key fuera de `createAdminClient()` queda en handoff;
E2E con PFX real sigue pendiente.

---

## Report Back — cierre ESLint + segunda ola sin hardcodes (2026-11-20)

### Resultado

- [x] `npm run lint` → **0 problemas** (antes 96 residuales + deuda preexistente).
- [x] `npx tsc --noEmit` → **0**.
- [x] `npm test -- --runInBand` → **45 suites / 297 tests verdes**.
- [x] `npm run build` → **exit 0**.
- [x] 0 dominios/puertos literales en producción (solo fixture `tienda.localhost:3000` en test).
- [x] 0 `any`/`as any` en código de producción; 16 `eslint-disable` restantes = hidratación/fetch legítimos.
- [x] Sin commit, sin push, sin SQL en vivo, sin cambios en SHA1/C14N/ENVELOPED ni en `@ducanh2912/next-pwa`.

### Descomposición ejecutada (scopes disjuntos)

| ST | Archivos | DoD |
|---|---|---|
| Auth | `src/lib/auth/sso-target.ts`, 3 rutas auth, tests | `from_origin`/`next` validados server-side; sin tokens en origin ajeno; 62 tests |
| 1 | `root-origin.ts`, `root-domain.ts`, `proxy.ts`, `EditorToggle`, `session-sync`, `sso-target` (re-export) | root desde env; 500 fail-closed; `x-forwarded-proto` inyectado por el proxy; 103 tests |
| 2 | `src/lib/api.ts`, `.env.example` | base SSR = root origin; 6 tests |
| 3 | `src/app/api/products/route.ts` | 1 RPC para todo host; 17 `any` tipados; 6 tests |
| 4 | developer `stores.ts`/`DeveloperPanel`/`_shared` | sin localhost; DNS desde env; 16 tests |
| 5 | `products/[id]`, `settings`, inventory upload, hardware | 11 `any` + 5 supresiones eliminadas; 13 tests |
| 6 | `configuracion`, `admin/productos`, `PendingAdjustmentsTab` | 3 file-level disables eliminados; 2 tests |
| 7 | Footer, Upgrade, EditorProvider, `ted.ts`, `products.ts` | 0 literales de contacto; golden DTE verde; 4 tests |

### Cambios sensibles

- `from_origin` crudo nunca se interpola: se resuelve a `parsed.origin` canónico o se rechaza antes del
  `exchangeCodeForSession`. `next` pasa doble validación (incluye bypass `/..//evil.com`).
- `resolveTrustedSsoOrigin`: root + subdominios de `NEXT_PUBLIC_ROOT_ORIGIN` + RPC anónima
  `get_store_by_domain` con `is_active`; sin columna `domain_verified` (no existe en migraciones).
- `proxy.ts`: host raíz desde env; si falta config → 500 con CSP antes de cualquier redirect. El
  protocolo se inyecta en `x-forwarded-proto` para que `session-sync` no dependa de un header del cliente.
- `QuickStockPanel`: update `inventory` por `product_id + branch_id + store_id` y espejo en
  `products` con `.eq('store_id', storeId)`. RLS cubierto por `store_isolation_policy`; **falta prueba
  real + caso negativo en vivo** (hoy solo mocks + migraciones).
- POS: hidratación con `useSyncExternalStore` (sin `queueMicrotask`); `/admin` absoluto vía
  `window.location.origin`.

### Riesgos / pendientes del dueño

1. **Config obligatoria:** `.env.local` sin `NEXT_PUBLIC_ROOT_ORIGIN` → proxy 500. Definir también
   `NEXT_PUBLIC_ROOT_DOMAIN` (DNS) y `NEXT_PUBLIC_SUPPORT_EMAIL` (contacto). Sin valores inventados.
2. **`domain_verified`:** se escribe/lee en developer pero 0 migraciones lo crean. Requiere DDL;
   hoy el update puede fallar en BD real. No tocado.
3. **`x-forwarded-for`** del rate limit sigue siendo spoofable si el edge no lo sobrescribe.
4. **Auth cross-subdominio** (handoff de mayo) sigue sin confirmación en vivo; los tests son mocks.
5. **Credenciales:** PAT `sbp_…ff0c` pendiente de revocar; rotar service keys y PFX; 040 no ejecutada.
6. Sin commit ni push. `YAHPOS Kanban.md` no editado (regla #6).

---

## Handoff — trabajo conjunto con el colaborador (2026-11-20)

El amigo del dueño es el **colaborador** de `docs/guias/CURRICULUM_COLABORADOR.md` (oct→dic,
arranca de cero, 80% revisar, Etapa 3 «cazar mentiras de la IA», Etapa 6 primera tarea).
**No programa**: explora de forma visual/lógica. El dueño le asigna tareas; la IA solo anota
análisis y nunca implementa sin autorización. Todo quedó en el repo:

- `docs/operacion/TAREAS_COLABORADOR.md`: tablero de tareas asignadas (`T-###`). Una a la vez,
  decir QUÉ buscar no CÓMO arreglarlo. No reemplaza `YAHPOS Kanban.md`.
- `docs/operacion/PROTOCOLO_CAZABUGS.md`: flujo conjunto, modo IA «solo anotar», plantillas
  `T-###`/`HAL-###`, riesgo S1–S4 + cambio BAJO/MEDIO/ALTO, prompts copy/paste.
- `docs/operacion/REGISTRO_BUGS.md`: bandeja `HAL-###` con el hallazgo **literal en palabras del
  colaborador** y bloque `ANÁLISIS IA` (cómo funciona, idea de arreglo, riesgo, archivos exactos,
  pruebas, DO NOT). Bugs confirmados `BUG-###` y 10 diferidos `D-###` ya cargados.
- `AGENTS.md` regla #1 + §12: el agente lee tablero y registro al iniciar, anota antes de actuar,
  cierra solo con evidencia y nunca toca Kanban.

**Regla crítica para la próxima sesión:** ante un `HAL-###`, copiar el texto del colaborador sin
corregirlo y agregar SOLO el análisis. No crear `BUG-###`, no tocar código, no hacer commit/push
sin que el dueño lo autorice explícitamente. Security/cross-tenant = S1 y aviso inmediato.
