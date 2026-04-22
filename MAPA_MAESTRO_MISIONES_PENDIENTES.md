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

## 🚀 Siguiente Paso Recomendado
Completar el testeo manual de la matriz de roles y permisos, luego avanzar con la integración real del SII (Facturación DTE) que es la misión más crítica para producción.
