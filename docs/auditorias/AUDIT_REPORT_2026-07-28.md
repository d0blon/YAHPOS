---
tipo: auditoría técnica
autor: Claude Code (Arquitecto)
fecha: 2026-07-28
alcance: austral-market-next/src (245 archivos de código, imágenes/public excluidas)
herramienta: graphify (AST estructural + análisis de grafo — sin LLM semántico, corpus 100% código)
---

# Auditoría Exhaustiva — austral-market-next

## Metodología y alcance real

Se corrió graphify sobre el repo completo primero: `detect()` encontró **2,220 archivos / 7.9M
words**, de los cuales **1,824 son imágenes en `public/`** (fotos del catálogo de productos) y
solo 246 son código+docs relevantes a arquitectura. Meter 1,838 imágenes al pipeline de
extracción semántica hubiera sido puro gasto de tiempo/tokens sin valor para este análisis —
se re-escaneó **solo `src/`** (245 archivos código + 1 doc, 146,614 words). Esto es una decisión
de alcance explícita, no un límite de la herramienta.

**Resultado del grafo:** 914 nodos · 2,459 edges · 52 comunidades · 100% EXTRACTED (0% inferido
ambiguo) · 0 ciclos de imports detectados.

**Nota de honestidad metodológica (importante para leer la sección de "huérfanos" más abajo):**
graphify construye el grafo a partir de AST — detecta `import`/`export`/llamadas a función. Con
el App Router de Next.js, los archivos `page.tsx`, `layout.tsx`, `route.ts` y los archivos bajo
`__tests__/` **nunca aparecen como "importados" por nadie** porque el framework (o el test
runner) los invoca por convención de carpetas, no por un `import` explícito en otro archivo del
repo. El grafo marcó **123 de 245 archivos** con "cero referencias externas entrantes" — de esos,
**~109 son estos falsos positivos** (páginas/rutas/layouts/tests, funcionando normal). Los
restantes **14 SÍ son código muerto real**, verificado con `grep` manual uno por uno contra todo
`src/` antes de listarlos — no me quedé con el output crudo del grafo.

---

## 🔴 CRÍTICO

### 1. `src/middleware.ts` — cookies de sesión sin flag `Secure` en producción
**Líneas 81, 86-89, 164.** El middleware fuerza `secure: false` en **todas** las cookies de
sesión de Supabase, sin gatear por `NODE_ENV`:
```ts
response.cookies.set(name, value, { ...options, secure: false, sameSite: 'lax', path: '/' })
// ...
cookieOptions: { secure: false, sameSite: 'lax', path: '/' }
```
Compará esto con `src/lib/supabase.ts` línea 66 y 79, que sí lo hace bien:
```ts
secure: process.env.NODE_ENV === 'production',
```
**Impacto:** en producción (`https://yahpos.cl` y subdominios), las cookies `sb-access-token` /
`sb-refresh-token` se emiten **sin `Secure`**, es decir el navegador las mandaría igual por HTTP
plano si algo downgradea la conexión (proxy mal configurado, ataque de downgrade, red intervenida).
Session hijacking vía sniffing de red se vuelve trivial en ese escenario. `sameSite: 'lax'`
mitiga CSRF pero no reemplaza `Secure`.

**Por qué probablemente pasó:** coincide con la lección documentada en `BITACORA.md`
(2026-05-19, "Fix session-sync cookie propagation — INCOMPLETO BLOQUEADO"): se desactivó
`secure` para debuggear un loop de auth cross-subdominio y nunca se revirtió para producción.
Confirma la propia bitácora: *"Lección: no modificar config de build... documentar cambios ANTES
de aplicar"* — se documentó, pero el revert no se hizo.

**Fix sugerido:** `secure: process.env.NODE_ENV === 'production'` en las 3 ocurrencias de
`middleware.ts`, igual que ya está en `lib/supabase.ts`. Es zona roja — requiere plan de pruebas
(login cross-subdominio, verificar que no reaparezca el loop de auth que motivó el cambio original).

---

### 2. `src/lib/supabase.ts:26` — `createAdminClient()` degrada en silencio si falta la service key
```ts
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? supabaseAnonKey
  return createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
}
```
Si `SUPABASE_SERVICE_ROLE_KEY` no está seteada (típico en un deploy nuevo mal configurado, un
entorno de staging, o un `.env` incompleto), esta función **no explota** — devuelve
silenciosamente un cliente con la **anon key**. Todo el código que asume que `adminClient`
bypassa RLS (developer panel, aprobación de submissions del Catálogo Maestro, importación de
inventario, etc. — la mitad de esta sesión fue arreglar bugs de RLS exactamente en este punto)
quedaría rota **sin ningún error visible**, indistinguible de un bug de RLS real. Es el peor tipo
de fallo: silencioso, y en el punto exacto donde ya hubo 2 incidentes reales esta sesión.

**Fix sugerido:**
```ts
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada — createAdminClient no puede operar con anon key.')
  return createSupabaseClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
}
```
Fail loud, no silent. Zona roja (`lib/supabase.ts`) — requiere plan de pruebas antes de tocar.

---

## 🟠 MEDIO

### 3. `src/app/developer/actions.ts` — god-file, mezcla 5+ dominios sin relación
23 símbolos exportados detectados por el grafo (Community 9 del reporte), cubriendo: moderación
de Catálogo Maestro (`approveMasterCatalogSubmissionAction`, `getPendingMasterCatalogSubmissionsAction`,
`rejectMasterCatalogSubmissionAction`, `importEnrichedMasterCatalogSubmissionsAction`), CRUD de
tiendas (`createStoreAction`, `deleteStoreAction`, `getStoresWithStatusAction`), estadísticas
financieras (`getFinancialStatsAction`), logs del sistema (`getRealLogsAction`), y más. Un solo
archivo sirviendo como "controlador" de todo el panel `/developer` — cualquier cambio en
cualquiera de esos dominios toca el mismo archivo, alto riesgo de conflictos de merge y de que
un cambio en Catálogo Maestro rompa algo de facturación sin que nadie lo note en el diff.

**Sugerencia concreta:** dividir en `developer/actions/catalog.ts`, `developer/actions/stores.ts`,
`developer/actions/financial.ts`, `developer/actions/logs.ts`, re-exportando desde un
`actions/index.ts` si `DeveloperPanel.tsx` necesita un solo punto de import. No es urgente (no es
un bug), pero cada tarea nueva sobre este archivo lo hace más costoso de tocar.

### 4. `src/app/(shop)/page.tsx` — 25 símbolos, componentes definidos inline en vez de importados, causando código duplicado real
Es el archivo con más símbolos de todo `src/`. Define **su propia función local**
`ProductCardSuper` (línea 614) en vez de importar `src/components/shop/ProductCardSuper.tsx` —
que existe, está completo, y **nadie lo usa**. Es decir: alguien empezó a extraer este componente
a un archivo separado, pero `(shop)/page.tsx` nunca migró a usarlo — quedaron dos implementaciones
del mismo componente, una viva (inline) y una muerta (el archivo separado). Ver hallazgo #7 abajo.

**Sugerencia:** terminar la extracción que quedó a medias — hacer que `(shop)/page.tsx` importe
`components/shop/ProductCardSuper.tsx` y borrar la definición inline, o al revés si la inline es
la versión más actualizada (comparar antes de decidir cuál se descarta).

### 5. `src/components/sii/SiiSyncManager.tsx` — componente de sync offline del SII, sin uso en ningún lado
Verificado con grep: cero referencias externas. Este componente maneja lógica real de negocio
(sincronización de documentos SII pendientes en modo offline — ver community 26 del grafo:
`OfflineSyncManager`, `SiiPayload`, `SiiQueueItem`, `SiiState`). Que un componente de
sincronización SII exista pero no esté montado en ningún layout/página es más serio que un
componente de UI decorativo huérfano — si la intención era que el POS sincronizara boletas
pendientes en background y este componente nunca se montó, hay una feature de negocio
potencialmente incompleta, no solo basura de código. **Recomendado confirmar con el equipo si
esto se abandonó a propósito o quedó pendiente de integrar.**

### 6. `src/components/admin/sii/ManualEmissionTabs.tsx` e `InvoiceHistoryTable.tsx` — probablemente superseded, sin uso
Cero referencias externas. `src/app/admin/facturacion/page.tsx` (Community 20) usa
`DocumentTabs()` en su lugar — todo indica que estos dos componentes son una versión anterior de
la UI de facturación manual que fue reemplazada por `DocumentTabs` pero nunca se borró.

### 7. `src/components/shop/*` — 6 componentes de e-commerce completos, sin uso: `BasketAddToCart.tsx`, `CountdownTimer.tsx`, `HeroAddToCart.tsx`, `NewsletterForm.tsx`, `ProductCardSuper.tsx` (ver #4), `RecipeAddToCart.tsx`, `TrendRanking.tsx`
Todos verificados con grep individual, cero uso externo. Curioso patrón: son justo los
componentes con nombres que "deberían" estar en la página de tienda (`(shop)/page.tsx`) pero esa
página los reimplementa todos localmente en vez de importarlos (mismo patrón que #4). Parece un
intento de refactor a componentes reutilizables que se abandonó — la página siguió creciendo con
implementaciones inline mientras los archivos separados quedaron congelados y sin conectar.

### 8. `src/components/pos/PosHeader.tsx` — sin uso
Verificado con grep, cero referencias externas. El header real del POS parece estar inline en
`(pos)/pos/page.tsx` (que ya es un god-file conocido, con hardware + carrito + turnos + display
todo junto).

---

## 🟢 BAJO / COSMÉTICO

### 9. `src/components/ui/magnetic.tsx` (`Magnetic`) — sin uso real
`PlatformLanding.tsx` tiene un comentario `// 5. Magnetic Button Effect` pero **no importa el
componente** — el comentario referencia una intención que nunca se conectó al código. Bajo
impacto (es un efecto visual), pero es basura de código clara: o se usa o se borra.

### 10. `src/lib/payments/config.ts` (`PaymentProvider`, `PaymentConfig`, `getPaymentConfig()`) — sin uso
Cero referencias en todo `src/`. Dado que hay un ítem de backlog "Refactor PaymentModal"
(`src/components/pos/PaymentModal.tsx`, 612 líneas, no auditado en detalle esta sesión), este
archivo probablemente era el diseño original de config centralizada de proveedores de pago que
`PaymentModal.tsx` terminó no usando (lógica inline en su lugar). Revisar antes de borrar — si el
refactor de PaymentModal se hace, este archivo podría ser el punto de partida correcto en vez de
basura a eliminar.

### 11. `src/lib/totp-actions.ts` (`generateMasterKeyAction`) — sin uso
Cero referencias. Community 34 tiene `verifyDeveloperAccessAction()`, `LockScreen()`, `decrypt()`,
`verifyMasterTOTP()` — el flujo de verificación TOTP del lock screen del developer está activo,
pero la acción para *generar* la master key no se llama desde ningún lado. Probablemente se usó
una vez manualmente para generar el secret inicial y se dejó en el repo. Verificar que no sea
invocable públicamente como Server Action antes de borrar (aunque nadie la importe en el
frontend, una Server Action exportada sigue siendo un endpoint invocable si se conoce su nombre).

### 12. Logging verboso en `middleware.ts:20`
```ts
console.log(`[Middleware Log] Request: ${host}${path} | Cookie names: ${cookies.map(c => c.name).join(', ')}`)
```
Corre en **cada request**, sin gatear por entorno. No expone valores de cookies, pero sí sus
nombres (`sb-access-token`, etc.) en logs de producción — ruido + higiene menor. Envolver en
`if (process.env.NODE_ENV !== 'production')`.

---

## Análisis Estructural (Comunidades)

- **52 comunidades**, ninguna con señales de mezcla sucia App Router / patrón viejo — no se
  encontró código de un supuesto "Pages Router" residual, el proyecto es 100% App Router.
- **Comunidades 0 y 1** (cohesión ~0.06, la más baja del grafo): agrupan casi todos los
  `route.ts` de `/api/**` juntos. Esto es **esperado, no un problema** — cada endpoint API es
  independiente por diseño, baja cohesión entre rutas HTTP no relacionadas es normal, no exige
  refactor.
- **Spot-check de límites Server/Client:** revisé los archivos con lógica de hooks de React más
  sensible (`SessionSync.tsx`, `SaaSProvider.tsx`, `ProductModal.tsx`, `DeveloperPanel.tsx`) — los
  4 tienen `'use client'` correctamente declarado. No encontré un Server Component llamando hooks
  de cliente directamente. Esto es un hallazgo "limpio" — lo anoto porque el pedido explícito era
  buscarlo, y no encontrar el problema también es información.
- **0 ciclos de imports** detectados por graphify en todo `src/`.

## God Nodes (contexto — no todos son deuda técnica)

| Nodo | Edges | Lectura |
|---|---|---|
| `createClient()` | 105 | Cliente Supabase — fan-in alto es **esperado y correcto**, es el patrón de acceso a datos del proyecto entero. No es deuda. |
| `cn()` | 96 | Helper de clases Tailwind — utilidad transversal, fan-in alto normal. |
| `Button` | 64 | Componente UI base (shadcn) — normal. |
| `formatPrice()` | 42 | Utilidad de formato — normal. |
| `withAuth()` | 41 | Wrapper de auth para API routes — normal, es su trabajo. |
| `useAuthStore` | 35 | Store global Zustand — normal. |
| `useSaaS()` | 32 | Hook del `SaaSProvider` — normal. |

**Importante:** ninguno de estos es un "god node" en el sentido de mala arquitectura — son
utilidades/primitivas compartidas por diseño, y un fan-in alto ahí es correcto. Los god-files
reales (demasiada lógica de negocio *no relacionada* concentrada en un solo archivo) son los de
la sección 🟠 MEDIO arriba (`developer/actions.ts`, `(shop)/page.tsx`), detectados por conteo de
símbolos por archivo, no por edges del grafo.

---

## Top 3 Refactors a Priorizar Hoy

1. **Fix `secure: false` en `middleware.ts`** (Crítico #1) — 3 líneas, alto impacto de
   seguridad, requiere plan de pruebas por ser zona roja pero el cambio en sí es trivial.
2. **Fix silent fallback en `createAdminClient()`** (Crítico #2) — 2 líneas, evita que un futuro
   bug de RLS "misterioso" sea en realidad una env var faltante sin ningún error.
3. **Resolver la duplicación `ProductCardSuper`** (Medio #4) — decidir cuál de las dos
   implementaciones vive, borrar la otra. Es el ejemplo más concreto de código muerto con
   duplicación activa, y destraba la limpieza de los otros 6 componentes de `components/shop/`
   huérfanos (#7) que parecen parte del mismo refactor abandonado.

---

## Archivos temporales de graphify generados en esta sesión
`austral-market-next/graphify-out/` quedó con el grafo scopeado a `src/` (914 nodos). El grafo
anterior (1,472 nodos, scope más amplio con `public/`) fue reemplazado con `force=True` — si se
necesita ese scope más amplio de nuevo, hay que re-correr `/graphify .` completo (costoso por las
1,824 imágenes, no recomendado salvo necesidad real).
