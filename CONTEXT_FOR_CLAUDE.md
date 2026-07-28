# Contexto para Claude (OpenCode / Arquitecto)

## Estado de la Tarea: Catálogo Maestro YAHPOS! (Completado por Antigravity)

Esta tarea se ha implementado en su totalidad según el `TASK_HANDOFF.md` (Fases A, B y C). Todo el código compila correctamente y no hay errores nuevos de ESLint.

### Resumen de Implementación por Fases

#### Fase A (Schema e Importación)
- **`supabase/migrations/024_master_catalog.sql`**: Contiene la definición de `master_catalog_products` (solo lectura para `authenticated`) y `master_catalog_submissions` (RLS activado pero sin policies explícitas, forzando bypass vía admin client).
- **`scripts/import_master_catalog.js`**: Lee `public/data/catalog.json` (1,742 productos reales, descartando el viejo de 39k) e importa a Supabase. **Esta fase ya fue aplicada y verificada en Supabase.**

#### Fase B (Endpoint de Lookup y Modal)
- **`src/app/api/products/lookup/route.ts`**: Reescribimos el endpoint existente.
  - **Capa 1 Eliminada**: Se eliminó el query inseguro a `products` que permitía ver datos cross-tenant (no usaba `store_id`).
  - **Capa 2 Eliminada**: Se eliminó la dependencia de Open Food Facts.
  - **Nueva lógica**: Ahora el `GET` busca solo por EAN-13 exacto en `master_catalog_products`. El `POST` crea un registro en `master_catalog_submissions` con estado `pending` usando el `createAdminClient()` (bypass RLS).
- **`src/components/admin/ProductModal.tsx`**: 
  - Se agregó el estado `skuMatchedMaster`. 
  - Si el usuario guarda un producto manual cuyo SKU no estaba en el catálogo maestro, se dispara automáticamente un `POST /api/products/lookup` para enviarlo a la cola de moderación.

#### Fase C (Panel de Moderación - Developer)
- **`src/app/developer/actions.ts`**: Se crearon las siguientes Server Actions (todas protegidas verificando que `profile.role === 'developer'`):
  - `getPendingMasterCatalogSubmissionsAction`
  - `approveMasterCatalogSubmissionAction` (realiza un upsert al maestro usando Admin Client).
  - `rejectMasterCatalogSubmissionAction`
  - `importEnrichedMasterCatalogSubmissionsAction`
- **`src/app/developer/DeveloperPanel.tsx`**: Se agregó la pestaña **Catálogo Maestro** (`CATALOG`).
  - Muestra una tabla con los SKUs pendientes y su origen (`store_id`).
  - Botón para **Exportar para IA** (descarga un `.json` con los pendientes).
  - Botón para **Importar Enriquecido** (sube el `.json` procesado y actualiza los campos, ej. `description`).
  - Acciones inline por fila para editar los datos recibidos, Aprobar (moviéndolo al catálogo maestro real) o Rechazar.

### Decisiones Técnicas Relevantes
- Se utilizó Server Actions para la Fase C en lugar de rutas API puras, ya que el resto de `DeveloperPanel` utiliza `actions.ts`.
- La exportación a JSON en la Fase C se hace en el cliente construyendo un `Blob`/`dataURI` a partir del estado de React, y la importación parsea el JSON mediante `FileReader` y lo envía a la Server Action, evitando tener que manejar `FormData` de archivos grandes en Next.js.
- Se fijaron los tipos de TypeScript introducidos (removiendo los `any`) en `actions.ts` y `DeveloperPanel.tsx` para mantener el linting limpio, que es un evidence gate estricto.

### Próximos Pasos para Claude
- Si necesitas realizar modificaciones en este flujo, los puntos de anclaje son el modal (`ProductModal.tsx`), el endpoint de ingesta (`api/products/lookup/route.ts`), y la UI de moderación (`DeveloperPanel.tsx` / `actions.ts`).
- La base de datos ya cuenta con los 1,742 productos base en producción/branch actual.

### Actualización: Fase C-Fix Aplicada
- Se corrigió un bug de runtime detectado por OpenCode/Claude. Las Server Actions `getPendingMasterCatalogSubmissionsAction` y `approveMasterCatalogSubmissionAction` ahora utilizan `adminClient` en lugar de `createClient()` para interactuar con `master_catalog_submissions`. 
- Esto resuelve el problema de RLS silencioso que devolvía un array vacío `[]` al intentar acceder a la tabla de submissions, la cual no tiene policies para el rol `authenticated` por diseño.
