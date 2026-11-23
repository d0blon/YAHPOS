# Variables de entorno — inventario y contrato

Documento de referencia para desarrollo, CI y deploy. La plantilla ejecutable es
`.env.example`; este documento explica **qué es cada variable, en qué entorno es
obligatoria y de dónde se obtiene el valor real**.

> Última verificación del inventario: **2026-11-23**, medida con
> `grep` sobre `src/`, `scripts/`, `next.config.ts` y contraste con `.env.local`.
> No se inventaron valores: las variables sin valor real se marcan como
> **pendientes (D-001)**.

---

## 1. Cómo se valida el entorno

Hay tres capas, con un solo contrato de nombres:

| Capa | Archivo | Cuándo corre | Qué hace |
|---|---|---|---|
| Runtime / build de la app | `src/lib/env.ts` | `next build` (`next.config.ts`) y arranque del servidor (`src/instrumentation.ts`) | Falla con un mensaje que lista **todas** las variables faltantes o inválidas. |
| Gate de deploy/staging | `scripts/check-env.mjs` + `scripts/lib/env-schema.mjs` | `npm run env:check` (o `env:check:staging` / `env:check:prod`) | Valida presencia y formato por entorno (`local`, `staging`, `production`). |
| Contrato SII | `src/lib/sii/env-config.ts` + `scripts/sii-env-check.mjs` | `npm run sii:env:check` | Valida certificado, CAF, RUT emisor y ambiente SII. |

Los tres deben mantenerse alineados. Si agregas una variable, actualiza:
`src/lib/env.ts` (si la usa la app), `.env.example` y este documento.

### Comportamiento fail-fast

- **Build**: `next.config.ts` llama a `assertEnv({ phase: 'build' })`. Solo exige
  las variables públicas necesarias para compilar/inlinear (`NEXT_PUBLIC_*`).
- **Runtime**: `src/instrumentation.ts` llama a `assertEnv({ phase: 'runtime' })`
  al arrancar (`next dev` / `next start`). Exige las obligatorias del entorno.
- Las variables **recomendadas** que faltan se imprimen como `[env] …` warning,
  no abortan.
- `SKIP_ENV_VALIDATION=1` permite saltar la validación **solo fuera de
  producción** (para experimentos locales). En producción se ignora.
- El mensaje nunca imprime valores: solo nombres, motivo y longitud cuando aplica.

Ejemplo de salida:

```
[env] Configuración inválida (production): 3 problema(s)

  ✗ NEXT_PUBLIC_SUPABASE_URL — faltante (obligatoria en production)
  ✗ SII_ENCRYPTION_KEY — debe tener exactamente 32 caracteres (actual: 12)
  ✗ NEXT_PUBLIC_ROOT_ORIGIN — debe ser solo el origin, sin path, query ni hash (ej: https://app.ejemplo.cl)

Revisa .env.example (plantilla) y docs/env.md (inventario y cómo obtener cada valor).
```

---

## 2. Inventario

Leyenda de entornos: **L** = local/dev, **S** = staging, **P** = producción.
`●` obligatoria · `◐` recomendada (warning si falta) · `○` opcional · `—` no aplica.

| Variable | Alcance | L | S | P | Secreta | Propósito | Ejemplo (no real) |
|---|---|:-:|:-:|:-:|:-:|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | público | ● | ● | ● | no | URL del proyecto Supabase; se inlinea en el bundle. | `https://tu-proyecto.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | ● | ● | ● | no | Anon key; pública por diseño, RLS protege los datos. | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | ● | ● | ● | **sí** | Service role; bypassa RLS. Solo `createAdminClient()` y scripts. | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXT_PUBLIC_ROOT_ORIGIN` | público | ● | ● | ● | no | Origin raíz para SSO; sin ella `src/proxy.ts` responde 500. | `https://app.yahpos.cl` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | público | ○ | ◐ | ◐ | no | Host CNAME del root (sin scheme/puerto) para resolver tenant por dominio. **D-001: pendiente.** | `root.yahpos.cl` |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | público | ○ | ◐ | ◐ | no | Correo público de soporte (footer, upgrade, editor). **D-001: pendiente.** | `soporte@yahpos.cl` |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | público | ○ | ○ | ○ | no | WhatsApp de soporte; default en código `56912345678`. | `56912345678` |
| `SECURITY_SALT` | servidor | ○ | ● | ● | **sí** | Salt scrypt del secreto maestro. Cambiarlo invalida lo cifrado. | `salt-aleatorio-largo` |
| `SII_ENCRYPTION_KEY` | servidor | ○ | ● | ● | **sí** | AES-256-GCM para CAF/certificados. **Exactamente 32 caracteres.** | `0123456789abcdef0123456789abcdef` |
| `MASTER_KEY_ENCRYPTED` | servidor | ○ | ◐ | ◐ | **sí** | Secreto maestro cifrado del panel developer. Sin él, el login developer falla. | `iv:payload` |
| `DEV_TOKEN_SECRET` | servidor | ○ | ● | ● | **sí** | HMAC de la cookie del panel developer (mín. 16 chars). | `secreto-aleatorio-largo` |
| `UPSTASH_REDIS_REST_URL` | servidor | ○ | ● | ● | no | Redis para rate limiting distribuido. Sin él, en producción el límite falla cerrado. | `https://tu-instancia.upstash.io` |
| `UPSTASH_REDIS_REST_TOKEN` | servidor | ○ | ● | ● | **sí** | Token de Upstash. | `AXxxASQg...` |
| `BLUMI_SANDBOX_URL` | servidor | ○ | ● | ● | no | Base URL del cliente Blumi (DTE); fail-closed en producción. | `https://dte.blumi.cl/api/v1/sandbox` |
| `OPENAI_API_KEY` | servidor | ○ | ○ | ○ | **sí** | IA (descripciones). Sin key, esa función se deshabilita. | `sk-...` |
| `GEMINI_API_KEY` | servidor | ○ | ○ | ○ | **sí** | OCR de facturas de proveedor. | `AIza...` |
| `PAYMENT_PROVIDER` | servidor | ○ | ○ | ○ | no | `flow` o `transbank`; cualquier otro valor => transbank. | `transbank` |
| `DB_MODE` | servidor | ○ | ○ | ○ | no | Etiqueta informativa de `/api/health`. Solo `supabase` implementado. | `supabase` |
| `SII_ENV` | servidor | ○ | ○ | ○ | no | Ambiente SII por defecto: `certification` (maullín) / `production` (palena). | `certification` |
| `SII_BASE_URL` | servidor | ○ | ○ | ○ | no | Override de host SII para mock/proxy. Vacío = canónico. | `https://maullin.sii.cl` |
| `SII_CERT_PATH` | servidor | ○ | ●* | ●* | no | Ruta al PFX/P12 fuera del repo (*solo herramientas SII). | `C:/secrets/emisor.pfx` |
| `SII_CERT_PASSWORD` | servidor | ○ | ●* | ●* | **sí** | Password del PFX (*solo herramientas SII). | `(secreto)` |
| `SII_CERT_PFX_BASE64` | servidor | ○ | ○ | ○ | **sí** | Alternativa: PFX en base64 para CI/secret manager. | `MIIK...` |
| `SII_CAF_DIR` | servidor | ○ | ○ | ○ | no | Directorio de CAF; fuera de git. | `certs/sii/caf` |
| `SII_RUT_EMISOR` | servidor | ○ | ○ | ○ | no | RUT del emisor sin puntos (cruza certificado y CAF). | `76123456-0` |
| `SII_TIMEOUT_MS` | servidor | ○ | ○ | ○ | no | Timeout de red contra el SII. | `30000` |
| `SUPABASE_URL` | scripts | ○ | ○ | ○ | no | Alias legado de `NEXT_PUBLIC_SUPABASE_URL` para scripts `*.mjs`. | `https://tu-proyecto.supabase.co` |
| `STORE_ID` | scripts | ○ | ○ | ○ | no | UUID de tienda para scripts de seed/validación. | `00000000-0000-...` |
| `TEST_USER_PASSWORD` | scripts | ○ | ○ | ○ | **sí** | Password del usuario de pruebas de `setup_test_user.mjs`. | `(secreto)` |
| `ALLOW_SIGNUP_PROBE` | scripts | ○ | ○ | ○ | no | Habilita probe destructiva de signup (`0`/`1`). | `0` |

\* El runtime multi-tenant lee el certificado desde la configuración cifrada por
tienda (`sii_config`). `SII_CERT_*` aplica a las herramientas/CLI y al deploy que
firma documentos localmente.

`NODE_ENV` la administra Next.js: no se configura a mano. `vercel.json` la fuerza
a `production` (revisar si eso sigue siendo deseado al definir el deploy).

---

## 3. De dónde se obtiene cada valor

| Variable(s) | Origen |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → *Project Settings* → *API*. La service role key se revela con el botón *Reveal*. |
| `NEXT_PUBLIC_ROOT_ORIGIN` | Dominio raíz de la plataforma. Local: `http://localhost:3000`. Staging/prod: el dominio real (`https://staging.yahpos.cl`, `https://app.yahpos.cl`). |
| `NEXT_PUBLIC_ROOT_DOMAIN`, `NEXT_PUBLIC_SUPPORT_EMAIL` | **Pendiente D-001** — el dueño debe entregarlos. Mientras tanto hay fallback en código. |
| `SECURITY_SALT`, `DEV_TOKEN_SECRET` | Generar con `openssl rand -base64 32`. Deben ser estables entre despliegues. |
| `SII_ENCRYPTION_KEY` | `openssl rand -hex 16` (32 caracteres). **No rotar sin ejecutar** `npm run` → `scripts/rotate-sii-encryption-key.mjs`, o los CAF/PFX cifrados quedan ilegibles. |
| `MASTER_KEY_ENCRYPTED` | Se genera con `scripts/reset_master_key.js` (pide la password maestra y el TOTP). |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → base de datos → *REST API*. |
| `BLUMI_SANDBOX_URL` | Proveedor Blumi (documentación de integración DTE). Sandbox: `https://dte.blumi.cl/api/v1/sandbox`. |
| `OPENAI_API_KEY` | platform.openai.com → *API keys*. |
| `GEMINI_API_KEY` | Google AI Studio → *Get API key*. |
| `SII_CERT_PATH`, `SII_CERT_PASSWORD`, `SII_CERT_PFX_BASE64` | Certificado digital del emisor (SII). Guardar fuera del repo (`certs/` está ignorado). |
| `SII_RUT_EMISOR`, `SII_CAF_DIR` | Datos del emisor y carpeta local de CAF (`certs/sii/caf`). |
| `STORE_ID`, `TEST_USER_PASSWORD` | Se definen al correr los scripts; no hay valor de producción. |

---

## 4. Configuración por entorno

### Local

```bash
cp .env.example .env.local
# completar los valores reales de Supabase + service role + SII_ENCRYPTION_KEY
npm run dev
```

Obligatorias reales en local: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_ROOT_ORIGIN`. El resto puede quedar vacío: se avisa, no se aborta.

### CI (GitHub Actions)

El build **no** necesita secretos reales. Usar valores dummy (nunca secretos
reales en el YAML) y dejarlos en `env:` del workflow:

```yaml
env:
  NEXT_PUBLIC_SUPABASE_URL: https://ci.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ci-anon-key-not-a-real-key-00000000000000000000
  NEXT_PUBLIC_ROOT_ORIGIN: http://localhost:3000
  SUPABASE_SERVICE_ROLE_KEY: ci-service-role-key-not-a-real-key-000000000000000
  SII_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef"
  SECURITY_SALT: ci-security-salt-not-real-000000
  DEV_TOKEN_SECRET: ci-dev-token-secret-not-real
  UPSTASH_REDIS_REST_URL: https://ci.upstash.io
  UPSTASH_REDIS_REST_TOKEN: ci-upstash-token-not-real-000000
  BLUMI_SANDBOX_URL: https://dte.blumi.cl/api/v1/sandbox
  NEXT_PUBLIC_ROOT_DOMAIN: ci.yahpos.cl
  NEXT_PUBLIC_SUPPORT_EMAIL: ci@yahpos.cl
  NEXT_PUBLIC_SUPPORT_WHATSAPP: "56911111111"
  PAYMENT_PROVIDER: transbank
  DB_MODE: supabase
```

Solo `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y
`NEXT_PUBLIC_ROOT_ORIGIN` son necesarias para `next build`; el resto evita
warnings y permite que `npm run check-env` pase en staging.
Las claves reales (si algún job las necesita) van en *Repository secrets*.

### Staging y producción

Configurar en el secret store del hosting (Vercel → *Settings* → *Environment
Variables*, o el secret manager equivalente), separadas por entorno. Nunca en
el repositorio.

Orden recomendado de un deploy:

1. Definir/verificar variables del entorno (`npm run env:check -- --target staging`).
2. `npm run build`
3. Migraciones (`npm run db:migrate` o el procedimiento de `docs/operacion/DEPLOY.md`).
4. `npm start` / publicar. El arranque valida el entorno y falla si falta algo.
5. `smoke-deploy` / health check (`/api/health`).

Responsable de cargar los secretos: el dueño del proyecto (Blaz Baez). El CI no
debe escribir secretos; solo consumirlos.

---

## 5. Pendientes y deuda conocida

- **D-001**: faltan los valores reales de `NEXT_PUBLIC_ROOT_DOMAIN` y
  `NEXT_PUBLIC_SUPPORT_EMAIL` en `.env.local`. Se declaran como recomendadas
  (warning), no se inventan.
- `SII_API_URL`, `SII_ENVIRONMENT`, `FLOW_SANDBOX`, `POSTGRES_URL` figuran en
  documentación histórica pero **ningún archivo del código las lee** (verificado
  con `grep`). No configurarlas.
- `MASTER_KEY_ENCRYPTED`: en producción es recomendada; sin ella el panel
  developer no permite login, pero la app opera.
- `vercel.json` fija `NODE_ENV=production`; revisar al definir entornos.

---

## 6. Seguridad: secretos y rotación

Estado verificado el 2026-11-23:

- `.env.local` **no** está trackeado (`git ls-files` solo devuelve
  `.env.example`). `.gitignore` cubre `.env*` excepto `.env.example`.
- `pruebas-local/certificado/test.pfx` estaba **trackeado** con material de clave
  privada. Se removió del índice (`git rm --cached`) y el directorio está
  ignorado. Si ese PFX fue alguna vez el certificado real del SII, **revocarlo y
  renovarlo**; si era autofirmado de pruebas, no requiere rotación.
- `scratch/get_user.ts` contenía una key de Supabase hardcodeada en el historial
  (removida en el commit `592fc9d`). Como sigue en el historial de git, **rotar
  service role key y anon key** en Supabase.
- `scripts/setup_test_user.mjs` tenía el password del usuario de pruebas
  hardcodeado. Ahora se lee de `TEST_USER_PASSWORD` (fail-closed). **Rotar el
  password de `antigravity@patagoniapos.cl`** en Supabase Auth.
- `scripts/rcof-validacion.ts` contiene `PFX_PASSWORD = 'prueba123'`: es la
  password documentada de un fixture autofirmado de `dte-parity`, no un secreto
  real.
- `docs/archivo/session-ses_2182.md` contiene `[REDACTED]` en lugar de claves
  (verificado); no hay secretos reales ahí.

Checklist de rotación recomendado:

1. Supabase → *Project Settings* → *API* → rotar service role y anon keys.
2. Cambiar password del usuario de pruebas.
3. Regenerar `SII_ENCRYPTION_KEY` solo con `rotate-sii-encryption-key.mjs`.
4. Revisar el PFX del SII y su vigencia.
5. Confirmar `git log --all -- .env .env.local` vacío antes de publicar el repo.

---

## 7. Variables que NO son de entorno

Los secretos de pago (`flow`, `webpay/transbank`, `blumi`, `mercadopago`, `tuu`)
se guardan **cifrados por tienda** (AES-256-GCM) en la tabla `settings` y se
administran desde el panel admin. No agregarlas al entorno. Detalle:
`docs/arquitectura/PAYMENTS-ARCHITECTURE.md`.
