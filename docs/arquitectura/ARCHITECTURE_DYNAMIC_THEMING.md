# Dynamic Theming — Arquitectura

## Objetivo
Que cada negocio tenga su propia identidad visual (colores, logo, marca) reflejada en el POS real y el ecommerce, no solo en el preview del Branding Studio.

## Estado actual
- `appearance_primary_color` y `appearance_secondary_color` se guardan en `store_settings` pero **solo los usa el PDF SII**
- `accent_color` se guarda en SaaSProvider pero **ningún componente lo consume**
- `store_logo` y `store_name` SÍ se usan en POS sidebar, header, etc.
- Los colores están hardcodeados: `bg-corporate-blue`, `text-accent-yellow`

## Estrategia

### Capa 1: ThemeProvider (inyectar CSS variables)
```
<ThemeProvider storeId={storeId}>
  → lee appearance_primary_color, accent_color de settings
  → inyecta en :root:
     --brand-primary: {primaryColor}
     --brand-accent: {accentColor}
     --brand-logo: {logoUrl}
  → wrappea POS layout + admin layout
```

### Capa 2: Tailwind dynamic colors
```ts
// En tailwind.config.ts
colors: {
  brand: {
    primary: "var(--brand-primary, #7700cc)",
    accent: "var(--brand-accent, #FFD100)",
  }
}
```
Así `bg-brand-primary` funciona siempre, con fallback a YAHPOS! si no hay config.

### Capa 3: Migración gradual de componentes
| Fase | Componentes | Archivos |
|------|------------|----------|
| 1 | POS Sidebar, POS Header | `PosSidebar.tsx`, `pos/page.tsx` (header) |
| 2 | POS modales principales | `PaymentModal.tsx`, `CashOpeningModal.tsx` |
| 3 | Admin sidebar, Admin header | `AdminSidebar.tsx`, `AdminHeader.tsx` |
| 4 | Ecommerce header, footer | `Header.tsx`, `Footer.tsx` |
| 5 | Botones, cards, UI kit | Todos los componentes shadcn/ui |

## No requiere
- ✨ Nuevas tablas en Supabase
- ✨ Nuevos endpoints API
- ✨ Cambiar SaaSProvider (ya tiene los datos)

## Requiere
- Crear `src/providers/ThemeProvider.tsx`
- Modificar `tailwind.config.ts` (agregar brand colors)
- Modificar layouts para wrappear con ThemeProvider
- Modificar componentes uno por uno (fase 1-5)
