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
- **Multi-tenancy** por subdominio con aislamiento completo
- Panel admin con métricas, pedidos, clientes, sucursales, personal
- Gestión de cajas con apertura/cierre y control de sesiones
- **RBAC** (Roles: owner, admin, employee, developer)
- **SaaS Tiers** con gating de funcionalidades por plan

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
| Frontend | Next.js 14 (App Router), React, TypeScript |
| Estilos | Tailwind CSS |
| Base de Datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth + RBAC |
| Realtime | Supabase Realtime (Broadcast + Presence) |
| DTE / SII | Node-Forge, XML-Crypto |
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
| [PROJECT_BOARD.md](./PROJECT_BOARD.md) | Tablero Kanban con backlog, progreso y bugs |
| [YAHPOS Kanban.md](./YAHPOS%20Kanban.md) | Tablero Kanban nativo para Obsidian |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Arquitectura del sistema multi-tenancy |
| [WALKTHROUGH.md](./WALKTHROUGH.md) | Walkthrough técnico de infraestructura |
| [COLLABORATION_PROTOCOL.md](./COLLABORATION_PROTOCOL.md) | Protocolo de colaboración OpenCode + Antigravity |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | Plan de implementación detallado |
| [manual_instalacion.md](./manual_instalacion.md) | Manual de onboarding para clientes |
| [REVISION_DISENO.md](./REVISION_DISENO.md) | Auditoría de diseño UI/UX |

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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_SITE_URL=
```

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
