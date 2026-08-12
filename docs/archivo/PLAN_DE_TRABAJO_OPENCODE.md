# Plan de Implementación - Nuevas "Killer Features"

Este plan de trabajo detalla la arquitectura y los pasos necesarios para implementar las tres funcionalidades clave discutidas. Está estructurado para que cualquier desarrollador (o IA como Opencode) pueda tomarlo y comenzar a programar de inmediato.

## Resumen de Objetivos
1. **Monitor de Stock en Tiempo Real:** Mostrar disponibilidad en vivo de productos frescos (pan, carne) en la web.
2. **Integración Junaeb / Pluxe:** Métodos de pago institucionales con validación de sellos y exclusión del SII.
3. **Autocompletado Mágico:** Auto-rellenado del formulario de creación de productos al escanear un código de barras nuevo, utilizando una API global.

---

## Cambios Propuestos

### Fase 1: Autocompletado Mágico vía Escáner (Prioridad Alta)
*Facilita la entrada de nuevos clientes al sistema.*

#### 1. Base de Datos (Supabase)
*   **Tabla `products`:** Asegurar que el campo `sku` esté indexado para búsquedas rápidas.

#### 2. Nuevo Endpoint: `src/app/api/products/lookup/route.ts`
*   **Backend:** Crear una ruta API que reciba un `sku` (código de barras).
*   **Lógica (Estrategia Multi-Capa para 100% de éxito):**
    1.  **Capa 1 (Catálogo Global Propio):** Consultar si algún otro cliente de PatagoniaPOS ya ingresó ese código.
    2.  **Capa 2 (Open Food Facts):** Si no está, buscar en la API gratuita `https://world.openfoodfacts.org/api/v0/product/{sku}.json`.
    3.  **Capa 3 (Scraper de Respaldo / Fallback):** Si no está en Open Food Facts, hacer una búsqueda silenciosa (scraping) en supermercados chilenos o usar una API comercial (ej. Go-UPC). **Esto garantiza que el cliente SIEMPRE reciba el auto-rellenado que se le prometió en la venta.**
    4.  Devolver los datos estructurados al frontend.

#### 3. Modificar UI: `src/components/admin/ProductModal.tsx`
*   **UI/UX:** Añadir un estado de carga (`isSearchingBarcode`) al input del SKU.
*   **Lógica:** Implementar un `useEffect` con "debounce" (ej. 500ms) o escuchar el evento `onBlur` en el campo `sku`.
*   Si el SKU tiene la longitud típica de un código de barras (8 a 13 dígitos), hacer un fetch a `/api/products/lookup`.
*   Si la API devuelve datos, auto-completar los campos `name`, `image` (URL de imagen) y sugerir la categoría. Mostrar un toast: "✨ Producto encontrado en catálogo global".

---

### Fase 2: Integración Junaeb / Pluxe (Evitar Doble Tributación)
*Reglas de negocio estrictas para evitar multas del SII y Junaeb.*

#### 1. Base de Datos (Supabase)
*   **Tabla `products`:** Añadir columna `nutritional_seals` (integer, default 0). Representa la cantidad de sellos de advertencia.
*   **Tabla `saas_config`:** Añadir columna de configuración `allow_junaeb_max_seals` (integer, default 2) y `enable_junaeb_payment` (boolean).

#### 2. Modificar UI de Pagos: `src/components/pos/PaymentModal.tsx`
*   **UI:** Añadir "JUNAEB" y "PLUXE" como botones/opciones de pago si están habilitados en la configuración de la tienda.
*   **Validación de Carrito:** Al seleccionar JUNAEB, iterar sobre `cartItems`. Si algún producto tiene `sellos > config.allow_junaeb_max_seals`, bloquear el pago y mostrar una alerta roja: "Este carrito contiene productos con demasiados sellos. Incompatible con pago Junaeb."

#### 3. Lógica de POS: `src/app/(pos)/pos/page.tsx`
*   **Lógica de Checkout:** Ya excluimos "JUNAEB" del consumo de folios. Debemos extender la condición para incluir "PLUXE".
    ```typescript
    const bypassSII = ['JUNAEB', 'PLUXE'].includes(paymentMethod);
    if (!bypassSII) {
        // Ejecutar lógica del SII (consumeFolio, firmar DTE)
    }
    ```
*   **Ticket / Recibo:** Asegurar que el recibo impreso (Voucher) indique explícitamente: "PAGO CON BENEFICIO JUNAEB - NO VÁLIDO COMO BOLETA SII".

---

### Fase 3: Monitor de Stock en Tiempo Real
*Visibilidad de productos calientes (Pan, Comida Preparada) para el cliente final.*

#### 1. Base de Datos (Supabase)
*   **Tabla `products`:** Añadir columna `is_realtime_tracked` (boolean, default false).

#### 2. Modificar Tienda Web: `src/app/(shop)/page.tsx` (o componentes de la tienda)
*   **Lógica:** Integrar **Supabase Realtime**. Suscribirse a los cambios en la tabla `products` donde `is_realtime_tracked = true`.
*   **UI:** Crear un banner o sección "Productos Recién Salidos" en la portada de la tienda.
    *   Mostrar una tarjeta con animación sutil (ej. pulso verde) que diga: "¡Pan Fresco! Quedan 45 unidades".
    *   Este número debe actualizarse instantáneamente sin recargar la página cuando se vende o se repone stock.

#### 3. Modificar POS: `src/app/(pos)/pos/page.tsx` (o un nuevo widget en POS)
*   **UI:** Crear un modal de "Carga Rápida de Stock".
*   **Lógica:** Para que la funcionalidad sea útil, el panadero o cajero debe poder actualizar el stock de pan en 2 clics. Un panel lateral que liste los productos `is_realtime_tracked` con botones `[+10]`, `[+20]`, `[+50]` para sumar stock nuevo inmediatamente.

---

## ⚠️ Preguntas Abiertas / Para Revisión del Usuario (Cuadrar con Opencode)

1.  **Sobre la API de Códigos de Barras:** Open Food Facts es gratuita y tiene muchos productos, pero puede faltar cobertura de marcas locales chilenas. ¿Deseas que empecemos con la gratuita (Open Food Facts) y si vemos que faltan productos chilenos buscamos una API de pago (como Go-UPC o similar)?
2.  **Sobre las Categorías:** Cuando la API de códigos de barras encuentre un producto (ej. "Bebida Cola"), esa categoría de la API puede que no exista en la base de datos de tu cliente. ¿Prefieres que el sistema cree la categoría automáticamente si no existe, o que deje el campo categoría "en blanco" para que el usuario elija de su propia lista manual?
3.  **Sobre los Sellos:** Para validar los pagos con Junaeb, necesitamos saber cuántos sellos tiene cada producto. Esto significa que en el `ProductModal.tsx` habrá que agregar un campito extra para definir "Cantidad de Sellos (0 al 4)". ¿Te parece bien este enfoque?
