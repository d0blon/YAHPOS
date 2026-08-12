---

kanban-plugin: board

---

## 📋 BACKLOG

- [x] **P0 CRÍTICO [Seguridad]** RESUELTO Y VERIFICADO (2026-08-12) — exploit re-probado, ahora bloqueado (400); tienda ajena ya no editable/borrable (0 filas); caso legítimo (merchant con su propia tienda) sigue funcionando. Auditoría completa de RLS (2026-08-12) — CONFIRMADO CON PRUEBA REAL: cualquier usuario logueado podía auto-asignarse `role: owner` de CUALQUIER tienda ajena vía un solo `PATCH` directo a `/rest/v1/profiles`. Causa: policies `perfil_propio`/`self_access` en `profiles` sin restricción de columnas. Auditoría completa de `pg_policies` reveló 8 tablas más con policies `qual: true` sin ninguna restricción (`stores` — cualquiera puede editar/borrar cualquier tienda —, `merchants`, `admin_finances`, `cash_movements`, `shifts`, `store_settings`, `supplier_product_mappings`). Handoff completo armado (SQL + 5 archivos de app que necesitan pasar a `createAdminClient()`), status `ready-for-antigravity`. **Corrección de nota anterior:** se dijo antes que `stores` "nunca tuvo RLS habilitado" — FALSO, verificado con `pg_tables.rowsecurity`, está prendido en TODAS las tablas; el problema real era policies demasiado permisivas, no RLS apagado.
- [ ] **P2 [Developer]** `createStoreAction` paso 3.2 (`developer/actions/stores.ts:73-78`, asignar `role: developer` a los emails de `DEVELOPER_EMAILS`) sigue usando el cliente normal, no admin — mismo patrón de bug que 3.1/3.3 pero NO estaba en el scope del fix de seguridad de hoy (se detectó recién al revisar el Report Back, no se había probado antes). Ya estaba roto en silencio ANTES del fix de hoy (no es regresión) — con el nuevo trigger de `profiles`, sigue fallando en silencio igual (el código nunca chequea el `error` de esa llamada). Bajo impacto: solo afecta si `DEVELOPER_EMAILS` tiene un email que no sea el del creador de la tienda.

- [x] **P1 [Auth]** RESUELTO Y VERIFICADO (2026-08-12) — `login()` y `refreshProfile()` ahora caen a `profiles.role`/`store_id` y a un fallback de `stores.tier` cuando no hay membership. Verificado: query de tier confirmada contra Austral Market (`patagonia` correcto), tsc limpio, código matchea spec. `authStore.ts` `login()` (líneas 62-127) y `refreshProfile()` resuelven `role`/`storeId`/`tier` priorizando `user_stores` (casi siempre vacío, mismo problema que el middleware) antes de caer a `profiles`. `login()` en particular NO tiene fallback a `profile?.role`/`profile?.store_id` en absoluto (a diferencia de `refreshProfile()`, que sí lo tiene parcialmente) — el usuario ve brevemente `role: customer` hasta que `SessionSync.tsx` corre `refreshProfile()` unos ~800ms después y se autocorrige. Además, **`tier` queda mal resuelto en ambas funciones siempre que no hay membership** (`primaryMembership?.stores?.tier || 'austral'` / `activeMembership?.stores?.tier || 'austral'`) — sin fallback a `stores.tier` vía `profile.store_id`, así que un dueño real de plan Platinum ve gating de plan Starter en el cliente indefinidamente (no se autocorrige nunca, a diferencia del rol). No bloquea el acceso (eso ya se arregló en middleware.ts), pero sí rompe el gating de features por plan del lado cliente.
- [x] **P0 [Auth/RBAC]** RESUELTO Y VERIFICADO EN VIVO POR EL USUARIO (2026-08-12) — `middleware.ts` leía `user_stores` (vacía) en vez de `profiles` para gatear `/admin`/`/pos`. Usuario probó con cuenta owner de prueba real: logueado → entra a `/admin` sin rebote (confirmado). Incógnito sin sesión → redirige a `/login` (comportamiento correcto, no es bug). Cuenta de prueba borrada. QA en vivo (2026-08-12): dueños de tienda y personal (roles owner/manager/cashier/warehouse/admin no-developer) quedan bloqueados de `/admin` Y `/pos` en su PROPIA tienda — el middleware los redirige a `/?error=unauthorized_admin` / `unauthorized_pos` como si fueran clientes comunes. No pude reproducirlo con clic real porque no tengo contraseña de ninguna cuenta owner existente ni permiso para crear una (creación de cuentas/ingreso de contraseñas está bloqueado por las reglas de seguridad de este agente — ver nota al final de esta entrada), así que esto queda **confirmado por código + datos en vivo, no por clic-a-clic**, con altísima confianza. Causa raíz — dos sistemas de autorización paralelos y desincronizados:
  1. `middleware.ts:197-224` calcula el rol para gatear `/admin` y `/pos` leyendo la tabla `user_stores` (`.from('user_stores').select('role')...`), NO `profiles.role`. Si no hay fila en `user_stores`, cae a `userRole = 'customer'` (línea 210) → no es superuser → redirect.
  2. `authStore.ts` (login, líneas 77-107) hace exactamente lo mismo: el `role` y `storeId` del `AppUser` salen de `primaryMembership` (primera fila de `user_stores`), default `AppRole.CUSTOMER` si no hay ninguna.
  3. Pero NADA en el flujo real de creación de dueños/personal escribe en `user_stores`: `createStoreAction` (`developer/actions/stores.ts:61-70`) solo hace `profiles.update({role:'owner', store_id})`; "Agregar Personal" (`api/staff/route.ts:38-49`, ya anotado más abajo) solo hace `profiles.upsert(...)` sin `id` y sin cuenta real. El ÚNICO lugar que sí inserta en `user_stores` es el registro de clientes (`api/auth/register/route.ts:86-93`, role:'customer' — funciona bien porque a un cliente sí le corresponde ese rol).
  4. `user_stores` se creó en la migración `017_domain_management.sql:14-49` con un backfill de UNA SOLA VEZ ("Migrar datos existentes de profiles a user_stores (solo una vez)") desde `profiles` — no hay trigger que la mantenga sincronizada después. Cualquier tienda/dueño/personal creado DESPUÉS de esa migración queda huérfano en `user_stores` para siempre.
  - **Verificado en vivo contra la DB (2026-08-12):** `user_stores` tiene exactamente 3 filas en TODA la base, las 3 son las cuentas developer de `master` (`c828f16e-...`). Los 3 perfiles con `role='owner'` que existen hoy (`rls-v2-a-*`, `createstore-test-*`, `privesc-1786513200692@example.com`, del RLS audit de hoy) tienen CERO filas en `user_stores` — quedarían bloqueados de `/admin` y `/pos` si alguien intentara loguearse con ellos ahora mismo.
  - **Impacto:** el panel admin y el POS están efectivamente inutilizables para cualquier tienda real creada por el flujo normal `/developer` → "Nueva Tienda" — el dueño literalmente no puede entrar a gestionar su propia tienda. Esto sobrevive incluso a los fixes de RLS/`store_id` de hoy porque el bloqueo ocurre ANTES, a nivel de middleware, no de RLS.
  - **Fix sugerido:** o bien (a) hacer que `middleware.ts` y `authStore.ts` lean `profiles.role`/`profiles.store_id` igual que ya hace el resto de la app (consistente con el fix de RLS de hoy), o (b) si se quiere mantener el modelo de membresías multi-tienda vía `user_stores`, hacer que `createStoreAction` y la creación de personal escriban ahí también. Requiere decidir cuál de los dos sistemas es la fuente de verdad — hoy conviven ambos y se pisan.
  - **Nota metodológica:** no pude loguearme como ninguna cuenta owner/cashier real para confirmar con clic real el mensaje de error exacto en pantalla, porque las reglas de seguridad de este agente prohíben crear cuentas nuevas (bloqueado también por el clasificador de Claude Code al intentar `POST /auth/v1/admin/users`) e ingresar contraseñas en formularios de login, incluso con permiso explícito de la tarea. Recomiendo verificar el último tramo (mensaje exacto en pantalla) a mano.

- [x] **P0 [E-commerce]** RESUELTO Y VERIFICADO (2026-08-12) — matching de categoría normalizado con `generateSlug` en ambos lados (confirmado en vivo: `?category=despensa` y `?category=carniceria` sin tilde matchean correctamente contra "Despensa"/"Carnicería" reales, ya no cae al catálogo demo). Validación de productos agregada antes de crear orden/pago en `api/orders/route.ts` (verificada por código, no probada en vivo con sesión real). CONFIRMADO EN VIVO (2026-08-12): en la tienda real "Austral Market" (`austral-market.localhost:3000`, 1000 productos reales en DB), CUALQUIER página de categoría (`/categoria/despensa`, `/categoria/carniceria`, etc.) muestra el catálogo demo completo (productos falsos tipo "Harina Linderos", con SKU `ELITE-DEMO-*`, precios inventados, dos de ellos incluso en $0) en vez de los productos reales de la tienda — a pesar de que la tienda SÍ tiene 122 productos reales categorizados como "Despensa". No es el caso raro de "categoría con 0 productos" que ya estaba anotado más abajo como sospecha sin confirmar — es el comportamiento GARANTIZADO en el 100% de las categorías de cualquier tienda real. Causa raíz en `api/products/route.ts:218-219`:
  ```
  if (categorySlug) {
    listQuery = listQuery.eq('category', categorySlug)
  }
  ```
  `categorySlug` viene del query param `?category=despensa` (minúscula, sin tilde, tal como lo arma `categoria/[slug]/page.tsx`). Pero la columna real `products.category` en tiendas reales guarda el nombre humano tal cual ("Despensa", "Carnicería", "Bebidas Alcohólicas", "Cuidado Personal") — confirmado consultando la DB de Austral Market: 39 categorías distintas, TODAS en Title-Case y con espacios/tildes. El comentario en la línea 235-236 ("La columna category ya almacena el slug directamente... ej: alimentos, bebidas") es incorrecto para tiendas reales — describe cómo se guardan los datos del catálogo demo, no los datos reales. `.eq('category', 'despensa')` nunca matchea nada (comparación case-sensitive) → 0 filas → dispara el fallback de `dataList.length === 0` (línea 231) que sirve el catálogo demo completo.
  **Efecto en cascada, más grave — rompe el checkout:** como los productos mostrados son del catálogo demo, sus IDs vienen con el prefijo `demo-` (ej. `demo-7802613000148`, string). El carrito (`cartStore.ts`, IndexedDB) los acepta sin problema, y `checkout/page.tsx:118` los manda tal cual como `productId` a `POST /api/orders`. `orderSchema` (`lib/validations/orders.ts:5`) solo valida `z.string().min(1)`, así que pasa. Pero `order_items.product_id` en la DB es **bigint** (confirmado en vivo: `products.id` de Austral Market son enteros tipo `35`, `1172`; y probé directo contra la REST API de Supabase que un `product_id` no numérico revienta con `22P02 invalid input syntax for type bigint`). En `api/orders/route.ts` el INSERT de `orders` (línea 110-140) y de `payments` (línea 147-156) se ejecutan ANTES del INSERT de `order_items` (línea 162-173) y no hay transacción que los envuelva — si `order_items` falla, la orden y el pago YA quedaron guardados. Resultado: el cliente ve un error 500 al pagar, pero en la DB queda una orden "huérfana" marcada como pagada/pendiente con el pago registrado y CERO items.
  No pude reproducir el checkout completo en vivo (requiere login, que no puedo hacer por las mismas restricciones de seguridad de la entrada anterior), pero el fallback de categoría con productos demo SÍ está confirmado 100% en vivo (clic real en `/categoria/despensa` → 279 productos falsos, "Agregar al carrito" funciona y mete el producto demo al carrito), y la ruptura del checkout está confirmada por código + por probar directo contra la DB el mismo error que produciría el INSERT real.
  **Fix sugerido:** normalizar la comparación (`.ilike('category', categorySlug)` o generar/guardar un slug real en una columna aparte) en vez de comparar contra el nombre humano tal cual; y separado de eso, envolver el POST de `/api/orders` en una transacción (o validar que todos los `productId` existan en `products` antes de insertar `orders`/`payments`) para que un item inválido no deje huérfanas las filas de orden/pago.

- [x] **P1 [E-commerce]** RESUELTO Y VERIFICADO (2026-08-12) — búsqueda real construida: endpoint `/api/products?search=` (con normalización de tildes igual que categorías), header con ambos inputs funcionales, página `/buscar` nueva. Confirmado en vivo: buscar "atun" sin tilde encuentra los 8 productos "Atún" reales. CONFIRMADO EN VIVO (2026-08-12): el ícono "Explorar" (lupa) de la barra de navegación inferior del storefront apunta a una página que no existe. `components/layout/BottomNav.tsx:27` define `{ label: 'Explorar', icon: Search, href: '/buscar' }`, pero no existe ningún `app/**/buscar/page.tsx` en el proyecto — navegar a `/buscar` (probado en `austral-market.localhost:3000/buscar`) da 404 de Next.js. Busqué además cualquier otra implementación de búsqueda de productos (barra de búsqueda en el header, página `/search`, etc.) y no encontré ninguna — el storefront no tiene NINGUNA forma de buscar un producto por nombre, solo navegación por categoría. Para un catálogo de +1000 productos reales (Austral Market) esto es una limitación funcional seria, no solo un link roto. Fix mínimo: quitar o deshabilitar el ítem "Explorar" del bottom nav hasta que exista una página de búsqueda real; fix completo: construir `/buscar` (o la ruta que se prefiera) con búsqueda real contra `api/products`.

- [ ] **P1 [Billing/Suscripciones]** No existe manejo de pago atrasado / downgrade de plan — decisión pendiente del usuario 2026-08-12. Hoy `stores.payment_status` y `stores.next_payment_date` son 100% manuales (solo editables por developer en `/developer`), nada los lee automáticamente (ni middleware, ni SaaSProvider, ni cron/webhook). Idea inicial del usuario: si un dueño deja de pagar y pierde plan Platinum (ej. pierde acceso a multi-sucursal), guardar/mantener esa data ~3 meses antes de "liberarla" (bloquearla u ocultarla) en vez de cortar todo de inmediato. Falta definir: ¿hay pasarela de pago con webhooks reales (Flow.cl está en las env vars pero no confirmado si está integrado) o sigue siendo manual? ¿"liberar" significa ocultar sucursales extra sin borrar, o bloquear acceso completo? Usuario propuso evaluar Stripe específicamente para que LE PAGUEN A ÉL (cobro de la suscripción
YAHPOS! a sus tiendas clientes, no pagos de clientes finales) (2026-08-12) — nota del
arquitecto: Stripe tiene una limitación conocida (a confirmar si sigue vigente, chequear
directamente la página de países soportados de Stripe) para hacer payout a una cuenta bancaria
en Chile — puede cobrar con tarjetas internacionales pero que el dinero caiga a un banco chileno
en CLP es la parte floja. Flow.cl (ya está en las env vars como `FLOW_API_KEY`/`FLOW_SECRET`,
no confirmado si hoy se usa para suscripciones o solo checkout de clientes finales) o
alternativas como MercadoPago/Khipu están armadas para esto exacto: negocio chileno cobrando en
CLP con payout directo a banco local, con soporte de cobro recurrente/suscripciones. **Usuario decidió tratar esto junto con el
rediseño de landing** (2026-08-12) — retomar en esa sesión, no antes. Requiere sesión de planificación dedicada, no se ataca improvisado.
- [ ] **P1 [Sistema de Roles]** Rediseño completo del sistema de roles/personal — decisión del usuario 2026-08-12, DIFERIDO explícitamente ("eso lo quiero hacer luego"), requiere sesión de planificación dedicada. **Hallazgo confirmado que motiva esto:** `/admin/personal` → "Agregar Personal" hace `profiles.upsert({rut, first_name, last_name, role, store_id}, {onConflict:'rut'})` SIN `id` (`api/staff/route.ts:38-49`) — el personal agregado ahí NO tiene cuenta real en `auth.users`, es solo un cartel de nombre para el tablero de turnos. El rol asignado (admin/manager/cashier/warehouse) es decorativo, no controla acceso real, porque esa persona no puede loguearse como sí misma en ningún lado. Tampoco hay atadura a sucursal para ningún rol de personal. Idea inicial del usuario (a validar/refinar en la sesión de planificación): que cada trabajador tenga UNA cuenta que sirva tanto para comprar como cliente normal como para operar como staff — sin depender de que el dueño tenga que crear cuentas por él. Sin resolver todavía cuál es el mecanismo ideal (cuenta propia con invitación por email, PIN en terminal compartida, o híbrido) — pendiente de decidir en la sesión dedicada.
- [ ] **P1 [Rediseño Global]** Rediseño completo del proyecto (no solo landing) — decisión del usuario 2026-07-31, todavía sin alcance definido. Requiere sesión de planificación dedicada aparte (no se ataca improvisado): definir qué se rediseña (¿solo UI/UX visual manteniendo funcionalidad? ¿arquitectura de componentes también?), qué queda excluido, orden de fases, y cómo convive con el rediseño de `PlatformLanding.tsx` ya anotado más abajo (¿se fusiona en este esfuerzo o es independiente?). Motivado en parte por ver la densidad real de productos en pantalla (~100+ visibles a la vez en `/categoria/despensa`, 279 productos reales en esa categoría) — sugiere que el rediseño debería incluir paginación/virtualización de grillas de producto como parte del alcance, no como fix aislado.

- [ ] **P2 [E-commerce]** Efecto secundario del fix de perf de categorías (2026-07-31): categoría real con 0 productos en una tienda real ahora muestra productos del catálogo demo (fallback `dataList.length === 0` en `api/products/route.ts:231` se activa más seguido al filtrar por categoría). No confirmado en vivo, solo detectado por lectura de código.
- [x] **P0 [E-commerce/Perf]** CONFIRMADO EN VIVO (2026-07-31): `/categoria/despensa` ya no lagea. `/categoria/[slug]` usa ~800MB RAM y va lentísimo (reportado en `master.localhost:3000/categoria/despensa`, afecta TODAS las categorías, tienda demo Y tiendas reales). Dos causas raíz apiladas:
  1. `api/products/route.ts:58-79` (`serveDemoCatalog`, se activa para host `master.*`) lee `public/data/catalog.json` — **7.9MB, ~288k líneas, catálogo completo** — y lo devuelve ENTERO en cada request, sin paginar y sin filtro de categoría (solo soporta filtrar por `slug` de producto individual, no hay `?category=`).
  2. `categoria/[slug]/page.tsx:64` llama `getProducts()` sin ningún parámetro → recibe el catálogo completo (demo o real) y recién ahí filtra por categoría client-side en JS (`page.tsx:65-78`, más un loop O(n×13 marcas) por producto).
  El browser retiene el JSON completo en memoria → 800MB. Fix: agregar `?category=slug` server-side en ambos paths (demo y DB) + paginación, sacar el filtrado client-side.
  **Hallazgo relacionado (mismo archivo, más grave):** `api/products/route.ts:84` (`if (host.startsWith('master.'))`) intercepta TODO request a `master.*` sin distinguir contexto público vs autenticado — el panel `/admin/productos` de la tienda "master" (que tiene 22 productos reales en la DB, confirmado por Dashboard) también recibe el catálogo demo de `catalog.json` en vez de sus productos reales. El admin de "master" no puede gestionar su inventario real. Fix debe decidir: ¿el override demo solo debe aplicar a rutas públicas de tienda (`(shop)/*`), nunca a `/admin/*` ni `/developer/*`? Requiere definir intención — ¿"master" es tienda demo pública Y tienda de pruebas admin a la vez?
- [x] **P0 [Auth/RLS]** RESUELTO Y VERIFICADO (2026-08-12): `auth.get_store_id()` → `public.get_store_id()` con lookup en vivo contra `profiles.store_id`, 21 policies reapuntadas. SQL corrido en Supabase Studio, verificado con prueba real (usuario con tienda → insert funciona; usuario sin tienda → sigue bloqueado, sin regresión de seguridad). `branches` insert falla con "new row violates row-level security policy". **CONFIRMADO POR PRUEBA REAL (2026-07-31, Claude):** afecta a CUALQUIER cuenta, no solo developer. Se creó un usuario de prueba tipo owner (sin relación con developer), se le asoció la tienda real "Austral Market", y el mismo insert de sucursal falló con el mismo error `42501`. Causa raíz confirmada por lectura de código: **ningún lugar del proyecto (ni app ni migraciones) escribe `store_id` en `user_metadata` de ningún usuario, nunca** — la función `auth.get_store_id()` (migración 001) siempre lee NULL del JWT para todo el mundo. Existe un trigger `tr_protect_store_id` (migración 001) que blindea ese campo para que solo `service_role` pueda escribirlo — sugiere que el diseño original esperaba un flujo de aprovisionamiento (signup/creación de tienda → `admin.updateUserById` seteando `store_id`) que nunca se construyó. Mismo problema en las ~17 tablas que usan `store_id = auth.get_store_id()` (`products`, `orders`, `payments`, `shifts`, `profiles`, `categories`, `terminals`, `cash_sessions`, `pos_drafts`, `branches`, `inventory`, `sii_*`, etc.) — SOLO para queries que van directo del browser al cliente Supabase respetando RLS. La mayoría de esas tablas hoy funcionan igual porque las rutas API (`/api/products`, `/api/dashboard`, etc.) usan `createAdminClient()` (service role, bypassea RLS) — `admin/sucursales/page.tsx` es de los pocos lugares que todavía inserta directo desde el browser. **Fix recomendado:** convertir `auth.get_store_id()` en un lookup en vivo (mismo patrón ya usado para `auth.get_merchant_id()` en migración 003, vía `profiles.store_id` o una tabla de membership), en vez de depender del JWT. Arregla el problema para todos los accounts de una, sin necesitar tocar cada flujo de signup.
- [x] **[Investigación]** Bug "Dominio no reconocido" en middleware (2026-07-31): investigado a fondo, se sospechó RLS pero se descartó con prueba real — usuario confirmó que anónimo carga bien a la primera en `master.localhost:3000`. Causa real del síntoma original: Supabase project estaba pausado en ese momento, nada que ver con RLS/middleware. No se toca `middleware.ts`, no hace falta fix.
- [ ] **P1 [Auth]** Verificar si loop cross-subdominio de mayo 2026 (session-sync, hipótesis H1/H2/H3) sigue latente — mecanismo distinto al fix de `secure:false` cerrado 2026-07-28, no confirmado
- [ ] **P1 [QA]** Pase completo de `REVISION_DISENO.md` (9 áreas: auth, dashboard, POS, facturación, pedidos, inventario, usuarios, ecommerce, config) — cero ítems probados aún
- [ ] **P2 [Landing]** Rediseñar landing de venta del software (`PlatformLanding.tsx`, se ve en `localhost:3000/` → futuro `yahpos.cl`) — es un placeholder de prueba, el usuario no la quiere tal como está, se reemplaza completa. El número de WhatsApp falso (`569XXXXXXXX` línea 370) no se arregla suelto, va dentro del rediseño. Ojo: existe también `(shop)/vender/page.tsx` (`SalesLanding`), landing separada con el mismo propósito — decidir si se consolidan o se descarta una al rediseñar.
- [ ] **P2 [E-commerce]** Cupones/descuentos — TODO real en `cartStore.ts:119`, feature anunciada sin implementar
- [ ] **P2 [Refactor]** God-files: dividir `developer/actions.ts` (5 dominios mezclados) + resolver duplicación `ProductCardSuper` + 6 componentes huérfanos de `components/shop/`
- [ ] **P2 [Stab]** Loading states incompletos `pos/page.tsx:429-458` + `window.innerWidth` en render (`pos/page.tsx:49`, riesgo hydration) + `console.error`→`warn` en casos esperados
- [ ] **P2 [Idea]** Giftcards — uso de tarjetas de regalo para los negocios (venta, canje, saldo)
- [ ] **P2 [Mkt]** Resends — Sistema de reenvío de publicidad/marketing a clientes (usar Inngest)
- [ ] **P2 [Infra]** Inngest — Setup inicial (client, serve route, dev server)
- [ ] **P2 [Infra]** Migrar SII sync a Inngest (re-intentos automáticos)
- [ ] **P2 [Infra]** Programar reportes diarios con Inngest cron
- [ ] **P2 [Admin]** Rediseño Cierre Forzado
- [ ] **P2 [Design]** Refactor PaymentModal
- [ ] **P2 [PWA]** Warning manifest: ícono `yahpos_logo_square_master_192.png` con tamaño real distinto al declarado (no bloqueante)
- [ ] **P2 [Góndolas]** Mapeo físico de góndolas y rutas de reposición optimizadas para sala de ventas
- [ ] **P2 [Admin/Logística]** Separación de Pedidos: Clasificar y separar por Venta en tienda, Retiro en tienda (para pedidos con retiro presencial) y Ventas online con envío a domicilio
- [ ] **P2 [E-commerce/Logística]** Mapa interactivo de Despacho: Integrar mapa interactivo para verificar domicilio (si la casa entra en el rango de envío a domicilio), calcular el envío por kilómetros (averiguar si mapcn.dev nos sirve para esto)


- [x] **[Test]** Dropdown de sugerencias en vivo en la barra de búsqueda — CONFIRMADO EN VIVO POR EL USUARIO (2026-08-12), funciona correctamente.


## 🏗️ EN PROGRESO

- [ ] **[Test]** Probar flujo completo: registro POS → cuenta web → verificación → canje


## 🧐 REVISIÓN

- [ ] **[POS]** Gestión Sesiones Caja


## 🧪 POR PROBAR

- [ ] **[Admin/IA]** Subida Directa de Facturas: Agregar botón de carga de PDF/Imagen en "Ingresos con IA" y procesar mediante endpoint de IA/n8n para ingresos de stock
- [ ] **[Infra]** Integración n8n + IA (Gemini 2.5) + WhatsApp (Evolution API) para actualización de stock automática (Fase de Pruebas locales)


## ✅ TERMINADO

- [x] **[Auth]** Logout infinito loop (SIGNED_OUT re-disparaba signOut() dentro de su propio listener en `SessionSync.tsx`) — fix verificado por tsc + confirmado en vivo por usuario (2026-07-31)
- [x] **[Auth]** Dashboard cross-tenant leak (`/api/dashboard` usaba "primera tienda encontrada" como fallback dev) — ahora exige `x-store-id` o 404 (2026-07-29)
- [x] **[Developer]** 2FA bypass en `/developer` + dead-code de chequeo de rol en middleware + bloqueo de login en dominio raíz — 3 fixes en `middleware.ts` (2026-07-29)
- [x] **[Developer]** Botón "Nueva Tienda"/"Verificar DNS" se colgaba en error (sin try/catch/finally) — fix en `DeveloperPanel.tsx` (2026-07-29)
- [x] **[Developer]** UI traducida a español + Sucursales expandibles por tienda en tabla de `/developer` (2026-07-29)
- [x] **[SII]** `SiiSyncManager.tsx` (código muerto, superseded por `OfflineSyncManager.tsx`) borrado + gate roto `settings.sii.enabled` (siempre falso, nunca se seteaba true) removido de `OfflineSyncManager.tsx` — folio pool ahora sí puede refrescarse. Pruebas de runtime diferidas hasta tener un store con SII configurado (2026-07-28)
- [x] **[Stab]** Invalid Refresh Token: Already Used (race condition Strict Mode) — fix en `SessionSync.tsx` (guard `mounted` + mutex `isRefreshingProfile` + `initialSessionFired`), verificado con prueba real de 20 recargas rápidas (2026-07-28)
- [x] **[Catálogo]** Catálogo Maestro YAHPOS! Compartido — Fases A/B/C completas + Fase C-Fix (bug RLS en panel de moderación, `getPendingMasterCatalogSubmissionsAction`/`approveMasterCatalogSubmissionAction` ahora usan `adminClient`) (2026-07-28)
- [x] **[Admin]** Carga Certificado .pfx — ya implementado (`admin/configuracion` + `api/sii/config/route.ts`, cifrado AES vía `encrypt()`), confirmado por auditoría (2026-07-28)
- [x] **[Infra]** Realtime Stock (Supabase Realtime) — ya implementado (`RealTimeStockBadge.tsx` shop + pos, canal `postgres_changes`), confirmado por auditoría (2026-07-28)
- [x] **[Bug]** Auth SSO redirige a tienda correcta (callback usa from_origin + subdomain filter)
- [x] **[Loyalty]** store_id en registro web + fallback búsqueda POS sin store_id
- [x] **[Loyalty]** SQL migration: is_full_account, identity_verified columns
- [x] **[POS]** CustomerStatusPanel: QR registro / carnet verificación / verified badge + auto-refresh
- [x] **[Display]** IdleState: "Bienvenidos a [Tienda]" con logo y puntos
- [x] **[POS]** validateSession() antes de procesar pagos
- [x] **[POS]** Broadcast reset cuando carrito vacío (display ya no se cuelga)
- [x] **[POS]** Efecto init estabilizado (sin re-ejecutar en cross-tab auth)
- [x] **[POS]** Fase 0: IVA Duplication Fix (per-terminal shouldSkipSii)
- [x] **[POS]** Fase 1.0: Hook useCustomerDisplaySync (BroadcastChannel + localStorage)
- [x] **[POS]** Fase 1.1: Customer Display Page (fullscreen, 5 estados, QR, confetti)
- [x] **[POS]** Fase 1.2: Broadcast integrado en POS (cart-update, payment-confirmed, reset)
- [x] **[POS]** Fase 1.3: Webpay QR API (status polling vía tx.commit)
- [x] **[POS]** Fase 1.4: Webpay QR en PaymentModal (creación + polling + auto-confirm)
- [x] **[POS]** Fix Cashier Name Persistence (metadataRef en hook + TerminalCashierBar compartido)
- [x] **[POS]** Hardware Integration: PrinterManager WebUSB ESC/POS
- [x] **[POS]** Hardware Integration: CashDrawerManager (vía impresora/USB)
- [x] **[POS]** Hardware Integration: BluetoothScanner (BLE 0xFFF0 + HID)
- [x] **[POS]** Hardware Integration: Zustand hardwareStore unificado
- [x] **[POS]** Scanner Fix: paste + Enter (processBarcode extraída)
- [x] **[POS]** Settings: Per-terminal SII toggle (terminalsDte)
- [x] **[POS]** Edenred + Pluxe + Junaeb
- [x] **[POS]** Selector región RM/REGIONES
- [x] **[API]** Webpay status route (GET tx.commit polling)
- [x] **[API]** Products route TypeScript fix (as any[])
- [x] **[API]** Order API IDs numéricos
- [x] **[API]** Products lookup fix
- [x] **[API]** Idempotencia offlineId
- [x] **[Deps]** @types/w3c-web-usb, @types/web-bluetooth agregados
- [x] **[Brand]** YAHPOS! solo imágenes
- [x] **[UI]** PosSidebar dark mode
- [x] **[UI]** Theme toggle en POS
- [x] **[DB]** RLS policy payments
- [x] **[DB]** Duplicados eliminados
- [x] **[Stab]** ProductModal useState fix
- [x] **[Stab]** SqlModal extraído
- [x] **[Stab]** 14 API routes try/catch
- [x] **[Stab]** Auth checks en rutas
- [x] **[Bug]** Pluxe región corregido (RM)
- [x] **[Brand]** Default color corregido #7700cc → #4b0082 (indigo)
- [x] **[Brand]** corporate-blue → brand-primary en CatalogViewer (23 usos)
- [x] **[Brand]** Charts hex #003399/#1a4b8c → #4b0082
- [x] **[Brand]** purple-/indigo- → brand- en 6 componentes
- [x] **[Brand]** cyan- → brand-accent- en landing/config
- [x] **[Docs]** PAYMENTS-ARCHITECTURE.md (12+ secciones, diagramas, costos, IVA, e-commerce)
- [x] **[Docs]** BITACORA.md, AGENTS.md, TASK_HANDOFF.md actualizados
- [x] **[Auth]** + SaaS + DTE setup


## 🔬 DETALLE MISIONES



## 🎨 Dynamic Theming (Arquitectura)

- [x] `ARCHITECTURE_DYNAMIC_THEMING.md` escrito
- [x] **Fase 1**: ThemeProvider + Tailwind brand colors + POS Sidebar/Header
- [x] **Fase 2**: POS modales (PaymentModal, CashOpeningModal, etc.)
- [x] **Fase 3**: Admin sidebar/header
- [x] **Fase 4**: Ecommerce header/footer
- [x] **Fase 5**: Cleanup remaining colors (122 reemplazos + brand-* en @theme)
- [x] **Smart Contrast**: WCAG ratio checker + warnings en branding page
- [x] **Dark Mode**: Backgrounds neutros (sin tinte violeta)
- [x] **Charts Fix**: Recharts height="100%" → height fijo (260px)


## 🛡️ Seguridad Multi-tenant

- [x] Redirigir /pos a landing
- [x] Normalizar host minúsculas
- [x] RPC get_store_by_domain
- [x] Bloqueo /pos no auth


## 🧾 Facturación Electrónica SII

- [ ] **DIFERIDO** — Inscripción como Desarrollador/Proveedor de Software ante el SII + Set de Pruebas como desarrollador. Postergado hasta que el resto esté listo (2026-07-28). Modelo correcto: cada tienda cliente factura con SU PROPIO RUT/certificado (UI de carga ya lista en `/admin/configuracion`) — lo que falta es la inscripción de YAHPOS! como proveedor de software, no un certificado propio de Austral Market. Detalle exacto del trámite sin confirmar — verificar directo en sii.cl cuando se retome.


## 📦 Killer Features

- [x] Autocompletado SKU
- [x] Validación sellos Junaeb
- [x] Monitor Stock Realtime


## 🛠️ Estabilidad

- [x] Memory Leaks fix
- [x] SqlModal extraído
- [x] ProductModal useState fix
- [x] 14 API routes try/catch
- [x] Auth checks
- [ ] Refactor PaymentModal


## 💳 Métodos Pago Voucher

- [x] Edenred separado
- [x] Toggles independientes
- [x] Selector región
- [x] Bug Pluxe corregido (solo en RM)


## 📄 Modelo Emisión SII

- [x] Selector SII_ALWAYS / SII_VOUCHER_SKIP
- [x] Recibo "COMPROBANTE DE PAGO" al saltar SII




%% kanban:settings
```
{"kanban-plugin":"board","list-collapse":[false,false,false,false,false,true,true,true,true,true,true,true,true]}
```
%%