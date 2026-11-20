# YAHPOS! — Ecosistema de Comercio Inteligente

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="/logos/yahpos_logo_master_dark.svg">
    <img src="/logos/yahpos_logo_master.svg" alt="YAHPOS!" width="320">
  </picture>
</p>

**YAHPOS!** es una plataforma SaaS todo-en-uno que combina Punto de Venta (POS) ultrarrápido, E-commerce integrado, motor de facturación electrónica SII propio, y medios de pago voucher (Edenred, Pluxe, Junaeb) — diseñada para modernizar el comercio en Chile.

---

## Funcionalidades Clave

### POS Inteligente
- **Venta offline-first** con sincronización automática al recuperar conexión
- **Múltiples métodos de pago**: Efectivo, Transferencia, Webpay, Edenred, Pluxe, Junaeb
- **Idempotencia** por `offlineId` — evita duplicados incluso en cortes de red
- **Selector de región** (RM / Regiones) para cobertura real de voucher

### Facturación Electrónica SII (DTE)
- Motor propio de generación de Documentos Tributarios Electrónicos
- Firma XML con certificado .pfx vía Node-Forge
- Lector de folios CAF
- Templates: Boleta, Factura, Nota de Crédito, Nota de Débito, Guía de Despacho
- Soporte multi-nivel: Básico (boletas), Plus (+factura/NC/ND), Elite (+guías)

### E-commerce Integrado
- Tienda online con catálogo, carrito y checkout
- **Modo Editor** — edición visual inline del contenido
- Diseño glassmorphism premium
- SEO optimizado con meta tags dinámicas

### Administración Multi-tienda
- **Multi-tenancy** por subdominio con aislamiento completo (RLS a nivel de base de datos)
- Panel admin con métricas, pedidos, clientes, sucursales, personal
- Gestión de cajas con apertura/cierre y control de sesiones
- **RBAC** (Roles: developer, owner, admin, manager, cashier, warehouse, customer)
- **SaaS Tiers** (Starter / Pro / Platinum) con gating de funcionalidades por plan

### Gestión de Stock
- Monitor de stock en tiempo real (Realtime + Supabase)
- Panel rápido de stock desde el POS
- Badge de stock bajo con actualización en vivo

### Voucher
- **Edenred**: Regiones
- **Pluxe**: Región Metropolitana
- **Junaeb**: Válido en sucursales habilitadas
- Toggles independientes por método + selector de región

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router, webpack), React, TypeScript (strict) |
| Estilos | Tailwind CSS v4 (theme en `globals.css`, no en `tailwind.config.ts`) |
| Base de Datos | Supabase (PostgreSQL) con Row-Level Security |
| Autenticación | Supabase Auth (SSR) + RBAC |
| Realtime | Supabase Realtime (Broadcast + Presence) |
| DTE / SII | Motor propio (Node-Forge, XML-Crypto, CAF, .pfx) |
| IA | Gemini 1.5 Flash (lectura de facturas de proveedor) |
| Automatización | n8n (self-hosted) |
| Testing | Jest, Playwright |
| Infraestructura | Vercel + Supabase |

---

## Arquitectura

```
                    ┌─────────────┐
                    │  Middleware  │ (multi-tenancy por subdominio)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   POS    │ │  Admin   │ │   Shop   │
        │ (offline)│ │ (RBAC)   │ │ (editor) │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                  ┌──────────────┐
                  │  Supabase    │
                  │ (DB + Auth)  │
                  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │  SII / DTE   │
                  │  Engine      │
                  └──────────────┘
```

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
**Índice completo de documentación: [`docs/README.md`](./docs/README.md).**

En la raíz quedan solo los archivos vivos del protocolo:

| Documento | Descripción |
|-----------|-------------|
| [CLAUDE.md](./CLAUDE.md) | Contexto del proyecto para agentes IA — leer primero |
| [AGENTS.md](./AGENTS.md) | Protocolo de trabajo entre agentes |
| [YAHPOS Kanban.md](./YAHPOS%20Kanban.md) | Backlog y estado actual — fuente de verdad del progreso |
| [TASK_HANDOFF.md](./TASK_HANDOFF.md) | Tarea activa (protocolo Arquitecto/Constructor) |
| [BITACORA.md](./BITACORA.md) | Historial completo de cambios |

Todo lo demás (guías, arquitectura, planes, auditorías, operación, archivo) vive en [`docs/`](./docs):

| Carpeta | Qué hay |
|---------|---------|
| [`docs/guias/`](./docs/guias) | Los 5 documentos para leer el proyecto desde cero |
| [`docs/arquitectura/`](./docs/arquitectura) | Cómo está construido y por qué está cableado así |
| [`docs/planes/`](./docs/planes) | Hojas de ruta y planes de ejecución |
| [`docs/auditorias/`](./docs/auditorias) | Auditorías técnicas, de diseño y simulaciones |
| [`docs/operacion/`](./docs/operacion) | Manuales, walkthroughs, protocolos de colaboración |
| [`docs/archivo/`](./docs/archivo) | Documentos obsoletos o superados, conservados por historial |

---

## Inicio Rápido (Desarrollo)

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno Requeridas

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# IA (lectura de facturas)
GEMINI_API_KEY=

# Seguridad
SECURITY_SALT=

# Pagos
FLOW_API_KEY=
FLOW_SECRET=

# SII
SII_API_URL=
SII_ENVIRONMENT=
```

Ver [CLAUDE.md](./CLAUDE.md) para la lista completa y actualizada.

---

## Commit Convention

```
feat:     Nueva funcionalidad
fix:      Corrección de bug
refactor: Refactorización de código
docs:     Documentación
style:    Cambios de estilo (CSS, formato)
perf:     Mejora de rendimiento
test:     Tests
chore:    Tareas de mantenimiento
```

---

## Licencia

Uso interno — YAHPOS! SpA

---

*Desarrollado con ❤️ en la Patagonia Chilena.*
