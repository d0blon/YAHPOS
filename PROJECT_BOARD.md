---

## 📋 BACKLOG

- [ ] **[SII]** Modelo de Emisión SII — Selector Modelo 1/2 + recibo "COMPROBANTE DE PAGO"
- [ ] **[Admin]** Rediseño Cierre Forzado (UX Premium)
- [ ] **[Admin]** Carga de Certificado .pfx
- [ ] **[Admin]** Branding Config
- [ ] **[Stab]** Envolver 14 API routes en try/catch
- [ ] **[Stab]** Auth Checks en rutas API sensibles
- [ ] **[Design]** Refactor PaymentModal (409 líneas)
- [ ] **[Design]** UI Settings (estilo)

## 🏗️ EN PROGRESO

- [ ] **[Bug]** Pluxe aparece en REGIONES — debe ser RM (`PaymentModal.tsx:149`)
- [ ] **[Stab]** Memory Leaks — verificar 4 cleanups implementados

## 🧐 REVISIÓN

- [ ] **[POS]** Gestión de Sesiones de Caja (Terminal Locking)
- [ ] **[Stab]** Memory Leaks Fix

## ✅ TERMINADO

- [x] **[POS]** Edenred + Pluxe + Junaeb separados con región
- [x] **[POS]** Selector de región (RM / REGIONES) en Ajustes
- [x] **[Brand]** YAHPOS! solo imágenes (sin texto PatagoniaPOS)
- [x] **[UI]** PosSidebar dark mode
- [x] **[UI]** Theme toggle en POS
- [x] **[API]** Order API — UUID → IDs numéricos
- [x] **[API]** Products lookup — fix variable p.
- [x] **[API]** Idempotencia offlineId (evita duplicados)
- [x] **[DB]** RLS policy payments
- [x] **[DB]** Duplicados de dashboard eliminados
- [x] **[Stab]** ProductModal useState condicional corregido
- [x] **[Stab]** SqlModal extraído a componente separado
- [x] **[Auth]** Autenticación Supabase
- [x] **[Auth]** RBAC por Roles
- [x] **[SaaS]** SaaSProvider Context
- [x] **[DTE]** Motor de firma XML
- [x] **[DTE]** Lector de folios CAF
- [x] **[SaaS]** Panel Developer (2FA)
- [x] **[SaaS]** Bloqueo rutas raíz
- [x] **[DB]** RPC Domain Agnostic
- [x] **[SaaS]** Normalización Slugs

---

## 🔬 DETALLE DE MISIONES

### 🛡️ Seguridad Multi-tenant
- [x] Redirigir `localhost:3000/pos` a landing
- [x] Normalizar host a minúsculas
- [x] RPC `get_store_by_domain` agnóstica
- [x] Bloqueo acceso no autenticado a `/pos`

### 🧾 Facturación Electrónica SII
- [ ] Pasar set de pruebas del SII

### 📦 Killer Features
- [x] Autocompletado de productos vía SKU
- [x] Validación sellos nutricionales Junaeb
- [x] Monitor Stock en Tiempo Real

### 🖥️ Gestión de Sesiones de Caja
- [x] Liberación de terminales al abrir sesión
- [x] Supresión de perfiles stale en terminales
- [x] Cierre de sesión real en DB desde Header
- [x] Script limpieza datos stale

### 🚀 Rediseño Cierre Forzado Admin
- [ ] Endpoint `/api/admin/cash-sessions/[id]/sales`
- [ ] Rediseño ForceClosureModal
- [ ] Sincronización Realtime + notificaciones

### 🛠️ Estabilidad y Deuda Técnica
- [x] Memory Leaks (4 cleanups)
- [x] SqlModal extraído
- [x] ProductModal useState fix
- [ ] 14 API routes try/catch
- [ ] Auth checks en rutas sensibles
- [ ] Refactor PaymentModal

### 💳 Métodos de Pago Voucher
- [x] Edenred como método separado
- [x] Toggles independientes Junaeb/Pluxe/Edenred
- [x] Selector de región
- [x] **⚠️ BUG:** Pluxe en REGIONES — debe ser RM

### 📄 Modelo de Emisión SII
- [ ] Selector Modelo 1 / Modelo 2
- [ ] Reemplazar toggle getnetIsBoleta
- [ ] Recibo "COMPROBANTE DE PAGO" al saltar SII

---

*Última actualización: 12 Mayo 2026*
