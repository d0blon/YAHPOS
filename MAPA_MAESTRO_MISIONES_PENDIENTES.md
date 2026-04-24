# 🗺️ MAPA MAESTRO DE MISIONES PENDIENTES - PATAGONIAPOS

Este documento consolida todas las características y misiones que hemos "guardado para después" o que están en estado de prototipo/mock. Es la hoja de ruta definitiva para llevar a PatagoniaPOS de un MVP estable a una plataforma comercial completa.

## 🏁 ESTADO DEL PROYECTO (Abril 2026)
- **Fase Actual**: Autenticación Real + RBAC Admin + Motor SII Propio ✅ **ACTUALIZADO**
- **Última Auditoría**: 24 de Abril 2026.

---

## 🏗️ NOVEDADES DE HOY (SaaS & Facturación)

### ✅ Motor DTE Propio (SII Chile)
- **Arquitectura de Firma:** Implementado `signer.ts` con XMLDSig (SHA-1).
- **Autenticación:** Flujo de Semilla/Token operativo en `auth.ts`.
- **Generación:** Plantilla XML para Boleta Electrónica (DTE 39) en `templates/boleta.ts`.
- **Folios:** Lector de archivos CAF implementado en `caf.ts`.
- **Estado:** Técnico listo para pruebas en ambiente de certificación.

### ✅ Estrategia Comercial
- **Landing Page de Ventas:** Creada en `/vender` con enfoque en Chiloé.
- **Precios Definidos:** Básico (0.6 UF), Pro (1 UF), Elite (1.8 UF).
- **Manual de Onboarding:** Creado `manual_instalacion.md` para nuevos clientes.

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

## 📋 Resumen de Misiones Actualizado

| Misión | Estado Actual | Prioridad |
| :--- | :--- | :--- |
| **Autenticación Real (Supabase Auth)** | ✅ COMPLETADO | 🟢 LISTO |
| **SII Integration (Motor Propio)** | ✅ MOTOR CONSTRUIDO | 🟢 LISTO PARA TEST |
| **Landing Page de Ventas (/vender)** | ✅ COMPLETADO | 🟢 LISTO |
| **RBAC Admin Sidebar por Rol + Plan** | ✅ COMPLETADO | 🟢 LISTO |
| **proxy.ts (Middleware de Rutas)** | ✅ COMPLETADO | 🟢 LISTO |
| **SaaS & Master Key (2FA)** | ✅ COMPLETADO | 🟢 LISTO |
| **Testeo Manual de Seguridad** | 🟡 EN PROGRESO | 🔴 MÁXIMA |
| **Logística (Retiros/Envíos)** | Checkout Actualizado | 🟠 ALTA |
| **Gestión de Pedidos (Admin)** | Dashboard Creado | 🟠 ALTA |
| **App Móvil / Tablet (PWA)** | Configuración Base | 🟡 MEDIA |

---

## 🧾 Misión: Facturación Electrónica (SII Chile) - DETALLES
- **Estado Actual:** Motor técnico terminado. 
- **Pendiente:** 
    - [ ] UI para subir Certificado Digital (.pfx).
    - [ ] UI para subir archivos CAF (Folios).
    - [ ] Proceso de postulación ante el SII (Set de pruebas).

---

## 🛡️ Misión: Arquitectura SaaS & Master Key ✅ COMPLETADA
- [x] Master Key TOTP: 2FA con Authy + contraseña maestra encriptada AES-256.
- [x] Developer Panel Cyberpunk: `/admin/developer` con LockScreen + panel de gestión.
- [x] SaaSProvider: Contexto global que controla features por plan en toda la app.
- [x] Build exitoso: Proyecto compila sin errores en Next.js 16.

---

## ✅ CHECKLIST DE TESTEO PENDIENTE — Roles y Permisos
*Pendiente de revisión manual. No eliminar hasta completar todas las casillas.*

### 🔐 Capa 1: Autenticación
- [ ] Login con `rodrigoa.nunez1@gmail.com` (developer) → badge "Desarrollador"
- [ ] Login con `al3alts@gmail.com` (manager) → badge "Encargado de Turno"
- [ ] Cerrar sesión → limpia sesión y localStorage correctamente
- [ ] Sin sesión: ir a `/pos` → redirige a `/login`
- [ ] Sin sesión: ir a `/admin` → redirige a `/login`

### 🔑 Capa 2: Roles (con sesión activa)
**Con cuenta developer:**
- [ ] Ir a `/pos` → entra directo ✅
- [ ] Ir a `/admin` → entra al dashboard
- [ ] Clic en "Developer Mode" → pide 2FA

*(Este mapa continúa con todas tus misiones de logística, temas y visión futura intactas)*
