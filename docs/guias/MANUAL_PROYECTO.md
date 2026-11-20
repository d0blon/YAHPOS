# MANUAL DEL PROYECTO — YAHPOS!

> **Si todavía no leíste `EMPIEZA_AQUI.md`, andá ahí primero.** Te da el mapa mental (el
> centro comercial). Este documento es el detalle, y se lee mucho más fácil con ese mapa ya
> en la cabeza.
>
> **Cómo leerlo:** Parte 0 → 5 es la base, en orden. Después es referencia: buscás la parte
> que necesitás.
>
> **Recordatorio de la comparación:** cada tienda es un **local**, el guardia de la bodega es
> **RLS**, el portero es el **middleware**, el notario es el **motor SII**.

---

## Índice

- [Parte 0 — Qué es YAHPOS!](#parte-0)
- [Parte 1 — Con qué está hecho (el stack)](#parte-1)
- [Parte 2 — El viaje de una visita](#parte-2)
- [Parte 3 — Las 7 zonas del sistema](#parte-3)
- [Parte 4 — La bodega central y el guardia (datos y RLS)](#parte-4)
- [Parte 5 — La caja registradora (el POS)](#parte-5)
- [Parte 6 — El notario (el motor SII)](#parte-6)
- [Parte 7 — La tienda de la esquina (e-commerce)](#parte-7)
- [Parte 8 — La entrada y los carnets (auth y roles)](#parte-8)
- [Parte 9 — Cobrar (pagos y planes)](#parte-9)
- [Parte 10 — Las reglas que no se rompen](#parte-10)
- [Parte 11 — Errores del pasado (para no repetirlos)](#parte-11)
- [Parte 12 — Cómo se trabaja acá](#parte-12)
- [Parte 13 — Glosario](#parte-13)

---

<a id="parte-0"></a>
## Parte 0 — Qué es YAHPOS!

### En simple

> Es un sistema que le da a un almacén **todo en uno**: una caja registradora, una tienda por
> internet, y la capacidad de **dar boletas legales**. Y muchos almacenes lo usan a la vez,
> cada uno por separado.

### Qué le da a cada negocio

```
   ┌───────────────────────────────────────────────────────────────┐
   │                    LO QUE RECIBE UN ALMACÉN                    │
   ├───────────────────────────────────────────────────────────────┤
   │                                                                │
   │  1. UN POS (caja registradora)                                 │
   │     Vender en el local, con impresora de boletas, gaveta de    │
   │     plata, lector de códigos, balanza y pantalla de cliente    │
   │                                                                │
   │  2. UNA TIENDA ONLINE                                          │
   │     Catálogo, carrito, pago con tarjeta, envío                 │
   │                                                                │
   │  3. BOLETAS LEGALES (SII)                                      │
   │     Emite boletas y facturas firmadas y enviadas al Estado     │
   │                                                                │
   │  4. UN PANEL DE ADMINISTRACIÓN                                 │
   │     Productos, stock, cajas, turnos, personal, reportes        │
   └───────────────────────────────────────────────────────────────┘
```

### Los tres planes (cuánto cuesta)

Como un centro comercial alquila locales de distinto tamaño, YAHPOS! vende tres planes:

```
   AUSTRAL           ARCHIPIÉLAGO        PATAGONIA
   0,6 UF            1 UF                1,8 UF
   ┌────────┐        ┌────────────┐      ┌──────────────────┐
   │ Almacén│        │ Almacén con│      │ Cadena / varios  │
   │ chico  │        │ más        │      │ locales          │
   └────────┘        │ movimiento │      └──────────────────┘
                     └────────────┘
```

*(UF = Unidad de Fomento, la unidad de cuenta chilena.)*

### Por qué esto es serio

Dos razones, y son las dos más importantes de todo el proyecto:

```
   RAZÓN 1: DINERO REAL
   ────────────────────
   El sistema maneja cobros con tarjeta. Si el precio
   se puede manipular, alguien paga $1 por algo de $50.000.

   RAZÓN 2: DOCUMENTOS LEGALES
   ───────────────────────────
   Las boletas que emite tienen VALIDEZ LEGAL ante el SII.
   Si el "notario" firma mal, el cliente queda con boletas
   inválidas ante el Estado.
```

Y hay una tercera, que es la característica principal del sistema:

```
   RAZÓN 3: MUCHOS INQUILINOS JUNTOS
   ─────────────────────────────────
   Como un centro comercial, todos los locales comparten
   el mismo edificio. El desafío es que el Almacén Don Pedro
   NUNCA pueda ver las ventas de la Tienda La Esquina.
   A eso se le llama AISLAMIENTO. Es el riesgo #1.
```

---

<a id="parte-1"></a>
## Parte 1 — Con qué está hecho (el stack)

### En simple

> "Stack" = el conjunto de herramientas con las que está construido el sistema. Como decir
> "esta casa está hecha de ladrillo, cemento y madera".

### Las herramientas y para qué sirve cada una

```
   ┌─────────────┬──────────────────────────┬─────────────────────────┐
   │ HERRAMIENTA │ QUÉ ES (en simple)       │ PARA QUÉ SE USA ACÁ     │
   ├─────────────┼──────────────────────────┼─────────────────────────┤
   │ Next.js 16  │ El esqueleto de toda la  │ Páginas + ventanillas   │
   │             │ app                      │                         │
   │ TypeScript  │ Un "idioma" para escribir│ Evita errores de tipos  │
   │             │ código con menos errores │                         │
   │ Tailwind v4 │ El sistema de diseño     │ Colores, espacios, todo │
   │ Supabase    │ La bodega + login +      │ Datos, sesiones, tiempo │
   │             │ altavoces, todo junto    │ real                    │
   │ Zustand     │ El bloc de notas         │ Estado temporal del POS │
   │ Recharts    │ Para hacer gráficos      │ Reportes del admin      │
   │ Transbank   │ La máquina de tarjetas   │ Cobros                  │
   │ Jest+Playwr │ Herramientas de prueba   │ Verificar que no rompés │
   └─────────────┴──────────────────────────┴─────────────────────────┘
```

### Las dos que más te van a importar

**1. Next.js y la diferencia "cocina vs mesa"**

En Next.js hay dos tipos de código:

```
   SERVER COMPONENT (la cocina)          CLIENT COMPONENT (la mesa)
   ────────────────────────────          ──────────────────────────
   • Corre en el servidor                • Corre en el navegador
   • No lo ve el usuario                 • El usuario lo toca
   • Lee datos de la bodega              • Tiene botones, clicks
   • Va primero, rápido                  • Lleva la marca 'use client'
```

**2. Tailwind y la trampa del archivo que no sirve**

```
   ⚠️  OJO CON ESTO DESDE EL DÍA 1:

   Hay un archivo llamado  tailwind.config.ts
   ...que NO HACE NADA. Está de adorno.

   Los colores de verdad viven en  src/app/globals.css
   dentro de un bloque que dice  @theme { ... }

   Si alguien edita tailwind.config.ts esperando cambiar
   algo → va a perder el tiempo. No pasa nada.
```

---

<a id="parte-2"></a>
## Parte 2 — El viaje de una visita

### En simple

> Cuando alguien entra a una tienda de YAHPOS!, su pedido pasa por la misma cadena que una
> persona que entra a un centro comercial: **portero → decorador → local**.

### La cadena, paso a paso

```
   ALGUIEN ABRE:   almacen-don-pedro.yahpos.cl
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 1. EL PORTERO  (middleware.ts)                            │
   │                                                           │
   │  • Lee la dirección (host)                                │
   │  • Pregunta: "¿a qué local corresponde esta dirección?"   │
   │  • Revisa que tengas sesión válida                        │
   │  • Anota en la puerta: x-store-id = este local             │
   │  • Si la dirección no existe → te manda a la entrada       │
   └──────────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 2. EL DECORADOR  (providers)                              │
   │                                                           │
   │  • Pone los colores del local (--brand-*)                 │
   │  • Pone el nombre y el logo del local                     │
   │  • Decide si es modo claro u oscuro                       │
   └──────────────────────────────────────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 3. EL LOCAL  (la página)                                  │
   │                                                           │
   │  • Muestra la pantalla que pediste                        │
   │  • Ya sabe de qué tienda es, con qué colores, qué plan    │
   └──────────────────────────────────────────────────────────┘
```

### Quién hace qué (los "decoradores")

Los **providers** son los que envuelven toda la app y le dan contexto. Hay cuatro:

```
   ThemeProvider      →  ¿claro u oscuro?
   SaaSProvider       →  ¿qué plan, qué nombre, qué logo?  ← el decorador principal
   BrandThemeSetter   →  inyecta los colores de la tienda
   EditorProvider     →  el editor visual de la landing
```

### La trampa de los dos decoradores

```
   El local del POS quiere estar en modo CLARO  (luz de día, para trabajar)
   El resto de la app quiere estar en modo OSCURO

   Como hay DOS decoradores, hay que evitar que se peleen.
   REGLA: los colores de "superficie" (fondos) se manejan SOLO por CSS,
          nunca con estilos escritos a mano encima de los decoradores.
```

---

<a id="parte-3"></a>
## Parte 3 — Las 7 zonas del sistema

### En simple

> El proyecto se puede dividir en 7 zonas, como las áreas de un centro comercial. Esta
> división también sirve para repartir el trabajo entre dos personas.

### El mapa de las 7 zonas

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ D1. EL EDIFICIO (núcleo)                                              │
   │     Conexión a la bodega, seguridad, tema, portero                    │
   │     → Si esto se rompe, se rompe TODO                                 │
   ├──────────────────────────────────────────────────────────────────────┤
   │ D2. LA CAJA REGISTRADORA (POS)                                        │
   │     Vender, cobrar, abrir/cerrar caja, imprimir, pantalla cliente      │
   ├──────────────────────────────────────────────────────────────────────┤
   │ D3. EL NOTARIO (motor SII)                                            │
   │     Emitir boletas legales: folios, firma, envío al SII               │
   ├──────────────────────────────────────────────────────────────────────┤
   │ D4. LA TIENDA DE LA ESQUINA (e-commerce)                              │
   │     Catálogo, carrito, checkout, pagos online                         │
   ├──────────────────────────────────────────────────────────────────────┤
   │ D5. LA OFICINA DEL DUEÑO (admin)                                      │
   │     Panel para manejar productos, stock, personal, reportes           │
   ├──────────────────────────────────────────────────────────────────────┤
   │ D6. LA ENTRADA (auth)                                                 │
   │     Login, registro, sesión                                           │
   ├──────────────────────────────────────────────────────────────────────┤
   │ D7. EL PLANO DE LA BODEGA (datos / RLS)                               │
   │     Las tablas, las migraciones y las reglas del guardia              │
   └──────────────────────────────────────────────────────────────────────┘
```

### Dónde vive cada zona

| Zona | Carpeta principal |
|---|---|
| D1 Núcleo | `src/middleware.ts`, `src/providers/`, `src/lib/supabase.ts` |
| D2 POS | `src/app/(pos)/`, `src/components/pos/`, `src/lib/hardware/` |
| D3 SII | `src/lib/sii/`, `src/app/api/sii/`, `src/app/admin/facturacion/` |
| D4 Tienda | `src/app/(shop)/`, `src/components/shop/`, `src/sections/` |
| D5 Admin | `src/app/admin/`, `src/components/admin/` |
| D6 Auth | `src/app/(auth)/`, `src/stores/authStore.ts` |
| D7 Datos | `supabase/migrations/` |

### El dato clave para repartir el trabajo

```
   ┌────────────────────────────────────────────────────────────┐
   │                                                            │
   │   src/lib  =  3.072 líneas  =   7% del código              │
   │                              =  ~80% del RIESGO            │
   │                                                            │
   │   el resto = ~38.000 líneas  =  93% del código             │
   │                              =  ~20% del riesgo            │
   │                                                            │
   └────────────────────────────────────────────────────────────┘
```

**Por qué:** ese 7% contiene el notario (SII), la conexión a la bodega, la seguridad y las
llaves. Lo demás es "superficie": pantallas que se revisan mirando la pantalla.

**Consecuencia:** el trabajo **no se reparte mitad y mitad**. El dueño se queda con el 7% que
no se puede equivocar; el colaborador con el 93% que se verifica a la vista.

### Las 3 piezas que usa TODO el mundo

```
   ┌─────────────────────┬──────────────────────────────────────┐
   │ createClient()      │ Abre la puerta a la bodega           │
   │ withAuth()          │ Revisa tu carnet antes de atenderte  │
   │ useSaaS()           │ Sabe de qué tienda sos               │
   └─────────────────────┴──────────────────────────────────────┘
```

Como las usan **todas** las zonas, cualquier cambio ahí afecta a todo el edificio. Por eso
son zona del dueño.

---

<a id="parte-4"></a>
## Parte 4 — La bodega central y el guardia (datos y RLS)

### En simple

> La **bodega** guarda todo (productos, ventas, clientes). El **guardia (RLS)** es lo que
> garantiza que cada local toque solo sus propias cajas.

### Cómo está organizada la bodega

Los "planos" de la bodega son las **migraciones** (archivos que la construyen paso a paso).
Hay 26, y se aplican en orden (001, 002, ... 026). Son la historia de cómo creció.

```
   001 ██
   002 ██
   003 ██   ... cada archivo agrega o corrige algo ...
   025 ██
   026 ██   ← el último
```

### Las cajas (tablas) por área

```
   CUENTAS Y LOCALES         VENTAS Y CAJA            NOTARÍA (SII)
   ─────────────────         ─────────────            ─────────────
   stores                    orders                   sii_documents
   profiles                  order_items              sii_folios
   user_stores               payments                 sii_config
   merchants                 pos_drafts               sii_logs
   branches                  cash_sessions            sii_certification_cases
   terminals                 cash_movements
   shifts
   store_settings            CATÁLOGO                 SUSCRIPCIONES
                             ────────                 ─────────────
                             products                 subscription_tiers
                             categories               subscriptions
                             inventory
                             master_catalog_products
```

### El guardia de la bodega: RLS

**RLS** (*Row Level Security* = "seguridad por fila") son reglas que se aplican **dentro de la
bodega misma**. Funcionan así:

```
   VOS PEDÍS:  "dame todas las ventas"
                        │
                        ▼
   ┌─────────────────────────────────────────────┐
   │  EL GUARDIA (RLS)                            │
   │                                             │
   │  "¿Cuál es tu número de local?  42"          │
   │  "¿De qué local son estas ventas?"           │
   │        · venta 1 → local 42  ✅ pasá          │
   │        · venta 2 → local 42  ✅ pasá          │
   │        · venta 3 → local 99  ❌ la escondo    │
   │                                             │
   └─────────────────────────────────────────────┘
                        │
                        ▼
   VOS VES:  solo las ventas del local 42
```

**Lo importante:** aunque un programador (o la IA) se **olvide** de filtrar en el código, el
guardia **igual** protege. Es la última barrera, y la única que no se puede olvidar.

### Las dos puertas a la bodega (¡esto es clave!)

```
   ┌──────────────────────────┬───────────────────────────┬─────────────┐
   │ LA PUERTA               │ QUÉ ES                     │ ¿PASA EL    │
   │                          │                            │ GUARDIA?    │
   ├──────────────────────────┼───────────────────────────┼─────────────┤
   │ createClient()           │ Tu llave normal            │  ✅ SÍ      │
   │                          │ (sos quien sos)            │             │
   ├──────────────────────────┼───────────────────────────┼─────────────┤
   │ createAdminClient()      │ La LLAVE MAESTRA           │  ❌ NO      │
   │                          │ (el jefe de la bodega)     │  ve TODO   │
   └──────────────────────────┴───────────────────────────┴─────────────┘
```

**La regla de oro de la bodega:**

```
   ¿Le estás dando datos a un USUARIO?      → createClient()   (tu llave)
   ¿Es un proceso del SISTEMA?              → createAdminClient() (solo servidor)

   ⚠️  La llave maestra NUNCA se le da a un usuario.
       Si se la das, ese usuario puede ver TODO.
```

### Una advertencia sobre el guardia

El guardia (RLS) es lo que más se **ha roto** en este proyecto. Hay tres "arreglos" distintos
en la historia (`001`, `005`, `026`). Y **nunca se ha probado formalmente** que funcione al
100%.

```
   HISTORIA DE LOS ARREGLOS AL GUARDIA:
   001_fix_multitenancy_rls       ← arreglo
   005_rls_toggles                ← arreglo
   026_security_fix_rls_holes     ← arreglo (agujeros de seguridad)
```

Por eso la prueba más importante del sistema es siempre esta:

> *"Me meto como el local A y confirmo que NO puedo ver ni tocar nada del local B."*

---

<a id="parte-5"></a>
## Parte 5 — La caja registradora (el POS)

### En simple

> El POS es la pantalla donde el cajero vende en el local. Es la parte que más se usa todos
> los días, y la que toca el hardware real (impresora, gaveta, lector).

### El ciclo completo de una venta

```
   1. ABRIR CAJA
      El cajero ingresa cuánta plata hay al empezar
              │
              ▼
   2. ARMAR EL CARRITO
      Escanea o busca productos y los agrega
      (si es algo que se pesa → aparece la balanza en pantalla)
              │
              ▼
   3. CLIENTE (opcional)
      Busca al cliente por RUT, le suma puntos
              │
              ▼
   4. COBRAR
      Efectivo · débito · crédito · transferencia · QR
      (si quiere borrar un ítem → pide PIN del supervisor)
              │
              ▼
   5. BOLETA LEGAL
      El "notario" (motor SII) arma, firma y encola la boleta
              │
              ▼
   6. IMPRIMIR
      Sale la boleta por la impresora + se abre la gaveta de plata
              │
              ▼
   7. CERRAR CAJA
      Cuadrar la plata del día (con opción de "cierre a ciegas")
```

### La pantalla del cliente

```
   ┌──────────────────┐         ┌───────────────────────┐
   │   LA CAJA        │◄───────►│  PANTALLA DEL CLIENTE │
   │  (lo que ve el   │  se     │  (lo que ve el cliente│
   │   cajero)        │  hablan │   del almacén)        │
   └──────────────────┘  entre  └───────────────────────┘
                        sí
```

Se sincronizan por **BroadcastChannel** = dos ventanas **en el mismo computador** que se
hablan entre sí. La pantalla del cliente muestra el carrito, el QR de pago, y el "gracias".

### El hardware (¡solo funciona en Chrome!)

```
   ┌───────────────────────┬────────────────────────────────────┐
   │ LA IMPRESORA          │ Saca la boleta (WebUSB)            │
   │ LA GAVETA DE PLATA    │ Se abre sola al cobrar             │
   │ EL LECTOR DE CÓDIGOS  │ Lee el código de barras (Bluetooth)│
   └───────────────────────┴────────────────────────────────────┘
```

```
   ⚠️  REGLA: todo esto SOLO funciona en Chrome, Edge u Opera.
       NO funciona en Firefox ni Safari.
       Y necesita que el usuario haga un CLICK para conectar.
       (No se puede conectar "solo", por seguridad del navegador.)
```

### El modo sin internet

Un local **no puede dejar de vender** porque se cortó el internet. Por eso el POS guarda las
ventas en el equipo y las sincroniza cuando vuelve la conexión:

```
   SE CORTA INTERNET
        │
        ▼
   ┌──────────────────┐
   │ Sigue vendiendo  │  las ventas se guardan en el equipo
   │ (modo offline)   │
   └────────┬─────────┘
            │  vuelve el internet
            ▼
   ┌──────────────────┐
   │ Sincroniza todo  │  las ventas de a poco llegan a la bodega
   └──────────────────┘
```

---

<a id="parte-6"></a>
## Parte 6 — El notario (el motor SII)

### En simple

> El motor SII es el "notario" del sistema: toma una venta y produce un **documento legal**
> (boleta o factura), lo **firma**, y lo **envía al Estado**. Sin él, las ventas no valen
> legalmente.

### El problema que resuelve

Cuando un almacén vende, el Estado (SII) exige una **boleta electrónica**. Esa boleta:

- tiene un **número único** (folio) que el SII autorizó de antemano,
- está **firmada digitalmente** (para que no se pueda falsificar),
- se **envía al SII** por internet.

**Hacer esto bien es difícil.** Por eso muchos sistemas contratan a un tercero que lo haga.
YAHPOS! lo hace **solo**, y eso es una de sus ventajas.

### Los "cargos" del notario (sus archivos)

```
   ┌──────────────────┬──────────────────────────────────────────┐
   │ auth.ts          │ Consigue el permiso del SII (el token)   │
   │ caf.ts           │ Lee los folios autorizados               │
   │ engine.ts        │ EL JEFE: coordina todo                   │
   │ signer.ts        │ Firma el documento                       │
   │ ted.ts           │ Pone el "timbre" electrónico             │
   │ envio.ts         │ Mete el documento en el sobre y lo manda │
   │ pdf-generator.ts │ Hace el PDF que ve el cliente            │
   └──────────────────┴──────────────────────────────────────────┘
```

### El recorrido de una boleta

```
   UNA VENTA
        │
        ▼
   ┌───────────────────────────────┐
   │ 1. Preparar el documento       │
   │    • pedir el siguiente folio  │
   │    • calcular IVA y totales    │
   └───────────┬───────────────────┘
               ▼
   ┌───────────────────────────────┐
   │ 2. Firmar                      │
   │    • firma digital             │
   │    • timbre electrónico (TED)  │
   └───────────┬───────────────────┘
               ▼
   ┌───────────────────────────────┐
   │ 3. Guardar como "pendiente"    │
   └───────────┬───────────────────┘
               ▼
   ┌───────────────────────────────┐
   │ 4. ENVIAR AL SII               │
   │    • pedir token               │
   │    • armar el sobre            │
   │    • mandar                    │
   └───────────┬───────────────────┘
               ▼
   ┌───────────────────────────────┐
   │ 5. El SII responde:            │
   │    ✅ aceptada   o   ❌ error   │
   └───────────────────────────────┘
```

### Las boletas que importan

```
   Tipo 39  →  Boleta electrónica     (lo más común en un almacén)
   Tipo 41  →  Boleta exenta
   Tipo 33  →  Factura electrónica
```

### Los dos "ensayos" (ambientes)

```
   ┌────────────────────┬────────────────────────────────────────┐
   │ CERTIFICACIÓN      │ "Maullín". Es el ensayo: se prueba sin │
   │ (maullin.sii.cl)   │ valor legal. Acá se verifica que ande. │
   ├────────────────────┼────────────────────────────────────────┤
   │ PRODUCCIÓN         │ "Palena". Es de verdad. Las boletas    │
   │ (palena.sii.cl)    │ emitidas acá SÍ valen.                 │
   └────────────────────┴────────────────────────────────────────┘
```

### La regla más importante del notario

```
   ┌──────────────────────────────────────────────────────────────┐
   │  El juez del notario NO sos vos. Es el SII.                   │
   │                                                              │
   │  La única prueba de que el motor funciona es que el ambiente  │
   │  de CERTIFICACIÓN (Maullín) ACEPTE los documentos.            │
   │                                                              │
   │  "Parece que anda" no sirve. O el SII lo acepta, o no.        │
   └──────────────────────────────────────────────────────────────┘
```

### La segunda regla

El notario maneja **llaves privadas** (como el sello oficial). Por eso:

```
   ⚠️  El notario NUNCA se usa desde el navegador.
       Solo desde el servidor (la cocina).
       Si un componente del navegador lo importa → es un agujero grave.
```

---

<a id="parte-7"></a>
## Parte 7 — La tienda de la esquina (e-commerce)

### En simple

> Es la tienda online del almacén. El cliente entra, mira productos, agrega al carrito, paga
> con tarjeta y recibe su compra.

### Las pantallas de la tienda

```
   /                        →  la portada del almacén
   /buscar                  →  buscador
   /categoria/[nombre]      →  una categoría (bebidas, limpieza…)
   /producto/[nombre]       →  el detalle de un producto
   /carrito                 →  lo que vas a comprar
   /checkout                →  pagar
   /perfil                  →  tus datos
```

### El recorrido de una compra

```
   1. MIRAR         portada / categoría / producto
         │
         ▼
   2. AGREGAR       al carrito  (queda anotado en el bloc de notas)
         │
         ▼
   3. PAGAR         checkout
         │
         ├─ 3a. se CREA la orden en la bodega (con sus productos y total)
         │        ⚠️  ANTES de pagar
         │
         ├─ 3b. se calcula el monto → LO CALCULA EL SERVIDOR
         │
         ▼
   4. PAGAR EN LA MÁQUINA    (Transbank / Webpay)
         │
         ▼
   5. CONFIRMAR     vuelve y se marca como pagada
```

### El detalle de seguridad que vale oro

```
   ┌──────────────────────────────────────────────────────────────┐
   │  ¿Quién decide cuánto se cobra?                               │
   │                                                              │
   │   ❌ MAL:  el navegador manda el precio                       │
   │           → cualquiera lo cambia y paga $1                    │
   │                                                              │
   │   ✅ BIEN: el servidor lee el total de la bodega              │
   │           → no se puede manipular                             │
   │                                                              │
   │   El servidor también revisa que la orden sea DE ESA tienda   │
   │   y DE ESE cliente.                                          │
   └──────────────────────────────────────────────────────────────┘
```

### Deuda conocida (cosas para limpiar)

```
   • Hay dos tarjetas de producto casi iguales (una de más)
   • Hay componentes "huérfanos" (que nadie usa) en la carpeta shop
   • Son trabajos de limpieza, de bajo riesgo → buenos primeros encargos
```

---

<a id="parte-8"></a>
## Parte 8 — La entrada y los carnets (auth y roles)

### En simple

> Para entrar, te logueás con Google (como en cualquier app). Una vez adentro, **tu carnet**
> dice qué podés hacer: si sos el dueño, el cajero, o un cliente.

### Cómo se entra

```
   El usuario aprieta "Entrar con Google"
              │
              ▼
   Google confirma quién es
              │
              ▼
   Supabase crea una "sesión" (una credencial temporal)
              │
              ▼
   El portero (middleware) revisa: ¿a qué local pertenece?
              │
              ▼
   Entra a SU local, con los permisos de SU carnet
```

### Los carnets (roles)

```
   ┌────────────┬────────────────────────────────────────────┐
   │ OWNER      │ Dueño del negocio (el que paga)             │
   │ ADMIN      │ Administrador de la tienda                  │
   │ MANAGER    │ Encargado de turno                          │
   │ CASHIER    │ Cajero / operador                           │
   │ DEVELOPER  │ Acceso total al sistema (interno)           │
   │ CUSTOMER   │ Cliente final (el que compra)               │
   └────────────┴────────────────────────────────────────────┘
```

> Ojo: históricamente se usaron **dos nombres** para lo mismo (`cajero` vs `cashier`). Hay una
> función que los unifica (`normalizeRole`). Si hay que agregar un rol, se agrega **en un solo
> lugar**, no en cada pantalla.

### El "carnet" de las ventanillas: `withAuth()`

Antes de que una ventanilla (ruta API) te atienda, revisa tu carnet:

```
   Llegás a una ventanilla
              │
              ▼
   ┌────────────────────────────────────┐
   │  withAuth()                         │
   │  • ¿Tenés sesión?        Si no → 401│
   │  • ¿Tenés perfil?                   │
   │  • ¿Tenés tienda?        Si no → 403│
   │  → te deja pasar con tu identidad   │
   └────────────────────────────────────┘
```

Es el guardián de casi todas las ventanillas. **Ninguna ruta que dé datos se salta esto.**

---

<a id="parte-9"></a>
## Parte 9 — Cobrar (pagos y planes)

### En simple

> Hay **dos tipos de cobro**: el que le hacés al **cliente final** (cuando compra) y el que le
> hacés al **negocio** (por usar YAHPOS!).

### Cobro al cliente final (las "máquinas" de pago)

```
   ┌────────────────────┬───────────────────────────────────────┐
   │ TRANSBANK / WEBPAY │ La principal. La que todos conocen.    │
   │ MERCADOPAGO        │ Alternativa                             │
   │ TUU                │ Alternativa                             │
   └────────────────────┴───────────────────────────────────────┘
```

Todos funcionan parecido: **crear → el cliente paga afuera → confirmar**. Y siempre con la
misma regla:

```
   ⚠️  El MONTO lo manda el servidor, nunca el navegador.
```

### Cobro al negocio (los planes)

El negocio paga una **suscripción** según su plan (Austral / Archipiélago / Patagonia). El
plan vive en la bodega y lo lee el decorador (`SaaSProvider`), que además **escucha en vivo**:
si el dueño cambia de plan, la interfaz se entera al instante.

---

<a id="parte-10"></a>
## Parte 10 — Las reglas que no se rompen

### En simple

> Estas reglas existen porque **alguien ya las rompió antes** y salió caro. No son capricho:
> son cicatrices.

### La Regla de Oro

```
   ┌──────────────────────────────────────────────────────────────┐
   │                                                              │
   │     CORRECTO Y SEGURO  antes que  RÁPIDO                      │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
```

Nació de una auditoría que encontró **~10 errores graves**, todos con la **misma causa**:

```
   ALGUIEN CONSTRUYÓ ALGO, QUEDÓ A MEDIAS O SE REEMPLAZÓ POR OTRA COSA,
   Y NADIE VERIFICÓ QUE LAS DOS PARTES SIGUIERAN DE ACUERDO.
```

Por eso: una tarea puede tardar el **doble** si eso evita un agujero. Y si tocás datos,
la prueba de seguridad se hace **en el mismo cambio**, no "después".

### Las zonas prohibidas (no tocar sin permiso)

```
   🔴 ZONAS ROJAS:
      middleware.ts          (el portero)
      SaaSProvider.tsx       (el decorador principal)
      src/lib/sii/engine.ts  (el notario)
      src/lib/supabase.ts    (la conexión a la bodega)

   🔴 ARCHIVOS QUE NO SE TOCAN:
      src/app/globals.css    (los colores de TODAS las tiendas)
      src/sections/PlatformLanding.tsx
      src/components/layout/PlatformHeader.tsx
      src/app/(auth)/login/page.tsx
      src/components/ui/button.tsx
      src/components/ui/badge.tsx
```

### Las trampas del diseño (Tailwind)

```
   1. tailwind.config.ts NO HACE NADA → el tema vive en globals.css (@theme)
   2. Usar clases brand-* (bg-brand-primary, text-brand-accent)
   3. PROHIBIDO purple-*, violet-*, indigo-*, sky-*, cyan-*
   4. Colores con significado fijo:
         verde  = éxito
         rojo   = error
         ámbar  = advertencia
      (estos NO se cambian)
   5. Los fondos ("superficies") se manejan solo por CSS, no a mano
```

---

<a id="parte-11"></a>
## Parte 11 — Errores del pasado (para no repetirlos)

### En simple

> Estos dos errores fueron críticos, ya se corrigieron, y enseñan la lección más importante
> del proyecto.

### Error 1 — Las cookies viajaban "sin candado"

```
   QUÉ PASÓ:  las credenciales de sesión se mandaban sin cifrar
   RIESGO:    alguien podía "robar" la sesión de otro
   CAUSA:     un valor puesto para probar en local y nunca sacado
   ESTADO:    ✅ corregido
```

### Error 2 — La llave maestra con un "plan B" silencioso

```
   QUÉ PASÓ:  si faltaba la llave maestra de la bodega, en vez de
              avisar, usaba una llave débil en silencio
   RIESGO:    procesos que creían tener permisos y no los tenían
              (o al revés)
   ESTADO:    ✅ corregido (ahora avisa y frena)
```

### La lección que une a los dos

```
   ┌──────────────────────────────────────────────────────────────┐
   │                                                              │
   │   EL PEOR ERROR ES EL SILENCIOSO.                             │
   │                                                              │
   │   Un sistema que falla y AVISA se arregla.                    │
   │   Un sistema que falla y NO AVISA te destruye sin que te      │
   │   enteres.                                                   │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
```

### Lo que todavía está pendiente (honestidad)

```
   • El aislamiento (RLS) nunca se probó formalmente   ← riesgo #1
   • Las boletas (SII) nunca se auditaron tributariamente
   • Hay muy pocas pruebas automáticas (casi ninguna)
   • Hay un archivo gigante (el POS tiene 1.500 líneas)
   • Hay componentes que nadie usa (limpieza pendiente)
```

---

<a id="parte-12"></a>
## Parte 12 — Cómo se trabaja acá

### En simple

> El trabajo no es "escribir código". Es **encargar, verificar y documentar**. El que escribe
> código es la IA; vos sos el que revisa.

### El ciclo de 4 pasos

```
   ┌───────────────┐   ┌───────────┐   ┌──────────┐   ┌──────────┐
   │ 1. DIVIDIR    │──►│ 2. DELEGAR│──►│ 3. VERI- │──►│ 4. INFOR-│
   │               │   │           │   │   FICAR  │   │   MAR    │
   │ En trozos     │   │ Que la IA │   │ ¿Hizo    │   │ Dejar    │
   │ chicos y      │   │ lo haga   │   │ lo que   │   │ escrito  │
   │ aislados      │   │           │   │ pediste? │   │ qué pasó │
   └───────────────┘   └───────────┘   └──────────┘   └──────────┘
```

### El "encargo" (el truco más importante)

Cuando le pedís algo a la IA, no se pide de cualquier forma. Se usa una **plantilla de
encargo** con estas partes:

```
   ┌──────────────────────────────────────────────────────────────┐
   │  UN BUEN ENCARGO TIENE:                                       │
   │                                                              │
   │  • Contexto ....... qué está pasando y por qué                │
   │  • Causa raíz ..... el diagnóstico, no el síntoma             │
   │  • El cambio ...... exactamente qué hacer                     │
   │  • Blast radius ... qué más se puede romper                   │
   │  • Plan de pruebas  cómo se demuestra que funciona            │
   │  • DO NOT ......... qué NO hacer   ← la más importante        │
   │                                                              │
   └──────────────────────────────────────────────────────────────┘
```

> El **"Do Not"** es la sección clave: define los **límites**. Sin ella, el trabajo se va por
> las ramas.

### La verdad del vibecoding

```
   LO QUE PARECE:                          LO QUE ES:
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  pedir              ▓▓▓▓▓▓  pedir
   ░░░░░░░░░░░░░░░░░░░░  revisar            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                                            ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
                                            revisar y rechazar
```

### Cómo detectar cuando la IA miente

```
   ┌────────────────────┬─────────────────────────────────────────┐
   │ LA MENTIRA         │ CÓMO SE VE                              │
   ├────────────────────┼─────────────────────────────────────────┤
   │ "Ya está listo"    │ sin evidencia, sin haber probado nada  │
   │ API inventada      │ una función que no existe               │
   │ Se fue de las ramas│ "aproveché y también arreglé X"         │
   │ Prueba tramposa    │ una prueba que pasa porque no prueba    │
   │ Cambio silencioso  │ tocó archivos que no le pediste         │
   └────────────────────┴─────────────────────────────────────────┘
```

Y el truco del **buen pedido**:

```
   ❌ "Revisá esto"                        → resultado inútil
   ✅ "Encontrá cómo esto rompe el         → resultado útil
       aislamiento entre tiendas"
```

---

<a id="parte-13"></a>
## Parte 13 — Glosario

| Palabra | En simple |
|---|---|
| **POS** | Punto de venta. La caja registradora |
| **Tenant** | Cada tienda/inquilino |
| **Tienda / Store** | Un negocio dentro del sistema |
| **Sucursal / Branch** | Un local físico de una misma tienda |
| **Plan / Tier** | Austral / Archipiélago / Patagonia |
| **DTE** | Documento Tributario Electrónico (la boleta legal) |
| **SII** | El organismo del Estado que exige esas boletas |
| **CAF** | El archivo con los folios que el SII autorizó |
| **Folio** | El número único de cada boleta |
| **TED** | El "timbre" electrónico del documento |
| **Maullín** | El ambiente de ENSAYO del SII |
| **RLS** | El guardia de la bodega (seguridad por fila) |
| **Llave maestra** | La clave que salta el guardia (¡peligrosa!) |
| **RPC** | Una función que corre dentro de la bodega |
| **Store ID** | El número que ata cada dato a su tienda |
| **Encargo / Handoff** | El documento que describe una tarea |
| **Zona roja** | Archivo crítico que no se toca sin permiso |
| **Blast radius** | Qué más se puede romper si cambio esto |
| **God-file** | Archivo gigante que hace demasiado |

---

## Mapa rápido: ¿dónde está cada cosa?

```
   src/
   ├── app/            ← LO VISIBLE (páginas y ventanillas)
   │   ├── (auth)/         la entrada (login, registro)
   │   ├── (cart)/         carrito y checkout
   │   ├── (portal)/       mis-turnos
   │   ├── (pos)/          LA CAJA REGISTRADORA
   │   ├── (shop)/         LA TIENDA ONLINE
   │   ├── admin/          la oficina del dueño
   │   ├── developer/      panel interno
   │   ├── api/            LAS VENTANILLAS (52)
   │   └── globals.css     LOS COLORES (zona bloqueada)
   │
   ├── components/     ← LOS MUEBLES (botones, tarjetas, modales)
   ├── lib/            ← EL MOTOR (lo más delicado)
   │   ├── sii/            el NOTARIO
   │   ├── hardware/       impresora, gaveta, bluetooth
   │   ├── payments/       pagos
   │   ├── supabase.ts     conexión a la bodega
   │   └── api-utils.ts    el portero de las ventanillas
   ├── providers/      ← EL DECORADOR (logo, colores, tema)
   ├── stores/         ← EL BLOC DE NOTAS (estado temporal)
   └── sections/       ← partes de la portada

   supabase/migrations/   ← EL PLANO DE LA BODEGA (26 archivos)
```

---

*Fin del manual. Si algo no coincide con el código, gana el código — y actualizá este
documento en el mismo cambio. Y si te perdiste: volvé a la tabla del centro comercial en
`EMPIEZA_AQUI.md`.*
