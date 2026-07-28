---
status: closed
goal: "Fix race condition Invalid Refresh Token (React Strict Mode) en SessionSync"
branch: "main"
created: 2026-07-28
updated: 2026-07-28
requires-plan: true
---

## ✅ CERRADO — prueba real confirmada por el usuario (2026-07-28)

Usuario hizo la prueba manual (no Antigravity): ~20 recargas en 15s sobre
`admin.localhost:3000/admin` logueado. Consola solo muestra `Auth Event: INITIAL_SESSION`
una vez, cero `Invalid Refresh Token`, sesión no se cae, panel admin se mantiene. Fix en
`SessionSync.tsx` (guard `mounted` + mutex `isRefreshingProfile` + `initialSessionFired`)
confirmado funcional en runtime, no solo en build/lint.

Hallazgo aparte no bloqueante, fuera de scope: warning de manifest PWA — ícono
`yahpos_logo_square_master_192.png` con tamaño real distinto al declarado en el manifest.
No relacionado a este bug, no se tocó nada de PWA en este handoff.

---

## 🛑 HISTÓRICO — ACLARACIÓN DE ROL: Antigravity, leé esto con atención

Reportaste `npm run build` ✅ y `npx eslint` ✅ como si eso cerrara la validación, y ante la
falta de navegador ofreciste una "garantía teórica" del código en vez de la prueba real. Esto
no es suficiente y hay que corregirlo para lo que sigue:

- **Build y lint solo detectan errores de tipos y sintaxis.** Este bug (race condition de
  timing en `Invalid Refresh Token`) es un problema de **runtime**, exactamente como el bug
  de RLS de la tarea anterior — invisible para ambas herramientas por diseño. Que compilen
  limpio no es evidencia de que el fix funcione.
- **Tu trabajo como Constructor incluye probar el cambio en navegador real**, no solo hacer
  que compile. Si tu entorno (IDE) no tiene capacidad de abrir un navegador o automatizar
  clicks, tu trabajo es decir eso explícitamente — "no puedo ejecutar esta prueba, necesito
  que el usuario la haga" — y darle pasos exactos para que él la corra y te devuelva el
  resultado. No reemplazar la prueba con una explicación de por qué el código "debería"
  funcionar.
- Pasos exactos para el usuario (Product Owner) si Antigravity no puede probarlo:
  1. `npm run dev`, loguearse en la app
  2. Recargar la página (F5) 5-6 veces seguidas, rápido
  3. Abrir la consola del navegador (F12) — confirmar que **no aparece** `Invalid Refresh
     Token` en ninguna recarga
  4. Confirmar que el perfil/rol sigue cargando bien después de cada recarga (no queda en
     blanco ni "Usuario" genérico)
- No se cierra esta tarea sin ese resultado real, venga de Antigravity o del usuario.

---

## 🛑 ANTES DE IMPLEMENTAR: Antigravity, explicale esto al usuario primero

El usuario aprobó este handoff pero pide que **antes de tocar código** le expliques en
palabras simples (no técnicas, asume que no recuerda contexto de hace 2 meses):
1. Qué es el bug "Invalid Refresh Token" y cuándo lo nota (recargas rápidas, dev mode)
2. Por qué pasa (dos partes del código preguntando por la sesión al mismo tiempo, pisándose)
3. Qué vas a cambiar (un solo archivo, `SessionSync.tsx`, nada de zonas rojas)
4. Qué riesgo tiene (bajo — no toca login/logout normal, solo el arranque de sesión)

Esperá el OK explícito del usuario después de esa explicación antes de empezar a editar.

---

## 🏗️ ESTADO ACTUAL: Bug real, un solo archivo a tocar (no zona roja)

### ⚠️ Qué pasa
En dev (React Strict Mode monta→desmonta→remonta cada componente una vez para detectar
efectos secundarios no limpios), y en navegación rápida entre pestañas, aparece
`Invalid Refresh Token` en consola. Causa raíz: `SessionSync.tsx` tiene **dos puntos de
entrada concurrentes** que ambos intentan resolver la sesión al montar:

```ts
useEffect(() => {
  const initAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession()  // (1)
    if (session) await refreshProfile()
  }
  initAuth()

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
      if (session) await refreshProfile()   // (2) — INITIAL_SESSION dispara esto también
    }
    ...
  })
  return () => subscription.unsubscribe()
}, [...])
```

`onAuthStateChange` emite `INITIAL_SESSION` inmediatamente al suscribirse, con la sesión
actual — o sea (1) y (2) corren en paralelo en el mismo montaje, ambos llamando
`getSession()`/leyendo el token. Si el access token está vencido, cada llamada dispara su
propio intento de refresh contra el mismo refresh token. Supabase rota el refresh token en
cada uso — el segundo intento, con el token que el primero ya rotó, revienta con
`Invalid Refresh Token: Already Used`. En Strict Mode esto se agrava porque el efecto corre
dos veces seguidas (monta, limpia, monta de nuevo), multiplicando las llamadas concurrentes.

### Por qué no es un problema de `SaaSProvider.tsx` (zona roja)
Audité también `src/providers/SaaSProvider.tsx` — tiene su propio `onAuthStateChange`, pero
solo reacciona a `SIGNED_IN`/`SIGNED_OUT` para refrescar el config de la tienda
(`fetchConfig()`), **no llama `getSession()` ni toca el refresh token directamente**. No es
la fuente de la carrera. No tocar este archivo.

---

## FIX — único archivo a tocar: `src/components/auth/SessionSync.tsx`

**Objetivo:** colapsar los dos puntos de entrada en uno solo, y blindar contra el
doble-montaje de Strict Mode.

1. **Eliminar el `initAuth()` manual** (el bloque `getSession()` + `refreshProfile()` inicial).
   Confiar únicamente en el evento `INITIAL_SESSION` del listener `onAuthStateChange` para
   resolver la sesión al montar — ese evento ya trae la sesión actual sin necesitar un
   `getSession()` manual en paralelo.
2. **Agregar guard contra doble-invocación de Strict Mode** con `useRef`, para que si el
   efecto corre dos veces (monta→limpia→monta), la segunda suscripción no dispare trabajo
   duplicado mientras la primera todavía tiene una promesa en vuelo. Patrón sugerido:
   ```ts
   const hasHandledInitial = useRef(false)
   // dentro del handler, en el evento INITIAL_SESSION:
   if (event === 'INITIAL_SESSION') {
     if (hasHandledInitial.current) return
     hasHandledInitial.current = true
   }
   ```
   (el flag vive fuera del closure del efecto vía `useRef`, sobrevive al remount de Strict
   Mode porque React reutiliza la instancia del componente, solo re-ejecuta el efecto).
3. Mantener el resto de la lógica intacta: `SIGNED_IN`/`TOKEN_REFRESHED` siguen llamando
   `refreshProfile()` normal (esos no son concurrentes entre sí, son eventos reales
   posteriores en el tiempo), `SIGNED_OUT` sigue llamando `logout()` + `router.refresh()`.

### Criterios de Aprobación
- [ ] En dev (`npm run dev`, Strict Mode activo por defecto en Next.js dev), recargar la
      página logueado varias veces seguidas → **cero** `Invalid Refresh Token` en consola
      del navegador ni del servidor
- [ ] Verificar en Network tab que solo hay **una** llamada a `refreshProfile` (query a
      `profiles`/`user_stores`) por carga inicial, no dos
- [ ] Login normal sigue funcionando (`SIGNED_IN` dispara `refreshProfile`)
- [ ] Logout normal sigue funcionando (`SIGNED_OUT` dispara `logout()` + refresh)
- [ ] Cambio de token en background (esperar expiración o simular) sigue actualizando
      perfil (`TOKEN_REFRESHED`)
- [ ] `npm run build` y `npx eslint` sin errores nuevos

### Do Not
- No tocar `src/providers/SaaSProvider.tsx` (⛔ zona roja) — confirmado que no es la fuente
  del bug, ver arriba
- No tocar `src/middleware.ts`, `src/lib/supabase.ts` (⛔ zonas rojas)
- No tocar `src/stores/authStore.ts` — `refreshProfile()` en sí está bien, el problema es
  cuántas veces y desde dónde se llama, no su lógica interna
- No agregar debounce/throttle genérico — el fix es eliminar el punto de entrada duplicado,
  no enmascarar la carrera con delays

---

## 📋 Backlog — otros ítems del §9 ya auditados

- **Realtime Stock (Supabase Realtime)**: ✅ ya implementado (`RealTimeStockBadge.tsx` en
  shop y pos, canal `postgres_changes` sobre `products`). Sacar de pendiente.
- **Carga certificado `.pfx`**: ✅ ya implementado (`admin/configuracion/page.tsx` +
  `api/sii/config/route.ts`, cifrado con `encrypt()` de `@/lib/crypto`, nunca se devuelve al
  cliente). Sacar de pendiente.
- **Inngest (tareas de fondo)**: ❌ no implementado, cero rastro en código más allá de
  menciones en docs. Sigue pendiente, no es parte de este handoff.
- **Refactor PaymentModal**: existe (`src/components/pos/PaymentModal.tsx`, 612 líneas), no
  evaluado si amerita refactor — es juicio de diseño, no bug. Sigue pendiente, no es parte
  de este handoff.
