# Bitácora — YAHPOS!

### 2026-11-20 (fix runtime `orders.filter is not a function`) — sin commit

| Archivo | Cambio |
|---|---|
| `src/app/admin/pedidos/page.tsx` | `fetchOrders()` ahora chequa `response.ok` y `Array.isArray(data)` antes de `setOrders`; fail-closed con `[]` + toast fijo. `console.error` sin body sensible. Causa: `/api/orders` responde `{ error }` en 401/403/500 (`route.ts:20,28,38`) y el cliente seteaba ese objeto como array. |

**Gates:** `npx tsc --noEmit` 0; `npm run build` verde; `npm run lint` 247 (5 errores / 242 warnings) = baseline. Sin SQL, sin DB, sin commit.

**Riesgos hermanos detectados por escaneo — autorizados por el dueño y YA corregidos en el mismo handoff:**
- `src/app/admin/configuracion/page.tsx:592-607`: `r.ok` antes de `json()`, `Array.isArray(data)` y `setTerminalsList([])` en `catch`. Evita el `TypeError` en `terminalsList.map` (`:992`) cuando `/api/terminals` responde `{ error }`.
- `src/components/pos/CustomerModal.tsx:63-85`: `res.ok` antes de `json()`; solo se acepta cliente si `data` es objeto no-array con `id: string`; `null` sigue siendo "no encontrado"; en error/catch se limpia estado y no se abre registro automático.

Escaneo completo del patrón en `src/app/**`: el resto ya tiene guards (`res.ok`, `Array.isArray`, `apiFetch`) o no alimenta arrays. Gates finales del conjunto: tsc 0; build global verde; lint 247 (5/242) = baseline; Jest 7 suites/76 tests.

### 2026-11-19/20 (preparación de 040 + scripts de verificación) — SIN EJECUCIÓN

Decisión del dueño: «Preparar 040 + tests». Preparados, **no ejecutados** contra ninguna DB:

| Archivo | Tipo | Contenido |
|---|---|---|
| `supabase/migrations/040_lints_hardening.sql` | create | 9 secciones con guards `DO $$` fail-closed: re-verifica `search_path` (039), REVOKE `PUBLIC, anon` en `is_platform_role()` y `protect_profile_insert()` re-granting `authenticated`/`service_role`, guardia de grants que se conservan, DROP condicional de `public_read_store_logos`, drop de `uq_*` solo por definición exacta (nunca `settings_pkey`), `search_path` de `audit_sensitive_changes()`, guardias informativas de `store_isolation_policy`, documentación de lints no automatizados y conteos finales. |
| `scripts/verify_040.mjs` | create | 10 checks READ-ONLY vía Management API (`read_only: true`): ACLs, `search_path`, policy de logos, `USING(true)`, `settings_pkey`, índices duplicados. Env: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`. Sin token/ref en logs. |
| `scripts/test_signup_store_metadata.mjs` | create | Prueba diagnóstica controlada del vector `038:124-131` + `001:131-134`. Env fail-closed: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STORE_ID`, `STORE_ID_AJENO`, `TEST_USER_PASSWORD` y `ALLOW_SIGNUP_PROBE=1`. Crea 2 usuarios desechables; limpieza en `finally` acotada por `id`/`user_id`; veredicto `LEAK`/`BLOCKED`. |

Detalle de revisión: `protect_profile_insert()` no tenía `REVOKE ... FROM public` en 038/039, así que revocar solo `anon` habría dejado el grant vía `PUBLIC`; 040 revoca ambos. `pg_policies.qual` es `text` en PG15/PG17 (verificado en docs), luego `ilike` es válido. `reserve_folios` (029:56) y `get_store_by_domain` conservan sus grants.

**Gates locales:** `npx tsc --noEmit` 0; `node --check` ambos scripts 0; `npm run build` global verde; Jest 7 suites/76 tests; `npm run lint` 247 problemas (5 errores / 242 warnings), idéntico al baseline aprobado. 0 entradas de `SUPABASE_ACCESS_TOKEN` en `.env.local`: el PAT nuevo debe agregarse solo tras rotación.

**Riesgo operativo antes de aplicar:** 040 no tiene `BEGIN/COMMIT` propio; si se ejecuta como un solo batch y un bloque `RAISE EXCEPTION`, el motor puede revertir el batch completo. Aplicar por secciones y reconsultar catálogo entre ellas. Sin SQL en vivo, sin PAT, sin commit.

### 2026-11-19 (triaje de lints Supabase snapshot 20:15Z) — solo plan, sin ejecución

El dueño pegó un snapshot nuevo (`observed_at 2026-11-19T20:15:39Z`). Los 4 CSV versionados en
`C:\Users\Blaz Baez\Desktop\TIKTOKS POR EDITAR\REPO` son de `02:52Z`. Diff contra ese baseline:

| Lint | 02:52Z | 20:15Z | Lectura |
|---|---|---|---|
| `function_search_path_mutable` | 12 | 0 | Los `ALTER FUNCTION … search_path` de 039 parecen aplicados |
| `anon_security_definer_function_executable` | 15 | 3 | Quedan `get_store_by_domain`, `is_platform_role`, `protect_profile_insert` |
| `auth_leaked_password_protection` | OFF | OFF | Sin cambio |
| `auth_rls_initplan` | 17 | 17 | Sin cambio |
| `multiple_permissive_policies` | 280 | 280 | Sin cambio |
| `duplicate_index` | 0 | 6 | Categoría nueva |

El snapshot sugiere ser posterior a 039, pero la bitácora registra 039 en `2026-11-20`: **no
asumir orden cronológico**. Releer `pg_proc.proacl`, `pg_policies` y `pg_indexes` en vivo antes de
cualquier DROP/REVOKE. Scope de esta tarea: `TASK_HANDOFF.md` + `BITACORA.md` + `AGENTS.md`. Sin SQL en
vivo, sin reutilizar el PAT, sin cambios de código, sin commit.

**Hallazgos priorizados (evidencia de repo; lo que no está en repo está marcado como vivo):**

| Prioridad | Ítem | Evidencia | Acción propuesta |
|---|---|---|---|
| **Alto — probar** | Signup directo a Supabase Auth con `raw_user_meta_data.store_id` ajeno | `038:124-131` acepta cualquier UUID existente en `stores`; `001:131-134` bloquea solo `UPDATE` de metadata; `/api/auth/register:81` sobrescribe el `store_id` correcto, pero un `signUp` directo salta esa route | Prueba controlada con usuarios desechables y limpieza; si confirma, migración que derive `store_id` del host/resolución servidor, no de metadata del cliente |
| **Alto — verificar en vivo** | Posibles policies históricas `USING(true)` en `settings` / `terminals` / `cash_sessions` | Solo referenciadas en `YAHPOS Kanban.md` (docs viejo); no están en `supabase/migrations/*.sql` | Volcar `pg_policies`; si existen, dropear **esas**, nunca `store_isolation_policy` |
| **Medio** | `payments_insert_own_store` / `payments_select_own_store` (live-only) | No versionadas; repo tiene `001:98`, `025:41-42` | Leer `qual`/`with_check` antes de tocar; son las que dan scope a INSERT/SELECT |
| **Medio** | `store-logos`: SELECT público sin scope de carpeta | `038:241-246`; `src/app/api/settings/upload-logo/route.ts:39,43-57` solo usa `upload` con AdminClient + `getPublicUrl`, sin `list()` | Dropear `public_read_store_logos` o acotarlo a `(storage.foldername(name))[1] = get_store_id()::text` |
| **Medio** | Password protection OFF | `TASK_HANDOFF.md` § «Revisión de lints Supabase + hardcodeos» | Activar en Dashboard → Authentication → Password Protection (sin SQL) |
| **Bajo / no-op** | Helpers SECURITY DEFINER ejecutables por `authenticated` | `get_store_id()` `025:10-18` y 21 policies; `get_merchant_id()` `026:39-47`; `reserve_folios` valida membresía en `029:21-23`; `is_platform_role()` en `038:11-22` solo se usa en policy `to authenticated` (`038:69-71`) | **No revocar a authenticated**, no convertir a INVOKER: colapsaría RLS/reserva offline. Solo revoke de `anon` a `is_platform_role()` y `protect_profile_insert()` (039 los omitió) |
| **Bajo** | `auth_rls_initplan` (17) | `auth.*()` sin `(select …)` en policies; varias live-only | Envolver en `(select auth.uid()/auth.jwt()/auth.role())`. Cambio de plan, no de semántica |
| **Bajo** | `duplicate_index` (6) | `uq_*` creados en `038:195-206` duplican constraints históricas; `001:20-21` renombró `business_id`→`store_id` sin renombrar constraint; `settings_pkey` es el único PK de la lista | Dropear los `uq_*` de 038 tras comparar definiciones; **nunca dropear `settings_pkey`**; ninguno es destino de FK |

**No tocar:** `store_isolation_policy` (es la única `FOR ALL` con `WITH_CHECK` implícito por
tienda, `025:20-81`); triggers de `026`/`038`; `reserve_folios` grant a `authenticated`;
`get_store_by_domain` grant a `anon` (proxy/register/branding/dashboard dependen de él, 5 callers).
Las policies `tenant_select_*` de `038:41-47` son más estrechas que la genérica: si se consolidara,
se dropea la estrecha, nunca la genérica.

Plan ordenado y gates: ver `TASK_HANDOFF.md` § «Triaje de lints 20:15Z». Decisión del dueño:
**solo triaje + plan**; sin ejecución, sin commit.

### 2026-11-20 (migración 039 aplicada en vivo) — sin commit

Ejecutada `supabase/migrations/039_function_privileges_hardening.sql` en `supermercado-sf`
(`bddpzqayurvhgpllykku`) vía Management API (`POST /v1/projects/{ref}/database/query`), con
`read_only=false` (rol DB `postgres`). Sin push ni commit.

| Verificación | Evidencia real |
|---|---|
| ACLs post-039 | `increment_product_stock`, `get_next_folio`, `delete_store`: solo `postgres` + `service_role`. `reserve_folios`: `postgres` + `authenticated` + `service_role`. Helpers: sin `anon`. `get_store_by_domain`: `anon` conservado. `=X` de PUBLIC eliminado. |
| `search_path` | 10 funciones alteradas; todas las de 039 ahora `search_path=public, pg_temp`. |
| Storage | Política `Public Access` (`site-assets`, pública) eliminada; queda `public_read_store_logos`. Bucket `site-assets` sigue `public=true` → URLs directas intactas. |
| Auditoría | Creadas `deny_anon_security_audit_log` y `deny_authenticated_security_audit_log` (antes 0 policies). |
| Prueba negativa real (REST con anon key) | 4 RPC → `42501 permission denied`: `increment_product_stock`, `get_next_folio`, `delete_store`, `reserve_folios`. `get_store_by_domain` → HTTP 200 `[]`. |
| Otras migraciones | 021/022/037 ya aplicadas: columnas `identity_verified`/`is_full_account`, `pos_drafts.session_id uuid`, índice `orders_store_offline_id_unique`. No se re-ejecutó el `DELETE` de 022. |

**Residuales DB:** `sii_documents_check_folio_duplicate()` conserva `=X` de PUBLIC (039 solo le fijó
`search_path`; es helper de trigger, no RPC de negocio). `audit_sensitive_changes()` quedó con
`search_path=public` (no figuraba en la lista de alters de 039). Policies duplicadas
`store_isolation` vs `store_isolation_policy`: ambas resuelven `store_id` desde `profiles` por
`auth.uid()` (`get_current_store_id()` con `LIMIT 1`, `get_store_id()` sin él) → mismos permisos;
no se dropearon sin diagnóstico adicional.

**Acción inmediata del dueño:** revocar el PAT `sbp_…ff0c` ya que fue pegado en el chat de la
sesión; rotar además service keys y contraseña del PFX. Usar el token para aplicar 039 no sustituye
la revocación.

### 2026-11-20 (limpieza de lint ESLint) — sin commit

| Archivo | Tipo | Descripción |
|---|---|---|
| 84 archivos de `src/**` + `eslint.config.mjs` | modify | 236 de 241 errores corregidos: 173 `no-explicit-any` → tipos reales; 29 `set-state-in-effect` (fix real cuando era simple, supresión acotada en hidratación/fetch); 15 `purity` (`Math.random` → constante de módulo o lazy initializer); 8 `prefer-const`; 6 `no-unescaped-entities`; 6 `immutability`; 2 `refs`. `scratch/**` agregado a `globalIgnores`. |
| `src/app/admin/clientes/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/pedidos/page.tsx`, `src/app/admin/reportes/page.tsx`, `src/app/admin/facturacion/components/DocumentTabs.tsx`, `src/app/developer/actions.ts` | modify | 7 errores TS aparecidos tras el tipado corregido: RUT opcional, `IndExe` literal, formatter de Recharts con `value` opcional, `service_fee` opcional y `StoreSettings` con bag indexado. Cero cambios de comportamiento. |

**Evidencia:** `npx tsc --noEmit` 0; Jest 7 suites/76 tests; `npm run build` global verde; HTTP root 200; SW 10 cachés de assets y 0 handlers `/api/`; lint **247 problemas (5 errores / 242 warnings)**, desde 509 (241/268). Quedan 5 errores en archivos excluidos por decisión: `login/page.tsx` (1, lista NO tocar), `SaaSProvider.tsx` (3, zona roja), `PlatformLanding.tsx` (1, lista NO tocar).

**Decisión del dueño (2026-11-20):** dejar los 5 errores como residual documentado; no tocar esos 3 archivos; **no ejecutar commit todavía** (hay 298 cambios en el árbol, ~20 borrados de docs de sesiones previas). Sin push.

### 2026-11-19/20 (revisión de lints + build global + hardcodeos)

| Archivo | Tipo | Descripción |
|---|---|---|
| `tsconfig.json` | modify | `scripts/**` excluido del type-check → `npx tsc --noEmit` global 0 errores y `npm run build` global verde (antes compilaba solo con exclusión temporal) |
| `scripts/setup_test_user.mjs`, `test-supabase.mjs`, `scratch/*.mjs`, `scratch/get_user.ts` | modify | Service key literal reemplazada por `SUPABASE_SERVICE_ROLE_KEY`; fail-closed si falta env; `select('*')` → columnas explícitas |
| `scripts/{generate-simulation-report,seed-test-sii,sii-certification-test,set-boletas,validacion-emision-real}.ts` | modify | UUID de tienda fijo → `STORE_ID` desde env con guard |
| `src/providers/EditorProvider.tsx`, `src/app/api/v1/bot/inventory/pending/route.ts` | modify | Scope `store_id` agregado a dos queries que faltaban |
| `src/app/api/blumi/prueba-motor/route.ts`, `src/lib/blumi/client.ts`, `.env.example` | modify | Sin emisor de otro tenant como fallback; `BLUMI_SANDBOX_URL` obligatoria en producción |
| `src/app/developer/actions/stores.ts` | modify | `admin_finances` insert con `createAdminClient()` y error chequeado |
| `supabase/migrations/039_function_privileges_hardening.sql` (nuevo) | create | REVOKE de EXECUTE público en `increment_product_stock`/`get_next_folio`/`delete_store`/`reserve_folios`, search_path fijo, storage listing y deny de auditoría. **Aplicada en vivo el 2026-11-20** (ver sección de arriba) |

**Evidencia:** `npx tsc --noEmit` 0; `npm run build` global 0; Jest 7 suites/76;
`npm run lint` 509 problemas (241 errores / 268 warnings) ⚠️; HTTP root 200; SW 10 cachés de assets,
0 handlers `/api/`; 0 llaves literales en repo; 0 UUID de tenant en `src/`.

**Hallazgo CRÍTICO resuelto:** `anon` ejecutaba `increment_product_stock` y `get_next_folio`.
039 aplicada y verificada con `42501` en los 4 RPCs (evidencia en sección superior).
Lint CSV tiene 383 filas; la mayoría es deuda/no-op actual (anon ve 0 filas en las 16 tablas con
policies duplicadas). `qual` de `store_isolation` vs `store_isolation_policy` comparado: ambas
resuelven el mismo `store_id` desde `profiles`; no se dropearon.

**Handoff:** `DEVELOPER_EMAILS` (zona roja), dominio raíz fijo, contacto de tenant en `/contacto`,
allowlist de imágenes, precios UF y backup de `dev-auth` siguen hardcodeados y requieren decisión.
Sin commits ni pushes.

### 2026-11-20 (hardening multi-tenant) — regla del dueño: todo por `store_id`

Auditoría de 6 frentes + dependencias. Fugas reales confirmadas y cerradas. Migration `038` aplicada
en vivo. Sin commits ni pushes.

| Archivo | Tipo | Descripción |
|---|---|---|
| `supabase/migrations/038_multi_tenant_hardening.sql` (nuevo) | create | Baja 8 policies `USING(true)`/`auth.uid()=id` sin scope; crea `tenant_select_*` con `store_id=get_store_id()`; `get_store_by_domain` redactado (antes filtraba `stores.config` con `supervisorPin` y config SII a anon); `handle_new_user` sin emails hardcodeados; trigger `protect_profile_insert` anti-escalada; 6 UNIQUEs; Storage por carpeta `store_id`; backfill de 16 categorías huérfanas a `45be9c55…` |
| `src/proxy.ts` | modify | Resolución de tienda por RPC en TODOS los hosts (antes leía `stores` directo en subdominios locales). Plan de zona roja en `TASK_HANDOFF.md` |
| `src/app/api/customers/route.ts` | modify | Búsqueda por RUT con `store_id` de sesión; whitelist en UPDATE con AdminClient; sin logs de RUT/email |
| `src/app/developer/actions.ts` | modify | `explicitStoreId` solo tras `verifyDeveloperRole()`; no-developer resuelve store desde sesión |
| `src/app/api/dashboard/{route,series/route}.ts` | modify | Fail-closed si perfil sin tienda; Host/RPC solo para roles plataforma |
| `src/app/api/orders/{route,[id]/route}.ts` | modify | Puntos por RUT con scope; `withAuth()` antes de `parseBody`; store obligatorio en `[id]` |
| `src/app/api/{admin/,}cash-sessions/**` | modify | `withAuth()` como fuente canónica; store filter obligatorio; `current_area` con scope |
| `src/app/api/products/route.ts` | modify | AdminClient + `.eq('store_id')` desde Host; sin catálogo demo en tienda real (404) |
| `src/app/api/settings/route.ts`, `src/app/admin/configuracion/page.tsx` | modify | GET solo booleanos `...Configured`; PATCH cifra 7 secretos; 3 password inputs dentro de `<form>`; badge "Configurado" |
| `src/lib/payments/transbank.ts`, `src/app/api/payments/webpay/**` | modify | Factoría `getTransbankClient(storeId)` leyendo `settings` cifrado; sin `TRANSBANK_*` de entorno; fail-closed en prod |
| `src/lib/blumi/client.ts`, `src/app/api/blumi/**` | modify | Factoría por store leyendo `payment_blumi_api_key` cifrado; sin `BLUMI_API_KEY` de entorno |
| `src/lib/tenant-state.ts` (nuevo), `src/stores/{pos,sii,cart,auth}Store.ts` | create/modify | Prefijo `yahpos-tenant:<storeId>:`, merge con `__storeId`, `resetForStore()`, cola/pool SII por `${storeId}:${tipo}` |
| `src/components/auth/SessionSync.tsx`, `src/lib/hooks/useCustomerDisplaySync.ts`, `src/providers/SaaSProvider.tsx` | modify | Store activo desde Host; canal BroadcastChannel por store; sin email/PII en logs |
| `public/sw.js`, `src/lib/api.ts`, Realtime POS/cajas | modify | Sin caché de `/api/*`; logs sin query/RUT; canales con `filter store_id` |
| `next.config.ts`, `sw.js`, `OfflineSyncManager`, `PosHeader`, `shop/RealTimeStockBadge`, `RemoteClosureListener` | modify | D2: `runtimeCaching` explícito (10 cachés de assets, sin `/api/` ni HTML/RSC); pool de folios por store; UI sin prefijo `uuid:`; Realtime con `filter store_id` |
| `scripts/{migrate-tenant-secrets-to-store,rotate-sii-encryption-key}.mjs` (nuevos) | create | Migración y rotación GCM/CBC → GCM; solo conteos, nunca valores |
| `.env.local`, `.env.example`, `.gitignore` | modify | Clave nueva `SII_ENCRYPTION_KEY` (no impresa); secretos de tienda sacados del entorno; `.env.example` versionado |
| `docs/archivo/session-ses_2182.md`, `test-supabase.mjs`, `scripts/setup_test_user.mjs` | modify | JWTs y contraseña del PFX redactados |
| `TASK_HANDOFF.md`, `docs/seguridad/CHECKLIST_SEGURIDAD.md` | modify | Evidencia real, plan de zona roja y residuales |

**Evidencia:** Jest 7 suites/76 tests; tsc 0 errores en `src/` (42 preexistentes en `scripts/**`);
HTTP root 200; catálogo `master.` 200 / host sin tienda 404; CSP nonce same-request 6/6;
RLS+FORCE 36/36; 0 tablas RLS sin FORCE; 0 policies permisivas sobre datos de tienda; anon lee 0
`stores`; RPC solo 3 keys de branding; aislamiento A/B 1742/16/37 vs 22/2; escalada INSERT bloqueada;
rotación 8/8 GCM descifrables con clave nueva; 3/3 secretos migrados; sin commits ni pushes.

**Handoff:** 17 perfiles `customer` sin tienda y catálogos globales requieren decisión; CAF 39
agotado y `rut_emisor` vacío bloquean E2E real; contraseña del PFX en logs históricos → rotar;
token Supabase `sbp_…ff0c` → revocar.

### 2026-11-19 (fix carga de PFX real) — 400 "Error validando certificado"

**Diagnóstico:** los PFX reales (`~/Downloads/21012281-8_2026-11-16.pfx` y
`~/Desktop/certificado_firmaya.pfx`) son PKCS#12 válidos: el parser de node-forge llega a
`PKCS#12 MAC could not be verified. Invalid password?`. MAC con SHA-1 (soportado). La causa es
contraseña vacía/incorrecta, no cifrado no soportado.

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/app/admin/configuracion/page.tsx` | modify | El upload disparaba en `onChange` del file input y leía `siiConfig.password` en ese instante; el campo de clave está debajo, así que el flujo natural (elegir archivo → escribir clave) enviaba clave vacía. Ahora el archivo queda en estado local y botón explícito **"Validar y guardar certificado"** envía con la clave vigente. Toast muestra `error: details` del servidor |

**Evidencia:** tsc 0 errores en `src/`; eslint en el archivo 0 errores (1 warning `<img>` preexistente); servidor 200. Scripts de diagnóstico FUERA del repo (`%TEMP%\opencode\inspect-pfx.js`, `test-pfx-parse.js`). Sin commit.

### 2026-11-19 (set SII en facturación + voucher POS) — 6 ST, zona roja autorizada

**Contexto:** el dueño pidió que sus clientes emitan desde `/admin/facturacion` solo los documentos
que su certificado/CAF permiten, que el set de pruebas viva ahí mismo, y que el POS pueda imprimir
un voucher explícitamente ajeno al SII sin duplicar venta ni IVA. Tres exploradores en paralelo
confirmaron que la ruta no podía emitir (`main_store` vs UUID), que no había set ni entrega XML/PDF,
y que el POS podía caer en doble boleta. Autorizó tocar `engine.ts` con bitácora de cambios.

| Archivo | Tipo | Descripción |
|---|---|---|
| `admin/facturacion/actions.ts`, `page.tsx` | modify | `store_id`/rol desde sesión; `tipo` validado; historial con scope; nota de crédito corregida |
| `admin/facturacion/components/DocumentTabs.tsx`, `api/sii/caf/route.ts` | modify | Gate por CAF vigente (fecha Chile) antes que por plan; `GET` devuelve `tipos_disponibles`; roles GET=operación, POST=gestión; link al set |
| `admin/sii/ManualEmissionTabs.tsx`, `InvoiceHistoryTable.tsx` | modify | `'main_store'` → `''`; orden de `generateCreditNote` corregido |
| `admin/facturacion/pruebas/**`, `lib/sii/test-cases.ts` (nuevos) | create | Set con 4 casos 39 + 5 tipos bloqueados por CAF; cuota UI de 1 folio; envío real; veredicto SII real por `GET /api/sii/estado/[id]` |
| `api/sii/{enviar,documentos/[id]/xml,documentos/[id]/pdf,estado/[id]}/route.ts` | modify/create | `superadmin` en roles; ruta nueva de estado real sin secretos |
| `lib/pos/sii-decision.ts`, `__tests__/unit/sii-decision.test.ts` (nuevos) | create | Decisión pura `dte/voucher/blocked`, 25 tests de matriz |
| `(pos)/pos/page.tsx`, `PaymentModal.tsx`, `PosSettingsModal.tsx`, `posStore.ts` | modify | Bloqueo antes de cobrar; SumUp→SumUp Solo; terminal no se hereda; `siiEmission`; `documentKind` en POST/broadcast |
| `PosReceiptModal.tsx`, `hardware/{types,printer}.ts`, `customer-display/**` | modify | Voucher no-SII en HTML/térmica/display; sin falso folio; `disclaimerLines` ESC/POS |
| `validations/orders.ts`, `api/orders`, `api/sii/sync`, `OfflineSyncManager.tsx` | modify | `documentKind`/`siiSkipReason` persistidos; `sii_status='no_aplica'`; 409 para voucher en sync |
| `migrations/037_orders_offline_id_unique.sql` (nuevo) | create | Índice único parcial de `offline_id`; **aplicado en vivo**, 0 duplicados previos |
| `lib/sii/{auth,engine,caf,pdf-generator,pdf-datos}.ts`, `__tests__/unit/sii_failclosed.test.ts` | modify/create | Fail-closed PFX/token MOCK, CAF `RE`, PDF con detalle. bitácora línea por línea en `TASK_HANDOFF.md` |

**Evidencia:** Jest 6 suites/46 tests; tsc 0 errores en `src/` (42 preexistentes en `scripts/**`);
`npm run build` compila con `scripts/**` excluido temporalmente y tsconfig restaurado; eslint global
509 problemas (247 errores, todos preexistentes); HTTP con Host `master.localhost` → 307 en páginas,
401 en APIs, 405 en `/api/sii/enviar` por GET; CSP 7/7 scripts con nonce del mismo request; golden
autofirmado `deterministic=true`, `signature_valid=true`, SHA `6a4182ed…f67e89` en dos procesos.
**No se ejecutó ningún caso real**: consume un folio del CAF 39 del dueño. Sin commits ni pushes.

### 2026-11-19 (auditoría final v1.5) — 4 bloques, 20 controles, tabla corregida

**Contexto:** el usuario pidió verificar una última vez y arreglar lo real, dejando el resto como handoff.
Cuatro auditores independientes revisaron los 20 controles contra código (no contra docs) y yo corrí
gates, DB en vivo y matriz HTTP/CSP. v1.4 decía 20 ✅ pero había afirmaciones falsas y regresiones.
Resultado real: **15 ✅ / 5 ⚠️ / 0 ❌ abiertos**. Sin commits ni pushes.

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/lib/validations/api.ts`, `api/customers/route.ts` | modify | `customerDeleteSchema` + `parseQuery` en DELETE |
| `api/auth/session-sync/route.ts` | modify | `safeRedirectTo` escapa `<`/`>`/`&` y se usa en `window.location.replace` |
| `api/auth/sso/route.ts` | modify | `secure` derivado del origin (antes `false` hardcodeado en prod) |
| `api/auth/register/route.ts` | modify | lookup/delete de perfil con scope `store_id` (cross-tenant) |
| `api/sii/caf/route.ts` | modify | rol antes de parsear el body |
| `api/sii/documentos/[id]/xml`, `.../pdf` | modify | perfil/rol antes de leer `xml_content` |
| `src/lib/security.ts` | modify | `getSecuritySalt()` único para encrypt/decrypt (salt roto) |
| `.env.example` | modify | `SII_ENCRYPTION_KEY` agregada |
| `src/lib/validations/{orders,staff}.ts`, `pos/page.tsx` | modify | `.strict()`; campo muerto `folio` removido del POST POS |
| `api/wizard/caf/route.ts` | modify | RUT del CAF fail-closed |
| 19 selectores (providers/stores/pages/lib/APIs/catalog) | modify | `select('*')`/wildcards → columnas explícitas + `.limit()` |
| `admin/sucursales`, `facturacion/actions`, `cash-sessions/[id]/sales`, `documentos/[id]/pdf` | modify | 4 errores TS resultantes corregidos (columnas y casts de relaciones) |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md` | modify | v1.5: tabla honesta + §2.5 + secciones corregidas |
| `TASK_HANDOFF.md`, `AGENTS.md`, `BITACORA.md` | modify | handoff de residuales y decisiones |

**Evidencia (gates reales):**

| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit` filtrando `^src/` | 0 errores ✅ |
| `npx jest --runInBand` | 3 suites / 10 tests ✅ |
| `npm run build` | compila (~14s); type-check de `scripts/**` preexistente ⚠️ |
| `npx eslint src` | 516 problemas preexistentes ⚠️ |
| `npm audit --omit=dev` | 5 totales: 0 critical / 1 high / 4 moderate ✅ |
| Matriz HTTP dev | 20/20 protegidas → 401; catálogo 200; registro inválido 400 ✅ |
| CSP dev | 4/4 checks; nonces rotan; 7/7 script nonceados; `SAME_REQUEST_MATCH=True` ✅ |
| DB en vivo | 36/36 RLS+FORCE; `caf_plaintext=0`; `dup_staff=0`; `staff_index=1`; `deny_policies=6` ✅ |
| Grep `select('*')` / `secure: false` en `src` | 0 / 0 ✅ |

**Residuales (handoff en `TASK_HANDOFF.md`):** service key en zonas rojas, `httpOnly:false` por diseño SSR,
sin redirect HTTPS en repo, buckets Storage sin versionar, `serialize-javascript` high (vetado downgrade),
DEK/KMS, paginación cursor, antivirus, trigger INSERT, IP spoofable, errores crudos v1, `maxAge` implícito,
1 perfil huérfano, certificado ya comprado (falta cargarlo), revocación del token.

**Pendiente del dueño:** revocar token Supabase; subir el certificado **ya comprado** y verificar su
cifrado; verificar SSO y login cross-subdominio tras el cambio de `secure`. Sin commit.

**Observación del dueño (alcance de pruebas):** señaló que el motor se probó con un PFX autofirmado
creado por el agente, fuera del flujo real (`master.localhost:3000/admin/facturacion` y POS). Anotado
en `TASK_HANDOFF.md`: el golden DTE es regresión criptográfica, **no** certificación SII ni prueba
funcional. Falta validación E2E con cuenta y certificado reales: configurar → cargar CAF → emitir
desde facturación → emitir desde POS → visor XML/PDF → cola offline. Estado sin sesión hoy:
`/admin/facturacion` → 307, `/api/sii/config` → 401 (esperado, no evaluable sin login).

**Estado SII real (dueño, 2026-11-19):** certificado **ya comprado** (falta subirlo a la app);
CAF solo para **boleta 39**; **facturas y demás documentos en trámite**, esperando la **verificación
del SII** — se pedirán la próxima semana o cuando lo verifiquen. Sin CAF para esos tipos no se puede
emitirlos todavía. E2E real pendiente de login + certificado cargado + CAF del resto de tipos.

---

### 2026-11-19 (cierre real v1.4) — 9/9 hallazgos resueltos + bug de CSP detectado

**Contexto:** el usuario pidió cerrar los 20 controles con evidencia real, no solo documentación,
cuidando la seguridad. Se implementaron los fixes de los 9 hallazgos de la revalidación (R1-R9),
se corrió el plan de pruebas de zonas rojas registrado en `TASK_HANDOFF.md`, y se actualizó la
checklist a **v1.4: 20 ✅ / 0 ❌** (con 4 residuales técnicos documentados). Sin commits ni pushes.

| Archivo | Tipo | Descripción |
|---|---|---|
| `src/lib/sii/caf-store.ts` | create | `encodeCaf`/`decodeCaf` AES-256-GCM; `decodeCaf` fail-closed |
| `src/lib/sii/engine.ts`, `emisor-config.ts` | modify | Usan `decodeCaf`; selects explícitos (sin `*`); fallback a columnas inexistentes eliminado |
| `src/app/api/sii/caf/route.ts`, `folios/offline`, `sii/auth/token` | modify | Cifrado al guardar; GET sin `caf_xml`; roles de gestión; sin secretos en respuesta/IndexedDB |
| `src/stores/siiStore.ts`, `OfflineSyncManager.tsx` | modify | Store migrado a `version:2` con `migrate` que borra CAF/token viejos |
| `src/app/api/staff/route.ts` | modify | Lookup/insert/update por `store_id + rut` (R3) |
| `supabase/migrations/036_final_security_fixes.sql` | create | `environment` auditado, índice `profiles_staff_store_rut_key`, 6 deny policies |
| `src/middleware.ts` → `src/proxy.ts` | rename | CSP con nonce real por request en request + response + todos los early returns |
| `next.config.ts` | modify | CSP estática removida (se intersecaba con la del proxy); HSTS conservado |
| `src/app/api/auth/session-sync/route.ts` | modify | `<script nonce=...>` |
| `src/components/pos/MovementReceiptModal.tsx` | modify | Impresión sin script inline; imports sin uso limpiados |
| `src/app/api/wizard/caf/solicitar`, `CafStep.tsx`, `wizard/prueba`, `PruebaStep.tsx`, `documentos/[id]/xml` | modify | Sin XML en JSON; visor a roles de gestión (R4) |
| `src/app/api/**`, `developer/actions/stores.ts` | modify | Todos los `select('*')`/`.select()` → columnas explícitas + `.limit()` (R7) |
| `src/app/api/orders/route.ts` | modify | Auth antes del body en PATCH (R5) |
| `src/lib/validations/__tests__/orders.test.ts`, `src/__tests__/unit/validations.test.ts` | modify | Fixtures `productId`/`unitPrice`; aserciones intactas |
| `TASK_HANDOFF.md`, `docs/seguridad/CHECKLIST_SEGURIDAD.md`, `AGENTS.md` | modify | Plan de pruebas de zonas rojas; checklist v1.4; bitácora |

**Bug real detectado y corregido:** la CSP se armaba con `.join(' ')`; el browser interpretaba
`style-src … 'unsafe-inline'` dentro de `script-src`, anulando el nonce. Con `.join('; ')` el
header quedó separado correctamente y `no_script_inline=True` pasó. Sin este fix R6 habría quedado
abierto pese a tener nonce.

**Evidencia (gates reales):**

| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit` filtrando `^src/` | 0 errores ✅ |
| `npx jest --runInBand` | 3 suites / 10 tests pasados ✅ |
| Golden DTE + roundtrip CAF | `deterministic=true`, `signature_valid=true`, `sha256=782b84fc…0912`; `byte_identical=true`, `unknown_format_rejected=true` ✅ |
| CAF backfill + DB en vivo | `encrypted=5 skipped=1`; 6 CAF / 5 GCM / 1 CBC / **0 plaintext** ✅ |
| CSP dev (headers + body, mismo request) | `ALL_OK=True`, `nonce_changes=True`, 4/4 checks, 7/7 scripts nonceados ✅ |
| Matriz HTTP dev | **20/20 rutas protegidas → 401**; catálogo → 200; registro inválido → 400 ✅ |
| DB en vivo | 36/36 RLS+FORCE; `dup_staff=0`; `staff_index=1`; `deny_policies=6`; `audit_rows=0`; `sii_env=certification` ✅ |
| `npm audit --omit=dev` | 5 totales: 0 critical / 1 high / 4 moderate ✅ |
| `npm run build` | compila en 9.5s; falla type-check de `scripts/**` preexistente ⚠️ |
| `npx eslint src` | 519 problemas preexistentes de estilo ⚠️ |

**Residuales documentados:** DEK/KMS por tienda, paginación cursor, escaneo antivirus de uploads,
1 perfil `owner` con `store_id` huérfano (`92674aea-…`), `serialize-javascript` high vía
`next-pwa` (fix exige downgrade major, vetado), build type-check de `scripts/**` y lint global.

**Pendiente del dueño:** revocar el token Supabase `sbp_…ff0c` (usado solo en variables temporales de shell)
al terminar; verificar `certificado_password_encrypted` con el PFX real antes de producción (el
ciphertext CBC original se reemplazó por un GCM funcional durante la prueba de redacción).
XML de CAF se firma y se descarta por decisión R4; si se requiere descarga real hace falta un GET
controlado que vuelve a exponer el XML firmado — decisión pendiente del dueño.

---

### 2026-11-19 (revalidación final) — Revisión independiente: 9 hallazgos nuevos

**Contexto:** el usuario pidió validar "una última vez y bien a fondo". Revisión estática
independiente (solo lectura) + repetición de todos los gates ejecutables + matriz HTTP real +
verificación en vivo de Supabase. Resultado: **12 ✅ / 6 ⚠️ / 2 ❌**. El resumen v1.2
(12 ✅ / 8 ⚠️ / 0 ❌) quedó superado. No se implementaron fixes nuevos: solo documentación.

| Archivo | Tipo | Descripción |
|---|---|---|
| `docs/seguridad/CHECKLIST_SEGURIDAD.md` | modify | v1.3: 9 hallazgos nuevos (§2.1), matriz HTTP/DB/crypto/DTE (§2.2), ítems 5 y 7 a ❌, matices en 6/13/17/18 |
| `BITACORA.md`, `AGENTS.md` | modify | Registro de la revalidación |
| DB `public.sii_config` | modify (temporal) | Prueba real de redacción del trigger 035; valor restaurado con GCM desde `SII_CERT_PASSWORD`; log de auditoría limpio |

**Hallazgos confirmados (prioridad):** R1 CAF con `RSASK` en texto plano y leíble por `cashier`
(crítica); R3 upsert de staff por RUT sin scope de tienda (alta); R2 CAF/token en IndexedDB
(alta); R8 trigger audita `ambiente` en vez de `environment` (media); R6 CSP con
`unsafe-inline` (media); R4 XML en respuestas, R5 `orders` PATCH 400 antes que 401, R7
`select('*')` residual, R9 toggle de certificación escribe otra columna (bajas).

**Gates repetidos:** `tsc` 0 errores en `src/`; build compila (falla type-check de `scripts/*.ts`,
preexistente); eslint 66 problems preexistentes; Jest 2 suites viejas fallan; audit 5 (0 critical).
Crypto GCM/CBC/tamper/key OK; DTE determinista y firma válida; 36/36 tablas RLS+FORCE;
redacción `[REDACTED]` verificada. HTTP: 20 rutas protegidas → `401`, catálogo → `200`,
registro inválido → `400`, raíz/subdominio → `307`. Servidor dev apagado.

**Nota de integridad:** el ciphertext CBC original de `certificado_password_encrypted` fue
reemplazado por un valor GCM funcional durante la prueba de redacción. Verificar con el PFX real
antes de operar en producción. Sin commit. Token Supabase debe cerrarlo el usuario.

---

### 2026-11-19 (tanda final) — Cierre de los 20 controles + dependencias DTE

**Contexto:** cierre de la auditoría. Quedaban las rutas DTE/SII, ítems 5/13/15-20 y las
dependencias diferidas por riesgo de romper el motor DTE. Resultado final: **20/20 revisados,
0 fallas abiertas, 12 ✅ / 8 ⚠️ con residuales documentados**.

**Cambios:**
| Archivo | Tipo | Descripción |
|---|---|---|
| `src/app/api/sii/**` (10), `src/app/api/wizard/**` (6), `src/app/api/blumi/**` (2) | modify | Zod + roles de `profiles.role` (nunca `user_metadata`) + auth antes del body. Sin XML crudo en respuestas; `config` POST ya no devuelve certificados |
| `src/lib/validations/sii.ts` | modify | Esquemas DTE/SII/wizard/Blumi: CAF con rangos válidos, `environment` restringido, extras de la cola offline permitidos |
| `src/lib/crypto.ts` | modify | AES-256-GCM (`02:`) con fallback de decrypt CBC; tamper detectado |
| `src/app/api/wizard/caf/solicitar/route.ts` | modify | Columnas correctas `certificado_*`, `escapeXml` en RUT/fecha/tipos/folios |
| `src/app/api/wizard/certificado/route.ts`, `api/settings/upload-logo/route.ts`, `admin/branding` | modify | Magic bytes (PFX DER `0x30`; PNG/WebP), SVG rechazado |
| `next.config.ts` | modify | CSP sin `unsafe-eval` en prod + HSTS (`max-age=63072000; includeSubDomains; preload`) |
| `src/components/pos/MovementReceiptModal.tsx` | modify | `innerHTML` → `cloneNode(true)` |
| `dashboard/route.ts`, `staff/route.ts` | modify | `.select('*')` → columnas explícitas + `.limit` |
| `supabase/migrations/035_audit_triggers.sql` | create | `security_audit_log` + 3 triggers con redacción `[REDACTED]` (aplicada y verificada en vivo) |
| `customers`, `orders`, `ai/generate-description`, `products` POST | modify | Últimas 4 rutas con `req.json()` directo → `parseBody`; `products` auth antes del body |
| `package.json` / `package-lock.json` | modify | 4 waves: `zod@4.6.7`, `node-forge@1.4.3`, `fast-xml-parser@5.12.1`, `xml-crypto@6.4.0`, `next@16.4.6`, `eslint-config-next@16.4.6` + `npm audit fix` |
| `Documentos_SII/README_INSTRUCCIONES.txt` | modify | Nombres reales de archivos y datos del comodato ya completos; pendientes del usuario |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md` | modify | v1.2 de cierre: 12 ✅ / 8 ⚠️ / 0 ❌ + evidencia final |

**Pruebas reales:** golden DTE byte-idéntico en las 4 waves (`signed_sha_equal`, `digest_equal`,
`signature_equal` todos `true`); `npm audit --omit=dev` 24 → 5 (0 critical, 1 high); 10 rutas
DTE/SII sin sesión → `401`; 4 rutas migradas → `401`; `/admin`, `/pos`, `/developer` en raíz →
`307 /` (bloqueo por diseño); `tsc` 0 errores en `src/`; `eslint` 0 errores nuevos; Jest DTE 1/1.
`npm run build` compila pero falla type-check de `scripts/*.ts` (preexistente).
`validations.test.ts` sigue fallando por nombres de campos viejos en el test (preexistente).

**Residuales documentados:** 1 high (`serialize-javascript` vía `next-pwa`; el fix exige downgrade
semver-major) + 4 moderate; DEK/KMS; paginación real; CSP `unsafe-inline`; 3 tablas sin policies;
1 perfil con `store_id` huérfano. Sin commit. Token Supabase debe cerrarlo el usuario.

---

### 2026-11-19 (tanda 2) — Seguridad: ítems 1/8/9/11/12 + validación global (no-DTE)

**Contexto:** continuación de la auditoría de 20 controles. Cerrados los ítems que no tocan
el motor DTE. Ítems 5 y 20 se dejan a propósito para la tanda final junto con SII/wizard/blumi.

**Cambios:**
| Archivo | Tipo | Descripción |
|---|---|---|
| `src/lib/dev-auth.ts` | create | `createDevToken()` / `verifyDevToken()`: HMAC-SHA256 `v1.<ts>.<hmac>`, expiración 2h, skew 60s, compare en tiempo constante. Fail-closed sin secreto en prod |
| `src/lib/ratelimit.ts` | modify | Upstash con fallback en memoria (dev) y **fail-closed** en producción; expone `unavailable` |
| `src/middleware.ts` | modify | Sin log de cookies; IP desde `x-forwarded-for`; `critical`/`operational`/`public` aplicados; `503` si limitador no disponible |
| `src/app/developer/actions/auth.ts`, `page.tsx` | modify | Emite/verifica token firmado en vez de `patagonia_dev_active` |
| `src/lib/constants/roles.ts` | modify | `ASSIGNABLE_STAFF_ROLES` / `STAFF_MANAGEMENT_ROLES` |
| `src/lib/validations/http.ts`, `api.ts`, `staff.ts` | create | `parseBody`/`parseQuery`/`parseFormData` + esquemas centralizados |
| ~30 API routes | modify | Zod en register, staff, cash, customers, pos/draft, subscriptions, pagos, products, dashboard, terminals, settings, verify-dns, bot, adjustments; orders PATCH y products PATCH restringidos |
| `.env.example` | modify | `DEV_TOKEN_SECRET` + variables Upstash |

**Hallazgos corregidos durante la tanda:** `ProductModal` envía `lowStockThreshold`/`discount`/
`isActive`/`isFeatured`; `DailyClosureModal` envía `opening_amount`; el panel envía `tier_id`
(mientras la ruta esperaba `tierId`). Los tres se aceptaron en los esquemas para no romper los
flujos reales. Se quitó un `console.log` que imprimía el body completo de `/api/orders`.

**Pruebas reales:** `verifyDevToken()` válido `true`, estático/tampered/expirado/futuro `false`;
7 POST a `/api/auth/register` con misma IP → `400×5 → 429×2`; sin Redis en producción →
`{success:false, unavailable:true}`; payloads inválidos → `400`; `/api/staff` sin sesión → `401`;
`/developer` sin sesión con/sin token → `307 /login`. Payloads reales de los callsites pasan
`safeParse`.

**Evidence gates:** `npx tsc --noEmit` → 0 errores en `src/`; `npx eslint` sobre archivos tocados
→ 0 nuevos (42 errores/13 warnings preexistentes); `npm run build` → compila en 13.9s, falla
type-check de `scripts/generar-dd-correcto.ts` (preexistente, fuera de scope).

**Estado:** 11 ✅ / 8 ⚠️ / 1 ❌ (ítem 20). Checklist actualizado a v1.1.

---

### 2026-11-19 — Seguridad: 3 críticos cerrados + checklist de 20 controles

**Contexto:** auditoría de los 20 controles de seguridad con verificación en vivo de Supabase
(solo lectura). Resultado inicial: 3 ✅ / 13 ⚠️ / 4 ❌.

**Cambios:**
| Archivo | Tipo | Descripción |
|---|---|---|
| `src/middleware.ts` | modify | Eliminado bypass de auth `?audit=true` (`isAudit`) |
| `src/app/api/dashboard/route.ts` | modify | `store_id` desde perfil; fallback a dominio resuelto en servidor para cuentas globales. No lee `x-store-id` del request |
| `src/app/api/dashboard/series/route.ts` | modify | mismo patrón |
| `src/app/api/auth/register/route.ts` | modify | `store_id` resuelto con `get_store_by_domain(host)`; fail-closed si dominio inválido; ya no confía en header |
| `supabase/migrations/034_security_fix_cross_tenant_and_rls.sql` | create | Scope de tienda en `admin_total`/`manager_profile_access` y `sii_logs`; `FORCE ROW LEVEL SECURITY` |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md` | create | 20 controles + matriz tipo de cambio → ítems a revisar + procedimiento de verificación |

**Nota sobre el fix de 2026-07-29:** se preserva el comportamiento para cuentas developer/owner
con `profiles.store_id = null`, pero resolviendo la tienda desde el Host en el servidor en vez
de confiar en el header del cliente.

**Pruebas reales:** `/admin`, `/pos`, `/developer` con `?audit=true` sin sesión → 307 a `/login`;
`/login` → 200; `/api/dashboard` con `x-store-id` forjado y sin sesión → 401.

**Evidence gates:** `npx tsc --noEmit` → 0 errores en `src/`, todos los errores son preexistentes
en `scripts/*.ts` (archivos untracked). `npm run lint` → 226 errores preexistentes, 0 nuevos en
los archivos tocados. `npm run build` → compila, luego falla en el type-check de scripts.

**Migración 034 ejecutada y verificada en vivo (2026-11-19):** `force_rls_tables = 35/35`;
policies `admin_total`/`manager_profile_access` con `store_id = get_store_id()` en USING y WITH CHECK;
`sii_logs` insert con `with_check = (store_id = get_store_id())`. Prueba negativa con rol
`authenticated`: un usuario ve solo los perfiles de su tienda, no los 61 totales.

**Hallazgo nuevo:** 1 perfil tiene `store_id = 92674aea-...` que no existe en `public.stores`,
y 17 perfiles tienen `store_id = null` (posibles cuentas globales). Revisar.

**Pendiente:** ítems 14 y 20 siguen abiertos. Diferidas a propósito las actualizaciones de
dependencias (pueden romper el motor DTE). Token Supabase borrado después de usar.

---

### 2026-07-29 — CRÍTICO: /api/dashboard mostraba la misma tienda en todos los subdominios

**Hallazgo:** el usuario reprodujo en pantalla que `master.localhost:3000/admin` y
`austral-market.localhost:3000/admin`, con la misma cuenta developer, mostraban EXACTAMENTE
los mismos números de dashboard. Causa: `src/app/api/dashboard/route.ts` tenía un fallback
"usar la primera tienda encontrada" para cuentas developer con `profiles.store_id = null`,
que ignoraba por completo el subdominio real de la request — `middleware.ts` ya resuelve e
inyecta el header `x-store-id` correcto, pero este endpoint nunca lo leía.

**Fix:** el endpoint ahora prioriza el header `x-store-id` sobre `profile.store_id`, y falla
con 404 claro si ninguno resuelve — sin adivinar con "la primera tienda". Verificado: el
patrón de "primera tienda" no existía en ningún otro archivo (grep completo de `src/`), así
que el bug quedó acotado a este único endpoint, no era sistémico.

**Alcance real:** no afectaba a cuentas de clientes normales (con `store_id` ya seteado en su
perfil) — solo a cuentas developer/owner globales navegando por distintos subdominios.

---

### 2026-07-28 — SiiSyncManager (código muerto) + gate roto en OfflineSyncManager

**Hallazgo (investigación del Arquitecto):** `src/components/sii/SiiSyncManager.tsx` y
`src/components/pos/OfflineSyncManager.tsx` son DOS componentes distintos, no uno solo como
sugería el backlog. El primero es código muerto (0 referencias, versión vieja superseded). El
segundo está montado y corriendo en el POS real, pero tenía un bug activo: el gate
`if (!settings?.sii?.enabled) return` en `syncCafs()` nunca dejaba pasar nada porque
`settings.sii.enabled` es `false` por defecto y nada en todo el codebase lo pone en `true` —
el auto-refresh del pool de folios SII estaba muerto para TODAS las tiendas, incluso las bien
configuradas. El chequeo además era redundante: `/api/sii/auth/token` ya maneja el caso "sin
config" con un 404 limpio.

**Fix (Antigravity):** borrado `SiiSyncManager.tsx`. Gate roto removido de
`OfflineSyncManager.tsx`, `syncCafs()` ahora llama directo a `/api/sii/auth/token` y confía en
el manejo de error ya existente. Verificado por el Arquitecto: diff coincide exacto con el spec.

**Pruebas de runtime:** diferidas — ningún store tiene SII configurado todavía (certificación
SII quedó diferida el mismo día). Se cierra la tarea en base a revisión de código + build/lint
limpio, sin fabricar una prueba de runtime que no se puede correr de verdad. Pendiente correr
el plan de pruebas completo cuando exista un store con `sii_config` real.

---

### 2026-07-28 — Consolidación de tareas pendientes + limpieza de docs obsoletos

**Motivo:** el usuario sospechaba que había tareas anotadas en documentos que ya no reflejaban
el estado real del código (algunas ya resueltas, otras genuinamente perdidas entre ~15 docs
dispersos). Se pidió al Arquitecto (Claude Code) barrer todo el vault de Obsidian + graphify +
grep de TODOs en `src/` y armar una lista maestra única, ordenada por riesgo/importancia/tiempo.

**Docs revisados:** `AUDIT_REPORT_2026-07-28.md`, `CHECKLIST_DETALLADO.md`, `MAPA_MAESTRO_MISIONES_PENDIENTES.md`,
`PLAN_DE_TRABAJO_OPENCODE.md`, `plan-implementacion-ecommerce-yhapos.md`, `REVISION_DISENO.md`,
`task.md`, `YAHPOS Kanban.md`, `AGENTS.md`, `COLLABORATION_PROTOCOL.md`, `CONTEXT_FOR_CLAUDE.md`,
`simulation-report.md`, más grep de `TODO`/`FIXME` en todo `src/`.

**Confirmado FALSO / ya resuelto (verificado leyendo el código actual, no solo el doc):**
- `CHECKLIST_DETALLADO.md` casi entero: logos `logo-light/dark.png` y `favicon.ico` existen,
  Webpay commit ya usa `.replace('ORD-','')` (no el bug viejo del `.split()`), 14 API routes con
  try/catch y auth checks ya aplicados. Archivado en `docs/archivo/` — solo M1/M2/M3 (loading
  states, `window.innerWidth` en render, console.error verbose) seguían vigentes, movidos a la
  lista maestra activa.
- `AGENTS.md` §4 "Auth SSO Bug — No arreglado": falso, `callback/route.ts:74-108` ya respeta
  `fromOrigin` correctamente (fix de 2026-05-16 nunca actualizó esta nota). Corregido in-place.
- `AGENTS.md` §7 "Webpack compilation hang": no se reprodujo en el build de hoy (11.8s, limpio).
- `PLAN_DE_TRABAJO_OPENCODE.md`: enfoque completo (fallback Open Food Facts + scraper) reemplazado
  por el Catálogo Maestro. Doc entero obsoleto, archivado.

**Sin confirmar (no asumir cerrado, no asumir roto):**
- `AGENTS.md` §6, loop de auth cross-subdominio de mayo 2026 (hipótesis H1/H2/H3 sobre
  session-sync) — es un mecanismo DISTINTO al fix de `secure:false` cerrado hoy. El test de hoy
  no lo confirma ni lo descarta. Ver `docs/archivo/AGENTS_secciones_obsoletas_2026-07-28.md`.

**Hallazgos nuevos reales (no estaban documentados en ningún doc):**
- `src/sections/PlatformLanding.tsx:370` — número de WhatsApp placeholder hardcodeado
  (`569XXXXXXXX`) nunca reemplazado, visible a clientes reales. Archivo está en la lista
  "NO tocar" — pendiente decisión del usuario sobre cómo resolverlo.
- `src/stores/cartStore.ts:119` — TODO real de lógica de descuentos sin implementar (coincide
  con backlog "[E-commerce] Cupones" del Kanban).

**Acción tomada:** `CHECKLIST_DETALLADO.md` y `PLAN_DE_TRABAJO_OPENCODE.md` movidos a
`docs/archivo/`. Secciones desactualizadas de `AGENTS.md` extraídas a
`docs/archivo/AGENTS_secciones_obsoletas_2026-07-28.md` y corregidas in-place en el doc vivo.
`plan-implementacion-ecommerce-yhapos.md` (rediseño completo estilo cugat.cl) quedó sin tocar,
sin sumar al backlog activo — el usuario no confirmó si sigue vigente, revisar más adelante.

---

### 2026-07-28 — Catálogo Maestro (Fase C-Fix) + Fix race condition Invalid Refresh Token

**Catálogo Maestro YAHPOS! Compartido — cierre:**
Antigravity reportó Fases A/B/C completas. Auditoría del Arquitecto (Claude Code) encontró
bug real en Fase C: `getPendingMasterCatalogSubmissionsAction` y
`approveMasterCatalogSubmissionAction` (`src/app/developer/actions.ts`) consultaban
`master_catalog_submissions` con el cliente normal — tabla tiene RLS activo sin policies
para `authenticated` (a propósito, acceso solo vía admin client), Postgres no tira error,
simplemente devuelve `[]`/`no rows` siempre. Rompía lista de pendientes, export y aprobar.
Build/lint no lo detectan (bug de runtime, no de tipos).

**Fix (Fase C-Fix):** swap a `adminClient` en ambas queries. Verificado por el Arquitecto
leyendo el código corregido — coincide con el fix pedido. Tarea cerrada.

| Archivo | Cambio |
|---------|--------|
| `src/app/developer/actions.ts` | 2 SELECTs sobre `master_catalog_submissions` ahora vía `adminClient` en vez de `supabase` |
| `src/app/developer/DeveloperPanel.tsx` | `type Submission` local para tipar el estado (sin regresión) |

**Fix race condition Invalid Refresh Token:**
Bug de backlog de larga data (§9 CLAUDE.md). Causa: `SessionSync.tsx` tenía dos puntos de
entrada concurrentes al montar (`getSession()` manual + evento `INITIAL_SESSION` del
listener `onAuthStateChange`), ambos podían disparar refresh del mismo token en paralelo —
Supabase rota el token en cada uso, el segundo intento revienta con `Invalid Refresh Token`.
Se agrava en React Strict Mode (doble montaje en dev).

**Fix:** guard `mounted` (mata callbacks de montajes viejos tras Strict Mode remount) +
mutex `isRefreshingProfile` (evita `refreshProfile()` concurrente) + flag
`initialSessionFired` (salta el `getSession()` de respaldo si el listener ya atrapó la
sesión). `src/providers/SaaSProvider.tsx` (zona roja) auditado y descartado como fuente del
bug — no tocado.

**Verificación real:** usuario hizo prueba manual — ~20 recargas rápidas en
`admin.localhost:3000/admin` logueado, cero `Invalid Refresh Token` en consola, sesión no se
cae. Confirmado en runtime, no solo build/lint.

| Archivo | Cambio |
|---------|--------|
| `src/components/auth/SessionSync.tsx` | Guard `mounted` + mutex `isRefreshingProfile` + flag `initialSessionFired`, tipado `Session \| null`, imports sin uso removidos |

**Auditoría adicional de backlog (§9):** Realtime Stock (Supabase Realtime) y Carga
Certificado `.pfx` ya estaban implementados y funcionando — no figuraban marcados como
terminados. Corregido en Kanban.

**Hallazgo menor no bloqueante:** warning de manifest PWA, ícono
`yahpos_logo_square_master_192.png` con tamaño real distinto al declarado. Pendiente, fuera
de scope de esta sesión.

---

### 2026-05-19 — Fix session-sync cookie propagation (INCOMPLETO — BLOQUEADO)

**Problema:** Auth cross-subdomain loop. session-sync perdía cookies en el redirect.

**Intento de fix:** Reescribir session-sync para usar HTML 200 + Set-Cookie headers raw + window.location.replace() en vez de NextResponse.redirect() + cookies.

**Resultado:** session-sync responde 200, pero `[Middleware] Auth Error: Auth session missing!` persiste en requests posteriores. Las cookies no se propagan correctamente al middleware.

**Impacto colateral:** Webpack compilation hang tras limpiar `.next` cache (cache cold). No arranca con `--webpack`. Turbopack sirve páginas pero auth sigue sin funcionar.

**Files tocados:**
| Archivo | Cambio |
|---------|--------|
| `src/app/api/auth/session-sync/route.ts` | Reescrito: HTML + Set-Cookie headers (NO FIX) |
| `src/middleware.ts` | Sanitización trailing dots |

**Archivos revertidos a original:**
| Archivo | Razón |
|---------|-------|
| `next.config.ts` | Se quitó `turbopack: {}` agregado experimentalmente |
| `package.json` | Se revirtió `"next dev"` → `"next dev --webpack"` |

**Lección:** No modificar config de build ni cambiar entre webpack/turbopack sin entender impacto de PWA plugin. Documentar cambios ANTES de aplicar.

---

### 2026-05-16 — Loyalty Fixes + Multi-Tenant Auth + Customer Display V2

| Archivo | Cambio |
|---------|--------|
| `src/app/api/auth/callback/route.ts` | Auth callback redirige a `fromOrigin` para TODOS los usuarios. Staff filtrados por subdominio vía `stores!inner`. |
| `src/app/api/auth/register/route.ts` | Agregado `store_id` al upsert del profile. |
| `src/app/api/customers/route.ts` | Fallback a búsqueda sin `store_id` si no encuentra. |
| `supabase/migrations/021_identity_verification.sql` | Incluye UPDATE para marcar `is_full_account=true` en perfiles con email. |
| `src/app/(pos)/pos/page.tsx` | + CustomerStatusPanel (QR registro / icono carnet / verified) + auto-refresh 3s + validateSession() + broadcast reset en vacío + estabilizado init effect + metadata broadcast ya no borra items |
| `src/app/(pos)/pos/customer-display/page.tsx` | IdleState ahora muestra "Bienvenidos a [Tienda]" con logo y puntos del cliente |
| `AGENTS.md` | Handoff + bugs actualizados |
| `YAHPOS Kanban.md` | Bugs resueltos marcados |

---

## Índice

- [1. Resumen del Proyecto](#1-resumen-del-proyecto)
- [2. Stack Tecnológico](#2-stack-tecnológico)
- [3. Arquitectura](#3-arquitectura)
- [4. Módulos](#4-módulos)
- [5. Convenciones](#5-convenciones)
- [6. Bugs Conocidos](#6-bugs-conocidos)
- [7. Historial de Cambios](#7-historial-de-cambios)
- [8. Investigación: MCP Server para YAHPOS!](#8-investigación-mcp-server-para-yahpos)
- [9. Ideas Pendientes](#9-ideas-pendientes)

---

## 1. Resumen del Proyecto

**YAHPOS!** — Punto de Venta Inteligente con facturación electrónica SII, multi-tenancy SaaS, e-commerce, y panel administrador. Sistema todo-en-uno para negocios en Chile.

### Apps dentro del monorepo:
| App | Ruta | Descripción |
|-----|------|-------------|
| **POS** | `/(pos)/pos` | Punto de venta táctil con offline support, Edenred/Pluxe/Junaeb |
| **Admin** | `/admin` | Panel de gestión: productos, clientes, personal, sucursales, cajas, facturación, reportes |
| **E-commerce** | `/(shop)/` | Tienda online pública con carrito, checkout, club de puntos |
| **Developer** | `/developer` | Command center: crear negocios, monitorear SII, finanzas |
| **Landing** | `/` | Página de marketing YAHPOS! |

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Framework** | Next.js 16.2.3 (App Router, webpack) |
| **Language** | TypeScript (strict) |
| **Styling** | Tailwind CSS v4 + CSS variables |
| **Componentes** | shadcn/ui (Radix primitives) |
| **Auth** | Supabase SSR (OAuth Google + email) |
| **DB** | Supabase (PostgreSQL) |
| **Multi-tenancy** | Subdominios + RPC `get_store_by_domain` |
| **SII** | Motor DTE propio (certificación/producción) |
| **PWA** | `@ducanh2912/next-pwa` con service worker |
| **Payments** | Webpay, SumUp, Getnet, Edenred, Pluxe, Junaeb |
| **Charts** | Recharts |
| **Animaciones** | GSAP + Framer Motion |
| **AI** | OpenAI (generación descripciones) |

---

## 3. Arquitectura

### Multi-tenancy (Subdominios)
```
master.localhost:3000       → Tienda "Master" (desarrollo)
austral-market.localhost:3000 → Tienda "Austral Market"
{slug}.yahpos.cl            → Producción
dominio-personalizado.cl    → Custom domain
```

**Flujo:**
1. Middleware detecta host → busca `stores` por subdominio/dominio
2. Inyecta `x-store-id`, `x-store-tier`, `x-store-primary-color`, etc. en headers
3. `SaaSProvider` (cliente) recibe config inicial desde headers
4. `BrandThemeSetter` inyecta CSS custom properties (`--brand-primary`, etc.)

### Dynamic Theming
```css
/* tailwind.config.ts — IGNORADO en v4 */
/* globals.css @theme — Fuente de verdad en v4 */
--color-brand-primary: var(--brand-primary, #7700cc);
--color-brand-accent: var(--brand-accent, #ffd100);
```

**Runtime:** `BrandThemeSetter` → `document.documentElement.style.setProperty('--brand-primary', color)`

### Auth SSO Flow
```
Subdominio → /login → /api/auth/sso (raíz) → Google OAuth → /api/auth/callback (raíz) → session-sync → Subdominio
```

⚠️ **Bug conocido:** El callback ignora `from_origin` y redirige a la primera tienda del usuario (ver Bugs).

### Estructura de Directorios
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, registro, recuperar contraseña
│   ├── (cart)/             # Checkout, carrito
│   ├── (portal)/           # Turnos
│   ├── (pos)/              # POS
│   ├── (shop)/             # E-commerce público
│   ├── admin/              # Panel admin
│   ├── developer/          # Developer center
│   ├── api/                # API routes (auth, SII, payments, etc.)
│   └── globals.css         # Tailwind v4 + brand colors
├── components/
│   ├── admin/              # Admin components
│   ├── auth/               # Auth components
│   ├── editor/             # Editor components
│   ├── layout/             # Header, footer, sidebar, etc.
│   ├── modals/             # Modales compartidos
│   ├── pos/                # POS components (settings, payment, etc.)
│   ├── saas/               # SaaS components
│   ├── shop/               # E-commerce components
│   ├── sii/                # SII components
│   └── ui/                 # shadcn/ui components
├── config/                 # Config files (ecommerce.ts, etc.)
├── lib/                    # Utilities
│   ├── sii/                # Motor DTE (auth, CAF, engine, signer, etc.)
│   ├── contrast.ts         # WCAG contrast checker
│   ├── color.ts            # Color manipulation
│   ├── api-utils.ts        # API helpers (withAuth, etc.)
│   └── utils.ts            # General utilities
├── providers/              # React context providers
├── sections/               # Landing page sections
├── stores/                 # Zustand stores
└── types/                  # TypeScript types
```

---

## 4. Módulos

### POS (`src/components/pos/`)
Sistema táctil con:
- Catálogo de productos con búsqueda y filtros
- Carrito persistente con offline support (IndexedDB)
- Múltiples métodos de pago: Efectivo, Tarjeta, Webpay, SumUp, Getnet, Edenred, Pluxe, Junaeb
- Validación de sellos Junaeb
- Integración SII (emisión boleta/factura automática o manual)
- Apertura/cierre de caja, control de sesiones
- Modo entrenamiento
- Puntos de fidelización

### Admin (`src/app/admin/`)
- Dashboard con gráficos de rendimiento
- Productos (CRUD + generación IA)
- Clientes (con verificación RUT)
- Personal (roles y permisos)
- Sucursales (multi-sucursal)
- Cajas (sesiones, movimientos)
- Facturación SII (emisión manual, historial, certificación)
- Reportes
- Branding (colores, logo)

### E-commerce (`src/app/(shop)/`)
- Landing con hero, categorías, ofertas, club de puntos
- Catálogo de productos
- Carrito y checkout
- Autenticación de clientes

### SII (`src/lib/sii/`)
- Motor DTE completo: auth, CAF, firma, emisión, envío, PDF
- Certificación automática
- Track ID y consulta de estado
- Documentos: Boleta (39/41), Factura (33), Nota Crédito/Débito (56/61), Guía Despacho (52)

---

## 5. Convenciones

### CSS / Tailwind v4
- **NO** usar `tailwind.config.ts` — Tailwind v4 lo ignora
- Colores del theme van en `globals.css` dentro de `@theme { ... }`
- Colores `brand-*` deben usar `var(--brand-*, fallback)`
- Preferir `bg-brand-primary/10` sobre `bg-purple-100`

### Nombres de colores
| Propósito | Clase |
|-----------|-------|
| Color principal de marca | `brand-primary` |
| Color de acento | `brand-accent` |
| Shade más claro | `brand-50` |
| Shade más oscuro | `brand-900` |
| Acento claro | `brand-accent-50` |
| Acento oscuro | `brand-accent-900` |
| Logo | `brand-logo` |

### Categorías de Git
- `feat:` — Nueva funcionalidad
- `fix:` — Bug fix
- `chore:` — Mantenimiento (gitignore, etc.)
- `docs:` — Documentación

---

## 6. Bugs Conocidos

### Bug #1 — Auth SSO redirige a tienda incorrecta
**Archivo:** `src/app/api/auth/callback/route.ts:74-103`

**Síntoma:** Login con Google desde `austral-market.localhost:3000` redirige a `master.localhost:3000`.

**Causa:** El callback en `isRootDomain` usa `.limit(1)` en `user_stores` sin considerar `from_origin`.

**Fix propuesto:** Parsear `from_origin` para extraer subdominio y filtrar `user_stores` antes del fallback `.limit(1)`.

### Bug #2 — Auth session missing en cada request
**Archivo:** `src/middleware.ts`

**Síntoma:** `[Middleware] Auth Error: Auth session missing!` en cada request.

**Causa:** Cookies de Supabase no se propagan correctamente entre subdominios. `session-sync` funciona pero middleware no ve la sesión.

### Bug #3 — Invalid Refresh Token: Already Used
**Síntoma:** `AuthApiError: Invalid Refresh Token: Already Used`

**Causa:** Múltiples requests simultáneos refrescan el mismo token (React Strict Mode en desarrollo).

### Bug #4 — Hardcoded colors en charts
**Archivos:** `src/app/admin/page.tsx`, `src/app/admin/reportes/page.tsx`

**Síntoma:** Los charts usan colores fijos como `#003399`, `#10b981`, etc. en lugar de `brand-primary`.

---

## 8. Inngest — Background Jobs (Investigación Pendiente)

*Investigado: 2026-05-13*

### ¿Qué es?
Plataforma de durable execution para Next.js. Permite definir funciones que corren en background con steps durables, retry automático por paso, scheduling (cron), y event-driven triggers. No requiere Redis — funciona puramente con HTTP + serverless.

### Competidores
| Feature | Inngest | BullMQ | Trigger.dev | Vercel Cron |
|---------|---------|--------|-------------|-------------|
| Redis | No | Sí | No | No |
| Serverless-native | ✅ | ❌ | ✅ | ✅ |
| Retry por paso | ✅ | Manual | ✅ | ❌ |
| Sleep días | ✅ (sin costo) | Worker persistente | ✅ | ❌ |
| Fan-out | Automático | Manual | ✅ | ❌ |
| Dashboard | ✅ Dev + Cloud | Third-party | ✅ | ❌ |
| Free tier | 50k runs/mes | N/A | Limitado | 60 invoc/día |

### Por qué Inngest para YAHPOS!
1. **Cero infraestructura** — no hay que levantar Redis ni workers persistentes
2. **Serverless native** — funciona directo en Vercel sin cambios de deploy
3. **Steps durables** — si una función falla en el step 3, los steps 1-2 no se re-ejecutan
4. **Step-level retry** — cada paso puede tener su propia política de reintento
5. **Scheduling nativo** — `cron: '0 9 * * MON'` para reportes semanales
6. **Event-driven** — ideal para pipeline de Resends (marketing)
7. **DX excelente** — Dev Server local en `localhost:8288`, hot reload, trace visual

### Use cases en YAHPOS!

#### 1. Resends (Marketing) — Prioridad alta
Re-envío programado de campañas a clientes que no abrieron el primer mensaje.
```ts
// Evento: "marketing/campaign.sent"
// Step 1: Enviar email/SMS inicial
// Step 2: step.sleep("wait-24h", "24h")
// Step 3: Verificar si abrió
// Step 4: Si no abrió → reenviar con otro asunto
// Step 5: step.sleep("wait-48h", "48h")
// Step 6: Si no abrió → reenviar con descuento
```

#### 2. SII Sync — Prioridad media
Sync automático de DTE con reintentos, cola de documentos pendientes.
```ts
// Evento: "si/document.created"
// Step 1: Firmar XML con CAF
// Step 2: Enviar a SII
// Step 3: Consultar Track ID (con retry cada 30s)
// Step 4: Si Track ID = "EP" → marcar como emitido
// Step 5: Si error → step.sleep("retry-5m", "5m") → reintentar (máx 3)
```

#### 3. Reportes Programados — Prioridad baja
```ts
// Cron: "0 8 * * 1" (Lunes 8 AM)
// Step 1: Calcular ventas semana anterior
// Step 2: Generar PDF
// Step 3: Enviar por email al admin
```

#### 4. Limpieza y Mantenimiento — Prioridad baja
```ts
// Cron: "0 3 * * *" (diario 3 AM)
// Step 1: Limpiar sesiones expiradas
// Step 2: Archivar pedidos > 90 días
```

### Setup Técnico

```bash
# 1. Instalar
npm install inngest

# 2. Cliente
# src/inngest/client.ts
import { Inngest } from "inngest";
export const inngest = new Inngest({ id: "yahpos", name: "YAHPOS!" });

# 3. Serve route
# src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
export const { GET, POST, PUT } = serve({ client: inngest, functions: [] });

# 4. Dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
# Abre http://localhost:8288
```

### Archivos a crear para implementación
1. `src/inngest/client.ts` — Cliente Inngest
2. `src/inngest/functions.ts` — Todas las funciones
3. `src/app/api/inngest/route.ts` — Serve route

### Variables de entorno requeridas (producción)
- `INNGEST_SIGNING_KEY`
- `INNGEST_EVENT_KEY`
- `INNGEST_DEV=1` (desarrollo)

### Enlaces útiles
- [Quick Start](https://www.inngest.com/docs/getting-started/nextjs-quick-start)
- [Documentación Funciones](https://www.inngest.com/docs/learn/inngest-functions)
- [Vercel Deploy Guide](https://www.inngest.com/docs/deploy/vercel)
- [Comparativa 2026](https://starterpick.com/guides/background-jobs-inngest-vs-bullmq-vs-trigger-2026)

---

## 7. Historial de Cambios

### 2026-05-13 — Dynamic Theming Fase 5 + Smart Contrast + Bug fixes

#### 🎨 Dynamic Theming
- **`src/app/globals.css`**: Agregados 20+ colores `brand-*` al `@theme` de Tailwind v4 (antes estaban solo en `tailwind.config.ts` que v4 ignora). Backgrounds dark mode neutralizados (`hsl(260,...)` → `hsl(0,0%,...)`) para compatibilidad con cualquier color de marca.
- **`src/components/pos/PosSettingsModal.tsx`**: Reemplazados `violet-*` y `sky-*` por `brand-primary` y `brand-accent`.
- **`src/components/admin/DesignWishlistModal.tsx`**: Reemplazados `purple-*` y `blue-*` por `brand-primary`.
- **`src/components/admin/ProductModal.tsx`**: Reemplazados `purple-*` por `brand-primary`.

#### ✨ Smart Contrast
- **`src/lib/contrast.ts`** (nuevo): Utilidad WCAG completa — `getContrastRatio()`, `getContrastRating()`, `meetsAA()/AAA()`, `getTextColorForBg()`, `findAccessibleColors()`.
- **`src/app/admin/branding/page.tsx`**: Panel de contraste inteligente que evalúa en tiempo real Primary + Accent contra fondo blanco y oscuro, con rating WCAG (AAA/AA/Fail), barra de progreso, y sugerencias.

#### 🐛 Bug fixes
- **`src/app/admin/page.tsx`**: Recharts `height="100%"` → `height={260}` en AreaChart y PieChart.
- **`src/app/admin/reportes/page.tsx`**: Mismo fix en AreaChart y PieChart.

#### 📝 Documentación
- **`TASK_HANDOFF.md`**: Actualizado con bugs pendientes de auth.
- **`YAHPOS Kanban.md`**: Actualizado con nuevos ítems y bugs registrados.
- **`BITACORA.md`**: Creada.

### 2026-05-13 — Dynamic Theming Fase 5 + Smart Contrast + Bug fixes + Metodología + Brand Colors

#### 🏗️ Metodología
- **`AGENTS.md`**: Reescribí el protocolo completo con pipeline 4-fase (Decompose → Delegate → Verify → Report), subagente orchestration patterns (fan-out, pipeline, research→implement), formato de descomposición de tareas, kill criteria para subagentes, y regla "No ejecutes si puedes delegar".

#### 🔬 Investigación
- **`BITACORA.md §8`**: Documentación completa de Inngest — comparativa, use cases (Resends, SII sync, reportes, cleanup), setup técnico, archivos a crear, variables de entorno.
- **`AGENTS.md`**: Agregada sección "Investigación Pendiente: Inngest" con resumen.
- **`YAHPOS Kanban.md`**: Agregados ítems al backlog: Setup Inngest, Migrar SII sync, Programar reportes.

#### 🎨 Corrección Default Brand Color + Migración Completa
- **Default brand-primary corregido**: `#7700cc` → `#4b0082` (indigo) en 8 archivos: globals.css, BrandThemeSetter.tsx, SaaSProvider.tsx (x2), layout.tsx, middleware.ts, branding/page.tsx, configuracion/page.tsx, tailwind.config.ts
- **`CatalogViewer.tsx`**: 18 usos de `corporate-blue` → `brand-primary` (clases rotas en v4)
- **`catalog/page.tsx`**: 5 usos de `corporate-blue` → `brand-primary`
- **`admin/page.tsx`**: Hex `#003399` → `#4b0082` en gradients y strokes de charts
- **`admin/reportes/page.tsx`**: Hex `#1a4b8c` → `#4b0082` en COLORS array y gradients
- **`admin/configuracion/page.tsx`**: 7 usos de `purple-*` → `brand-*`
- **`admin/personal/page.tsx`**: 3 usos de `indigo-*` → `brand-*`
- **`CashMovementModal.tsx`**: `bg-indigo-500` → `bg-brand-500`
- **`CashOpeningModal.tsx`**: `cyan-*` → `brand-accent-*`
- **`EditorProvider.tsx`**: `text-purple-400` → `text-brand-400`
- **`(auth)/layout.tsx`**: `bg-purple-600/40` → `bg-brand-600/40`
- **`carrito/page.tsx`**: `to-purple-400` → `to-brand-400`
- **`ShopBackdrop.tsx`**: `bg-purple-500/5` → `bg-brand-500/5`
- **`Footer.tsx`**: Gradiente `from-blue-400 via-purple-400 to-pink-400` → `from-brand-400 via-brand-accent to-brand-600`
- **`PackSection.tsx`**: `indigo-*` → `brand-*`
- **`PacksSlide.tsx`**: `cyan-*` → `brand-accent-*`
- **`ecommerce.ts`**: `to-cyan-500/20` → `to-brand-accent-500/20`

### 2026-05-14 — Fix: Desync Dual ThemeProvider (Surface Colors)

#### 🐛 Bug: BrandThemeSetter rompía modo claro/oscuro
**Causa raíz:** `BrandThemeSetter` inyectaba `--surface-*` como inline styles en `<html>`. El tema usado era del ROOT `ThemeProvider` (defaultTheme="dark"), pero el POS tiene su propio `ThemeProvider` anidado (defaultTheme="light"). Al cambiar tema desde el POS, los inline styles se desincronizaban y pispeaban el CSS del `.dark` class.

**Fix:**
- **`src/providers/BrandThemeSetter.tsx`**: Eliminada inyección de `--surface-*`. Ahora solo setea `--brand-*`. Ya no importa `useTheme` ni `generateSurfaceShades`.
- **`src/lib/color.ts`**: `generateSurfaceShades` revierte a solo light-mode (sin `dark` param). Queda como utilidad para futuro uso.

#### 🎨 Unificación de fondos POS
- **`src/app/(pos)/pos/page.tsx`**: Categories bar y Products scroll area ahora usan `bg-surface-100` (mismo color que Cart sidebar). CSS defaults (`:root` / `.dark`) manejan correctamente light y dark mode sin inline styles que interfieran.

#### 🖱️ Categories scroll
- Categories bar conserva `ref`, `onWheel`, `touch-pan-x` para scroll horizontal con rueda y touch.
- **`src/app/globals.css`**: `custom-scrollbar` ahora define `height: 4px` para scrollbars horizontales.

#### Evidence Gates
- `npm run build`: ✅

### 2026-05-14 — Hardware Integration (WebUSB + Scanner Fix)

#### 🔧 Scanner Fix (Paste + Enter)
- **`src/app/(pos)/pos/page.tsx`**: Extraída lógica de código de barras a `processBarcode()`. Agregado `paste` event listener que captura clipboard, llena el buffer y actualiza timestamp para que Enter lo procese. Reducido mínimo de longitud de 12 a 4 caracteres.

#### 🏗️ Hardware Abstraction Layer (nuevos archivos)
- **`src/lib/hardware/types.ts`**: Tipos compartidos (`PrinterInfo`, `ScannerInfo`, `PrintOptions`, constantes ESC/POS).
- **`src/lib/hardware/printer.ts`**: `PrinterManager` con WebUSB (`requestDevice`, `autoConnect`, `sendReceipt` con ESC/POS, `openCashDrawer`, `sendRaw`). Soporta Epson (0x0416), Star (0x0519), HPRT (0x0483), Posiflex (0x1FC9), Bixolon (0x04B8).
- **`src/lib/hardware/cashDrawer.ts`**: `CashDrawerManager` — abre gaveta vía impresora (ESC/POS `ESC p m t1 t2`) o directo USB.
- **`src/lib/hardware/bluetooth.ts`**: `BluetoothScanner` — conecta scanners BLE vía Web Bluetooth (servicio 0xFFF0), también soporta scanners HID (teclado bluetooth, no requieren código especial).
- **`src/lib/hardware/hardwareStore.ts`**: Zustand store unificado con `init()`, `connectPrinter()`, `disconnectPrinter()`, `openCashDrawer()`, `connectScanner()`, `disconnectScanner()`.

#### 🖨️ Integración en POS
- **`src/app/(pos)/pos/page.tsx`**: `useEffect` llama a `useHardwareStore.getState().init()` al montar el POS, auto-conectando impresora USB si hay una previamente vinculada.
- **`src/components/pos/PosReceiptModal.tsx`**: Nuevo botón "Térmica" que envía el comprobante a la impresora USB vía ESC/POS. Mantiene botón "PDF" existente como fallback.
- **`src/components/pos/PosSettingsModal.tsx`**: Nueva sección "Hardware" con: conectar/desconectar impresora USB, abrir gaveta de prueba, conectar scanner Bluetooth. Detecta si WebUSB/Bluetooth están disponibles.

#### 🛠️ Dependency fixes
- **`package.json`**: Agregados `@types/w3c-web-usb`, `@types/web-bluetooth` como devDependencies.

#### 🐛 Pre-existing fix
- **`src/app/api/products/route.ts:19`**: TypeScript `any[] | null` no asignable a `any[]` — agregado `as any[]`.

#### Evidence Gates
- `npm run build`: ✅
- `npm run lint` (hardware files): ✅

### 2026-05-14 — Fix Cashier Name Persistence en Customer Display

#### 🐛 Bug: cashierName se perdía en payment-confirmed y reset
**Causa raíz:** Los broadcasts `payment-confirmed` (line 844) y `reset` (line 857) en `pos/page.tsx` no incluían `cashierName`, `terminalName`, ni `terminalId`. El receiver seteaba `data.cashierName = undefined`, ocultando el nombre del cajero.

**Fix en broadcast (`useCustomerDisplaySync.ts`):**
- `metadataRef` cachea el último `cashierName`/`terminalName`/`terminalId` conocido
- `broadcast()` enriquece automáticamente cualquier payload con metadata previa si el broadcast entrante no la incluye
- Ejemplo: `payment-confirmed` sin `cashierName` → se mergea el último conocido

**Fix en receiver (`useCustomerDisplaySync.ts`):**
- Misma lógica del lado receptor con su propio `metadataRef`
- `updateData()` extraída como callback memoizado para preservar metadata incluso si un broadcast crudo llega desde otra pestaña (anterior al fix)
- localStorage hydration también pasa por `updateData()` para consistencia

**Fix UI (`customer-display/page.tsx`):**
- Extraído `TerminalCashierBar` como componente compartido (icono Monitor + nombre terminal + ID + "Cajero: nombre")
- `PaymentQrState` ahora muestra `TerminalCashierBar` en header + status "Escaneando"
- `PaymentConfirmedState` ahora acepta `data` prop y muestra `TerminalCashierBar` en header + status "Completado" + confetti
- `CartState` refactorizado para usar `TerminalCashierBar` compartido

#### ⚠️ Resultado: Fix INSUFICIENTE
El usuario reportó "nada todavia" — el nombre del cajero sigue sin aparecer en el Customer Display. El fix de metadataRef no fue suficiente porque la causa raíz es más profunda. Posibles causas para investigar en la próxima sesión:
1. `authUser.firstName`/`lastName` vacíos desde `useAuthStore()` (shape incorrecto del objeto real vs esperado)
2. `currentUser` en posStore no se setea a tiempo (orden de effects)
3. `authUser` se deserializa mal desde IndexedDB (zustand persist)
4. El broadcast nunca se dispara (condición `items.length > 0` impide broadcast inicial)
5. Condición `items.length > 0 && subtotal > 0` podría fallar si subtotal=0

**Ver AGENTS.md §6 para investigación completa.**

#### Evidence Gates
- `npm run build`: ✅

### 2026-05-15 — Fix Cashier Name en Customer Display (Root Cause)

#### 🐛 Bug: cashierName nunca llega en primer broadcast
**Causa raíz:** Race condition entre Zustand persist hydration (async desde IndexedDB/localStorage) y el `useEffect(420)` que dispara el primer broadcast en `pos/page.tsx`.

1. React monta el POS → `useAuthStore()` devuelve `{ user: null }` (Zustand no ha hidratado aún)
2. `useEffect(420)` se dispara con `authUser=null` → broadcast `cashierName: undefined`
3. El `metadataRef.current.cashierName` y `lastBroadcastRef` se "envenenan" con `undefined`
4. Aunque Zustand hidrata posteriomente y React re-renderiza, en Strict Mode (React 18+) los BroadcastChannel pueden cerrarse/recrearse y los mensajes perderse
5. El fix anterior de `metadataRef` no cubría este caso porque también dependía del state de React

**Fix (`useCustomerDisplaySync.ts`):**
- Nueva función `getCashierFromStore()` que lee síncronamente `useAuthStore.getState().user` directo del store Zustand, bypassando el ciclo de render de React
- Agregada como tercer fallback (`?? getCashierFromStore()`) en `enriched.cashierName` tanto en `broadcast()` como en `updateData()`
- Cadena completa: `data.cashierName ?? metadataRef.current.cashierName ?? getCashierFromStore()`
- `getCashierFromStore()` también fallback a `usePosStore.getState().currentUser` para modo local sin login

#### ✅ Resultado esperado
El Customer Display recibe `cashierName` desde el primer broadcast porque se lee directo del store de Zustand (ya hidratado para cuando el usuario interactúa), sin esperar React states.

#### Evidence Gates
- `npm run lint`: ✅ (pre-existing errors only)
- `npx tsc --noEmit`: ✅ (no type errors)

### 2026-05-15 — Show pointsToEarn en Customer Display + scrollbar brand color

#### 🖥️ Customer Display
- **`src/app/(pos)/pos/page.tsx`**: Agregado `pointsToEarn` faltante en el broadcast de cart-update (effect de items) y en el metadata broadcast
- **`src/app/(pos)/pos/customer-display/page.tsx`**: Movido `pointsToEarn` fuera del bloque `customerName` al footer de totales, visible para todos los clientes (no solo identificados)

#### 🎨 Scrollbar brand color
- **`src/app/globals.css`**: Cambiado scrollbar thumb de `rgba(255,255,255,0.1)` a `color-mix(in srgb, var(--brand-primary, #4b0082) 20%, transparent)` para visibilidad en modo claro. Agregado soporte Firefox via `scrollbar-color`.

### 2026-05-15 — Footer compacto Customer Display + Bug EditorToggle en POS

#### 🖥️ Customer Display footer compacto
- **`src/app/(pos)/pos/customer-display/page.tsx`**: Footer rediseñado: items+subtotal en una línea, IVA+puntos+descuento en una línea secundaria con separadores `·`, total más pequeño (`text-2xl`), padding reducido. Sin `pointsToEarn` duplicado en bloque de cliente.

#### 🐛 Bug: EditorToggle visible en rutas incorrectas
- **`src/components/editor/EditorToggle.tsx`**: Agregada exclusión de `/pos`. Corregida lógica de `isLandingPage` para que solo excluya `/` en producción (yahpos.cl), no en localhost. Así el toggle solo aparece en páginas del e-commerce.

### 2026-05-14 — Fase 0 (IVA Duplication Fix) + Fase 1 (Customer Display + Webpay QR)

#### 🐛 Fase 0.1 — IVA Duplication Fix (handleCheckout)
- **`src/app/(pos)/pos/page.tsx`**: Reemplazada lógica plana `isDigitalPayment` por clasificación per-terminal: `terminalHandlesDte` verifica `settings.terminalsDte[terminalType]` → `TERMINALS_WITH_DTE[terminalType]` → `false`. Safety validation bloquea pago si terminal con DTE tiene toggle desactivado. Nueva variable `shouldSkipSii = isVoucherPayment || terminalHandlesDte`.

#### 🖥️ Fase 1.1 — Customer Display Page
- **`src/app/(pos)/pos/customer-display/page.tsx`** (nuevo): Página fullscreen 'use client' que recibe data via BroadcastChannel (`useCustomerDisplayReceiver`). 5 estados: idle/reset (logo + "Bienvenido"), cart-update (tabla items + totales), payment-qr (QR 300-360px centrado), payment-confirmed (check verde + confetti particles), connection status indicator. Auto-hide cursor tras 3s.

#### 📡 Fase 1.2 — Broadcast Integration en POS
- **`src/app/(pos)/pos/page.tsx`**: Agregado `useCustomerDisplayBroadcast()` hook. Emite `cart-update` en cada cambio de items vía useEffect. Emite `payment-confirmed` tras finalizar venta. Emite `reset` en error. Emite `cart-update` con paymentMethod y customerName durante checkout.

#### 📱 Fase 1.4 — Webpay QR en PaymentModal
- **`src/components/pos/PaymentModal.tsx`**: Nuevo método de pago "Webpay QR". Flujo completo: creación de transacción vía `POST /api/payments/webpay/create`, polling a `GET /api/payments/webpay/status` cada 2s, auto-confirm en AUTHORIZED, retry en REJECTED/ERROR. QR code display con estado loading/pending/success/error.

#### Evidence Gates
- `npm run build`: ✅
- `npm run lint`: Pre-existing errors (423) — ninguno introducido por estos cambios

---

## 8. Investigación: MCP Server para YAHPOS!

### Contexto
HeroUI Native (https://heroui.com) provee un MCP Server (`@heroui/native-mcp`) y Agent Skills para que asistentes AI consulten documentación de componentes en tiempo real. Evaluamos si aplicar el mismo patrón a YAHPOS!

### Conclusión (2026-05-14)
Con ~400 archivos y un solo dev, los `.md` (AGENTS.md + BITACORA.md + TASK_HANDOFF.md) rinden más que un MCP server hardcodeado. La fuente de verdad son los archivos reales — mis tools Read/Grep los leen directo sin desincronización.

### Para futuro: MCP Dinámico
Si el proyecto crece a 1000+ archivos o se suma otro dev, valdría la pena un MCP server **dinámico** que lea el codebase en vivo:

| Tool | Descripción |
|------|-------------|
| `get_component_docs` | Parsea `.tsx` y extrae `interface Props` del type |
| `get_api_routes` | Escanea `src/app/api/` y lista endpoints con métodos |
| `get_brand_vars` | Parsea `globals.css @theme` y devuelve variables reales |
| `get_patterns` | Documenta patrones (POS, admin, e-commerce) |

**Estimación:** 4-8h de implementación.

---

## 9. Ideas Pendientes

### Customer Display Sync (Segunda Pantalla)
Pantalla secundaria sincronizada con la sesión actual del POS, orientada al cliente. Como esos POS de doble pantalla (ej. POS Falabella, Ripley) donde una pantalla muestra el detalle de compra al cliente.

**Funcionalidad:**
- Ruta tipo `/(pos)/pos/customer-display` o ventana independiente
- Se sincroniza en tiempo real con la sesión POS actual (via Supabase Realtime o BroadcastChannel)
- Muestra: items escaneados con precio, subtotal, descuentos, total
- Ideal para que el cliente vea que todo está correcto antes de pagar
- Podría mostrar también QR para Webpay, promociones, etc.

**Implementación futura:** Cuando se aborde la integración de hardware y doble pantalla.

### Rich Product Cards (Catálogo + POS)
Mostrar más información útil de cada producto directamente en las tarjetas del catálogo (e-commerce y POS) sin tener que abrir un modal o detalle.

**Información a mostrar según contexto:**

| Campo | Catálogo (e-commerce) | POS | Modal/Tooltip |
|-------|----------------------|-----|---------------|
| Precio normal vs oferta | ✅ | ✅ | ✅ |
| % descuento | ✅ badge | ✅ badge | ✅ |
| Stock disponible | — | ⚠️ si <= umbral | ✅ |
| En pack/promoción activa | ✅ badge | ✅ badge | ✅ |
| Packs restantes | — | ✅ si aplica | ✅ |
| Precio por unidad (ml/kg) | ✅ | — | ✅ |
| Puntos que otorga | ✅ | — | ✅ |
| Valoración / estrellas | ✅ | — | ✅ |

**Casos de uso:**
- **Descuento:** Una tarjeta podría mostrar "25% OFF" con el precio original tachado y el nuevo en brand-primary, más un badge `bg-green-500` "Oferta"
- **Packs (ej. 6x4.000):** En el POS, la tarjeta debería indicar cuántos packs quedan disponibles (stock de packs), no solo el stock unitario. Si hay 5 packs de 6 y 2 unidades sueltas, debería decir "5 packs restantes" + badge "6x$4.000 c/u"
- **Sin stock:** Si stock = 0, tarjeta se muestra gris/deshabilitada con badge "Sin stock" y botón de reposición deshabilitado
- **Precio por unidad:** En vinos de 1.5L o aceites, mostrar precio por litro para comparación

**Componentes a modificar:**
- `CatalogViewer.tsx` — catálogo e-commerce
- `ProductCard` en POS (`src/components/pos/` — verificar nombre exacto)
- `ProductModal.tsx` — modal admin (podría mostrar esta info adicional)

**Payload de producto requerido (back-end):**
- `discount_percent` o `offer_price` + `original_price`
- `pack_quantity`, `pack_price`, `pack_stock`
- `unit` (L, ml, kg, g), `unit_quantity` (para precio por unidad)
- `loyalty_points`
- `rating` / `review_count`

**Dependencias:** Requiere que el schema de `products` en Supabase tenga estos campos o que se agreguen a la proyección de la API. Algunos ya existen (`pack_type`, `pack_description`, `pack_stock`, `original_price`, `offer_price`).

**Implementación futura:** Cuando se aborde mejora de UX de catálogo y POS.

### Payment Architecture (Documentación Completa para Clientes)
Documento técnico + client-facing con diagramas de todas las integraciones de pago.

**Archivo:** `docs/arquitectura/PAYMENTS-ARCHITECTURE.md`

**Contenido:**
- Visión general con diagramas de arquitectura actual vs propuesta
- Customer Display + QR Payments (BroadcastChannel)
- Transbank Webpay Plus QR (reusar SDK existente)
- Mercado Pago QR (atendido, dinámico)
- SumUp Cloud API (lector Bluetooth + Smart POS)
- Flow API real (reemplazar mock, cuotas débito/crédito)
- Getnet POS Integrado (HTTP/USB/Cloud)
- TUU Pago Remoto (terminal sincronizado)
- Matriz completa de medios de pago con costos y esfuerzo
- Configuración por negocio (toggle on/off)
- Plan de implementación por fases con archivos y dependencias
- Referencias a documentación oficial de cada proveedor

**Integraciones documentadas:**
| Método | Esfuerzo | Prioridad |
|--------|----------|-----------|
| Webpay QR en POS | 🟢 Bajo | 🔥 Alta |
| Mercado Pago QR | 🟡 Medio | 🔥 Alta |
| Flow real (cuotas) | 🟢 Bajo | 🔥 Alta |
| SumUp Cloud API | 🔴 Alto | 🔥 Media |
| Getnet POS Integrado | 🟡 Medio | 🔥 Media |
| TUU Pago Remoto | 🟢 Bajo | 🔥 Media |

**Próximo paso:** Implementar Fase 0 (Fix IVA Duplication) + Fase 1 (Customer Display + Webpay QR).

### SII Compliance — IVA Duplication Prevention (Nuevo en docs)
Documentación detallada sobre cómo evitar la doble emisión de boletas SII cuando el terminal ya emite su propio DTE.

**Archivo:** `docs/arquitectura/PAYMENTS-ARCHITECTURE.md §12`

**Contenido:**
- Clasificación de métodos: pasarela vs terminal con DTE vs voucher
- Lógica de decisión SII corregida por terminal (no global)
- Matriz de comportamiento (qué emite el POS vs qué emite el terminal)
- Diferencias entre voucher comercial y boleta electrónica
- Configuración por terminal en Admin
- Validación de seguridad contra dualidad

### E-commerce Full Flow (Nuevo en docs)
Documentación del flujo completo de pago online con gaps identificados.

**Archivo:** `docs/arquitectura/PAYMENTS-ARCHITECTURE.md §13`

**Contenido:**
- Diferencias POS vs E-commerce (tabla completa)
- Diagrama de secuencia del checkout Webpay Plus
- Flujo actual vs propuesto para SII en e-commerce
- Configuración de SII propuesta para admin
- Tabla de gaps con impacto y soluciones
- Plan extendido para e-commerce (Fase 4)

### Integración n8n + IA (Ingreso de Inventario Inteligente)
Se implementaron las rutas de API seguras y la infraestructura en Supabase para habilitar la carga automática de stock vía n8n y el modelo Gemini 2.5 Flash de forma aislada y multi-tenant.

**Rutas API Creadas (en Next.js):**
* `GET /api/v1/bot/products`: Búsqueda segura en catálogo utilizando el `store_id` resuelto desde el token de autorización.
* `POST /api/v1/bot/inventory/update`: Actualización atómica en bloque de stock de productos vía RPC.

**Infraestructura en Base de Datos:**
* Tabla `store_api_keys` con índices y RLS por `store_id`.
* Esquema `n8n_metadata` para aislar las tablas de estado de n8n.
* Función RPC `public.increment_product_stock` para prevenir race conditions.

**Flujo en n8n:**
* Despliegue en Render Dockerizado + Keep-Alive en Cron-Job.org.
* Procesamiento de facturas y extracción JSON estructurado con Gemini 2.5 Flash.
* Limpieza automática de markdown (`.replace(/```json/g, '')`) en la expresión JSON de n8n para prevenir fallos de parseo.
* Conectores y cabeceras de bypass para localtunnel (`bypass-tunnel-reminder`) y ngrok (`ngrok-skip-browser-warning`).

### Mapeo y Control de Góndolas (Propuesta de Misión Futura)
**Objetivo:** Optimizar el flujo de trabajo de los reponedores en sala de ventas mediante la planimetría/mapa visual de las góndolas y la ubicación exacta de cada producto en la tienda.

**Funcionalidades Clave:**
1. **Modelado Físico de Góndolas (Planimetría):**
   * Configuración de la estructura de la tienda en Admin: Pasillos, Estanterías/Góndolas, Niveles (repisas) y Caras de exhibición (*facings*).
   * Definición gráfica simple de la tienda (ej: Góndola A1, Nivel 3, Posición 2).
2. **Asignación de Ubicación por Producto:**
   * Agregar campos de ubicación en el formulario y base de datos de productos (ej: `aisle`, `shelf_id`, `shelf_level`, `shelf_position`).
   * Capacidad de auditar y cambiar las ubicaciones escaneando el código de barra del producto en sala desde un dispositivo móvil o POS portátil.
3. **Flujo de Trabajo del Reponedor Eficiente (Ruta de Reposición):**
   * **Ordenamiento de Ruta**: Cuando ingresa mercadería (como la procesada automáticamente por Gemini en n8n), el sistema no solo actualiza el stock, sino que genera una "Lista de Reposición" ordenada físicamente por pasillo y góndola para que el reponedor coloque los productos en una sola caminata optimizada, reduciendo tiempos de traslado.
   * **Alertas de Reposición / Quiebre de Stock**: Alarmas automáticas cuando el stock en la góndola frontal es menor al umbral mínimo, solicitando al reponedor traer más unidades desde la bodega de almacenamiento (*backroom*).
4. **Optimización con Inteligencia Artificial (Planimetría Sugerida):**
   * Usar IA para analizar patrones de compra cruzada (por ejemplo, detectar qué productos se compran juntos frecuentemente) y sugerir colocar dichos productos en góndolas adyacentes o niveles visualmente prioritarios para maximizar ventas.



### 2026-07-27 — Reactivación del proyecto tras pausa de 2 meses

**Contexto:** Pausa de ~2 meses por pruebas académicas. El proyecto está en buen estado, sin cambios desde mayo 2026.

**Estado al retomar:**
- Última tarea completada: Bot inventory API + n8n + Gemini integration (mayo 2026)
- Tarea activa en TASK_HANDOFF.md: Realtime Stock (Supabase Realtime — POS → E-commerce) — **pendiente de iniciar**
- Build: no verificado desde la pausa — correr `npm run build` antes de implementar
- Rama: main

**Cambios de infraestructura desde la pausa:**
- Obsidian Local REST API configurado como MCP server de Antigravity (puerto 27123 HTTP)
- Workflow redefinido: Claude Pro = Arquitecto (solo planificación), Antigravity = Constructor (solo implementación)

**Próximo paso:** Ejecutar el handoff activo de Realtime Stock. Ver TASK_HANDOFF.md.

---
