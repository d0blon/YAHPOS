---
status: BLOCKED
goal: "Fix auth cross-subdomain loop (session-sync cookie propagation)"
branch: "main"
created: 2026-05-19
updated: 2026-05-19 (23:45)
requires-plan: true
---

## ⛔ ESTADO ACTUAL: BLOQUEADO

### Resumen del problema
El servidor no logra servir `master.localhost:3000/pos` en este momento. Dos issues distintos:

---

### Problema 1: Webpack compilation hang
- **Síntoma:** `npm run dev --webpack` se queda en `Compiling /pos ...` indefinidamente tras limpiar `.next` cache.
- **Síntoma adicional:** Warnings `Serializing big strings (153kiB)` de webpack.
- **Funcionó ANTES** de limpiar `.next`.
- **Workaround:** Con Turbopack (`npx next dev` sin `--webpack`) el server arranca y sirve páginas.
- **Pero:** Turbopack tira warning por `@ducanh2912/next-pwa` (plugin agrega webpack config).
- **Causa probable:** Webpack tarda demasiado compilando archivos grandes en cache cold. O la PWA plugin interfiere.

### Problema 2: Auth session-missing después de session-sync
- **Síntoma:** Tras OAuth login, el flujo completo funciona:
  1. ✅ Callback recibe code, intercambia por session
  2. ✅ Callback redirige a session-sync (en master.localhost:3000)
  3. ✅ session-sync llama `setSession()`, captura cookies vía `setAll()` callback
  4. ✅ session-sync responde 200 con `Set-Cookie` headers + `window.location.replace()`
  5. ❌ REDIRECT A `/pos` devuelve `[Middleware] Auth session missing!`
- **Posible causa #1:** Los nombres de cookie que captura `setAll()` con `setSession()` son incorrectos vs los que espera `getUser()`.
- **Posible causa #2:** El browser no procesa los `Set-Cookie` headers antes de ejecutar el JS redirect (tiempo entre que llegan los headers y se ejecuta `window.location.replace()`).
- **Posible causa #3:** `createServerClient()` en middleware y en session-sync no usan el mismo project ref.

---

## Cambios realizados hoy (19 May)

| Archivo | Cambio | Estado |
|---------|--------|--------|
| `src/app/api/auth/session-sync/route.ts` | Reescrito: cambió `NextResponse.redirect()` + `cookies.set()` por HTML 200 + `Set-Cookie` headers raw + `window.location.replace()` | 🔴 NO FIX - auth sigue sin propagarse |
| `src/middleware.ts` | Se agregó sanitización de trailing dots en redirect path: `path.replace(/\.+$/, '')` | 🟢 Inocuo |
| `src/middleware.ts` | Anti-loop `_mw_loop` via search params (mantenido del 16 May) | 🟢 Funciona |
| `package.json` | Se cambió `"next dev --webpack"` a `"next dev"` y se revirtió | 🔄 Revertido a original |
| `next.config.ts` | Se agregó `turbopack: {}` y se revirtió | 🔄 Revertido a original |

---

## Pruebas realizadas con Turbopack (sirve páginas)

```
 GET /login?redirect=/pos.&_mw_loop=1 → 200 en 3.2s        ✅ Login carga
 GET /api/auth/sso?from_origin=... → 307                     ✅ OAuth inicia
 GET /api/auth/callback?code=... → 307                       ✅ Callback procesa
 GET /api/auth/session-sync?access_token=... → 200 en 717ms  ✅ Session-sync responde
 GET /pos. → 404                                              ❌ Trailing dot!
 GET / → 200 en 14-35s                                        ✅ Root carga
[Middleware] Auth Error: Auth session missing!                 ❌ Después de sync
```

**Nota:** Se descubrió trailing dot en `/pos.` vs `/pos` — ya se sanitiza.

---

## Hipótesis para mañana

### Hipótesis A: Cookie names mismatch
- `setSession()` setea cookies con nombres chunked (`sb-{ref}-auth-token.0`, `.1`, etc.)
- `getUser()` en middleware espera leer esas mismas cookies
- Revisar el `createServerClient` en ambas partes: ¿mismo `cookieOptions`?
- Probar: hacer el redirect del callback DIRECTAMENTE a `/pos` en vez de pasar por session-sync, para ver si las cookies puestas desde el callback (que FUNCIONAN) se llevan al subdominio.

### Hipótesis B: Timing del redirect vs cookies
- `Set-Cookie` headers se envían en response 200 del session-sync
- `<script>window.location.replace()</script>` se ejecuta INMEDIATAMENTE después
- El browser podría no haber persistido las cookies antes del redirect
- Fix posible: agregar un `setTimeout(() => window.location.replace(...), 100)` para dar tiempo al browser

### Hipótesis C: PWA plugin rompe webpack
- `@ducanh2912/next-pwa` v10.2.9 modifica webpack config
- En dev mode con `disable: true`, aún así modifica la config
- Con cache cold, webpack 5 no termina de compilar
- Fix posible: eliminar PWA plugin para desarrollo (`process.env.NODE_ENV === 'development' ? (cfg) => cfg : withPWA({...})(cfg)`)
- Alternativa: usar Turbopack permanentemente y migrar PWA a compatible

---

## Próximos pasos (orden sugerido)

1. **[PRIORIDAD]** Resolver webpack hang**: Verificar si es la PWA plugin la causa. Probar: comentar `withPWA()` y probar `--webpack`. Si funciona, aislar el fix.
2. **[PRIORIDAD]** Resolver auth session missing**: Probar Hipótesis A (saltarse session-sync, redirect directo desde callback con cookies via headers). Probar Hipótesis B (setTimeout en session-sync).
3. **Probar auth completo**: master.localhost:3000/pos → login → redirect → POS cargado.
4. **Ejecutar migrations 021 y 022** (pendientes).
5. **Probar build de producción**: `npm run build`.

## Archivos relevantes (estado actual)

| Archivo | Líneas clave | Propósito |
|---------|-------------|-----------|
| `src/app/api/auth/session-sync/route.ts` | todo | HTML+Set-Cookie approach (fix intentado) |
| `src/middleware.ts` | 13-17, 173-188 | Anti-loop + redirect + sanitize trailing dots |
| `src/app/api/auth/callback/route.ts` | (no tocado) | Redirige a session-sync con access_token + refresh_token |
| `next.config.ts` | 62-66 | withPWA({ disable: dev, register: false }) |
| `package.json` | 6 | dev script: `next dev --webpack` |
