---
status: completed
goal: "Fase 0 (Fix IVA Duplication) + Fase 1 (Customer Display + Webpay QR) + Fix Cashier Name Persistence"
branch: "main"
created: 2026-05-14
updated: 2026-05-14 (18:00)
requires-plan: true
---

## Descomposición

### Subtarea 0.0: Constante TERMINALS_WITH_DTE + tipos
- **Tipo:** independiente
- **Archivos:** `src/lib/hardware/types.ts` (modificar)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** Agregar constante `TERMINALS_WITH_DTE: Record<string, boolean>` que mapea terminal names a si emiten o no su propio DTE. Valores: TUU=true, Getnet=true, 'SumUp Solo'=true. También agregar `GATEWAY_METHODS` y `VOUCHER_METHODS` arrays constantes.

### Subtarea 0.1: Corregir lógica shouldSkipSii en handleCheckout
- **Tipo:** secuencial (depende de: 0.0)
- **Archivos:** `src/app/(pos)/pos/page.tsx` (modificar líneas 636-660)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** Reemplazar la lógica plana `isDigitalPayment` por la lógica clasificada: `terminalHandlesDte`, `isGateway`, `isVoucher`. Wirear `getnetIsBoleta` field existente. Agregar validación de seguridad `validateSiiEmission()` que bloquee el pago si un terminal con DTE no tiene skip activado.

### Subtarea 0.2: UI Configuración por terminal en PosSettingsModal
- **Tipo:** independiente
- **Archivos:** `src/components/pos/PosSettingsModal.tsx` (modificar)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** En sección "Terminales" de settings, agregar toggle individual "Este terminal emite su propia boleta" para cada terminal conectado. Actualizar el store con estos flags.

### Subtarea 1.0: Hook useCustomerDisplaySync
- **Tipo:** independiente
- **Archivos:** `src/lib/hooks/useCustomerDisplaySync.ts` (nuevo)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** Crear hook con BroadcastChannel API. `useCustomerDisplayBroadcast(posStore)` para POS que emite cambios de carrito. `useCustomerDisplayReceiver()` para Customer Display que recibe. Tipos compartidos `CustomerDisplayData`. El broadcast debe emitir: items, subtotal, total, discount, paymentMethod, qrData.

### Subtarea 1.1: Customer Display Page
- **Tipo:** secuencial (depende de: 1.0)
- **Archivos:** `src/app/(pos)/pos/customer-display/page.tsx` (nuevo)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** Página fullscreen 'use client' que escucha BroadcastChannel y muestra: items escaneados (nombre + cantidad + precio), subtotal, descuentos, total. Cuando hay un QR activo (Webpay/MP), lo muestra grande y centrado. Cuando el pago se confirma, muestra ✅ "Pago exitoso". Diseño limpio, orientado al cliente.

### Subtarea 1.2: Integrar broadcast en POS page
- **Tipo:** secuencial (depende de: 1.0)
- **Archivos:** `src/app/(pos)/pos/page.tsx` (modificar)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** En la page del POS, agregar `useCustomerDisplayBroadcast()` que emita cada cambio de carrito. Cuando se genere un QR de pago (Webpay/MP), broadcast con `qrData`. Cuando se confirme el pago, broadcast con `type: 'payment-confirmed'`.

### Subtarea 1.3: Webpay QR en POS — API de status/polling
- **Tipo:** independiente
- **Archivos:** `src/app/api/payments/webpay/status/route.ts` (nuevo)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** API route GET que recibe `token` y llama a `tx.commit()` de Transbank. Retorna `AUTHORIZED`, `REJECTED`, o `PENDING`. Maneja error de token ya commiteado (busca en DB). Es la que usará el POS para polling cada 2s.

### Subtarea 1.4: Webpay QR en PaymentModal
- **Tipo:** secuencial (depende de: 1.3)
- **Archivos:** `src/components/pos/PaymentModal.tsx` (modificar)
- **DoD:** build pasa, lint pasa
- **Subagente:** general
- **Descripción:** Agregar método de pago "Webpay QR" en PaymentModal. Al seleccionarlo: llama a `/api/payments/webpay/create`, recibe url+token, genera QR code en pantalla. Inicia polling a status route cada 2s. Cuando status=AUTHORIZED → cierra venta automáticamente. Muestra QR también en Customer Display via broadcast.

### Subtarea 5.0: Fix Cashier Name Persistence — metadataRef en hook
- **Tipo:** independiente (post-Fase 1)
- **Archivos:** `src/lib/hooks/useCustomerDisplaySync.ts` (modificar), `src/app/(pos)/pos/customer-display/page.tsx` (modificar)
- **DoD:** build pasa
- **Descripción:** Los broadcasts `payment-confirmed` y `reset` no incluían `cashierName`/`terminalName`/`terminalId`. Se agregó `metadataRef` en broadcast hook y receiver hook para preservar automáticamente la metadata entre broadcasts. Nuevo componente `TerminalCashierBar` compartido en todos los estados. `PaymentConfirmedState` ahora acepta `data` prop.

### Evidence Gates Globales
- `npm run build`: ✅ debe pasar
- `npm run lint`: ✅ debe pasar
- No tocar archivos fuera del scope listado

### Zonas con Lock
- `src/app/(pos)/pos/page.tsx` — compartido entre subtareas 0.1, 1.2 (ejecutar secuencial)

### Bugs Conocidos (no arreglados en esta tarea)
1. Auth callback OAuth: .limit(1) ignora from_origin
2. "Auth session missing!" en cada request
3. "Invalid Refresh Token: Already Used" — race condition
4. Hardcoded colors en charts (#003399, #10b981)
