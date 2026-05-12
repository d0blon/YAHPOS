---
status: done
goal: "El botón de Pluxe solo aparece cuando la región seleccionada es RM"
branch: null
created: 2026-05-12T16:45:00-04:00
updated: 2026-05-12T16:45:00-04:00
requires-plan: false
depends-on: []
---

# Handoff: Bug Pluxe — región invertida

## Contexto
El usuario reportó que Pluxe se muestra en REGIONES cuando debería mostrarse solo en RM. La cobertura real de Pluxe es solo Región Metropolitana. Edenred es al revés: solo en REGIONES. El bug está en la línea 149 de `PaymentModal.tsx`.

Item en Kanban: `🏗️ EN PROGRESO` > `[Bug] Pluxe aparece en REGIONES → debe ser RM`

## Especificación Técnica
### Archivos
- **Requeridos para entender el problema:**
  - `src/components/pos/PaymentModal.tsx:140-160` — bloque de lógica de voucher + región
  - `src/stores/posStore.ts:37-42` — definición de `PosSettings.region`
- **A modificar:**
  - `src/components/pos/PaymentModal.tsx:149` — cambiar condición
- **A crear:** ninguno

### Lógica esperada
Comportamiento actual (BUG):
  - Pluxe se muestra cuando `region === 'REGIONES'` (incorrecto)
  - Es decir: Edenred y Pluxe aparecen en los mismos lugares

Comportamiento esperado:
  - Pluxe se muestra SOLO cuando `region === 'RM'`
  - Edenred se muestra SOLO cuando `region === 'REGIONES'`
  - Si región no está definida, no se muestra ningún voucher

### Contratos
- `region` se lee de `posStore.settings.region`
- `region` solo puede ser `'RM'` o `'REGIONES'` (definido en `PosSettingsModal.tsx`)
- `pluxeEnabled` y `edenredEnabled` siguen siendo toggles independientes — esta tarea NO los toca

## Do Not
- ❌ NO modificar la lógica de Edenred
- ❌ NO tocar `PosSettingsModal.tsx`, `posStore.ts` ni ningún otro archivo
- ❌ NO refactorizar PaymentModal (eso es otra tarea)
- ❌ NO cambiar estilos, textos, imports, tipos o cualquier otra cosa
- ❌ NO modificar el `pluxeEnabled` toggle ni su lógica

## Failed Attempts
- (ninguna, primera vez)

## Criterios de Aprobación
- [ ] Botón Pluxe visible cuando `settings.region === 'RM'`
- [ ] Botón Pluxe NO visible cuando `settings.region === 'REGIONES'`
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run build` pasa sin errores

## Next Action
1. Abrir `src/components/pos/PaymentModal.tsx`
2. Ir a línea 149
3. Cambiar `region === 'REGIONES'` por `region === 'RM'`
4. Guardar
5. Ejecutar `npm run lint`
6. Ejecutar `npm run build`
7. Reportar
