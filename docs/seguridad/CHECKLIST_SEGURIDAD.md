# Checklist de Seguridad — YAHPOS!

**Versión:** 1.6 (hardening multi-tenant — regla del dueño: todo por `store_id`)
**Fecha:** 2026-11-20
**Alcance:** 20 controles de seguridad del proyecto `austral-market-next` + aislamiento multi-tenant
**Fuente:** 4 auditores independientes (bloques 1-5, 6-10, 11-15, 16-20) + 4 auditores de tenant + gates locales + verificación en vivo vía Supabase Management API + pruebas HTTP/CSP + golden test de firma DTE

---

## 0.1 Hardening multi-tenant (v1.6) — evidencia nueva

| # | Control | Estado | Evidencia clave (real) |
|---|---|---|---|
| T1 | Policies sin scope | ✅ | 0 `USING(true)` sobre datos de tenant; quedan 3 en catálogos/tiers globales con `REVOKE` a anon/authenticated |
| T2 | Aislamiento DB A/B | ✅ | A: 1742 products / 16 categories / 37 profiles; B: 22 / 2; anon: 0 `stores` |
| T3 | Secretos de tenant | ✅ | 8/8 valores cifrados rotados a GCM y descifrables con clave nueva; 3/3 secretos Webpay/Blumi migrados a `settings`; 0 secretos de tienda en `.env.local`; GET de `/api/settings` solo booleanos |
| T4 | Estado compartido | ✅ | persist por store + `__storeId`; merge descarta estado ajeno; cola/pool SII por store; BroadcastChannel por store; SW sin caché `/api/*`; Realtime con `filter store_id` |
| T5 | Escalada de perfil | ✅ | INSERT authenticated con `role=admin` en otra tienda BLOQUEADO; registro con store inválido cae a `null`; con store válido conserva tienda |
| T6 | Storefront sin fuga | ✅ | `/api/products` lee con AdminClient + `.eq('store_id')` resuelto por Host; host sin tienda → 404 (sin catálogo falso) |
| T7 | Regresiones D2 | ✅ | SW post-build: 10 routes estáticos, 0 handlers `/api/`, 0 reglas HTML/RSC; `offlineFolioPool` por store; Realtime POS/cajas con `filter store_id`; build y Jest 76/76 |
| T8 | Datos sin asignar | ⚠️ | 17 perfiles `customer` con `store_id=NULL` y catálogos globales: decisión del dueño |

---

## 0. Tabla final — estado de los 20 controles (v1.5)

"Verde" = **evidencia pasada**, no solo documentación. v1.4 afirmaba 20 ✅ pero la auditoría final encontró afirmaciones falsas y regresiones; se corrigieron los hallazgos accionables y lo no verificable/en vivo se marca ⚠️ con su causa real. Detalle en §2.5.

| # | Control | Estado | Evidencia clave (real) |
|---|---------|--------|-----------------|
| 1 | Oculta claves API | ✅ | Sin secretos en logs; `dev_token` HMAC; 0 `patagonia_dev_active`; `SII_ENCRYPTION_KEY` ahora en `.env.example` |
| 2 | Elimina secretos de Git | ✅ | `.gitignore` + `git log --all` sin `.env`/`.pfx`/`.key` |
| 3 | Usa clave pública de DB | ⚠️ | `createAdminClient()` con guarda en `supabase.ts`; pero `sii/engine.ts`, `sii/emisor-config.ts` y `dev-auth.ts` crean clientes con service key fuera de esa guarda (handoff, no se toca motor DTE sin golden test) |
| 4 | Activa RLS | ✅ | **36/36 tablas RLS+FORCE**; 6 deny policies; trigger anti-escalada (solo UPDATE, ver handoff) |
| 5 | Cifra datos sensibles | ✅ | CAF AES-256-GCM en reposo; 0 CAF planos; golden byte-idéntico; ⚠️ DEK/KMS pendiente; ⚠️ ciphertext del certificado original no recuperable |
| 6 | Fuerza autenticación del servidor | ✅ | `orders` auth-first; 20/20 rutas → 401; sin `audit=true`/`isAudit` |
| 7 | Restringe acceso a registros | ✅ | staff `store_id+rut` + índice; register con scope `store_id` en lookup y delete (fix v1.5); rol antes que body/doc en `sii/caf`, visor XML y PDF |
| 8 | Bloquea manipulación de campos | ✅ | Whitelist de roles; `.strict()` en orders/items/staff/customer-delete; trigger `role`/`store_id`; ⚠️ trigger no cubre INSERT (handoff) |
| 9 | Protege cookies de sesión | ⚠️ | `secure` prod en todos los clientes (fix v1.5: SSO ya no hardcodea `false`); `sameSite=lax`; `dev_token` HMAC 2h. `httpOnly:false` es diseño de Supabase SSR (`createBrowserClient` lee cookies desde JS) — documentado, no se cambia |
| 10 | Hashea contraseñas | ✅ | Supabase Auth + scrypt; salt unificado `encrypt`/`decrypt` (fix v1.5) |
| 11 | Limita intentos de inicio | ✅ | Fail-closed en prod; `400×5 → 429×2` en vivo; ⚠️ IP de `x-forwarded-for` spoofable sin proxy de confianza |
| 12 | Protección contra bots | ✅ | API keys SHA256 + scopes + `rateLimit.public`; ⚠️ errores crudos en 500 de `/api/v1/bot/*` (v1, menor) |
| 13 | Monitoriza consultas de DB | ✅ | `environment` auditado (vía 036); `[REDACTED]` verificado; 0 filas; ⚠️ depende de que 036 esté aplicada |
| 14 | Valida todas las entradas | ✅ | Zod central; 0 `await req.json()`; `customers` DELETE migrado a `parseQuery` (fix v1.5); Jest 10/10 |
| 15 | Escapa contenido del usuario | ✅ | Sin `<script>` inline en impresión; `session-sync` escapa `<`/`>`/`&` y usa nonce (fix v1.5) |
| 16 | Restringe subida de archivos | ⚠️ | PNG/WebP + magic bytes; `.pfx` DER `0x30`; CAF `<CAF`+RUT fail-closed (fix v1.5). Storage policies/buckets no versionados en repo y el código usa `store-logos` (doc viejo decía `site-assets`/`sii_files`) — requiere verificación en vivo |
| 17 | Limita respuestas de API | ✅ | Sin XML en JSON; 0 `select('*')` y 0 `.select()` en `src` (10 + 8 + 1 residuales cerrados en v1.5); `.limit()` en listados; ⚠️ paginación cursor pendiente |
| 18 | Cabeceras de seguridad | ✅ | CSP nonce real por request, `.join('; ')`, sin `unsafe-inline` en `script-src`; 4/4 checks; `SAME_REQUEST_MATCH=True` (un solo request) |
| 19 | Fuerza HTTPS | ⚠️ | `upgrade-insecure-requests` + HSTS + cookies `secure` confirmados. No hay redirect HTTP→HTTPS en el repo (Vercel puede forzarlo en edge, sin evidencia aquí) — corregir en infra o agregar en `proxy.ts` |
| 20 | Escanea dependencias | ✅ | 5 totales: 0 critical / 1 high / 4 moderate; `next-pwa@^10.2.9` sin downgrade; golden byte-idéntico; ⚠️ `serialize-javascript` vía `@rollup/plugin-terser` (cadena Workbox→next-pwa) |

**Resultado:** 15 ✅ + 5 ⚠️ (residuales documentados con evidencia real; ningún control es un ❌ abierto).
**No verificable en repo (handoff):** buckets/policies de Storage, redirect HTTPS en edge, service key en zonas rojas, certificado real (ya comprado, pendiente de cargar), revocación del token.
**Fuera de este resumen:** build type-check de `scripts/**` y lint global 516 problemas — preexistentes, fuera de scope (§2.4).
---

## 1. Propósito

Este documento existe para que **cualquier cambio futuro** vuelva a pasar por los controles aplicables. La regla de oro del proyecto (`AGENTS.md` §0) dice: *seguridad y correctitud antes que velocidad; RLS y auth se verifican en el mismo handoff, nunca después*.

**Cómo usarlo:**

1. Antes de implementar, identificar el **tipo de cambio** (sección 4).
2. Marcar los ítems que aplican.
3. Al terminar, ejecutar la **verificación** de cada ítem (sección 5).
4. Si el cambio toca auth, roles, `store_id` o una tabla con RLS, agregar una **prueba real** (query directa, curl) que confirme el caso positivo **y** el negativo siga bloqueado.

NO dar por terminada una tarea sin el Evidence Gate (build + lint + prueba de seguridad cuando aplique).

---

## 2. Estado actual resumido

> **Estado superado — ver §0 y §2.5 (v1.5).** El resumen histórico de abajo corresponde a la
> revalidación intermedia (12 ✅ / 6 ⚠️ / 2 ❌) que luego se cerró con R1-R9 y,Finalmente,
> finalmente se re-auditó en v1.5: **15 ✅ + 5 ⚠️ / 0 ❌ abiertos**. Los ítems 5 y 7 (CAF plana y staff
> cross-tenant) se cerraron con evidencia real; los ⚠️ actuales son 3/9/16/19 (handoff:
> service key, cookies SSR, buckets/HTTPS) y se detallan en §0 y §2.5.

| Estado (histórico, superado) | Cantidad | Ítems |
|---|---|---|
| ✅ Cumple | 12 | 1, 2, 3, 6, 8, 9, 10, 11, 12, 14, 19, 20 |
| ⚠️ Parcial (residual documentado) | 6 | 4, 13, 15, 16, 17, 18 |
| ❌ Falla (ya cerrados en v1.4/v1.5) | 2 | 5, 7 |

### Prioridad 0 — bloqueantes (arreglar antes de seguir)

| # | Hallazgo | Estado | Ubicación |
|---|---|---|---|
| 6 | Bypass de login con `?audit=true` | ✅ **Corregido** | `src/middleware.ts` |
| 7 | `x-store-id` del cliente con prioridad sobre el perfil | ✅ **Corregido en código** | `api/dashboard/route.ts`, `series/route.ts` |
| 7 | `x-store-id` del cliente escrito con `createAdminClient()` en registro | ✅ **Corregido en código** | `api/auth/register/route.ts` |
| 4/7 | Policies sin scope de tienda + sin FORCE RLS | ✅ **Aplicado y verificado en vivo** | `supabase/migrations/034_security_fix_cross_tenant_and_rls.sql` |
| 20 | 17 vulnerabilidades high+ (`next` critical, `node-forge` high) | ✅ **Corregido** — 0 critical, 1 high residual (ver ítem 20) | `package.json` / lock |

### Prioridad 1 — alto

- ~~Políticas `admin_total` y `manager_profile_access` sin filtro `store_id`~~ → **corregidas** en 034; ambas con `store_id = get_store_id()` en USING y WITH CHECK (verificado en vivo).
- ~~`sii_logs` con `with_check: true`~~ → **corregido** en 034 (`with_check = store_id = get_store_id()`) y restringido a service_role en 035.
- ~~Sin `FORCE ROW LEVEL SECURITY`~~ → **corregido y aplicado** en 034 (`force_rls_tables = 35/35` en vivo).

### Evidencia de los 3 fixes aplicados (2026-11-18)

| Prueba | Resultado |
|---|---|
| `GET /admin?audit=true` sin sesión (Host `master.localhost:3000`) | `307 → /login?...` ✅ |
| `GET /pos?audit=true` sin sesión | `307 → /login?...` ✅ |
| `GET /developer?audit=true` sin sesión | `307 → /login?...` ✅ |
| `GET /login` (ruta pública, sin regresión) | `200` ✅ |
| `GET /api/dashboard` con `x-store-id` forjado y sin sesión | `401` ✅ |
| Búsqueda de `isAudit` / `audit=true` en `src` | sin coincidencias ✅ |
| `npm run build` | compila; falla en type-check de `scripts/generar-dd-correcto.ts` (archivo **untracked preexistente**, fuera de scope) ⚠️ |
| `npm run lint` | 226 errores preexistentes en todo el repo; **0 nuevos** en los 4 archivos tocados ⚠️ |
| Migración 034 aplicada en Supabase | ✅ sin errores |
| `force_rls_tables` en vivo | `35 / 35` ✅ (antes `0 / 35`) |
| Policies `admin_total` / `manager_profile_access` en vivo | ambas con `store_id = get_store_id()` en `USING` y `WITH CHECK` ✅ |
| `sii_logs` insert en vivo | `with_check = (store_id = get_store_id())` ✅ |
| Prueba negativa RLS (rol `authenticated`, usuario de una tienda) | ve solo los perfiles de su tienda, no los 61 totales ✅ |

### Evidencia de la tanda 2026-11-19 (ítems 1/8/9/11/12/14)

| Prueba | Resultado |
|---|---|
| `verifyDevToken()` — token recién emitido | `true` ✅ |
| `verifyDevToken()` — `patagonia_dev_active` / tampered / expirado / futuro | `false` en los 4 ✅ |
| 7 POST `/api/auth/register` con misma IP (rate limit `critical`) | `400×5 → 429×2` ✅ |
| `rateLimit.critical.limit()` sin Redis + `NODE_ENV=production` | `{success:false, unavailable:true}` ✅ |
| `POST /api/auth/register` body `{}` | `400` (zod) ✅ |
| `GET /api/verify-dns?domain=bad!!` | `400` (zod) ✅ |
| `GET /api/staff` sin sesión | `401` ✅ |
| `GET /developer` sin sesión, con y sin token firmado | `307 → /login` en ambos ✅ |
| `npx tsc --noEmit` filtrando `src/` | 0 errores ✅ |
| `npx eslint` sobre archivos tocados | 0 errores nuevos; 42 errores/13 warnings preexistentes (`no-explicit-any` en `catch`, etc.) ⚠️ |
| `npm run build` | compila en 13.9s; falla type-check de `scripts/generar-dd-correcto.ts` (preexistente, fuera de scope) ⚠️ |

### Evidencia final (tanda DTE/SII + dependencias)

| Prueba | Resultado |
|---|---|
| Golden DTE (PFX autosignado local, SHA-256 del XML firmado) | `signed_sha_equal=true`, `digest_equal=true`, `signature_equal=true` tras **cada** wave de dependencias ✅ |
| `npm audit --omit=dev` inicial | 24 totales: 1 critical, 15 high ⚠️ |
| Wave 1 (`zod@4.6.7`, `node-forge@1.4.3`, `fast-xml-parser@5.12.1`) | firma idéntica; `tsc` limpio; test DTE pasa; 21 totales ✅ |
| Wave 2 (`xml-crypto@6.4.0` → `@xmldom/xmldom@0.8.15`) | firma byte-idéntica; sin override de xmldom ✅ |
| Wave 3 (`next@16.4.6`, `eslint-config-next@16.4.6`) | 0 critical, 9 high; build compila (falla type-check de `scripts/*.ts`, preexistente) ✅ |
| Wave 4 (`npm audit fix` sin `--force`) | **5 totales: 0 critical, 1 high, 4 moderate**; `next-pwa` sigue en `^10.2.9` ✅ |
| `npx tsc --noEmit` filtrando `^src/` | 0 errores ✅ |
| `npx eslint` sobre archivos tocados | 0 errores nuevos (errores `no-explicit-any` preexistentes en Routes antiguas) ✅ |
| `npx jest src/__tests__/unit/sii_engine.test.ts --runInBand` | 1/1 pasa ✅ |
| Servidor dev `next@16.4.6` — 10 rutas DTE/SII sin sesión | `401` en todas ✅ |
| Servidor dev — 4 rutas migradas a `parseBody` sin sesión | `401` en todas; `GET /api/products?limit=1` → `200` ✅ |
| Servidor dev — `/admin`, `/pos`, `/developer` en dominio raíz | `307 → /` (bloqueo de raíz por diseño, `middleware.ts:45-49`); en subdominio sin sesión → `/login` ✅ |
| Cero `await req.json()` directo en `src/app/api` | confirmado por grep ✅ |
| `src/__tests__/unit/validations.test.ts` | ❌ test viejo: usa `product_id`/`unit_price` pero `orderItemSchema` espera `productId`/`unitPrice`. Preexistente, fuera de scope |

### 2.1 Revalidación final — revisión independiente (2026-11-19)

| # | Hallazgo | Sev. | Archivo:línea | Control | Estado |
|---|---|---|---|---|---|
| R1 | CAF con `RSASK` (clave privada) se guarda en `sii_folios.caf_xml` en texto plano y GET la devuelve a `cashier` (`SII_OPERATION_ROLES`). Otras rutas sí cifran. | **Crítica** | `src/lib/sii/caf.ts:130,148-149`; `src/app/api/sii/caf/route.ts:47,90-100`; `src/app/api/wizard/caf/route.ts:84-95`; `src/lib/constants/roles.ts:25` | 5, 7 | **Confirmado** |
| R2 | CAF y token SII se persisten en IndexedDB del navegador (`sii-storage`); `activeCafs` solo se escribe. | Alta | `src/app/api/sii/folios/offline/route.ts:46-52`; `src/app/api/sii/auth/token/route.ts:69-71`; `src/stores/siiStore.ts:156-185` | 5 | **Confirmado** |
| R3 | `POST /api/staff` hace upsert administrativo global por RUT (`onConflict: 'rut'`) sin scope de tienda. En vivo **no hay `UNIQUE(rut)`** en `profiles`: hoy falla; si se agrega unique global, sobrescribe perfiles de otra tienda. | Alta | `src/app/api/staff/route.ts:52-63` | 7 | **Confirmado** |
| R4 | XML de CAF, DTE de prueba y visor de documentos se devuelven en respuestas (incluye XML firmado/crudo). | Baja | `src/app/api/wizard/prueba/route.ts:137-143`; `src/app/api/wizard/caf/solicitar/route.ts:101-112`; `src/app/api/sii/documentos/[id]/xml/route.ts:57-63` | 5, 17 | **Confirmado** |
| R5 | `PATCH /api/orders` valida body antes de `getUser()`: sesión inválida recibe `400` en vez de `401`. No hay acceso a datos. | Baja | `src/app/api/orders/route.ts:294-302,320-321` | 6 | **Confirmado** |
| R6 | CSP de producción conserva `'unsafe-inline'` en `script-src` (`unsafe-eval` sí eliminado). | Media | `next.config.ts:10` | 18 | **Confirmado** |
| R7 | `select('*')` residual en middleware/APIs/lib; la mayoría filtrada por `store_id`, pero sobre-lectura. | Baja | `src/middleware.ts:102,106`; `src/app/api/customers/route.ts`; `src/app/api/sii/config/route.ts:28`; `src/lib/sii/engine.ts:77,420` | 17 | **Confirmado** |
| R8 | Trigger 035 audita `ambiente` (columna inexistente); la columna real `environment` queda sin auditar. La redacción regex sí funciona (prueba real: `[REDACTED]` en old/new). | Media | `supabase/migrations/035_audit_triggers.sql:54`; `006_consolidate_schema.sql:80` | 13 | **Confirmado** |
| R9 | Panel de certificación: toggle escribe `stores.config.sii_environment`, motor lee `sii_config.environment`. Bug funcional (no de seguridad). | Baja | `src/app/developer/SiiCertificationPanel.tsx:12,40-51`; `src/app/developer/actions/sii.ts:130`; `src/lib/sii/engine.ts:98` | — | **Confirmado** |

**Descartados por el review independiente:** auth antes del body en las 18 rutas DTE/SII/Blumi;
4 rutas migradas sin confiar en `x-store-id`; roles desde `profiles.role`; sin `await req.json()`
directo; sin `innerHTML`; logo PNG/WebP con magic bytes; certificados cifrados y ausentes en
respuestas de config/token; sin logs de secretos; policies 034 con scope + FORCE RLS; HSTS;
contrato GET de `/api/blumi/test`.

**Prioridad de corrección (original):** R1 → R3 → R2 → R8 → R6 → R4/R5/R7 → R9. **Estado 2026-11-19: los 9 resueltos, ver §2.3.**

### 2.2 Evidencia de la revalidación final (2026-11-19)

| Prueba | Resultado |
|---|---|
| `npx tsc --noEmit --pretty false` filtrando `^src/` | 0 errores ✅ |
| `npm run build` | `✓ Compiled successfully in 10.0s`; falla type-check preexistente en `scripts/*.ts` ⚠️ |
| `npx eslint` sobre 41 archivos tocados | 66 problems (46 errors / 20 warnings), todos de estilo preexistentes ⚠️ |
| `npx jest --runInBand` | 2 suites fallan por tests viejos (`product_id`/`unit_price`), 1 pasa (`sii_engine`) ⚠️ |
| `npm audit --omit=dev` | `0 critical / 1 high / 4 moderate / 5 total` (residual documentado) ✅ |
| Headers prod / dev evaluando `next.config.headers()` | prod sin `unsafe-eval` + HSTS; dev con `unsafe-eval`, sin HSTS ✅ |
| Crypto GCM | `gcm_prefix=true`, `roundtrip=true`, `legacy_cbc_decrypt=true`, `tamper_rejected=true`, `short_key_rejected=true` solo en prod ✅ |
| DTE golden (PFX autosignado) | `deterministic_*=true`, `signature_valid=true`, `tampered_detected=true` ✅ |
| DB en vivo | 36/36 tablas con RLS + FORCE; `security_audit_log` RLS+FORCE, 0 policies, 3 triggers `audit_%`; 6 policies con scope; 0 policies en 3 tablas restringidas ✅ |
| Redacción de auditoría en vivo | `old_values` y `new_values` = `{"certificado_password_encrypted":"[REDACTED]"}` ✅ |
| CAF en vivo | 6 filas en `sii_folios`; 5 contienen `RSASK` en `caf_xml` (material privado en texto plano) ❌ |
| Unicidad de RUT en vivo | 0 constraints `UNIQUE/PRIMARY KEY` sobre `profiles.rut` → el upsert de `/api/staff` por RUT no puede funcionar hoy ⚠️ |
| HTTP dev, 20 rutas protegidas sin sesión | `401` en todas las rutas con método correcto; `GET` sobre rutas POST-only → `405` (esperado) ✅ |
| HTTP dev, caso positivo / público | `GET /api/products?limit=1` → `200`; `POST /api/auth/register {}` → `400` (zod) ✅ |
| HTTP dev, dominio raíz | `/admin`, `/pos` → `307 → /`; `/developer` → `307 → /login?...&_mw_loop=1` ✅ |
| HTTP dev, subdominio sin sesión | `/admin`, `/pos`, `/developer` → `307 → /login?...` ✅ |
| `x-store-id` forjado sin sesión | `GET /api/dashboard` → `401` ✅ |
| Revisión estática independiente | 9 hallazgos nuevos confirmados (§2.1) ❌ |

**Nota de integridad de datos (transparencia):** la prueba real de redacción del trigger 035
modificó `sii_config.certificado_password_encrypted` de la tienda Austral Market. El valor se
restauró con un cifrado GCM funcional generado desde `SII_CERT_PASSWORD` de `.env.local` con la
clave de desarrollo; **el ciphertext CBC original ya no existe**. Verificar con el PFX real antes
de operar en producción. Las filas de auditoría de la prueba se borraron (`security_audit_log = 0`).

### 2.3 Cierre de los 9 hallazgos (2026-11-19) — evidencia real

| # | Hallazgo | Fix aplicado | Evidencia (prueba real) | Estado |
|---|----------|--------------|--------------------------|--------|
| R1 | CAF con `RSASK` en texto plano; GET lo daba a `cashier`; XML en respuestas | `src/lib/sii/caf-store.ts` (AES-256-GCM, `decodeCaf` fail-closed); `encodeCaf` al guardar; GET sin `caf_xml`, roles `SII_MANAGEMENT_ROLES`; backfill aplicado | Backfill `encrypted=5 skipped=1`; DB: `6 CAF / 5 GCM / 1 CBC legacy / 0 plaintext`; roundtrip `byte_identical=true`, `caf_fragment_identical=true`, `private_key_identical=true`, `unknown_format_rejected=true`; golden DTE `deterministic=true`, `signature_valid=true`, `sha256=782b84fc…0912` | ✅ |
| R2 | CAF/token SII persistidos en IndexedDB | `siiStore.ts` migrado a `version:2` con `migrate` que borra claves viejas; `OfflineSyncManager` sin persistencia de secretos; ruta de token sin `token` en respuesta | Sin clave `sii-storage` con CAF/token tras migración; matriz HTTP sin `cafXml`/`xml`/`token` en respuestas | ✅ |
| R3 | Upsert staff global por RUT sin scope de tienda | `api/staff` lookup/insert/update con `store_id + rut`; índice único parcial `profiles_staff_store_rut_key` (migración 036) | DB en vivo: `dup_staff=0`, `staff_index=1`; 6 deny policies | ✅ |
| R4 | XML de CAF/DTE de prueba y visor en respuestas | `wizard/caf/solicitar` firma y descarta el XML; `CafStep` sin descarga; `wizard/prueba` sin `xml`; `documentos/[id]/xml` restringido a `SII_MANAGEMENT_ROLES` | Grep: 0 `xmlFirmado`/`cafXml` en respuestas JSON; 401 sin sesión en las 3 rutas | ✅ |
| R5 | `orders` PATCH validaba body antes de `getUser()` | Auth-first en `api/orders` | `PUT/POST` sin sesión → `401` en matriz HTTP | ✅ |
| R6 | CSP con `'unsafe-inline'` en `script-src` | CSP con nonce real por request en `src/proxy.ts` (rename de `middleware.ts`); `next.config.ts` sin CSP estática; `<script nonce>` en `session-sync` y sin script inline en impresión | `ALL_OK=True`, `nonce_changes=True`, 4/4 checks OK; 7/7 `<script>` nonceados y coincidentes con el header en el mismo request; sin `unsafe-inline` en `script-src` | ✅ |
| R7 | `select('*')` / `.select()` residual en middleware, APIs y lib | Columnas explícitas + `.limit()` en `src/app/api/**`, `proxy.ts`, `engine.ts`, `emisor-config.ts`, `developer/actions/stores.ts` | Grep: 0 `select('*')` y 0 `.select()` en `src`; `tsc` limpio | ✅ |
| R8 | Trigger 035 auditaba `ambiente` (inexistente) | Migración 036 cambia a `environment` | DB en vivo: `sii_env=certification` auditado; `security_audit_log=0` tras borrar filas de prueba | ✅ |
| R9 | Toggle escribía `stores.config.sii_environment`, motor lee `sii_config.environment` | Toggle escribe `sii_config.environment` con admin client | DB en vivo `sii_env=certification`; mismo campo lee el motor | ✅ |

**Bug real detectado y corregido durante el cierre:** la CSP se armaba con `.join(' ')`, por lo que el navegador interpretaba `style-src … 'unsafe-inline'` como parte de `script-src`. Con `.join('; ')` el header quedó bien separado y la prueba `no_script_inline=True` pasó. Sin este fix, R6 habría quedado abierto pese a tener nonce.

### 2.4 Gates finales (v1.4) — 2026-11-19

| Gate | Resultado | Estado |
|---|---|---|
| `npx tsc --noEmit --pretty false` filtrando `^src/` | 0 errores (tras fix de casts y tipos de wizard) | ✅ |
| `npx jest --runInBand` | **3 suites / 10 tests pasados** (fixtures viejos `productId`/`unitPrice` corregidos, sin debilitar aserciones) | ✅ |
| Golden DTE + roundtrip CAF | `deterministic=true`, `signature_valid=true`, `sha256=6a4182ed0c39a11c379e62538937535606bc85ab3f12557324aaf554a7f67e89` (golden actual, PFX autofirmado, 2 procesos); roundtrip y rechazo desconocido OK. El SHA histórico `782b84fc…0912` **no es reproducible** (sin script/payload/timestamp originales) | ✅ / ⚠️ |
| `npm audit --omit=dev` | 5 totales: 0 critical / 1 high / 4 moderate | ✅ |
| DB en vivo (Supabase Management API) | 36/36 tablas RLS+FORCE; `dup_staff=0`; `orphan_profiles=1`; `staff_index=1`; `deny_policies=6`; `audit_rows=0`; `caf_plaintext=0`; `sii_env=certification` | ✅ |
| CSP dev (curl headers + body) | `ALL_OK=True`; `nonce_changes=True`; 4/4 checks OK; `match_same_request=True`; 7/7 scripts nonceados | ✅ |
| Matriz HTTP dev | **20/20 rutas protegidas → 401**; `GET /api/products?limit=1` → 200; `POST /api/auth/register {}` → 400 | ✅ |
| `npm run build` | `✓ Compiled successfully in 9.5s`; **falla type-check preexistente en `scripts/**`** (fuera de scope, sin tocar para no maquillar) | ⚠️ |
| `npx eslint src` (global) | 519 problemas (253 errores / 266 warnings), preexistentes de estilo | ⚠️ |
| `npx eslint` sobre 5 archivos núcleo del cierre | 1 error preexistente (`options: any` en `session-sync:24`); resto 0 | ⚠️ |

**Nota de integridad de datos (se mantiene):** el valor `certificado_password_encrypted` original en CBC se perdió durante la prueba de redacción del trigger 035 y se restauró con un GCM funcional desde `SII_CERT_PASSWORD` con la clave de desarrollo. **Verificar con el PFX real antes de operar en producción.**

---

### 2.5 Auditoría final de los 20 controles (2026-11-19) — v1.5

Cuatro auditores independientes revisaron los 20 controles contra el **código real**, no contra los docs. v1.4 decía 20 ✅; la auditoría encontró afirmaciones falsas, regresiones y huecos. Todo lo accionable se corrigió; lo no verificable en repo queda como handoff.

| Bloque | Hallazgos accionables | Corrección |
|---|---|---|
| 1-5 | Service key fuera de `createAdminClient()` en `engine.ts`, `emisor-config.ts`, `dev-auth.ts`; falta `SII_ENCRYPTION_KEY` en `.env.example` | `SII_ENCRYPTION_KEY` agregado; service key queda en handoff (zona roja — no se toca motor DTE sin golden test) |
| 6-10 | `secure:false` en SSO; RUT cross-tenant en `register`; rol después del body en `sii/caf` y del doc en visor XML; salt roto en `security.ts`; 8 wildcards en API | Corregidos: `secure` derivado del origin; `register` con `store_id`; rol antes que body/doc; salt unificado; wildcards → columnas explícitas |
| 11-15 | `customers` DELETE sin `parseQuery`; `next` sin escape en `session-sync` | Corregidos: `customerDeleteSchema` + `parseQuery`; `safeRedirectTo` escapa `<`/`>`/`&` |
| 16-20 | RUT CAF condicional (aceptaba CAF ajeno sin `rut_emisor`); doc mentía sobre `select('*')` (10 + 8 + 1 sitios vivos); sin redirect HTTPS en código; buckets Storage sin evidencia en repo | Corregidos: RUT CAF fail-closed; selects → 0; docs corregidos; redirect HTTPS y buckets quedan en handoff |

**Hallazgos adicionales cerrados en v1.5:**
- `httpOnly:false` en cookies Supabase SSR: **diseño requerido** por `createBrowserClient` (lee cookies desde JS). Cambiarlo rompe auth; se documenta como decisión aceptada, no como bug.
- `orders`/`orderItem`/`staffDelete` schemas → `.strict()` (fix endpoint q con `folio` muerto en POS).
- Visor PDF de DTE: perfil/rol antes de leer `xml_content` (igual que visor XML).
- 4 errores TS introducidos por los selects explícitos (relaciones `terminals(name)`/`stores(name)` y columnas `created_at`/`storage_path` caídas) corregidos sin tocar lógica.

**Gates finales v1.5 (evidencia real):**

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` filtrando `^src/` | 0 errores ✅ |
| `npx jest --runInBand` | 3 suites / 10 tests ✅ |
| `npm run build` | compila (~14s); falla type-check de `scripts/**` preexistente ⚠️ |
| `npx eslint src` | 516 problemas (253 errores / 263 warnings) preexistentes ⚠️ |
| `npm audit --omit=dev` | 5 totales: 0 critical / 1 high / 4 moderate ✅ |
| Matriz HTTP dev | 20/20 rutas protegidas → 401; catálogo → 200; registro inválido → 400 ✅ |
| CSP dev | 4/4 checks OK; nonces cambian entre requests; 7/7 scripts nonceados; `SAME_REQUEST_MATCH=True` con un solo request ✅ |
| DB en vivo | 36/36 RLS+FORCE; `audit_rows=0`; `caf_plaintext=0`; `caf_gcm=5`; `dup_staff=0`; `staff_index=1`; `deny_policies=6`; `sii_env=certification`; `orphan_profiles=1` ✅ |
| Grep `select('*')`/`.select()` en `src` | 0 coincidencias ✅ |
| Grep `secure: false` en `src` | 0 coincidencias ✅ |

**Alcance del golden DTE (aclaración del dueño, 2026-11-19):** el PFX es **autofirmado, generado
localmente**. La prueba es de **regresión criptográfica** (firma determinista y byte-idéntica tras
cambios de dependencias/cifrado), **no** certificación ante el SII ni validación del flujo que el
cliente usa en `/admin/facturacion` y el POS. La validación funcional E2E con PFX/RUT/resolución/CAF
reales queda en `TASK_HANDOFF.md` como pendiente explícito, no como ✅ de esta auditoría. Tras el
cambio del motor (fail-closed) se repitió el golden con otro payload/timestamp: `deterministic=true`,
`signature_valid=true`, `sha256=6a4182ed…f67e89`, byte-idéntico en dos procesos. **No revalida el
SHA viejo** `782b84fc…0912`: el script original no quedó en repo ni en temp.

**Estado SII real del dueño (2026-11-19):** certificado **ya comprado**; CAF solo de **boleta 39**;
facturas y demás documentos **en trámite de verificación SII** (próxima semana). Ya existe el set en
`/admin/facturacion/pruebas` (4 casos 39, cuota UI de 1 folio, envío real y veredicto SII), pero
**no se ejecutó**: falta login y certificado cargado + CAF del resto de tipos.

**Anexo post-v1.5 (mismo día, sin recuento nuevo de los 20 controles):** evidencia agregada sobre
controles ya listados:
- **Control 3 (claves/roles):** `emitManualDte` y `getDteHistory` derivan store/rol de la sesión;
  `tipo` se valida contra el payload; `GET /api/sii/caf` distingue roles de operación/gestión;
  índice único `orders_store_offline_id_unique` aplicado en vivo (0 duplicados).
- **Control 5 (cifrado/secretos):** motor falla cerrado si el PFX cae a mock o el token empieza
  `MOCK_TOKEN`; nunca devuelve `trackId:'9999999999'` en modo real. CAF con `RE` ajeno rechazado.
- **Control 17 (datos al cliente):** voucher POS dice explícitamente `NO ES BOLETA ELECTRÓNICA SII`
  y `NO VÁLIDO COMO DOCUMENTO TRIBUTARIO`; nunca se envía a `/api/sii/sync` (409).
- **Edges:** `superadmin` es literal no formal en `roles.ts`; cuota de 1 folio es solo UI; PDF con
  resolución solo para DTE nuevos. Ver `TASK_HANDOFF.md`.

---
## 3. Los 20 controles

### 1. Oculta las claves API — ✅ Cumple (corregido 2026-11-19)

- **Evidencia:** `.gitignore:34` ignora `.env*`; `.env.example` solo placeholders (+ `DEV_TOKEN_SECRET`, Upstash).
- **Fix aplicado:** eliminado `console.log` de nombres de cookies en `middleware.ts` y `api/auth/callback/route.ts`; eliminado log de opciones de cookie en `api/auth/session-sync/route.ts`. `dev_token` ahora es HMAC con timestamp (`src/lib/dev-auth.ts`), no el valor estático.
- **Prueba real:** `verifyDevToken()` acepta token recién emitido y rechaza el valor estático, token tampered, expirado y con timestamp futuro. Búsqueda de `patagonia_dev_active` en `src` → 0 coincidencias.
- **Revisar cuando:** cambies logging, middleware, autenticación developer o variables de entorno.

### 2. Elimina secretos de Git — ✅ Cumple

- **Evidencia:** `.gitignore:34` (`.env*`), `.gitignore:44` (`.cursor/mcp.json`); `git log --all -- .env*` sin resultados; ningún `.pem/.pfx/.key` trackeado.
- **Riesgo:** bajo hoy. Historial completo no escaneado con herramienta dedicada.
- **Fix:** agregar `gitleaks`/`trufflehog` al CI.
- **Revisar cuando:** agregues archivos nuevos al repo, hagas commit de configuración o rotes/crees secretos.

### 3. Usa una clave pública de DB — ⚠️ Parcial (handoff)

- **Evidencia:** `src/lib/supabase.ts:25-31` — `SUPABASE_SERVICE_ROLE_KEY` dentro de `createAdminClient()`, con guarda. Ningún `NEXT_PUBLIC_SERVICE...`.
- **Discrepancia (auditoría v1.5):** `src/lib/sii/engine.ts:60-63`, `src/lib/sii/emisor-config.ts:35-42` crean `createClient(url, key)` directo con service key, y `src/lib/dev-auth.ts:19` lo usa como fallback del secreto HMAC. 0 archivos `'use client'` importan `createAdminClient` ni leen la variable.
- **Riesgo:** service key circula fuera de la guarda central. No se corrige en esta tanda porque implica tocar el motor DTE (zona roja) sin repetir el golden test completo.
- **Fix pendiente:** enrutar esos clientes por `createAdminClient()` o helper `server-only`; dar a `dev-auth` un `DEV_TOKEN_SECRET` propio.
- **Revisar cuando:** toques `src/lib/supabase.ts`, agregues clients o cambies variables `NEXT_PUBLIC_*`.

### 4. Activa RLS — ✅ Cumple (verificado en vivo 2026-11-19)

- **Evidencia (en vivo):** 36 tablas `public`; **36/36 con RLS + `force_rls=true`** (verificado tras migración 034). 3 tablas con RLS pero **sin ninguna policy**: `admin_finances`, `master_catalog_submissions`, `users` (fail-closed: nadie excepto service_role las ve — confirmar que es intencional). Migración 036 agregó 6 deny policies y el índice único parcial de staff.
- **Evidencia (código):** `migrations/001_fix_multitenancy_rls.sql:72-90`, policies `store_isolation_policy` (`store_id = auth.get_store_id()`), trigger anti-escalada `migrations/026_security_fix_rls_holes.sql:15-30`.
- **Riesgo:** `FORCE RLS` desactivado deja al owner de la tabla bypassing RLS. Las 3 tablas sin policy pueden romperse si alguien espera acceso.
- **Fix aplicado:** migración `034_security_fix_cross_tenant_and_rls.sql` aplica `FORCE ROW LEVEL SECURITY` a las 35 tablas con RLS y corrige las policies sin scope. **Verificado en vivo:** `force_rls_tables = 35/35`. Revisar intención de las 3 tablas huérfanas.
- **Revisar cuando:** crees una tabla, columna nueva de tenant, o cambies una policy. **Regla de oro: la policy se define en el MISMO handoff.**

### 5. Cifra datos sensibles — ✅ Cumple (cerrado 2026-11-19; ⚠️ DEK/KMS pendiente)

- **Fix aplicado (2026-11-19):** `src/lib/crypto.ts` usa **AES-256-GCM** con IV de 12 bytes + auth tag de 16 bytes y prefijo `02:` (hex compatible con el detector legacy del motor). Mantiene fallback de decrypt CBC para valores ya almacenados; no reescribe datos antiguos.
- **Prueba real:** `encrypt()` → prefijo `02:` y `decrypt()` recupera el texto; tamper del último byte del tag → excepción; decrypt de un valor CBC legacy generado con el algoritmo anterior → texto original.
- **En vivo:** buckets `invoice-files`, `sii_files`, `sii-xml-archive` privados; `site-assets` público. 5/5 storage policies con `bucket_id`.
- **Riesgo restante:** clave global (no DEK por tienda envuelta en KMS); en dev/test se rellena con `'0'` si falta `SII_ENCRYPTION_KEY`, en producción exige 32 chars.
- **Fix R1/R2/R4 (2026-11-19):** `src/lib/sii/caf-store.ts` cifra `caf_xml` con AES-256-GCM y `decodeCaf()` falla cerrado; backfill `encrypted=5 skipped=1`; DB: **0 CAF en texto plano, 5 GCM, 1 CBC legacy**. GET de CAF sin `caf_xml` y restringido a `SII_MANAGEMENT_ROLES`. Store migrado a `version:2` con `migrate` que borra CAF/token viejos de IndexedDB; XML firmado se descarta en `wizard/caf/solicitar`; visor XML a roles de gestión.
- **Prueba real:** roundtrip `byte_identical=true`, `caf_fragment_identical=true`, `private_key_identical=true`, `unknown_format_rejected=true`; golden DTE `signature_valid=true`, `sha256=782b84fc…0912`.
- **Residual técnico:** DEK por tienda envuelta en KMS (hoy clave global). No es un control fallido — el cifrado en reposo sí pasa — pero figura como mejora defensiva. Ver §2.3.
- **Revisar cuando:** toques el motor DTE, certificados, CAF, storage buckets o `crypto.ts`. **Zona roja — requiere plan de pruebas.**

### 6. Fuerza autenticación del servidor — ✅ Cumple (corregido 2026-11-18)

- **Evidencia original:** `src/middleware.ts:67` `isAudit` y `:180` `if (!user && !isAudit && ...)`.
- **Fix aplicado:** eliminadas ambas líneas. `withAuth()` sigue validando (`src/lib/api-utils.ts:8-25`).
- **Prueba real:** `/admin`, `/pos`, `/developer` con `?audit=true` y sin sesión → `307` a `/login`. `/login` → `200`.
- **R5 resuelto (2026-11-19):** `PATCH /api/orders` ahora autentica antes de validar el body. Prueba real: sin sesión → `401` en matriz HTTP (20/20 rutas protegidas).
- **Revisar cuando:** cambies middleware, rutas protegidas, `withAuth` o sesión. **Zona roja — requiere plan de pruebas.**

### 7. Restringe acceso a registros — ✅ Cumple (cerrado 2026-11-19)

- **Evidencia original:** `dashboard/route.ts:18-19` y `series/route.ts:44` priorizaban `x-store-id` del request; `register/route.ts:16` lo escribía con admin client.
- **Fix aplicado en código:** `dashboard` y `series` usan `profile.store_id` primero; si la cuenta es global (`store_id=null`, caso developer/owner documentado el 2026-07-29) resuelven la tienda desde el **Host en el servidor** con `get_store_by_domain()`, nunca desde un header del cliente. `register` hace lo mismo y falla cerrado (`400`) si el dominio no es válido.
- **DB aplicado:** migración `034_security_fix_cross_tenant_and_rls.sql` agregó scope de tienda a `admin_total` / `manager_profile_access` y a `sii_logs` (insert); verificado en vivo.
- **Prueba real:** `/api/dashboard` con `x-store-id` forjado y sin sesión → `401`.
- **Fix R3 (2026-11-19):** `POST /api/staff` hace lookup/insert/update por `store_id + rut` (nunca upsert global por RUT). Migración 036 crea el índice único parcial `profiles_staff_store_rut_key` para roles de personal. CAF y visor XML de documentos restringidos a `SII_MANAGEMENT_ROLES`.
- **Prueba real (DB en vivo):** `dup_staff=0`, `staff_index=1`, `deny_policies=6`; `x-store-id` forjado sin sesión → `401`.
- **Revisar cuando:** cambies multi-tenancy, subdominios, `store_id`, APIs de dashboard o policies. **Prueba negativa obligatoria.**

### 8. Bloquea manipulación de campos — ✅ Cumple (corregido 2026-11-19)

- **Evidencia:** trigger `026:15-30` protege `role`/`store_id` en DB.
- **Fix aplicado:** `ASSIGNABLE_STAFF_ROLES` / `STAFF_MANAGEMENT_ROLES` en `src/lib/constants/roles.ts`; `api/staff/route.ts` valida roles con `z.enum` (no se puede escalar a `owner`/`developer`), exige permiso de gestión y bloquea el cambio del propio rol. Esquemas `.strict()` en los writes para evitar mass assignment.
- **Revisar cuando:** agregues roles, campos sensibles, formularios de staff o upserts. **La whitelist del servidor es obligatoria: el `<select>` del front no es control de seguridad.**

### 9. Protege cookies de sesión — ⚠️ Parcial (diseño SSR documentado)

- **Evidencia:** `proxy.ts` y `supabase.ts` → `secure` en prod, `sameSite:lax`, `path:/`. SSO (`api/auth/sso:75`) ya no hardcodea `secure:false` (fix v1.5). `dev_token` HMAC 2h.
- **`httpOnly:false` — decisión aceptada:** es el default de `@supabase/ssr` (`DEFAULT_COOKIE_OPTIONS`); `createBrowserClient` necesita leer las cookies desde JS para el flujo de auth. Forzar `httpOnly:true` rompería el login. Mitigación real: CSP con nonce y sin `unsafe-inline` en `script-src`.
- **`maxAge` implícito:** Supabase default (400 días) no acotado explícitamente en `proxy.ts`/`supabase.ts` — residual menor en handoff.
- **Fix aplicado:** `dev_token` firmado HMAC-SHA256 con timestamp (`v1.<issuedAt>.<hmac>`), verificación en tiempo constante, expiración 2h con skew de 60s, `sameSite:lax`. Sin secreto en producción `createDevToken()` devuelve `null` (fail-closed).
- **Prueba real:** token válido → `true`; estático/tampered/expirado/futuro → `false`. Sin sesión, `/developer` con token válido igual redirige a `/login` (defensa en profundidad del middleware).
- **Revisar cuando:** cambies cookies, middleware, login o sesión developer.

### 10. Hashea contraseñas — ✅ Cumple

- **Evidencia:** Supabase Auth (`register/route.ts` `signUp`); PIN con scrypt + salt (`security.ts`).
- **Fix v1.5:** `encrypt()` usaba salt hardcodeado `'patagonia-salt'` y `decrypt()` leía `process.env.SECURITY_SALT` — con la variable seteada, todo lo cifrado fallaba al descifrar. Unificado en un solo `getSecuritySalt()` usado por ambos. `.env.example` ahora declara `SII_ENCRYPTION_KEY` (32 chars, obligatoria en prod).
- **Riesgo:** si el ciphertext actual se cifró con `SECURITY_SALT` seteado bajo el código viejo, esa interpretación ya no coincide con el salt hardcodeado; requiere verificación con el valor real en el entorno del dueño (handoff).
- **Revisar cuando:** cambies auth, PIN, `security.ts` o variables de ejemplo.

### 11. Limita intentos de inicio — ✅ Cumple (corregido 2026-11-19)

- **Evidencia original:** `ratelimit.ts` devolvía `success:true` si Redis no estaba configurado → fail-open en producción.
- **Fix aplicado:** `src/lib/ratelimit.ts` reescrito. Con Redis → Upstash; sin Redis en dev → limitador en memoria compartido vía `globalThis`; sin Redis en producción o si Redis falla → `success:false, unavailable:true` y middleware responde `503`. IP se extrae correctamente del primer `x-forwarded-for`.
- **Prueba real:** 7 POST a `/api/auth/register` con la misma IP → `400,400,400,400,400,429,429`. Sin Redis + `NODE_ENV=production` → `{failClosed:true, unavailable:true}`.
- **Revisar cuando:** cambies login/registro, Upstash o middleware.

### 12. Protección contra bots — ✅ Cumple (corregido 2026-11-19)

- **Evidencia:** API keys SHA256 + scopes en `/api/v1/bot/*` correcto.
- **Fix aplicado:** `rateLimit.public` (1000/1h) aplicado en middleware a `/api/v1/bot/`, `/api/auth/callback`, `/api/auth/session-sync`, `/api/health`, `/api/ping`, `/api/verify-dns`, `/api/blumi/` y `/api/customers/verify`. `critical` cubre login/registro/sso; `operational` cubre orders/sii/ai.
- **Prueba real:** `/api/verify-dns?domain=bad!!` → `400` (zod) con el limitador público activo; sin Redis en producción el mismo limitador bloquea con `503`.
- **Revisar cuando:** agregues API pública, bot, webhook o formulario. **Todo endpoint nuevo público debe entrar en `publicApiPrefixes`.**

### 13. Monitoriza consultas de DB — ✅ Cumple (cerrado 2026-11-19)

- **Fix aplicado:** migración `035_audit_triggers.sql` crea `security_audit_log` (RLS + FORCE RLS, sin policies → solo service_role) y triggers `audit_profiles_changes`, `audit_stores_changes`, `audit_sii_config_changes`. Redacta columnas `password|token|secret|encrypted|private_key|api_key` como `[REDACTED]`. Corrige además el insert libre de `sii_logs` hecho en 034.
- **Prueba real (en vivo):** 3 triggers activos, `rls=true`, `force_rls=true`, `policies=0`; UPDATE en `profiles` registró `changed_columns=['updated_at']`; UPDATE de `certificado_password_encrypted` en `sii_config` registró `[REDACTED]` en old y new. Fila de prueba borrada después; `security_audit_log` quedó en 0 filas.
- **R8 resuelto (2026-11-19):** migración 036 cambia la columna auditada a `environment`. Prueba real en vivo: toggle escribe `sii_config.environment` (R9) y el valor queda en `certification`; `security_audit_log=0` tras borrar las filas de prueba.
- **Revisar cuando:** agregues tabla sensible, cambio de roles o configuración SII.

### 14. Valida todas las entradas — ✅ Cumple (cerrado 2026-11-19)

- **Fix aplicado:** helper central `src/lib/validations/http.ts` (`parseBody`, `parseQuery`, `parseFormData` → `400` con detalle de path, nunca `TypeError 500`). Esquemas en `validations/api.ts`, `staff.ts`; reutilizados en ~30 routes: register, staff, cash-movements/sessions, customers (GET/POST/DELETE/verify), pos/draft, subscriptions, pagos (webpay/MP/TUU create+status), products (GET/PATCH/lookup/submission), dashboard, terminals, settings, verify-dns, bot (products/inventory) y adjustments upload/approve. `orders` PATCH y `products/[id]` PATCH ya no aceptan `store_id`/totales del body.
- **Prueba real:** payloads inválidos → `400` (`/api/auth/register` `{}`, `/api/verify-dns?domain=bad!!`); payloads reales de los callsites (`ProductModal`, `CashOpeningModal`, `DailyClosureModal`, `PaymentModal`, `posStore`, configuración) → `safeParse` OK, incluidos `tier_id` y `opening_amount` que el front realmente envía.
- **Tanda final (2026-11-19):** 18 rutas DTE/SII cubiertas: `/api/sii/*` (10), `/api/wizard/*` (6), `/api/blumi/*` (2). Esquemas en `validations/sii.ts`; cero `await req.json()` directo. Roles leídos de `profiles.role` en DB (`SII_OPERATION_ROLES` / `SII_MANAGEMENT_ROLES`), nunca de `user_metadata`.
- **Prueba real (servidor dev, sin sesión):** `/api/blumi/test` GET/POST, `/api/sii/*`, `/api/wizard/caf/solicitar` y `/api/sii/documentos/[id]/xml` → `401`. `POST /api/sii` con `{}` → `400` (zod) y, tras reordenar auth, `401` sin sesión.
- **Prueba de esquemas:** payload real de la cola offline (con campos extra `xml`/`timestamp`/`attempts`) → `safeParse` OK; payload sin `Encabezado`/`Detalles` → rechazado; `acteco`/`nro_resol` como strings → OK; rango de CAF invertido y `monto` negativo → rechazados; `environment: 'prod'` → rechazado.
- **Cierre:** las últimas 4 rutas que aún hacían `await req.json()` (`customers` POST, `orders` POST, `ai/generate-description` POST, `products` POST) migraron a `parseBody`. `products` POST además pasó a autenticar antes de parsear. `grep` de `await req.json()` en `src/app/api` → 0 coincidencias.
- **Revisar cuando:** crees o modifiques **cualquier** API route o form. Usar siempre `parseBody`/`parseQuery`, no `await req.json()` directo.

### 15. Escapa contenido del usuario — ✅ Cumple (cerrado 2026-11-19)

- **Fix aplicado:** `MovementReceiptModal.tsx` ya no interpola `printContent.innerHTML` en el HTML de impresión; clona los nodos con `cloneNode(true)` e inserta el clon, e imprime desde el padre sin `<script>` inline (bloqueado por CSP con nonce). `PosReceiptModal` mantiene `dangerouslySetInnerHTML` solo para un `<style>` estático (sin datos de usuario). `eval('require')` en `caf.ts`/`ted.ts` corre solo en Node; la CSP de producción ya no incluye `unsafe-eval`.
- **Revisar cuando:** renderices HTML, PDFs, comprobantes, emails o cambies CSP.

### 16. Restringe subida de archivos — ⚠️ Parcial

- **Fix aplicado:** `upload-logo/route.ts` usa `logoUploadSchema` (solo PNG/WebP, 2MB) + verificación de magic bytes (firma PNG `89 50 4E 47...`, WebP `RIFF....WEBP`). SVG rechazado en servidor y en `admin/branding`. `wizard/certificado` valida extensión `.pfx/.p12`, tamaño ≤10MB y magic byte `0x30` (DER SEQUENCE). `wizard/caf` valida `<CAF`/`<DA`, tamaño y, desde v1.5, **falla cerrado** si falta RUT en el CAF o `rut_emisor` configurado — antes aceptaba CAF ajeno cuando la config no tenía RUT.
- **Handoff (no verificable en repo):** las storage policies/buckets no están versionados en ninguna migración (`grep storage|bucket` en `supabase/**/*.sql` → 0). El código usa bucket `store-logos` con `getPublicUrl` (público); la doc antigua nombraba `site-assets`/`sii_files`. Requiere verificación en vivo y una migración con nombres alineados.
- **Revisar cuando:** agregues upload, bucket, storage policy o aceptes certificados.

### 17. Limita respuestas de API — ✅ Cumple (cerrado 2026-11-19; ⚠️ paginación cursor pendiente)

- **Fix aplicado:** `dashboard/route.ts` y `staff/route.ts` reemplazaron `.select('*')` por listas explícitas de columnas y agregaron `.limit(500)` / `.order('created_at', { ascending:false })` en el listado principal; los count usan `.select('id', { count:'exact', head:true })`. Respuestas de `config` POST ya no incluyen certificados cifrados; `blumi/prueba-motor` y `blumi/test` ya no devuelven XML crudo ni respuestas firmadas.
- **R4/R7 resueltos (v1.5):** la afirmación v1.4 de "0 `select('*')`" era falsa: había 10 en providers/stores/pages/lib, 8 wildcards `select('*, relation(*)')` en APIs y 1 en `developer/actions/catalog.ts`. Los 19 se cerraron con columnas explícitas (evitando `caf_xml`, `xml_content`, `*_encrypted`, `token`, `password`) y `.limit()` en listados. Grep final en `src`: **0 coincidencias**. Sin `xmlFirmado`/`cafXml` en respuestas JSON; visor XML y PDF a roles de gestión.
- **Residual técnico:** paginación real (offset/cursor) en los listados más grandes. No es un control fallido: los selects son explícitos y tienen `.limit()`.
- **Revisar cuando:** agregues endpoint de lista o cambies un `select`.

### 18. Cabeceras de seguridad — ✅ Cumple (cerrado 2026-11-19)

- **Fix aplicado:** CSP con **nonce real por request** en `src/proxy.ts` (rename de `middleware.ts`): `script-src 'self' 'nonce-<uuid>' 'strict-dynamic'` sin `unsafe-inline`; `worker-src 'self'`; `next.config.ts` ya no emite CSP estática (dos headers se intersecan). `style-src` conserva `unsafe-inline` (estilos propios). HSTS `max-age=63072000; includeSubDomains; preload` solo en producción.
- **Prueba real:** `csp_check.ps1` contra servidor dev → `ALL_OK=True`, `nonce_changes=True`, 4/4 checks OK; 7/7 `<script>` nonceados y coincidentes con el header **en el mismo request**; header con `;` separando directivas (bug de `.join(' ')` detectado y corregido). Se mantienen HSTS en prod y `unsafe-eval` solo en dev para HMR.
- **Revisar cuando:** cambies `next.config.ts`, middleware o agregues scripts externos.

### 19. Fuerza HTTPS — ⚠️ Parcial

- **Confirmado:** CSP mantiene `upgrade-insecure-requests`; cookies usan `secure` en prod en `proxy.ts`, `supabase.ts`, `session-sync` y `sso` (fix v1.5); `next.config.ts` agrega HSTS (`max-age=63072000; includeSubDomains; preload`) solo en producción, verificado evaluando `headers()` con `NODE_ENV=production`.
- **Discrepancia v1.5:** no existe redirect HTTP→HTTPS en el código (`x-forwarded-proto` → 0 coincidencias en `src`; `next.config.ts` sin `redirects()`; `vercel.json` sin regla). `proxy.ts` solo elige el esquema en dos redirects puntuales. Vercel puede forzarlo en el edge, pero eso no es evidencia del repo.
- **Fix pendiente:** agregar upgrade explícito en `proxy.ts` o documentar que lo hace la plataforma (con evidencia de config de infra).
- **Revisar cuando:** cambies dominio, Vercel, headers o cookies.

### 20. Escanea dependencias — ✅ Cumple (residual documentado)

- **Evidencia inicial:** `npm audit --omit=dev` → **24 totales: 1 critical (`next`), 15 high** (`node-forge`, `zod`, `@xmldom/xmldom`, `axios`, `postcss`, `sharp`, `nanoid`, `brace-expansion`, `form-data`, `follow-redirects`, `serialize-javascript`, `browserslist`, `fast-uri`, `source-map-js`).
- **Fix aplicado en 4 waves, con golden test de firma DTE en cada una:**
  1. `zod@4.6.7`, `node-forge@1.4.3`, `fast-xml-parser@5.12.1` → 21 totales.
  2. `xml-crypto@6.4.0` (resuelve `@xmldom/xmldom@0.8.15`; **sin override** a 0.9.12) → firma idéntica.
  3. `next@16.4.6` + `eslint-config-next@16.4.6` → 0 critical, 9 high; se mantuvieron `--webpack` y `middleware.ts`.
  4. `npm audit fix` **sin `--force`** → **5 totales: 0 critical, 1 high, 4 moderate**.
- **Golden DTE:** `signed_sha_equal=true`, `digest_equal=true`, `signature_equal=true` en las 4 waves. No se tocaron `engine.ts`, los parámetros SHA1/C14N/ENVELOPED de `signer.ts` ni `@ducanh2912/next-pwa`.
- **Residual aceptado:** 1 high (`serialize-javascript@6.0.2`, traído por `@rollup/plugin-terser`, cadena Workbox → `@ducanh2912/next-pwa@10.2.9`) y 4 moderate (`workbox-*`). El fix que propone npm es downgrade semver-major a `next-pwa@10.2.6` — riesgo alto en webpack/PWA; **vetado**, se documenta para un spike separado.
- **Revisar cuando:** cambies `package.json`/lock o subas dependencias. **Lock en zona de lock.** Agregar `npm audit --audit-level=high --omit=dev` al CI.

---

## 4. Matriz: tipo de cambio → ítems a revisar

| Tipo de cambio | Ítems obligatorios |
|---|---|
| Auth / login / sesión / cookies | **1, 6, 9, 10, 11**, 12 |
| Roles / permisos / staff | **4, 6, 7, 8**, 13 |
| Tabla nueva / columna de tenant / policy RLS | **4, 7, 8, 13, 17** |
| API route nueva o modificada | **6, 7, 8, 12, 14, 15, 17** |
| Formulario / input de usuario | 12, **14, 15**, 16 |
| Upload / Storage / certificados | **5, 16**, 3, 13 |
| Motor DTE / firma / CAF / `.pfx` | **3, 5, 13, 20** (zona roja) |
| Middleware / `next.config` / headers | **1, 6, 9, 18, 19** (zona roja) |
| Dependencias / `package.json` / lock | **20**, 1, 2 |
| Multi-tenancy / subdominios | **4, 6, 7, 9** |
| Deploy / variables de entorno | **1, 2, 3, 19, 20** |
| UI que renderiza datos de usuario | **15**, 17 |
| Logging / monitoreo | 1, **13** |

**Regla transversal:** si el cambio toca `store_id`, `role` o RLS → revisar **siempre 4, 7, 8** y agregar prueba negativa.

---

## 5. Procedimiento de verificación

### Código (local)

```bash
cd "C:\Users\Blaz Baez\Desktop\E-commerce Project\austral-market-next"

# Dependencies (ítem 20)
npm audit --audit-level=high --omit=dev

# Secretos en árbol de trabajo (ítem 1/2)
git ls-files | Select-String -Pattern '(^|/)\.env|\.pem$|\.pfx$|\.key$'
git log --all --oneline -- .env*

# Zod coverage (ítem 14)
rg "safeParse|z\.object" src/app/api --stats

# Bypass / header trust (ítems 6, 7)
rg "audit=true|isAudit|x-store-id" src
```

### Supabase (solo lectura, ítems 4, 7, 13, 16)

```sql
-- RLS y FORCE
SELECT tablename, rowsecurity, relforcerowsecurity
FROM pg_tables t
JOIN pg_class c ON c.relname=t.tablename AND c.relnamespace='public'::regnamespace
WHERE schemaname='public' ORDER BY tablename;

-- Tablas con RLS sin policies
SELECT t.tablename FROM pg_tables t
JOIN pg_class c ON c.relname=t.tablename AND c.relnamespace='public'::regnamespace
WHERE t.schemaname='public' AND c.relrowsecurity=true
AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname='public' AND p.tablename=t.tablename);

-- Policies sin scope de tienda (riesgo cross-tenant)
SELECT tablename, policyname, cmd, qual FROM pg_policies
WHERE schemaname='public'
  AND (qual NOT ILIKE '%store_id%' OR qual IS NULL)
  AND tablename IN ('profiles','sii_logs','stores','sii_config');

-- Bucket público
SELECT id, name, public FROM storage.buckets;
```

> **Nunca** pegar el token de Supabase en el repo ni en el chat. Usar variable de entorno temporal y borrar el archivo al terminar.

---

## 6. Hallazgos en vivo — snapshot 2026-11-18

| Dato | Valor |
|---|---|
| Proyecto | `supermercado-sf` (`bddpzqayurvhgpllykku`), `us-east-1`, `ACTIVE_HEALTHY` |
| Postgres | 17.11.0.003 |
| Tablas public con RLS | 36 (las 36 con `force_rls=true`, verificado 2026-11-19) |
| Tablas con policies | 33 |
| RLS sin policies | `admin_finances`, `master_catalog_submissions`, `users` |
| Usuarios | 61 total; 5 con role privilegiado en metadata |
| Datos | 2 tiendas, 61 profiles, 1 `sii_config`, 2 API keys |
| Storage | 4 buckets (3 privados, 1 público), 5 policies bucket-scoped |
| Funciones | `get_store_id`, `get_merchant_id`, `protect_profile_role_and_store_id` |
| Triggers | `tr_protect_profile_role_store_id`, `tr_protect_store_id` |

**Inconsistencias:**
1. `admin_total` / `manager_profile_access` sin `store_id` — **corregido y verificado en vivo** en migración 034; probablemente inertes hoy porque el claim JWT `role` es `authenticated`.
2. `sii_logs` insert libre (`with_check: true`) — **corregido y verificado en vivo** en migración 034 (`with_check = store_id = get_store_id()`); además 035 restringe el insert a service_role.
3. `SII_ENCRYPTION_KEY` ausente en `.env.local` → clave `'000...0'` en local.
4. Working tree con muchos deletes/modificaciones preexistentes — revisar antes de commitear.
5. `scripts/generar-dd-correcto.ts` (untracked) rompe el type-check del build — preexistente, fuera de scope.
6. `npm run lint`: 226 errores preexistentes en el repo — fuera de scope.
7. `profiles` tiene 1 fila con `store_id = 92674aea-ea7c-49f7-b208-abe43aad182a` que **no existe** en `public.stores` (solo 2 tiendas reales). 17 perfiles tienen `store_id = null`. Revisar si son cuentas globales legítimas o datos huérfanos.

---

## 7. Bitácora de revisión

| Fecha | Evento | Resultado |
|---|---|---|
| 2026-11-18 | Auditoría inicial 20 ítems | 3 ✅ / 13 ⚠️ / 4 ❌ |
| 2026-11-18 | Verificación en vivo Supabase (solo lectura) | 3 hallazgos nuevos (§2, §6) |
| 2026-11-18 | Fix ítem 6 (bypass `?audit=true`) | ✅ prueba real `/admin`,`/pos`,`/developer` → 307 login |
| 2026-11-18 | Fix ítem 7 en código (header `x-store-id`) | ✅ dashboard/series usan perfil; register resuelve dominio |
| 2026-11-19 | Migración 034 (policies + FORCE RLS) | ✅ aplicada; 35/35 tablas con force_rls; prueba negativa RLS pasó |
| 2026-11-19 | Migración 035 (triggers de auditoría) | ✅ aplicada; 3 triggers, redacción `[REDACTED]` verificada |
| 2026-11-19 | Tanda DTE/SII (18 rutas) | ✅ zod + roles de DB + auth primero; 401 sin sesión en todas |
| 2026-11-19 | Tanda cifrado/headers/uploads | ✅ AES-GCM, CSP prod sin `unsafe-eval`, HSTS, magic bytes |
| 2026-11-19 | Wave de dependencias 1-4 | ✅ 0 critical, 1 high residual; golden DTE byte-idéntico |
| 2026-11-18 | Evidence gates | build compila; type-check/lint rotos por archivos preexistentes |
| 2026-11-19 | Revalidación independiente | 9 hallazgos R1-R9 confirmados (§2.1) |
| 2026-11-19 | Cierre R1/R2/R4/R7 | CAF cifrada + fail-closed, store v2 sin secretos, sin XML en respuestas, selects explícitos ✅ |
| 2026-11-19 | Cierre R3 | Staff `store_id+rut` + índice parcial; 6 deny policies; `dup_staff=0` ✅ |
| 2026-11-19 | Cierre R6 | CSP nonce real por request; bug `.join(' ')` detectado y corregido; 4/4 checks OK ✅ |
| 2026-11-19 | Cierre R8/R9 | `environment` auditado; toggle y motor en el mismo campo; `sii_env=certification` ✅ |
| 2026-11-19 | Gates v1.4 | tsc 0; Jest 10/10; golden DTE OK; audit 0 critical; HTTP 20/20 → 401; build/lint ⚠️ preexistentes |
| 2026-11-19 | Auditoría final 4 bloques | v1.4 tenía afirmaciones falsas y regresiones (service key, secure:false SSO, RUT cross-tenant, salt roto, 19 selects, RUT CAF condicional) |
| 2026-11-19 | Fixes v1.5 | 15 ✅ + 5 ⚠️ / 0 ❌; 0 selects; 0 `secure:false`; gates reales pasan; handoff con residuales |

**Actualizar esta tabla** cada vez que se re-run el checklist.
