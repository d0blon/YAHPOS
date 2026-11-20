# CURRICULUM — Tu plan de estudio (octubre → diciembre)

> **Para quién es:** para vos, que vas a empezar a trabajar en YAHPOS! y arrancás **de cero**.
> No hace falta que sepas programar de antes.
>
> **Qué es:** un plan para que llegues a diciembre **ya sabiendo trabajar en este proyecto**.
> Se aprende haciendo, sobre cosas reales.

---

### En simple — qué es esto

> En vez de "estudiá programación" (muy amplio, sirve poco), esto es un camino con ejercicios
> concretos para llegar a diciembre sabiendo trabajar acá.

```
   HOY (octubre)          DICIEMBRE               ENERO
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐          ┌──────────┐
   │ Aprendés │  ────►   │ Llegás    │  ────►   │ Arranca  │
   │ solo, con│          │ sabiendo  │          │ el       │
   │ ejercicios│         │ trabajar  │          │ sprint   │
   └─────────┘          └──────────┘          └──────────┘
```

Y lo más importante, dicho por quien empezó el proyecto:

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │  "No es fácil. No es llegar y pedirle a la IA que lo haga.            │
   │   Es más complicado de lo que parece."                                │
   │                                                                      │
   │  Por eso este plan es 80% aprender a REVISAR, no a pedir.             │
   └──────────────────────────────────────────────────────────────────────┘
```

> Antes de empezar: leé **`EMPIEZA_AQUI.md`**. Es el mapa mental. Sin eso, esto se entiende a
> medias.

---

## La meta al 20 de diciembre

Sin que nadie te explique, poder hacer estos 4 pasos:

```
   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │ 1. TOMAR   │──►│ 2. ESCRIBIR│──►│ 3. DELEGAR │──►│ 4. REVISAR │
   │ una tarea  │   │ el encargo │   │ a la IA y  │   │ y entregar │
   │ del tablero│   │ (handoff)  │   │ detectar si│   │ con        │
   │            │   │            │   │ mintió     │   │ evidencia  │
   └────────────┘   └────────────┘   └────────────┘   └────────────┘
```

Si eso pasa en diciembre, el verano arranca en serio.

---

## Regla 0 — La verdad del oficio

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │  LO QUE LA GENTE CREE                LO QUE ES DE VERDAD             │
   │  ────────────────────                ────────────────────             │
   │  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  pedir            ▓▓▓▓  pedir                     │
   │  ░░░░░░░░░░░░░░░░░░  revisar          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  revisar        │
   │                                       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                │
   │                                                                      │
   │  Esto NO es "pedir y ya está". El 80% es leer, probar y rechazar.     │
   └──────────────────────────────────────────────────────────────────────┘
```

La IA va a decir *"ya está listo"* sin que esté listo. Va a inventar cosas que no existen. Va
a cambiar archivos que no le pediste. **Eso no es que sea mala: es cómo funciona.** El trabajo
del que sabe es **darse cuenta**. Eso se aprende, y es el 80% del oficio.

---

## Qué leer del proyecto (en este orden)

Cada archivo tiene algo para llevarte. No los leas todos de una: uno por vez.

```
   ┌────┬──────────────────────────────────┬──────────────────────────────┐
   │ 1º │ EMPIEZA_AQUI.md                  │ el mapa mental               │
   │ 2º │ MANUAL_PROYECTO.md               │ qué es cada cosa             │
   │ 3º │ GUIA_CONEXIONES.md               │ cómo está cableado           │
   │ 4º │ DECISIONES_ARQUITECTURA.md       │ por qué es así               │
   │ 5º │ README.md                        │ la vista general             │
   │ 6º │ ARCHITECTURE.md                  │ la arquitectura (corta)      │
   │ 7º │ AGENTS.md                        │ cómo se trabaja acá          │
   │ 8º │ TASK_HANDOFF.md                  │ el modelo de un buen encargo │
   │ 9º │ AUDIT_REPORT_2026-07-28.md       │ ★ el mejor material didáctico│
   └────┴──────────────────────────────────┴──────────────────────────────┘
```

> **⭐ El archivo 9 es oro puro.** Son errores reales, con el razonamiento real, y explica
> *por qué* pasaron. Nadie inventa un ejercicio mejor que eso.

---

## Las 6 etapas

Cada etapa tiene: **la meta · qué aprender · ejercicios · la señal de que aprendiste**.

---

### Etapa 1 — Git y leer código ajeno (semanas 1-2)

```
   LA META:  mirar un cambio y poder explicarlo en una frase
```

#### En simple

> **Git** es como el "historial de cambios" de un documento de Word, pero para todo el
> proyecto: podés ver **qué cambió**, **quién** y **cuándo**. Lo primero que tenés que saber
> es **leer** esos cambios.

```
   git log -p        →  "mostrame la historia con los cambios detallados"
   git diff          →  "qué cambió desde el último punto guardado"
   git branch        →  "una copia para probar sin romper lo original"
```

#### Ejercicios

```
   ☐ 1. Clonar el proyecto y correr   git log -p
         → elegir 3 cambios y explicar qué hizo cada uno

   ☐ 2. Abrir  AUDIT_REPORT_2026-07-28.md
         → UBICAR los 2 errores críticos en el código real

   ☐ 3. Escribir (en tus palabras) qué hace cada error y por qué es peligroso
         → sin copiar del reporte
```

#### Señal de que aprendiste

> Podés explicar **por qué** las cookies "sin candado" eran peligrosas, sin leer el reporte.

---

### Etapa 2 — Cómo se escribe un encargo (semanas 2-4)

```
   LA META:  escribir un "encargo" (handoff) como los del proyecto
```

#### En simple

> Un **encargo** es el documento que le das a la IA (o a otra persona) para que haga una tarea.
> Está `TASK_HANDOFF.md` como modelo. Tiene 7 partes:

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │  UN BUEN ENCARGO TIENE:                                               │
   │                                                                      │
   │  1. Contexto ...... qué pasa y por qué                                │
   │  2. Causa raíz .... el porqué del problema, no el síntoma             │
   │  3. El cambio ..... exactamente qué hacer                             │
   │  4. Blast radius .. qué más se puede romper                           │
   │  5. Plan de pruebas  cómo se demuestra que anda                       │
   │  6. DO NOT ........ qué NO hacer    ← la parte más importante          │
   └──────────────────────────────────────────────────────────────────────┘
```

> El **"Do Not"** es lo que evita que el trabajo se vaya por las ramas. Sin ella, la IA
> improvisa.

#### Ejercicios

```
   ☐ 1. Escribir un encargo para una tarea chica inventada (con las 6 partes)
   ☐ 2. Pedirle a la IA que lo haga y comparar: ¿hizo lo que pediste?
```

#### Señal de que aprendiste

> Tu encargo tiene una sección "Do Not" con al menos 2 cosas concretas.

---

### Etapa 3 — Detectar cuando la IA miente (semanas 4-6) ★

```
   LA META:  cazar una mentira de la IA y documentarla
```

#### En simple

> Esta es **la etapa más importante**. Si aprendés esto, vale más que todo lo demás junto.
> La IA miente de formas predecibles:

```
   ┌────────────────────┬───────────────────────────────────────────────┐
   │ LA MENTIRA         │ CÓMO SE VE                                     │
   ├────────────────────┼───────────────────────────────────────────────┤
   │ "Ya está listo"    │ sin evidencia, sin haber probado nada          │
   │ API inventada      │ una función que no existe                      │
   │ Se fue de las ramas│ "aproveché y también arreglé X"                 │
   │ Prueba tramposa    │ una prueba que pasa porque no prueba nada       │
   │ Cambio silencioso  │ tocó archivos que no le pediste                 │
   └────────────────────┴───────────────────────────────────────────────┘
```

#### El truco del buen pedido

```
   ❌ "Revisá esto"                    → resultado inútil
   ✅ "Encontrá cómo esto ROMPE el     → resultado útil
       aislamiento entre tiendas"
```

#### Ejercicios

```
   ☐ 1. Pedirle a la IA una tarea y AUDITAR el resultado
         → documentar 3 mentiras o desviaciones concretas

   ☐ 2. Hacer el mismo pedido de las dos formas (❌ y ✅) y comparar
```

#### Señal de que aprendiste

> Encontraste al menos una mentira de la IA **que no te habían dicho**.

---

### Etapa 4 — Las pruebas como red (semanas 6-8)

```
   LA META:  escribir una prueba, verla fallar, arreglarla
```

#### En simple

> Una **prueba** es un chequeo automático que te avisa si rompiste algo. Con IA, escribir 50
> archivos es fácil; saber si rompiste otro lado **no**. Las pruebas son tu red de seguridad.

```
   -- sin pruebas --                 -- con pruebas --
   cambiás algo                      cambiás algo
        │                                 │
        ▼                                 ▼
   ¿se rompió algo?                  la prueba te avisa al instante
   nadie sabe 🤷                     ✅ todo bien / ❌ rompiste esto
```

#### Ejercicios

```
   ☐ 1. Correr las pruebas y entender qué cubren (spoiler: casi nada)
   ☐ 2. Escribir una prueba que FALLE a propósito, verla fallar, arreglarla
   ☐ 3. Escribir la prueba medible del gráfico SalesTrendChart (está en TASK_HANDOFF)
```

#### Señal de que aprendiste

> Podés explicar la diferencia entre "compila" y "está probado".

---

### Etapa 5 — Seguridad mínima (semanas 8-10)

```
   LA META:  entender por qué los 2 errores eran críticos, y qué es el guardia (RLS)
```

#### En simple

> Acá entendés por qué el **aislamiento** es lo más importante del proyecto.

```
   LA PREGUNTA QUE TENÉS QUE PODER RESPONDER:

   ┌──────────────────────────────────────────────────────────────────────┐
   │  "Me meto como el local A. ¿Puedo ver las ventas del local B?"        │
   │                                                                      │
   │      NO  →  el guardia (RLS) está bien ✅                              │
   │      SÍ  →  hay una fuga grave ❌                                     │
   └──────────────────────────────────────────────────────────────────────┘
```

#### Ejercicios

```
   ☐ 1. Leer la Regla de Oro (AGENTS.md, §0) y explicar por qué existe
   ☐ 2. Escribir una prueba que intente leer datos de OTRA tienda
         → TIENE que fallar (no debe dejar leer)
   ☐ 3. Explicar por qué "fallar en silencio" es lo peor que puede pasar
```

#### Señal de que aprendiste

> Explicás por qué un sistema que falla **y avisa** es mejor que uno que falla **y no avisa**.

---

### Etapa 6 — El proyecto + tu primera tarea (semanas 10-12)

```
   LA META:  tu primer "encargo" entregado
```

#### En simple

> Ya sabés leer código, escribir encargos, detectar mentiras, probar y de seguridad. Ahora
> hacés tu **primera tarea real**: un arreglo chico, de un solo archivo, con prueba medible.

```
   TU PRIMERA TAREA:  el gráfico SalesTrendChart
   ────────────────────────────────────────────
   • está 100% especificado en TASK_HANDOFF.md
   • es UN solo archivo
   • tiene una prueba medible
   → el primer encargo perfecto
```

#### Ejercicios

```
   ☐ 1. Explorar el código con la herramienta del mapa (graphify query)
   ☐ 2. Hacer el arreglo del gráfico SalesTrendChart
   ☐ 3. Entregarlo con evidencia (antes y después)
```

#### Las trampas del diseño (memorizar antes de tu primer cambio)

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ 1. tailwind.config.ts NO HACE NADA → el tema vive en globals.css      │
   │ 2. Colores: brand-*   (bg-brand-primary, text-brand-accent)           │
   │ 3. PROHIBIDO: purple, violet, indigo, sky, cyan                       │
   │ 4. verde=éxito · rojo=error · ámbar=advertencia (no se cambian)        │
   │ 5. Los fondos ("superficie") se manejan solo por CSS                  │
   └──────────────────────────────────────────────────────────────────────┘
```

#### Señal de que llegaste

> Podés tomar una tarea, escribir el encargo, delegarla, revisar el resultado y entregar un
> cambio con evidencia. **Sin que nadie te explique.**

---

## El ritual semanal (importante)

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │  UNA VEZ POR SEMANA, ESCRIBIR UN REPORTE CORTO:                       │
   │                                                                      │
   │    • qué estudié                                                      │
   │    • qué NO entendí                                                   │
   │    • qué entregué                                                     │
   └──────────────────────────────────────────────────────────────────────┘
```

**Por qué no es burocracia:** estudiar solo durante semanas **sin reportar** es la forma más
común de que esto se apague. Si una semana no hiciste nada, es mejor saberlo en octubre que en
enero.

```
   ✅ reportás cada semana        → el proyecto se entera a tiempo
   ❌ estudiás en silencio         → en enero nadie sabe si avanzaste
```

### Reglas durante todo el plan

```
   • NO tocar la rama principal (main) nunca. Solo copias (ramas) o tu propia versión (fork)
   • Usar TU identidad de git (que los cambios queden a tu nombre)
   • No leer el código y suponer: correrlo, romperlo, arreglarlo
     (la app local enseña más rápido que cualquier video)
```

---

## Accesos que vas a necesitar

```
   ┌──────────────────────────────────────────┬──────────────────────────────┐
   │ Repo (lectura + copia)                    │ leer y practicar             │
   │ Un proyecto Supabase de PRUEBA (gratis)   │ correr la app en tu compu    │
   │ Tu propia identidad de git                │ que los cambios sean tuyos   │
   │ La herramienta del mapa (graphify)        │ explorar el código           │
   └──────────────────────────────────────────┴──────────────────────────────┘
```

```
   ⚠️  NUNCA: las llaves de PRODUCCIÓN, la LLAVE MAESTRA de la bodega real,
       ni el certificado real del SII. Solo cosas de prueba.
```

---

## El resumen en una imagen

```
   oct        nov                    dic
   │          │                       │
   ▼          ▼                       ▼
   ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐
   │ 1  │  │ 2  │  │ 3★ │  │ 4  │  │ 5  │  │ 6  │
   │Git │  │En- │  │Men-│  │Pru-│  │Se- │  │1ª  │
   │leer│  │cargo│ │tira│  │ebas│  │guri│  │tarea│
   └────┘  └────┘  └────┘  └────┘  └────┘  └────┘
     +  un reporte escrito CADA SEMANA
```

Llegás a diciembre sabiendo trabajar. Ahí empieza el verano de verdad.

---

*Fin del plan. Si algo no se entiende, el punto de partida siempre es `EMPIEZA_AQUI.md`.*
