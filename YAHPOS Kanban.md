---

kanban-plugin: board

---

## 📋 BACKLOG

- [ ] **[Bug]** Cashier Name no se muestra en Customer Display (INVESTIGAR MÁS — fix de metadataRef puede no ser suficiente)
- [ ] **[Admin]** Rediseño Cierre Forzado
- [ ] **[Admin]** Carga Certificado .pfx
- [x] **[Admin]** Branding Config
- [x] **[Stab]** API try/catch (14 rutas)
- [x] **[Stab]** Auth Checks en rutas
- [ ] **[Design]** Refactor PaymentModal
- [x] **[Design]** UI Settings
- [ ] **[Bug]** Auth SSO redirige a tienda incorrecta (callback usa .limit(1) ignora from_origin)
- [ ] **[Bug]** "Auth session missing!" en cada request (cookies Supabase no propagan entre subdominios)
- [ ] **[Stab]** Invalid Refresh Token: Already Used (race condition Strict Mode)
- [ ] **[Mkt]** Resends — Sistema de reenvío de publicidad/marketing a clientes (usar Inngest)
- [ ] **[Infra]** Inngest — Setup inicial (client, serve route, dev server)
- [ ] **[Infra]** Migrar SII sync a Inngest (re-intentos automáticos)
- [ ] **[Infra]** Programar reportes diarios con Inngest cron


## 🏗️ EN PROGRESO

- [x] **[Stab]** Memory Leaks (verificar)


## 🧐 REVISIÓN

- [ ] **[POS]** Gestión Sesiones Caja


## ✅ TERMINADO

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

- [ ] Pasar pruebas SII


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
{"kanban-plugin":"board","list-collapse":[false,false,false,false,true,true,true,true,true,true,true,true]}
```
%%