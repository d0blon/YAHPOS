# Registro de Bugs — YAHPOS!

Fuente única de verdad de bugs. Orden: abiertos por severidad, luego diferidos, luego cerrados.

**Para quién es:** el colaborador que se suma en [`../guias/CURRICULUM_COLABORADOR.md`](../guias/CURRICULUM_COLABORADOR.md). «Cazabugs» es el nombre informal del flujo de revisión, no un rol aparte. Reglas, plantilla y estados: [`PROTOCOLO_CAZABUGS.md`](PROTOCOLO_CAZABUGS.md). El reporte semanal del curriculum debe listar los IDs abiertos y cerrados.

Los IDs `D-###` son deudas ya acordadas en handoffs previos; no son reportes nuevos del colaborador. No se inventaron datos: cada descripción apunta a su documento de origen.

## Resumen

| ID | Sev | Estado | Área | Título | Reportado por | Fecha |
|---|---|---|---|---|---|---|
| D-005 | S1 | DIFERIDO | Seguridad / credenciales | PAT pendiente de revocar; rotar service keys y PFX | — | 2026-11-19/20 |
| D-001 | S2 | DIFERIDO | Configuración / infra | Config obligatoria ausente | — | 2026-11-20 |
| D-002 | S2 | DIFERIDO | DB / migraciones | `domain_verified` sin migración que cree la columna | — | 2026-11-20 |
| D-003 | S2 | DIFERIDO | POS / inventario | Falta prueba real del update de stock por tienda/sucursal | — | 2026-11-20 |
| D-004 | S2 | DIFERIDO | DB / migraciones | Migración 040 no ejecutada; prueba negativa de signup sin ejecutar | — | 2026-11-19/20 |
| D-006 | S2 | DIFERIDO | DTE / SII | E2E real SII bloqueado (PFX y CAF) | — | 2026-11-19 |
| D-007 | S2 | DIFERIDO | Auth | Auth cross-subdominio sin confirmación en vivo | — | 2026-05-19 |
| D-008 | S2 | DIFERIDO | Seguridad / rate limit | `x-forwarded-for` spoofable si el edge no sobrescribe | — | 2026-11-19/20 |
| D-010 | S2 | DIFERIDO | Auth / Supabase Auth | `auth_leaked_password_protection` OFF | — | 2026-11-19/20 |
| D-009 | S4 | DIFERIDO | Herramientas / lint | `git diff --check` exit 2 por trailing whitespace preexistente | — | 2026-11-20 |

---

## Bandeja de hallazgos (palabras del colaborador) + análisis IA (sin implementar)

Hallazgos `HAL-###` pendientes de decisión del dueño. Esta bandeja no es bugs abiertos: no cuenta para el resumen ni genera `BUG-###` por sí sola.

| ID HAL | Tarea T | Riesgo IA | Estado | Puntero |
|---|---|---|---|---|
| HAL-001 | sin asignar | S2 / cambio MEDIO | AUTORIZADO → BUG-001 (CERRADO) | [HAL-001](#hal-001--pginas-planas-css-bloqueado-por-csp-en-http-por-tailscale) |
| HAL-002 | sin asignar | S2 / cambio MEDIO | ANALIZADO — SIN IMPLEMENTAR | [HAL-002](#hal-002--header-de-tienda-no-se-renderiza-para-usuarios-anonimos) |

Nota: HAL-001 fue reportado por el dueño mientras preparaba el acceso del colaborador; se registra igual por la regla §12.1 del protocolo. Tarea `T-###` aún no asignada.

Nota: copiar la plantilla del protocolo; la IA solo agrega el bloque ANÁLISIS IA; el dueño decide el pase a BUG-###. Estado inicial: `NUEVO_HALLAZGO`; después de la anotación: `ANALIZADO`; recién con `AUTORIZAR_BUG` se crea la entrada en «Bugs abiertos».

### HAL-001 — páginas planas: CSS bloqueado por CSP en HTTP por Tailscale

**Primera mitad — escrita por el reportante (dueño; copia literal, sin corregir redacción)**

- **ID:** HAL-001
- **Tarea `T-###` relacionada:** sin asignar
- **En mis palabras:** «ya entre pero se ve asi mira» / «http://100.111.116.27:3000/developer/catalog aca tampoco muestra como deberia esta todo plano sin css» / «el problema es el tailscale»
- **Qué vi:** la landing raíz y `/developer/catalog` se muestran sin estilos: texto plano, íconos gigantes, sin layout.
- **Dónde lo vi:** navegador, `http://100.111.116.27:3000/` y `http://100.111.116.27:3000/developer/catalog` (acceso vía Tailscale).
- **Qué esperaba:** que se viera con el diseño normal, igual que en `localhost`.
- **Pasos (si los hay):**
  1. Abrir `http://100.111.116.27:3000/`.
  2. Abrir `http://100.111.116.27:3000/developer/catalog`.
  3. Comparar con `http://localhost:3000/`.
- **Captura:** no aplica (el modelo no pudo leer el PNG adjunto; se reproduce en navegador, ver evidencia abajo).
- **Repetible:** Sí
- **Estado:** ANALIZADO

**ANÁLISIS IA — SOLO ANOTACIÓN, SIN IMPLEMENTAR**

- **Cómo funciona esa parte (flujo real + `archivo:línea`):** `src/proxy.ts:17-33` construye el CSP por request; `src/proxy.ts:18` calcula `isDev`, pero `src/proxy.ts:31` agrega `upgrade-insecure-requests` sin condición. `src/proxy.ts:40-43` inyecta ese CSP en request y response. El HTML de `/developer/catalog` incluye `<link rel="stylesheet" href="/_next/static/css/app/layout.css?v=…">`; ese recurso responde **200**, `Content-Type: text/css; charset=UTF-8`, 376.602 bytes y contiene `.flex`, `.grid`, `.bg-brand-primary` (verificado por HTTP). En el navegador, el link se resolvió como `http://100.111.116.27:3000/_next/static/css/app/layout.css?v=…` pero el CSP lo elevó a HTTPS.
- **Causa probable:** confirmada, no hipótesis. Consola del navegador: `Failed to load resource: net::ERR_SSL_PROTOCOL_ERROR` para `https://100.111.116.27:3000/_next/static/css/app/layout.css?v=…` y para los chunks `webpack.js`, `main-app.js`, `app-pages-internals.js` y `page.js`. El servidor escucha solo HTTP, no TLS. `document.styleSheets.length === 0`, `link.sheet === false`, `body` con `font-family: "Times New Roman"`. En `localhost` el origen es confiable y no hay upgrade; con la IP de Tailscale el origen no es confiable y la directiva dispara. Tailscale es el disparador del cambio de host, no la causa del fallo.
- **Idea de arreglo (máx. 2 opciones, sin código):** 1. Condicionar `upgrade-insecure-requests` en `buildCsp` para que no se emita cuando la página se sirve por HTTP (o en `isDev`), manteniendo `script-src` con nonce y el resto del CSP intactos. 2. Servir HTTPS real en el host de acceso (Tailscale Serve con certificado `*.ts.net`) y usar esa URL en vez de `http://IP:3000`; ojo: cambia el `Host` y el proxy deja de reconocer el root, así que habría que decidir además el mapeo de host/root o el `custom_domain` del tenant.
- **Nivel de riesgo:** S2 (toda la UI inutilizable por HTTP no local) + cambio **MEDIO**: un solo archivo, pero es un header de seguridad global; ante duda se eligió MEDIO en vez de BAJO. Sin DB, sin auth.
- **Toca exactamente (archivos, rutas, tablas, policies/RLS):** `src/proxy.ts:17-33` (función `buildCsp`), específicamente `src/proxy.ts:31`; `src/proxy.ts:40-43` solo si hace falta ajustar la inyección. Ninguna tabla, policy, RLS, `store_id`, rol, DTE/SII ni pagos.
- **Blast radius:** el CSP aplica a **todas las rutas y todos los hosts**. Quitar la directiva solo en HTTP/dev preserva la protección en HTTPS/producción; quitarla globalmente eliminaría la defensa contra mixed content. La opción 2 cambia el host de acceso y afecta resolución root/tenant (`src/proxy.ts:56-57`, `src/lib/config/root-domain.ts:13-21`).
- **Pruebas sugeridas:** positiva: abrir `http://100.111.116.27:3000/developer/catalog` y verificar en consola `document.styleSheets.length > 0`, `link.sheet === true`, cero `ERR_SSL_PROTOCOL_ERROR`, y que el texto ya no use `"Times New Roman"`; negativa: no aplica por regla de oro (no toca auth/roles/`store_id`/RLS), pero si se condiciona por entorno, verificar que una página servida por HTTPS **sí conserve** `upgrade-insecure-requests` en el header.
- **DO NOT:** no deshabilitar el CSP completo ni quitar el nonce (`src/proxy.ts:35-43`); no servir producción sin TLS; no crear `BUG-###`, no reparar, no ejecutar fixes, no commit/push sin `AUTORIZAR_BUG` explícito del dueño.
- **Estado:** ANALIZADO — SIN IMPLEMENTAR
- **Resolución del dueño (2026-11-20):** «hace lo que haya que hacer sin romper nada obviamente necesito que esto este funcionando» → `AUTORIZAR_BUG`, implementado como [`BUG-001`](#bug-001--css-y-chunks-bloqueados-por-upgrade-insecure-requests-en-http). El bloque `ANÁLISIS IA` se conserva como se escribió, antes del fix.

### HAL-002 — header de tienda no se renderiza para usuarios anónimos

**Primera mitad — escrita por el reportante (dueño; copia literal, sin corregir redacción)**

- **ID:** HAL-002
- **Tarea `T-###` relacionada:** sin asignar
- **En mis palabras:** «y por que se ve asi» (comparando captura de `master.localhost:3000` con usuario logueado vs `master.100.111.116.27.nip.io:3000` sin login)
- **Qué vi:** en la captura local (`master.localhost:3000` con usuario "Rodrigo" logueado) se ve el header completo: logo "Austral Market SUPERMERCADO", barra de búsqueda "¿Qué necesitas hoy?", avatar de usuario, carrito. En la URL de Tailscale (`master.100.111.116.27.nip.io:3000` sin login) solo se ve el banner superior ("Despacho GRATIS...") y los productos, pero NO el header con logo, búsqueda y carrito.
- **Dónde lo vi:** navegador, comparando `master.localhost:3000` (local, con sesión) vs `master.100.111.116.27.nip.io:3000` (Tailscale, sin sesión).
- **Qué esperaba:** que la tienda se viera igual (o similar) con y sin login, solo cambiando las acciones de usuario.
- **Pasos (si los hay):**
  1. Abrir `http://master.localhost:3000/` con sesión activa.
  2. Abrir `http://master.100.111.116.27.nip.io:3000/` sin sesión.
  3. Comparar ambos renders.
- **Captura:** dos imágenes adjuntas (no leídas por el modelo, descritas arriba).
- **Repetible:** Sí
- **Estado:** ANALIZADO

**ANÁLISIS IA — SOLO ANOTACIÓN, SIN IMPLEMENTAR**

- **Cómo funciona esa parte (flujo real + `archivo:línea`):** `src/proxy.ts:140-168` resuelve la tienda por dominio (`get_store_by_domain`) e inyecta headers `x-store-id`, `x-store-tier`, etc. en `response.headers` (líneas 156-163). `src/app/(shop)/layout.tsx:12-14` (Server Component) lee `headers()` de `next/headers`, que devuelve los headers del **request original**, no los modificados por el middleware. Si `storeId` es `null` (porque el header no llegó), el layout retorna `{children}` sin `<Header />` (línea 19). El `<Header />` componente (`src/components/layout/Header.tsx:60`) es un client component que usa `useSaaS()` para obtener `config.tier` y decidir si mostrar branding de tienda o YAHPOS!.
- **Causa probable:** los headers custom inyectados por el proxy en la respuesta no se propagan a los Server Components. El layout de `(shop)` no ve `x-store-id`, asume que es el root domain, y no renderiza el header. Verificado: `src/app/api/debug-headers/route.ts` (ruta de prueba creada para diagnóstico) confirma que los headers SÍ llegan a Route Handlers, pero los Server Components de layout no los reciben. En `localhost` funciona porque el proxy se ejecuta en el mismo proceso y los headers pueden propagarse de forma diferente.
- **Idea de arreglo (máx. 2 opciones, sin código):** 1. Modificar el proxy para inyectar los headers de tienda en el **request** (`request.headers.set()`) en vez de (o además de) la respuesta, así `headers()` de `next/headers` los lee correctamente. 2. Usar un mecanismo diferente para pasar el contexto de tienda a los Server Components: cookies, search params, o un provider de contexto que lea la tienda directamente desde la DB/URL en vez de headers.
- **Nivel de riesgo:** S2 (toda la UI de tienda sin header para usuarios anónimos) + cambio **ALTO**: toca el proxy (zona roja según AGENTS.md §4) y el flujo de multi-tenancy. Requiere pruebas exhaustivas de que no se rompe la resolución de tiendas, auth, ni el root domain.
- **Toca exactamente (archivos, rutas, tablas, policies/RLS):** `src/proxy.ts:156-163` (inyección de headers), `src/app/(shop)/layout.tsx:12-14` (lectura de headers), potencialmente `src/lib/config/root-domain.ts` si se cambia el mecanismo de resolución. Sin cambios en DB, RLS, auth, ni `store_id` de usuarios.
- **Blast radius:** cualquier cambio en el proxy afecta TODAS las rutas y tenants. Un error puede romper la resolución de tiendas, el root domain, auth, o el rate limit. Requiere verificar: root domain sigue siendo landing, tiendas resuelven correctamente, auth cross-subdominio no se rompe, rate limit sigue funcionando.
- **Pruebas sugeridas:** positiva: abrir `http://master.100.111.116.27.nip.io:3000/` sin sesión y verificar que el header con logo, búsqueda y carrito se renderice; verificar que `src/app/(shop)/layout.tsx` reciba `storeId` y `tier` correctamente. Negativa: abrir `http://100.111.116.27:3000/` (root) y verificar que sigue siendo la landing de plataforma sin header de tienda; verificar que `/admin` y `/pos` sigan pidiendo login; verificar que otras tiendas (si existen) no se rompan.
- **DO NOT:** no modificar `src/proxy.ts` sin autorización explícita del dueño (es zona roja según AGENTS.md §4); no cambiar el mecanismo de resolución de tiendas sin pruebas exhaustivas; no crear `BUG-###` ni implementar sin `AUTORIZAR_BUG`.
- **Estado:** ANALIZADO — SIN IMPLEMENTAR

---

## Bugs abiertos

_(sin entradas todavía — usar la plantilla del protocolo)_

---

## Diferidos (acordado dejar para luego)

### D-001 — Config obligatoria ausente

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** Configuración / infraestructura
- **Descripción:** Faltan `NEXT_PUBLIC_ROOT_ORIGIN` (proxy 500 si no está), `NEXT_PUBLIC_ROOT_DOMAIN` y `NEXT_PUBLIC_SUPPORT_EMAIL`. Sin valores inventados.
- **Puntero:** [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Riesgos / pendientes del dueño" (2026-11-20); [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-20 (bloqueantes de configuración).

### D-002 — `domain_verified` sin columna en migraciones

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** DB / migraciones
- **Descripción:** `domain_verified` se lee y escribe en developer, pero ninguna migración crea la columna; requiere DDL autorizado.
- **Puntero:** [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Riesgos / pendientes del dueño" (2026-11-20); [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-20.

### D-003 — Falta prueba real del update de stock por tienda/sucursal

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** POS / inventario
- **Descripción:** `QuickStockPanel` actualiza `inventory` por `store_id`/`branch_id`, pero hoy solo hay mocks; falta prueba real y caso negativo en vivo.
- **Puntero:** [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Cambios sensibles" (2026-11-20); [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-20 (POS).

### D-004 — Migración 040 no ejecutada

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** DB / migraciones
- **Descripción:** `040_lints_hardening.sql` preparada pero no ejecutada; prueba negativa de signup sin ejecutar.
- **Puntero:** [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-19/20 (preparación de 040 + scripts de verificación); [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Riesgos / pendientes del dueño".

### D-005 — Credenciales expuestas pendientes de revocar/rotar

- **Severidad:** S1
- **Estado:** DIFERIDO
- **Área:** Seguridad / credenciales
- **Descripción:** PAT `sbp_…ff0c` pendiente de revocar; rotar service keys y PFX. Token completo prohibido en este registro.
- **Puntero:** [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Pruebas que el dueño debe hacer" y "Riesgos / pendientes del dueño"; [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-20.

### D-006 — E2E real SII bloqueado

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** DTE / SII
- **Descripción:** PFX no cargado y CAF 39 agotada (`folio_actual=11`, `folio_hasta=10`); ningún caso real ejecutado.
- **Puntero:** [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Residuales nuevos (requieren decisión del dueño)" y "Pruebas que el dueño debe hacer"; [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-19.

### D-007 — Auth cross-subdominio sin confirmación en vivo

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** Auth
- **Descripción:** Handoff de mayo 2026 (session-sync) sin confirmación en vivo; hoy solo se sabe que el test manual de otra tarea no mostró el loop.
- **Puntero:** [`../../BITACORA.md`](../../BITACORA.md) → 2026-05-19 (fix session-sync, INCOMPLETO — BLOQUEADO); [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Riesgos / pendientes del dueño" (2026-11-20).

### D-008 — `x-forwarded-for` spoofable

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** Seguridad / rate limit
- **Descripción:** El rate limit toma el primer valor de `x-forwarded-for`; sigue siendo spoofable si el edge no sobrescribe el header.
- **Puntero:** [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Residuales — requieren decisión del dueño" (ítem 10) y "Riesgos / pendientes del dueño"; [`../seguridad/CHECKLIST_SEGURIDAD.md`](../seguridad/CHECKLIST_SEGURIDAD.md) → control 11.

### D-009 — `git diff --check` exit 2

- **Severidad:** S4
- **Estado:** DIFERIDO
- **Área:** Herramientas / lint
- **Descripción:** Trailing whitespace preexistente (26 líneas), cosmético; `git diff --check` termina con exit 2.
- **Puntero:** [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-20 (gates y baseline de lint); [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Gates finales (evidencia real)".

### D-010 — `auth_leaked_password_protection` OFF

- **Severidad:** S2
- **Estado:** DIFERIDO
- **Área:** Auth / Supabase Auth
- **Descripción:** Protección contra contraseñas filtradas desactivada; requiere activarla en Dashboard → Authentication → Password Protection.
- **Puntero:** [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md) → "Revisión de lints Supabase + hardcodeos" (2026-11-19/20); [`../../BITACORA.md`](../../BITACORA.md) → 2026-11-20 (triaje de lints Supabase).

---

## Cerrados

Solo mover aquí con evidencia; no borrar la entrada.

### BUG-001 — CSS y chunks bloqueados por `upgrade-insecure-requests` en HTTP

- **Severidad:** S2
- **Estado:** CERRADO (2026-11-20)
- **Origen:** [`HAL-001`](#hal-001--pginas-planas-css-bloqueado-por-csp-en-http-por-tailscale)
- **Causa raíz:** `src/proxy.ts:31` emitía `upgrade-insecure-requests` en todo entorno; en un origen HTTP no confiable (IP de Tailscale) el navegador elevaba CSS y chunks a HTTPS y el server no tiene TLS.
- **Cambio:** `src/proxy.ts:17-33` → `buildCsp(nonce, protocol)`; la directiva solo se emite en producción o cuando la request llegó por HTTPS (`getRequestProtocol`). Nonce y resto del CSP intactos. Sin DB, sin auth, sin migración.
- **Evidencia:**
  - Antes: `net::ERR_SSL_PROTOCOL_ERROR` en `https://100.111.116.27:3000/_next/static/css/app/layout.css` y 4 chunks; `document.styleSheets.length=0`, `link.sheet=false`, `font-family: "Times New Roman"`.
  - Después (navegador real): `/developer/catalog` → `link.sheet=true`, 115 reglas, `document.styleSheets.length=3`, `body` con `rgb(252,250,255)` y DM Sans. Root `http://100.111.116.27:3000/` → CSS OK, `h1` "COMERCIO INTELIGENTE DESDE EL SUR."
  - CSP por header: `x-forwarded-proto=http` → sin `upgrade-insecure-requests`, con nonce y `style-src 'self'`; `x-forwarded-proto=https` → con `upgrade-insecure-requests`, nonce y `style-src 'self'`.
  - Gates: `npx tsc --noEmit` 0; `npm run lint` 0 errores (solo advertencia de `.eslintignore`); `npm run build` exit 0.
- **Residual no bloqueante:** error de HMR websocket (`ws://100.111.116.27:3000/_next/hmr`) en consola de dev; no afecta render ni navegación.
- **DO NOT cumplido:** sin commit, sin push, sin cambios en BD/roles/`store_id`/RLS.

---

## No es bug / decisiones aceptadas

`httpOnly:false` en cookies de Supabase SSR es decisión de diseño documentada (no bug): ver [`../seguridad/CHECKLIST_SEGURIDAD.md`](../seguridad/CHECKLIST_SEGURIDAD.md) → control 9. Config/env faltante de setup local, decisiones documentadas y feature requests tampoco son bugs. No se cuentan como bugs ni se les asigna ID `BUG-###`.

---

Este registro se actualiza en cada sesión; el agente debe leerlo al iniciar.
