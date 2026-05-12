## 🚨 CRÍTICO (FUGAS DE MEMORIA)
+
+### L1-L4 — Cleanups faltantes en useEffect
+
+**Problema:** Componentes que establecen listeners o intervalos sin limpiarlos, causando degradación de performance.
+
+**Archivos:**
+1. `src/app/api/payments/flow/confirmation/page.tsx:18` (Flow cleanup)
+2. `src/components/pos/RealTimeStockBadge.tsx:26` (Realtime subscription)
+3. `src/app/admin/cajas/page.tsx:58` (Socket/Listener)
+4. `src/components/pos/RemoteClosureListener.tsx:11` (Auth/Session listener)
+
+**Fix:** Asegurar que cada `useEffect` devuelva una función de limpieza (ej: `return () => subscription.unsubscribe()`).
+
+---
+
+## 🚨 CRÍTICO (BLOQUEA OPERACIONES)
+
## 🚨 CRÍTICO (BLOQUEA OPERACIONES)

### C1 — Order API rechaza productos con IDs numéricos

**Archivo:** `src/lib/validations/orders.ts:5`

**Problema:** `productId: z.string().uuid()` — pero los productos tienen IDs como `"14"`, `"27"` (numéricos). TODAS las ventas fallan.

**Fix:** Cambiar a `z.string().min(1)` — acepta cualquier string no vacío.

### C2 — Products lookup usa variable no declarada

**Archivo:** `src/app/api/products/lookup/route.ts:42-71`

**Problema:** Usa `p.product_name`, `p.labels_tags`, etc. pero `p` nunca se declaró. Debería ser `data.product`.

**Fix:** Reemplazar todas las referencias `p.` por `data.product.`

### C3 — Logos faltantes

**Archivos:** `public/logos/logo-light.png` y `public/logos/logo-dark.png`

**Problema:** El POS (línea 836) y el recibo (línea 79) referencian estos archivos pero no existen. Hay `yahpos_logo_*.png` y SVGs disponibles.

**Fix:** Copiar/renombrar los SVGs existentes a `logo-light.png` y `logo-dark.png`, o cambiar las referencias en el código a los archivos existentes.

### C4 — Favicon faltante

**Problema:** No existe `public/favicon.ico` pero `middleware.ts` lo excluye de rutas protegidas.

**Fix:** Agregar un favicon básico.

---

## 🔴 ALTO (PROBLEMAS EN PRODUCCIÓN)

### A1 — API routes sin try/catch (14 archivos)

**Archivos:** `products/[id]/route.ts`, `terminals/[id]/route.ts`, `admin/cash-sessions/route.ts`, `admin/cash-sessions/[id]/sales/route.ts`, `subscriptions/route.ts`, `settings/init/route.ts`, `sii/config/route.ts`, `cash-movements/route.ts`, `pos/draft/route.ts`, `cash-sessions/route.ts`, `cash-sessions/[id]/route.ts`, `settings/route.ts`, `products/route.ts` (POST), `terminals/route.ts` (POST), `orders/route.ts`, `auth/sso/route.ts`, `verify-dns/route.ts`

**Problema:** Cualquier error inesperado (DB timeout, parse error) devuelve raw error 500 o cuelga la request.

**Fix:** Envolver cada handler en try/catch con `NextResponse.json({ error: error.message }, { status: 500 })`.

### A2 — Auth faltante en products/[id] y terminals/[id]

**Archivos:** `products/[id]/route.ts` (GET, PATCH, DELETE), `terminals/[id]/route.ts` (PATCH, DELETE)

**Problema:** Cualquiera puede leer/modificar/borrar productos y terminales sin autenticación.

**Fix:** Agregar verificación de `supabase.auth.getUser()` al inicio de cada handler.

### A3 — SII settings usa campo inexistente

**Archivo:** `src/components/pos/OfflineSyncManager.tsx:118`

**Problema:** `settings?.sii?.enabled` — pero `PosSettings` no tiene campo `sii`. Siempre es `undefined` (falsy).

**Fix:** Reemplazar con la verificación correcta (ej: si el endpoint de config SII devuelve datos válidos).

### A4 — Webpay commit parsea mal con UUIDs

**Archivo:** `src/app/api/payments/webpay/commit/route.ts:20`

**Problema:** `buy_order.split('-')[1]` solo obtiene el primer segmento. Con UUIDs como `ORD-550e8400-e29b-...` extrae solo `"550e8400"`.

**Fix:** Usar `buy_order.replace('ORD-', '')` o extraer por posición fija.

---

## 🟡 MODERADO

### M1 — console.error → overlay en dev

**Archivos:** Varios componentes client-side con `console.error`

**Fix:** Reemplazar por `console.warn` en casos de funcionamiento esperado (network timeout, SII no configurado, etc.).

### M2 — Loading states incompletos

**Archivos:** `pos/page.tsx:429-458`

**Problema:** Settings y products se cargan sin skeleton/loading state. Si fallan, solo hay un `.catch()` silencioso.

**Fix:** Agregar estados de carga y error user-facing.

### M3 — `window.innerWidth` en render

**Archivo:** `pos/page.tsx:49`

**Problema:** Hydration mismatch potencial.

**Fix:** Mover a `useEffect` o `useLayoutEffect`.

---

## 🟢 ORDEN DE IMPLEMENTACIÓN

| Prioridad | Issue | Depende de |
|---|---|---|
| 1 | C1 — Order API validation | Ninguna |
| 2 | C2 — Products lookup var | Ninguna |
| 3 | C3 + C4 — Assets faltantes | Ninguna |
| 4 | A1 — try/catch en APIs | Ninguna |
| 5 | A2 — Auth en products/[id] | A1 |
| 6 | A3 — SII settings check | Ninguna |
| 7 | A4 — Webpay commit parse | Ninguna |
| 8 | M1 — console.warn | Ninguna |
| 9 | M2 — Loading states | Ninguna |
| 10 | M3 — window.innerWidth | Ninguna |
| 11 | L1-L4 — Memory Leaks | Ninguna |
| 12 | A1 — try/catch en APIs | Ninguna |
| 13 | A2 — Auth en APIs | A1 |
| 14 | D1 — Refactor PaymentModal | Ninguna |
| 15 | D2 — Admin Settings UI | Ninguna |
