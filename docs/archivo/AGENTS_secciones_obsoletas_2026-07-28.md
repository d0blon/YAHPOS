# Secciones obsoletas de AGENTS.md — snapshot 2026-07-28

Extraído de `AGENTS.md` antes de corregirlo, porque describían estado que ya no es cierto
en el código actual. Se guarda acá por si algo del contexto histórico sirve más adelante
(ver BITACORA.md para el motivo del archivado).

---

## (Antigua) Regla Crítica #2: Auth SSO Bug

**Bug #1:** `src/app/api/auth/callback/route.ts:74-103` — `.limit(1)` ignora `from_origin`. Usuario con múltiples tiendas siempre redirige a la primera. **No arreglado.**

> **Verificado FALSO el 2026-07-28**: el código actual (líneas 74-108) sí respeta `fromOrigin`
> correctamente — busca membresía del usuario en la tienda de origen antes de usar el fallback
> `.limit(1)` (que solo corre cuando NO hay `fromOrigin`). Coincide con BITACORA.md 2026-05-16
> ("Auth callback ahora redirige a fromOrigin para TODOS los usuarios"). El bug fue arreglado
> después de escribirse esta nota y nunca se actualizó el doc.

---

## (Antiguo) 6. Current Session Handoff (19 May 2026)

### ⛔ ESTADO ACTUAL: BLOQUEADO

**Última instrucción del usuario:** intentar arreglar auth cross-subdomain loop en master.localhost:3000

### Lo que se intentó
- Se reescribió `session-sync/route.ts` para usar HTML 200 + `Set-Cookie` headers raw + `window.location.replace()`, en lugar de `NextResponse.redirect()` + `response.cookies.set()` que perdía cookies en el redirect.
- Se agregó sanitización de trailing dots en middleware (path `/pos.` → `/pos`).

### Lo que SÍ funciona
- Turbopack (`npx next dev`) arranca y sirve páginas (login, root).
- El flujo OAuth completo funciona hasta session-sync: callback (200) → session-sync (200).
- `setSession()` captura cookies correctamente vía `setAll()` callback.

### Lo que NO funciona
1. **Webpack (`next dev --webpack`)**: Compilación se cuelga tras limpiar `.next` cache (cache cold). Permanece en `Compiling /pos ...`.
2. **Auth session missing**: Después de session-sync, toda request subsecuente muestra `[Middleware] Auth Error: Auth session missing!`. Las cookies seteadas no son reconocidas por `getUser()`.

### Hipótesis principales
- **H1:** Los nombres de cookies capturados por `setAll()` en session-sync no coinciden con los que espera `getUser()` en el middleware.
- **H2:** Timing: el `window.location.replace()` se ejecuta antes de que el browser persista los `Set-Cookie` headers.
- **H3:** La PWA plugin (`@ducanh2912/next-pwa`) interfiere con webpack 5 en cache cold.

> **Nota 2026-07-28**: NO confirmado como resuelto. Es un bug DISTINTO al fix de
> `secure:false` en middleware.ts que se cerró hoy (ese era sobre el flag de cookie, no sobre
> propagación de nombres/timing). El test manual de hoy (login cross-subdominio sin loop)
> sugiere que el flujo anda bien end-to-end actualmente, pero no confirma que H1/H2/H3 se haya
> resuelto puntualmente — puede que el código haya cambiado lo suficiente desde mayo que el
> problema original ya no aplique, o puede seguir latente. Verificar antes de asumir cerrado.

---

## (Antiguo) 7. Bugs Conocidos (Backlog) — versión con bloqueantes desactualizados

### 🔴 Bloqueantes
- [ ] **[Auth]** Session-sync no propaga cookies al middleware — `Auth session missing!` tras login exitoso
- [ ] **[Build]** Webpack compilation hang con cache cold (PWA plugin maybe). Workaround: Turbopack

> **Nota 2026-07-28**: el build de producción corrió limpio hoy (`npm run build`, 11.8s, 0
> errores) usando webpack — el hang de cache cold no se reprodujo. Se deja el ítem de auth como
> "verificar" (ver nota arriba) en vez de "bloqueante confirmado".
