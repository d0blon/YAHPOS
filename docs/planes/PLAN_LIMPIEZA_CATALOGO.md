# 🚀 Plan Maestro: Limpieza y Normalización del Catálogo Global (40k SKUs)

Este documento guía el proceso de transformación de datos crudos extraídos de archivos PDF (`maestra_productos_clean.json`) hacia una base de datos de producción estructurada en Supabase.

---

## 🎯 Objetivo Final
Poblar la tabla `catalogo_global` en Supabase con ~40,000 registros que tengan:
- `sku`: Validado (EAN-13/14).
- `name`: Nombre legible para el cliente (ej: "Coca Cola Original").
- `brand`: Marca identificada.
- `volume`: Volumen o peso normalizado (ej: "500ml", "1kg").
- `category`: Categoría lógica para impuestos y reportes.

---

## 🛠 Fase 1: Limpieza por Código (Heurística)
**Instrucción para Opencode:** Escribe un script en Node.js para ejecutar esta limpieza inicial de forma masiva e instantánea. NO uses IA para esto.

### 1. Limpieza de "Basura" en Nombres
- **Remover Prefijos:** Eliminar códigos internos pegados al inicio (ej: `E063`, `F778`, `ZA22`).
  - *Regex Sugerido:* `/^[A-Z]\d{3,4}|^[A-Z]{2}\d{2,4}/i`
- **Normalización de Texto:** Convertir todo a `Title Case` (primera letra de cada palabra en mayúscula).
- **Remover Doble Espacio:** Limpiar espacios redundantes.

### 2. Extracción de Atributos
Extraer y separar del nombre los siguientes patrones:
- **Volumen:** `(\d+(\.\d+)?)\s?(CC|ML|L|GR|KG|K|LTS|LITROS)`
- **Multipacks:** `(X\d+|PACK\s?\d+|UNID\d+|DISPLAY)`
- **Resultado esperado:**
  - *Original:* `E063COCA COLA NORMAL 590 CC`
  - *Limpio:* `Coca Cola Normal` | *Volumen:* `590cc`

---

## 🧠 Fase 2: Enriquecimiento con IA (Gratis / Auto-memoria)
**Instrucción para Opencode:** Usa tu capacidad de procesamiento para generar un "Nombre Maestro" que sea ultra-específico.

### 1. Generación de Nombre Maestro (Para Imágenes y POS)
El nombre final debe seguir este patrón:
`[Nombre del Producto] [Marca] [Volumen/Peso] [Formato]`

**Ejemplos de transformación:**
- *Sucio:* `E063COCA COLA 1.5L X6`
- *Limpio:* `Coca Cola Original 1.5L (Pack 6 unidades)`
- *Sucio:* `ZA22 PAPAS LAYSTARR 250GR DISP`
- *Limpio:* `Papas Lays Tarro 250gr (Display / Caja)`

### 2. Estrategia de Búsqueda de Imágenes
Cuando realices el scraping o búsqueda, usa el **Nombre Limpio** completo. Esto garantiza que si el producto es un **Pack**, la imagen muestre el pack y no una unidad suelta.

---

## 🔍 Fase 3: Web Scraping de Imágenes (Killer Feature)
**Instrucción para Opencode:** Una vez tengas el nombre limpio, busca la URL de la imagen.

1. **Fuentes:** Priorizar `Open Food Facts API`, luego `Google Custom Search` (o scraping) y finalmente sitios de retail chilenos.
2. **Validación:** Si el nombre dice "Pack 6", asegúrate de que la imagen no sea de una botella individual.
3. **Almacenamiento:** Guarda la URL en el campo `image_url` de la tabla `catalogo_global`.

---

## 📊 Fase 4: Mapeo de Categorías
Estandarizar el catálogo en estas categorías para PatagoniaPOS:
- `Abarrotes`
- `Líquidos / Bebestibles`
- `Cigarros / Tabaco`
- `Panadería / Pastelería`
- `Lácteos / Huevos`
- `Limpieza / Aseo`
- `Perfumería / Higiene`
- `Confitería / Snacks`
- `Mascotas`
- `Otros`

---

## 📤 Fase 5: Migración a Supabase
Una vez generado el archivo `maestra_productos_final.json`:
1. **Validación:** Asegurar que no existan SKUs duplicados.
2. **Carga:** Usar el cliente de Supabase con una función de `upsert`.
3. **Tabla Destino:** `catalogo_global`.

---

## 🚦 Reglas de Oro para Opencode
1. **Diferenciar Formatos:** Es CRÍTICO identificar si es Unidad, Pack, Display o Caja.
2. **Preservar el SKU:** El SKU es la llave primaria, nunca debe ser alterado.
3. **Nombres Legibles:** Evitar mayúsculas sostenidas. Usar Formato de Título.
