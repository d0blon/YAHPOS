# Bitácora — YAHPOS!

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

**Archivo:** `docs/PAYMENTS-ARCHITECTURE.md`

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

**Archivo:** `docs/PAYMENTS-ARCHITECTURE.md §12`

**Contenido:**
- Clasificación de métodos: pasarela vs terminal con DTE vs voucher
- Lógica de decisión SII corregida por terminal (no global)
- Matriz de comportamiento (qué emite el POS vs qué emite el terminal)
- Diferencias entre voucher comercial y boleta electrónica
- Configuración por terminal en Admin
- Validación de seguridad contra dualidad

### E-commerce Full Flow (Nuevo en docs)
Documentación del flujo completo de pago online con gaps identificados.

**Archivo:** `docs/PAYMENTS-ARCHITECTURE.md §13`

**Contenido:**
- Diferencias POS vs E-commerce (tabla completa)
- Diagrama de secuencia del checkout Webpay Plus
- Flujo actual vs propuesto para SII en e-commerce
- Configuración de SII propuesta para admin
- Tabla de gaps con impacto y soluciones
- Plan extendido para e-commerce (Fase 4)
