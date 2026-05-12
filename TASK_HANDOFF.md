---
status: done
skill: frontend-design
goal: "Rediseñar UI de PosSettingsModal con mejor jerarquía visual, grouping por categorías, y componentes shadcn/ui en lugar de toggles artesanales"
branch: "task/design-ui-settings"
created: 2026-05-12T20:30:00-04:00
updated: 2026-05-12T20:30:00-04:00
requires-plan: false
depends-on: []
---

# Handoff: Rediseño UI Settings del POS

## Contexto
El `PosSettingsModal` actual (246 líneas) tiene todas las configuraciones en un scroll plano sin agrupar. Usa toggles artesanales (divs con posición absoluta) en vez del componente `Switch` de shadcn/ui que ya existe en el proyecto. La UI es funcional pero carece de jerarquía visual, íconos contextuales, y no aprovecha el sistema de diseño existente.

Objetivo: mantener la misma funcionalidad pero con mejor arquitectura visual, usando los patrones de `frontend-design` skill.

Item Kanban: `📋 BACKLOG` > `[Design] UI Settings`

## Skill Requerida
Este handoff usa `frontend-design`. Antes de implementar, carga la skill con `skill frontend-design`. La skill influye en las decisiones de diseño: tipografía, color, composición, motion.

## Dirección de Diseño
- **Tono**: Limpio, utilitario con personalidad — ni minimalista extremo ni maximalista
- **Tipografía**: Usar `font-black` + `uppercase` + `tracking-widest` para títulos de sección (patrón existente en el proyecto)
- **Color**: Mantener la paleta existente (patagonia-600, slate, accent-yellow) pero con mejor uso de color por categoría
- **Motion**: Transiciones suaves en apertura/cierre de secciones, sin exceso
- **Diferenciación**: Cada grupo de settings tiene un color de acento distinto y un icono representativo

## Especificación Técnica

### Archivos a modificar
- `src/components/pos/PosSettingsModal.tsx` — rediseño completo del modal

### Archivos a crear
- (ninguno — usar componentes existentes: `Switch`, `Card`, `Input`, `Button` de shadcn/ui)

### Archivos a NO modificar
- `src/stores/posStore.ts` — la lógica de estado y persistencia NO cambia
- `src/types/index.ts` — tipos no cambian
- `src/app/(pos)/pos/page.tsx` — donde se monta el modal no cambia

### Estructura nueva del modal

El modal se organiza en **tarjetas agrupadas por categoría**, cada una con su propio color de acento:

| Grupo | Settings | Acento |
|-------|----------|--------|
| **Caja** | blindClosureEnabled | amber/copper |
| **Seguridad** | pinRequiredForDelete, supervisorPin | rose/red |
| **Métodos de Pago** | junaebEnabled, maxSeals, region | emerald/green |
| **SII / Facturación** | siiModel | violet/purple |
| **Fidelización** | loyalty (accumulationRate, redemptionRate) | blue/sky |
| **Comportamiento** | (settings misceláneas existentes que no encajen arriba) | slate/gray |

### Componentes a usar

| Antes (artesanal) | Después (shadcn/ui) |
|--------------------|---------------------|
| `<div>` con posición absoluta para toggle | `<Switch>` de `@/components/ui/switch` |
| `<div>` card sin estructura | `<Card>`, `<CardHeader>`, `<CardContent>` de `@/components/ui/card` |
| `<Input>` plano | `<Input>` con label y descripción |

### Comportamiento esperado

1. Al abrir el modal, se ven las 5-6 tarjetas de grupo en un grid responsivo (1 col en mobile, 2 en sm, 3 en lg)
2. Cada tarjeta tiene: icono (lucide-react) → título del grupo → Switch/label según corresponda
3. Los switches usan `checked={settings[key]}` `onCheckedChange={() => handleToggle(key)}`
4. El supervisor PIN va dentro de la tarjeta "Seguridad" como un input expandible
5. La región (RM/REGIONES) va dentro de "Métodos de Pago" como un select nativo estilizado
6. `updateSettings({...})` se llama igual que antes — la capa de estado no cambia

### Dark mode
- Todas las tarjetas deben verse bien en dark mode (usar `dark:` variants)
- Los colores de acento deben funcionar en ambos modos

## Do Not
- ❌ NO cambiar la lógica de `updateSettings`, `loadSettings`, ni ningún store
- ❌ NO agregar ni quitar settings — solo rediseñar la UI existente
- ❌ NO modificar `PosSidebar.tsx`, `pos/page.tsx`, ni `ManagerPinModal.tsx`
- ❌ NO cambiar `PosSettings` interface en `posStore.ts`
- ❌ NO refactorizar otras partes del POS

## Criterios de Aprobación
- [ ] Settings agrupados en 5-6 tarjetas por categoría con iconos
- [ ] Cada grupo tiene un color de acento distintivo (amber, rose, emerald, violet, blue)
- [ ] Usa `<Switch>` de shadcn/ui en vez de toggles artesanales
- [ ] Grid responsivo: 1 col mobile, 2 col sm, 3 col lg
- [ ] Dark mode funciona en todos los grupos
- [ ] Supervisor PIN está dentro de tarjeta Seguridad (input expandible o visible siempre)
- [ ] `npm run build` pasa sin errores
- [ ] `npm run lint` pasa sin errores nuevos

## Next Action
1. Cargar `skill frontend-design`
2. Leer `src/components/pos/PosSettingsModal.tsx` completo
3. Leer `src/components/ui/switch.tsx` para entender la API del Switch
4. Leer `src/components/ui/card.tsx` para la API del Card
5. Implementar rediseño con grupos, iconos, Switch
6. Probar dark mode
7. `npm run lint && npm run build`
8. Report Back
