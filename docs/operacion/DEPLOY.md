# Deploy y entornos (staging / producción)

**Vigente desde:** 2026-11-23 · **Dueño:** infra · **Alcance:** aplicación Next.js + base Supabase.

Este documento es la fuente única del camino de despliegue. Si algo no está acá, no es
procedimiento: es improvisación.

---

## 1. Plataforma objetivo (decidida, no supuesta)

| Capa | Plataforma | Evidencia en el repo |
|---|---|---|
| App | **Vercel** (Next.js 16, App Router, output serverless) | `vercel.json` (`"framework": "nextjs"`, `buildCommand`), `next.config.ts`, `README.md` §Stack («Infraestructura: Vercel + Supabase») |
| Base de datos / Auth / Storage | **Supabase** (PostgreSQL + RLS + Realtime) | `supabase/migrations/` (39 migraciones, 001→040), `@supabase/ssr`, `SUPABASE_SERVICE_ROLE_KEY` en `src/lib/supabase.ts` |
| CD | **GitHub Actions** | `.github/workflows/deploy.yml` (este cambio) |
| Tooling de deploy | `vercel` CLI + `supabase` CLI | `scripts/deploy.mjs`, `scripts/db-migrate.mjs` |

No hay Dockerfile ni VPS: el runtime es serverless. Cualquier paso que asuma un proceso
Node persistente (`pm2`, `systemd`) **no aplica** acá.

`vercel.json` quedó mínimo y sin configuración legacy: se eliminó el bloque `env: { NODE_ENV }`
(Vercel lo trata como legacy y `NODE_ENV=production` en el install hace que npm omita
`devDependencies`, que el build necesita) y el install pasó de `npm install` a `npm ci`
(reproducible, respeta el lockfile).

### Consecuencias del runtime serverless

- El build necesita las variables `NEXT_PUBLIC_*`: `src/lib/supabase.ts` lanza en import si
  faltan, así que un build sin ellas falla (no es un warning).
- `SII_ENCRYPTION_KEY` y `SECURITY_SALT` deben existir en **runtime**, no en build.
- El rate limiting usa Upstash porque el proceso no comparte memoria entre invocaciones;
  sin Redis en producción el limitador **hace fail-closed** (`src/lib/ratelimit.ts`).
- No hay cron ni worker en Vercel: las tareas SII/DTE corren dentro de requests.

---

## 2. Entornos

| | `local` | `staging` | `production` |
|---|---|---|---|
| Rama | cualquiera | `staging` | `main` |
| Proyecto Vercel | — | mismo proyecto, scope **Preview** | mismo proyecto, scope **Production** |
| `VERCEL_ENV` reportado | `local` | `preview` | `production` |
| Base de datos | Supabase dev (`SUPABASE_DB_URL`) | **proyecto Supabase staging** (separado) | **proyecto Supabase producción** |
| Datos | fixtures | datos de prueba (`QA-`) | reales |
| Migraciones | manuales | automáticas en cada deploy | automáticas, con respaldo confirmado + aprobación |
| Aprobación | — | automática al pushear `staging` | environment `production` de GitHub (reviewer) |
| Health | `http://localhost:3000/api/health` | URL del deployment preview | dominio de producción |

**Regla dura: staging y producción nunca comparten proyecto Supabase.** Compartir DB
convierte cualquier prueba de staging en un incidente de producción (RLS, folios SII,
correlativos de venta).

Los deployments de preview de Vercel reportan `VERCEL_ENV=preview`; por eso el smoke de
staging espera `--expect-env preview` (no `staging`). El nombre "staging" es del entorno
lógico, no del valor técnico.

---

## 3. Orden de operaciones (el punto central)

```
1. preflight  → variables del entorno (aborta si falta una obligatoria)
2. build      → artefacto local (vercel build), todavía sin publicar
3. migraciones→ aplicar SQL pendiente en la DB del entorno
4. deploy     → publicar el artefacto (vercel deploy --prebuilt)
5. smoke      → /api/ping + /api/health contra la URL publicada
```

Por qué este orden y no otro:

- **Build antes de migrar** para no tocar la DB si el código ni compila.
- **Migrar antes de publicar** porque el código nuevo puede leer columnas nuevas; si se
  publica primero, hay una ventana con errores 500.
- **Publicar antes del smoke** es inevitable: el smoke valida el despliegue real, no el artefacto.
- Si el smoke falla, el deploy **no se da por bueno** y se ejecuta el rollback (§7).

Un solo comando ejecuta los 5 pasos y se detiene en el primero que falle:

```bash
# staging (Vercel preview + Supabase staging)
node scripts/deploy.mjs --target staging

# producción (exige respaldo confirmado y allow-prod explícito)
node scripts/deploy.mjs --target production --i-have-a-backup --allow-prod
```

Nunca se publica con `vercel deploy --prod` a mano: ese comando salta los pasos 3 y 5.

### 3.1 Paso a paso manual (equivalente, para depurar)

```bash
vercel login                                  # una vez por máquina
vercel link                                   # escribe .vercel/project.json (git-ignored)
vercel pull --yes --environment preview       # staging → escribe .vercel/.env.preview.local
node scripts/check-env.mjs --target staging --file .vercel/.env.preview.local
vercel build                                  # producción: vercel build --prod
node scripts/db-migrate.mjs --target staging --plan     # ¿qué falta?
node scripts/db-migrate.mjs --target staging --apply
vercel deploy --prebuilt                      # producción: --prod
node scripts/smoke-deploy.mjs https://<url-del-deploy> --expect-env preview
```

`npm run` equivalentes: `env:check`, `db:plan`, `db:migrate`, `deploy:dry`, `deploy:staging`,
`deploy:production`, `smoke`, `rollback:list`.

### 3.2 CI/CD

`.github/workflows/deploy.yml`:

| Evento | Target | Notas |
|---|---|---|
| push a `staging` | staging | automático, sin aprobación |
| push a `main` | production | environment `production` (reviewer obligatorio) |
| `workflow_dispatch` | el que se elija | permite `skip_migrations` y `backup_confirmed` |

El workflow **no duplica** las variables de la app: `vercel pull` las trae del scope correcto
del proyecto Vercel. Lo único que vive en GitHub son los secretos de acceso a las plataformas
(§4.3).

`skip_migrations` existe para releases que no tocan esquema. Si el release incluye SQL y se
omite, el deploy puede quedar leyendo columnas inexistentes: usarlo solo con verificación
explícita del diff de `supabase/migrations/`.

---

## 4. Variables de entorno por entorno

El esquema ejecutable (niveles, formatos y mensajes) está en `scripts/lib/env-schema.mjs`.
El inventario funcional completo vive en `.env.example` y en el informe de la tarea de
auditoría de env vars. Acá va la matriz operativa: **qué se configura, dónde y quién**.

### 4.1 Obligatorias por entorno

| Variable | local | staging | prod | ¿Secreta? | Dónde se configura | Quién |
|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✔ | ✔ | ✔ | no | Vercel env (Build + Runtime) | infra |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✔ | ✔ | ✔ | no (pública, RLS la protege) | Vercel env (Build + Runtime) | infra |
| `SUPABASE_SERVICE_ROLE_KEY` | ✔ | ✔ | ✔ | **sí** | Vercel env (Runtime, Sensitive) | infra/owner |
| `NEXT_PUBLIC_ROOT_ORIGIN` | ✔ | ✔ | ✔ | no | Vercel env (Build + Runtime) | infra |
| `SECURITY_SALT` | – | ✔ | ✔ | **sí** | Vercel env (Runtime, Sensitive) | owner |
| `SII_ENCRYPTION_KEY` (32 chars) | – | ✔ | ✔ | **sí** | Vercel env (Runtime, Sensitive) | owner |
| `DEV_TOKEN_SECRET` (≥16) | – | recomendada | ✔ | **sí** | Vercel env (Runtime, Sensitive) | owner |
| `UPSTASH_REDIS_REST_URL` | – | ✔ | ✔ | **sí** | Vercel env (Runtime, Sensitive) | owner |
| `UPSTASH_REDIS_REST_TOKEN` | – | ✔ | ✔ | **sí** | Vercel env (Runtime, Sensitive) | owner |
| `BLUMI_SANDBOX_URL` | – | recomendada | ✔ | no | Vercel env (Runtime) | owner |

`SECURITY_SALT` y `SII_ENCRYPTION_KEY` son **material criptográfico estable**: si cambian sin
rotar los datos, todo lo cifrado con el valor anterior queda ilegible (PFX/CAF en `sii_config`,
secretos de pago por tienda en `settings`). No son "un secret más": son llaves.

### 4.2 Opcionales y sin uso

| Variable | Estado | Efecto si falta |
|---|---|---|
| `OPENAI_API_KEY` | opcional | descripciones con IA deshabilitadas |
| `GEMINI_API_KEY` | opcional | OCR de facturas de proveedor deshabilitado |
| `MASTER_KEY_ENCRYPTED` | opcional (legacy) | fallback del secreto de firma developer |
| `NEXT_PUBLIC_ROOT_DOMAIN` | opcional | sin resolución de tiendas por CNAME propio |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` / `NEXT_PUBLIC_SUPPORT_EMAIL` | opcional | placeholder de contacto |
| `PAYMENT_PROVIDER` | opcional | default `transbank` |
| `DB_MODE` | opcional | informativo, default `supabase` |
| `SII_API_URL`, `SII_ENVIRONMENT`, `FLOW_SANDBOX` | **sin uso** | ningún archivo del repo las lee: el ambiente SII vive en `sii_config.environment` y las credenciales de pago en `settings` (cifradas). No configurarlas en el platform store. |

Verificación de "sin uso": `grep -rn "SII_API_URL\|SII_ENVIRONMENT\|FLOW_SANDBOX" src scripts tests`.

### 4.3 Secretos de plataforma (GitHub Actions)

Por **environment** de GitHub (`staging` y `production`), distintos entre sí:

| Secret | Para qué |
|---|---|
| `VERCEL_TOKEN` | CLI/API de Vercel |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | a qué proyecto desplegar |
| `SUPABASE_ACCESS_TOKEN` | `supabase link` / `db push` |
| `SUPABASE_PROJECT_REF` | proyecto de ese entorno |
| `SUPABASE_DB_URL` | conexión directa (5432) para el modo `psql` del runner |

Los crea el **owner del repositorio** (acceso a Vercel y Supabase). Un agente solo puede
verificar su presencia, nunca leer su valor.

### 4.4 Cómo verificar que el secret store quedó bien

```bash
# 1) local: el entorno lógico debe pasar el gate
node scripts/check-env.mjs --target staging --file .vercel/.env.preview.local   # exit 0

# 2) remoto: comparar nombres y scopes reales del proyecto
vercel env ls preview
vercel env ls production

# 3) después de publicar, la app lo confirma en runtime
curl -s https://<url>/api/health | jq '{ok, env, release, db}'
```

El punto 3 es el único que prueba que la variable llegó al runtime: una variable cargada solo
en "Build" no existe en la función serverless.

---

## 5. Health check y smoke

| Endpoint | Tipo | Qué prueba | Respuesta OK |
|---|---|---|---|
| `GET /api/ping` | liveness | el proceso responde, sin tocar DB | `200 {"message":"pong"}` |
| `GET /api/health` | readiness | Supabase responde (`subscription_tiers`) + identidad del deploy | `200 {"ok":true,...}` / `503` si la DB falla |

`/api/health` expone además `env` (`VERCEL_ENV`), `release` (SHA corto), `region` y
`checks.db`. Eso permite afirmar **qué** versión está publicada, no solo que algo responde.

```bash
node scripts/smoke-deploy.mjs https://<url> --expect-env preview --expect-release <sha>
```

El script reintenta (cold start), valida headers de seguridad mínimos y falla con exit 1 si
cualquier chequeo falla. Un deploy sin smoke verde es un deploy no verificado.

---

## 6. Primer setup (una sola vez)

1. **Proyecto Vercel**: importar `d0blon/YAHPOS`, framework Next.js. Rama de producción `main`.
2. **Rama `staging`**: crearla desde `main` (`git push origin main:staging`). Sus pushes
   generan deployments Preview.
3. **Proyecto Supabase staging**: crear proyecto aparte; anotar URL, anon key, service role y
   la cadena directa (`postgresql://...` puerto 5432).
4. **Cargar variables**: Vercel → Project → Settings → Environment Variables. Repetir por scope
   (Preview / Production). Las sensibles deben marcarse como *Sensitive*.
5. **Upstash**: una base Redis por entorno (o prefijos distintos) y cargar URL/token.
6. **GitHub environments**: crear `staging` y `production`; en `production` activar
   *Required reviewers*. Cargar los secrets de §4.3 en cada uno.
7. **Baseline de migraciones** (solo la DB que ya existía hecha a mano):
   ```bash
   supabase link --project-ref <ref>
   supabase migration list          # columnas local | remoto
   # por cada migración YA aplicada a mano, sin volver a ejecutarla:
   supabase migration repair --status applied <version>
   ```
   Sin baseline, `supabase db push` intenta reaplicar 001→040 sobre un esquema que ya las tiene.
8. **Dominios**: dominio raíz en Vercel; wildcard `*.dominio` para tiendas; CNAME por tienda si
   se usa `NEXT_PUBLIC_ROOT_DOMAIN`. Actualizar `NEXT_PUBLIC_ROOT_ORIGIN` por entorno.
9. **Primer deploy**: `node scripts/deploy.mjs --target staging` y smoke verde.

---

## 7. Rollback

### 7.1 App (código / build)

Vercel conserva todos los deployments. El rollback es instantáneo y no requiere rebuild:

```bash
node scripts/rollback.mjs --target production --list          # ver últimos deployments
node scripts/rollback.mjs --target production --to https://<url-anterior> --yes
# equivalente con CLI: vercel rollback <url>
```

Después del rollback, **siempre**:

```bash
node scripts/smoke-deploy.mjs https://<url-anterior> --expect-env production
```

Si el problema es de código y no de datos, la alternativa auditable es `git revert <sha>` y un
deploy normal (deja rastro en git; el rollback de Vercel no).

### 7.2 Base de datos (si se aplicaron migraciones)

El rollback de app **no revierte SQL**. Dos escenarios:

| Caso | Acción |
|---|---|
| Migración compatible (aditiva: `ADD COLUMN` nullable, `CREATE TABLE`, `CREATE INDEX`) | No hacer nada. El código anterior ignora lo nuevo. |
| Migración incompatible (`DROP`, `ALTER TYPE`, `NOT NULL` sin default, backfill) | Restaurar por PITR o aplicar migración inversa. |

**PITR (Supabase)**: Dashboard → Database → Backups → *Point in Time Recovery* → elegir el
timestamp previo a la migración. El restore crea un proyecto nuevo: hay que actualizar
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` del
entorno y volver a desplegar. Verificar con `/api/health` y una lectura de datos real.

**Migración inversa**: escribir `supabase/migrations/0NN_rollback_<motivo>.sql` con el SQL
contrario (recrear columna/tabla desde un dump, revertir tipo), aplicarla con
`node scripts/db-migrate.mjs --target <entorno> --apply` y recién entonces redesplegar la app
anterior. No se "desaplica" una migración borrando su fila de `schema_migrations`.

**Regla de diseño** que hace esto barato: migraciones *expand → contract*. En un mismo release
nunca se agrega y se usa en el mismo paso la columna nueva; el `DROP` va en el release
siguiente, cuando ya no hay código que dependa de lo viejo.

### 7.3 Secretos

No se rotan como parte de un rollback. Cambiar `SECURITY_SALT` o `SII_ENCRYPTION_KEY` invalida
datos cifrados: la rotación es un procedimiento propio (`scripts/rotate-sii-encryption-key.mjs`
existe para SII) y va fuera del rollback.

### 7.4 Checklist post-rollback

- [ ] `/api/health` con `ok:true` y `release` = versión esperada.
- [ ] `/api/ping` responde.
- [ ] Login de una tienda real funciona (auth + RLS).
- [ ] POS: una venta de prueba no falla.
- [ ] Si hubo restore de DB: `sii_config` y `settings` descifran (certificado/CAF legibles).
- [ ] Incidente anotado en `docs/operacion/REGISTRO_BUGS.md` con hora, URL y sha revertido.

---

## 8. Troubleshooting conocido

| Síntoma | Causa | Fix |
|---|---|---|
| Todos los requests → `500 "Configuración de origen raíz inválida."` | `NEXT_PUBLIC_ROOT_ORIGIN` ausente o con path/query | setear origin limpio (ej. `https://app.dominio.cl`) y redesplegar |
| Build falla en `Supabase: Faltan NEXT_PUBLIC_SUPABASE_URL...` | variables solo en Runtime, no en Build | cargarlas también para Build en el scope correcto |
| Login/registro bloqueados en producción | Upstash sin configurar → rate limit fail-closed | cargar `UPSTASH_REDIS_REST_URL/TOKEN` |
| `CRITICAL SECURITY ERROR: SII_ENCRYPTION_KEY must be exactly 32 characters` | key con largo distinto de 32 | corregir el valor (no truncar a mano) |
| PFX/CAF ilegibles tras un deploy | cambió `SII_ENCRYPTION_KEY`/`SECURITY_SALT` | volver al valor anterior; rotar con script, no a mano |
| `supabase db push` quiere aplicar 001→040 sobre una DB existente | falta baseline | §6.7 (`migration repair --status applied`) |
| Deploy OK pero smoke falla en `entorno desplegado` | se comparó contra `staging` en vez de `preview` | usar `--expect-env preview` para staging |
| Hueco `016` en la secuencia de migraciones | no existe `016_*.sql` (015 → 017) | confirmado intencional en la auditoría de migraciones; no inventar el archivo |

---

## 9. Estado verificado (2026-11-23)

Ejecutado en este repo, con resultado real:

| Comprobación | Resultado |
|---|---|
| `node scripts/check-env.mjs --target local` | PASS (usa `.env.local` real) |
| `node scripts/check-env.mjs --target staging` sin variables | FAIL exit 1, lista de bloqueantes correcta |
| `node scripts/check-env.mjs --target staging --file <fixture>` | PASS exit 0 |
| `node scripts/deploy.mjs --target staging --dry-run` | plan completo de 5 pasos, exit 0 |
| `node scripts/db-migrate.mjs --target staging --plan` | detecta 39 migraciones y el hueco 016; aborta pidiendo psql/CLI |
| `node scripts/smoke-deploy.mjs http://localhost:3000 --expect-env local` | PASS 4/4 (con `/api/health` extendido) |
| `GET /api/health` en local | `{"ok":true,"db":"supabase","env":"local","release":"unknown","checks":{"db":"ok"}}` |

**No verificado todavía, requiere credenciales del owner:**

- Deploy real a staging (falta `VERCEL_TOKEN` + proyecto linkeado y un proyecto Supabase staging).
- Variables cargadas en el secret store de Vercel (no hay acceso a la API de Vercel desde este entorno).
- Migraciones aplicadas contra la DB de staging.
- Primer run del workflow en GitHub (falta `gh`/token en esta máquina).

En cuanto existan `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` y `SUPABASE_DB_URL` de staging, la
verificación es un solo comando: `node scripts/deploy.mjs --target staging`.
