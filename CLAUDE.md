# CLAUDE.md — YAHPOS! Context for Claude Code

> Este archivo es leído automáticamente por Claude Code al iniciar una sesión.
> Léelo completo antes de tocar cualquier archivo del proyecto.

---

## 1. ¿Qué es YAHPOS!?

Sistema POS SaaS multi-tenant hecho en Chile. Todo-en-uno:
- **POS** táctil con hardware (impresoras térmicas WebUSB, scanner BLE, gaveta de dinero)
- **Admin** panel: productos, clientes, personal, cajas, facturación, reportes, inventario con IA
- **E-commerce** público con carrito, checkout y club de puntos
- **Facturación electrónica** certificada ante el SII (DTE, boletas, facturas, guías)
- **Integración IA** (Gemini 1.5 Flash) para lectura automática de facturas de proveedor via imagen/PDF
- **n8n** como orquestador de automatizaciones

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16.2.3 (App Router, **webpack** — NO turbopack) |
| Language | TypeScript (strict) |
| Styling | **Tailwind CSS v4** + CSS variables en `globals.css` |
| Componentes | shadcn/ui (Radix primitives) |
| Auth | Supabase SSR (OAuth Google + email) |
| DB | Supabase (PostgreSQL) — proyecto `bddpzqayurvhgpllykku` |
| Multi-tenancy | Subdominios dinámicos + RPC `get_store_by_domain` |
| SII | Motor DTE propio (Node-Forge, XML-Crypto, CAF, .pfx) |
| PWA | `@ducanh2912/next-pwa` |
| Pagos | Webpay (Transbank), Edenred, Pluxe, Junaeb, SumUp, Getnet |
| Animaciones | GSAP + Framer Motion |
| IA | Gemini 1.5 Flash (lectura de facturas) + OpenAI (descripciones) |
| Automatización | n8n (self-hosted en Render/Koyeb) |

---

## 3. Comandos Clave

```bash
npm run dev        # Servidor de desarrollo (webpack)
npm run build      # Build producción — debe pasar SIN errores antes de reportar
npm run lint       # ESLint — debe pasar SIN errores antes de reportar
npm test           # Jest unit tests
npm run test:e2e   # Playwright e2e
```

> ⚠️ El proyecto tiene errores de lint PRE-EXISTENTES en archivos fuera de scope (EditorProvider, HeroSlide, etc.). No los toques a menos que sean tu tarea. Los archivos que crees o modifiques deben tener 0 errores propios.

---

## 4. Directorio del Proyecto

```
austral-market-next/
├── src/
│   ├── app/
│   │   ├── (auth)/         → Login, registro, recuperar contraseña
│   │   ├── (pos)/pos/      → POS táctil principal + customer-display
│   │   ├── (shop)/         → E-commerce público
│   │   ├── admin/          → Panel administrativo completo
│   │   ├── developer/      → Command center del desarrollador/owner
│   │   └── api/
│   │       ├── v1/bot/     → Endpoints para n8n (API Keys autenticadas)
│   │       │   ├── products/          → GET búsqueda de catálogo
│   │       │   ├── inventory/
│   │       │   │   ├── pending/       → POST crear ingreso pendiente (con IA mapping)
│   │       │   │   └── update/        → POST actualizar stock directo
│   │       ├── admin/inventory/
│   │       │   ├── adjustments/       → GET listar ingresos pendientes
│   │       │   ├── adjustments/[id]/approve/  → POST aprobar + aprender mapping
│   │       │   └── adjustments/upload/        → POST subir factura → Gemini → pending
│   │       └── ...otras rutas API
│   ├── components/
│   │   ├── admin/
│   │   │   ├── ProductModal.tsx        → Modal crear/editar productos
│   │   │   └── PendingAdjustmentsTab.tsx → UI para revisar facturas procesadas por IA
│   │   ├── pos/            → Componentes del POS
│   │   └── shop/           → Componentes de la tienda web
│   ├── lib/
│   │   ├── supabase.ts     → ⛔ ZONA ROJA — cliente Supabase SSR
│   │   ├── hardware/       → WebUSB impresora, Bluetooth scanner, gaveta
│   │   ├── sii/
│   │   │   └── engine.ts   → ⛔ ZONA ROJA — motor DTE SII
│   │   ├── api-utils.ts    → withAuth(), apiError(), requireStoreAccess()
│   │   └── chile-geography.ts → Regiones, comunas, ciudades de Chile
│   ├── providers/
│   │   ├── SaaSProvider.tsx → ⛔ ZONA ROJA — plan/tier del tenant
│   │   └── AppProviders.tsx
│   ├── stores/
│   │   ├── posStore.ts     → 🔒 LOCK — store principal del POS (Zustand)
│   │   ├── authStore.ts    → Store de autenticación
│   │   └── cartStore.ts    → Store del carrito de compras
│   └── middleware.ts       → ⛔ ZONA ROJA — multi-tenant routing
├── supabase/migrations/    → SQLs de migración (022 es la última aplicada)
├── AGENTS.md               → Protocolo de trabajo (para referencia)
├── BITACORA.md             → Historial completo de cambios
├── YAHPOS Kanban.md        → Estado actual del proyecto
├── TASK_HANDOFF.md         → Tarea activa
└── WALKTHROUGH.md          → Documentación de features implementadas
```

---

## 5. Reglas Críticas (NO Saltarse)

### Regla de Oro (vigente desde 2026-08-12): correctitud y seguridad antes que velocidad
Decisión explícita del dueño del proyecto tras una auditoría de un día que encontró ~10 bugs
severos (varios críticos: escalada de privilegios en RLS, `/admin`/`/pos` inaccesibles para
dueños reales, checkout que podía dejar órdenes pagadas sin items) — todos con la MISMA causa
raíz: algo se construyó una vez, quedó a medias o se reemplazó por otra cosa en paralelo, y nadie
verificó que las dos partes siguieran de acuerdo. Ver `AGENTS.md §0` (mismo texto, versión para
Antigravity).

Para CUALQUIER `TASK_HANDOFF.md` que escriba de acá en adelante, no solo fixes de bugs:
1. **Antes de escribir el spec:** investigar el radio de impacto completo — qué tablas/policies
   RLS toca, qué otro código ya lee/escribe esa misma data, qué cliente Supabase corresponde
   (`createClient()` respetando RLS vs `createAdminClient()`) y por qué.
2. **Toda tabla o camino de escritura nuevo lleva su policy de RLS en el MISMO handoff** — nunca
   "la seguridad se agrega después".
3. **Seguir verificando cada Report Back de forma independiente y en vivo** (tsc, lectura
   completa de diffs, queries/pruebas reales) — no confiar en el "✅ 0 errores" reportado.
4. Es aceptable y esperado que esto tome 2-3x más tiempo de lo habitual. No es un problema.
5. Auditorías chicas y periódicas (revisar `pg_policies` u otras zonas de riesgo cada tanto) en
   vez de dejarlo todo para una auditoría gigante al final.

### Tailwind CSS v4
`tailwind.config.ts` **ES IGNORADO**. Todo el theme se define en `src/app/globals.css` dentro de `@theme { ... }`.
- ✅ Usar: `bg-brand-primary`, `text-brand-accent`, `from-brand-500`, `shadow-brand-primary/10`
- ❌ Nunca usar: `purple-*`, `violet-*`, `indigo-*`, `sky-*`, `cyan-*`

### Zonas Rojas (NO modificar sin plan de pruebas aprobado)
```
src/middleware.ts
src/providers/SaaSProvider.tsx
src/lib/sii/engine.ts
src/lib/supabase.ts
```

### Archivos con Lock (solo una tarea a la vez)
```
package.json
tailwind.config.ts
src/middleware.ts
src/lib/supabase.ts
src/stores/posStore.ts
src/app/(pos)/pos/page.tsx
```

### Archivos que NO tocar bajo ninguna circunstancia
```
src/sections/PlatformLanding.tsx
src/components/layout/PlatformHeader.tsx
src/app/(auth)/login/page.tsx
src/components/ui/button.tsx
src/components/ui/badge.tsx
```

### Dual ThemeProvider
Hay DOS `ThemeProvider` en el árbol: `RootLayout` (dark) y POS layout (light).
`BrandThemeSetter` solo inyecta `--brand-*` inline. **No inyectar `--surface-*` inline** — se desincronizan.

### Hardware APIs
WebUSB / Web Bluetooth / Web Serial solo funcionan en Chromium (Chrome, Edge). No en Firefox ni Safari.

---

## 6. Arquitectura Multi-Tenant

Cada tienda se identifica por subdominio o dominio personalizado:
```
master.localhost:3000          → Tienda "Master" (desarrollo)
austral-market.localhost:3000  → Tienda "Austral Market"
{slug}.yahpos.cl               → Producción
dominio-personalizado.cl       → Custom domain
```

El `middleware.ts` resuelve el `store_id` de cada request via RPC `get_store_by_domain`. **Todos los queries a la DB deben incluir `.eq('store_id', storeId)`** para el aislamiento de datos.

---

## 7. API de Bots (n8n Integration)

Las rutas `/api/v1/bot/*` son autenticadas por **API Key** (tabla `store_api_keys`):
- Header requerido: `Authorization: Bearer <api_key>`
- La key se hashea con SHA-256 y se compara contra `key_hash` en la DB
- Se extraen `store_id` y `scopes` automáticamente del registro

### Scopes disponibles
- `products:read` → GET /api/v1/bot/products
- `inventory:write` → POST /api/v1/bot/inventory/pending y /update

### Flujo de Ingreso de Facturas con IA
1. n8n envía imagen/PDF a Gemini → extrae JSON de productos
2. n8n POST `/api/v1/bot/inventory/pending` con el JSON
3. El backend busca en `supplier_product_mappings` si hay equivalencias aprendidas
4. Se crea un registro en `pending_inventory_adjustments` (status: 'pending')
5. El admin revisa en la UI de YAHPOS! ("Ingresos con IA") y aprueba
6. Al aprobar, el sistema aprende la equivalencia y la guarda en `supplier_product_mappings`

**También funciona subiendo la factura directamente desde YAHPOS!** (sin n8n) mediante el botón "Subir Factura" en `/admin/productos` → pestaña "Ingresos con IA".

---

## 8. Base de Datos — Tablas Clave

| Tabla | Propósito |
|-------|-----------|
| `stores` | Tenants (negocios) — cada uno tiene `store_id` único |
| `products` | Catálogo por tienda (`store_id`) |
| `store_api_keys` | API Keys para n8n con scopes y hash SHA-256 |
| `pending_inventory_adjustments` | Facturas procesadas por IA esperando aprobación |
| `supplier_product_mappings` | Mapeos aprendidos: nombre_proveedor → producto_catálogo |
| `profiles` | Usuarios con roles (customer, employee, owner, developer, admin, manager, cashier, warehouse) |
| `subscription_tiers` | Planes SaaS (basico, archipiélago, patagonia) |
| `sii_config` | Config DTE por tienda (RUT, certificado, folios) |
| `sii_documents` | DTEs emitidos |
| `cash_sessions` | Sesiones de caja POS |
| `terminals` | Terminales POS registradas |

---

## 9. Estado Actual del Proyecto (Junio 2026)

### ✅ Completado y Funcional
- POS completo: ventas, pagos (Webpay QR, Edenred, Pluxe, Junaeb, efectivo, transferencia)
- Hardware: impresora térmica WebUSB ESC/POS, gaveta de dinero, scanner BLE
- Customer Display: pantalla secundaria con 5 estados y sincronización BroadcastChannel
- Admin panel: productos, clientes, personal, sucursales, cajas, reportes, branding
- Facturación electrónica SII: motor DTE con CAF y certificados `.pfx`
- Dynamic Theming: colores de marca por tenant con dark mode
- Multi-tenancy: subdominios + dominios personalizados con RLS
- Sistema de API Keys para n8n (tabla `store_api_keys`)
- Endpoints `/api/v1/bot/products`, `/api/v1/bot/inventory/pending`, `/api/v1/bot/inventory/update`
- Ingreso de facturas con IA: upload directo + n8n, validación manual, aprendizaje de mapeos
- Tabla `supplier_product_mappings` con aislamiento por `store_id` y proveedor
- Catálogo Maestro YAHPOS! Compartido (SKU autocomplete + panel de moderación Developer)
- Suscripción Realtime de Stock (`RealTimeStockBadge.tsx`, canal `postgres_changes`)
- Carga de Certificado `.pfx` desde `/admin/configuracion` (cifrado AES vía `encrypt()`)
- Fix Invalid Refresh Token (race condition Strict Mode en `SessionSync.tsx`)

### 🧪 Por Probar (Pendiente de QA)
- Subida directa de facturas desde YAHPOS! (botón en `/admin/productos`)
- Integración n8n + Gemini para actualización de stock automática

### 🏗️ En Progreso
- Flujo completo: registro POS → cuenta web → verificación → canje de puntos

### 📋 Backlog Prioritario
1. **[Infra]** Inngest — setup para tareas de fondo (reintentos SII, reportes cron)
2. **[Design]** Refactor PaymentModal
3. **[PWA]** Warning manifest: ícono `yahpos_logo_square_master_192.png` con tamaño real distinto al declarado (no bloqueante)

---

## 10. Variables de Entorno Necesarias

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://bddpzqayurvhgpllykku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# IA
GEMINI_API_KEY=...          # Para lectura de facturas con Gemini 1.5 Flash

# Seguridad
SECURITY_SALT=...           # Salt para hashing interno

# WhatsApp / Soporte
SUPPORT_WHATSAPP=569...

# Pagos
FLOW_API_KEY=...            # Flow.cl (respaldo)
FLOW_SECRET=...
FLOW_SANDBOX=true

# SII
SII_API_URL=https://api.sii.cl
SII_ENVIRONMENT=certification   # o "production"
```

---

## 11. Flujo de Trabajo Arquitecto/Constructor (TÚ ERES EL ARQUITECTO)

**MUY IMPORTANTE**: En este proyecto trabajamos con un modelo de dos agentes (OpenCode Protocol).
- **TÚ (Claude Code) eres el ARQUITECTO**: Tu trabajo es investigar (usando `/graphify .`), planificar arquitecturas sólidas, prever riesgos y escribir la especificación detallada. **NO implementas ni modificas el código de la aplicación**.
- **Antigravity (Gemini en el IDE) es el CONSTRUCTOR**: Él se encarga de editar los archivos, ejecutar tests y reportar.

### Tu flujo de trabajo como Arquitecto:
1. El usuario te pide una nueva funcionalidad o arreglo.
2. Usas `/graphify .` para investigar dependencias e impactos en el codebase.
3. Analizas riesgos (especialmente si toca zonas rojas).
4. Generas o actualizas el archivo `TASK_HANDOFF.md` en la raíz del proyecto con la especificación exacta de qué archivos tocar y qué lógica implementar.
5. Le pides al usuario que revise y apruebe el handoff.
6. Una vez aprobado, el usuario pasará la posta a Antigravity en el IDE para que ejecute la tarea.

**Bajo ninguna circunstancia debes empezar a editar los archivos del frontend o backend directamente**. Tu único output de código es el archivo `TASK_HANDOFF.md`.

---

## 12. Errores de Lint Pre-Existentes (Ignorar)

Hay 521 problemas de lint en el proyecto que **NO son tu responsabilidad**. Los principales archivos con errores fuera de scope son:
- `src/providers/EditorProvider.tsx` (múltiples `any`)
- `src/sections/HeroSlide.tsx` (múltiples `any`)
- `src/sections/PacksSlide.tsx` (múltiples `any`)
- `src/providers/SaaSProvider.tsx` (zona roja — no tocar)
- `src/lib/sii/ted.ts` (zona roja — no tocar)

**Tu trabajo:** que los archivos que tú crees o modifiques tengan 0 errores de lint propios.

---

## 13. Branding YAHPOS!

- **Nombre:** YAHPOS! — siempre con mayúsculas y signo de exclamación
- **Sin usar:** "PatagoniaPOS" en ningún lugar del código o UI
- **Logos:**
  - `public/logos/yahpos_logo_master.svg` (light mode)
  - `public/logos/yahpos_logo_master_dark.svg` (dark mode)
  - `public/logos/yahpos_logo_square_master.svg` (cuadrado)
- **Color primario:** `#4b0082` (indigo oscuro) → clase `brand-primary`
- **Color acento:** amarillo → clase `brand-accent`

---

*Última actualización: 27 Julio 2026*
*Protocolo de Arquitecto (Claude Code) + Constructor (Antigravity)*
