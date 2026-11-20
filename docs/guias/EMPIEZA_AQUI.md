# EMPIEZA AQUÍ — YAHPOS! explicado desde cero

> **Si es la primera vez que ves este proyecto, empezá por acá.**
> No hace falta que sepas programar de antes. Todo se explica desde cero, con dibujos y
> comparaciones con cosas de la vida real.

---

## La idea en 30 segundos

**YAHPOS! es un sistema que le permite a un almacén de barrio hacer tres cosas:**

```
 ┌────────────────┐   ┌────────────────┐   ┌──────────────────────┐
 │ 1. VENDER      │   │ 2. VENDER      │   │ 3. DAR BOLETA        │
 │    en el local │   │    por internet│   │    legal (SII)       │
 │    (POS)       │   │    (e-commerce)│   │    por esa venta     │
 └────────────────┘   ┘────────────────┘   └──────────────────────┘
```

Y todo eso **lo usan muchos almacenes a la vez**, cada uno con su propio nombre, su propio
logo y sus propios datos — sin que se mezclen entre ellos.

---

## La comparación que lo explica todo: un centro comercial

Imaginá un **centro comercial** con varios locales adentro:

```
              CENTRO COMERCIAL "YAHPOS!"
  ┌──────────────────────────────────────────────────────────┐
  │                                                            │
  │   LOCAL 1                    LOCAL 2              LOCAL 3  │
  │   Almacén Don Pedro          Tienda La Esquina    Mini...  │
  │   don-pedro.yahpos.cl        la-esquina.yahpos.cl  ...      │
  │                                                            │
  └──────────────────────────────────────────────────────────┘
```

Cada local es **una tienda distinta** (en el mundo técnico se llama **"tenant"**, que en
inglés significa "inquilino" — justamente, el que alquila un local).

Y ahora las piezas, todas con su equivalente:

| En el centro comercial | En YAHPOS! | Qué hace |
|---|---|---|
| **La dirección del local** | El dominio (`don-pedro.yahpos.cl`) | Dice qué tienda es |
| **El portero de la entrada** | `middleware.ts` | Lee tu dirección y te manda a tu local |
| **La bodega central** | La base de datos (Supabase) | Guarda **todo**: productos, ventas, clientes |
| **El guardia de la bodega** | **RLS** | Deja que cada local toque **solo sus cajas** |
| **El decorador** | `SaaSProvider` | Pone el logo y los colores de cada local |
| **La caja registradora** | El **POS** | Donde se cobra en el local |
| **La tienda de la esquina** | El **e-commerce** | Donde el cliente compra por internet |
| **El notario** | El **motor SII** | Firma los documentos para que sean legales |
| **La ventanilla de atención** | Las **rutas API** (`/api/...`) | Recibe los pedidos y busca en la bodega |
| **El bloc de notas del mostrador** | **Zustand** | Apunta cosas temporales mientras vendés |
| **Los altavoces** | **Realtime** | Avisan cambios al instante a todos los locales |

> **Guardate esta tabla.** Cada vez que leas una palabra rara más adelante
> ("middleware", "RLS", "tenant"), volvé acá. Todo el proyecto se entiende con esta
> comparación.

---

## El recorrido de una venta (para ver todo junto)

Mirá cómo se conectan las piezas cuando alguien compra una Coca-Cola en el POS:

```
  ┌──────────────┐
  │ El cajero    │  abre la caja registradora
  │ escanea el   │
  │ producto     │
  └──────┬───────┘
         │  1. "¿Cuánto sale y qué stock hay?"  (pregunta)
         ▼
  ┌─────────────────────────────────────┐
  │ VENTANILLA (una ruta /api)           │
  │ recibe la pregunta                   │
  └──────┬──────────────────────────────┘
         │  2. va a la bodega central
         ▼
  ┌─────────────────────────────────────┐
  │ BODEGA CENTRAL (base de datos)       │
  │ GUARDIA (RLS) revisa:                │
  │ "¿Sos del local correcto? Sí → pasá" │
  └──────┬──────────────────────────────┘
         │  3. devuelve el producto
         ▼
  ┌──────────────┐
  │ Se cobra     │  4. pago (efectivo / tarjeta / QR)
  └──────┬───────┘
         │  5. "hay que dar boleta legal"
         ▼
  ┌─────────────────────────────────────┐
  │ NOTARIO (motor SII)                  │
  │ firma la boleta y la envía al SII    │
  └──────┬──────────────────────────────┘
         │  6. imprime y abre la gaveta
         ▼
  ┌──────────────┐
  │ La impresora │  saca la boleta, la gaveta de plata se abre
  │ y la gaveta  │
  └──────────────┘
```

Eso es **todo el sistema en una imagen**. Lo demás son detalles de cada paso.

---

## Las palabras raras, explicadas sin tecnicismos

| Palabra | Qué significa de verdad |
|---|---|
| **Tenant** | Cada tienda/inquilino. Multi-tenant = muchos inquilinos en un mismo edificio |
| **Middleware** | El portero. Revisa cada persona que entra antes de dejarla pasar |
| **RLS** | *Row Level Security*. El guardia de la bodega: reglas que dicen qué caja puede abrir cada uno |
| **API / ruta API** | La ventanilla de atención. Pedís algo y te lo traen |
| **Supabase** | El proveedor de la bodega central + el sistema de login + los altavoces |
| **Server Component** | Algo que se cocina **en la cocina** (el servidor) y llega listo a la mesa |
| **Client Component** | Algo que se prepara **en la mesa** (el navegador), frente al usuario |
| **Estado / Store** | El bloc de notas temporal del mostrador (lo que está pasando ahora) |
| **Realtime** | Los altavoces: avisan cambios al instante, sin recargar |
| **DTE** | *Documento Tributario Electrónico*: la boleta o factura legal |
| **SII** | El organismo del Estado chileno que exige y valida esas boletas |
| **Folio** | El número único de cada boleta (39.281, 39.282, 39.283…) |
| **Firma digital** | El sello del notario: prueba que el documento es auténtico |
| **Deploy** | Publicar el sistema para que la gente lo use en internet |
| **Repo / repositorio** | La carpeta del proyecto, con todo el historial de cambios |

---

## ¿Qué archivo leo primero? (ruta de lectura)

No leas todo de golpe. En este orden:

```
  1º  ESTE ARCHIVO  ─────────────────────►  entendés el proyecto sin código
      (EMPIEZA_AQUI.md)

  2º  MANUAL_PROYECTO.md  ───────────────►  qué es cada parte, en detalle
                                            (leelo en orden, Parte 0 → 5)

  3º  GUIA_CONEXIONES.md  ───────────────►  cómo se conecta cada cosa
                                            y qué NO se debe conectar

  4º  DECISIONES_ARQUITECTURA.md  ───────►  por qué se hizo así y no de otra
                                            forma

  5º  CURRICULUM_COLABORADOR.md  ────────►  tu plan de estudio de acá a
                                            diciembre, con ejercicios
```

> **Regla:** si en cualquier momento te perdés, volvé a este archivo y a la tabla del centro
> comercial. Siempre funciona.

---

## Cómo se ve el proyecto por dentro (el mapa de carpetas)

No necesitás saber qué hace cada archivo todavía. Solo reconocer las zonas:

```
   austral-market-next/
   │
   ├── src/app/          ← LAS PIEZAS VISIBLES (páginas y ventanillas)
   │   ├── (shop)/           la tienda online
   │   ├── (pos)/            la caja registradora  ← el corazón
   │   ├── admin/            el panel del dueño
   │   ├── api/              las VENTANILLAS (52)
   │   └── globals.css       los colores y el tema
   │
   ├── src/lib/          ← EL MOTOR INTERNO (lo más delicado)
   │   ├── sii/              el NOTARIO (boletas legales)
   │   ├── hardware/         impresora, gaveta, lector
   │   ├── supabase.ts       la conexión a la bodega
   │   └── api-utils.ts      el portero de las ventanillas
   │
   ├── src/components/   ← LOS MUEBLES (botones, tarjetas, modales)
   ├── src/providers/    ← EL DECORADOR (logo, colores, tema)
   ├── src/stores/       ← EL BLOC DE NOTAS (estado temporal)
   │
   └── supabase/         ← EL PLANO DE LA BODEGA (26 migraciones)
```

**Casi todo lo difícil está en `src/lib/`.** Es el 7% del código y el 80% del riesgo. Ahí no
se toca sin entender.

---

## Las 5 reglas para no romper nada

Estas reglas existen porque **alguien ya las rompió antes** y salió caro. No son capricho:

```
  1. NUNCA confiar en lo que manda el navegador
     (el precio, el monto, quién sos) → siempre leerlo de la bodega

  2. La boleta legal SOLO se genera con el NOTARIO (el motor SII)
     → nunca escribir boletas "a mano"

  3. Los datos de una tienda NO se mezclan con los de otra
     → el guardia (RLS) no se salta nunca

  4. globals.css (los colores) tiene UN solo dueño
     → un cambio ahí afecta a TODAS las tiendas

  5. Correcto y seguro ANTES que rápido
     → una tarea puede tardar el doble si eso evita un agujero
```

---

## Lo que NO tenés que esperar (la verdad del oficio)

Esto lo vivió quien empezó el proyecto, y es lo más importante que tenés que entender:

> **Esto NO es "llegar, pedirle a la IA que lo haga, y que quede listo".**

La realidad del trabajo es así:

```
  LO QUE LA GENTE CREE                LO QUE ES DE VERDAD
  ────────────────────                ────────────────────
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  pedir            ▓▓▓▓  pedir
  ░░░░░░░░░░░░░░░░░░  revisar          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  revisar
                                       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```

- **20%** es pedir/escribir código.
- **80%** es **leer, probar y rechazar** lo que la IA hizo.
- La IA va a decir *"ya está listo"* sin que esté listo. Va a inventar cosas que no existen.
  Va a cambiar archivos que no le pediste. **Eso no es que la IA sea mala: es cómo funciona.**
- El trabajo del que sabe es **darse cuenta** de eso. No creer, verificar.

Aprender eso es el 80% del oficio. Es difícil al principio —a todos nos pasó— y después se
vuelve automático.

---

## Tu próximo paso

Andá a **`MANUAL_PROYECTO.md`** y leelo en orden, desde la Parte 0. Ya tenés el mapa mental;
ahora vas a llenarlo de detalle.

Y cuando te trabes, la solución siempre es la misma: **volvé a la tabla del centro comercial.**

---

*Este archivo es la puerta de entrada. Los otros cuatro son el detalle.*
