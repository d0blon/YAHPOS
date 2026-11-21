# Protocolo Cazabugs — registro de bugs del Colaborador (YAHPOS!)

## Propósito

Sistema simple y persistente para que el colaborador detecte, reproduzca y reporte fallos mientras aprende a trabajar en el proyecto, y para que OpenCode los clasifique, repare y cierre con evidencia.

**Para quién es:** el colaborador que se suma en [`CURRICULUM_COLABORADOR.md`](../guias/CURRICULUM_COLABORADOR.md). Antes de usarlo, leer [`EMPIEZA_AQUI.md`](../guias/EMPIEZA_AQUI.md) (mapa mental del proyecto). «Cazabugs» es el nombre informal de este flujo de revisión, **no un rol separado del colaborador**.

[`COLLABORATION_PROTOCOL.md`](COLLABORATION_PROTOCOL.md) define los roles históricos (Antigravity / OpenCode) y la regla **«SOLO UNO ESCRIBE CÓDIGO»**, que sigue vigente. Para bugs manda este protocolo: el colaborador reporta y audita; el dueño decide quién arregla.

Este protocolo **no** autoriza escribir código ni ejecutar SQL de escritura. El único commit permitido es el **reporte diario del colaborador** en su propia rama `reportes/<slug>`; nunca se toca `main` ni código. Los arreglos los sube el dueño, y solo con pedido explícito.

---

## Roles

### Colaborador (el amigo; flujo informal «cazabugs»)

- Detectar, reproducir y documentar fallos o cosas que no funcionan como deberían. Es su forma de practicar el 80% del curriculum: aprender a **revisar**.
- Buscar primero si el hallazgo ya está reportado; si está, agregar evidencia nueva a la entrada existente.
- Usar solo datos y proyectos de prueba. **No** probar con datos reales de clientes. **Nunca** llaves de producción, llave maestra de la bodega real ni certificado real del SII. **No** pegar secretos, tokens, contraseñas ni correos reales en el registro ni en capturas.
- **No** arregla código: no toca `.ts`, `.tsx`, `.sql` ni `.css`.
- **No** toca `AGENTS.md`, `BITACORA.md`, `TASK_HANDOFF.md` ni `YAHPOS Kanban.md`.
- **No** ejecuta SQL de escritura (`INSERT`/`UPDATE`/`DELETE`/DDL). Solo lectura si hace falta, sin datos sensibles.
- Al terminar el día, **sí** hace commit/push de su reporte (`docs/operacion/REPORTES_COLABORADOR/YYYY-MM-DD_<slug>.md`) **solo** en `reportes/<slug>`, nunca en `main`, nunca con código. Usa su propia identidad de git.
- Avisa al dueño con el ID del hallazgo y la severidad sugerida.

### OpenCode / agente

- Triar: confirmar que es bug, asignar severidad y área, marcar duplicados o NO_BUG.
- Verificar el reporte; si no se puede reproducir, pedir más evidencia y no cerrar.
- Reparar **solo con encargo del dueño**, con scopes aislados (un archivo no aparece en más de una subtarea) y tests.
- Pasar gates: `lint`, `tsc`, tests y `build` cuando aplique. Si toca auth, roles, `store_id` o RLS, agregar prueba real **y** caso negativo (Regla de Oro §0 de [`../../AGENTS.md`](../../AGENTS.md)).
- Actualizar el estado del registro con evidencia. **No** hace commit ni push sin confirmación del dueño.

### Dueño

- Decide la prioridad final: S1 antes que S2, S2 antes que S3, S3 antes que S4.
- Decide **quién arregla** cada bug, respetando la regla de «solo uno escribe código».
- Aprueba el cierre de cada bug; sin su aprobación no se mueve a `CERRADO`.
- Autoriza acciones sensibles: SQL de escritura, revocación/rotación de credenciales, zonas rojas y cualquier commit o push.

---

## Flujo de trabajo conjunto (dueño + colaborador + IA)

Este sistema reparte trabajo entre tres partes sin mezclar responsabilidades. El colaborador explora y reporta; la IA solo analiza y anota; el dueño decide. `REGISTRO_BUGS.md` sigue siendo la fuente única de verdad de bugs. El Kanban (`YAHPOS Kanban.md`) **no se toca**: este sistema es el puente entre la revisión del colaborador y el registro de bugs.

1. **Dueño asigna tarea `T-###`.** Una tarea a la vez, con objetivo simple y scope visual/lógico. Usar la plantilla de abajo.
2. **Colaborador la explora de forma visual/lógica con datos de prueba.** Mira pantallas, botones y flujos. No edita código, no usa datos reales ni secretos.
3. **Colaborador entrega hallazgo `HAL-###` en SUS PALABRAS.** Se lo dice a su IA; su texto se copia textual al reporte diario; nadie lo reescribe. El reporte se sube a `reportes/<slug>` al final del día.
4. **IA agrega bloque `ANÁLISIS IA` con cómo funciona la parte, idea de arreglo, riesgo y archivos exactos.** Es SOLO ANOTACIÓN: no repara, no crea `BUG-###`, no cierra nada.
5. **Dueño decide: `NO_BUG` / `DIFERIDO` / `AUTORIZAR`.** La decisión se escribe en el registro con fecha y quién decidió. Sin decisión, el hallazgo queda pendiente.
6. **Solo con autorización se crea `BUG-###` y se repara con scopes, tests y gates.** Se usa la plantilla de bug de este protocolo. Si toca auth, roles, `store_id` o RLS, se agrega prueba real y caso negativo.
7. **Commit/push de arreglos SOLO cuando el dueño lo pida.** Autorizar la reparación no autoriza subir cambios. El push queda fuera salvo pedido explícito.
8. **Sincronización del colaborador:** al empezar cada conversación, o con la palabra clave «revisa arreglos en github», su IA hace `git fetch origin` (nunca `pull`/`checkout`), compara el SHA guardado fuera del repo y lee `git show origin/main:docs/operacion/REGISTRO_BUGS.md`. Devuelve una tabla `HAL` → decisión → `BUG` → commit → estado, para que el colaborador sepa qué puede volver a probar.
9. **Revisión del dueño:** al empezar su día, o con «revisa reportes del socio», su IA hace `fetch`, baja la rama `reportes/<slug>` y revisa los `HAL-###` junto al dueño antes de decidir.

Aclaración: el Kanban no se mueve ni se edita. Tareas se siguen en `TAREAS_COLABORADOR.md`, hallazgos en la bandeja de `REGISTRO_BUGS.md` y bugs autorizados en «Bugs abiertos».

---

## Modo IA — SOLO ANOTAR, NUNCA IMPLEMENTAR

Aplica cuando la IA trabaja sobre un `HAL-###`. Aunque el fallo parezca obvio o urgente, la urgencia no autoriza tocar nada.

- **No editar código:** nada de `.ts`, `.tsx`, `.sql` ni `.css`.
- **No ejecutar fixes ni SQL de escritura:** ni `INSERT`, `UPDATE`, `DELETE` ni DDL. Solo lectura si ayuda, sin datos sensibles.
- **No crear `BUG-###` sin autorización del dueño.**
- **No mover a `CERRADO`.** Ese estado exige evidencia y aprobación del dueño.
- **No hacer commit ni push de código ni de `REGISTRO_BUGS.md`.** La excepción es el reporte diario del colaborador: se sube solo a `reportes/<slug>` y con confirmación del colaborador; nunca a `main`.
- **Basar el análisis en código real con `archivo:línea`.** Si no puede verificar algo, escribir «no verificado» en vez de inventar.
- **NUNCA corregir la redacción del colaborador.** Copiar textual su hallazgo en «En mis palabras».
- Toda salida termina con `Estado: ANALIZADO — SIN IMPLEMENTAR`.

---

## Plantilla de TAREA `T-###`

Copiar esta plantilla para asignar trabajo al colaborador. No pedir nombres de archivos de código: el scope es visual/lógico.

```markdown
### T-### — título simple

- **ID:** T-###
- **Asignada por:** nombre del dueño
- **Fecha:** AAAA-MM-DD
- **Objetivo en lenguaje simple:** qué se quiere revisar, en palabras de todos los días
- **Dónde mirar:** pantallas / rutas de la app / módulos (sin exigir archivos de código)
- **Qué buscar:** qué debería pasar y qué se siente raro
- **Entorno:** dev | staging | prod · navegador y versión: ... · datos de prueba usados: ...
- **Evidencia esperada:** captura sin datos reales: ...
- **Estado:** ASIGNADA | EN_REVISIÓN | ENTREGADA
- **HAL generados:** HAL-###, HAL-### | ninguno
```

---

## Plantilla de HALLAZGO `HAL-###`

Primera mitad: la escribe el colaborador. Segunda mitad: la agrega la IA, solo como anotación.

```markdown
### HAL-### — título corto

**Primera mitad — escrita por el colaborador**

- **ID:** HAL-###
- **Tarea `T-###` relacionada:** T-###
- **En mis palabras:** texto literal del colaborador; la IA lo copia sin corregir
- **Qué vi:** ...
- **Dónde lo vi:** pantalla / ruta de la app / módulo ...
- **Qué esperaba:** ...
- **Pasos (si los hay):**
  1. ...
  2. ...
- **Captura:** `screenshots/bugs/HAL-###_slug.png` | no aplica (sin datos reales)
- **Repetible:** Sí | No | No lo sé
- **Estado:** NUEVO_HALLAZGO

**ANÁLISIS IA — SOLO ANOTACIÓN, SIN IMPLEMENTAR**

- **Cómo funciona esa parte (flujo real + `archivo:línea`):** ...
- **Causa probable:** ...
- **Idea de arreglo (máx. 2 opciones, sin código):** 1. ... 2. ...
- **Nivel de riesgo:** severidad S1 | S2 | S3 | S4 + riesgo de cambio BAJO | MEDIO | ALTO + justificación: ...
- **Toca exactamente (archivos, rutas, tablas, policies/RLS):** ...
- **Blast radius:** qué más podría verse afectado
- **Pruebas sugeridas:** positiva: ...; negativa (si toca auth/roles/store_id/RLS): ...
- **DO NOT:** qué no se debe hacer
- **Estado:** ANALIZADO — SIN IMPLEMENTAR
```

Si algo no se pudo comprobar, escribir «no verificado» en el campo correspondiente. No inventar archivos, líneas, tablas ni resultados de prueba.

---

## Riesgo de cambio (para el bloque ANÁLISIS IA)

La severidad S1–S4 mide el impacto del fallo. El riesgo de cambio mide qué peligroso sería repararlo. Ante duda, elegir el nivel más alto.

| Riesgo de cambio | Significado |
|---|---|
| **BAJO** | 1 archivo UI/texto, sin DB. |
| **MEDIO** | varios archivos o consultas de lectura. |
| **ALTO** | auth, roles, `store_id`, RLS, esquema DB, DTE/SII o pagos. |

---

## Estados HAL

Flujo: `NUEVO_HALLAZGO` → `ANALIZADO` → decisión del dueño (`NO_BUG` | `DIFERIDO` | `AUTORIZAR_BUG`).

- `NUEVO_HALLAZGO`: el colaborador lo subió; la IA todavía no anotó.
- `ANALIZADO`: la IA agregó el bloque `ANÁLISIS IA`; sigue sin implementarse.
- `NO_BUG`: el dueño lo documenta en «No es bug / decisiones aceptadas». No cuenta como bug.
- `DIFERIDO`: el dueño lo deja para después en la sección «Diferidos», sin inventar IDs.
- `AUTORIZAR_BUG`: recién aquí se copia la plantilla `BUG-###` y entra al flujo normal.

Nunca se promueve solo a `BUG-###`. La IA no ejecuta ninguna de estas transiciones: solo propone en su bloque.

---

## Prompts listos para copiar

(a) Del COLABORADOR a la IA, para analizar sin implementar:

```text
Modo solo lectura + análisis + reporte. Lee docs/README.md, docs/guias/ACCESO_Y_MAPA_COLABORADOR.md, docs/operacion/PROTOCOLO_CAZABUGS.md y REGISTRO_BUGS.md. NO leas AGENTS.md ni otros archivos privados del dueño: no están en el clone. Al empezar, y cuando diga «revisa arreglos en github», hacé git fetch origin (nunca pull/checkout) y leé origin/main:docs/operacion/REGISTRO_BUGS.md para decirme qué HAL-### ya se arreglaron. Toma HAL-###. Copiá mi hallazgo literal y agregá ANÁLISIS IA con: cómo abordarlo/reproducirlo, flujo real + archivo:línea, causa, alcance, idea de arreglo (máx. 2, sin código), riesgo S1–S4 + cambio BAJO/MEDIO/ALTO, blast radius, pruebas positiva y negativa si aplica, y DO NOT. NO implementes ni toques código. Al final del día juntá todo en docs/operacion/REPORTES_COLABORADOR/YYYY-MM-DD_<slug>.md; mostrá el diff, esperá mi confirmación y recién entonces hacé commit/push SOLO de ese archivo en reportes/<slug>, nunca en main. Toda salida de análisis termina con Estado: ANALIZADO — SIN IMPLEMENTAR.
```

(b) Del DUEÑO autorizando la reparación:

```text
Autorizo convertir HAL-### en BUG-### e implementar con scopes, tests y gates. Sin push.
```

El prompt (a) no habilita cambios de código: solo permite subir el reporte diario a `reportes/<slug>` con confirmación del colaborador. El prompt (b) habilita la reparación con scopes, tests y gates; el commit o push de arreglos sigue requiriendo pedido explícito del dueño.

---

## Cómo encaja con el curriculum

Este registro es la evidencia concreta de las etapas del plan de estudio. No reemplaza el curriculum: lo vuelve verificable.

| Etapa del curriculum | Cómo se usa este registro |
|---|---|
| Etapa 1 — Git y leer código ajeno | Encontrar bugs en [`../auditorias/AUDIT_REPORT_2026-07-28.md`](../auditorias/AUDIT_REPORT_2026-07-28.md) y ubicarlos en el código real; anotar en `Archivo:línea` y en `Notas/Historial` qué se entendió. |
| Etapa 3 — Detectar cuando la IA miente | Cada desviación detectada («ya está listo» sin prueba, API inventada, cambio silencioso, prueba tramposa) se registra con la plantilla. **El registro es la prueba del ejercicio.** |
| Etapa 4 — Pruebas | Todo reporte lleva evidencia reproducible. Distinguir «compila» de «probado»: `build`/`lint` no reemplazan una prueba que falla y luego pasa. |
| Etapa 5 — RLS / seguridad | Una fuga entre tiendas o escalada de roles es **S1**: prueba real del caso positivo y del caso negativo, sin datos reales. Ver [`../seguridad/CHECKLIST_SEGURIDAD.md`](../seguridad/CHECKLIST_SEGURIDAD.md). |
| Etapa 6 — Primera tarea | Pasar de reportar a arreglar solo con encargo tipo [`../../TASK_HANDOFF.md`](../../TASK_HANDOFF.md): alcance, causa raíz, cambios, blast radius, plan de pruebas y DO NOT. |
| Ritual semanal (CURRICULUM líneas 350-369) | El reporte semanal incluye los IDs de bugs abiertos y cerrados, además de qué estudió, qué no entendió y qué entregó. |

---

## Fuente única de verdad

[`REGISTRO_BUGS.md`](REGISTRO_BUGS.md) es la fuente única de verdad de bugs. No lo están el chat, la bitácora ni el Kanban.

- **Un bug = una entrada.** No mezclar dos fallos distintos en la misma entrada.
- Antes de reportar, buscar en el registro por ID, título y palabras clave del módulo para evitar duplicados.
- Si ya existe, **no** crear otra entrada: agregar una línea en `Notas/Historial` con fecha, quién y la nueva evidencia. Si resulta ser el mismo fallo, el estado pasa a `DUPLICADO` con puntero al ID original.

---

## IDs

- Bugs nuevos: `BUG-001`, `BUG-002`, ... en orden secuencial.
- Items diferidos conocidos: `D-001`, `D-002`, ... (ya cargados en el registro).
- Los IDs son secuenciales, **nunca se reutilizan** y no se renombran. Un bug cerrado conserva su ID en la sección "Cerrados".

---

## Severidades

| Severidad | Criterio concreto |
|---|---|
| **S1 CRÍTICO** | Pérdida o corrupción de datos, escape de tenant / RLS, escalada de roles, secretos expuestos, DTE inválido o cobro sin orden. |
| **S2 ALTO** | Flujo principal roto sin workaround: login, checkout, POS o facturación. |
| **S3 MEDIO** | Flujo secundario roto con workaround. |
| **S4 BAJO** | Visual, texto o UX menor. |
| **NO_BUG** | Config/env faltante de setup local, decisión de diseño documentada o feature request. Va a "No es bug / decisiones aceptadas", **no cuenta como bug**. |

Nota: un aviso de "no tengo `.env.local`" en un entorno de desarrollo es NO_BUG. La config obligatoria ausente que deja el proxy respondiendo 500 en un entorno operativo ya está registrada como deuda acordada (`D-001`, S2) y conserva su severidad. Ante duda entre dos niveles, usar el más alto.

---

## Estados

Flujo normal: `NUEVO` → `TRIADO` → `EN_CURSO` → `VERIFICANDO` → `CERRADO`.

Estados alternos: `DIFERIDO`, `DUPLICADO`, `NO_ES_BUG`.

- Solo el agente o el dueño pueden mover una entrada a `CERRADO`, y siempre con evidencia.
- Evidencia de cierre: gates que apliquen (`lint`, `tsc`, tests, `build`) y resultado de la prueba real. Si toca auth, roles, `store_id` o RLS: prueba real del caso positivo **y** del caso negativo (otro usuario/tenant sigue bloqueado), conforme a la Regla de Oro §0 de `AGENTS.md`.
- Sin evidencia no se cierra: vuelve a `VERIFICANDO`.
- Todo cambio de estado se escribe en `Notas/Historial` con fecha, quién y qué cambió.

---

## Plantilla de entrada

Copiar exactamente esta plantilla para cada bug nuevo y pegarla en "Bugs abiertos" del registro:

```markdown
### BUG-### — título corto

- **ID:** BUG-###
- **Fecha:** AAAA-MM-DD
- **Reportado por:** nombre del colaborador
- **Severidad:** S1 | S2 | S3 | S4
- **Estado:** NUEVO
- **Área/módulo:** POS | admin | e-commerce | auth | DTE/SII | DB | infra | otro
- **Entorno:** dev | staging | prod · host: ... · navegador y versión: ... · versión/commit: ...
- **Pasos para reproducir:**
  1. ...
  2. ...
  3. ...
- **Resultado esperado:** ...
- **Resultado real:** ...
- **Evidencia:** `screenshots/bugs/BUG-###_slug.png` · logs de consola · curl · query SQL SOLO lectura (sin datos reales ni secretos)
- **Archivo:línea (si se conoce):** ...
- **Impacto:** quién se ve afectado y qué se rompe
- **Repetible:** Sí | No
- **Notas/Historial:**
  - AAAA-MM-DD — quién — qué cambió
```

Si el bug ya existe, no copiar la plantilla: agregar solo una línea nueva en `Notas/Historial` de la entrada existente.

---

## Dónde guardar la evidencia

- Guardar capturas en `screenshots/bugs/`, con nombre `BUG-###_slug.png`.
- Crear la carpeta solo cuando se use por primera vez. **No** borrar capturas viejas.
- Adjuntar también logs de consola, curl o query SQL **solo de lectura** cuando ayuden.
- Si una captura muestra datos reales de clientes, tokens o secretos: no guardarla; usar datos de prueba o redactar antes de guardar.

---

## Quick start del Colaborador (flujo «cazabugs») — 5 pasos

1. Leer [`EMPIEZA_AQUI.md`](../guias/EMPIEZA_AQUI.md) y correr la app (`npm run dev`) con datos de prueba.
2. Reproducir el fallo al menos dos veces y anotar los pasos exactos.
3. Buscar en [`REGISTRO_BUGS.md`](REGISTRO_BUGS.md) si ya existe (por título, módulo o palabras clave).
4. Entregar el hallazgo a tu IA con el ID `HAL-###` y el formato de «Cómo abordarlo». No pegués nada en `REGISTRO_BUGS.md`: lo escribe el dueño.
5. Al terminar el día, subir el reporte a `reportes/<slug>` (solo ese archivo) y avisar al dueño con el ID y la severidad sugerida. Nunca tocar `main` ni código.

> **Nota de convivencia con el flujo conjunto:** estos 5 pasos describen el flujo vigente. El colaborador entrega `HAL-###` y su IA solo anota; el pase a `BUG-###` ocurre solo con la decisión `AUTORIZAR_BUG` del dueño (ver «Flujo de trabajo conjunto» y «Estados HAL»). La plantilla `BUG-###` sigue siendo la misma y se usa recién después de esa autorización.

---

## Prompt listo para el agente

```text
Lee AGENTS.md, docs/operacion/PROTOCOLO_CAZABUGS.md y REGISTRO_BUGS.md. Lee también docs/guias/CURRICULUM_COLABORADOR.md. Toma BUG-###. Verifica el reporte, repara con scopes aislados y tests, actualiza el estado a CERRADO con evidencia. No hagas commit ni push.
```

> **Nota:** este prompt es para el agente que ya recibió `AUTORIZAR_BUG` y trabaja sobre un `BUG-###`. Cerrar requiere evidencia y aprobación del dueño. Para el modo «IA solo anota» sobre un `HAL-###`, usar el prompt del colaborador de la sección «Prompts listos para copiar».

---

## Regla de prioridad

Prioridad: S1 antes que S2, S2 antes que S3, S3 antes que S4. El dueño decide el orden final.

Si un hallazgo es de seguridad o cross-tenant (escape de tienda, RLS, roles, secretos), marcarlo **S1** y avisar al dueño de inmediato, aunque falte evidencia completa. No esperar al próximo reporte.
