# Análisis multi-tenant de YAHPOS! — aislamiento, gaps y plan de hardening

> **Documento:** consolidado de la auditoría de multi-tenancy (inventario backend/RLS, inventario de infraestructura/plataforma, auditoría SII de folios y certificados, y comparación con Vercel Platforms y Spree).
> **Fecha:** 2026-11-23 · **Rol que consolida:** `docs`; **revisión de validación:** `default` · **Estado:** propuesta para decisión del dueño. No se modificó código de producción.
> **Repositorio auditado:** `austral-market-next` · **Commit base:** `c32d1c2` + árbol de trabajo con cambios sin commitear de otras tareas (se indica cuando una cita depende de ellos).
> **Nota de alcance del commit:** este documento se commitea sobre `main` (`f0af69e`), que tiene 39 migraciones versionadas. Las migraciones `041` y `042` y el código SII nuevo citados aquí provienen del árbol de trabajo compartido; `041` y `042` **no existen en `main`** y **no forman parte de este commit** (son artefactos de otras tareas, no documentación). La migración `040` sí está versionada.
> **Método:** lectura estática de código y migraciones, OpenAPI en vivo de PostgREST, auditorías empíricas previas del tablero y una ronda de sondeos en vivo de sólo lectura contra PostgREST/Storage ([§2.10](#verificacion-vivo), tarjeta `t_f467548f`). No se ejecutó SQL de catálogo, no se emitieron DTEs y no se desplegó nada.
> **Versión:** 1.1 — revisión de validación de la tarea raíz `t_ee6fe2f0`: 235 citas `archivo:línea` re-verificadas, conteos de policies recalculados y resultados en vivo incorporados. La v1.0 fue el consolidado de `t_1152e498`.
> **Regla de evidencia:** cada afirmación sobre el repo lleva `archivo:línea`; cada afirmación sobre terceros, fuente primaria enlazada. Todo lo que depende de la base viva o de la plataforma y no pudo comprobarse está marcado **A VERIFICAR**.

**Leyenda de verificación**

| Marca | Significado |
|---|---|
| **[V]** | Verificado en el repo o en el OpenAPI en vivo durante esta consolidación. |
| **[E]** | Estático: se deduce del código/migraciones, no se re-ejecutó. |
| **[A VERIFICAR]** | Requiere base viva, runtime o dashboard; no verificable desde el repo. |

---

<a id="toc"></a>
## Tabla de contenidos

1. [Resumen ejecutivo](#resumen)
2. [Inventario](#inventario)
   - 2.1 [Modelo de tenants](#modelo-tenants) · 2.2 [`store_id`](#store-id) · 2.3 [RLS](#rls) · 2.4 [Auth y roles](#auth) · 2.5 [Subdominios y resolución](#subdominios) · 2.6 [Env, deploy y CI/CD](#env-deploy) · 2.7 [Folios, CAF y certificados](#sii) · 2.8 [Storage, jobs y observabilidad](#storage-obs) · 2.9 [Correcciones vs insumos](#correcciones) · 2.10 [Verificación en vivo](#verificacion-vivo)
3. [Comparación y patrón recomendado](#comparacion)
4. [Gaps priorizados](#gaps)
5. [Plan de hardening por fases](#plan)
6. [Anexos](#anexos)
   - 6.1 [Matriz tabla × RLS](#matriz) · 6.2 [Glosario](#glosario) · 6.3 [No verificado](#no-verificado) · 6.4 [Trazabilidad de insumos](#trazabilidad) · 6.5 [Fuentes](#fuentes)

---

<a id="resumen"></a>
## 1. Resumen ejecutivo

<a id="veredicto"></a>
### 1.1 Veredicto en una frase

**El aislamiento *entre* tiendas en el camino de datos está bien construido; el modelo falla en las puertas de entrada al tenant, en la autorización *dentro* del tenant y en la reproducibilidad de la plataforma.**

En datos, YAHPOS es multi-tenant real: `store_id` + RLS con `default-deny`, derivación del tenant desde `profiles` y filtros explícitos en las consultas privilegiadas. En plataforma es single-tenant disfrazado: un proyecto Vercel, un Supabase por entorno, una `service_role`, una clave de cifrado, un Redis y un pipeline de migraciones con blast radius global. La brecha entre ambas capas es donde viven los P0.

<a id="estado-capas"></a>
### 1.2 Estado por capa

| Capa | Estado | Evidencia principal |
|---|---|---|
| **Datos (RLS)** | Sólido cross-tenant, débil intra-tenant | 27/36 tablas con `store_id`; 21 policies `store_isolation` en `025:20-81`; 0 filas cross-tenant en 21 tablas probadas por auditorías previas; `customer` conserva CRUD completo dentro de su tienda (**P0-3**) |
| **Aplicación (queries)** | Correcto | 69 route handlers; 0 consultas con admin client que devuelvan datos de tenant sin filtro; 30 instanciaciones de `service_role` revisadas |
| **Borde (host/headers)** | Funcional con dos huecos | Host → RPC en `src/proxy.ts:65,167`; headers llegan al render (Next 16 copia la respuesta del proxy al request); hueco de spoofing sólo en dominio raíz (**P1-17**) y dominio no verificado (**P1-13**) |
| **Plataforma** | Single-tenant | 31 env globales, 0 por tenant; 1 proyecto Vercel; 1 Supabase por entorno; 1 `SII_ENCRYPTION_KEY`; 0 crons/edge functions |
| **Fiscal (SII/DTE)** | Aislamiento por código correcto; P0 condicional **descartado en vivo** | `store_id` siempre desde la sesión; motor con filtro explícito; CAF validado por RUT/tipo/rango/vigencia; `get_next_folio` sigue sin guard interno, pero su `REVOKE` **sí está aplicado** (`anon` → `42501`, [§2.10](#verificacion-vivo)) → deuda defensiva (**P0-7**) |
| **Reproducibilidad** | Parcial | `stores`, `profiles`, `products`, `orders`, `settings` y `store_api_keys` no tienen `CREATE TABLE` en migraciones; 8 tablas sin DDL de RLS; 041/042 sin commitear; 040/041 no aplicadas (**P0-6, P1-5, P1-10**) |

<a id="top5"></a>
### 1.3 Top 5 riesgos

| # | Riesgo | Por qué es top | Gap |
|---|---|---|---|
| 1 | **`service_role` de producción expuesta y global** | Está en el historial público de GitHub con hash idéntico a la clave vigente y responde contra la API; una sola clave bypassa RLS en las 36 tablas y la usan 11 rutas + el motor SII, donde el aislamiento depende de `.eq('store_id', …)` manual. Anula todo lo demás. | [P0-1](#p0) |
| 2 | **Alta de usuario con `store_id` arbitrario en `user_metadata`** | `handle_new_user` copia el `store_id` del metadata validando sólo que el UUID exista (`038:114-152`). Combinado con P0-3, cualquiera con email entra a una tienda ajena como administrador efectivo. La explotación **no se ejecutó** por la restricción de sólo lectura. | [P0-2](#p0) |
| 3 | **RLS sin gate de rol: `customer` = administrador de su tienda** | 23 tablas con `store_isolation_policy FOR ALL` sin `TO` ni chequeo de rol (`025:20-81`). Probado: un `customer` insertó productos/pagos, borró filas, leyó PII de 41 perfiles y el ciphertext de claves de pasarela. | [P0-3](#p0) |
| 4 | **Identidad de tenant dividida: Host vs `profiles.store_id`** | El catálogo sale del Host; todas las escrituras salen del perfil (`api-utils.ts:41-68`, `orders/route.ts:161-166`). Un cliente de A comprando en B crea la orden en A; no hay chequeo `host == perfil` en rutas de cliente. | [P0-5](#p0) |
| 5 | **Auto-emisión de API keys de tienda** | `store_api_keys` sólo tiene la policy genérica (`025:78`): un `customer` puede insertarse una key con `inventory:write` y operar por `/api/v1/bot/*`, que corre con `service_role`. | [P0-4](#p0) |

> Después de estos cinco: la clave de cifrado global sin derivación por tenant (**P0-8**) y el esquema no reproducible (**P0-6**). `get_next_folio` sin guard interno (**P0-7**) **dejó de ser P0**: los sondeos en vivo ([§2.10](#verificacion-vivo)) prueban que 039 está aplicada y que la función responde `42501` a `anon`; se mantiene como deuda defensiva P1 porque la autorización depende de un `GRANT` y no de un chequeo de membresía.
>
> **Resultado neto de la validación:** **7 P0 vigentes**, 1 P0 descartado en vivo (P0-7) y 2 gaps rebajados a defensa en profundidad (CAF en texto plano y flag `public` de buckets: 0 material expuesto en la base viva).

<a id="no-cambiar"></a>
### 1.4 Qué no hay que cambiar

1. **No migrar a schema-per-tenant ni db-per-tenant.** El patrón actual (pool: una base + RLS) es el correcto para el tamaño y el costo; el problema es de enforcement y de borde, no de topología.
2. **No mover secretos por tenant a variables de entorno.** Vercel no soporta env por tenant; los secretos ya viven cifrados en DB, que es el patrón correcto (`settings`, `sii_config`).
3. **No reemplazar el motor SII propio** por un motor externo: ya evaluado en `docs/operacion/sii-spike-*`; el aislamiento por código del motor es correcto.
4. **No romper los controles fail-closed existentes** al aplicar el hardening: `reserve_folios` con `EXECUTE` para `authenticated`, helpers `SECURITY DEFINER` con `EXECUTE` para `authenticated`, `get_store_by_domain` público, y la cadena TED→firma→XML (`040:24-34`).

<a id="contexto"></a>
### 1.5 Nota de contexto

Según la nota de contexto del borrador previo (2026-11-23), **a la fecha no existirían datos de producción**: lo que hay en la base serían datos de prueba, desarrollo o demo, y los perfiles huérfanos provendrían de pruebas con otras herramientas. Esa nota **no se pudo verificar desde el repo [A VERIFICAR]** y no cambia la severidad técnica de los gaps, pero sí la urgencia operativa: los P0 deben cerrarse **antes** de incorporar el primer tenant real.

<a id="decisiones-dueno"></a>
### 1.6 Decisiones que requieren al dueño

| # | Decisión | Opciones | Impacto |
|---|---|---|---|
| D-1 | Fuente de verdad de la membresía | (a) `profiles.store_id` como hoy; (b) `user_stores` con `is_active` y multi-tienda | Determina el modelo de autorización y si se puede revocar acceso sin borrar el perfil |
| D-2 | Alcance de `master_catalog_products` | (a) catálogo de plataforma; (b) catálogo por tenant | Hoy es global y legible por cualquier `authenticated` (`024:40`) |
| D-3 | Dominios personalizados | (a) manual en Vercel con runbook; (b) API de dominios de Vercel + TXT | Habilita onboarding self-service o lo mantiene manual |
| D-4 | Escape hatch de silo | (a) no ofrecerlo; (b) runbook de migración a proyecto/base dedicada | Única respuesta posible a un cliente que exija backup/restore o aislamiento regulatorio |
| D-5 | Clave de cifrado | (a) única global endurecida; (b) derivación por tenant (HKDF) o envelope encryption | Compromiso de la clave actual expone todos los PFX y credenciales de pago |

---

<a id="inventario"></a>
## 2. Inventario

<a id="modelo-tenants"></a>
### 2.1 Modelo de tenants

- **Raíz del tenant:** `public.stores`. Columnas vivas: `id, name, slug (NOT NULL), tier (NOT NULL), is_active (NOT NULL), config jsonb, subdomain (UNIQUE), custom_domain (UNIQUE), domain_verified, merchant_id, is_demo, …` (OpenAPI; `017:6-7`, `042:75`). El DDL de `stores` **no está en `supabase/migrations/`**: sólo en `scripts/setup_multi_tenancy.sql:2-13` y en el baseline de laboratorio `supabase/verify/041/00_baseline.sql:35-43` (no es migración).
- **Vínculo usuario ↔ tenant:** conviven tres mecanismos, con un solo dueño real:

| Mecanismo | Dónde | Uso |
|---|---|---|
| `profiles.store_id` (uuid, nullable, sin FK en vivo) | `001:58`, `scripts/setup_multi_tenancy.sql:20`, `025:17` | **Fuente de verdad de facto**: RLS y `withAuth()` (`api-utils.ts:48-56`) |
| `user_stores(user_id, store_id, role, is_active)` | `017:15-24`, RLS `017:27-40` | Se escribe al registrar (`auth/register/route.ts:102-109`) y se lee en el callback OAuth, pero **no autoriza**: `is_active` se ignora |
| JWT `user_metadata.store_id` | `001:6-10` (`auth.get_store_id()`) | **Legacy**: ninguna policy vigente lo usa tras 025; sólo relevante en el alta (P0-2) |

- **Consecuencia:** un usuario pertenece a **una** tienda. Un cambio de tienda implica `profiles.store_id`, bloqueado por trigger para clientes (`026:15-30`).
- **`merchants`** es nivel plataforma (por usuario), no tenant operativo (`004:7`, `026:64`).

<a id="store-id"></a>
### 2.2 `store_id`: cobertura y calidad

- **36 tablas** en `public`; **27 con `store_id`** (**9 NOT NULL / 18 NULL**); **sólo 13 con FK real a `stores`** (OpenAPI en vivo). Las 9 tablas sin `store_id` son globales o por usuario y están justificadas ([§6.1](#matriz)).
- **Índices:** los declarados son únicos de negocio o parciales (`038:195-206`, `036:84-85`, `037:8-10`). **Ninguna tabla caliente tiene un índice general de `store_id`** (products, orders, order_items, inventory, terminals, etc.); con RLS evaluando por fila esto degrada en tablas grandes (P2-1).
- **Backfill histórico:** `001:50-69` rellenó `store_id` con un UUID hardcodeado de la tienda maestra; `038:184-190` movió categorías huérfanas. Es deuda a documentar, no un mecanismo vigente.
- **Superficie de fuga:** **0 ocurrencias** de `body.store_id` o `searchParams.get('store_id')` en `src/app/api/**`. `/api/sii/sync` acepta `storeId` y lo **compara** con la sesión (`sii/sync/route.ts:32-36`). El único `store_id` controlable por el cliente es el `user_metadata` del alta (P0-2) y el `x-store-*` en dominio raíz, que sólo afecta UI (P1-17).

<a id="rls"></a>
### 2.3 RLS

- **Función base vigente:** `public.get_store_id()` = `SELECT store_id FROM public.profiles WHERE id = auth.uid()`, `SECURITY DEFINER`, `search_path=public,pg_temp` (`025:10-18`). **No** usa el Host ni el JWT: usa el perfil. Esto es el punto más importante del inventario y corrige al borrador previo.
- **21 policies** `store_isolation_policy` reescritas en `025:20-81`, `FOR ALL USING (store_id = public.get_store_id())`, **sin `TO`** (quedan `TO PUBLIC`) y **sin `WITH CHECK` explícito** (para `INSERT`, Postgres usa `USING` como check).
- **Superficie total (recalculada en la validación v1.1):** **94 sentencias `CREATE POLICY`** en los 41 archivos del árbol de trabajo (**91** en los 39 versionados en `main`), **9 de ellas dentro de bloques `DO`** (`036:95-110`, `039:74-81`). Aplicadas en orden de migración quedan **58 policies netas**: **51 en `public` sobre 33 tablas** + **7 en `storage.objects`** (57 sin 041, que aporta la policy de `sii_document_events`). Ninguna de estas cifras es el estado vivo: el conteo exacto exige `pg_policies`, que no fue accesible ([§6.3](#no-verificado)). Las cifras previas ("~97", luego "78 sentencias / 49 vigentes") eran un subconteo por parseo línea a línea. **8 tablas** sin DDL de RLS en migraciones (`stores`, `store_api_keys`, `pending_inventory_adjustments`, `supplier_product_mappings`, `catalogo_global*`, `users`, `store_settings`).
- **`FORCE ROW LEVEL SECURITY`:** aplicado en bloque a las tablas con RLS vía `DO` en `034:57-82` y explícito para las que llegan después (`035:25-26`, `041:319-320,329-330,339-340`). **Fragilidad de diseño:** el `DO` de 034 recorre sólo las tablas que ya tenían `relrowsecurity=true` en ese momento; toda tabla cuyo `ENABLE` llegue después debe forzarse a mano, y las 8 tablas sin `ENABLE` versionado, si se habilitaron fuera de banda **después** de 034, tampoco tienen `FORCE`. **A VERIFICAR** en vivo (`relforcerowsecurity`), porque sin `FORCE` el owner escapa.
- **Comportamiento probado por auditorías previas** (`t_ff460682`, `t_e9d5a749`, citadas por el inventario backend): `anon` → 0 filas/403/42501 en 35 tablas (excepción deliberada: `subscription_tiers`); cross-tenant con usuario real → 0 filas en 21 tablas; **intra-tenant sin rol → CRUD completo**, incluido `customer`.
- **Policies que no filtran nada útil:** tres leen el claim JWT `role` (`034:22`, `034:34`, `003:40`); en Supabase ese claim vale `authenticated`, no el rol de negocio, así que son **inertes** (P2-2).
- **Tablas con deny-all correcto:** `admin_finances`, `master_catalog_submissions`, `users`, `security_audit_log` (`036:95-111`, `039:74-84`). Catálogos globales cerrados a `service_role` por `REVOKE` (`038:74-75`).

<a id="auth"></a>
### 2.4 Auth y roles

- **Resolución del tenant, 5 caminos (todos server-side):** Host → RPC `get_store_by_domain` (`proxy.ts:167`); sesión → `profiles.store_id` (`api-utils.ts:41-68`); `user_stores` en el callback OAuth; API key de tienda (`/api/v1/bot/*`); JWT metadata legacy.
- **JWT:** sin custom claims ni `app_metadata.store_id`; sólo `sub`, `email`, `role='authenticated'` y `user_metadata`. El tenant se resuelve contra la DB en cada request. Correcto.
- **Roles:** el CHECK permite `customer, employee, picker, owner, developer, admin, manager, cashier, warehouse` (`010:5-8`). El código usa además `superadmin`, que el CHECK **no permite** → plataforma = `developer` en la práctica. `is_platform_role()` = rol `developer|superadmin` (`038:11-21`). `staff` DELETE escribe `role='user'`, también fuera del CHECK (P2-5).
- **`service_role`:** 30 instanciaciones privilegiadas en 21 archivos (27 llamadas a `createAdminClient()` + 3 clientes directos en `sii/engine.ts:89-92`, `sii/emisor-config.ts:38-42`, `dev-auth.ts:19`). 11 rutas de API la usan. Todas las consultas revisadas filtran por `store_id`; la fragilidad es que **no hay red de RLS** si se olvida un filtro (P0-1).
- **Allowlist por email:** `DEVELOPER_EMAILS` hardcodeado (`constants.ts:1-5`, `proxy.ts:259`, `api/auth/callback/route.ts:85`) como bypass de UI/RBAC. No otorga datos por sí solo, pero no se audita ni se revoca desde la DB (P2-8).

<a id="subdominios"></a>
### 2.5 Subdominios y resolución de tenant

| Aspecto | Implementación real | Evidencia |
|---|---|---|
| Mecanismo | `Host` → RPC `get_store_by_domain(p_host)` (`SECURITY DEFINER`, `EXECUTE` para `anon`) | `proxy.ts:65,167`; `039:46-47,61` |
| Dominios que matchean | `custom_domain = host` exacto; `<subdomain>.yahpos.cl`; `*.localhost:3000`; `*.localtest.me:3000` | `038:100-105`; `032:91-95` |
| Wildcard | No hay parsing de comodín en código: es DNS/Vercel + sufijo fijo en SQL | `032:93`; `DEPLOY.md:251-252` |
| Dominio raíz | `NEXT_PUBLIC_ROOT_ORIGIN` obligatoria; no es tenant; bloquea `/admin`, `/pos`, `/login`, `/register` | `root-origin.ts:1,7-32`; `proxy.ts:91-103` |
| Host desconocido | 307 al root (fail-closed, no 404) | `proxy.ts:182-186` |
| Verificación de dominio | Sólo CNAME contra `NEXT_PUBLIC_ROOT_DOMAIN`; sin challenge TXT | `verify-dns/route.ts:14-27` |
| `domain_verified` | Existe la columna (`042:75`), pero **la RPC no la exige** | `038:100-105` |
| Dominios custom / TLS | Alta/baja manual en dashboard; sin API de Vercel ni IaC | `stores.ts:180-204`; `DEPLOY.md:251-252` |
| Dominio raíz hardcodeado | `.yahpos.cl` en SQL, no en env | `032:93`; `038:102` |

**Propagación de `x-store-*` (cierra el "A VERIFICAR" de la comparativa).** El proxy escribe el contexto en `response.headers` (`proxy.ts:174-181`) y los layouts lo leen con `headers()` del request. En Next 16 instalado, `resolve-routes.js:413-467` copia los headers de la respuesta del middleware al request (`req.headers[key] = value`), y el override de `x-middleware-request-*` reemplaza el valor del cliente. **Conclusión [E]:** en hosts de tienda el render sí ve `store_id` y el spoofing se neutraliza; el hueco real es el **dominio raíz**, donde no se resuelve tienda y el proxy copia los headers entrantes sin borrar (`proxy.ts:55`). Impacto: branding/tier/UI, no datos. **Prueba runtime [A VERIFICAR].**

<a id="env-deploy"></a>
### 2.6 Env, deploy y CI/CD

- **Variables de entorno: 31 globales, 0 por tenant** (`env.ts:128`, `ENV_SPEC`). Los secretos por tenant **no viven en env**: viven cifrados en DB (`settings`, `sii_config`), que es el patrón correcto.
- **Claves globales:** una `SUPABASE_SERVICE_ROLE_KEY` (`supabase.ts:25-31`), una `SII_ENCRYPTION_KEY` (`env.ts:208-216`; `crypto.ts:16-35`), un Redis (`ratelimit.ts:110-131`), una cuota de OpenAI/Gemini. Rotar cualquiera afecta a todos los tenants.
- **Deploy:** un solo proyecto Vercel por environment (`deploy.yml:8-12,41-55`), un Supabase por entorno (`DEPLOY.md:40-57`), un build para todas las tiendas. Preview = staging lógico; en `*.vercel.app` no hay tenant y todo redirige al root salvo `/api/ping|health` (P1-19).
- **Pipeline:** preflight env → build → migraciones → deploy → smoke (`deploy.yml:79-85`). Migraciones aplicadas a la DB compartida: blast radius = todas las tiendas. **41 archivos** en `supabase/migrations/` (39 versionados en `main`; `041` y `042` existen sólo como archivos sin trackear en el árbol de trabajo compartido y **no forman parte de este commit**); **1 solo rollback** en `supabase/rollbacks/`.
- **Reproducibilidad:** `stores`, `profiles`, `products`, `orders`, `settings` y `store_api_keys` **no tienen `CREATE TABLE` en ninguna migración**; sólo `user_stores` (`017:15`). Existe un baseline de laboratorio en `supabase/verify/041/00_baseline.sql` (untracked, declarado "NO es una migración"), que mitiga parcialmente la prueba local pero no el bootstrap real. No hay `supabase/config.toml` ni stack local.
- **Jobs:** 0 crons (`vercel.json` sin `crons`), 0 edge functions (`supabase/functions/` no existe), sin cola. El envío DTE corre dentro del request con 5 reintentos y backoff (`envio.ts:151-210`).
- **Observabilidad:** 0 APM (ni Sentry ni OTEL); 213 llamadas `console.*` en `src/**/*.ts`, **sólo 2 mencionan el tenant**; `internalError()` genera `errorId` sin `store_id` (`api-utils.ts:30-34`); rate limit por IP, no por tienda (`ratelimit.ts:110-131`).

<a id="sii"></a>
### 2.7 Folios, CAF y certificados (SII/DTE)

- **Dónde se inyecta el tenant:** todas las rutas `/api/sii/**` derivan `store_id` de `profiles.store_id`, nunca del body (`api-utils.ts:41-68`; rutas inline `sii/caf/route.ts:30-52`, `sii/enviar/route.ts:21-36`, `sii/certification/route.ts:107-130`). Cada request construye su propio `SiiEngine`; no hay singleton que mezcle configuración.
- **Motor:** `initForStore(storeId)` filtra `sii_config` por `store_id` con cliente service-role y filtro explícito (`engine.ts:89-103`); el `RUTEmisor` del payload se **sobrescribe** con el de la tienda (`engine.ts:376-381`); el CAF se valida contra RUT, tipo, rango y vigencia de 6 meses antes de timbrar (`caf.ts:61-124`, `engine.ts:390-403`); el RUT del certificado se compara con `rut_emisor` y la vigencia es fail-closed (`emisor-config.ts:157-162`, `signer.ts:71-79`).
- **Folios:** `sii_folios` por `store_id`, con `tipo_dte`, rango, `folio_actual` y `caf_xml` (`006:85-96`). `get_next_folio(p_store_id, p_tipo_dte)` es `SECURITY DEFINER`, bloquea con `FOR UPDATE` e incrementa en la misma transacción (`007:4-46`), **pero no valida que `p_store_id` sea la tienda del llamador**. `reserve_folios` sí valida membresía (`029:21-23`) y está disponible para `authenticated`. **En vivo ([§2.10](#verificacion-vivo)):** `anon` recibe `42501` al invocarla y los controles confirman que 039 está aplicada; hoy hay barrera, pero es un `GRANT`, no un chequeo de membresía.
- **CAF:** se guarda cifrado con AES-256-GCM (`encodeCaf` → `encrypt`, `caf-ingest.ts:152-170`), pero `decodeCaf` **tolera texto plano** (`caf-store.ts:19-23`) y no hay `CHECK` de formato ni migración de datos verificada. Las APIs no devuelven `caf_xml` (`sii/caf/route.ts:93-98,125-130`), pero la base sí lo expone a cualquier `authenticated` de la tienda por PostgREST. **En vivo:** 6 filas en `sii_folios`, **0 en texto plano** y 6 cifradas `02:` ([§2.10](#verificacion-vivo)).
- **Certificados:** `sii_config.certificado_pfx_encrypted` + `certificado_password_encrypted` (`006:78-79`), cifrados con la clave global; el GET excluye las columnas cifradas (`sii/config/route.ts:44-45`) y el POST las borra de la respuesta (`:130-138`). No hay rotación automática ni alerta de vencimiento: `certificado_expira` existe pero no se calcula (`006:81`).
- **Emisión y envío:** cadena `store_id` → config → RUT → CAF → firma → sobre → host por ambiente → archivo bajo `${storeId}/…` (`engine.ts:440-443,451,522-527,610-611`; `envio.ts:95-99,124-131`). Idempotencia por `(store_id, idempotency_key)` (`041:145-147`) y claim optimista de reintento (`dte-repository.ts:201-217`); **041 no está aplicada [A VERIFICAR]**.
- **Storage:** 5 buckets; `sii-xml-archive` y `sii_files` con policies por carpeta (`038:226-238`), pero **ningún `insert into storage.buckets` los crea**: el flag `public` queda fuera de versionado (P2-9). `invoice-files` no tiene policies (sólo service-role). **En vivo:** ambos buckets existen con `public=false`.

<a id="storage-obs"></a>
### 2.8 Storage, jobs y observabilidad

- **Storage operativo:** escrituras con path `= get_store_id()` en `site-assets`, `sii_files`, `sii-xml-archive` y `store-logos` (`038:216-256`). `public_read_store_logos` sigue viva hasta aplicar 040 (P1-10).
- **Estado de cliente:** segmentado por tienda en `localStorage` con prefijo `yahpos-tenant:<storeId>:` (`tenant-state.ts:3-12`); el pool de folios offline vive ahí y es manipulable desde devtools (P2-10).
- **Jobs:** sin cron/worker/cola; el DTE se emite y envía dentro del request. No hay estado de worker que mezcle tenants, pero un timeout de plataforma afecta la emisión de cualquier tienda (P1-18).
- **Observabilidad:** sin tenant id en logs ni trazas; sin métricas ni cuotas por tenant; rate limit por IP. Un incidente cross-tenant no se puede reconstruir desde logs (P1-16).

<a id="correcciones"></a>
### 2.9 Correcciones y reconciliación respecto de los insumos

| Punto | Borrador/comparativa previa | Estado consolidado | Evidencia |
|---|---|---|---|
| Identidad RLS | "usa `auth.get_store_id()` con `user_metadata.store_id` del JWT" | **Corregido:** `public.get_store_id()` lee `profiles.store_id` desde 025; el JWT es legacy | `025:10-18` |
| `domain_verified` | "no existe / DDL pendiente (042)" | **Corregido:** la columna existe en `042:75`; el riesgo es que la RPC no la exige | `042:75`; `038:100-105` |
| `x-store-*` response vs request | "P0 A VERIFICAR: los layouts no verían el header" | **Resuelto [E]:** Next 16 copia los headers del proxy al request; sólo queda spoofing en dominio raíz | `resolve-routes.js:413-467`; `proxy.ts:55,174-181` |
| Número de policies | "~97 `CREATE POLICY`" | **Corregido dos veces:** la v1.0 dijo 78 sentencias / 49 vigentes (subconteo por parseo línea a línea); la v1.1 da **94 sentencias (91 en `main`)**, 9 dentro de bloques `DO`, y **58 netas** (51 `public` + 7 `storage.objects`) | `grep -ic "create policy"` + parseo por orden de aplicación (§2.3) |
| CAF en texto plano | infra P0-5 vs SII P1-6 | **Reclasificado a P1-1** con rationale: no es cross-tenant por sí solo y hoy no hay filas legacy (0/6 en vivo, §2.10); queda como defensa en profundidad (re-cifrado + `CHECK`) | §4, §2.10 |
| Nº de migraciones | "41" vs "42" | **Precisado:** 41 archivos en el árbol de trabajo (39 versionados en `main` + 041/042 untracked); `main` tiene 39 | `git ls-files` + `ls` |


<a id="verificacion-vivo"></a>
### 2.10 Verificación en vivo (ronda de validación, sólo lectura)

Sondeos contra el proyecto Supabase `bddpzqayurvhgpllykku` vía PostgREST/Storage con `service_role` y `anon` (tarjeta `t_f467548f`; sin `psql`, sin PAT de Supabase y sin `TEST_USER_PASSWORD`, por lo que el catálogo `information_schema`/`pg_policies` **no** fue accesible). Cero DDL/DML; ningún secreto impreso.

| # | Qué se probó | Resultado | Veredicto |
|---|---|---|---|
| 1 | `get_next_folio` como `anon` | `401` / `pgcode 42501` «permission denied for function». Controles: `anon` sí ejecuta `get_store_by_domain` (200) y `GET /stores` (200); `service_role` 4/4 helpers (200) | **P0-7 descartado**: el `REVOKE` está vigente |
| 2 | 039 aplicada | `anon` → `es_admin`, `current_user_role`, `get_store_id`, `get_merchant_id` = `42501` **4/4**; `service_role` = 200 4/4. Sólo 039 revoca esas cuatro | **039 aplicada**; `039:6` es comentario obsoleto |
| 3 | Grants de tabla `sii_*` para `anon` | `42501` en `sii_folios`, `sii_config`, `sii_certification_cases`, `sii_documents`, `sii_logs` (5/5) | Estado **no reproducible desde el repo** (ninguna migración revoca `anon` ahí) |
| 4 | CAF en reposo | 6 filas: 0 `LIKE '<%'`, 6 `LIKE '02:%'`, 0 NULL | **Sin CAF legacy en claro** hoy |
| 5 | Buckets SII | `sii-xml-archive` y `sii_files` existen con `public=false` | **Sin fuga de XML por URL** |
| 6 | 041 aplicada | `sii_document_events` → `404 / PGRST205`; `sii_documents` con 73 filas proviene de `006`, no de 041 | **041 NO aplicada**: P1-5 confirmado |
| 7 | Prueba negativa con sesión `cashier` | no ejecutable (sin contraseña de usuario; acuñar sesión por Admin API escribiría en `auth`) | **Sigue abierto** |

**Lo que esta ronda cambia en el análisis:** convierte un P0 condicional en deuda defensiva (P0-7), rebaja dos gaps sin material expuesto (P1-1, P2-9), confirma dos que estaban «A VERIFICAR» (P1-5, P1-7) y agrega un hallazgo estructural: **los grants vivos de `anon` no se pueden reconstruir desde las migraciones** (P0-6), lo que obliga a dumpear catálogo antes de tocar policies.

---

<a id="comparacion"></a>
## 3. Comparación y patrón recomendado

<a id="vercel"></a>
### 3.1 Vercel Platforms (multi-tenant Next.js)

- **Resolución de tenant:** tres estrategias en `proxy.ts` (subdominio, dominio custom por lookup, path). El proxy debe **borrar** el `x-tenant-id` entrante y reinjectarlo en el **request** (`NextResponse.next({ request: { headers } })`); setear `response.headers` no es visible para Server Components ([concepts](https://vercel.com/docs/platforms/multi-tenant-platforms/concepts)).
- **Aislamiento de datos: no existe a nivel de plataforma.** El `tenantId` va en cada query; es responsabilidad de la app. La única separación real es **multi-project** (un proyecto y deployment por tenant, con env y datos aislados) ([multi-project](https://vercel.com/docs/platforms/multi-project-platforms/concepts)).
- **Dominios/TLS:** wildcard por nivel (un certificado, no cubre `docs.tenant.acme.com`), challenge DNS/TXT, API de dominios con `verified:false` → verify; PSL recomendada si los tenants publican contenido ([configuring domains](https://domains.vercel.com/docs/platforms/multi-tenant-platforms/configuring-domains)).
- **Secretos:** env vars por **proyecto + environment**, no por tenant; cambios exigen redeploy; 64 KB por deployment y 5 KB por variable edge ([environment variables](https://vercel.com/docs/environment-variables)). → Un secreto por tenant obliga a DB/KV o a un proyecto por tenant.
- **Límites:** dominios por proyecto (Hobby 50; Pro soft 100.000), rate limits de API de dominios (100 altas/hora), certificados propios y preview URLs multi-tenant sólo Enterprise ([limits](https://vercel.com/docs/platforms/multi-tenant-platforms/limits)).

**Qué aporta a YAHPOS:** el patrón de borde (borrar e inyectar headers en el request, cachear el lookup host→tenant, ciclo de vida de dominios con TXT, PSL). **Qué no aporta:** aislamiento de datos; YAHPOS ya está por delante con RLS.

<a id="spree"></a>
### 3.2 Spree (e-commerce Rails)

- **Modelo:** `Store` es el límite de tenant; productos, órdenes, canales, mercados y métodos pertenecen a un store ([Stores](https://spreecommerce.org/docs/developer/core-concepts/stores)). Para varias marcas/dominios recomienda **channels dentro de un store**; para SaaS con tenants aislados, el gem `spree_multi_tenant`, que **requiere licencia Spree Enterprise** ([quickstart](https://spreecommerce.org/docs/developer/multi-tenant/quickstart)).
- **Aislamiento:** row-level por `tenant_id` + `default_scope` de ActiveRecord, **no de base**. `insert_all`/`upsert_all` **no** aplican el scope y exigen `tenant_id` manual; los staff users son compartidos entre tenants ([core concepts](https://spreecommerce.org/docs/developer/multi-tenant/core-concepts)).
- **Backups/restore por tenant:** no documentados; requieren tooling propio.

**Qué aporta:** la disciplina de "todo modelo nuevo nace scoped", la separación canal vs tenant y el catálogo de escapes (raw SQL/insert_all) que en YAHPOS equivale a `service_role`, vistas y `SECURITY DEFINER`. **Qué no aporta:** enforcement en la base; YAHPOS ya lo tiene.

<a id="patrones"></a>
### 3.3 Row-level vs schema-per-tenant vs db-per-tenant

| Dimensión | Row-level (`store_id` + RLS) — **actual** | Schema-per-tenant | DB-per-tenant |
|---|---|---|---|
| Aislamiento | Policy en la base, default-deny; el bug típico es policy ausente o rol que la bypasea | Namespace separado; riesgo de `search_path` | Físico; el riesgo pasa al código cross-tenant |
| Migraciones | **Una** ejecución para todos | N ejecuciones / drift entre tenants | N ejecuciones / N servidores |
| Backup/restore por tenant | Difícil (export selectivo); Supabase hace backup **por proyecto** ([backups](https://supabase.com/docs/guides/platform/backups)) | `pg_dump -n` posible | Nativo |
| Costo/operación | Mínimo; densidad máxima ([Azure](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/approaches/storage-data)) | Medio; catálogo y pools crecen con N | Alto; N bases y N backups |
| Noisy neighbor | Débil (cómputo compartido) | Medio | Fuerte |
| Techo práctico | Miles–cientos de miles | Decenas–cientos | Decenas |

> Los techos son órdenes de magnitud de industria, no límites de producto; **A VERIFICAR** contra el plan real de Supabase contratado.

<a id="decision-patron"></a>
### 3.4 Patrón recomendado

**Mantener el pool (una base + RLS por `store_id`) y endurecer el borde, con un escape hatch de silo documentado.** Es el *bridge model* de AWS: densidad y costo de pool, con la posibilidad de mover un tenant a proyecto/base dedicada cuando exija backup/restore o aislamiento regulatorio ([bridge model](https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/the-bridge-model.md)).

Justificación: (a) ya está implementado y probado parcialmente; (b) las alternativas no resuelven ningún requisito verificable hoy; (c) el riesgo residual se ataca con tests de aislamiento, policies por rol y un borde no falsificable, no cambiando de topología.

**Qué adoptar (8 acciones, de la comparativa):**

| # | Acción | Gap que ayuda a cerrar |
|---|---|---|
| R1 | Inyectar `x-store-*` en el **request** y borrar los entrantes | P1-17 |
| R2 | Cachear el lookup host→store (Redis con TTL e invalidación) | P1-16 (performance) |
| R3 | Verificación de dominio con challenge TXT, no sólo CNAME | P1-13 |
| R4 | Registrar el dominio raíz en la Public Suffix List | P1-13 |
| R5 | Suite pgTAP de allow/deny por tabla y rol en CI | P0-3, P1-2 |
| R6 | Inventario explícito de escapes de RLS (`service_role`, vistas, `SECURITY DEFINER`) | P0-1, P0-6 |
| R7 | Separar canal (POS/e-commerce/mayorista) de tenant (store) | P1-6, P2-3 |
| R8 | Runbook de escape hatch de silo por contrato | D-4 |

**Qué evitar:** aislamiento sólo por convención de ORM; confiar en headers del cliente; secretos por tenant en env de Vercel; depender de features Enterprise de Vercel; schema-per-tenant "porque suena más aislado"; DB-per-tenant por defecto; fallbacks silenciosos a "la primera tienda"; asumir que RLS cubre `service_role`, vistas o el owner de la tabla.

---

<a id="gaps"></a>
## 4. Gaps priorizados

**Criterio de severidad:** **P0** rompe el aislamiento entre tenants o el modelo de tenancy, o anula la recuperabilidad; **P1** escalada intra-tenant, debilidad fiscal o de cifrado con impacto alto, o riesgo operativo serio; **P2** higiene, consistencia y drift. Cada gap indica origen (insumo), evidencia, impacto y mitigación. La columna **Fase** enlaza con el [plan](#plan).

<a id="p0"></a>
### 4.1 P0 — rompen el aislamiento o el modelo

<a id="p0-1"></a>
#### P0-1 · Plano privilegiado único y comprometido (`service_role` global)

- **Origen:** backend P0-1 + infra P0-3.
- **Evidencia:** la `SUPABASE_SERVICE_ROLE_KEY` vigente está en el historial público de `github.com/d0blon/YAHPOS` con SHA-256 idéntico a `.env.local` y responde `206 /rest/v1/profiles` y `200 /auth/v1/admin/users` (auditoría previa `t_f2651df2` §2.1). Definición del cliente: `supabase.ts:22-33`. Uso: 30 instanciaciones en 21 archivos; 11 rutas + motor SII (`engine.ts:89-92`).
- **Impacto:** lectura/escritura de las 36 tablas y administración de Auth sin RLS. En las rutas con admin client, el aislamiento depende de `.eq('store_id', …)` manual: un filtro olvidado es fuga total sin red.
- **Mitigación:** rotar `service_role`/JWT secret/PAT y actualizar Vercel + `.env.local`; purgar el historial (`git filter-repo`) y poner `gitleaks` en CI; reducir la superficie service-role moviendo lecturas/escrituras de tenant al cliente de sesión (RLS) y dejando `service_role` sólo para operaciones de plataforma.
- **Fase:** 0 (rotación) y 3 (reducción de superficie).

<a id="p0-2"></a>
#### P0-2 · Alta de usuario con `store_id` arbitrario en `user_metadata`

- **Origen:** backend P0-2.
- **Evidencia:** `handle_new_user()` copia `raw_user_meta_data->>'store_id'` y sólo valida que el UUID exista en `stores` (`038:114-152`). `protect_profile_insert()` sólo anula `store_id` si `current_setting('role') ∈ ('anon','authenticated')` (`038:158-175`) y el INSERT lo ejecuta GoTrue en una función `SECURITY DEFINER`; `protect_store_id_in_metadata()` sólo bloquea UPDATE (`001:115-134`). El `id` de la tienda es público vía `get_store_by_domain` y `x-store-id` (`038:82-110`, `proxy.ts:174`).
- **Impacto:** cualquier persona con email puede auto-asignarse a la tienda que elija; con P0-3 obtiene CRUD total sobre ella.
- **Estado:** **estático fuerte; explotación no ejecutada** (restricción de sólo lectura). La receta de verificación está en el anexo del inventario backend §8.2.
- **Mitigación:** ignorar `store_id` del metadata en `handle_new_user` y resolverlo desde el Host en una RPC autenticada (como ya hace `auth/register`), o exigir token de invitación; extender la protección a INSERT. Probar con usuarios desechables en branch/staging.
- **Fase:** 2.

<a id="p0-3"></a>
#### P0-3 · RLS sin gate de rol: cualquier miembro es administrador de su tienda

- **Origen:** backend P0-3 + SII P1-1 + backend P1-8.
- **Evidencia:** 23 tablas con la policy genérica `store_isolation_policy FOR ALL USING (store_id = public.get_store_id())`, sin `TO` y sin chequeo de rol (`025:20-81` reescribe 21; `002`/`026` aportan las otras dos; SII en `025:65-72`). Probado por auditorías previas: `customer` → INSERT `products` 201, INSERT `payments` 201, DELETE `products` 200/1 fila, UPDATE `orders` 200/1 fila, lectura de 41 `profiles` con email/rut y del ciphertext de claves de pasarela (`t_e9d5a749` H1-H4).
- **Impacto:** dentro del tenant no hay autorización; el rol `customer` es administrador efectivo. Incluye leer/escribir `caf_xml`, `folio_actual`, `rut_emisor`, `environment` y `certificado_pfx_encrypted` por PostgREST. Con P0-2 se vuelve cross-tenant.
- **Mitigación:** helper `has_store_role(text[])` + policies por comando y rol (`select/insert/update/delete`) empezando por `profiles`, `settings`, `store_api_keys`, `sii_*`; `REVOKE` de DML de cliente en tablas fiscales; suite pgTAP allow/deny. La propuesta `041_rls_role_scoped_policies.sql` del adjunto `t_ff460682` sirve de base.
- **Fase:** 3.

<a id="p0-4"></a>
#### P0-4 · Auto-emisión de API keys de tienda → ejecución con `service_role`

- **Origen:** backend P0-4.
- **Evidencia:** `store_api_keys` sólo tiene `store_isolation_policy` (`025:78`), así que un `customer` puede INSERTAR su fila con `scopes:['inventory:write']` (probado 201). `/api/v1/bot/*` confía en la fila y opera con admin client (`v1/bot/inventory/update/route.ts:20-56`).
- **Impacto:** escalada intra-tenant a operaciones service-role sin rol administrativo.
- **Mitigación:** sin INSERT/UPDATE/DELETE de cliente en `store_api_keys`; emisión sólo `service_role`; `created_by`, expiración y rotación; validar rol en el endpoint; rotar claves existentes.
- **Fase:** 2.

<a id="p0-5"></a>
#### P0-5 · Identidad de tenant dividida: Host vs `profiles.store_id`

- **Origen:** infra P0-2 + backend P1-11.
- **Evidencia:** el tenant de catálogo/branding sale del Host (`proxy.ts:167`, `products/route.ts:299-304`); el de todas las escrituras sale de `profiles.store_id` (`api-utils.ts:48-56`, `orders/route.ts:161-166`). El proxy sólo exige coincidencia en `/admin` y `/pos` (`proxy.ts:285-305`); no hay chequeo en carrito/checkout/mis pedidos.
- **Impacto:** un cliente de la tienda A que compra en el storefront de B crea la orden con `store_id = A` y `product_id` de B: pedidos, pagos y PII se contabilizan en el tenant equivocado; los folios SII podrían emitirse en la tienda equivocada. No es lectura cross-tenant, pero rompe la contabilidad y permite "mover" ventas.
- **Mitigación:** en rutas de escritura de cliente, exigir `host_store_id == profiles.store_id` (403 si difieren) o derivar el `store_id` del Host para e-commerce y de `profiles` sólo para staff; test negativo con usuario de A en host de B.
- **Fase:** 2.

<a id="p0-6"></a>
#### P0-6 · Esquema y RLS no reproducibles desde el repo

- **Origen:** infra P0-1 + infra P1-10 + backend P1-9.
- **Evidencia:** `stores`, `profiles`, `products`, `orders`, `settings` y `store_api_keys` no tienen `CREATE TABLE` en ninguna migración (sólo `user_stores` en `017:15`); 8 tablas no tienen DDL de RLS en migraciones; `025:77-78` crea una policy sobre `store_api_keys`, que no existiría en una base limpia. Baseline de laboratorio en `supabase/verify/041/00_baseline.sql` (untracked, no es migración). Sin `supabase/config.toml`. Los **grants** también están fuera de versionado: `anon` recibe `42501` en `sii_folios`, `sii_config`, `sii_certification_cases`, `sii_documents` y `sii_logs` ([§2.10](#verificacion-vivo)), pero **ninguna migración del repo revoca `anon` sobre esas tablas** y `006:98` las crea sin `GRANT`: el estado vivo se ajustó fuera de banda y no se puede reconstruir.
- **Impacto:** no se puede provisionar staging/DR desde el repo; un `db reset` produce una base distinta a producción, incluidas las policies. Bloquea tests de aislamiento reproducibles.
- **Mitigación:** baseline `pg_dump --schema-only` de las tablas faltantes + mover `scripts/*.sql` a migraciones ordenadas; DDL de RLS de las 8 tablas; `supabase/config.toml` y stack local; post-condiciones fail-closed como en 038/042.
- **Fase:** 1.

<a id="p0-7"></a>
#### P0-7 · `get_next_folio` sin chequeo de membresía — **descartado en vivo**, deuda defensiva

- **Origen:** SII P0-1.
- **Evidencia estática:** `get_next_folio(p_store_id, p_tipo_dte)` es `SECURITY DEFINER`, recibe la tienda como parámetro y no la contrasta con `public.get_store_id()` (`007:4-46`). Su única barrera es el `REVOKE` de `032:61-63` / `039:12-13`; el encabezado `039:6` dice «NO APLICADA aún».
- **Evidencia en vivo ([§2.10](#verificacion-vivo), `t_f467548f`):** ese encabezado es **comentario obsoleto**. `anon` → `POST /rpc/get_next_folio` devuelve **`401` / `42501` “permission denied for function”**; los controles descartan un lockout global (`anon` sí ejecuta `get_store_by_domain` → 200 y `GET /stores` → 200; `service_role` → 4/4 helpers 200) y confirman que **039 está aplicada**: `anon` → `es_admin`, `current_user_role`, `get_store_id`, `get_merchant_id` = `42501` en 4/4, y 039 es la única migración que las revoca. **Veredicto: P0 descartado.**
- **Riesgo residual (por eso se mantiene como P1):** `has_function_privilege('authenticated', …)` no se pudo medir en catálogo; la inferencia es fuerte (039 revoca `public, anon, authenticated` en una sola sentencia y sólo concede a `service_role`), pero la función sigue aceptando `p_store_id` arbitrario y la barrera es un `GRANT`, que un `GRANT` futuro, un `ALTER DEFAULT PRIVILEGES` o un restore parcial pueden reabrir.
- **Impacto si se reabriera:** cualquier `authenticated` consume folios de otra tienda y recibe su `caf_xml` (ciphertext `02:` o XML íntegro con `<RSASK>` si la fila fuera legacy; hoy 0/6 legacy).
- **Mitigación:** añadir dentro de la función `IF p_store_id IS DISTINCT FROM public.get_store_id() THEN RAISE EXCEPTION`, el mismo patrón de `029:21-23`, para que la autorización no dependa de un `GRANT`; dejar una aserción en CI (`has_function_privilege` = `false` para `anon` y `authenticated`).
- **Fase:** 0 (guard) y 4 (aserción permanente).

<a id="p0-8"></a>
#### P0-8 · Una sola clave de cifrado para todos los tenants

- **Origen:** infra P0-4 + SII P1-3.
- **Evidencia:** `SII_ENCRYPTION_KEY` única y global, sin derivación por `store_id` ni KMS (`crypto.ts:16-35`); relleno/truncado silencioso a 32 bytes fuera de producción (`crypto.ts:23-25`); `docs/env.md:45` documenta un entorno con clave de 12 caracteres. Rotación manual con `scripts/rotate-sii-encryption-key.mjs:21-29`, que re-cifra todas las tiendas en una corrida.
- **Impacto:** compromiso de la clave = todos los PFX, passwords de certificado y credenciales de pago de todos los tenants; rotación con ventana de riesgo global.
- **Mitigación:** derivar clave por tenant (`HKDF(master, store_id)`) o envelope encryption con DEK por tienda; fallar cerrado si `NODE_ENV !== 'production'` y la clave no mide 32; rotar; versionar el identificador de clave en el ciphertext.
- **Fase:** 4.

<a id="p1"></a>
### 4.2 P1 — escalada intra-tenant, riesgo fiscal u operativo alto

| ID | Gap | Evidencia | Impacto | Mitigación | Fase |
|---|---|---|---|---|---|
| <a id="p1-1"></a>**P1-1** | CAF legacy en texto plano en reposo | `decodeCaf` acepta `<…` (`caf-store.ts:19-23`); `006:85-96`; sin `CHECK` ni migración de datos | El CAF contiene la clave privada RSASK con la que se firma el TED; cualquier lectura de la fila (P0-3) o backup la expone. **En vivo: 0/6 en texto plano** ([§2.10](#verificacion-vivo)) → sin material expuesto hoy; queda como defensa en profundidad | Re-cifrar filas legacy con el script existente (`rotate-sii-encryption-key.mjs:166`), luego `CHECK (caf_xml LIKE '02:%')`; contar formatos antes/después (anexo SII §9.4) | 4 |
| <a id="p1-2"></a>**P1-2** | `sii_documents` borrable/editable por cualquier `authenticated` | `041:356-358` (grant DML) + policy `FOR ALL` sin rol `041:322-327`; **041 no está aplicada en vivo** ([§2.10](#verificacion-vivo)), así que hoy manda la policy `FOR ALL` de `025:67-68` y el riesgo depende de grants que no se pudieron leer | Un DTE aceptado puede alterarse o eliminarse desde el navegador; rompe trazabilidad legal (6 años) | `REVOKE DELETE, UPDATE` para `authenticated`; mutaciones sólo por rutas con `service_role` o funciones con claim de rol | 3 |
| <a id="p1-3"></a>**P1-3** | Certificación emite DTEs reales con folios fijos y sin marca de prueba | `sii/certification/route.ts:14-53` (folios 1,1,2,3), `:136` (emisión sin `metadata.test`), `:143` (envío al SII) | En `production` emitiría documentos reales no solicitados con folios ya usados | Usar `metadata.test=true` y folio 0 como `wizard/prueba/route.ts:63-67`, o aislar los folios fijos con la marca de prueba que excluye el índice `030:4-6` | 4 |
| <a id="p1-4"></a>**P1-4** | Folio preasignado sin contraste con `folio_actual` | `engine.ts:351-374`; entrada desde POS en `sync/route.ts:93` | Saltos y colisiones diferidas entre terminales; folios gastados o duplicados | Rechazar folios `< folio_actual` o fuera de un lote reservado por terminal; exigir `idempotency_key` | 4 |
| <a id="p1-5"></a>**P1-5** | Migración 041 no aplicada mientras el código la usa | `041:46,55,145-147,197`; `openapi.json` sin `idempotency_key`; `dte-repository.ts:146-179` ya la usa. **Confirmado en vivo:** `sii_document_events` → `404 / PGRST205` ([§2.10](#verificacion-vivo)) | El working tree SII falla o pierde idempotencia/eventos al desplegar | Aplicar 041 en staging y producción con verificación; bloquear el deploy del código SII hasta que exista la columna | 4 |
| <a id="p1-6"></a>**P1-6** | `store_id` nullable/sin FK y borrado que deja huérfanos | 18 nullables, 14 sin FK (OpenAPI); `delete_store` borra 17 tablas y deja 12 con datos de tenant (`031:77-126`) | Filas invisibles (fail-closed pero perdidas); integridad no garantizada; datos huérfanos tras borrar una tienda | Backfill, `SET NOT NULL` donde el negocio lo permita, FK `ON DELETE CASCADE` (o `SET NULL` en auditoría), índices; completar `delete_store` o prohibirlo | 1 |
| <a id="p1-7"></a>**P1-7** | `delete_store` trata a cualquier `owner` como rol de plataforma | `031:51-63`; mitigado por el `REVOKE` de `039:17-18`, y 039 **está aplicada** en vivo ([§2.10](#verificacion-vivo)) | Un owner de A podría borrar B si el REVOKE no está aplicado o se revierte | Exigir `is_platform_role()` y membresía explícita; mantener el REVOKE | 3 |
| <a id="p1-8"></a>**P1-8** | `stores.config` y PII de `profiles` expuestos intra-tenant | `stores` policy sin filtro de columnas (`038:69-72`); `profiles` con `store_isolation_policy` OR (`025:54`, `038:54-56`) | Cualquier miembro lee `supervisorPin` y email/rut/teléfono de toda la tienda | Vista `stores_public` o policy por columnas; separar `profiles_select_self/staff/manage`; sacar `supervisorPin` de `stores.config` | 3 |
| <a id="p1-9"></a>**P1-9** | 19 rutas mutantes sin gate de rol (remediación sólo en worktree) | Lista en inventario backend P1-5; `withAuth({roles})` sólo existe en el worktree (`api-utils.ts:34-68`); HEAD sólo valida sesión+tienda | Un `customer` opera POS, catálogo y pagos por API | Aplicar `withAuth({roles})` con la matriz `api-utils.ts:5-17` en las 19 rutas; commitear y testear | 3 |
| <a id="p1-10"></a>**P1-10** | Migración 040 no aplicada | `anon` ejecuta `is_platform_role()` (200 false); `public_read_store_logos` viva; `audit_sensitive_changes()` sin `pg_temp` (`040:87-125,155-178,320-371`) | Superficie innecesaria para `anon` y lectura pública de logos | Aplicar 040 (idempotente, fail-closed) en staging y verificar catálogo | 3 |
| <a id="p1-11"></a>**P1-11** | Cambio de plan sin pago: la remediación cita una migración inexistente | PATCH de `subscriptions` bloqueado en worktree (`:53-74`) invocando "REVOKE de migración 042"; 042 no toca `subscriptions` (`042:75`) | El cierre es real por RLS, pero el control citado no existe y no está commiteado; riesgo de reabrir el vector | Crear la migración real (`REVOKE INSERT/UPDATE/DELETE ON public.subscriptions FROM authenticated, anon`) y commitear la ruta | 3 |
| <a id="p1-12"></a>**P1-12** | `user_stores.is_active` no se evalúa | Autorización sólo por `profiles.store_id` (`api-utils.ts:48-56`); `delete_store` sí borra `user_stores` (`031:123`) | Desactivar una membresía no revoca nada; modelo de membresía inconsistente | Decidir D-1: `user_stores` con `is_active` como fuente, o eliminar la tabla y documentar `profiles.store_id` | 3 |
| <a id="p1-13"></a>**P1-13** | `domain_verified` no se exige al resolver el host | La RPC filtra por `is_active` y dominio, no por `domain_verified` (`038:100-105`); verificación sólo CNAME (`verify-dns/route.ts:14-27`) | Un tenant declara un dominio ajeno que apunte a la plataforma y se sirve su tienda: domain takeover | Exigir `domain_verified` en la RPC; challenge TXT de ownership; marcar `verified:false` al alta y resetear al cambiar dominio | 5 |
| <a id="p1-14"></a>**P1-14** | Dominio raíz hardcodeado en SQL y `NEXT_PUBLIC_ROOT_DOMAIN` decorativa | `.yahpos.cl` en `032:93` y `038:102`; `NEXT_PUBLIC_ROOT_DOMAIN` sólo lo usan `verify-dns` y el panel | Cambiar de dominio exige migración; riesgo de resolución inconsistente | Llevar el sufijo a configuración versionada (tabla o env leída por la RPC) y una sola fuente de verdad | 5 |
| <a id="p1-15"></a>**P1-15** | Dominios custom y TLS manuales, sin API ni IaC | `stores.ts:180-204`; `DEPLOY.md:251-252` | Deriva de configuración; dominios huérfanos que siguen sirviendo una tienda | Runbook + API de dominios de Vercel (alta/verify/baja) o IaC; borrado automático al cambiar de tenant | 5 |
| <a id="p1-16"></a>**P1-16** | Sin tenant id en logs/trazas/APM y rate limit por IP | 213 `console.*`, 2 con tenant; `internalError()` sin tienda (`api-utils.ts:30-34`); `ratelimit.ts:110-131` | Forense cross-tenant imposible; MTTR alto; vecino ruidoso/NAT compartido | Logger con `store_id` obligatorio y correlation id; APM (Sentry/OTEL); rate limit y cuotas por tenant | 5 |
| <a id="p1-17"></a>**P1-17** | `X-Store-*` falsificable en dominio raíz | `proxy.ts:55` copia headers sin borrar; en raíz no se setea `x-store-*`; lo consumen `layout.tsx:62`, `(shop)/layout.tsx:14`, `(shop)/page.tsx:745` | Spoofing de branding/tier/`initialStoreId` en UI; **no** de datos (RLS y re-resolución por Host) | Borrar `x-store-*` entrantes antes de `NextResponse.next`; inyectar en el request (R1) | 5 |
| <a id="p1-18"></a>**P1-18** | Sin cron ni cola: el DTE se emite dentro del request | `vercel.json` sin `crons`; `DEPLOY.md:34`; `envio.ts:151-210` | Un timeout de plataforma afecta la emisión de cualquier tienda; sin reintento aislado por tenant | Cola/worker por tenant con idempotencia (041) y dead-letter; o aceptar el riesgo y documentarlo | 5 |
| <a id="p1-19"></a>**P1-19** | Migraciones globales sin gating, 1 rollback y preview sin tenant | 41 migraciones; 1 archivo en `rollbacks/`; `proxy.ts:158-186` redirige todo en `*.vercel.app` | Un release de esquema impacta a todas las tiendas; no se prueban flujos E2E de tienda en preview | Migraciones con post-condición y rollback versionado; preview con host de tienda (DNS propio) o bypass explícito de tenant | 5 |

<a id="p2"></a>
### 4.3 P2 — higiene, consistencia y drift

| ID | Gap | Evidencia | Mitigación | Fase |
|---|---|---|---|---|
| <a id="p2-1"></a>**P2-1** | Sin índice general de `store_id` en tablas calientes; `auth_rls_initplan` | §2.2; `025:20-81` (llamadas sin subselect) | `CREATE INDEX (store_id)` y `store_id = (SELECT get_store_id())` | 5 |
| <a id="p2-2"></a>**P2-2** | 3 policies con claim JWT `role` inertes | `034:22`, `034:34`, `003:40` | Dropear; si se quiere rol, claim propio (`user_role`) | 5 |
| <a id="p2-3"></a>**P2-3** | Catálogo global legible y `subscription_tiers` público | `024:40`; `012:21` | Decidir D-2; si el catálogo es de plataforma, documentarlo y no poblarlo con datos de tenant | 5 |
| <a id="p2-4"></a>**P2-4** | Tablas muertas/legacy con PII | `store_settings` (`scripts/setup_saas_table.sql:2`); `users` (`036:107-111`) | `DROP TABLE` o documentar deprecación; exportar PII si hiciera falta | 6 |
| <a id="p2-5"></a>**P2-5** | Roles fuera del CHECK: `superadmin` y `staff` DELETE `role='user'` | `010:5-8`; `038:11-21`; `api/staff/route.ts:147-151` | Alinear enum/CHECK; usar `is_active=false` en vez de rol | 6 |
| <a id="p2-6"></a>**P2-6** | Writes que no revalidan FK lógicas | `api/cash-movements/route.ts:69-77`; `api/products/route.ts:467-473`; `api/admin/inventory/adjustments/[id]/approve/route.ts:103-110` | Validar `session_id`/`branch_id`/`id` contra el `store_id` de sesión en el propio write | 6 |
| <a id="p2-7"></a>**P2-7** | `verify-dns` sin auth (SSRF-lite) | `api/verify-dns/route.ts:7-33` | Exigir sesión developer + rate limit | 5 |
| <a id="p2-8"></a>**P2-8** | `DEVELOPER_EMAILS` hardcodeado como bypass de RBAC | `constants.ts:1-5`; `proxy.ts:259`; `api/auth/callback/route.ts:85` | Derivar de `profiles.role='developer'` | 5 |
| <a id="p2-9"></a>**P2-9** | Buckets SII sin creación versionada; flag `public` fuera de IaC | `038:226-238` (policies, sin `insert into storage.buckets`) | Migración que cree los buckets con `public=false`; verificar en vivo | 4 |
| <a id="p2-10"></a>**P2-10** | Pool de folios offline manipulable en `localStorage` | `siiStore.ts:19-35,113-134` | Reservas firmadas por terminal o validación server-side del lote | 4 |
| <a id="p2-11"></a>**P2-11** | `liberarFolio` no atómico con el INSERT | `engine.ts:182-192` | Devolver folio dentro de la misma transacción o tabla de reservas | 4 |
| <a id="p2-12"></a>**P2-12** | Rama `developer` inalcanzable en visores XML/PDF | `sii/documentos/[id]/xml/route.ts:41-55`; `pdf/route.ts:37-51` | Unificar con `createAdminClient()` + `is_platform_role()` si soporte necesita cross-store | 4 |
| <a id="p2-13"></a>**P2-13** | `SII_BASE_URL` sin allowlist | `envio.ts:129-130` | Allowlist de hosts del SII salvo `NODE_ENV=test` | 4 |
| <a id="p2-14"></a>**P2-14** | API keys con SHA-256 sin pepper ni metadatos de rotación | `v1/bot/products/route.ts:14-37` | Pepper por entorno, `last_used_at`, `expires_at`, rotación | 5 |
| <a id="p2-15"></a>**P2-15** | Higiene operativa diversa | HSTS `includeSubDomains` (`next.config.ts:77-82`); `db:migrate` default staging (`package.json:22-23`); sin `supabase/config.toml`; fallback MOCK de catálogo (`(shop)/page.tsx:806-816`); soporte global (`env.ts:177-196`) | Documentar/ajustar cada punto; prohibir el fallback MOCK en producción | 5 |

<a id="resumen-gaps"></a>
### 4.4 Resumen numérico

| Severidad | Nº | Distribución por tema |
|---|---|---|
| **P0** | **7 vigentes** (+1 descartado en vivo) | 1 credencial/plano privilegiado, 1 alta de usuario, 1 autorización RLS, 1 API keys, 1 identidad Host/perfil, 1 reproducibilidad, 1 cifrado. **P0-7** (`get_next_folio`) se descartó con evidencia en vivo y baja a deuda defensiva |
| **P1** | **19 (+1)** | 5 fiscales, 7 autorización/datos, 4 dominios/borde, 3 operación/plataforma; +1 folios (ex P0-7) |
| **P2** | 15 | 5 datos/autorización, 2 borde, 5 SII, 2 operación, 1 rendimiento |

**Rebajas por evidencia en vivo:** **P1-1** (CAF en texto plano) y **P2-9** (flag `public` de buckets) no tienen material expuesto hoy — 0/6 CAF en claro y `public=false` en ambos buckets — pero se mantienen como gaps de defensa en profundidad e IaC. **Confirmaciones por evidencia en vivo:** P1-5 (041 no aplicada) y P1-7 (REVOKE de 039 vigente).

---

<a id="plan"></a>
## 5. Plan de hardening por fases

**Orden:** 0 (contención) → 1 (base reproducible) → 2 (puertas de entrada) → 3 (RLS por rol) → 4 (SII/fiscal) → 5 (borde, dominios y operación) → 6 (higiene). Las fases 1 y 2 pueden solaparse; la 4 no debe empezar sin 0 y 1.

**Escala de esfuerzo:** S < 1 día · M 1–3 días · L 1–2 semanas (una persona con contexto del repo).
**Riesgo de cambio:** probabilidad de romper flujos existentes y necesidad de coordinación con el dueño.

<a id="fase-0"></a>
### Fase 0 — Contención (inmediata)

**Objetivo:** quitar las llaves maestras del tablero y verificar la única barrera del RPC de folios.

| Orden | Work package | Gaps | Acciones | Esfuerzo | Riesgo | Criterio de éxito verificable |
|---|---|---|---|---|---|---|
| 0.1 | Rotación de credenciales | P0-1 | Rotar `service_role`, JWT secret, PAT de Supabase y claves de proveedores; actualizar Vercel y `.env.local`; purgar historial con `git filter-repo`; `gitleaks` en CI | M | **Alto** (rompe despliegues con clave vieja; coordinar ventana) | La clave anterior responde 401; la nueva funciona en staging y producción; `gitleaks detect` = 0 findings; `vercel env ls` no muestra la clave vieja |
| 0.2 | Blindar `get_next_folio` (**verificación ya hecha**) | P0-7 | **Hecho:** `anon` → `42501` y 039 comprobada aplicada ([§2.10](#verificacion-vivo)). **Falta:** medir `has_function_privilege` para `authenticated` en catálogo y agregar el guard de membresía dentro de la función, para que la autorización no dependa del `GRANT` | S | **Medio** (toca RPC de folios; requiere autorización del dueño) | `has_function_privilege('authenticated', …)` = `false` (aserción en CI); RPC con `p_store_id` ajeno → exception incluso con `EXECUTE` concedido; emisión propia sigue funcionando |
| 0.3 | Congelar el deploy del working tree SII | P1-5 | No desplegar `src/lib/sii/**` nuevo hasta aplicar 041; dejar la migración en el pipeline con verificación | S | **Bajo** | El deploy de SII queda bloqueado por un check explícito (workflow o checklist) hasta que `idempotency_key` exista en vivo |

**Gate de salida:** ninguna credencial comprometida activa; `get_next_folio` cerrado o con guard; deploy SII congelado.

<a id="fase-1"></a>
### Fase 1 — Base reproducible y de pruebas

**Objetivo:** poder crear una base equivalente a producción y correr tests de aislamiento en CI.

| Orden | Work package | Gaps | Acciones | Esfuerzo | Riesgo | Criterio de éxito verificable |
|---|---|---|---|---|---|---|
| 1.1 | Baseline de esquema | P0-6 | `pg_dump --schema-only` de `stores`, `profiles`, `products`, `orders`, `settings`, `store_api_keys` y del resto sin DDL; convertir a migraciones ordenadas; DDL de RLS de las 8 tablas | L | **Medio** (el esquema vivo puede tener drift no documentado) | `supabase db reset` crea 36 tablas y 58 policies (51 en `public` + 7 en `storage.objects`); diff contra OpenAPI sin faltantes; `supabase/config.toml` versionado |
| 1.2 | Integridad de `store_id` | P1-6 | Backfill, `SET NOT NULL` donde aplique, FK `ON DELETE CASCADE`/`SET NULL`, índices por `store_id` | M–L | **Medio-Alto** (filas huérfanas o null bloquean el `SET NOT NULL`; decidir con el dueño) | 0 filas con `store_id` inválido; 27 tablas con FK o excepción documentada; `delete_store` deja 0 huérfanos |
| 1.3 | Arnes de tests | P0-3 (soporte) | pgTAP por tabla y rol (`select/insert/update/delete`) + smoke de RLS en CI; usar `supabase/verify/041` como precedente | M | **Bajo** | Suite verde en CI; un test que falle si se agrega una tabla con `store_id` sin policy |

**Gate de salida:** base local reproducible + suite de aislamiento ejecutándose en CI. Sin esto, las fases 2–4 se validan a ciegas.

<a id="fase-2"></a>
### Fase 2 — Cerrar las puertas de entrada al tenant

**Objetivo:** que nadie pueda *entrar* a un tenant ajeno ni *escribir* en el tenant equivocado.

| Orden | Work package | Gaps | Acciones | Esfuerzo | Riesgo | Criterio de éxito verificable |
|---|---|---|---|---|---|---|
| 2.1 | Alta de usuario | P0-2 | `handle_new_user` ignora `store_id` del metadata; resolverlo desde el Host en RPC autenticada o exigir token de invitación; proteger INSERT | M | **Medio** (registro y OAuth; probar ambos flujos) | Signup con `data.store_id` de otra tienda → perfil con `store_id NULL` o 403; registro legítimo por host sigue funcionando |
| 2.2 | API keys de tienda | P0-4 | Revocar DML de cliente en `store_api_keys`; emisión sólo `service_role`; `created_by`/expiración; rotar keys | S–M | **Medio** (bots existentes usan keys vigentes) | `customer` INSERT `store_api_keys` → 403/42501; `/api/v1/bot/*` sigue funcionando con key emitida por servicio |
| 2.3 | Coherencia Host ↔ perfil | P0-5 | En rutas de escritura de cliente, comparar `host_store_id` con `profiles.store_id` (403 si difieren); test con dos tiendas | M | **Medio** (clientes multi-tienda legítimos; decidir D-1) | Usuario de A en host B intenta crear orden → 403; compra legítima en su tienda → 201 |
| 2.4 | Borde de headers | P1-17 | Borrar `x-store-*` entrantes; inyectar contexto en el request (R1) | S | **Bajo** | Test: request a dominio raíz con `X-Store-Id` falso no altera branding; layout sigue leyendo el store en subdominios |

**Gate de salida:** los tres vectores de entrada (signup, API key, host/perfil) tienen prueba negativa automatizada.

<a id="fase-3"></a>
### Fase 3 — RLS por rol y autorización intra-tenant

**Objetivo:** que `customer` deje de ser administrador y que las tablas fiscales no acepten DML de cliente.

| Orden | Work package | Gaps | Acciones | Esfuerzo | Riesgo | Criterio de éxito verificable |
|---|---|---|---|---|---|---|
| 3.1 | Helper y policies por comando | P0-3, P1-8 | `has_store_role(text[])`; policies `select/insert/update/delete` por rol en `profiles`, `settings`, `store_api_keys`, `sii_folios`, `sii_config`, `sii_documents`; vista `stores_public` sin `supervisorPin` | L | **Alto** (POS, admin y facturación dependen del CRUD amplio) | Matriz pgTAP: `customer` no lee PII ni ciphertext, no escribe `folio_actual`/`rut_emisor`/`environment`; staff conserva sus operaciones |
| 3.2 | DML fiscal | P1-2 | `REVOKE DELETE, UPDATE ON sii_documents FROM authenticated`; mutaciones por service-role o funciones con claim | S | **Medio** (reintentos y anulaciones) | `cashier` DELETE/UPDATE `sii_documents` → 403; flujo de reintento sigue operativo |
| 3.3 | Gates de ruta | P1-9 | `withAuth({roles})` en las 19 rutas mutantes; commitear la remediación que hoy sólo está en worktree | M | **Medio** (clientes con roles no previstos) | Las 19 rutas devuelven 403 con `customer`; smoke de POS/admin verde |
| 3.4 | Integridad de plataforma | P1-7, P1-10, P1-11, P1-12 | `delete_store` exige `is_platform_role` + membresía; aplicar 040; migración real de `subscriptions`; decidir D-1 y aplicar | M | **Medio** | `delete_store` cross-tenant → 403; `anon` no ejecuta `is_platform_role`; `subscriptions` DML de cliente → 403; `user_stores.is_active=false` revoca acceso o la tabla se elimina |

**Gate de salida:** un `customer` no puede leer PII ni secretos, ni escribir tablas fiscales, ni operar rutas de staff.

<a id="fase-4"></a>
### Fase 4 — SII, folios y cifrado

**Objetivo:** cerrar el P0 condicional de folios, sacar el CAF de texto plano y eliminar la emisión accidental de DTEs reales.

| Orden | Work package | Gaps | Acciones | Esfuerzo | Riesgo | Criterio de éxito verificable |
|---|---|---|---|---|---|---|
| 4.1 | Aplicar 041 | P1-5 | Verificar drift, aplicar en staging, correr el arnes local (`supabase/verify/041`), luego producción | M | **Alto** (tablas fiscales; backup obligatorio) | `sii_document_events` existe; `idempotency_key`/`fecha_emision` en vivo; emisión repetida devuelve `idempotente:true` |
| 4.2 | Cifrado por tenant | P0-8 | HKDF por `store_id` o DEK por tienda; fail-closed fuera de producción; rotación versionada | M–L | **Alto** (re-cifrado masivo; ventana de doble lectura) | Test: ciphertext de A no descifra con clave derivada de B; rotación re-cifra y verifica 100% de filas |
| 4.3 | CAF en reposo | P1-1 | Re-cifrar filas legacy; `CHECK (caf_xml LIKE '02:%')`; validar en migración | S–M | **Medio** (filas legacy; backup) | `count(*) WHERE caf_xml LIKE '<%'` = 0; emisión con CAF legacy sigue funcionando post-migración |
| 4.4 | Certificación y folios | P1-3, P1-4 | `metadata.test=true` o folio 0 en certificación; validar folio preasignado contra `folio_actual`/lote | S–M | **Medio** (flujo de certificación del SII) | Certificación no emite DTEs reales fuera de test; folio `< folio_actual` → rechazo; índice `030:4-6` no colisiona |
| 4.5 | Storage y salida | P2-9, P2-10, P2-11, P2-12, P2-13 | Migración de buckets con `public=false`; reservas de folios server-side; `liberarFolio` transaccional; visores developer con admin+rol; allowlist de `SII_BASE_URL` | M | **Medio** | `storage.buckets.public=false`; folio inyectado desde devtools → rechazo; `SII_BASE_URL` fuera de allowlist → error de arranque |

**Gate de salida:** certificación de punta a punta en ambiente de certificación con documentos marcados como prueba; 0 CAF en texto plano; folios ajenos inaccesibles por RPC.

<a id="fase-5"></a>
### Fase 5 — Borde, dominios y operación

**Objetivo:** que el tenant se resuelva de forma verificable y que un incidente se pueda diagnosticar.

| Orden | Work package | Gaps | Acciones | Esfuerzo | Riesgo | Criterio de éxito verificable |
|---|---|---|---|---|---|---|
| 5.1 | Verificación de dominio | P1-13 | Exigir `domain_verified` en la RPC; challenge TXT; resetear al cambiar dominio; PSL para el dominio raíz (R3, R4) | M | **Medio** (puede dejar dominios actuales sin resolver) | Dominio no verificado → no resuelve; takeover con CNAME ajeno → falla; cookie `Domain=.yahpos.cl` no cruza tenants |
| 5.2 | Dominio raíz configurable | P1-14 | Sacar `.yahpos.cl` del SQL; una sola fuente (tabla/env leída por la RPC) | S–M | **Medio** | Cambiar el dominio en configuración no requiere migración; tests de resolución verdes |
| 5.3 | Ciclo de vida de dominios | P1-15 | Runbook + API de Vercel (alta/verify/baja) o IaC; borrado al cambiar tenant | M | **Bajo-Medio** | Alta y baja de dominio quedan registradas; 0 dominios huérfanos en auditoría |
| 5.4 | Observabilidad por tenant | P1-16 | `store_id` obligatorio en logs, correlation id, APM, rate limit/cuotas por tenant (R2) | M | **Bajo** | 100% de errores de API con `store_id`; dashboard por tenant; límite por tienda activo |
| 5.5 | Jobs y releases | P1-18, P1-19 | Cola/worker por tenant o riesgo aceptado por escrito; migraciones con post-condición y rollback; preview con host de tienda | L | **Alto** (introduce infra nueva) | Reintento aislado por tenant; rollback probado en staging; E2E de tienda en preview |
| 5.6 | Deuda de datos y políticas | P2-1, P2-2, P2-3, P2-7, P2-8, P2-14, P2-15 | Índices y `(select get_store_id())`; dropear policies inertes; decidir D-2; auth en `verify-dns`; quitar `DEVELOPER_EMAILS`; pepper de API keys; higiene operativa | M | **Bajo** | Plan de consultas sin `auth_rls_initplan`; 0 policies con claim `role`; `verify-dns` exige sesión; API keys con expiración |

**Gate de salida:** dominio verificado antes de servir; logs permiten reconstruir un incidente por tenant; releases con rollback probado.

<a id="fase-6"></a>
### Fase 6 — Higiene y cierre

| Orden | Work package | Gaps | Acciones | Esfuerzo | Riesgo | Criterio de éxito verificable |
|---|---|---|---|---|---|---|
| 6.1 | Tablas y roles | P2-4, P2-5 | Dropear `store_settings`/`users` tras exportar; alinear CHECK de roles y `staff` DELETE | S | **Bajo** | 0 tablas muertas; `superadmin` permitido o eliminado del código; borrado de staff usa `is_active` |
| 6.2 | FK lógicas | P2-6 | Validar `session_id`, `branch_id` e `id` contra el `store_id` de sesión en el write | S | **Bajo** | Test negativo con IDs de otra tienda → 403/404 |

<a id="criterios-globales"></a>
### 5.7 Criterios de éxito globales (definición de "hardening terminado")

1. **Aislamiento demostrado:** suite pgTAP con allow/deny por tabla y rol, verde en CI; 0 filas cross-tenant en pruebas negativas; `customer` sin acceso a PII, secretos ni tablas fiscales.
2. **Puertas cerradas:** signup con `store_id` ajeno, API key autoemitida y escritura en host ajeno fallan con 403/42501 y tienen test automatizado.
3. **Fiscal:** 0 CAF en texto plano; folios ajenos inaccesibles; certificación marcada como prueba; 041 aplicada.
4. **Reproducibilidad:** `supabase db reset` reproduce 36 tablas y 58 policies (51 en `public` + 7 en `storage.objects`); migraciones con post-condición y rollback.
5. **Operación:** 100% de errores con `store_id`; dominio verificado antes de servir; backup/restore por tenant documentado (o silo ofrecido por contrato).
6. **Credenciales:** 0 secretos en historial; rotación probada; `gitleaks` en CI.

Cada criterio es verificable con un comando o test concreto; ninguno se declara cumplido "por inspección visual".

---

<a id="anexos"></a>
## 6. Anexos

<a id="matriz"></a>
### 6.1 Matriz tabla × RLS

`store_id` y FK son **en vivo** (OpenAPI de PostgREST, proyecto `bddpzqayurvhgpllykku`). RLS/FORCE y policies son **declarativos** (migraciones); el efecto está probado por comportamiento en las auditorías previas, no re-ejecutado aquí. `—` = no aplica o no declarado.

| # | Tabla | `store_id` (vivo) | FK→`stores` | RLS (migración) | FORCE | Policies vigentes (n) |
|---|---|---|---|---|---|---|
| 1 | `admin_finances` | uuid NULL | sí | `011:23` | — | 2 deny (0 acceso cliente) |
| 2 | `ai_usage_logs` | uuid NOT NULL | sí | `002:18` | — | `store_isolation_policy` (1) |
| 3 | `branches` | uuid NULL | **no** | `006:160` | — | `store_isolation_policy` (1) |
| 4 | `cash_movements` | uuid NULL | sí | `006:163` | — | `store_isolation_policy` (1) |
| 5 | `cash_sessions` | uuid NULL | **no** | `001:81` | — | `store_isolation_policy` (1) |
| 6 | `catalogo_global` | — (global) | — | sin DDL | — | 0 + `REVOKE` `038:74` |
| 7 | `catalogo_global_distribuidores` | — (global) | — | sin DDL | — | 0 + `REVOKE` `038:74` |
| 8 | `categories` | uuid NULL | **no** | `001:79` | — | `store_isolation_policy` + `tenant_select_categories` (2) |
| 9 | `inventory` | uuid NULL | **no** | `006:164` | — | `store_isolation_policy` (1) |
| 10 | `master_catalog_products` | — (global) | — | `024:39` | — | `master_catalog_read_all` (1) |
| 11 | `master_catalog_submissions` | `submitted_by_store_id` | sí | `024:49` | — | 2 deny (0 acceso cliente) |
| 12 | `merchants` | — (por usuario) | — | `004:7` | — | `own merchant profile` (1) |
| 13 | `order_items` | uuid NULL | **no** | `001:74` | — | `store_isolation_policy` (1) |
| 14 | `orders` | uuid NULL | **no** | `001:73` | — | `store_isolation_policy` (1) |
| 15 | `payments` | uuid NULL | sí | `006:161` | — | `store_isolation_policy` (1) |
| 16 | `pending_inventory_adjustments` | uuid NULL | sí | sin DDL | — | `store_isolation_policy` (1) |
| 17 | `pos_drafts` | uuid NULL | sí | `001:82` | — | `store_isolation_policy` + `tenant_own_drafts` (2) |
| 18 | `products` | uuid NULL | **no** | `001:72` | — | `store_isolation_policy` + `tenant_select_products` (2) |
| 19 | `profiles` | uuid NULL | **no** | `001:78` | — | 5 (incluye `store_isolation_policy` y 2 con claim inerte) |
| 20 | `security_audit_log` | uuid NULL | **no** | `035:25` | `035:26` | 2 deny (0 acceso cliente) |
| 21 | `settings` | uuid NOT NULL | **no** | `001:77` | — | `store_isolation_policy` (1) |
| 22 | `shifts` | uuid NULL | sí | `006:162` | — | `store_isolation_policy` (1) |
| 23 | `sii_certification_cases` | uuid NOT NULL | **no** | `006:169` | — | `store_isolation_policy` (1) |
| 24 | `sii_config` | uuid NOT NULL | sí | `006:165` | — | `store_isolation_policy` (1) |
| 25 | `sii_documents` | uuid NOT NULL | **no** | `001:87` (041 no aplicada) | `041:320` (no aplicada) | `store_isolation_policy` (1) |
| 26 | `sii_folios` | uuid NOT NULL | **no** | `006:166` | — | `store_isolation_policy` (1) |
| 27 | `sii_logs` | uuid NULL | sí | `001:89` (041 no aplicada) | `041:340` (no aplicada) | `store_isolation_policy` + `System can insert logs` (2) |
| 28 | `store_api_keys` | uuid NOT NULL | sí | sin DDL | — | `store_isolation_policy` (1) |
| 29 | `store_settings` | `id` = store | sí | sin DDL | — | 0 (tabla muerta) |
| 30 | `stores` | — (raíz) | — | sin DDL | — | 5 (tenant, merchant, developer; `026:51,54`) |
| 31 | `subscription_tiers` | — (global) | — | `012:19` | — | `Allow public read USING (true)` (1) |
| 32 | `subscriptions` | uuid NOT NULL | sí | `012:38` | — | `Stores can see their own subscription` (1) |
| 33 | `supplier_product_mappings` | uuid NULL | sí | sin DDL | — | `store_isolation_policy` (1) |
| 34 | `terminals` | uuid NULL | **no** | `001:80` | — | `store_isolation_policy` (1) |
| 35 | `user_stores` | uuid NOT NULL | sí | `017:27` | — | 2 SELECT (self/admin) |
| 36 | `users` | — (legacy) | — | sin DDL | — | 2 deny (0 acceso cliente) |

**Totales (recalculados en v1.1):** 36 tablas · 27 con `store_id` · 13 con FK · 33 tablas `public` con policies (más `storage.objects`) · **51 policies en `public` + 7 en `storage.objects` = 58 netas** si se aplican las 41 migraciones (57 sin 041) · 23 tablas con la policy genérica (21 reescritas en 025 + 2 en 002/026; 24 si se aplica 041 con `sii_document_events`) · 8 tablas sin DDL de RLS en migraciones. El conteo exacto en vivo exige `pg_policies`.

<a id="glosario"></a>
### 6.2 Glosario

| Término | Definición |
|---|---|
| **Tenant** | Tienda (`stores.id`). Unidad de aislamiento lógico; no confundir con canal (POS, e-commerce, mayorista). |
| **`store_id`** | Discriminador de tenant presente en 27 tablas; en RLS se compara contra el perfil de la sesión. |
| **RLS** | Row Level Security de PostgreSQL: policies por fila; sin policy, `default-deny` para roles no privilegiados. |
| **FORCE RLS** | `FORCE ROW LEVEL SECURITY`: aplica RLS también al owner de la tabla. Sin esto, el owner escapa. |
| **Policy** | Regla `USING`/`WITH CHECK` por comando y rol. Combinación de policies permisivas = OR. |
| **`SECURITY DEFINER`** | Función que corre con los privilegios de su dueño; si no valida membresía, puede saltar RLS. |
| **`service_role`** | Rol de Supabase con `BYPASSRLS`; usado por el backend para operaciones de plataforma. |
| **`BYPASSRLS`** | Atributo de rol que ignora RLS. También escapan superusuarios y, sin FORCE, el owner. |
| **CAF** | Código de Autorización de Folios del SII; contiene el rango y la clave privada RSASK para el TED. |
| **Folio** | Número correlativo del DTE dentro de un CAF; su consumo debe ser atómico y por tenant. |
| **DTE** | Documento Tributario Electrónico (boleta, factura, nota de crédito). |
| **PFX** | Archivo PKCS#12 con el certificado digital y su clave privada; se guarda cifrado en `sii_config`. |
| **TED** | Timbre Electrónico del DTE; se firma con la clave del CAF. |
| **Pool / silo / bridge** | Patrones AWS: recurso compartido / dedicado por tenant / mezcla (cómputo compartido + datos dedicados). |
| **PSL** | Public Suffix List; sin ella, una cookie `Domain=.yahpos.cl` puede cruzar subdominios de tenants. |
| **pgTAP** | Framework de tests para PostgreSQL; Supabase lo recomienda para allow/deny de RLS. |
| **JWT** | Token de sesión de Supabase; en este proyecto **no** lleva el tenant (sólo `sub`, `email`, `role`, `user_metadata`). |

<a id="no-verificado"></a>
### 6.3 No verificado (A VERIFICAR)

Reunión de todos los puntos que requieren base viva, runtime o dashboard:

**Cerrados por los sondeos en vivo ([§2.10](#verificacion-vivo)):**

- ~~Aplicación de 039~~ → **aplicada** (revocaciones 4/4 con controles que descartan lockout).
- ~~Aplicación de 041~~ → **no aplicada** (`sii_document_events` → `404/PGRST205`): ya no es duda.
- ~~CAF en texto plano~~ → **0/6**; 6/6 cifradas con prefijo `02:`.
- ~~Flag `public` de los buckets SII~~ → ambos existen con `public=false`.

**Siguen abiertos:**

1. `relrowsecurity` / `relforcerowsecurity` y texto exacto de `pg_policies` (sin PAT ni psql: `information_schema` y `pg_policies` no están publicados en PostgREST).
2. Índices reales sobre `store_id` (sólo declarativos).
3. `has_function_privilege('authenticated','public.get_next_folio(uuid,integer)','EXECUTE')` — no medido; inferido `false` por 039.
4. Grants de tabla para `authenticated` en `sii_folios`, `sii_config`, `sii_certification_cases`, `sii_documents` (sólo se midió `anon`, que da `42501`).
5. Prueba negativa PostgREST con sesión de `cashier` (lectura/escritura de folios): sin `TEST_USER_PASSWORD`.
6. Grants de `anon` que el repo no revoca: ajustes fuera de versionado, no reconstruibles.
8. Explotación end-to-end de P0-2 (signup con `metadata.store_id`): receta incluida, **no ejecutada**.
9. Propagación runtime de `X-Store-Id` falsificado en dominio raíz (verificado a nivel de código de Next, no con servidor levantado).
10. Reproducción runtime del checkout cross-tenant (P0-5).
11. Scope real de variables en Vercel, TLS y dominios de tenant (sin `.vercel/` ni credenciales).
12. Si `@supabase/ssr` setea cookie con `Domain=.yahpos.cl` (riesgo cross-tenant sin PSL).
13. Dominio raíz definitivo: el SQL hardcodea `.yahpos.cl`; confirmar cuál es el vigente.
14. Nota de contexto "sin datos de producción" (2026-11-23).

<a id="trazabilidad"></a>
### 6.4 Trazabilidad de insumos → gaps consolidados

Cada gap de los tres inventarios tiene un destino en este documento. La columna "Destino" permite auditar que no se perdió ninguno.

**Backend/RLS (`INVENTARIO_BACKEND_TENANCY.md`)**

| Origen | Destino | Origen | Destino | Origen | Destino |
|---|---|---|---|---|---|
| P0-1 | P0-1 | P1-1 | P1-6 | P2-1 | P1-17 |
| P0-2 | P0-2 | P1-2 | P1-7 | P2-2 | P2-1 |
| P0-3 | P0-3 | P1-3 | P1-8 | P2-3 | P2-2 |
| P0-4 | P0-4 | P1-4 | P1-8 | P2-4 | P2-3 |
| P1-5 | P1-9 | P1-6 | P1-10 | P2-5 | P2-3 |
| P1-7 | P1-11 | P1-8 | P0-3 | P2-6 | P1-10 |
| P1-9 | P0-6 | P1-10 | P1-12 | P2-7 | P2-4 |
| P1-11 | P0-5 | | | P2-8 | P2-4 |
| | | | | P2-9 | P2-5 |
| | | | | P2-10 | P1-5 |
| | | | | P2-11 | P2-6 |
| | | | | P2-12 | P2-7 |
| | | | | P2-13 | P2-8 |

**Infra/plataforma (`INVENTARIO-INFRA-PLATAFORMA.md`)**

| Origen | Destino | Origen | Destino | Origen | Destino |
|---|---|---|---|---|---|
| P0-1 | P0-6 | P1-1 | P1-13 | P2-1 | P1-14 |
| P0-2 | P0-5 | P1-2 | P1-14 | P2-2 | P2-15 |
| P0-3 | P0-1 | P1-3 | P1-15 | P2-3 | P2-14 |
| P0-4 | P0-8 | P1-4 | P1-16 | P2-4 | P2-15 |
| P0-5 | P1-1 | P1-5 | P1-17 | P2-5 | P2-15 |
| P1-6 | P1-16 | P1-7 | P1-18 | P2-6 | P2-15 |
| P1-8 | P1-19 | P1-9 | P1-19 | P2-7 | P2-15 |
| P1-10 | P0-6 | | | | |

**SII/DTE (`multitenancy-sii-dte.md`)**

| Origen | Destino | Origen | Destino |
|---|---|---|---|
| P0-1 | P0-7 | P1-1 | P0-3 |
| P1-2 | P1-2 | P1-3 | P0-8 |
| P1-4 | P1-3 | P1-5 | P1-4 |
| P1-6 | P1-1 | P2-1 | P2-9 |
| P2-2 | P2-10 | P2-3 | P2-11 |
| P2-4 | P2-12 | P2-5 | P2-13 |

**Recomendaciones de la comparativa:** R1 → Fase 2.4 · R2 → Fase 5.4 · R3/R4 → Fase 5.1 · R5 → Fase 1.3 · R6 → Fases 1 y 3 · R7 → D-2/P1-6 · R8 → D-4/Fase 5.5.

<a id="fuentes"></a>
### 6.5 Insumos y fuentes

**Insumos consolidados (workspace del tablero, 2026-11-23):**

| Insumo | Archivo | Autor | Estado |
|---|---|---|---|
| Inventario backend/RLS | `INVENTARIO_BACKEND_TENANCY.md` (430 líneas) | `backend` | Adjunto a `t_ad49d0ca` |
| Inventario infra/plataforma | `INVENTARIO-INFRA-PLATAFORMA.md` (296 líneas) | `infra` | Adjunto a `t_88f01a5b` |
| Auditoría SII/DTE | `multitenancy-sii-dte.md` (381 líneas) | `sii` | Adjunto a `t_02e18177`; copia en `docs/operacion/multitenancy-sii-dte.md` (sin commitear) |
| Comparativa Vercel/Spree | `multitenancy-comparativa-vercel-spree.md` (207 líneas) | `arquitecto` | Adjunto a `t_59572621`; copia en `docs/propuestas/` (sin commitear) |
| Verificación en vivo (sólo lectura) | `VERIFICACION-SII-EN-VIVO.md` (workspace) | `infra` | Tarjeta `t_f467548f`: 3/6 ítems cerrados; 3 bloqueados por falta de SQL de catálogo. Resumido en §2.10 |

**Fuentes primarias externas consultadas por la comparativa:** Vercel (Platforms, multi-project, dominios, env vars, límites), Spree (stores, multi-tenant core concepts, quickstart, arquitectura), AWS SaaS Lens (silo/pool/bridge), Azure Architecture Center (storage/data, SaaS tenancy patterns), PostgreSQL 5.10 (RLS), Supabase (RLS y backups). Enlaces completos en `docs/propuestas/multitenancy-comparativa-vercel-spree.md` §10.

**Fuentes internas de comportamiento:** auditorías `t_ff460682` (RLS empírica), `t_e9d5a749` (cross-tenant y escaladas), `t_f2651df2` (auth/authz y service key), `t_91efd342` (migraciones), citadas por los inventarios.

---

*Documento de análisis. No se modificó código de producción, ni SQL, ni `.env.local`, ni certificados. Los sondeos en vivo fueron de sólo lectura (0 DDL/DML, 0 migraciones). Las afirmaciones no verificables están marcadas A VERIFICAR.*
