# 🗺️ MAPA MAESTRO DE MISIONES PENDIENTES - PATAGONIAPOS

Este documento consolida todas las características y misiones que hemos "guardado para después" o que están en estado de prototipo/mock. Es la hoja de ruta definitiva para llevar a PatagoniaPOS de un MVP estable a una plataforma comercial completa.

## 🏁 ESTADO DEL PROYECTO (Abril 2026)
- **Fase Actual**: Autenticación Real + RBAC Admin + Permisos por Plan ✅ **COMPLETADO**
- **Última Auditoría**: 22 de Abril 2026.

---

## 📐 ARQUITECTURA DE TIERS (DECISIONES CLAVE)

> Cada instalación de PatagoniaPOS es **independiente**. El `/admin/developer` de `tienda1.cl` solo configura `tienda1.cl`.

| Plan | Funciones incluidas |
|------|---------------------|
| **🔵 Básico** | POS offline, gestión de inventario, turnos de caja, CRM básico |
| **⚡ Plus** | Todo Básico + Ecommerce activo, pedidos online, catálogo público, branding propio |
| **👑 Élite** | Todo Plus + Picking Fees, logística avanzada, múltiples sucursales, API externa, IA |

---

## 🔐 ARQUITECTURA DE ROLES (DECISIONES CLAVE)

### Roles disponibles en tabla `profiles` (Supabase):
| Rol DB | Descripción | Acceso Admin | Acceso POS |
|--------|-------------|--------------|------------|
| `developer` | Acceso total | ✅ Todo | ✅ |
| `admin` | Administrador de tienda | ✅ Todo | ✅ |
| `manager` | Encargado de turno | ✅ Dashboard + Inventario + CRM | ✅ |
| `cajero` | Cajero / colaborador | ❌ | ✅ |
| `customer` | Cliente final | ❌ | ❌ |

### Matriz de permisos Admin (Plan Básico):
| Sección | developer | admin | manager | cajero |
|---------|-----------|-------|---------|--------|
| Dashboard | ✅ | ✅ | ✅ | ❌ |
| Inventario (Productos) | ✅ | ✅ | ✅ | ❌ |
| Clientes (CRM) | ✅ | ✅ | ✅ | ❌ |
| Personal | ✅ | ✅ | ❌ | ❌ |
| Configuración | ✅ | ✅ | ❌ | ❌ |
| Developer Mode (2FA) | ✅ | ❌ | ❌ | ❌ |
| Pedidos Online | 🔒 Plan Plus | 🔒 | 🔒 | ❌ |
| Ir al POS | ✅ | ✅ | ✅ | ✅ |

### Capa 2 — Plan SaaS (¿Qué tiene contratado?):
| Ruta | Básico | Plus | Élite |
|------|--------|------|-------|
| `/pos` | ✅ | ✅ | ✅ |
| `/admin/*` | ✅ | ✅ | ✅ |
| `/admin/pedidos` | ❌ → Upgrade | ✅ | ✅ |
| `/` ecommerce público | ❌ → Página Upgrade | ✅ | ✅ |
| API externa | ❌ | ❌ | ✅ |

---

## 📋 Resumen de Misiones

| Misión | Estado Actual | Prioridad |
| :--- | :--- | :--- |
| **Autenticación Real (Supabase Auth)** | ✅ COMPLETADO | 🟢 LISTO |
| **RBAC Admin Sidebar por Rol + Plan** | ✅ COMPLETADO | 🟢 LISTO |
| **proxy.ts (Middleware de Rutas)** | ✅ COMPLETADO | 🟢 LISTO |
| **SaaS & Master Key (2FA)** | ✅ COMPLETADO | 🟢 LISTO |
| **Tiers + Branding Corregido** | ✅ COMPLETADO | 🟢 LISTO |
| **Testeo Manual de Seguridad** | 🟡 EN PROGRESO | 🔴 MÁXIMA |
| **SII Integration (DTE)** | Mock / API Placeholder | 🔴 CRÍTICA |
| **Logística (Retiros/Envíos)** | Checkout Actualizado | 🟠 ALTA |
| **Gestión de Pedidos (Admin)** | Dashboard Creado | 🟠 ALTA |
| **App Móvil / Tablet (PWA)** | Configuración Base | 🟡 MEDIA |
| **🌐 Panel Central Multi-Tenant** | 💡 VISIÓN FUTURA | 🔵 LONG-TERM |

---

## 10. 🔐 Misión: Autenticación Real + RBAC ✅ COMPLETADA (22 Abril 2026)

### Problemas resueltos:
- El `login()` era un mock hardcodeado → ahora usa `supabase.auth.signInWithPassword()` real.
- La sesión se guardaba en `localStorage` → el proxy del servidor no podía leerla.
- El cliente de Supabase en el browser no creaba cookies → reemplazado por `createBrowserClient` de `@supabase/ssr`.
- Los roles `developer` y `manager` no estaban en la lista blanca del proxy.
- Al cambiar de cuenta sin logout, Zustand hidrataba los datos de la sesión anterior.

### Archivos modificados:
```
src/lib/supabase.ts              → createBrowserClient para manejo automático de cookies
src/stores/authStore.ts          → login() usa Supabase real + limpia sesión anterior
src/stores/authStore.ts          → logout() cierra sesión Supabase + borra localStorage
src/proxy.ts                     → getUser() en lugar de getSession() + roles + restricciones manager
src/components/auth/SessionSync.tsx  → (NUEVO) sincroniza cookies en cada cambio de auth state
src/components/admin/AdminSidebar.tsx → RBAC: sidebar filtra por rol y plan
src/app/(auth)/login/page.tsx    → sincroniza perfil real de DB al hacer login con Google/OAuth
src/types/index.ts               → rol 'cajero' añadido al tipo User
```

### Comportamiento actual del proxy (`src/proxy.ts`):
```
/pos              → requiere sesión + rol (admin | developer | manager | cajero)
/admin/*          → requiere sesión + rol (admin | developer | manager)
/admin/personal   → solo developer | admin (el manager es redirigido a /admin)
/admin/configuracion → solo developer | admin
/admin/developer  → solo developer | admin (+ 2FA Master Key)
/admin/pedidos    → bloqueado si plan = básico → redirect /admin?error=upgrade_required
/carrito          → requiere sesión
/checkout         → requiere sesión
/perfil           → requiere sesión
/mis-turnos       → requiere sesión
/                 → si plan Básico → redirect /upgrade
```

---

## 8. 🛡️ Misión: Arquitectura SaaS & Master Key ✅ COMPLETADA
- [x] Master Key TOTP: 2FA con Authy + contraseña maestra encriptada AES-256.
- [x] Developer Panel Cyberpunk: `/admin/developer` con LockScreen + panel de gestión.
- [x] SaaSProvider: Contexto global que controla features por plan en toda la app.
- [x] Build exitoso: Proyecto compila sin errores en Next.js 16.
- [x] Tiers corregidos: Branding en Plus, Elite con valor real.
- [x] Footer dual: Básico muestra PatagoniaPOS + upgrade CTAs. Plus/Elite muestra negocio.
- [x] Header dinámico: Básico = PatagoniaPOS, Plus/Elite = marca del negocio.

---

## 9. 🌐 VISIÓN FUTURA: Panel Central Multi-Tenant
*Requiere hosting propio. No comenzar hasta tener el primer cliente en producción.*

**Flujo propuesto**:
```
admin.patagoniapos.cl
  └── Lista de negocios instalados
        ├── tienda1.cl → [Ir al Developer Panel]
        ├── supermercado2.cl → [Ir al Developer Panel]
        └── ferreteria3.cl → [Ir al Developer Panel]
```

---

## 1. 🧾 Misión: Facturación Electrónica (SII Chile)
- **Pendiente**: Integración real con Facturador DTE. Generación de Boleta al confirmar pago.

## 2. 🚚 Misión: Logística 360 (Retiro y Despacho)
- **Estado**: DB preparada y Checkout funcional con Picking Fee.
- **Pendiente**: Webhooks para cambio de estado y rastreo.

## 3. 📦 Misión: Panel de Control de Pedidos (Master Admin)
- **Estado**: Creado `/admin/pedidos`.
- **Pendiente**: Filtros avanzados y vista de picking por pasillos.

## 7. 📱 Misión: Despliegue y UX Móvil (PWA + Rediseño Premium)
- **Nota**: Se movió al final de la hoja de ruta por estabilidad. Incluirá el rediseño con **Stitch**.

---

## 11. 🎨 Arquitectura de Themes & Paletas SaaS Dinámicas (Implementado 22 Abril 2026)

Se ha establecido la base arquitectónica para que la interfaz se adapte **automáticamente** a la paleta de colores (Modo Claro / Oscuro) de cada inquilino SaaS mediante el motor de Tailwind v4 y variables HSL semánticas en `globals.css`.

### Reglas de Contraste Exactas (PatagoniaPOS / Índigo):
Esta es la estructura base que se usará para derivar paletas dinámicas:

**Modo Claro:**
- **Fondo principal (`--background`)**: Tono 50 (Ej: `--color-indigo-50` `#f4e5ff`) o Blanco.
- **Texto principal (`--foreground`)**: Tono 900 (Ej: `#1e0033`).
- **Botones primarios (`--primary`)**: Tono 500 (Ej: `#9500ff`) con texto blanco.
- **Hover/activo (`--ring` / hover)**: Tono 600 (Ej: `#7700cc`).
- **Bordes y separadores (`--border`)**: Tono 100 (Ej: `#eaccff`).
- **Íconos/acento (`--accent`)**: Tono 300 (Ej: `#bf66ff`).

**Modo Oscuro:**
- **Fondo principal (`--background`)**: Tono 950 o 900 (Ej: `#150024`).
- **Texto principal (`--foreground`)**: Tono 50 (Ej: `#f4e5ff`).
- **Botones primarios (`--primary`)**: Tono 400 o 500 (Ej: `#aa33ff`) con texto blanco.
- **Hover/activo (`--ring` / hover)**: Tono 300 (Ej: `#bf66ff`).
- **Bordes y separadores (`--border`)**: Tono 700 (Ej: `#590099`).
- **Íconos/acento (`--accent`)**: Tono 200 (Ej: `#d499ff`).

**Implementación Futura (SaaS Color Picker):**
Cuando el dueño (en un plan superior) elija su color, un script en `src/lib/color-generator.ts` tomará el HEX principal y usará una librería como `color-mix` o `d3-color` para generar la escala 50-950, transformarla en HSL y sobreescribir las variables CSS globales (`--primary`, `--background`, etc.) en el `<html style="...">` dinámicamente en el servidor de Next.js antes de pintar la UI.

---

## 🚀 Siguiente Paso Recomendado
Avanzar con la integración real del SII (Facturación DTE) que es la misión más crítica para producción.

---

## ✅ CHECKLIST DE TESTEO PENDIENTE — Roles y Permisos
*Pendiente de revisión manual. No eliminar hasta completar todas las casillas.*

### 🔐 Capa 1: Autenticación
- [ ] Login con `rodrigoa.nunez1@gmail.com` (developer) → badge "Desarrollador"
- [ ] Login con `al3alts@gmail.com` (manager) → badge "Encargado de Turno"
- [ ] Cerrar sesión → limpia sesión y localStorage correctamente
- [ ] Sin sesión: ir a `/pos` → redirige a `/login`
- [ ] Sin sesión: ir a `/admin` → redirige a `/login`
- [ ] Sin sesión: ir a `/perfil` → redirige a `/login`
- [ ] Sin sesión: ir a `/carrito` → redirige a `/login`

### 🔑 Capa 2: Roles (con sesión activa)
**Con cuenta developer (`rodrigoa.nunez1@gmail.com`):**
- [ ] Ir a `/pos` → entra directo ✅
- [ ] Ir a `/admin` → entra al dashboard
- [ ] Sidebar muestra: Dashboard, Inventario, Clientes, Personal, Configuración, Developer Mode
- [ ] Clic en "Developer Mode" → pide 2FA

**Con cuenta manager (`al3alts@gmail.com`):**
- [ ] Ir a `/admin` → entra al dashboard
- [ ] Sidebar muestra SOLO: Dashboard, Inventario, Clientes (CRM), Ir al POS
- [ ] Sidebar NO muestra: Personal, Configuración, Developer Mode
- [ ] Sidebar muestra "Pedidos Online" en gris con badge "Plus"
- [ ] Ir a `/admin/personal` por URL → redirigido a `/admin`
- [ ] Ir a `/admin/configuracion` por URL → redirigido a `/admin`

### 🏢 Capa 3: Plan SaaS (Plan Básico)
- [ ] Ir a `localhost:3000/` → redirige a `/upgrade`
- [ ] Botón "Ir al POS" en página de upgrade → funciona
- [ ] Ir a `/admin/pedidos` → redirige a `/admin?error=upgrade_required`
