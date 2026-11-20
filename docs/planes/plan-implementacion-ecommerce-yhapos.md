# Plan de implementación — Rediseño supermercado online
> Basado en análisis estructural de cugat.cl con criterios de Visual Merchandising, Trade Marketing y Gestión de Punto de Venta.

---

## 0. Antes de empezar: qué tecnología usar

### ¿Framer, Webflow o código?

| Opción | Cuándo usarla | Limitaciones |
|---|---|---|
| **Framer** | Si quieres publicar rápido y no tienes backend | Sin carrito real ni base de productos |
| **Webflow** | Si necesitas CMS para gestionar productos y banners | El ecommerce nativo es caro y limitado en CL |
| **Next.js + Tailwind** | Si quieres escalabilidad real y conexión a WooCommerce/Shopify | Requiere programación |
| **WordPress + WooCommerce** | Si ya tienes productos en WooCommerce (como Cugat) | Diseño más limitado |

### Recomendación según tu caso:

- **Si partes desde cero sin tienda**: usa **Framer** para el front + **Shopify** como backend de productos.
- **Si tienes WooCommerce** (como Cugat): usa un tema hijo personalizado o un page builder como **Bricks Builder** o **Blocksy Pro**.
- **Si quieres lo más profesional**: **Next.js** con datos de WooCommerce via REST API.

> Para este plan, las instrucciones están escritas en HTML/CSS/JS puro para que **cualquier IA** (Claude, GPT, Gemini) pueda implementarlas sin depender de un framework específico. Luego puedes adaptar a tu stack.

---

## 1. Skills que debe cargar la IA antes de implementar

Estas skills son instrucciones especiales que le dicen a Claude cómo generar código de mejor calidad. Pégalas al inicio de tu conversación o instálalas en tu proyecto.

### Skill principal (obligatoria)

**`frontend-design`** — Para generar interfaces web con diseño de calidad profesional, evitando el aspecto genérico de la IA.

- Instalación en Claude.ai: Settings → Skills → Buscar "frontend-design"
- Repositorio: https://github.com/anthropics/anthropic-skills (próximamente público)
- Alternativa manual: al inicio de tu prompt escribe:
  ```
  Eres un Visual Designer experto. Antes de escribir código, define:
  1. Dirección estética clara (no genérica)
  2. Paleta de colores con variables CSS
  3. Tipografía distintiva (no Inter, no Roboto)
  4. Sistema de espaciado consistente
  Luego implementa código production-grade.
  ```

### Skills secundarias (recomendadas)

- **`file-reading`** — Si vas a subir archivos de productos (Excel, CSV, imágenes)
- **`xlsx`** — Para leer listas de productos desde planillas

---

## 2. Stack tecnológico recomendado

```
Frontend:   HTML5 + CSS3 (variables) + JavaScript vanilla
Fuentes:    Google Fonts (Sora para títulos, DM Sans para cuerpo)
Iconos:     Tabler Icons (https://tabler.io/icons) — gratuito, 5800+ íconos
Carrusel:   Swiper.js (https://swiperjs.com) — gratuito
Imágenes:   WebP optimizadas
Animaciones: CSS transitions + Intersection Observer (sin dependencias)
```

---

## 3. Sistema de diseño base

Pega esto al inicio de CADA prompt de implementación para mantener consistencia:

```
SISTEMA DE DISEÑO — usar en todo el proyecto:

Colores:
  --color-primary: #E8242A;        /* rojo supermercado, fuerza y oferta */
  --color-primary-dark: #B51B20;
  --color-accent: #F5A623;         /* amarillo precio/oferta */
  --color-success: #2E7D32;        /* verde frescura/feria */
  --color-bg: #F7F5F2;             /* fondo cálido, no blanco puro */
  --color-surface: #FFFFFF;
  --color-text: #1A1A1A;
  --color-text-muted: #6B6860;
  --color-border: #E8E4DF;

Tipografía:
  Títulos:  'Sora', sans-serif (importar de Google Fonts)
  Cuerpo:   'DM Sans', sans-serif (importar de Google Fonts)
  Precio:   'Sora' weight 700, color --color-primary

Espaciado:
  --space-xs: 4px
  --space-sm: 8px
  --space-md: 16px
  --space-lg: 24px
  --space-xl: 40px
  --space-2xl: 64px

Bordes:
  --radius-sm: 6px
  --radius-md: 12px
  --radius-lg: 20px

Sombras:
  --shadow-card: 0 2px 8px rgba(0,0,0,0.08);
  --shadow-hover: 0 6px 20px rgba(0,0,0,0.12);
```

---

## 4. Zonas de implementación — en este orden

Implementa de arriba hacia abajo. Cada zona es un prompt separado.

---

### ZONA 1 — Barra de beneficio logístico

**Qué es:** Franja fina fija en la parte más alta de la página. Siempre visible.

**Prompt para la IA:**
```
Usando el sistema de diseño definido arriba, crea una barra de anuncio fija (sticky)
en la parte superior de la página con estas características:

- Fondo: --color-primary
- Texto blanco, centrado, tamaño 13px, font DM Sans
- Contenido: "Despacho GRATIS en compras sobre $30.000 · Radio urbano 5km · Entrega en 24hrs"
- En mobile: texto más corto: "Despacho gratis +$30.000 · 24hrs"
- Ícono de camión a la izquierda del texto (usar Tabler Icons: ti-truck)
- No tiene botón de cerrar — es información permanente
- z-index alto para que quede sobre todo

No uses gradientes. Fondo sólido. Altura: 36px desktop, 32px mobile.
```

---

### ZONA 2 — Header principal

**Qué es:** Barra de navegación principal. Sticky al hacer scroll.

**Prompt para la IA:**
```
Crea el header principal del supermercado con estas secciones de izquierda a derecha:

DESKTOP:
1. Logo (texto "MiSuper" en Sora Bold, color --color-primary) — ocupa 180px
2. Barra de búsqueda — ocupa el espacio restante (flex: 1)
   - Placeholder: "¿Qué necesitas hoy?"
   - Ícono lupa a la derecha dentro del campo
   - Fondo --color-bg, borde --color-border, border-radius --radius-md
   - Al hacer focus: borde --color-primary de 2px
3. Íconos de acción (derecha, 200px):
   - Corazón (favoritos) con contador
   - Usuario (mi cuenta)
   - Carrito con badge de cantidad y monto total en --color-primary

MOBILE:
- Fila 1: Logo + Carrito + Usuario
- Fila 2: Barra de búsqueda ancho completo

El header debe volverse blanco sólido con sombra --shadow-card al hacer scroll (usar JS con IntersectionObserver o scroll event).
Altura: 72px desktop, auto mobile.
Fondo inicial: --color-surface.
```

---

### ZONA 3 — Navegación de categorías (megamenú)

**Qué es:** Barra de categorías debajo del header. En desktop muestra texto, en mobile colapsa a íconos horizontales.

**Prompt para la IA:**
```
Crea la barra de navegación de categorías con estas 8 macrocategorías:

Categorías (nombre · ícono Tabler):
1. Ofertas         · ti-tag
2. Frutas y Feria  · ti-apple
3. Carnicería      · ti-meat
4. Despensa        · ti-package
5. Bebidas         · ti-bottle
6. Limpieza        · ti-sparkles
7. Hogar           · ti-home
8. Mascotas        · ti-paw

DESKTOP:
- Fila horizontal, distribuidos equitativamente
- Cada ítem: ícono (20px) + texto
- Hover: underline con --color-primary, color cambia a --color-primary
- El ítem activo queda marcado con línea inferior de 2px --color-primary

MOBILE:
- Scroll horizontal sin scrollbar visible
- Cada ítem: ícono arriba + texto abajo (pill vertical)
- Tamaño: 64px ancho, texto 11px

Al hacer clic en cada categoría en desktop, mostrar un dropdown con las subcategorías
en 3 columnas. Las subcategorías son texto plano con hover color --color-primary.
Usar JavaScript puro para mostrar/ocultar el dropdown.
```

---

### ZONA 4 — Hero principal (oferta ancla)

**Qué es:** La sección más importante visualmente. Reemplaza el carrusel automático.

**Prompt para la IA:**
```
Crea la sección hero del supermercado. NO uses carrusel automático.

Diseño desktop: dos columnas (60% imagen / 40% contenido)
Diseño mobile: imagen arriba, contenido abajo

Columna izquierda (imagen):
- Imagen de producto grande (usar placeholder: https://placehold.co/800x500/E8E4DF/1A1A1A)
- Badge flotante "OFERTA SEMANA" en esquina superior izquierda
  Estilo: fondo --color-accent, texto negro, Sora Bold 12px, padding 6px 12px, border-radius --radius-sm

Columna derecha (contenido):
- Categoría en texto pequeño muted: "Detergentes y limpieza"
- Nombre del producto: Sora Bold 28px (desktop) / 22px (mobile)
- Precio antes: texto tachado, color muted, tamaño 16px
- Precio ahora: Sora Bold 42px, color --color-primary
- Precio por unidad: "por litro: $X.XXX" en texto muted 13px
- Badge de ahorro: "Ahorras $X.XXX (40%)" fondo verde claro, texto --color-success
- Contador regresivo: "Oferta válida hasta:" + días:horas:minutos en cajas negras
  (usar JavaScript para el countdown)
- Botón "Agregar al carrito" — ancho completo, fondo --color-primary, texto blanco, Sora Bold
- Navegación manual: flechas izquierda/derecha para cambiar el producto destacado
  (sí usar Swiper.js aquí pero controlado manualmente, sin autoplay)

El fondo de esta sección es --color-bg. No usar imagen de fondo.
```

---

### ZONA 5 — Grilla de categorías con íconos

**Qué es:** Acceso rápido visual. Scroll horizontal en mobile.

**Prompt para la IA:**
```
Crea una sección de acceso rápido a categorías con grid de íconos.

Título de sección: "Compra por categoría" — Sora SemiBold 20px, alineado a la izquierda.

Grid: 
- Desktop: 5 columnas visibles (10 items en 2 filas) — las mismas 8 + "Ver todo" + "Importados"
- Tablet: 4 columnas
- Mobile: scroll horizontal, 5 visibles a la vez

Cada ítem:
- Fondo --color-surface, borde --color-border, border-radius --radius-md
- Padding 16px
- Ícono Tabler centrado, tamaño 32px, color --color-primary
- Nombre de categoría debajo, DM Sans 13px, color --color-text, centrado
- Hover: borde --color-primary, sombra --shadow-hover, transform scale(1.02)
- Transición: 0.2s ease

Categorías con sus íconos:
Frutas y Verduras (ti-apple) · Carnicería (ti-meat) · Lácteos (ti-droplet) ·
Bebidas (ti-bottle) · Despensa (ti-package) · Dulces (ti-candy) ·
Limpieza (ti-sparkles) · Hogar (ti-home) · Mascotas (ti-paw) ·
Bebidas Alcohólicas (ti-beer) · Bebé (ti-baby-carriage) · Importados (ti-world)
```

---

### ZONA 6 — Bloque de ofertas destacadas

**Qué es:** La góndola de alta rotación. Todos los productos en oferta, en un solo bloque.

**Prompt para la IA:**
```
Crea la sección "Ofertas de la semana" con grid de tarjetas de productos.

Encabezado de sección:
- Izquierda: título "Ofertas de la semana" Sora Bold 22px
- Derecha: link "Ver todas las ofertas →" color --color-primary

Grid de productos:
- Desktop: 4 columnas
- Tablet: 3 columnas  
- Mobile: 2 columnas
- gap: 16px

Tarjeta de producto (card):
- Fondo --color-surface
- Border-radius --radius-md
- Borde --color-border 1px
- Sombra --shadow-card
- Hover: sombra --shadow-hover, transform translateY(-2px)
- Transición 0.2s ease

Estructura interna de la tarjeta:
1. Área de imagen (aspect-ratio 1:1, fondo --color-bg)
   - Badge "OFERTA" en esquina superior izquierda: fondo --color-primary, texto blanco, 11px, Sora Bold
   - Badge de % ahorro en esquina superior derecha: fondo --color-accent, texto negro, 11px
   - Imagen centrada con object-fit: contain, padding 12px

2. Contenido (padding 12px):
   - Categoría: DM Sans 11px, color muted, uppercase letter-spacing 0.5px
   - Nombre producto: DM Sans 14px, color --color-text, máx 2 líneas con ellipsis
   - Precio por unidad/kg: DM Sans 11px, color muted
   - Precio original: tachado, 13px, color muted
   - Precio oferta: Sora Bold 18px, color --color-primary
   - Ahorro: "Ahorras $X.XXX" en verde, 12px
   - Vencimiento: "Hasta DD MMM" en 11px muted

3. Botón "+" circular en esquina inferior derecha:
   - 36px diámetro, fondo --color-primary, ícono ti-plus blanco
   - Al hacer clic cambia a "-" y muestra selector de cantidad inline

Mostrar 12 tarjetas por defecto con botón "Ver más ofertas" centrado abajo.
Usar array de datos de ejemplo en JavaScript para poblar las tarjetas.
```

---

### ZONA 7 — Sección de canastas sugeridas (cross-selling)

**Qué es:** Sección nueva. No existe en Cugat. Es la de mayor impacto en ticket promedio.

**Prompt para la IA:**
```
Crea la sección "Canastas para la semana" — sección de cross-selling con combos sugeridos.

Esta sección NO existe en el sitio original. Es la mejora más importante.

Encabezado: "Arma tu canasta" — Sora Bold 22px

3 canastas en tarjetas horizontales anchas:

Canasta 1: "Para el asado del finde"
- 4-5 productos relacionados (carne, condimentos, carbón, bebida, ensalada)
- Precio individual total vs precio de canasta (mostrar ahorro)
- Botón "Agregar todo al carrito"

Canasta 2: "Desayuno familiar completo"
- Leche, cereal, pan, mermelada, jugo, café
  
Canasta 3: "Limpieza mensual básica"
- Detergente, cloro, limpiapisos, esponjas, bolsas basura

Diseño de cada canasta:
- Tarjeta horizontal con fondo --color-bg, borde --color-border, border-radius --radius-lg
- Izquierda: nombre, descripción corta, total ahorrado en badge verde
- Centro: lista de productos en miniatura (imágenes pequeñas en fila, solapadas ligeramente)
- Derecha: precio total destacado + botón "Agregar canasta completa"
- En mobile: apilado verticalmente

JavaScript: al hacer clic en "Agregar canasta", animar ícono carrito y actualizar contador.
Datos de ejemplo en array de objetos JS.
```

---

### ZONA 8 — Sección de frutas y verduras (La Gran Feria)

**Qué es:** Categoría estrella en frecuencia de compra. Necesita tratamiento especial.

**Prompt para la IA:**
```
Crea la sección "La Gran Feria — Frutas y Verduras" con diseño diferenciado.

Fondo de sección: tono verde muy claro (#F0F7F0) para diferenciar del resto.
Borde superior e inferior: 3px sólido --color-success.

Encabezado:
- Ícono ti-leaf 28px verde
- Título "La Gran Feria" Sora Bold 22px
- Subtítulo DM Sans 14px muted: "Frescas y seleccionadas. Llegadas hoy."
- Badge: "Entrega el mismo día" fondo verde, texto blanco

Grid de productos: igual que zona 6 pero con estas diferencias:
- No hay precio "antes/después" (no son productos en oferta normalmente)
- El precio prominente es el precio POR KG o POR UNIDAD en grande
- Badge especial "Nacional" en verde para productos chilenos
- No hay badge de % descuento — el argumento es frescura, no precio

Mostrar 8 productos en la grilla.
Botón al final: "Ver toda la feria →"
```

---

### ZONA 9 — Ranking de tendencias

**Qué es:** Lista de los más vendidos. Prueba social. Moverla arriba mejora conversión.

**Prompt para la IA:**
```
Crea la sección "Top ventas esta semana" con diseño de ranking.

Layout: lista vertical con numeración prominente.

Cada ítem del ranking:
- Número de posición a la izquierda: Sora Bold 32px, color muy muted (#D3D1C7)
  Posición 1: color --color-accent (dorado)
  Posición 2: color #C0B8B0 (plateado)
  Posición 3: color #C4956A (bronce)
- Imagen del producto: 60x60px, border-radius --radius-sm
- Nombre del producto: DM Sans 15px Bold
- Categoría: 12px muted
- Precio: Sora 16px --color-primary
- Botón "+" a la derecha

Mostrar top 5 items.
Debajo del ranking: estadística de la tienda en 3 pills:
"20.939.327 visitas" · "9.679 pedidos" · "Actualizado hoy"
Estilo pills: fondo --color-bg, borde --color-border, DM Sans 13px, padding 6px 14px

Esta sección va en una columna lateral si el layout lo permite (desktop: 3/4 + 1/4).
```

---

### ZONA 10 — Sección editorial con recetas

**Qué es:** Recetas conectadas directamente al carrito. Diferenciador clave.

**Prompt para la IA:**
```
Crea la sección "Recetas de la semana" que conecta contenido editorial con compra.

3 tarjetas de receta en grid horizontal (desktop) o vertical (mobile).

Cada tarjeta de receta:
- Imagen de la receta: aspect-ratio 16:9, border-radius --radius-md arriba
- Badge de tiempo: "35 min" con ícono ti-clock
- Badge de dificultad: "Fácil" / "Medio"
- Nombre de receta: Sora SemiBold 17px
- Ingredientes: lista pequeña (máx 4 items visibles + "y 3 más")
  Cada ingrediente con ícono ti-check pequeño verde
- Botón principal: "Ver receta completa"
- Botón secundario: "Agregar ingredientes al carrito" — outline style, --color-primary
  Al hacer clic: animar y mostrar "X productos agregados al carrito"

Nota importante: este botón secundario ES EL MÁS VALIOSO. Es donde se genera venta.
Resaltarlo con hover más fuerte que el botón principal.

Esta sección tiene fondo --color-surface. Título: "Cocina con Cugat" Sora Bold 22px.
```

---

### ZONA 11 — Carnicería y bebidas alcohólicas

**Qué es:** Dos secciones de alta marginalidad. Mismo tratamiento que zona 6.

**Prompt para la IA:**
```
Replica el componente de la Zona 6 (grilla de ofertas) dos veces:

Instancia 1: "Carnicería — Cortes seleccionados"
- Fondo: tono rojo muy claro (#FDF0F0)
- Badge especial: "Importado" (bandera) o "Nacional" (color verde)
- El precio por KG es el dato más importante, mostrarlo en grande
- Máximo 8 productos

Instancia 2: "Bebidas para cada momento"
- Fondo: --color-surface normal
- Incluir tanto alcohólicas como jugos y aguas
- Máximo 8 productos

Ambas con sus encabezados y links "Ver todo →"
```

---

### ZONA 12 — Importados (sección diferenciada)

**Qué es:** Productos de mayor margen. Necesitan su propio tratamiento premium.

**Prompt para la IA:**
```
Crea la sección de productos importados con tratamiento visual premium distinto al resto.

Esta sección comunica: "estos productos son especiales, de otro nivel".

Diseño:
- Fondo oscuro: #1A1A1A (el único lugar en todo el sitio con fondo oscuro)
- Texto en blanco y tonos dorados
- Título: "Del mundo a tu despensa" en Sora Bold 24px blanco
- Subtítulo: "Productos importados seleccionados" en DM Sans 14px dorado (#F5A623)

Tarjetas de producto sobre fondo oscuro:
- Fondo tarjeta: #2A2A2A
- Borde: 1px #3A3A3A
- Texto nombre: blanco
- País de origen: badge con bandera emoji + nombre país
- Precio: dorado --color-accent
- Descripción corta: "Por qué es especial" en 13px muted

Máximo 6 productos. Botón "Explorar importados" outline blanco al final.

NOTA: Este contraste de sección genera sorpresa visual y señala que los importados
son algo aparte — técnica de zoning visual usado en tiendas premium.
```

---

### ZONA 13 — Suscripción al boletín (con incentivo real)

**Qué es:** El formulario actual de Cugat no da ningún motivo para suscribirse. Esto lo corrige.

**Prompt para la IA:**
```
Crea la sección de suscripción al boletín con incentivo visible.

Layout desktop: dos columnas 50/50
Layout mobile: apilado

Columna izquierda:
- Título grande: "Tu primer pedido con descuento" Sora Bold 26px
- Subtítulo: "Suscríbete y recibe un cupón de $2.000 en tu primer pedido online"
- Lista de beneficios con íconos ti-check verde:
  · Ofertas exclusivas antes que nadie
  · Catálogos semanales en tu correo
  · Participación en sorteos
  · Recetas y tips de cocina

Columna derecha:
- Card blanca con sombra flotando ligeramente
- Campo nombre: placeholder "Tu nombre"
- Campo email: placeholder "tucorreo@email.com"
- Botón: "Quiero mi descuento" — fondo --color-primary, ancho completo
- Texto legal mínimo en 11px muted debajo del botón
- Al hacer submit: mostrar mensaje de éxito con animación

No usar formulario HTML form tag. Usar div + button + JavaScript.
Fondo de sección: --color-primary con opacidad 8% (#E8242A14)
```

---

### ZONA 14 — Footer

**Qué es:** El footer de Cugat es bueno. Solo necesita limpieza visual.

**Prompt para la IA:**
```
Crea el footer con 4 columnas desktop / 2 columnas mobile / 1 columna móvil pequeño.

Fondo: #1A1A1A. Todo el texto en tonos claros.

Columna 1: Logo + descripción corta + redes sociales
- Logo texto "MiSuper" blanco
- Descripción: "Tu supermercado online. Calidad y ahorro todos los días." DM Sans 13px gris claro
- Íconos redes: ti-brand-facebook · ti-brand-instagram · ti-brand-youtube · ti-brand-whatsapp
  40x40px cada uno, fondo #2A2A2A, color blanco, border-radius 50%

Columna 2: Información útil
- "Contacto" como encabezado de columna
- Mail, teléfono, horarios de atención con íconos Tabler

Columna 3: Links rápidos
- Nosotros · Trabaja con nosotros · Cómo ser proveedor · Devoluciones · Términos

Columna 4: Métodos de pago
- Logos de: WebPay · Visa · Mastercard (usar texto/badges, no imágenes externas)
- "Compra 100% segura" con ícono ti-shield-check verde

Línea inferior: copyright + links de privacidad en texto pequeño gris.

Separador superior: línea de 1px #333333
```

---

## 5. Componentes reutilizables a crear primero

Antes de implementar las zonas, pide a la IA que cree estos componentes base:

### A. Tarjeta de producto (el más importante)

```
Crea un componente HTML reutilizable "product-card" con estas variantes:
- Variante "oferta": muestra precio original tachado + precio oferta + badge %
- Variante "fresco": solo precio por kg/unidad, badge "Nacional" opcional
- Variante "premium": diseño oscuro para sección importados
El componente se instancia con un objeto JavaScript de datos.
```

### B. Encabezado de sección

```
Crea un componente "section-header" reutilizable:
- Prop: título (string)
- Prop: subtítulo (string, opcional)
- Prop: link "ver más" (string, opcional)
- Prop: ícono Tabler (string, opcional)
Usar siempre la misma tipografía y espaciado para coherencia entre secciones.
```

### C. Botón agregar al carrito

```
Crea el componente "add-to-cart-btn" con estos estados:
- Default: ícono ti-plus circular
- Hover: expande mostrando texto "Agregar"
- Active: muestra selector de cantidad (+/- con número)
- Added: brief flash verde con checkmark
Animar con CSS transitions únicamente, sin librerías.
```

---

## 6. Responsive breakpoints

```css
/* Usar estos breakpoints en todo el proyecto */
/* Mobile:  < 640px  */
/* Tablet:  640px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 640px)  { /* mobile */ }
@media (max-width: 1024px) { /* tablet */ }
```

---

## 7. Optimizaciones de performance (pedir al final)

Una vez que tengas la estructura lista, pide estas optimizaciones:

```
Optimiza el HTML/CSS/JS generado para:
1. Lazy loading en todas las imágenes (loading="lazy")
2. Intersection Observer para animar secciones al entrar al viewport
3. CSS variables para theming (ya definidas en el sistema de diseño)
4. Sin librerías externas excepto Swiper.js para el hero
5. Fontes de Google Fonts con display=swap
6. Todas las animaciones con prefers-reduced-motion: reduce respetado
```

---

## 8. Prompt de inicio — pegar esto PRIMERO en cada sesión

```
Eres un desarrollador frontend y visual designer experto en ecommerce de supermercados.

Estás construyendo un sitio de supermercado online inspirado en cugat.cl pero con
mejor diseño visual y estructura de merchandising profesional.

SISTEMA DE DISEÑO (respetar siempre):
- Fuentes: Sora (títulos) + DM Sans (cuerpo) de Google Fonts
- Colores primarios: #E8242A (rojo), #F5A623 (amarillo), #2E7D32 (verde), #F7F5F2 (fondo)
- Border radius: sm=6px, md=12px, lg=20px
- Sombras: card=0 2px 8px rgba(0,0,0,0.08), hover=0 6px 20px rgba(0,0,0,0.12)
- Sin librerías pesadas. Solo Swiper.js si es necesario para carruseles.
- Código limpio, comentado, mobile-first
- HTML semántico (section, article, header, nav, main, footer)

Ahora implementa: [NOMBRE DE LA ZONA]
```

---

## 9. Orden de implementación sugerido

1. Sistema de diseño base (variables CSS + reset)
2. Componentes reutilizables (tarjeta producto + botones)
3. Zona 1: Barra logística
4. Zona 2: Header
5. Zona 3: Navegación de categorías
6. Zona 4: Hero principal
7. Zona 5: Grilla de categorías
8. Zona 6: Ofertas destacadas
9. Zona 7: Canastas sugeridas ← más impacto en ventas
10. Zona 8: Frutas y verduras
11. Zona 9: Ranking de tendencias
12. Zona 10: Recetas con carrito ← segundo más impacto
13. Zona 11: Carnicería + bebidas
14. Zona 12: Importados premium
15. Zona 13: Suscripción con incentivo
16. Zona 14: Footer
17. Optimizaciones de performance

---

## 10. Recursos y links

| Recurso | URL | Para qué |
|---|---|---|
| Tabler Icons | https://tabler.io/icons | Íconos gratuitos |
| Google Fonts | https://fonts.google.com/specimen/Sora | Fuente Sora |
| Google Fonts | https://fonts.google.com/specimen/DM+Sans | Fuente DM Sans |
| Swiper.js | https://swiperjs.com | Carrusel del hero |
| Placehold.co | https://placehold.co | Imágenes placeholder |
| CSS Variables | https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties | Referencia |

---

*Plan generado con análisis de Visual Merchandising, Trade Marketing y criterios de GPV.*
*Estructura optimizada para maximizar conversión y ticket promedio.*
