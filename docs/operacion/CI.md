# CI — Integración continua

Workflow: [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
Plataforma: **GitHub Actions** (el repo vive en `github.com/d0blon/YAHPOS`).

## Cuándo corre

| Evento | Rama | Qué hace |
|---|---|---|
| `push` | `main`, `master` | pipeline completo |
| `pull_request` | hacia `main`, `master` | pipeline completo |

`concurrency.cancel-in-progress: true`: si empujas varios commits seguidos, se cancelan
los runs obsoletos y solo termina el último. No queda cola de runs viejos consumiendo minutos.

## Gates (en este orden)

| # | Paso | Comando | ¿Bloquea el merge? |
|---|---|---|---|
| 1 | Preflight de variables | `node scripts/check-env.mjs --target local` | Sí — falla cerrado si falta una var requerida |
| 2 | Install | `npm ci --no-audit --no-fund` | Sí |
| 3 | Typecheck | `npm run typecheck` (`tsc --noEmit`) | Sí |
| 4 | Unit tests | `npm run test:ci` (`jest --ci --forceExit`) | Sí |
| 5 | Build | `npm run build` (`next build --webpack`) | Sí |
| 6 | Lint | `npm run lint` | **No** (`continue-on-error`) — ver deuda |

Cada paso tiene `id`, y el paso final **Resumen de gates** (`if: always()`) publica una tabla
en el *job summary* y emite `::error::Paso fallido → <paso>` en el log, para que se vea de un
vistazo qué gate se rompió sin leer las 300 líneas del build.

## Versión de Node

Fijada en [`.nvmrc`](../../.nvmrc) → **Node 24** (el proyecto usa Next 16 + React 19; Node 24
es la versión con la que se desarrolla y se verificó el build). El workflow la lee con
`actions/setup-node` + `node-version-file: .nvmrc`, así el número vive en un solo lugar.
Si actualizas Node, cambia `.nvmrc` y el CI lo sigue solo.

## Variables de entorno en CI

Fuente de verdad del contrato: `.env.example` + `src/lib/env.ts` (auditoría `t_20d528b3`).

- El job define un bloque `env:` con **dummies públicos** que son válidos por formato
  (`https://ci-stub.supabase.co`, claves `ci_stub_*`, `SII_ENCRYPTION_KEY` de 32 caracteres)
  para que el build pueda compilar y validar sin tocar servicios reales.
- **No hay secretos en el YAML.** Los dummies no dan acceso a nada: son marcadores con forma válida.
- Si algún día un paso necesitara una credencial real, se lee con `${{ secrets.NOMBRE }}`:

  ```yaml
  env:
    MI_TOKEN: ${{ secrets.MI_TOKEN }}
  ```

  y se documenta acá + se carga en **Settings → Secrets and variables → Actions**.

### Secretos que el maintainer debe cargar

**Ninguno para el pipeline actual.** Typecheck, tests y build corren con dummies; no se conectan
a Supabase, SII, Upstash ni pasarelas.

Se necesitarían solo si se agrega un job de integración E2E contra un entorno real:

| Secreto | Uso futuro |
|---|---|
| `CI_SUPABASE_URL` / `CI_SUPABASE_ANON_KEY` | proyecto Supabase de staging para tests de integración |
| `CI_SUPABASE_SERVICE_ROLE_KEY` | fixtures/limpieza (nunca en un job de PR de fork) |
| `VERCEL_TOKEN` | deploy desde CI (hoy lo hace Vercel por su propia integración) |

> Regla: los secretos nunca se imprimen ni se pasan a un `pull_request` de fork sin `environment`
> con aprobación.

## Job manual de ambiente SII

`.github/workflows/sii-env-check.yml` **no corre en PRs**: se dispara con
`workflow_dispatch` porque necesita el certificado real del emisor. Lee
`SII_CERT_PFX_BASE64`, `SII_CERT_PASSWORD`, `SII_RUT_EMISOR` y
`SII_ENCRYPTION_KEY` desde *repository secrets*, escribe el PFX en
`$RUNNER_TEMP` con permisos `600`, no imprime valores y omite los CAF con
`--allow-empty-caf` (los folios no se versionan). Detalle en
[`SII_ENTORNO_CERTIFICACION.md`](SII_ENTORNO_CERTIFICACION.md).

## Branch protection (obligatorio para el maintainer)

El workflow solo sirve si el merge lo respeta. En GitHub: **Settings → Branches → Add branch
ruleset** (o *Add rule*) sobre `main`:

1. **Require a pull request before merging** (mínimo 1 aprobación).
2. **Require status checks to pass before merging** → seleccionar el check
   `Lint / Typecheck / Test / Build` (nombre del job en `ci.yml`) y marcar
   *Require branches to be up to date before merging*.
3. **Block force pushes** y **Restrict deletions** en `main`.
4. Opcional pero recomendado: *Do not allow bypassing the above settings* (ni admins).

Sin el paso 2, un PR con tests rojos puede mergearse igual.

## Reproducir el CI en local

```bash
nvm use                 # o instala Node 24 a mano
npm ci                  # mismo install que CI (lockfile, sin tocar package.json)
npm run typecheck
npm run test:ci
npm run build
npm run lint            # informativo
```

Para verificar el contrato de variables antes de empujar:

```bash
node scripts/check-env.mjs --target local
```

## Deuda conocida

| Tema | Estado | Qué falta |
|---|---|---|
| **Lint no bloqueante** | Hoy `npm run lint` sale 0 en `main`, pero el sprint reportó ~500 problemas preexistentes según la config previa: el baseline todavía no se considera estable | Confirmar el baseline durante 1–2 sprints y después quitar `continue-on-error: true` del paso Lint para volverlo bloqueante |
| **E2E (Playwright) fuera del CI** | `playwright.config.ts` está en `.gitignore` y no hay app levantada en CI | Versionar la config + job con `web server` y navegadores cacheados |
| **Contrato de env** | `scripts/check-env.mjs`, `src/lib/env.ts` y `docs/env.md` vienen de `t_20d528b3`; si esa tarjeta cambia nombres, el preflight es el primero en avisar | — |
| **`D-001`** | `.env.local` no define `NEXT_PUBLIC_ROOT_DOMAIN` ni `NEXT_PUBLIC_SUPPORT_EMAIL` | Completarlas en el entorno real (no afecta CI: son de runtime) |
| **`public/sw.js`, `public/workbox-*.js`** | El build los regenera (next-pwa) y quedan como *modified* en el árbol local | Versionarlos generados o ignorarlos; hoy no rompe CI |

## Troubleshooting

- **`npm ci` falla con "lock file does not satisfy"**: alguien editó `package.json` sin correr
  `npm install`. Regenerar `package-lock.json` y commitearlo.
- **Build OOM (exit 137 / "JavaScript heap out of memory")**: subir `NODE_OPTIONS` en el job
  (`--max-old-space-size=4096` es el valor actual).
- **"Another next build process is already running"**: lock residual en `.next/lock` de un build
  interrumpido; borrarlo antes de reintentar. En CI el runner siempre está limpio.
- **Tests cuelgan después de terminar**: el job usa `--forceExit` por handles abiertos conocidos
  en tests que mockean clientes de red. No oculta fallos: el exit code sigue siendo el de Jest.
