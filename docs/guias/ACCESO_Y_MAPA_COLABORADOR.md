# Guía de acceso y mapa de archivos — para el colaborador y su IA

> **Para quién es:** para vos, el amigo del dueño que se suma a YAHPOS! y arrancás **de cero**, como se define en [`CURRICULUM_COLABORADOR.md`](CURRICULUM_COLABORADOR.md). No hace falta que sepas programar.
>
> **Cómo se usa:** el dueño te entrega este doc. Vos se lo entregás a tu IA. Vos explorás de forma visual y lógica; la IA solo anota y arma el reporte. Nadie arregla ni toca `main`. El único commit que podés hacer es tu reporte diario, en tu propia rama, al terminar el día.

---

## Qué se te pide

- Trabajar **una tarea `T-###` a la vez**. Las tareas se siguen en `TAREAS_COLABORADOR.md`.
- Buscar con **datos de prueba**, nunca con datos reales de clientes.
- Reportar cada hallazgo como `HAL-###` **en tus palabras**. Tu texto se copia literal: nadie te lo reescribe.
- No editar código ni tocar `main`. Al terminar el día subí **solo** tu reporte a la rama `reportes/<tu-slug>` (nunca a `main`).
- No crear `BUG-###` por tu cuenta. Recién existe cuando el dueño autoriza.
- Al empezar cada día (o con la palabra clave «revisa arreglos en github»), pedile a tu IA que revise qué arreglos subió el dueño a `main`.

---

## Accesos que el dueño te da

| Acceso | Para qué sirve |
|---|---|
| Repo en lectura + copia | Leer y practicar sin tocar el original |
| Un proyecto Supabase de PRUEBA (gratis) | Correr la app en tu compu |
| Tu propia identidad de git | Que los cambios queden a tu nombre |
| La herramienta del mapa (graphify) | Explorar el código sin PROGRAMAR |

> **NUNCA:** las llaves de PRODUCCIÓN, la LLAVE MAESTRA de la bodega real ni el certificado real del SII. Solo cosas de prueba. Tampoco pegues tokens, contraseñas ni correos reales en capturas ni en reportes.

### URLs de prueba (local)

| URL | Qué ves |
|---|---|
| `http://master.localhost:3000` | **Tienda master**: homepage con productos reales de prueba. Es la que más importa para revisar. |
| `http://localhost:3000/` | Landing de la plataforma (marketing, no una tienda). |
| `http://localhost:3000/developer/catalog` | Catálogo maestro de productos. |

- `/admin` y `/pos` dentro de la URL de la tienda piden login con el usuario de prueba que te entrega el dueño; sin sesión redirigen a `/login`.
- No necesitás `.env.local`, llaves ni tokens para revisar estas URLs (pero sí para correr la app local).

---

## Preparar tu copia

1. Pedile al dueño la URL o la carpeta del repo. Copiala o clonala en tu compu. No trabajes directo sobre la copia del dueño.
2. Entrá a la carpeta `austral-market-next` y correr:

```bash
npm install
```

3. Copiá `.env.example` a `.env.local`. En Windows podés usar:

```bash
copy .env.example .env.local
```

   Pedile al dueño **valores de PRUEBA** para estas variables. No inventes valores:

| Variable | Qué configurar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase de prueba |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública del proyecto de prueba |
| `NEXT_PUBLIC_ROOT_ORIGIN` | Origen raíz que te pase el dueño, sin path, query ni hash |
| `NEXT_PUBLIC_ROOT_DOMAIN` | Dominio raíz de prueba que te pase el dueño, sin scheme ni puerto |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | Correo de soporte de prueba. En `.env.example` aparece comentado: pedir el valor al dueño |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo si aplica a tu entorno de prueba y el dueño te la entrega. Es sensible: nunca valor de producción |

> Si falta `NEXT_PUBLIC_ROOT_ORIGIN`, el proxy responde 500. Pedírsela al dueño, no la inventes.

4. Abrí la carpeta `austral-market-next` en VS Code o Cursor.
5. Corré la app:

```bash
npm run dev
```

6. Abrí `localhost:3000` en el navegador. Ahí vas a mirar las pantallas.

---

## Cómo mirar sin programar

- **Explorador de archivos:** mirá la lista de carpetas y archivos. Solo mirás; no arrastres ni borres nada.
- **Buscador por nombre:** `Ctrl+P`. Escribí una palabra, por ejemplo `carrito`, y ves qué archivos coinciden.
- **Buscador por texto:** `Ctrl+Shift+F`. Buscá un texto que viste en pantalla, por ejemplo un botón o un mensaje.
- **Navegador:** recorré la app con datos de prueba. Anotá qué esperabas y qué pasó.
- **Capturas:** guardalas solo si no muestran datos reales, tokens ni correos de clientes. Si aparece algo real, no guardes la captura: pedí datos de prueba.
- **Repetí cada hallazgo dos veces.** Si no se repite, escribilo igual pero marcá `Repetible: No lo sé`. No lo descarte sin avisar.

---

## Mapa pantalla → archivo

Rutas reales verificadas en `src/app`:

| Lo que ves | Ruta en la app | Archivo real |
|---|---|---|
| Portada tienda | `/` | `src/app/(shop)/page.tsx` |
| Producto | `/producto/[slug]` | `src/app/(shop)/producto/[slug]/page.tsx` |
| Buscar | `/buscar` | `src/app/(shop)/buscar/page.tsx` |
| Carrito | `/carrito` | `src/app/(cart)/carrito/page.tsx` |
| Checkout | `/checkout` | `src/app/(cart)/checkout/page.tsx` |
| Caja POS | `/pos` | `src/app/(pos)/pos/page.tsx` |
| Pantalla del cliente | `/pos/customer-display` | `src/app/(pos)/pos/customer-display/page.tsx` |
| Login | `/login` | `src/app/(auth)/login/page.tsx` |
| Registro | `/registro` | `src/app/(auth)/registro/page.tsx` |
| Administración | `/admin/productos`, `/admin/pedidos`, `/admin/clientes`, `/admin/reportes`, `/admin/configuracion` | `src/app/admin/*` — por ejemplo `src/app/admin/productos/page.tsx`, `src/app/admin/pedidos/page.tsx`, `src/app/admin/clientes/page.tsx`, `src/app/admin/reportes/page.tsx`, `src/app/admin/configuracion/page.tsx` |
| APIs | `/api/*` | `src/app/api/*` |

> La ruta entre paréntesis, como `(shop)`, `(cart)`, `(pos)` o `(auth)`, es solo una agrupación del proyecto. **No se escribe en la URL.**

---

## Herramienta del mapa (graphify)

- El grafo existe en `graphify-out/graph.json`, en la **RAÍZ del workspace**, o sea en la carpeta `E-commerce Project`. **No está dentro de** `austral-market-next`.
- Si tu IA tiene esa herramienta, puede preguntar por módulos y relaciones. Es solo lectura.
- Si no la tiene, igual sirve el mapa de arriba: pantalla, ruta y archivo.

---

## Orden de lectura para tu IA

Pedile que lea en este orden:

1. [`README.md`](../README.md) — índice de la documentación compartida.
2. [`EMPIEZA_AQUI.md`](EMPIEZA_AQUI.md) — mapa mental.
3. [`CURRICULUM_COLABORADOR.md`](CURRICULUM_COLABORADOR.md) — tu plan y tus reglas.
4. [`PROTOCOLO_CAZABUGS.md`](../operacion/PROTOCOLO_CAZABUGS.md) — flujo conjunto, Modo IA y plantillas.
5. [`TAREAS_COLABORADOR.md`](../operacion/TAREAS_COLABORADOR.md) — tablero de tareas.
6. [`REGISTRO_BUGS.md`](../operacion/REGISTRO_BUGS.md) — bandeja de hallazgos y fuente única de verdad.
7. [`ARCHITECTURE.md`](../arquitectura/ARCHITECTURE.md) — arquitectura.

---

## Prompt para entregarle a tu IA

Copiá y pegá este bloque:

```text
Modo solo lectura + análisis + reporte. Lee, en este orden, `docs/README.md`, `docs/guias/EMPIEZA_AQUI.md`, `docs/guias/CURRICULUM_COLABORADOR.md`, `docs/guias/ACCESO_Y_MAPA_COLABORADOR.md`, `docs/operacion/PROTOCOLO_CAZABUGS.md` (secciones «Flujo de trabajo conjunto» y «Modo IA — SOLO ANOTAR, NUNCA IMPLEMENTAR»), `docs/operacion/TAREAS_COLABORADOR.md`, `docs/operacion/REGISTRO_BUGS.md` y `docs/arquitectura/ARCHITECTURE.md`. NO leas `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `docs/operacion/INSTRUCCIONES_PARA_OPENCODE.md` ni `docs/operacion/CONTEXT_FOR_CLAUDE.md`: son instrucciones privadas del dueño y no están en el clone; si algún doc las menciona, tratá esa mención como «fuente no disponible» y usá `PROTOCOLO_CAZABUGS.md` en su lugar.

Al empezar cada conversación, y cuando yo diga «revisa arreglos en github», «sync github», «¿qué arreglaron?», «actualiza», «ver fixes» o «sincroniza»: hacé `git fetch origin` y `git status --short --branch`. Si estás en `reportes/<slug>` con cambios sin commitear, no cambies de rama: terminá el reporte y esperá mi confirmación. Si no hay cambios propios, `git switch main` y `git pull --ff-only origin main` para traer los arreglos a la copia. Nunca hagas `merge`, `rebase`, `reset` ni `--force`; si el pull falla, mostrás el error y esperás al dueño. Compará el SHA de `origin/main` contra el guardado en `C:\Users\<usuario>\Documents\YAHPOS_ultimo_sync.txt`, mirá `git log <sha_anterior>..origin/main --oneline` y leé `docs/operacion/REGISTRO_BUGS.md` del working tree (o `git show origin/main:docs/operacion/REGISTRO_BUGS.md`). Mostrá una tabla con: HAL-### → decisión del dueño → BUG-### → commit → estado (ABIERTO/CERRADO/DIFERIDO/NO_BUG) → qué significa para mí. Después actualizá ese archivo externo con el SHA nuevo. Si no podés ejecutar comandos, pedime que te pegue la salida. Si algo no se puede verificar, escribí «no verificado». Terminá con `Sincronización completada — copia alineada con origin/main (<SHA>); sin cambios propios en el repo`.

Yo no sé programar: por cada hallazgo explicá con palabras simples, sin corregir mi redacción, y entregá: título corto; «En mis palabras» con mi texto literal; «Cómo abordarlo / cómo reproducirlo» (pantalla o ruta, pasos numerados, datos de prueba, qué esperaba y qué pasó); cómo funciona esa parte (flujo real + `archivo:línea`); causa probable; alcance exacto (archivos, rutas y tablas); idea de arreglo (máx. 2 opciones, sin código); riesgo (`S1`–`S4` + cambio `BAJO`/`MEDIO`/`ALTO`); blast radius; pruebas sugeridas (positiva y, si toca auth/roles/`store_id`/RLS, negativa); DO NOT. Todo análisis termina con `Estado: ANALIZADO — SIN IMPLEMENTAR`.

Al terminar mi día, juntá todos los hallazgos en `docs/operacion/REPORTES_COLABORADOR/YYYY-MM-DD_<slug>.md` con resumen final, mostrame el diff, preguntame «¿subo el reporte ahora?» y solo con mi confirmación hacé commit en la rama `reportes/<slug>` (nunca `main`) con mensaje `reporte: YYYY-MM-DD <slug>` y `git push origin reportes/<slug>`. No edites `REGISTRO_BUGS.md`, código, Kanban, `AGENTS.md`, `BITACORA.md` ni `TASK_HANDOFF.md`. No escribas secretos, tokens, contraseñas ni correos reales.
```

---

## Qué te tiene que devolver la IA

Checklist. Si falta alguno, pedilo:

- [ ] Título corto y «En mis palabras» con tu texto literal, sin corregirlo.
- [ ] Cómo abordarlo / reproducirlo: ruta, pasos, datos de prueba, esperado vs. real.
- [ ] Cómo funciona esa parte, con flujo real y `archivo:línea`.
- [ ] Causa probable.
- [ ] Idea de arreglo: máximo 2 opciones, sin código.
- [ ] Nivel de riesgo: severidad `S1`–`S4` más cambio `BAJO` / `MEDIO` / `ALTO`.
- [ ] Archivos, rutas y tablas exactos. Si algo no lo vio: «no verificado».
- [ ] Blast radius: qué más podría verse afectado.
- [ ] Pruebas sugeridas: positiva y, si toca auth/roles/`store_id`/RLS, también negativa.
- [ ] DO NOT: qué no se debe hacer.
- [ ] Estado final: `ANALIZADO — SIN IMPLEMENTAR`.

Recordatorio: tu hallazgo sigue **en tus palabras**. La IA lo copia textual en «En mis palabras»; no te lo corrige.

**Riesgo de cambio:** ante duda, elegir el nivel más alto.

| Riesgo de cambio | Significado |
|---|---|
| **BAJO** | 1 archivo UI/texto, sin DB. |
| **MEDIO** | varios archivos o consultas de lectura. |
| **ALTO** | auth, roles, `store_id`, RLS, esquema DB, DTE/SII o pagos. |

---

## Cómo entregar el resultado

1. Buscá primero en la bandeja de [`REGISTRO_BUGS.md`](../operacion/REGISTRO_BUGS.md) si ya existe el hallazgo, por ID, título o palabras clave.
2. **No edites esa bandeja**: la mueve el dueño. Entregale tu reporte diario (con el bloque `ANÁLISIS IA` de tu IA) subiéndolo a tu rama `reportes/<slug>`.
3. El dueño decide: `NO_BUG`, `DIFERIDO` o `AUTORIZAR_BUG`. La decisión se escribe en el registro con fecha y quién decidió.
4. Recién con `AUTORIZAR_BUG` se crea un `BUG-###` y entra al flujo normal de reparación. El dueño sube los arreglos a `main`.

---

## Ritmo diario y sincronización con GitHub

El circuito acordado es este:

1. **Vos revisás** pantallas con datos de prueba y le contás los hallazgos a tu IA.
2. **Tu IA analiza** cada `HAL-###` con el formato de arriba y lo deja listo en el reporte del día.
3. **Al terminar tu día**, tu IA te muestra el diff y te pregunta «¿subo el reporte ahora?». Con tu OK, hace commit **solo** de `docs/operacion/REPORTES_COLABORADOR/YYYY-MM-DD_<slug>.md` en la rama `reportes/<slug>` y hace push. Nunca toca `main`.
4. **Al empezar el día del dueño**, él revisa ese reporte junto a su IA, decide y sube los arreglos a `main`.
5. **Al volver a hablar con tu IA** (o al decir «revisa arreglos en github»), ella hace `git fetch origin`, vuelve a `main` y hace `git pull --ff-only origin main` para bajar los arreglos a tu copia. Te dice qué `HAL-###` se arreglaron, en qué commit y si quedan pendientes. Ahí volvés a probar esas pantallas.

Comandos que tu IA puede usar para sincronizar:

```bash
git fetch origin
git status --short --branch
git switch main
git pull --ff-only origin main
git rev-parse origin/main
git rev-parse HEAD
git log <sha_anterior>..origin/main --oneline
git show origin/main:docs/operacion/REGISTRO_BUGS.md
```

El último SHA se guarda en `C:\Users\<usuario>\Documents\YAHPOS_ultimo_sync.txt`, **fuera** del repo. Tu IA no hace `merge`, `rebase`, `reset`, `commit`, `push` ni `--force` en `main`. El `pull` se usa solo en `main` y con `--ff-only`: si hay cambios propios o no es fast-forward, reporta el error y espera al dueño.

Tabla que te tiene que devolver la sincronización:

| Hallazgo | Decisión del dueño | BUG | Commit | Estado | Qué significa para vos |
|---|---|---|---|---|---|
| `HAL-001` | `AUTORIZAR_BUG` | `BUG-001` | `abc1234` | `CERRADO` | Ya está arreglado: volvé a probar esa pantalla |

Si no puede verificar algo, debe escribir «no verificado»: nunca dar por arreglado un hallazgo sin evidencia.

---

## Reglas que no se negocian

- No secretos reales, tokens, contraseñas ni correos reales. Solo datos y proyectos de prueba.
- No datos reales de clientes en pantallas, capturas ni reportes.
- No tocar `main`. Trabajar solo en tu copia y en tu rama `reportes/<slug>`.
- No commit ni push sin tu confirmación; el único commit permitido es el reporte diario en tu rama. Nunca `push --force`.
- No corregir las palabras del colaborador: el hallazgo va literal.
- No dar por arreglado un hallazgo sin corroborarlo en `origin/main` y en `REGISTRO_BUGS.md`.
- Una tarea `T-###` a la vez.
- No promover a `BUG-###` sin autorización del dueño.
- No editar código, no ejecutar fixes ni SQL de escritura, no cerrar nada.

---

## Enlaces

- [`PROTOCOLO_CAZABUGS.md`](../operacion/PROTOCOLO_CAZABUGS.md) — flujo conjunto, plantillas, Modo IA y prompts.
- [`REGISTRO_BUGS.md`](../operacion/REGISTRO_BUGS.md) — bandeja de hallazgos y bugs autorizados.
- [`CURRICULUM_COLABORADOR.md`](CURRICULUM_COLABORADOR.md) — plan de aprendizaje del colaborador.
