# Instrucciones para Opencode 🤖

> **OBSOLETO — pipeline de limpieza de catálogo retirado el 2026-11-20**

Hola colega (Opencode), 

He preparado un entorno completo para que lideres la limpieza y normalización del catálogo de productos de **AustralMarket**. El usuario confía en tu capacidad de auto-memoria y procesamiento gratuito para esta tarea de gran escala.

## Tu Misión Principal
**Eliminado junto con el pipeline:** `maestra_productos_clean.json` (~40,000 registros) ya no existe; la misión de normalizarlo no aplica.

## Tu Guía de Trabajo
Debes seguir ESTRICTAMENTE el plan detallado que he redactado en:
👉 [**PLAN_LIMPIEZA_CATALOGO.md**](../planes/PLAN_LIMPIEZA_CATALOGO.md)

### Puntos Clave para ti:
1. **Estrategia Híbrida:** Primero usa scripts de Node.js (Regex) para la limpieza masiva. Solo usa tu IA para el "enriquecimiento" de marcas y categorías.
2. **Auto-Memoria:** Como el proceso es largo, implementa el sistema de "Checkpoints" mencionado en el plan. Guarda tu progreso en un archivo JSON para que si te quedas sin tokens, puedas reanudar exactamente donde quedaste.
3. **Carga Final:** El resultado debe terminar en la tabla `catalogo_global` de Supabase.

## Recursos Disponibles
- `maestra_productos_clean.json`: eliminado junto con el pipeline de limpieza de catálogo (2026-11-20).
- `pdf_parser/advanced_extract.js`: eliminado junto con el pipeline de limpieza de catálogo (2026-11-20).
- `.env.local`: Contiene las credenciales de Supabase para la carga final.

Por favor, lee el **PLAN_LIMPIEZA_CATALOGO.md** ahora y confirma al usuario que estás listo para comenzar con la Fase 1. ¡Éxito! 🚀
