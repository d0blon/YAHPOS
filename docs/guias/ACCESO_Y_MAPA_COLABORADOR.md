# Guía de acceso y mapa de archivos — para el colaborador y su IA

> **Para quién es:** para vos, el amigo del dueño que se suma a YAHPOS! y arrancás **de cero**, como se define en [`CURRICULUM_COLABORADOR.md`](CURRICULUM_COLABORADOR.md). No hace falta que sepas programar.
>
> **Cómo se usa:** el dueño te entrega este doc. Vos se lo entregás a tu IA. Vos explorás de forma visual y lógica; la IA solo anota. Nadie arregla ni hace commit/push sin una decisión del dueño.

---

## Qué se te pide

- Trabajar **una tarea `T-###` a la vez**. Las tareas se siguen en `TAREAS_COLABORADOR.md`.
- Buscar con **datos de prueba**, nunca con datos reales de clientes.
- Reportar cada hallazgo como `HAL-###` **en tus palabras**. Tu texto se copia literal: nadie te lo reescribe.
- No editar código, no tocar `main`, no hacer commit ni push.
- No crear `BUG-###` por tu cuenta. Recién existe cuando el dueño autoriza.

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
Modo solo lectura. Lee, en este orden, `docs/README.md`, `docs/guias/EMPIEZA_AQUI.md`, `docs/guias/CURRICULUM_COLABORADOR.md`, `docs/guias/ACCESO_Y_MAPA_COLABORADOR.md`, `docs/operacion/PROTOCOLO_CAZABUGS.md` (secciones «Flujo de trabajo conjunto» y «Modo IA — SOLO ANOTAR, NUNCA IMPLEMENTAR»), `docs/operacion/TAREAS_COLABORADOR.md`, `docs/operacion/REGISTRO_BUGS.md` y `docs/arquitectura/ARCHITECTURE.md`. NO leas `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `docs/operacion/INSTRUCCIONES_PARA_OPENCODE.md` ni `docs/operacion/CONTEXT_FOR_CLAUDE.md`: son instrucciones privadas del dueño y no están en el clone; si algún doc las menciona, tratá esa mención como «fuente no disponible» y usá `PROTOCOLO_CAZABUGS.md` en su lugar. Yo no sé programar: explícame con palabras simples qué parte toca y qué archivos intervienen. Copiá mi hallazgo literal, sin corregir mi redacción, y agregá solo el bloque `ANÁLISIS IA` con: cómo funciona esa parte (flujo real + `archivo:línea`), causa probable, idea de arreglo (máx. 2 opciones, sin código), nivel de riesgo (S1–S4 + cambio BAJO/MEDIO/ALTO), archivos/rutas/tablas exactos, blast radius, pruebas sugeridas (positiva y negativa si toca auth, roles, `store_id` o RLS) y DO NOT. No edites código, no ejecutes fixes ni SQL de escritura, no crees `BUG-###`, no hagas commit ni push, no toques `main`, no cierres nada. No escribas secretos, tokens, contraseñas ni correos reales en la respuesta. Si no podés verificar algo, escribí «no verificado». Toda salida termina con `Estado: ANALIZADO — SIN IMPLEMENTAR`.
```

---

## Qué te tiene que devolver la IA

Checklist. Si falta alguno, pedilo:

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
2. Pegá el `HAL-###` en esa bandeja, o entregalo directamente al dueño. Incluí el bloque `ANÁLISIS IA` de tu IA.
3. El dueño decide: `NO_BUG`, `DIFERIDO` o `AUTORIZAR_BUG`. La decisión se escribe en el registro con fecha y quién decidió.
4. Recién con `AUTORIZAR_BUG` se crea un `BUG-###` y entra al flujo normal de reparación. Autorizar la reparación no autoriza subir cambios: commit/push solo si el dueño lo pide.

---

## Reglas que no se negocian

- No secretos reales, tokens, contraseñas ni correos reales. Solo datos y proyectos de prueba.
- No datos reales de clientes en pantallas, capturas ni reportes.
- No tocar `main`. Trabajar solo en tu copia.
- No commit ni push sin pedido explícito del dueño.
- No corregir las palabras del colaborador: el hallazgo va literal.
- Una tarea `T-###` a la vez.
- No promover a `BUG-###` sin autorización del dueño.
- No editar código, no ejecutar fixes ni SQL de escritura, no cerrar nada.

---

## Enlaces

- [`PROTOCOLO_CAZABUGS.md`](../operacion/PROTOCOLO_CAZABUGS.md) — flujo conjunto, plantillas, Modo IA y prompts.
- [`REGISTRO_BUGS.md`](../operacion/REGISTRO_BUGS.md) — bandeja de hallazgos y bugs autorizados.
- [`CURRICULUM_COLABORADOR.md`](CURRICULUM_COLABORADOR.md) — plan de aprendizaje del colaborador.
