---
status: done
goal: "Reemplazar toggle getnetIsBoleta por selector SII Modelo 1/2, generalizado a todos los terminales"
branch: null
created: 2026-05-12T17:30:00-04:00
updated: 2026-05-12T17:30:00-04:00
requires-plan: false
depends-on: []
---

# Handoff: SII Model Selector

## Contexto
El toggle `getnetIsBoleta` solo aplica a Getnet, pero desde 2024 TODOS los terminales (Getnet, TUU, SumUp, etc.) reportan automáticamente al SII. Si el POS emite boleta además del terminal, se duplica el IVA. Necesitamos un selector general: Modelo 1 (POS emite boleta siempre) / Modelo 2 (terminal emite, POS salta SII y muestra comprobante).

Decisión conjunta: AG recomendó esta tarea sobre API try/catch. Consenso alcanzado.

Item Kanban: `📋 BACKLOG` > `[SII] Modelo de Emisión SII`

## Especificación Técnica

### Archivos a modificar (en orden)

1. `src/stores/posStore.ts` — Reemplazar tipo
2. `src/types/index.ts` — Reemplazar tipo en StoreConfig
3. `src/components/pos/PosSettingsModal.tsx` — Nueva UI de selector
4. `src/app/(pos)/pos/page.tsx` — Actualizar lógica shouldSkipSii
5. `src/components/pos/PosReceiptModal.tsx` — Mostrar "COMPROBANTE DE PAGO"

### 1. `src/stores/posStore.ts`

**Cambiar:**
```ts
// ANTES
getnetIsBoleta?: boolean;

// DESPUÉS
siiModel?: 'modelo1' | 'modelo2';
```

**Default value** (line 226):
```ts
// ANTES
getnetIsBoleta: true,

// DESPUÉS
siiModel: 'modelo2',  // Por defecto: terminales emiten, POS no duplica
```

**loadSettings** (around line 258):
```ts
// ANTES
getnetIsBoleta: config.getnetIsBoleta ?? state.settings.getnetIsBoleta,

// DESPUÉS
siiModel: config.siiModel ?? state.settings.siiModel ?? 'modelo2',
```

### 2. `src/types/index.ts` (line 212)

```ts
// ANTES
getnetIsBoleta?: boolean

// DESPUÉS
siiModel?: 'modelo1' | 'modelo2'
```

### 3. `src/components/pos/PosSettingsModal.tsx` (lines 150-162)

Reemplazar el toggle card de "Boleta en Getnet" por un selector de dos opciones:

- **Modelo 1**: "Siempre emito boleta" — icono 📄 o similar, describe "El POS emite boleta SII para todos los pagos. Para negocios que no usan terminales o necesitan boleta siempre."
- **Modelo 2**: "El terminal emite la boleta" — icono 📱, describe "El terminal de pago ya reporta al SII. El POS muestra comprobante de pago. Evita duplicidad de IVA."

Usar dos cards clickeables (no dropdown). Al seleccionar uno, llama a `updateSettings({ siiModel: 'modelo1' })` o `updateSettings({ siiModel: 'modelo2' })`.

### 4. `src/app/(pos)/pos/page.tsx` (lines 636-638)

**Cambiar lógica de `shouldSkipSii`:**

```ts
// ANTES
const isGetnetBoleta = paymentMethod === 'TERMINAL' && terminalType === 'Getnet' && settings.getnetIsBoleta;
const shouldSkipSii = isVoucherPayment || isGetnetBoleta;

// DESPUÉS
const isTerminalPayment = paymentMethod === 'TERMINAL' || paymentMethod === 'TARJETA';
const terminalEmitsBoleta = isTerminalPayment && settings.siiModel === 'modelo2';
const shouldSkipSii = isVoucherPayment || terminalEmitsBoleta;
```

Esto generaliza: cualquier pago con terminal salta SII si el modelo es 2, no solo Getnet.

### 5. `src/components/pos/PosReceiptModal.tsx` (lines 89-95)

**Cambiar lógica del título del recibo:**

Actualmente siempre muestra "BOLETA ELECTRÓNICA" (o "PRE-FOLIO INTERNO"). Necesita saber si el SII fue saltado para mostrar "COMPROBANTE DE PAGO".

**Opción A (recomendada):** Pasar un prop `skipSii?: boolean` a `PosReceiptModal`. Donde se instancia el modal (en `pos/page.tsx`), pasar `skipSii={shouldSkipSii}`.

```tsx
// En PosReceiptModal:
const title = skipSii ? 'COMPROBANTE DE PAGO' : (orderData.isOffline ? 'PRE-FOLIO INTERNO' : 'BOLETA ELECTRÓNICA');
```

**Opción B (alternativa):** Leer `settings.siiModel` y `paymentMethod` dentro del modal para deducirlo. Pero es más acoplado.

Elegir Opción A: el modal recibe `skipSii` como prop.

## Do Not
- ❌ NO cambiar la lógica de emisión del motor SII (`src/lib/sii/engine.ts`, `signer.ts`, etc.)
- ❌ NO migrar datos existentes — el campo `getnetIsBoleta` queda como está en DB, solo se ignora
- ❌ NO tocar voucher payments (Junaeb/Pluxe/Edenred) — ya saltan SII y siguen igual
- ❌ NO cambiar el dteType hardcodeado (39) — eso es otra tarea
- ❌ NO modificar PaymentModal.tsx, siiStore.ts ni ningún otro archivo fuera de la lista

## Criterios de Aprobación
- [ ] Selector Modelo 1/2 visible en Ajustes del POS, reemplazando el toggle de Getnet
- [ ] Modelo 2: pago con terminal (cualquiera) salta SII y recibo muestra "COMPROBANTE DE PAGO"
- [ ] Modelo 1: pago con terminal emite boleta SII normal
- [ ] Voucher payments (Junaeb/Pluxe/Edenred) saltan SII en ambos modelos
- [ ] `npm run lint` pasa
- [ ] `npm run build` pasa
- [ ] Al cargar settings viejos (sin `siiModel`), default a `'modelo2'`

## Next Action
1. Leer `src/stores/posStore.ts` — cambiar `getnetIsBoleta` por `siiModel`
2. Leer `src/types/index.ts` — cambiar tipo
3. Leer `src/components/pos/PosSettingsModal.tsx` — reemplazar toggle por selector
4. Leer `src/app/(pos)/pos/page.tsx` — actualizar `shouldSkipSii`
5. Leer `src/components/pos/PosReceiptModal.tsx` — agregar prop `skipSii` y título condicional
6. Ejecutar `npm run lint` y `npm run build`
7. Reportar
