# GUÍA DE CONEXIONES — YAHPOS!

> **Qué es este documento:** el mapa de cables del proyecto. Qué se conecta con qué, y —lo más
> importante— **qué NO se debe conectar con qué y por qué.**
>
> **Cómo leerlo:** primero `EMPIEZA_AQUI.md` (el mapa mental). Después `MANUAL_PROYECTO.md`
> (qué es cada cosa). Este es el tercero: *cómo está cableado todo.*
>
> **Relación con el manual:** el manual responde *"¿qué es cada cosa?"*. Esta guía responde
> *"¿cómo se conecta todo?"*.

---

### En simple — antes de empezar

> Imaginá que el proyecto es una **casa**, y que todo lo que pasa adentro viaja por **cables**.
> Hay solo **cuatro tipos de cable**, y con esos cuatro se explica cualquier conexión.

```
   LA CASA                              LOS 4 CABLES
   ────────                             ─────────────

     ┌─────────────────┐
     │   LOS CUARTOS   │  1) HTTP .......... las cañerías de agua
     │   (pantallas)   │                      (pedidos que van y vuelven)
     │                 │
     └────────┬────────┘  2) DATOS ......... la escalera al sótano
              │                             (guardar y buscar en la bodega)
     ┌────────┴────────┐
     │     SÓTANO      │  3) CONTEXTO ..... los carteles que dicen
     │   (la bodega)   │                      "estás en el local 42"
     │                 │
     └─────────────────┘  4) EN VIVO ...... el timbre que avisa
                                            cuando algo cambió
```

La casa (el proyecto) es siempre la misma. Lo que cambia es **por cuál de los cuatro cables**
viaja cada cosa.

- Si te preguntás *"¿cómo se conecta X con Y?"* → la respuesta es **uno de estos 4 cables**.
- Si te preguntás *"¿esto debería estar conectado?"* → la respuesta está en la
  [sección 8, la lista negra](#8).

---

## Índice

- [1. Los 4 cables](#1)
- [2. El mapa completo de la casa](#2)
- [3. Cable 1 — HTTP: cómo entra una visita](#3)
- [4. Cable 2 — DATOS: las puertas a la bodega](#4)
- [5. Cable 3 — CONTEXTO: cómo la app sabe de qué tienda es](#5)
- [6. Cable 4 — EN VIVO: Realtime y las dos ventanas](#6)
- [7. Qué conecta con qué: mapa por zona](#7)
- [8. LA LISTA NEGRA: lo que NO se conecta](#8)
- [9. Las 5 historias completas (flujos)](#9)
- [10. Cómo revisar un cable nuevo](#10)

---

<a id="1"></a>
## 1. Los 4 cables

### En simple

> No hay que memorizar mil conexiones. Hay **cuatro cables** y cada funcionalidad usa uno o
> varios.

```
   ┌──────────┬─────────────────────────┬──────────────────────┬──────────────────┐
   │ CABLE    │ QUÉ LLEVA               │ DE DÓNDE A DÓNDE       │ HERRAMIENTA      │
   ├──────────┼─────────────────────────┼──────────────────────┼──────────────────┤
   │ 1 HTTP   │ Pedidos de páginas y    │ Navegador → Servidor  │ Next.js          │
   │          │ datos                   │                      │                  │
   │ 2 DATOS  │ Leer y escribir en la   │ Código → Bodega       │ Supabase         │
   │          │ bodega                  │                      │                  │
   │ 3 CTXTO  │ "De qué tienda es esto" │ Portero → Pantalla    │ Headers x-store  │
   │ 4 VIVO   │ Avisos de cambios       │ Bodega → Pantalla     │ Realtime +       │
   │          │                         │ o ventana → ventana   │ BroadcastChannel │
   └──────────┴─────────────────────────┴──────────────────────┴──────────────────┘
```

---

<a id="2"></a>
## 2. El mapa completo de la casa

### En simple

> Este es el dibujo de todo el sistema conectado. No hace falta entenderlo de una. Volvé a él
> después de leer las secciones 3 a 6.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            EL NAVEGADOR (lo que ve el usuario)                 │
│                                                                                │
│   Pantallas:  (shop) tienda · (pos) caja · admin · (auth) entrada · (cart)     │
│   Muebles:    components/shop · components/pos · components/admin · ui         │
│   Bloc notas: authStore · cartStore · posStore · siiStore                      │
│   Decorador:  ThemeProvider · SaaSProvider · BrandThemeSetter                  │
└───────────────┬───────────────────────────────────────┬───────────────────────┘
                │  cable 1 (HTTP)                        │ cable 2 directo
                ▼                                        │ (llave normal + guardia)
┌───────────────────────────────────┐                    │
│   EL PORTERO  (middleware.ts)     │                    │
│   • lee la dirección (host)       │                    │
│   • pregunta: ¿qué local es?      │                    │
│   • revisa tu sesión              │                    │
│   • escribe el cartel x-store-id ─┼───┐                │
└───────────────┬───────────────────┘   │ cable 3        │
                ▼                        │ (contexto)     │
┌───────────────────────────────────┐   │                │
│   PANTALLAS + VENTANILLAS         │   │                │
│   (page.tsx)  (api/route.ts) ×52  │   │                │
└───────┬───────────────┬───────────┘   │                │
        │               │               │                │
        ▼               ▼               ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────────────┐
│ PUERTA A     │ │ PUERTA B     │ │        LA BODEGA (Supabase/Postgres)  │
│ createClient │ │ createAdmin  │ │  • las tablas (cajas)                  │
│ (tu llave)   │ │ (LLAVE       │ │  • EL GUARDIA (RLS)                    │
│ PASÁ EL      │ │  MAESTRA)    │ │  • login (Auth)                        │
│ GUARDIA ✅    │ │ ❌ NO PASA   │ │  • altavoces (Realtime)                │
└──────────────┘ └──────────────┘ └──────────────────────────────────────┘
        ▲                                        │
        │                                        │ cable 4 (en vivo)
        └────────────────────────────────────────┘
```

**Cómo leerlo de un vistazo:**

- El navegador habla con el servidor por **HTTP** y, para avisos, escucha a la bodega.
- El servidor es donde vive casi toda la lógica, y ahí están **las dos puertas** a la bodega.
- El portero decide qué local sos antes de dejarte pasar.

---

<a id="3"></a>
## 3. Cable 1 — HTTP: cómo entra una visita

### En simple

> Es el cable que lleva tu pedido desde el navegador hasta el servidor. Todo pedido pasa
> primero por el **portero**.

**Archivo del portero:** `src/middleware.ts`

### Qué hace el portero, en orden

```
   LLEGA UNA VISITA
        │
        ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 1. ¿Es un bucle?            → corta con error (red de seg.)  │
   │ 2. ¿Es una imagen/estilo?   → pasa sin más                   │
   │ 3. ¿Es la puerta o el login?→ pasa                           │
   │ 4. ¿Estás en el dominio RAIZ?                                │
   │       sí + pedís /admin o /pos → te manda a la entrada       │
   │       (en la raíz NO hay negocio)                            │
   │ 5. ¿A qué local corresponde esta dirección?  ← CLAVE         │
   │ 6. ¿Tenés sesión válida?                                     │
   └─────────────────────────────────────────────────────────────┘
        │
        ▼
   Te deja pasar AL LOCAL CORRECTO
```

### Los "barrios" de la casa (los grupos de rutas)

```
   (auth)     →  la entrada: login, registro, recuperar contraseña
   (shop)     →  la tienda online
   (cart)     →  el carrito y el pago
   (pos)      →  la caja registradora
   (portal)   →  mis turnos
   admin      →  la oficina del dueño (18 pantallas)
   developer  →  panel interno
   upgrade    →  los planes
   api        →  las 52 ventanillas
```

> Los paréntesis **`( )`** son **grupos de ruta**: no cambian la dirección web, solo agrupan
> archivos y les dan su propio "decorador" (layout).

### Hacia dónde se puede llamar

```
   PANTALLA ──► /api/*  ──► BODEGA        ✅ correcto
   PANTALLA ──► BODEGA (llave normal)     ✅ correcto
   PANTALLA ──► OTRA PANTALLA             ❌ nunca
```

**La regla:** las pantallas no se llaman entre sí cruzando zonas. Hablan **hacia abajo**
(a los datos) o **hacia los lados** (a los muebles compartidos). Esto hoy **se cumple**
(lo verifiqué: cero conexiones cruzadas). Mantenerlo es parte del trabajo.

---

<a id="4"></a>
## 4. Cable 2 — DATOS: las puertas a la bodega

### En simple

> Hay **cuatro formas** de llegar a la bodega. Elegir la correcta es la decisión de seguridad
> más importante del proyecto.

### Las cuatro puertas

```
   ┌────────────────┬──────────────────────────┬────────────────────────────────┐
   │ PUERTA         │ QUÉ ES (en simple)        │ CUÁNDO SE USA                   │
   ├────────────────┼──────────────────────────┼────────────────────────────────┤
   │ A              │ TU LLAVE normal           │ Casi siempre. Como el usuario   │
   │ createClient() │ (el guardia decide)       │ logueado                        │
   ├────────────────┼──────────────────────────┼────────────────────────────────┤
   │ B              │ LA LLAVE MAESTRA          │ Solo el SISTEMA, solo en el     │
   │ createAdmin    │ (el guardia NO decide)    │ servidor. ¡Peligrosa!           │
   │ Client()       │                            │                                │
   ├────────────────┼──────────────────────────┼────────────────────────────────┤
   │ C              │ LA VENTANILLA             │ Desde el navegador. Pide datos  │
   │ src/lib/api.ts │ (pide al servidor)        │ al servidor                     │
   ├────────────────┼──────────────────────────┼────────────────────────────────┤
   │ D              │ EL TIMBRE DIRECTO         │ Escuchar cambios en vivo        │
   │ supabase       │ (llave normal)            │                                │
   │ (singleton)    │                            │                                │
   └────────────────┴──────────────────────────┴────────────────────────────────┘
```

### Las dos puertas que se confunden: A y B

```
   ┌───────────────────────────────┐     ┌───────────────────────────────┐
   │ PUERTA A: tu llave            │     │ PUERTA B: la llave maestra    │
   │                               │     │                               │
   │   "Soy el local 42"           │     │   "Soy EL JEFE"               │
   │        │                      │     │        │                      │
   │        ▼                      │     │        ▼                      │
   │   GUARDIA revisa              │     │   el guardia NI PREGUNTA      │
   │   y deja ver solo lo del 42   │     │   ve TODO                     │
   │                               │     │                               │
   │   ✅ SEGURA                   │     │   ⚠️  PELIGROSA               │
   └───────────────────────────────┘     └───────────────────────────────┘
```

```
   ⚠️  LA REGLA MÁS IMPORTANTE DEL SISTEMA:

   ¿Le sirvo datos a un USUARIO?   →  PUERTA A (tu llave)
   ¿Es un proceso del SISTEMA?     →  PUERTA B (llave maestra, solo servidor)

   La LLAVE MAESTRA nunca se le da a un usuario del navegador.
```

### Dónde vive la llave maestra (para saber dónde mirar)

Está en **11 ventanillas + 3 acciones internas + 1 archivo de suscripciones**. No está mal que
existan (algunos procesos del sistema la necesitan). Pero **cada una debería justificar por qué
no usa la puerta A**. Ese es un trabajo de revisión concreto.

### Quién toca qué caja (tablas)

```
   ┌─────────────────┬──────────────────────────────────────────────────┐
   │ VENTANILLAS     │ profiles (56), products (19), orders (13),        │
   │ (src/app/api)   │ settings, cash_sessions, terminals, stores...     │
   ├─────────────────┼──────────────────────────────────────────────────┤
   │ ADMIN           │ branches, sii_documents, sii_config, sii_logs     │
   ├─────────────────┼──────────────────────────────────────────────────┤
   │ DEVELOPER       │ stores (11), profiles, master_catalog_...         │
   ├─────────────────┼──────────────────────────────────────────────────┤
   │ LA CAJA (POS)   │ ¡NADA directo! Todo pasa por la ventanilla ✅     │
   └─────────────────┴──────────────────────────────────────────────────┘
```

**Lo bueno de este mapa:** el acceso a la bodega está **centralizado en las ventanillas**
(`/api`). Y la caja registradora **no toca la bodega directo** — todo por ventanilla. Eso es
un aislamiento sano.

---

<a id="5"></a>
## 5. Cable 3 — CONTEXTO: cómo la app sabe de qué tienda es

### En simple

> Es el cable que hace funcionar el centro comercial. Es un **cartel** que el portero escribe
> cuando entrás, para que todo el sistema sepa en qué local estás.

### El recorrido del cartel

```
   1. Llega una visita a  almacen-don-pedro.yahpos.cl
                 │
                 ▼
   2. EL PORTERO mira la dirección y pregunta a la bodega:
      "¿a qué local corresponde esto?"
                 │
                 ├─ una tienda por subdominio (.localhost) → la busca
                 └─ un dominio real → usa la función get_store_by_domain
                 │
                 ▼
   3. Si existe, ESCRIBE LOS CARTELES en la puerta:
         x-store-id            ← el número del local (el más importante)
         x-store-tier          ← el plan
         x-store-name          ← el nombre
         x-store-...-color     ← los colores
                 │
                 ▼
   4. Si el local NO existe → te manda a la entrada principal
                 │
                 ▼
   5. El decorador (SaaSProvider) lee los carteles:
         → sabe el plan, el nombre, el logo
      BrandThemeSetter pinta los colores de ESA tienda
```

### Los decoradores y qué hace cada uno

```
   ┌────────────────────┬────────────────────────────────────────────┐
   │ ThemeProvider      │ ¿claro u oscuro?                            │
   │ SaaSProvider       │ plan, nombre, logo (¡y escucha cambios!)    │
   │ BrandThemeSetter   │ inyecta los colores de la tienda            │
   │ EditorProvider     │ el editor visual de la portada              │
   │ AppProviders       │ los ensambla a todos                        │
   └────────────────────┴────────────────────────────────────────────┘
```

### La trampa de los dos decoradores

```
   La CAJA quiere estar en modo CLARO (luz de día, para trabajar)
   El RESTO quiere estar en modo OSCURO

   Hay DOS decoradores de tema, y pueden pelear.
   REGLA: los colores de fondo ("superficie") se manejan SOLO por CSS.
          Nunca escribir estilos a mano encima de los decoradores.
```

---

<a id="6"></a>
## 6. Cable 4 — EN VIVO: Realtime y las dos ventanas

### En simple

> Es el **timbre** que avisa cuando algo cambió, sin que nadie recargue la página. Hay **dos
> timbres distintos** y no hay que confundirlos.

### Los dos timbres

```
   ┌───────────────────────────────┬───────────────────────────────────────┐
   │ TIMBRE 1: REALTIME            │ TIMBRE 2: BROADCASTCHANNEL             │
   │ (Supabase)                    │                                        │
   │                               │                                        │
   │ Cruza INTERNET                │ Solo DENTRO del mismo computador       │
   │ Avisa entre dispositivos      │ Avisa entre dos ventanas               │
   │                               │                                        │
   │ Ej: cambia el stock →         │ Ej: la CAJA le avisa a la PANTALLA     │
   │     se actualiza en la tienda │     DEL CLIENTE (misma PC)             │
   └───────────────────────────────┴───────────────────────────────────────┘
```

### Dónde suena cada timbre

```
   REALTIME:
     • SaaSProvider ............ cambios en la tienda (logo, plan)
     • pos/page.tsx ............ cambios para la caja
     • admin/cajas ............. estado de las cajas
     • RemoteClosureListener ... cierre remoto de caja
     • shop/RealTimeStockBadge . stock en la tienda online

   BROADCASTCHANNEL:
     • la caja  ↔  la pantalla del cliente (misma máquina)
```

> **La diferencia clave:** Realtime usa la red (cruza equipos). BroadcastChannel es local
> (misma máquina, dos ventanas). Si los mezclás, algo va a fallar.

---

<a id="7"></a>
## 7. Qué conecta con qué: mapa por zona

### En simple

> Para cada zona: **de quién depende**, **quién depende de ella**, y **con quién NO debe hablar**.

```
   ┌───────────────────────────────────────────────────────────────────────┐
   │ D1. EL EDIFICIO (núcleo)                                              │
   │   Entrega: createClient, withAuth, decoradores, contexto              │
   │   Depende de: nadie                                                    │
   │   NO debe: depender de ninguna zona de negocio                         │
   ├───────────────────────────────────────────────────────────────────────┤
   │ D2. LA CAJA (POS)                                                     │
   │   Depende de: núcleo, la ventanilla (api.ts), bloc de notas, hardware │
   │   NO debe: hablar con la tienda ni con la oficina; ni tocar la bodega │
   │            directo (hoy lo hace bien)                                  │
   ├───────────────────────────────────────────────────────────────────────┤
   │ D3. EL NOTARIO (SII)                                                  │
   │   Depende de: núcleo, crypto, bodega                                  │
   │   Depende de él: admin/facturacion                                    │
   │   NO debe: ser usado por el NAVEGADOR (tiene llaves privadas)         │
   ├───────────────────────────────────────────────────────────────────────┤
   │ D4. LA TIENDA (e-commerce)                                            │
   │   Depende de: núcleo, bloc del carrito, ventanillas de pago           │
   │   NO debe: hablar con la caja ni la oficina; ni confiar en el precio  │
   │            que manda el navegador                                     │
   ├───────────────────────────────────────────────────────────────────────┤
   │ D5. LA OFICINA (admin)                                                │
   │   Depende de: núcleo, ventanillas, y el notario (en un caso puntual)  │
   │   NO debe: usar la LLAVE MAESTRA para leer datos del propio usuario   │
   ├───────────────────────────────────────────────────────────────────────┤
   │ D6. LA ENTRADA (auth)                                                 │
   │   Depende de: el login de Supabase                                    │
   │   NO debe: ser evitada (ninguna ventanilla sin revisar el carnet)     │
   ├───────────────────────────────────────────────────────────────────────┤
   │ D7. EL PLANO DE LA BODEGA (datos/RLS)                                 │
   │   NO debe: modificarse sin probar el caso positivo Y el negativo      │
   └───────────────────────────────────────────────────────────────────────┘
```

### El dibujo de las dependencias

```
                  ┌─────────────────────────┐
                  │  D1 EL EDIFICIO (núcleo)│
                  └────────────┬────────────┘
                               │ todos dependen de él
        ┌──────────┬───────────┼───────────┬──────────┐
        ▼          ▼           ▼           ▼          ▼
   ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌────────┐
   │ CAJA   │ │ NOTARIO│ │ TIENDA  │ │OFICINA │ │ENTRADA │
   └────────┘ └────────┘ └─────────┘ └────────┘ └────────┘
        │          │           │           │
        └──────────┴───────────┴───────────┘
                   │  hablan hacia abajo
                   ▼
          ┌──────────────────┐
          │  D7 LA BODEGA    │
          └──────────────────┘
```

**La regla de las flechas:** van **hacia abajo**. La TIENDA no conoce a la CAJA. La CAJA no
conoce a la OFICINA. Si alguna vez hace falta que se conozcan, **lo común se sube a D1**, no
se conectan entre ellos.

---

<a id="8"></a>
## 8. LA LISTA NEGRA: lo que NO se conecta

### En simple

> Estas conexiones están **prohibidas**. Cada una tiene un porqué concreto. Si las ves en el
> código, algo está mal.

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ Nº  ❌ PROHIBIDO                            │ POR QUÉ                  │
   ├─────────────────────────────────────────────┼──────────────────────────┤
   │  1  Un componente del navegador importando  │ Tiene llaves privadas:   │
   │     el NOTARIO (lib/sii)                    │ nunca llegan al usuario  │
   │                                             │                          │
   │  2  Cualquier archivo del navegador usando  │ Expone la LLAVE MAESTRA  │
   │     la LLAVE MAESTRA (createAdminClient)    │ de toda la bodega        │
   │                                             │                          │
   │  3  Una zona importando componentes de otra │ Acopla zonas que deben   │
   │     (ej. TIENDA usando algo de la CAJA)     │ vivir separadas          │
   │                                             │                          │
   │  4  Servir datos de un usuario con la       │ Salta el guardia → fuga  │
   │     LLAVE MAESTRA                           │ entre tiendas            │
   │                                             │                          │
   │  5  Escribir boletas saltándose al NOTARIO  │ Documento inválido o     │
   │     (tablas sii_*)                          │ folio duplicado          │
   │                                             │                          │
   │  6  Confiar en el PRECIO que manda el       │ Se puede pagar $1 por    │
   │     navegador                               │ algo caro                │
   │                                             │                          │
   │  7  Inyectar fondos ("superficie") a mano   │ Rompe los 2 decoradores  │
   │                                             │                          │
   │  8  Editar globals.css sin ser su dueño     │ Es el color de TODAS las │
   │                                             │ tiendas                  │
   │                                             │                          │
   │  9  Una ventanilla que da datos sin revisar │ Queda abierta a todos    │
   │     el carnet (withAuth)                    │                          │
   │                                             │                          │
   │ 10  Cambiar la bodega (RLS) sin probar el   │ El caso negativo es el   │
   │     caso NEGATIVO                           │ que importa              │
   │                                             │                          │
   │ 11  Introducir purple/violet/indigo/sky/    │ Ya se limpiaron; usá     │
   │     cyan                                    │ brand-*                  │
   └─────────────────────────────────────────────┴──────────────────────────┘
```

### El caso que más rompe: la LLAVE MAESTRA

```
   De toda la lista, las reglas 2 y 4 son las más peligrosas,
   porque rompen el aislamiento SIN QUE NADIE SE ENTERE.

   Si empezás a usar la llave maestra "para terminar rápido",
   en ese momento perdiste la barrera. Y si hay un bug,
   el local A ve los datos del local B.
```

---

<a id="9"></a>
## 9. Las 5 historias completas (flujos)

### En simple

> Acá se ve todo conectado, paso a paso. Cada paso dice **por qué cable viaja**.

### Historia A — Una venta en la caja

```
   1. El cajero abre la caja .............. bloc de notas (local)
   2. Escanea un producto ................. CABLE 1 → ventanilla /api/products
   3. Agrega al carrito ................... bloc de notas (local, sin servidor)
   4. Cobra ............................... CABLE 1 → /api/payments
        └─ ⚠️ el SERVIDOR lee el total de la BODEGA (no del navegador)
   5. Pide la boleta ...................... CABLE 1 → el NOTARIO
        └─ el notario firma y guarda en sii_documents
   6. Imprime ............................. hardware (impresora, gaveta)
   7. Actualiza el stock .................. CABLE 4 (en vivo) → tienda online
   8. Cierra la caja ...................... CABLE 1 → /api/cash-sessions
```

### Historia B — Emitir una boleta legal

```
   Una venta
        │
        ▼
   EL NOTARIO (SiiEngine)
        │
        ├─ pide el siguiente FOLIO ......... caja sii_folios
        ├─ calcula IVA y totales
        ├─ arma el documento (XML)
        ├─ FIRMA (signer) + TIMBRE (ted)
        ├─ guarda como "pendiente" ......... caja sii_documents
        │
        ▼
   ENVÍO AL SII
        ├─ pide el permiso (token)
        ├─ arma el sobre
        ├─ manda al SII
        ▼
   El SII responde:  ✅ aceptada  o  ❌ error

   El JUEZ es el SII, no vos.
```

### Historia C — Una compra en la tienda online

```
   1. Mira el catálogo .................... CABLE 1 → /api/products
   2. Agrega al carrito ................... bloc de notas
   3. Paga (checkout)
        ├─ se CREA la orden en la bodega (con productos y total) ⚠️ ANTES de pagar
        ├─ el SERVIDOR calcula el monto (nunca el navegador)
        └─ se crea el pago → Transbank
   4. Confirma ............................ CABLE 1 → /api/payments/webpay/commit
```

### Historia D — Entrar al sistema (login)

```
   1. "Entrar con Google" ................. CABLE 1 → /api/auth/callback
   2. Supabase crea la sesión ............. CABLE 3 (queda la cookie)
   3. El portero resuelve el local ........ CABLE 3 (cartel x-store-id)
   4. El decorador lee la tienda .......... plan, nombre, logo
   5. BrandThemeSetter pinta la marca
```

### Historia E — El dueño cambia su logo

```
   admin/branding → sube el logo ......... ventanilla /api/settings/upload-logo
        │
   se actualiza la fila en `stores`
        │
   CABLE 4 (Realtime) detecta el cambio
        │
   SaaSProvider (que escucha `stores`) lo recibe
        │
   BrandThemeSetter repinta el logo
        │
   TODAS las pantallas de esa tienda muestran el logo nuevo, SIN recargar ✅
```

---

<a id="10"></a>
## 10. Cómo revisar un cable nuevo

### En simple

> Cuando agregues algo, antes de decir "está listo", respondé estas preguntas. Si todas tienen
> respuesta buena, está bien.

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │ 1. ¿Por cuál de los 4 cables viaja esto? Si no sabés, no lo hagas.    │
   │                                                                      │
   │ 2. ¿Le sirvo datos a un usuario?  → PUERTA A (tu llave), no maestra    │
   │                                                                      │
   │ 3. ¿Es un proceso del sistema?    → PUERTA B, solo servidor            │
   │                                                                      │
   │ 4. ¿Toco una tabla con store_id?  → probar caso positivo Y negativo    │
   │                                       (otra tienda debe ver CERO)      │
   │                                                                      │
   │ 5. ¿Un componente del navegador importa algo server-only?             │
   │      (llaves, notario, llave maestra) → está mal, moverlo al servidor │
   │                                                                      │
   │ 6. ¿Crucé zonas? (tienda usando algo de la caja) → está mal           │
   │                                                                      │
   │ 7. ¿El navegador manda un valor que uso para COBRAR o AUTORIZAR?      │
   │      → no confiar, leerlo de la bodega en el servidor                 │
   └──────────────────────────────────────────────────────────────────────┘
```

### La prueba de fuego

Para cualquier cambio que toque datos, la verificación **no es** "compila". Es:

```
   ┌──────────────────────────────────────────────────────────────────────┐
   │                                                                      │
   │  "Me meto como el local A y confirmo que NO puedo leer ni tocar       │
   │   NADA del local B."                                                 │
   │                                                                      │
   └──────────────────────────────────────────────────────────────────────┘
```

Esa prueba —positiva y negativa— es lo que separa un cambio seguro de uno que parece seguro.

---

*Fin de la guía. Si una conexión de acá no coincide con el código, gana el código — y esta
guía se corrige en el mismo cambio. Y si te perdés: volvé a la tabla del centro comercial en
`EMPIEZA_AQUI.md`.*
