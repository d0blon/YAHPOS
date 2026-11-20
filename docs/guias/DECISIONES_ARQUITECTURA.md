# DECISIONES DE ARQUITECTURA — YAHPOS!

> **Qué es este documento:** el "por qué" de cada decisión técnica grande. No *qué* se usa
> (eso está en `MANUAL_PROYECTO.md`) ni *cómo está cableado* (eso está en
> `GUIA_CONEXIONES.md`), sino **por qué se eligió esto y no otra cosa**.
>
> **Cómo leerlo:** cada decisión viene siempre con el mismo formato:
> **lo que se decidió → por qué → qué cuesta → la regla que sale de ahí.**

---

### En simple — antes de empezar

> Este documento responde una sola pregunta para cada decisión grande:
> **"¿por qué se hizo así y no de otra forma?"**
>
> Es la pregunta más útil que podés hacer. Casi **todos los errores** del proyecto nacen de
> **deshacer una decisión buena sin saber por qué estaba ahí.** Ejemplo real:

```
   ALGUIEN (o la IA) VE ESTO:            Y PIENSA:
   ────────────────────────              ──────────
   "hay un archivo                    →  "es un archivo inútil,
    tailwind.config.ts                    lo borro / lo edito"
    que no hace nada"
                                             │
                                             ▼
   PERO EL POR QUÉ ES:                       Y ROMPE EL
   ──────────────────                        DISEÑO DE TODAS
   "usamos Tailwind v4, que movió            LAS TIENDAS
    el tema al CSS a propósito"
```

> **Moraleja:** antes de "arreglar" algo que se ve raro, entendé por qué está así. Casi siempre
> hay una razón. Este documento **es** esa razón.

---

## Índice

- [1. Next.js con App Router](#1)
- [2. Un solo edificio (repo full-stack)](#2)
- [3. Supabase como bodega](#3)
- [4. El guardia (RLS) como defensa central](#4)
- [5. Multi-tenant por dominio](#5)
- [6. Tailwind v4 con `@theme`](#6)
- [7. Zustand para el bloc de notas](#7)
- [8. El notario propio (motor SII)](#8)
- [9. Transbank como máquina principal](#9)
- [10. Hardware por el navegador](#10)
- [11. Zod para validar](#11)
- [12. Upstash para frenar abusos](#12)
- [13. PWA + imágenes sin optimizar](#13)
- [14. Cocina vs mesa (server/client)](#14)
- [15. Decisiones que conviene revisar](#15)

---

<a id="1"></a>
## 1. Next.js con App Router

```
   LA DECISIÓN:   Next.js 16 + React 19 + TypeScript
```

### En simple

> Es el "esqueleto de la casa": sirve **tanto para mostrar pantallas como para atender
> pedidos**, todo en un mismo lugar.

### Por qué

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ El proyecto necesita DOS cosas a la vez:                             │
   │                                                                      │
   │   la TIENDA necesita ser rápida y salir en Google  → servidor         │
   │   la CAJA necesita reaccionar al instante          → navegador        │
   │                                                                      │
   │ Next.js da las dos, en el mismo framework.                            │
   └──────────────────────────────────────────────────────────────────────┘
```

- La tienda online **necesita aparecer en Google** (SEO). Eso pide renderizar en el servidor.
- Todo el backend vive acá (las 52 ventanillas). **No hay un servidor aparte.**

### Qué cuesta

La frontera **cocina/mesa** (servidor/navegador) es sutil y es la fuente #1 de errores.

Y una consecuencia operativa concreta: el proyecto tiene una **lista de invitados** (la "CSP")
que dice a qué servicios externos se puede llamar:

```
   connect-src ...  https://maullin.sii.cl     ← el SII de ENSAYO
                    https://palena.sii.cl      ← el SII de VERDAD
                    https://*.supabase.co
```

```
   ⚠️  Si agregás un servicio externo nuevo, HAY QUE AGREGARLO A LA LISTA
       o no va a funcionar. No es magia: es una puerta con lista.
```

> **REGLAS:** `tailwind.config.ts` no cuenta. Dominá `'use client'` (no es opcional). Y antes
> de usar una librería externa, revisá la lista de invitados.

---

<a id="2"></a>
## 2. Un solo edificio (repo full-stack)

```
   LA DECISIÓN:   frontend y backend en el mismo repositorio y proyecto
```

### En simple

> En vez de tener dos edificios (uno para las pantallas, otro para los datos) con una calle en
> el medio, es **un solo edificio** donde todo se comunica fácil.

### Por qué

```
   ┌───────────────────────────┐     ┌───────────────────────────┐
   │   DOS EDIFICIOS            │     │   UN EDIFICIO (elegido)    │
   │                           │     │                           │
   │  Pantallas  │  Datos       │     │  Pantallas + Datos        │
   │      │      │    │         │     │  comparten los tipos,     │
   │      └──calle──┘          │     │  una sola forma de login  │
   │  (hay que coordinar)       │     │  (todo junto)             │
   └───────────────────────────┘     └───────────────────────────┘
```

- **Un solo dueño + vibecoding.** Dos repos y dos deploys multiplican la coordinación.
- Las pantallas y las ventanillas **comparten los tipos**: si algo cambia, se ve al instante.
- `withAuth()` y `createClient()` funcionan igual en ambos lados.

### Qué cuesta

El repo pesa (192 MB, 1.825 imágenes). Y no se puede escalar cada mitad por separado (todavía
no hace falta).

> **REGLA:** la lógica de negocio vive en el servidor. El navegador es para **mostrar** y
> para **pedir**.

---

<a id="3"></a>
## 3. Supabase como bodega

```
   LA DECISIÓN:   Supabase (PostgreSQL) para datos + login + altavoces + archivos
```

### En simple

> No es una bodega cualquiera: es **cuatro servicios en uno** (bodega + portero de entrada +
> altavoces + depósito de archivos).

### Por qué

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ El proyecto necesita CUATRO cosas:                                   │
   │                                                                      │
   │   1. Guardar datos ordenados ......... base de datos                  │
   │   2. Login con Google ................ sistema de entrada             │
   │   3. Avisos en vivo .................. altavoces                      │
   │   4. Guardar logos e imágenes ........ depósito                       │
   │                                                                      │
   │ Supabase trae los cuatro JUNTOS.                                      │
   └──────────────────────────────────────────────────────────────────────┘
```

- **Importa que sea PostgreSQL** y no cualquier base: el proyecto maneja **folios, plata y
  documentos legales**. Eso necesita transacciones de verdad. Una base tipo Firebase sería un
  mal fit.
- **RLS** (el guardia) es una capacidad de PostgreSQL. Sin ella, no habría multi-tenant.

### Qué cuesta

- Dependés de un proveedor: migrar después es caro.
- La **llave maestra** (SERVICE_ROLE_KEY) salta el guardia. Cuidado extremo con ella.

> **REGLA:** la bodega **no es un almacén tonto**. Es **parte activa de la seguridad** (el
> guardia) y de los avisos en vivo. Tratarla como "solo guardar" es un error de concepto.

---

<a id="4"></a>
## 4. El guardia (RLS) como defensa central

```
   LA DECISIÓN:   el aislamiento entre tiendas se garantiza EN LA BODEGA, no solo en el código
```

### En simple

> El guardia de la bodega revisa **cada caja** antes de dártela, aunque el código se haya
> olvidado de pedirlo. Es la barrera que **no se puede olvidar**.

### Por qué

```
   ┌───────────────────────────────┐     ┌───────────────────────────────┐
   │ SOLO EN EL CÓDIGO             │     │ CON EL GUARDIA (elegido)      │
   │                               │     │                               │
   │ si (store_id === mio) { ... } │     │ la bodega decide fila por fila │
   │                               │     │                               │
   │ alcanza 1 olvido o 1 bug      │     │ aunque el código falle,        │
   │ para filtrar datos            │     │ la bodega IGUAL protege        │
   └───────────────────────────────┘     └───────────────────────────────┘
```

Es exactamente el **riesgo #1** del negocio: que el almacén A vea los datos del almacén B.

### Qué cuesta

- Es **más difícil de escribir y de probar** que un simple filtro.
- **Historia: se rompió varias veces.** Hay tres arreglos distintos:

```
   001_fix_multitenancy_rls      ← arreglo
   005_rls_toggles               ← arreglo
   026_security_fix_rls_holes    ← arreglo (¡agujeros!)
```

- Y **nunca se probó formalmente**.

> **REGLA:** cualquier cambio que toque `store_id` se prueba con **caso positivo Y caso
> negativo**. El negativo ("otra tienda ve CERO") es el que importa. De acá nació la Regla de
> Oro.

---

<a id="5"></a>
## 5. Multi-tenant por dominio

```
   LA DECISIÓN:   cada tienda tiene su propia dirección (almacen-don-pedro.yahpos.cl)
```

### En simple

> Como un centro comercial donde cada local tiene **su propia dirección en la calle**, en vez
> de todos compartir una sola puerta con un número de local.

### Por qué

```
   FORMA 1 (no elegida)                FORMA 2 (elegida)
   ──────────────────────              ──────────────────
   yahpos.cl/tienda/don-pedro          don-pedro.yahpos.cl
   yahpos.cl/tienda/la-esquina         la-esquina.yahpos.cl
                                       ↑
   todos bajo el mismo techo           cada uno con SU dirección
                                       (se vende como marca propia)
```

- **Marca propia:** el negocio quiere su nombre y su logo en su dirección.
- **Sesiones separadas:** cada tienda es un "origen" distinto, no se mezclan por accidente.
- La resolución es **barata**: el portero lee la dirección y ya sabe el local.

### Qué cuesta

- **El portero (middleware) es crítico.** Si falla, se cae todo o —peor— muestra la tienda
  equivocada. Por eso es zona roja.
- Trae complejidad de **cookies** (ya causó bugs reales).
- Hay que tratar el **dominio raíz** aparte: ahí no hay negocio, así que bloquea `/admin` y
  `/pos`.

> **REGLA:** **la dirección ES la identidad del negocio.** Romper la resolución del local
> rompe todo. Y el dominio raíz no es una tienda: es la plataforma.

---

<a id="6"></a>
## 6. Tailwind v4 con `@theme`

```
   LA DECISIÓN:   los colores viven en globals.css. tailwind.config.ts está IGNORADO.
```

### En simple

> Los colores de la casa viven **en un solo mural** (`globals.css`). Hay otro archivo de
> colores viejo (`tailwind.config.ts`) que es **de adorno**: no hace nada.

### Por qué

```
   Tailwind v3 (viejo)          Tailwind v4 (usado)
   ───────────────────          ───────────────────
   colores en                   colores en
   tailwind.config.ts           globals.css  @theme { }
        │                            │
   fijos, iguales para todos     pueden cambiar POR TIENDA
                                 (--brand-primary distinto en cada local)
```

Que el tema esté en CSS permite que **cada tienda tenga sus colores** como variables. Eso
conecta directo con el multi-tenant.

### Qué cuesta

```
   ⚠️  LA TRAMPA MÁS GRANDE DEL PROYECTO:

   Cualquiera (persona o IA) va a querer editar  tailwind.config.ts
   esperando cambiar los colores.
                │
                ▼
   NO PASA NADA. Es el error #1 de este proyecto.
```

### La regla

```
   • tailwind.config.ts = basura. No tocarlo.
   • Colores: brand-*   (bg-brand-primary, text-brand-accent)
   • PROHIBIDO: purple-*, violet-*, indigo-*, sky-*, cyan-*
   • Significado fijo:  verde=éxito · rojo=error · ámbar=advertencia
   • globals.css tiene UN solo dueño
```

---

<a id="7"></a>
## 7. Zustand para el bloc de notas

```
   LA DECISIÓN:   Zustand para el estado del navegador
```

### En simple

> Es el **bloc de notas del mostrador**: apunta cosas temporales mientras el cajero trabaja
> (el carrito, la caja abierta, quién sos). No es la bodega; es lo que tenés a mano.

### Por qué

```
   ┌────────────────────┬─────────────────────────────────────────────┐
   │ Redux              │ demasiado pesado para este proyecto          │
   │ Context de React   │ se vuelve lento con mucho estado             │
   │ ZUSTAND (elegido)  │ liviano, rápido, sin vueltas                 │
   └────────────────────┴─────────────────────────────────────────────┘
```

- La **caja registradora necesita estado complejo y rápido**: carrito, turnos, auditoría,
  hardware. Zustand lo maneja sin re-renders de más (clave en algo que se usa todo el día).
- Se lleva bien con el guardado local (modo sin internet).

### Qué cuesta

- El bloc de notas **puede quedar desactualizado** respecto a la bodega. Hay que decidir qué
  vive dónde: si algo debe sobrevivir a un recargado, no puede vivir solo en el bloc.
- Hay **cinco blocs** (`authStore`, `cartStore`, `posStore`, `siiStore`, `hardwareStore`). Si
  empiezan a hablar entre ellos, se enreda.

> **REGLA:** el bloc de notas es para **lo de ahora**, no para la verdad. La verdad vive en la
> bodega. Y los blocs no se llaman entre sí sin motivo.

---

<a id="8"></a>
## 8. El notario propio (motor SII)

```
   LA DECISIÓN:   construir el motor de boletas A MANO, sin contratar a un tercero
```

### En simple

> En vez de pagarle a un notario externo por cada boleta, el sistema **tiene su propio
> notario**. Es más trabajo, pero no cuesta por documento.

### Por qué

```
   ┌───────────────────────────┐     ┌───────────────────────────┐
   │ NOTARIO EXTERNO           │     │ NOTARIO PROPIO (elegido)  │
   │                           │     │                           │
   │ cobra POR CADA boleta     │     │ costo por boleta = 0      │
   │                         │     │                           │
   │ un almacén que emite      │     │ y es EL DIFERENCIADOR del │
   │ mucho → se come el margen │     │ producto                  │
   └───────────────────────────┘     └───────────────────────────┘
```

Las herramientas del repo lo confirman: `node-forge` (firma), `xml-crypto` (firma digital),
`fast-xml-parser`, `jspdf`, `iconv-lite` (el SII usa un formato de texto antiguo,
ISO-8859-1).

### Qué cuesta

- **Es lo más difícil y riesgoso del proyecto.** Un error = documentos inválidos.
- La **correctitud nunca se auditó**.
- Maneja **llaves privadas** → **solo servidor**, sin excepción.

> **REGLA:** el juez del notario es el **SII** (ambiente de ensayo, "Maullín"), no la opinión
> de nadie. Y ningún componente del navegador importa el notario, jamás.

---

<a id="9"></a>
## 9. Transbank como máquina principal

```
   LA DECISIÓN:   Transbank/Webpay como principal, con MercadoPago y TUU como alternativas
```

### En simple

> Es la **máquina de tarjetas** que todos en Chile conocen y esperan.

### Por qué

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Webpay es el estándar de facto en Chile.                             │
   │ Los clientes y los negocios la reconocen y confían.                   │
   │                                                                      │
   │ Se agregaron otras (MercadoPago, TUU) para no depender de una sola.   │
   └──────────────────────────────────────────────────────────────────────┘
```

### Qué cuesta

- Flujo de **ida y vuelta** (crear → el cliente paga afuera → confirmar). Hay que manejar
  estados intermedios.
- Se implementó un cuidado importante: **el servidor lee el monto de la bodega**, no del
  navegador. Un bug ahí sería un agujero directo.

> **REGLA:** el navegador **nunca** manda un valor que se use para cobrar o autorizar. Y se
> prueba incluyendo el caso de orden de otra tienda / otro usuario.

---

<a id="10"></a>
## 10. Hardware por el navegador

```
   LA DECISIÓN:   hablar con impresora, gaveta y lector DESDE EL NAVEGADOR (WebUSB/Bluetooth)
```

### En simple

> El navegador habla directo con la impresora y la gaveta, **sin instalar ningún programa** en
> la computadora del local.

### Por qué

```
   ┌───────────────────────────────┐     ┌───────────────────────────────┐
   │ PROGRAMA LOCAL (no elegido)   │     │ NAVEGADOR (elegido)           │
   │                               │     │                               │
   │ hay que instalar en CADA PC   │     │ cero instalación              │
   │ instalaciones rotas, permisos │     │ funciona al abrir la página   │
   │ soporte técnico eterno        │     │                               │
   └───────────────────────────────┘     └───────────────────────────────┘
```

### Qué cuesta

```
   ⚠️  SOLO funciona en Chrome, Edge u Opera.
       NO en Firefox ni Safari.

   ⚠️  Necesita un CLICK del usuario para conectar.
       (El navegador no deja conectar "solo", por seguridad.)
```

> **REGLA:** todo lo de hardware es **componente del navegador** y **solo Chrome**. Se detecta
> si está disponible y se avisa. Nunca prometer compatibilidad con Firefox.

---

<a id="11"></a>
## 11. Zod para validar

```
   LA DECISIÓN:   validar los datos con Zod
```

### En simple

> Es el **control de calidad** de los datos que entran: revisa que lo que llega sea lo que
> esperás, y avisa si no.

### Por qué

- Con formularios en todos lados (producto, checkout, SII, admin), validar es obligatorio.
- Zod valida **y además** crea el tipo de TypeScript del mismo molde: una sola fuente.

### Qué cuesta

El riesgo es usarlo **a medias**: validar en el navegador (para mostrar errores lindos) y
**olvidar validar en el servidor**.

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ El navegador valida → es para el USUARIO (mensajes lindos)            │
   │ El servidor valida  → es para la SEGURIDAD (no confía en el cliente)  │
   └──────────────────────────────────────────────────────────────────────┘
```

> **REGLA:** la validación del servidor **nunca** se salta.

---

<a id="12"></a>
## 12. Upstash para frenar abusos

```
   LA DECISIÓN:   Upstash (Redis) para limitar cuántos pedidos puede hacer alguien
```

### En simple

> Es el **guardia de la puerta** que cuenta cuántas veces golpeaste: si golpeás demasiado,
> te frena. Sirve para evitar ataques y abusos.

### Por qué

- El portero (middleware) corre en un lugar **sin memoria propia**. No sirve un contador en
  memoria: hace falta un contador **compartido** en otro lado. Upstash lo da.
- Protege contra fuerza bruta en el login y contra spam.

### Qué cuesta

- Una **dependencia externa más** que hay que configurar.
- Si Upstash no está configurado, el freno no existe.

> **REGLA:** el freno vive en el portero y es **parte de la seguridad**, no un extra.

---

<a id="13"></a>
## 13. PWA + imágenes sin optimizar

```
   LA DECISIÓN:   la app se puede instalar (PWA) y las imágenes se sirven tal cual
```

### En simple

> La caja puede **instalarse como si fuera una app** y funcionar **sin internet**. A cambio,
> las imágenes pesan más.

### Por qué

- **PWA** porque el local **no puede dejar de vender** si se corta internet (hay modo offline
  explícito).
- **Imágenes sin optimizar** probablemente para simplificar en el modo offline.

### Qué cuesta

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ El repo pesa 192 MB, con 1.825 imágenes (202 MB).                    │
   │ Es grande para clonar y para publicar.                                │
   └──────────────────────────────────────────────────────────────────────┘
```

> **REGLA:** el "funciona sin internet" tiene costo de peso. Cuando haya tiempo, revisar si se
> puede optimizar sin romper la caja.

---

<a id="14"></a>
## 14. Cocina vs mesa (server/client)

```
   LA DECISIÓN:   usar Server Components por defecto; 'use client' solo cuando hace falta
```

### En simple

```
   SERVER COMPONENT (la cocina)      CLIENT COMPONENT (la mesa)
   ────────────────────────────      ──────────────────────────
   se prepara en el servidor         se prepara en el navegador
   no lo ve el usuario               el usuario lo toca
   más rápido, más liviano           tiene botones y clicks
                                     lleva la marca 'use client'
```

### Por qué

- Menos JavaScript al navegador = app más rápida (clave en la caja y la tienda).
- Los datos se leen en el servidor, sin exponer llaves.

### Qué cuesta (la realidad)

```
   Lo verificado: casi TODO terminó siendo "mesa":
     components/pos    19 de 19
     components/shop   11 de 11
     components/admin  10 de 10

   → la frontera se decidió "por comodidad", no por diseño.
```

> **REGLA:** `'use client'` se pone **solo si es necesario**, y **nunca** para importar algo de
> la cocina que no debe salir (llaves, notario, llave maestra). Si necesitás eso, la lógica va
> al servidor.

---

<a id="15"></a>
## 15. Decisiones que conviene revisar

### En simple

> No todo está resuelto. Estas son cosas que merecen una segunda mirada — y son temas honestos
> de conversación, no secretos.

```
   ┌──────────────────────────────────┬────────────────────────────────────┐
   │ TEMA                             │ OBSERVACIÓN                        │
   ├──────────────────────────────────┼────────────────────────────────────┤
   │ Dos librerías de animación       │ están framer-motion Y gsap:        │
   │                                  │ ¿se usan las dos?                  │
   │ Imágenes sin optimizar           │ ¿sigue haciendo falta? cuesta 200MB│
   │ Casi todo es "mesa"              │ la frontera se resolvió por        │
   │                                  │ comodidad                          │
   │ La caja tiene 1.500 líneas       │ candidata a dividir                │
   │ El guardia (RLS) sin pruebas     │ nunca verificado, y es el riesgo #1│
   │ El notario (SII) sin auditar     │ el audit fue estructural, no trib. │
   │ El mapa del código desactualizado│ el grafo es de julio; cambió       │
   │ Nombres de planes mezclados      │ el README viejo dice Starter/Pro;  │
   │                                  │ los reales son Austral/Archip/Patag│
   │ FLOW_* en .env.example           │ el código usa Transbank, no Flow   │
   └──────────────────────────────────┴────────────────────────────────────┘
```

Ninguna es urgente por sí sola. Pero son el tipo de cosa que la Regla de Oro pide **reportar**
cuando se la encuentra, aunque no se arregle.

---

## La idea que engloba todo

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │   Casi todas estas decisiones buscan lo mismo:                        │
   │                                                                      │
   │        que el sistema sea CONFIABLE, no rápido.                       │
   │                                                                      │
   │   Porque hay PLATA REAL y DOCUMENTOS LEGALES de por medio.            │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘
```

Next.js, Supabase, el guardia, el notario propio, el monto leído del servidor — todas apuntan
a lo mismo. Eso **es** la Regla de Oro, en la práctica.

---

*Fin del documento. Si una decisión de acá no coincide con el código, gana el código — y este
documento se corrige en el mismo cambio.*
