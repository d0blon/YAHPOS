# AGENTS.md — YAHPOS! Constructor Protocol

Rol: **Constructor / Orchestrator.** Descompones, delegas, verificas y reportas. NO ejecutas código directamente si puedes delegarlo a un subagente. Piensa como un Engineering Manager que revisa PRs, no como un junior que escribe línea por línea.

---

## 1. Pipeline de Trabajo (4 Fases)

Toda tarea sigue este pipeline. No brincar fases.

```
Decompose → Delegate → Verify → Report
(orquesto)  (subagentes) (reviso)  (documento)
```

### Fase 1 — Decompose (Yo = Orchestrator)
Antes de tocar código:
1. Leer handoff + project state (AGENTS.md, BITACORA.md, Kanban)
2. Descomponer la tarea en subtareas **aisladas** con:
   - File scope explícito (lista de archivos que toca)
   - Dependencias entre subtareas (paralelo vs secuencial)
   - Definition of Done (build, lint, test que debe pasar)
   - **Regla de oro:** ningún archivo aparece en más de una subtarea
3. Crear TodoWrite con todas las subtareas
4. Mostrar descomposición al usuario para aprobación

### Fase 2 — Delegate (Subagentes)
- Subtareas **independientes** → lanzar `Task(general|explore)` **en paralelo**
- Subtareas **dependientes** → pipeline secuencial (output de A → spec de B)
- Cada subagente recibe: spec clara, file scope, quality gates
- Cada subagente devuelve: resultado + diff + evidencia

### Fase 3 — Verify (Yo = Reviewer)
1. Scope governance: verificar que ningún archivo fuera de scope fue tocado
2. Evidence gates: `npm run build` + `npm run lint` global
3. Revisar diff contra spec original
4. Si falla → rework (máx 3 intentos, luego escalar)

### Fase 4 — Report (Yo = Documenter)
1. Actualizar BITACORA.md (changelog)
2. Escribir Report Back estructurado
3. Actualizar Kanban
4. Dejar TASK_HANDOFF.md actualizado

---

## 2. Reglas Always-On

| # | Regla |
|---|-------|
| 1 | Siempre empieza la sesión leyendo `AGENTS.md`, `TASK_HANDOFF.md`, `BITACORA.md`, `YAHPOS Kanban.md` |
| 2 | **No ejecutes si puedes delegar.** Si una subtarea es independiente y tiene scope claro, úsala para un subagente. |
| 3 | Evidence gates (build + lint) **deben pasar** antes de reportar. Si fallan, no escondas el error. |
| 4 | Mismo error 3 veces seguidas → STOP → reporta. No sigas iterando. |
| 5 | NO modifiques archivos fuera del scope listado en descomposición |
| 6 | NO edites `YAHPOS Kanban.md` ni archivos de planificación |
| 7 | NO dejes comentarios en el código a menos que sea estrictamente necesario |
| 8 | Al completar tarea, actualiza BITACORA.md y AGENTS.md |
| 9 | **TodoWrite obligatorio** al inicio de cada tarea — mantener actualizado en tiempo real |
| 10 | Si un subagente toca archivos fuera de su scope → abortar y reportar |
| 11 | **Documentación proactiva para clientes.** Cada vez que analices o implementes algo (flujo de pago, integración, lógica de negocio), evalúa si es útil para documentación de clientes (PPT, manuales, diagramas). Si lo es, agrega/actualiza en `docs/` con diagramas, tablas de costos, configuraciones por negocio, y explicaciones "para el dueño del negocio". Si no aporta, salta. |

---

## 3. Subagente Orchestration Patterns

### Fan-out/Fan-in (tareas independientes)
```
Task(explore) "Buscar todos los usos de X"  ─┐
Task(general) "Implementar feature Y"         ─┼─→ Yo sintetizo
Task(explore) "Verificar impacto en Z"        ─┘
```

### Pipeline (tareas secuenciales)
```
Task(explore) "Investigar" → Task(general) "Implementar" → Task(explore) "Verificar"
     output depende     output depende
     del anterior       del anterior
```

### Research → Implement (investigación + ejecución)
```
Task(explore) "Investigar patrón/API/dependencias" → entrega facts + recomendación
Task(general) "Implementar siguiendo la recomendación"
```

### Paralelo con Síntesis (deliberación)
```
Task(general) "Opción A: pros/cons"
Task(general) "Opción B: pros/cons"
Yo: sintetizo y recomiendo la mejor
```

---

## 4. Estado Actual del Proyecto

**Framework:** Next.js 16.2.3 (App Router) + Webpack  
**Styling:** Tailwind CSS v4 + CSS variables  
**Auth:** Supabase SSR (OAuth Google)  
**DB:** Supabase PostgreSQL  
**Branch activa:** `main`

### ⚠️ Regla Crítica #1: Tailwind v4
**`tailwind.config.ts` ES IGNORADO.** Todo el theme se define en `globals.css` dentro de `@theme { ... }`.  
Clases disponibles: `bg-brand-primary`, `text-brand-accent`, `from-brand-500`, `shadow-brand-primary/10`

### ⚠️ Regla Crítica #3: Dual ThemeProvider — NO inyectar --surface-* inline
Hay DOS `ThemeProvider` en el árbol: el del `RootLayout` (defaultTheme="dark") y el del POS layout (defaultTheme="light"). `BrandThemeSetter` solo inyecta `--brand-*` inline. **No inyectar `--surface-*` inline** porque se desincronizan: los inline styles de un ThemeProvider pispean el CSS `.dark` class del otro. Las surface colors deben manejarse exclusivamente via CSS (`:root` / `.dark` en globals.css).

### ⚠️ Regla Crítica #4: Hardware Browser APIs (WebUSB / Web Bluetooth / Web Serial)
Solo disponibles en Chromium (Chrome, Edge, Opera). No funcionan en Firefox ni Safari. El POS detecta automáticamente si están disponibles y muestra mensaje si no. Las APIs requieren interacción del usuario (click) para conectar — no se pueden auto-conectar sin gesture.

### Hardware Layer Files
| Archivo | Propósito |
|---------|-----------|
| `src/lib/hardware/types.ts` | Tipos compartidos, constantes ESC/POS |
| `src/lib/hardware/printer.ts` | PrinterManager — WebUSB, ESC/POS receipt builder |
| `src/lib/hardware/cashDrawer.ts` | CashDrawerManager — abre gaveta vía impresora o USB directo |
| `src/lib/hardware/bluetooth.ts` | BluetoothScanner — BLE service 0xFFF0 + HID fallback |
| `src/lib/hardware/hardwareStore.ts` | Zustand store unificado |

### Customer Display ✅
- **Implementado:** 2026-05-14
- **Ruta:** `/(pos)/pos/customer-display`
- **Sincronización:** BroadcastChannel (`useCustomerDisplayBroadcast` / `useCustomerDisplayReceiver`)
- **Estados:** idle, cart-update, payment-qr, payment-confirmed, reset
- **Futuro:** Supabase Realtime para sincronización cross-device

### ⚠️ Regla Crítica #2: Auth SSO Bug
**Bug #1:** `src/app/api/auth/callback/route.ts:74-103` — `.limit(1)` ignora `from_origin`. Usuario con múltiples tiendas siempre redirige a la primera. **No arreglado.**

### Investigación Pendiente: Inngest (Background Jobs)
- **Investigado:** 2026-05-13
- **Documentado en:** BITACORA.md §8
- **Para implementar:** Setup inicial → Migrar SII sync → Programar reportes → Resends marketing
- **Integración:** `npx inngest-cli@latest dev` + `src/inngest/client.ts` + `src/app/api/inngest/route.ts`

### Idea Pendiente: MCP Server Dinámico para YAHPOS!
- **Investigado:** 2026-05-14
- **Documentado en:** BITACORA.md §9
- **Propuesta:** MCP server con tools dinámicas que lean el codebase (componentes, API routes, brand vars)
- **Cuándo implementar:** Cuando el proyecto llegue a 1000+ archivos o se sume otro dev
- **Estimación:** 4-8h

### Zonas Rojas (NO tocar sin permiso)
`middleware.ts`, `SaaSProvider.tsx`, `src/lib/sii/engine.ts`, `src/lib/supabase.ts`, `src/lib/supabase.ts`

### Archivos que NO tocar
`src/sections/PlatformLanding.tsx`, `src/components/layout/PlatformHeader.tsx`, `src/app/(auth)/login/page.tsx`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`

---

## 5. Últimos Cambios

### 2026-05-13
| Archivo | Cambio |
|---------|--------|
| `src/app/globals.css` | brand-* agregados al @theme. Dark mode backgrounds neutralizados |
| `src/lib/contrast.ts` | (nuevo) Utilidad WCAG |
| `src/app/admin/branding/page.tsx` | Panel smart contrast |
| `src/components/pos/PosSettingsModal.tsx` | violet-* → brand-* |
| `src/components/admin/DesignWishlistModal.tsx` | purple-* → brand-primary |
| `src/components/admin/ProductModal.tsx` | purple-* → brand-primary |
| `src/app/admin/page.tsx` | Recharts height fixed |
| `src/app/admin/reportes/page.tsx` | Recharts height fixed |
| `AGENTS.md` | Nueva metodología 4-fase pipeline con subagentes |
| Default brand-primary | `#7700cc` → `#4b0082` en 8 archivos |
| `CatalogViewer.tsx` | `corporate-blue` → `brand-primary` (23 usos) |
| `admin/configuracion/page.tsx` | `purple-*` → `brand-*` (7 usos) |
| `admin/personal/page.tsx` | `indigo-*` → `brand-*` (3 usos) |
| Charts (admin) | Hex `#003399`/`#1a4b8c` → `#4b0082` |
| `CashMovementModal.tsx` | `indigo-500` → `brand-500` |
| `CashOpeningModal.tsx` | `cyan-*` → `brand-accent-*` |
| `EditorProvider.tsx` | `purple-400` → `brand-400` |
| `(auth)/layout.tsx` | `purple-600/40` → `brand-600/40` |
| `carrito/page.tsx` | `purple-400` → `brand-400` |
| Footer, ShopBackdrop, PackSection, PacksSlide | gradientes/cyan → brand/brand-accent |
| `ecommerce.ts` | `cyan-500/20` → `brand-accent-500/20` |

### 2026-05-14 — Fix Dual ThemeProvider Desync
| Archivo | Cambio |
|---------|--------|
| `src/providers/BrandThemeSetter.tsx` | Eliminada inyección de `--surface-*` (causaba desync con POS ThemeProvider anidado) |
| `src/lib/color.ts` | `generateSurfaceShades` revierte a solo light-mode |
| `src/app/(pos)/pos/page.tsx` | Categories + Products scroll → `bg-surface-100` (unificado con Cart) |
| `src/app/globals.css` | `custom-scrollbar::-webkit-scrollbar` agrega `height: 4px` para scroll horizontal |
| `BITACORA.md` | Changelog actualizado |

### 2026-05-14 — Hardware Integration (WebUSB + Scanner Fix)
| Archivo | Cambio |
|---------|--------|
| `src/app/(pos)/pos/page.tsx` | Scanner fix: paste + Enter. Hardware init al montar POS |
| `src/lib/hardware/types.ts` | (nuevo) Tipos compartidos + constantes ESC/POS |
| `src/lib/hardware/printer.ts` | (nuevo) PrinterManager vía WebUSB |
| `src/lib/hardware/cashDrawer.ts` | (nuevo) CashDrawerManager |
| `src/lib/hardware/bluetooth.ts` | (nuevo) BluetoothScanner BLE + HID |
| `src/lib/hardware/hardwareStore.ts` | (nuevo) Zustand store unificado de hardware |
| `src/components/pos/PosReceiptModal.tsx` | Botón "Térmica" para impresión USB ESC/POS |
| `src/components/pos/PosSettingsModal.tsx` | Sección "Hardware" (conectar USB, abrir gaveta, BT scanner) |
| `src/app/api/products/route.ts` | TypeScript fix: `as any[]` en loadCatalog |
| `package.json` | `@types/w3c-web-usb`, `@types/web-bluetooth` agregados |
| `AGENTS.md` | Regla crítica #4 (Hardware APIs), tabla hardware files, customer display idea |
| `BITACORA.md` | Changelog actualizado, customer display en §9 |

### 2026-05-14 — Fase 0 (IVA Duplication Fix) + Fase 1 (Customer Display + Webpay QR)
| Archivo | Cambio |
|---------|--------|
| `src/lib/hardware/types.ts` | Constantes `TERMINALS_WITH_DTE`, `GATEWAY_METHODS`, `VOUCHER_METHODS` |
| `src/components/pos/PosSettingsModal.tsx` | Toggles per-terminal "Emite su boleta" en sección Hardware |
| `src/lib/hooks/useCustomerDisplaySync.ts` | (nuevo) Hooks BroadcastChannel: `useCustomerDisplayBroadcast`, `useCustomerDisplayReceiver` |
| `src/app/(pos)/pos/page.tsx` | IVA fix: per-terminal `shouldSkipSii` con safety validation |
| `src/app/(pos)/pos/page.tsx` | Broadcast integrado: cart-update, payment-confirmed, reset |
| `src/app/(pos)/pos/customer-display/page.tsx` | (nuevo) Fullscreen customer display con QR, confetti, auto-hide cursor |
| `src/app/api/payments/webpay/status/route.ts` | (nuevo) Webpay status polling (`tx.commit()`) |
| `src/components/pos/PaymentModal.tsx` | Método Webpay QR con creación + polling + auto-confirm |
| `AGENTS.md` | Últimos cambios actualizados |
| `BITACORA.md` | Changelog actualizado |

### 2026-05-14 — Fix Cashier Name Persistence en Customer Display
| Archivo | Cambio |
|---------|--------|
| `src/lib/hooks/useCustomerDisplaySync.ts` | `metadataRef` en broadcast + receiver; `updateData()` preserva cashierName/terminalName/terminalId entre broadcasts |
| `src/app/(pos)/pos/customer-display/page.tsx` | Nuevo `TerminalCashierBar` compartido; CashierName visible en cart-update, payment-qr y payment-confirmed |
| `BITACORA.md` | Changelog actualizado |

---

## 6. Bugs Conocidos (Backlog)

1. **[Auth]** callback OAuth: `.limit(1)` ignora `from_origin` — redirige a tienda incorrecta
2. **[Auth]** "Auth session missing!" en cada request — cookies no propagan entre subdominios
3. **[Auth]** "Invalid Refresh Token: Already Used" — race condition Strict Mode
4. **[Charts]** Colores hardcodeados en dashboard (`#003399`, `#10b981`, etc.)

---

## 7. Convenciones

### CSS
- Preferir `bg-brand-primary/10` sobre colores fijos
- Estados semánticos: emerald=éxito, red/rose=error, amber=advertencia (NO cambiar)
- NO usar `purple-*`, `violet-*`, `indigo-*`, `sky-*`, `cyan-*` → `brand-*`

### Commits
- `feat:` nueva funcionalidad | `fix:` bug fix | `chore:` mantenimiento | `docs:` documentación

### Stack
- **UI:** React 19 + Tailwind CSS v4 + shadcn/ui + Framer Motion + GSAP
- **Estado:** Zustand + Supabase SSR
- **Testing:** Jest (unit) + Playwright (e2e)
- **Pagos:** Transbank SDK, Webpay, Edenred, Pluxe, Junaeb, SumUp, Getnet
- **DTE/SII:** Motor propio — Node-Forge, XML-Crypto, CAF, .pfx

---

## 8. Formato de Descomposición de Tareas

Antes de implementar, escribir esto en TASK_HANDOFF.md:

```
## Descomposición

### Subtarea 1: [nombre]
- **Tipo:** independiente | secuencial (depende de: X)
- **Archivos:** src/foo.ts, src/bar.tsx
- **DoD:** build pasa, lint pasa
- **Subagente:** explore | general

### Subtarea 2: [nombre]
- **Tipo:** independiente | secuencial
- **Archivos:** src/baz.ts
- **DoD:** build pasa, lint pasa, test pasa
- **Subagente:** explore | general
```

---

## 9. Formato de Report Back

```
## Report Back: <nombre tarea>

### Resultado
- [x] Criterio 1: <evidencia>
- [x] Criterio 2: <evidencia>

### Cambios Realizados
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `path/file.ts` | modify | Cambié X por Y |
| `path/new.ts` | create | Nueva función Z |

### Evidence Gates
- `npm run lint`: ✅ | ❌
- `npm run build`: ✅ | ❌

### Riesgos / Notas
- Algo que podría romperse
- Preguntas al usuario
```

---

## 10. Prevención de Problemas

### Loop Detection
Si corriges el mismo error 3 veces → STOP. Reporta: "Llegué a un loop con [error]."

### Fuera de Scope
Si un subagente o tú tocan archivos fuera de la descomposición → abortar, reportar. Si hay dependencia no documentada, reporta.

### Kill Criteria para Subagentes
- Mismo error 3 iteraciones → abortar subagente, re-descomponer
- Toca archivos fuera de scope → abortar inmediatamente
- No pasa quality gates en 2 intentos → abortar, añadir failing test al spec, relanzar

### Zonas Rojas
Si la tarea requiere tocar `middleware.ts`, `SaaSProvider.tsx`, `src/lib/sii/engine.ts` o `src/lib/supabase.ts` y el handoff no menciona plan de pruebas → detente y reporta.

### Zonas con Lock (solo una tarea a la vez)
`package.json`, `tailwind.config.ts`, `src/middleware.ts`, `src/lib/supabase.ts`, `src/stores/posStore.ts`, `src/app/(pos)/pos/page.tsx`

---

*Última actualización: 2026-05-14*
