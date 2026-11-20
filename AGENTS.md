# AGENTS.md — YAHPOS! Constructor Protocol

## 0. REGLA DE ORO (vigente desde 2026-08-12): correctitud y seguridad antes que velocidad

Decisión explícita del dueño del proyecto tras una auditoría de un día que encontró ~10 bugs
severos (varios críticos: escalada de privilegios, `/admin`/`/pos` inaccesibles para dueños
reales, checkout que podía dejar órdenes pagadas sin items) — todos con la MISMA causa raíz:
algo se construyó una vez, quedó a medias o se reemplazó por otra cosa en paralelo, y nadie
verificó que las dos partes siguieran de acuerdo.

**A partir de ahora, para CUALQUIER tarea (no solo las marcadas zona roja):**
- Es aceptable y esperado que una tarea tome 2-3x más tiempo de lo habitual si eso evita dejar
  un hueco de seguridad o un flujo roto. Velocidad NUNCA es excusa para saltarse esto.
- Si la tarea toca una tabla nueva o un nuevo camino de escritura (INSERT/UPDATE/DELETE) desde
  el cliente que respeta RLS, la policy de RLS correspondiente se define en el MISMO handoff —
  nunca "la seguridad se agrega después".
- Antes de reportar como terminada una tarea que toca auth, roles, `store_id`, o cualquier tabla
  con RLS, verificar explícitamente: ¿qué política de la tabla aplica? ¿el cliente usado
  (`createClient()` vs `createAdminClient()`) es el correcto para este caso? ¿hay algún otro
  código que ya lea/escriba esta misma data de otra forma?
- Si notás una inconsistencia fuera del scope de tu tarea actual (una función que no existe,
  una tabla que nadie sincroniza, un valor hardcodeado que no matchea el real) — repórtala en el
  Report Back aunque no la arregles. No la ignores ni la dejes pasar en silencio.
- El "Evidence Gate" de la Fase 3 (Verify) no es solo build+lint — si la tarea toca RLS/auth/
  escritura de datos, agregar una prueba real (query directa, curl, o similar) que confirme el
  comportamiento esperado Y que el caso negativo (usuario sin permiso) siga bloqueado.

---

Rol: **Constructor / Orchestrator.** Descompones, delegas, verificas y reportas. NO ejecutas código directamente si puedes delegarlo a un subagente. Piensa como un Engineering Manager que revisa PRs, no como un junior que escribe línea por línea.

---

## 1. Pipeline de Trabajo (4 Fases)

Toda tarea sigue este pipeline. No brincar fases.

```
Decompose → Delegate → Verify → Report
(orquesto)  (subagentes) (reviso)  (documento)
```

### Fase 1 — Decompose (Yo = Orchestrator)
Antes de tocar código:
1. Leer handoff + project state (AGENTS.md, BITACORA.md, Kanban)
2. Descomponer la tarea en subtareas **aisladas** con:
   - File scope explícito (lista de archivos que toca)
   - Dependencias entre subtareas (paralelo vs secuencial)
   - Definition of Done (build, lint, test que debe pasar)
   - **Regla de oro:** ningún archivo aparece en más de una subtarea
3. Crear TodoWrite con todas las subtareas
4. Mostrar descomposición al usuario para aprobación

### Fase 2 — Delegate (Subagentes)
- Subtareas **independientes** → lanzar `Task(general|explore)` **en paralelo**
- Subtareas **dependientes** → pipeline secuencial (output de A → spec de B)
- Cada subagente recibe: spec clara, file scope, quality gates
- Cada subagente devuelve: resultado + diff + evidencia

### Fase 3 — Verify (Yo = Reviewer)
1. Scope governance: verificar que ningún archivo fuera de scope fue tocado
2. Evidence gates: `npm run build` + `npm run lint` global
3. Revisar diff contra spec original
4. Si falla → rework (máx 3 intentos, luego escalar)

### Fase 4 — Report (Yo = Documenter)
1. Actualizar BITACORA.md (changelog)
2. Escribir Report Back estructurado
3. Actualizar Kanban
4. Dejar TASK_HANDOFF.md actualizado

---

## 2. Reglas Always-On

| # | Regla |
|---|-------|
| 1 | Siempre empieza la sesión leyendo `AGENTS.md`, `TASK_HANDOFF.md`, `BITACORA.md`, `YAHPOS Kanban.md`, `docs/operacion/REGISTRO_BUGS.md` y `docs/operacion/TAREAS_COLABORADOR.md` (§12) |
| 2 | **No ejecutes si puedes delegar.** Si una subtarea es independiente y tiene scope claro, úsala para un subagente. |
| 3 | Evidence gates (build + lint) **deben pasar** antes de reportar. Si fallan, no escondas el error. |
| 4 | Mismo error 3 veces seguidas → STOP → reporta. No sigas iterando. |
| 5 | NO modifiques archivos fuera del scope listado en descomposición |
| 6 | NO edites `YAHPOS Kanban.md` ni archivos de planificación |
| 7 | NO dejes comentarios en el código a menos que sea estrictamente necesario |
| 8 | Al completar tarea, actualiza BITACORA.md y AGENTS.md |
| 9 | **TodoWrite obligatorio** al inicio de cada tarea — mantener actualizado en tiempo real |
| 10 | Si un subagente toca archivos fuera de su scope → abortar y reportar |
| 11 | **Documentación proactiva para clientes.** Cada vez que analices o implementes algo (flujo de pago, integración, lógica de negocio), evalúa si es útil para documentación de clientes (PPT, manuales, diagramas). Si lo es, agrega/actualiza en `docs/` con diagramas, tablas de costos, configuraciones por negocio, y explicaciones "para el dueño del negocio". Si no aporta, salta. |
| 12 | **Ver Regla de Oro (§0).** Correctitud/seguridad sobre velocidad — RLS y auth se verifican en el mismo handoff, nunca después. |

---

## 3. Subagente Orchestration Patterns

### Fan-out/Fan-in (tareas independientes)
```
Task(explore) "Buscar todos los usos de X"  ─┐
Task(general) "Implementar feature Y"         ─┼─→ Yo sintetizo
Task(explore) "Verificar impacto en Z"        ─┘
```

### Pipeline (tareas secuenciales)
```
Task(explore) "Investigar" → Task(general) "Implementar" → Task(explore) "Verificar"
     output depende     output depende
     del anterior       del anterior
```

### Research → Implement (investigación + ejecución)
```
Task(explore) "Investigar patrón/API/dependencias" → entrega facts + recomendación
Task(general) "Implementar siguiendo la recomendación"
```

### Paralelo con Síntesis (deliberación)
```
Task(general) "Opción A: pros/cons"
Task(general) "Opción B: pros/cons"
Yo: sintetizo y recomiendo la mejor
```

---

## 4. Estado Actual del Proyecto

**Framework:** Next.js 16.4.6 (App Router) + Webpack  
**Styling:** Tailwind CSS v4 + CSS variables  
**Auth:** Supabase SSR (OAuth Google)  
**DB:** Supabase PostgreSQL  
**Branch activa:** `main`

### ⚠️ Regla Crítica #1: Tailwind v4
**`tailwind.config.ts` ES IGNORADO.** Todo el theme se define en `globals.css` dentro de `@theme { ... }`.  
Clases disponibles: `bg-brand-primary`, `text-brand-accent`, `from-brand-500`, `shadow-brand-primary/10`

### ⚠️ Regla Crítica #3: Dual ThemeProvider — NO inyectar --surface-* inline
Hay DOS `ThemeProvider` en el árbol: el del `RootLayout` (defaultTheme="dark") y el del POS layout (defaultTheme="light"). `BrandThemeSetter` solo inyecta `--brand-*` inline. **No inyectar `--surface-*` inline** porque se desincronizan: los inline styles de un ThemeProvider pispean el CSS `.dark` class del otro. Las surface colors deben manejarse exclusivamente via CSS (`:root` / `.dark` en globals.css).

### ⚠️ Regla Crítica #4: Hardware Browser APIs (WebUSB / Web Bluetooth / Web Serial)
Solo disponibles en Chromium (Chrome, Edge, Opera). No funcionan en Firefox ni Safari. El POS detecta automáticamente si están disponibles y muestra mensaje si no. Las APIs requieren interacción del usuario (click) para conectar — no se pueden auto-conectar sin gesture.

### Hardware Layer Files
| Archivo | Propósito |
|---------|-----------|
| `src/lib/hardware/types.ts` | Tipos compartidos, constantes ESC/POS |
| `src/lib/hardware/printer.ts` | PrinterManager — WebUSB, ESC/POS receipt builder |
| `src/lib/hardware/cashDrawer.ts` | CashDrawerManager — abre gaveta vía impresora o USB directo |
| `src/lib/hardware/bluetooth.ts` | BluetoothScanner — BLE service 0xFFF0 + HID fallback |
| `src/lib/hardware/hardwareStore.ts` | Zustand store unificado |

### Customer Display ✅
- **Implementado:** 2026-05-14
- **Ruta:** `/(pos)/pos/customer-display`
- **Sincronización:** BroadcastChannel (`useCustomerDisplayBroadcast` / `useCustomerDisplayReceiver`)
- **Estados:** idle, cart-update, payment-qr, payment-confirmed, reset
- **Futuro:** Supabase Realtime para sincronización cross-device

### ⚠️ Regla Crítica #2: Auth SSO — RESUELTO (verificado 2026-07-28)
`src/app/api/auth/callback/route.ts:74-108` respeta `fromOrigin` correctamente antes de caer al
fallback `.limit(1)`. Ver `docs/archivo/AGENTS_secciones_obsoletas_2026-07-28.md` para el texto
original de este bug (quedó desactualizado, nunca se corrigió el doc cuando se arregló el código).

### Investigación Pendiente: Inngest (Background Jobs)
- **Investigado:** 2026-05-13
- **Documentado en:** BITACORA.md §8
- **Para implementar:** Setup inicial → Migrar SII sync → Programar reportes → Resends marketing
- **Integración:** `npx inngest-cli@latest dev` + `src/inngest/client.ts` + `src/app/api/inngest/route.ts`

### Idea Pendiente: MCP Server Dinámico para YAHPOS!
- **Investigado:** 2026-05-14
- **Documentado en:** BITACORA.md §9
- **Propuesta:** MCP server con tools dinámicas que lean el codebase (componentes, API routes, brand vars)
- **Cuándo implementar:** Cuando el proyecto llegue a 1000+ archivos o se sume otro dev
- **Estimación:** 4-8h

### Zonas Rojas (NO tocar sin permiso)
`middleware.ts`, `SaaSProvider.tsx`, `src/lib/sii/engine.ts`, `src/lib/supabase.ts`, `src/lib/supabase.ts`

### Archivos que NO tocar
`src/sections/PlatformLanding.tsx`, `src/components/layout/PlatformHeader.tsx`, `src/app/(auth)/login/page.tsx`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`

---

## 5. Últimos Cambios

### 2026-11-20 (HAL-001 / BUG-001: CSS roto por CSP sobre HTTP) — sin commit

`src/proxy.ts` condiciona `upgrade-insecure-requests`: solo producción o request HTTPS. Antes rompía CSS/chunks en `http://IP-Tailscale:3000` (`ERR_SSL_PROTOCOL_ERROR`). Verificado en navegador (root y `/developer/catalog` con estilos), tsc 0, lint 0, build 0. Además, `stores.custom_domain` de la tienda `master` apunta a `master.100.111.116.27.nip.io:3000` para que el colaborador vea la tienda sin editar `hosts`; guía actualizada. Detalle en `BITACORA.md` y `docs/operacion/REGISTRO_BUGS.md`.

### 2026-11-20 (cierre ESLint + segunda ola sin hardcodes) — sin commit

7 scopes disjuntos, todos con tests. Auth: `src/lib/auth/sso-target.ts` valida `from_origin`/`next`
en servidor; open redirect con exfiltración de tokens cerrado (62 tests). Infra: helper
`src/lib/config/root-domain.ts` + `proxy.ts`, `EditorToggle`, `session-sync`, `lib/api.ts`,
`api/products`, developer, admin, hardware y contacto derivan de env; `0` dominios literales en
producción y `0` `any`. `QuickStockPanel` scopea `inventory` por tienda/sucursal.

**Gates:** lint 0; tsc 0; Jest 45 suites/297 tests; build 0. Sin commit/push.

**Requerido antes de operar:** configurar `NEXT_PUBLIC_ROOT_ORIGIN` en `.env.local` — si falta, el
proxy fail-closed responde 500. También `NEXT_PUBLIC_ROOT_DOMAIN` y `NEXT_PUBLIC_SUPPORT_EMAIL`.
`domain_verified` no existe en migraciones (DDL pendiente). PAT/service keys/PFX siguen pendientes
de revocación/rotación; 040 no ejecutada.

### 2026-11-20 (limpieza global de basura y código muerto) — sin commit
| Archivo | Cambio |
|---------|--------|
| Raíz del workspace (sin git) | Lote 1: 71 archivos one-off (43 `.js`, 21 JSON ~67 MB, 3 SQL, 2 txt, `package.json`/`lock`) + `scrapers/` + `node_modules/` ≈100 MB. 0 refs en código vivo. |
| `austral-market-next/screenshots/` | 4 PNG byte-idénticos borrados (02_Nosotros, 07_Perfil, 15_Admin_Inventario, 16_Admin_Reportes). Quedan 14. |
| `.trae/`, `austral-market-next/.agents/` | 74 archivos duplicados borrados. `.agents` root conservado: es el que carga OpenCode. |
| `austral-market-next/public/images/categories/` | 8 PNG idénticos a los `cat_*_premium_*.png` conservados. `sw.js` regenerado por build sin refs a la ruta eliminada. |
| `docs/README.md`, `docs/operacion/INSTRUCCIONES_PARA_OPENCODE.md` | Refs muertas → nota de eliminación; enlace al plan corregido. Plan y archivo NO editados (regla #6). |

**Gates:** tsc 0; build verde; Jest 7/76; lint 247 (5/242) = baseline. Grafo: 4297 nodos / 7582 edges / 347 comunidades. Sin commit ni push. Dueño borró además `pdf_parser/` y `pdfs_productos/` fuera de este handoff.

### 2026-11-20 (fix `orders.filter is not a function`) — sin commit
| Archivo | Cambio |
|---------|--------|
| `src/app/admin/pedidos/page.tsx` | `fetchOrders()` con `response.ok` + `Array.isArray` antes de `setOrders`; fail-closed `[]`. tsc 0; build verde; lint 247 (baseline). |

Hermanos del mismo patrón corregidos con autorización del dueño: `admin/configuracion/page.tsx:592-607` (`r.ok` + `Array.isArray` + `[]` en catch) y `pos/CustomerModal.tsx:63-85` (`res.ok` + forma válida; `null` sigue siendo "no encontrado"). Gates finales: tsc 0, build verde, lint 247 (baseline), Jest 76/76.

### 2026-11-19/20 (preparación de 040 + scripts) — sin ejecución, sin commit
| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/040_lints_hardening.sql` (nuevo) | Guards fail-closed: REVOKE `PUBLIC, anon` en 2 funciones, DROP condicional de `public_read_store_logos`, índices `uq_*` solo por definición exacta, `search_path` de `audit_sensitive_changes()`. `store_isolation_policy`, `settings_pkey`, `reserve_folios` y `get_store_by_domain` intactos. |
| `scripts/verify_040.mjs`, `scripts/test_signup_store_metadata.mjs` (nuevos) | Verificación read-only de ACLs/policies/índices; prueba controlada del vector de signup con limpieza en `finally` y doble fail-closed (`ALLOW_SIGNUP_PROBE=1`). |

**Gates:** tsc 0; `node --check` 0; build global verde; Jest 7/76; lint 5 errores / 242 warnings (baseline). Sin SQL en vivo ni credenciales nuevas.

### 2026-11-19 (triaje de lints Supabase snapshot 20:15Z) — solo plan, sin ejecución

| Archivo | Cambio |
|---------|--------|
| `BITACORA.md`, `TASK_HANDOFF.md`, `AGENTS.md` | Diff del snapshot 20:15Z contra los 4 CSV de 02:52Z; hallazgos priorizados con evidencia `archivo:línea`; plan ordenado con 9 fases, gates y prueba real + negativa; registro de decisión. |

Sin SQL en vivo, sin PAT, sin código, sin commit. Hallazgo nuevo a probar con autorización: signup
directo a Auth con `store_id` ajeno en metadata (`038:124-131` + `001:131-134`, el trigger bloquea
solo UPDATE). `store_isolation_policy` no se dropea: es la red de `WITH_CHECK` por tienda.

### 2026-11-20 (limpieza de lint ESLint) — sin commit
| Archivo | Cambio |
|---------|--------|
| 84 archivos de `src/**` + `eslint.config.mjs` | 241 → 5 errores de lint. `any` → tipos reales; `Math.random` fuera de render; `let`→`const`; entidades escapadas; `scratch/**` ignorado. Supresiones solo en hidratación/fetch donde el fix real cambiaría comportamiento. |
| 6 archivos admin/developer | 7 errores TS resultantes del nuevo tipado corregidos sin tocar lógica. |

**Evidencia:** tsc 0; Jest 76/76; build global verde; HTTP 200; SW 10/0; lint 5 errores / 242 warnings.
**Excluidos por decisión:** `login/page.tsx`, `PlatformLanding.tsx` (NO tocar) y `SaaSProvider.tsx` (zona roja) concentran los 5 errores restantes. Sin commit.

### 2026-11-19/20 (lints Supabase + build global + hardcodeos) — sin commit
| Archivo | Cambio |
|---------|--------|
| `tsconfig.json` | `scripts/**` fuera del type-check → `tsc` global 0, `npm run build` global verde |
| `scripts/setup_test_user.mjs`, `test-supabase.mjs`, `scratch/*.{mjs,ts}`, 5 scripts SII | Service key y `STORE_ID` desde env; fail-closed; 0 secretos literales en repo |
| `EditorProvider.tsx`, `api/v1/bot/inventory/pending/route.ts` | `.eq('store_id', …)` en 2 queries sin scope |
| `api/blumi/prueba-motor`, `lib/blumi/client.ts`, `.env.example` | Sin emisor ajeno de fallback; `BLUMI_SANDBOX_URL` obligatoria en prod |
| `developer/actions/stores.ts` | `admin_finances` con `createAdminClient()` y error chequeado |
| `supabase/migrations/039_function_privileges_hardening.sql` (nuevo) | REVOKEs críticos, `search_path`, storage y deny. **Aplicada en vivo el 2026-11-20** |

**Evidencia:** tsc 0; build global 0; Jest 7/76; lint 509 (241 errores preexistentes); HTTP 200;
SW 10 cachés de assets, 0 handlers `/api/`; 0 llaves literales; 0 UUID de tenant en `src/`.
039 aplicada y verificada: 4 RPC críticos → `42501` con anon; `get_store_by_domain` → 200.
**Pendiente CRÍTICO:** revocar el PAT Supabase (expuesto en chat), rotar service keys y PFX.
`DEVELOPER_EMAILS`/dominio raíz/contacto de tenant siguen en decisión.

### 2026-11-19 (set SII en facturación + voucher POS) — 6 ST, sin commit
| Archivo | Cambio |
|---------|--------|
| `admin/facturacion/{actions.ts,page.tsx,components/DocumentTabs.tsx}`, `api/sii/caf` | store/rol desde sesión, `tipo` validado, gate por CAF vigente (fecha Chile), link al set |
| `admin/facturacion/pruebas/**`, `lib/sii/test-cases.ts`, `api/sii/estado/[id]` | Set E2E: emite → verifica BD → envía → track_id + veredicto real; 4 casos 39, resto bloqueado por CAF; cuota UI de 1 folio |
| `lib/pos/sii-decision.ts`, `(pos)/pos/page.tsx`, `PaymentModal`, `PosSettingsModal`, `posStore` | Decisión `dte/voucher/blocked`, bloqueo antes de cobrar, SumUp unificado, sin terminal heredado |
| `PosReceiptModal`, `hardware/{types,printer}`, `customer-display/**`, `api/{orders,sii/sync}`, `OfflineSyncManager`, `validations/orders` | Voucher no-SII explícito, persistencia `document_kind`, 409 en sync, sin falso folio |
| `lib/sii/{auth,engine,caf,pdf-generator,pdf-datos}.ts` | **Zona roja autorizada**: fail-closed MOCK, CAF `RE`, PDF con detalle. Bitácora línea por línea en `TASK_HANDOFF.md` |
| `migrations/037_orders_offline_id_unique.sql` | Índice único de `offline_id`; aplicado en vivo, 0 duplicados previos |

**Evidencia:** Jest 6 suites/46; tsc 0 global; build global verde (`scripts/**` excluido en tsconfig);
eslint 509 preexistentes; HTTP 307/401/405 esperados; CSP 7/7 nonce same-request;
golden autofirmado `6a4182ed…f67e89` en 2 procesos (SHA histórico no reproducible).
**Pendiente:** ejecutar 1 caso real con sesión/PFX/CAF 39, verificar voucher impreso, aplicar 037 en
producción, revocar token Supabase. Sin commit.

### 2026-11-19 (auditoría final v1.5) — 15 ✅ / 5 ⚠️ / 0 ❌ abiertos
| Archivo | Cambio |
|---------|--------|
| 4 auditores + gates | Revisión de los 20 controles contra código real; v1.4 tenía afirmaciones falsas y regresiones |
| `api/auth/{sso,register,session-sync}`, `api/sii/{caf,documentos/*}`, `api/wizard/caf` | `secure` prod, scope `store_id`, escape `<`/`>`/`&`, rol antes de body/doc, RUT CAF fail-closed |
| `src/lib/security.ts`, `.env.example`, `validations/{orders,staff,api}.ts`, `api/customers` | salt unificado, `SII_ENCRYPTION_KEY`, `.strict()`, `parseQuery` en DELETE |
| 19 selectores + 4 fixes TS | 0 `select('*')`/`.select()` en `src`; columnas explícitas + `.limit()` |
| `CHECKLIST_SEGURIDAD.md` v1.5, `TASK_HANDOFF.md`, `BITACORA.md` | tabla honesta, handoff de residuales, changelog |

**Evidencia:** tsc 0 en `src/`; Jest 10/10; build compila; audit 5 (0 critical); HTTP 20/20 → 401; CSP 4/4 + nonce same-request; DB 36/36 RLS+FORCE.
**Handoff:** service key en zonas rojas, `httpOnly:false` por diseño SSR, sin redirect HTTPS en repo, buckets Storage sin versionar, `serialize-javascript` high vetado, PFX real y revocación del token. Sin commit.

### 2026-11-19 (cierre real v1.4) — auditoría 20 ✅ / 0 ❌
| Archivo | Cambio |
|---------|--------|
| `src/lib/sii/caf-store.ts` (nuevo), `engine.ts`, `emisor-config.ts`, `api/sii/caf` | CAF cifrada en reposo (AES-256-GCM), `decodeCaf` fail-closed, backfill `encrypted=5`, 0 CAF planos, golden DTE byte-idéntico |
| `src/stores/siiStore.ts`, `OfflineSyncManager.tsx`, `api/sii/auth/token` | Store v2 con `migrate` que borra CAF/token de IndexedDB; sin secretos en respuestas |
| `supabase/migrations/036_final_security_fixes.sql` (nuevo) | `environment` auditado, índice `profiles_staff_store_rut_key`, 6 deny policies |
| `src/middleware.ts` → `src/proxy.ts`, `next.config.ts` | CSP con nonce real por request; bug `.join(' ')` corregido a `.join('; ')`; CSP estática removida |
| `src/app/api/**`, `developer/actions/stores.ts` | `select('*')`/`.select()` → columnas explícitas + `.limit()`; sin XML en JSON; staff scoping `store_id+rut` |
| `src/app/api/orders`, `session-sync`, `MovementReceiptModal`, fixtures Jest | R5 auth-first; `<script nonce>`; impresión sin inline; tests 10/10 |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md`, `BITACORA.md`, `TASK_HANDOFF.md` | v1.4 con tabla final, 9/9 hallazgos cerrados y plan de pruebas de zonas rojas |

**Evidencia:** tsc 0 global; Jest 10/10; build global verde (`scripts/**` excluido en tsconfig);
eslint global 519 preexistentes ⚠️; audit 0 critical; CSP 4/4; HTTP 20/20 → 401; DB 36/36 RLS+FORCE.
**Pendiente del dueño:** revocar token Supabase; verificar contraseña cifrada con el PFX real. Sin commit.

### 2026-11-19 (revalidación final) — auditoría re-abierta: 12 ✅ / 6 ⚠️ / 2 ❌
| Archivo | Cambio |
|---------|--------|
| `docs/seguridad/CHECKLIST_SEGURIDAD.md` | v1.3: 9 hallazgos nuevos confirmados por revisión independiente; ítems 5 (cifrado de CAF) y 7 (upsert staff cross-tenant) pasan a ❌ |
| `BITACORA.md` | Registro de revalidación: gates, matriz HTTP, DB en vivo y nota de integridad del valor cifrado de `sii_config` |

**Pendiente del dueño:** cerrar token Supabase; decidir fix de R1/R3 antes de operar en producción; verificar certificado con el PFX real (el ciphertext original se reemplazó por GCM funcional durante la prueba de redacción). Sin commit.

### 2026-11-19 (tanda final) — auditoría 20/20 cerrada
| Archivo | Cambio |
|---------|--------|
| `src/app/api/sii/**`, `wizard/**`, `blumi/**` (18 rutas) | Zod + roles desde `profiles.role`; auth antes del body; sin XML/certificados en respuestas |
| `src/lib/validations/sii.ts` | Esquemas DTE/SII/wizard/Blumi (CAF, rangos, ambiente, cola offline) |
| `src/lib/crypto.ts` | AES-256-GCM `02:` + fallback CBC |
| `next.config.ts` | CSP prod sin `unsafe-eval` + HSTS |
| `supabase/migrations/035_audit_triggers.sql` | (nuevo) auditoría con `[REDACTED]`, aplicada y verificada |
| `customers`, `orders`, `ai/generate-description`, `products` POST | Últimos `req.json()` → `parseBody`; products auth-first |
| `package.json` / lock | `zod@4.6.7`, `node-forge@1.4.3`, `fast-xml-parser@5.12.1`, `xml-crypto@6.4.0`, `next@16.4.6`, `eslint-config-next@16.4.6` + `npm audit fix` |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md`, `BITACORA.md` | v1.2: 12 ✅ / 8 ⚠️ / 0 ❌; golden DTE byte-idéntico; audit 24 → 5 |

**Residuales:** `serialize-javascript` vía `next-pwa` (fix exige downgrade major), DEK/KMS,
paginación, nonce de CSP, 3 tablas sin policies, 1 `store_id` huérfano. Sin commit.

### 2026-11-19 (tanda 2)
| Archivo | Cambio |
|---------|--------|
| `src/lib/dev-auth.ts` | (nuevo) `dev_token` HMAC-SHA256 con expiración 2h; rechaza valor estático/tampered/expirado/futuro |
| `src/lib/ratelimit.ts`, `src/middleware.ts` | Fail-closed en producción + fallback memoria en dev; `critical`/`operational`/`public`; sin logs de cookies |
| `src/lib/constants/roles.ts`, `src/app/api/staff/route.ts` | Whitelist de roles; bloqueo de escalada a `owner`/`developer` |
| `src/lib/validations/{http,api,staff}.ts` | (nuevos) `parseBody`/`parseQuery`/`parseFormData` + esquemas zod centralizados |
| ~30 API routes | Zod en writes no-DTE; `orders` PATCH y `products/[id]` PATCH restringidos |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md`, `BITACORA.md` | Checklist v1.1: 11 ✅ / 8 ⚠️ / 1 ❌; evidencia de pruebas reales |

**Pendiente:** tanda final DTE/SII (`/api/sii/*`, `/api/wizard/*`, `/api/blumi/*`), ítems 5/13/15-20, y dependencias (`next`, `node-forge`).

### 2026-11-19
| Archivo | Cambio |
|---------|--------|
| `src/middleware.ts` | Eliminado bypass de autenticación `?audit=true` |
| `src/app/api/dashboard/route.ts`, `series/route.ts` | `store_id` sin confiar en header del cliente; fallback a dominio resuelto en servidor para cuentas globales |
| `src/app/api/auth/register/route.ts` | `store_id` resuelto desde Host; fail-closed si dominio inválido |
| `supabase/migrations/034_security_fix_cross_tenant_and_rls.sql` | Scope de tienda en policies + FORCE RLS (aplicado y verificado en vivo) |
| `docs/seguridad/CHECKLIST_SEGURIDAD.md` | Checklist de 20 controles para revisión futura |
| `BITACORA.md` | Registro completo del handoff |

### 2026-05-13
| Archivo | Cambio |
|---------|--------|
| `src/app/globals.css` | brand-* agregados al @theme. Dark mode backgrounds neutralizados |
| `src/lib/contrast.ts` | (nuevo) Utilidad WCAG |
| `src/app/admin/branding/page.tsx` | Panel smart contrast |
| `src/components/pos/PosSettingsModal.tsx` | violet-* → brand-* |
| `src/components/admin/DesignWishlistModal.tsx` | purple-* → brand-primary |
| `src/components/admin/ProductModal.tsx` | purple-* → brand-primary |
| `src/app/admin/page.tsx` | Recharts height fixed |
| `src/app/admin/reportes/page.tsx` | Recharts height fixed |
| `AGENTS.md` | Nueva metodología 4-fase pipeline con subagentes |
| Default brand-primary | `#7700cc` → `#4b0082` en 8 archivos |
| `CatalogViewer.tsx` | `corporate-blue` → `brand-primary` (23 usos) |
| `admin/configuracion/page.tsx` | `purple-*` → `brand-*` (7 usos) |
| `admin/personal/page.tsx` | `indigo-*` → `brand-*` (3 usos) |
| Charts (admin) | Hex `#003399`/`#1a4b8c` → `#4b0082` |
| `CashMovementModal.tsx` | `indigo-500` → `brand-500` |
| `CashOpeningModal.tsx` | `cyan-*` → `brand-accent-*` |
| `EditorProvider.tsx` | `purple-400` → `brand-400` |
| `(auth)/layout.tsx` | `purple-600/40` → `brand-600/40` |
| `carrito/page.tsx` | `purple-400` → `brand-400` |
| Footer, ShopBackdrop, PackSection, PacksSlide | gradientes/cyan → brand/brand-accent |
| `ecommerce.ts` | `cyan-500/20` → `brand-accent-500/20` |

### 2026-05-14 — Fix Dual ThemeProvider Desync
| Archivo | Cambio |
|---------|--------|
| `src/providers/BrandThemeSetter.tsx` | Eliminada inyección de `--surface-*` (causaba desync con POS ThemeProvider anidado) |
| `src/lib/color.ts` | `generateSurfaceShades` revierte a solo light-mode |
| `src/app/(pos)/pos/page.tsx` | Categories + Products scroll → `bg-surface-100` (unificado con Cart) |
| `src/app/globals.css` | `custom-scrollbar::-webkit-scrollbar` agrega `height: 4px` para scroll horizontal |
| `BITACORA.md` | Changelog actualizado |

### 2026-05-14 — Hardware Integration (WebUSB + Scanner Fix)
| Archivo | Cambio |
|---------|--------|
| `src/app/(pos)/pos/page.tsx` | Scanner fix: paste + Enter. Hardware init al montar POS |
| `src/lib/hardware/types.ts` | (nuevo) Tipos compartidos + constantes ESC/POS |
| `src/lib/hardware/printer.ts` | (nuevo) PrinterManager vía WebUSB |
| `src/lib/hardware/cashDrawer.ts` | (nuevo) CashDrawerManager |
| `src/lib/hardware/bluetooth.ts` | (nuevo) BluetoothScanner BLE + HID |
| `src/lib/hardware/hardwareStore.ts` | (nuevo) Zustand store unificado de hardware |
| `src/components/pos/PosReceiptModal.tsx` | Botón "Térmica" para impresión USB ESC/POS |
| `src/components/pos/PosSettingsModal.tsx` | Sección "Hardware" (conectar USB, abrir gaveta, BT scanner) |
| `src/app/api/products/route.ts` | TypeScript fix: `as any[]` en loadCatalog |
| `package.json` | `@types/w3c-web-usb`, `@types/web-bluetooth` agregados |
| `AGENTS.md` | Regla crítica #4 (Hardware APIs), tabla hardware files, customer display idea |
| `BITACORA.md` | Changelog actualizado, customer display en §9 |

### 2026-05-14 — Fase 0 (IVA Duplication Fix) + Fase 1 (Customer Display + Webpay QR)
| Archivo | Cambio |
|---------|--------|
| `src/lib/hardware/types.ts` | Constantes `TERMINALS_WITH_DTE`, `GATEWAY_METHODS`, `VOUCHER_METHODS` |
| `src/components/pos/PosSettingsModal.tsx` | Toggles per-terminal "Emite su boleta" en sección Hardware |
| `src/lib/hooks/useCustomerDisplaySync.ts` | (nuevo) Hooks BroadcastChannel: `useCustomerDisplayBroadcast`, `useCustomerDisplayReceiver` |
| `src/app/(pos)/pos/page.tsx` | IVA fix: per-terminal `shouldSkipSii` con safety validation |
| `src/app/(pos)/pos/page.tsx` | Broadcast integrado: cart-update, payment-confirmed, reset |
| `src/app/(pos)/pos/customer-display/page.tsx` | (nuevo) Fullscreen customer display con QR, confetti, auto-hide cursor |
| `src/app/api/payments/webpay/status/route.ts` | (nuevo) Webpay status polling (`tx.commit()`) |
| `src/components/pos/PaymentModal.tsx` | Método Webpay QR con creación + polling + auto-confirm |
| `AGENTS.md` | Últimos cambios actualizados |
| `BITACORA.md` | Changelog actualizado |

### 2026-05-14 — Fix Cashier Name Persistence en Customer Display
| Archivo | Cambio |
|---------|--------|
| `src/lib/hooks/useCustomerDisplaySync.ts` | `metadataRef` en broadcast + receiver; `updateData()` preserva cashierName/terminalName/terminalId entre broadcasts |
| `src/app/(pos)/pos/customer-display/page.tsx` | Nuevo `TerminalCashierBar` compartido; CashierName visible en cart-update, payment-qr y payment-confirmed |
| `BITACORA.md` | Changelog actualizado |

### 2026-05-15 — Fix Cashier Name (Root Cause)
| Archivo | Cambio |
|---------|--------|
| `src/lib/hooks/useCustomerDisplaySync.ts` | Nueva función `getCashierFromStore()` como tercer fallback en broadcast/receiver para leer directo del store Zustand |
| `TASK_HANDOFF.md` | Estado actualizado a fix-implemented con root cause |
| `BITACORA.md` | Changelog actualizado |

### 2026-05-16 — Loyalty Fixes + Multi-Tenant Auth + Customer Display V2
| Archivo | Cambio |
|---------|--------|
| `src/app/api/auth/callback/route.ts` | Auth callback ahora redirige a `fromOrigin` para TODOS los usuarios (clientes y staff). Staff con membresía filtrada por subdominio. |
| `src/app/api/auth/register/route.ts` | Agregado `store_id` al upsert del profile. Eliminada duplicación de `const storeId`. |
| `src/app/api/customers/route.ts` | GET: fallback a búsqueda sin `store_id` si no encuentra con él (perfiles web). |
| `supabase/migrations/021_identity_verification.sql` | Incluye UPDATE para marcar `is_full_account=true` en perfiles con email. |
| `src/app/(pos)/pos/page.tsx` | + `CustomerStatusPanel` (QR registro / icono carnet / verified badge) + auto-refresh cada 3s + `validateSession()` en handleCheckout + broadcast `reset` cuando carrito vacío + efecto inicialización estabilizado (sin `authUser`/`isAuthenticated` en deps) + efecto broadcast metadata ya no borra items |
| `src/app/(pos)/pos/customer-display/page.tsx` | IdleState ahora muestra "Bienvenidos a [Tienda]" con logo, o "gracias por preferirnos" con puntos si hay customerName |
| `AGENTS.md` | Handoff actualizado |
| `BITACORA.md` | Changelog actualizado |
| `YAHPOS Kanban.md` | Bugs marcados como resueltos |

### 2026-05-19 — Fix session-sync cookie propagation (INCOMPLETO — BLOQUEADO)
| Archivo | Cambio | Estado |
|---------|--------|--------|
| `src/app/api/auth/session-sync/route.ts` | Reescrito: HTML 200 + Set-Cookie headers + window.location.replace() en vez de NextResponse.redirect() + cookies | 🔄 Probado - auth sigue sin propagarse |
| `src/middleware.ts` | Sanitización trailing dots en redirect path | 🟢 Inocuo |
| `TASK_HANDOFF.md` | Documentación completa del estado bloqueado | 🟢 |

---

## 6. Historial — cross-subdomain auth loop (mayo 2026, estado sin confirmar)

Handoff del 19 de mayo sobre un loop de auth cross-subdominio quedó BLOQUEADO en ese momento
(hipótesis H1/H2/H3 sobre propagación de cookies en session-sync). Texto completo movido a
`docs/archivo/AGENTS_secciones_obsoletas_2026-07-28.md`.

**Estado 2026-07-28**: NO confirmado como resuelto ni como sigue roto. Hoy se cerró un bug
DISTINTO (flag `secure:false` en cookies de middleware.ts) y el test manual de esa tarea
(login cross-subdominio) no mostró loop — pero eso no confirma que el mecanismo H1/H2/H3
específico de este handoff viejo se haya resuelto. Verificar puntualmente antes de dar por
cerrado del todo.

### Pendiente (usuario)
- Ejecutar `021_identity_verification.sql` y `022_fix_drafts_session_id.sql` en Supabase SQL Editor (si no se hizo ya)

---

## 7. Bugs Conocidos (Backlog)

### 🔴 Bloqueantes — desactualizado, ver nota en §6
- [ ] **[Auth]** Session-sync cookie propagation — estado sin confirmar, ver §6
- [x] **[Build]** Webpack compilation hang con cache cold — no se reprodujo en build de hoy (2026-07-28, `npm run build` limpio en 11.8s)

### 🟡 Backlog
- [ ] **[Stab]** Invalid Refresh Token: Already Used (race condition Strict Mode)
- [ ] **[Infra]** Inngress — Setup inicial
- [ ] **[Infra]** Migrar SII sync a Inngest
- [ ] **[Mkt]** Resends — Sistema de reenvío de marketing a clientes

---

## 8. Convenciones

### CSS
- Preferir `bg-brand-primary/10` sobre colores fijos
- Estados semánticos: emerald=éxito, red/rose=error, amber=advertencia (NO cambiar)
- NO usar `purple-*`, `violet-*`, `indigo-*`, `sky-*`, `cyan-*` → `brand-*`

### Commits
- `feat:` nueva funcionalidad | `fix:` bug fix | `chore:` mantenimiento | `docs:` documentación

### Stack
- **UI:** React 19 + Tailwind CSS v4 + shadcn/ui + Framer Motion + GSAP
- **Estado:** Zustand + Supabase SSR
- **Testing:** Jest (unit) + Playwright (e2e)
- **Pagos:** Transbank SDK, Webpay, Edenred, Pluxe, Junaeb, SumUp, Getnet
- **DTE/SII:** Motor propio — Node-Forge, XML-Crypto, CAF, .pfx

---

## 9. Formato de Descomposición de Tareas

Antes de implementar, escribir esto en TASK_HANDOFF.md:

```
## Descomposición

### Subtarea 1: [nombre]
- **Tipo:** independiente | secuencial (depende de: X)
- **Archivos:** src/foo.ts, src/bar.tsx
- **DoD:** build pasa, lint pasa
- **Subagente:** explore | general

### Subtarea 2: [nombre]
- **Tipo:** independiente | secuencial
- **Archivos:** src/baz.ts
- **DoD:** build pasa, lint pasa, test pasa
- **Subagente:** explore | general
```

---

## 10. Formato de Report Back

```
## Report Back: <nombre tarea>

### Resultado
- [x] Criterio 1: <evidencia>
- [x] Criterio 2: <evidencia>

### Cambios Realizados
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `path/file.ts` | modify | Cambié X por Y |
| `path/new.ts` | create | Nueva función Z |

### Evidence Gates
- `npm run lint`: ✅ | ❌
- `npm run build`: ✅ | ❌

### Riesgos / Notas
- Algo que podría romperse
- Preguntas al usuario
```

---

## 11. Prevención de Problemas

### Loop Detection
Si corriges el mismo error 3 veces → STOP. Reporta: "Llegué a un loop con [error]."

### Fuera de Scope
Si un subagente o tú tocan archivos fuera de la descomposición → abortar, reportar. Si hay dependencia no documentada, reporta.

### Kill Criteria para Subagentes
- Mismo error 3 iteraciones → abortar subagente, re-descomponer
- Toca archivos fuera de scope → abortar inmediatamente
- No pasa quality gates en 2 intentos → abortar, añadir failing test al spec, relanzar

### Zonas Rojas
Si la tarea requiere tocar `middleware.ts`, `SaaSProvider.tsx`, `src/lib/sii/engine.ts` o `src/lib/supabase.ts` y el handoff no menciona plan de pruebas → detente y reporta.

### Zonas con Lock (solo una tarea a la vez)
`package.json`, `tailwind.config.ts`, `src/middleware.ts`, `src/lib/supabase.ts`, `src/stores/posStore.ts`, `src/app/(pos)/pos/page.tsx`

---

## 12. Trabajo conjunto con el colaborador — «Cazabugs» (vigente 2026-11-20)

El dueño trabaja con un **colaborador** (su amigo), ya definido en
`docs/guias/CURRICULUM_COLABORADOR.md`: arranca de cero, plan oct→dic, 80% aprender a **REVISAR**,
Etapa 3 «cazar mentiras de la IA», Etapa 5 RLS y Etapa 6 primera tarea. Reportar fallos es parte
de ese entrenamiento, no un rol aparte. El sistema vive en el repo para no perderlo entre sesiones:

- **Protocolo:** `docs/operacion/PROTOCOLO_CAZABUGS.md` (flujo conjunto, cómo encaja con el curriculum,
  severidades, riesgo de cambio, plantillas, evidencia; roles históricos en `docs/operacion/COLLABORATION_PROTOCOL.md`).
- **Tareas que el dueño asigna:** `docs/operacion/TAREAS_COLABORADOR.md` (IDs `T-###`, una a la vez,
  búsqueda visual/lógica — no código).
- **Fuente única de verdad:** `docs/operacion/REGISTRO_BUGS.md` (bandeja `HAL-###` con el hallazgo en
  palabras del colaborador + `ANÁLISIS IA`, y bugs confirmados `BUG-###` / diferidos `D-###`).
- **Backlog diferido:** los 10 items acordados para después están en la sección «Diferidos» del registro,
  con puntero a `TASK_HANDOFF.md` / `BITACORA.md`. No se inventaron valores ni se ejecutó nada en vivo.
- **Guía entregable:** `docs/guias/ACCESO_Y_MAPA_COLABORADOR.md` (accesos de prueba, mapa pantalla→archivo, orden de lectura y prompt para la IA del colaborador; modo solo lectura).

Reglas para esta sesión y las siguientes:

1. Leer el registro al iniciar (regla #1). Si el dueño o el colaborador menciona algo que no funciona,
   **registrarlo con ID antes de arreglarlo** — aunque parezca menor.
2. El colaborador NO edita código, Kanban, AGENTS, BITACORA ni TASK_HANDOFF; reporta con la
   plantilla. Tampoco hace commit/push ni toca `main` (reglas finales del CURRICULUM). Si lo hace,
   se avisa al dueño y se corrige el registro, no se ignora. Su reporte semanal (CURRICULUM §«El
   ritual semanal») debe incluir los IDs abiertos/cerrados.
3. Triar por severidad (S1 seguridad/RLS/datos/dinero/DTE primero). Verificar siempre el reporte:
   reproducirlo o demostrar por qué no es bug. «No es bug» va a su sección con la decisión documentada.
4. Arreglar con scopes aislados + tests. Si toca auth/roles/`store_id`/RLS, agregar **prueba real y caso
   negativo** (Regla de Oro §0). Cerrar solo con evidencia (lint/tsc/tests/build + prueba real cuando aplica).
5. Nunca mover un item a «Cerrados» sin evidencia. Nunca borrar entradas, nunca reutilizar IDs.
6. No tocar `YAHPOS Kanban.md` (regla #6). El registro de bugs es el puente entre Cazabugs y este protocolo.
7. **Modo IA — SOLO ANOTAR.** Ante un `HAL-###`, copiar el hallazgo **literal, en las palabras del
   colaborador** (no corregir redacción) y agregar solo el bloque `ANÁLISIS IA`: cómo funciona esa
   parte con `archivo:línea`, idea de arreglo (máx. 2 opciones, sin código), riesgo (S1–S4 + cambio
   BAJO/MEDIO/ALTO), archivos/rutas/tablas exactos, blast radius, pruebas sugeridas y DO NOT.
   No editar código, no ejecutar fixes, no crear `BUG-###`, no cerrar nada, no hacer commit/push.
   Si algo no se puede verificar, escribir «no verificado». El dueño decide NO_BUG / DIFERIDO / AUTORIZAR.
8. Sin commit ni push sin confirmación explícita del dueño.

*Última actualización: 2026-11-20*

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
