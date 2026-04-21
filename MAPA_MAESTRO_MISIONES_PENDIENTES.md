# 🗺️ MAPA MAESTRO DE MISIONES PENDIENTES - PATAGONIAPOS

Este documento consolida todas las características y misiones que hemos "guardado para después" o que están en estado de prototipo/mock. Es la hoja de ruta definitiva para llevar a PatagoniaPOS de un MVP estable a una plataforma comercial completa.

## 🏁 ESTADO DEL PROYECTO (Abril 2026)
- **Fase Actual**: Control de Acceso por Rutas + Middleware ✅ **COMPLETADO**
- **Última Auditoría**: 21 de Abril 2026.

---

## 📐 ARQUITECTURA DE TIERS (DECISIONES CLAVE)

> Cada instalación de PatagoniaPOS es **independiente**. El `/admin/developer` de `tienda1.cl` solo configura `tienda1.cl`.

| Plan | Funciones incluidas |
|------|---------------------|
| **🔵 Básico** | POS offline, gestión de inventario, turnos de caja, CRM básico |
| **⚡ Plus** | Todo Básico + Ecommerce activo, pedidos online, catálogo público, branding propio |
| **👑 Élite** | Todo Plus + Picking Fees, logística avanzada, múltiples sucursales, API externa, IA |

---

## 🔐 ARQUITECTURA DE CONTROL DE ACCESO (DECISIONES CLAVE)

### Capa 1 — Autenticación (¿Quién eres?)
| Estado | Acceso |
|--------|--------|
| Sin sesión | Solo páginas públicas (ver productos, inicio, contacto) |
| Sin sesión + intenta comprar | → Redirect `/login?redirect=/checkout` con mensaje |
| Cliente logueado | Comprar, perfil, mis pedidos |
| Cajero | POS, sus turnos |
| Admin | Todo panel admin + POS |

### Capa 2 — Plan SaaS (¿Qué tiene contratado?)
| Ruta | Básico | Plus | Élite |
|------|--------|------|-------|
| `/pos` | ✅ | ✅ | ✅ |
| `/admin/*` | ✅ | ✅ | ✅ |
| `/admin/pedidos` | ❌ → Upgrade | ✅ | ✅ |
| `/` ecommerce público | ❌ → Página Upgrade | ✅ | ✅ |
| API externa | ❌ | ❌ | ✅ |

### Comportamiento Plan Básico en URL raíz:
> Si alguien entra a `tienda1.cl` y el plan es Básico, en vez del ecommerce ve una pantalla que dice:
> **"¿Quieres tu tienda online? Activa el Plan Plus"** + botón **"Ir al POS"**

---

## 📋 Resumen de Misiones Críticas

> 🚨 **PRIORIDAD MÁXIMA AL DESPERTAR:** El CEO (Rdorigo Nuñez) debe ingresar y testear manualmente la Capa 1 y Capa 2 de Seguridad construidas esta sesión (Developer Panel -> Cambio de Plan -> Verificación de URLs prohibidas). 

| Misión | Estado Actual | Prioridad | Riesgo |
| :--- | :--- | :--- | :--- |
| **0. Testeo Manual de Seguridad (Capa 1 y 2)**| 🛑 PENDIENTE REVISIÓN | 🔴 MÁXIMA | - |
| **SaaS & Master Key (2FA)** | ✅ COMPLETADO | 🟢 LISTO | - |
| **Tiers + Branding Corregido** | ✅ COMPLETADO | 🟢 LISTO | - |
| **Control de Acceso (Middleware)** | ✅ COMPLETADO | 🟢 LISTO | Medio |
| **SII Integration (DTE)** | Mock / API Placeholder | 🔴 CRÍTICA | Medio |
| **Logística (Retiros/Envíos)** | Checkout Actualizado | 🟠 ALTA | Bajo |
| **Gestión de Pedidos (Admin)** | Dashboard Creado | 🟠 ALTA | Bajo |
| **App Móvil / Tablet (PWA)** | Configuración Base | 🟡 MEDIA | Bajo |
| **🌐 Panel Central Multi-Tenant** | 💡 VISIÓN FUTURA | 🔵 LONG-TERM | Alto |

---

## 10. 🔐 Misión: Control de Acceso por Rutas (Nueva — En Desarrollo)
*Nadie debería poder acceder a rutas restringidas adivinando la URL.*

### Implementación técnica:
- **`middleware.ts`** en la raíz del proyecto — intercepta TODAS las peticiones antes de renderizar.
- Verifica sesión de Supabase en el edge.
- Redirige según rol y plan.

### Rutas y sus guardas:
```
/pos              → requiere sesión + rol (admin | cajero)
/admin/*          → requiere sesión + rol admin
/admin/developer  → ya protegido por 2FA + Master Key
/admin/pedidos    → requiere plan Plus o Elite
/carrito          → requiere sesión (redirect /login si no)
/checkout         → requiere sesión
/perfil           → requiere sesión
/mis-turnos       → requiere sesión + rol cajero o admin
/                 → si plan Básico → página de upgrade (no ecommerce)
```

### Tareas:
- [x] LockScreen Developer Panel (ya implementado)
- [x] Crear `middleware.ts` para proteger rutas de admin y POS
- [x] Crear componente `<UpgradePage />` para Plan Básico en ecommerce
- [x] Proteger `/carrito` y `/checkout` con redirect a login
- [x] Validar acceso a `/admin/pedidos` por plan en middleware

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

## 🚀 Siguiente Paso Inmediato
Realizar testeo manual de la Capa 1 y 2 de Seguridad desde el Panel Developer (cambiar plan a Básico y verificar que el home redirige a /upgrade).
