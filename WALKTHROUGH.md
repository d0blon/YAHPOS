# Walkthrough YAHPOS!: Infraestructura Administrativa y Facturación

Este documento detalla la implementación de los módulos administrativos, el sistema de roles automatizado y la integración de facturación electrónica (SII) con niveles de suscripción (SaaS).

## 1. Sistema de Roles Automatizado
Se ha implementado una lógica en el servidor para que la creación de negocios sea segura y jerárquica.

### Acciones Realizadas:
- **`createStoreAction`**: Ubicada en `src/app/admin/developer/actions.ts`. Ahora, al crear una tienda:
  - El usuario que la crea recibe automáticamente el rol `owner`.
  - Los correos configurados en `DEVELOPER_EMAILS` reciben el rol `developer`.
- **Validación DB**: Se añadió una restricción `CHECK` en la tabla `profiles` para asegurar que solo se permitan roles válidos (`admin`, `owner`, `developer`, `employee`, etc.).

## 2. Gating de Funcionalidades (SaaS Tiers)
El acceso a diferentes tipos de Documentos Tributarios Electrónicos (DTE) está restringido según el plan del merchant.

### Niveles de Suscripción:
- **Básico**: Boletas (39) y Boletas Exentas (41).
- **Plus**: Agrega Facturas (33), Notas de Crédito (61) y Notas de Débito (56).
- **Elite**: Agrega Guías de Despacho (52).

### Implementación Técnica:
- **`SaaSProvider.tsx`**: Centraliza la lógica `isDocumentTypeEnabled(tipoDte)`.
- **UI Gating**: Los componentes de interfaz detectan el plan y bloquean/ocultan opciones no disponibles, mostrando un icono de candado y el nivel requerido.

## 3. Panel de Facturación Administrativa
Se ha creado una nueva ruta `/admin/facturacion` para la gestión manual de documentos.

### Componentes Clave:
- **`DocumentTabs.tsx`**: Interfaz dinámica que permite emitir cualquier DTE soportado.
  - Soporta configuración específica para Guías de Despacho (Tipo de despacho, Motivo de traslado).
  - Permite referencias para Notas de Crédito/Débito.
- **Acciones SII**: Integración con el motor `emitirDocumento()` que maneja folios y cálculos de impuestos de forma automática.

## 4. Estructura de Base de Datos
Se han consolidado las migraciones para soportar multi-tenancia:
- `merchants`: Representa la entidad legal.
- `stores`: Sucursales asociadas a un merchant.
- `profiles`: Usuarios con roles específicos vinculados a una tienda.

---
*Este sistema sienta las bases para la operación a gran escala de YAHPOS!, asegurando que cada merchant opere dentro de sus límites contratados y con la seguridad adecuada.*

## 5. Seguridad: Defensa en Profundidad (Security)
Se ha implementado una arquitectura de seguridad de doble capa para todas las rutas administrativas, evitando que usuarios no autorizados puedan forzar el acceso a paneles sensibles.

### Capa 1: Middleware (Capa Global)
El `middleware.ts` intercepta todas las peticiones a `/admin/*` y verifica la existencia de una sesión de Supabase. Si no hay sesión, redirige al `/login`.

### Capa 2: Server Component Guard (Capa de Ruta)
El layout principal de administración (`src/app/admin/layout.tsx`) se ha convertido en un **Async Server Component**.
- **Autenticación Estricta**: Realiza una llamada directa a `supabase.auth.getUser()` para validar que el token de sesión es legítimo y no ha expirado.
- **Autorización por Rol**: Consulta la tabla `profiles` en el servidor para verificar que el usuario posea un rol administrativo (`owner`, `developer`, `admin`, etc.). Si el usuario no tiene permisos, es redirigido fuera del panel.
- **Separación de Lógica**: La lógica de UI (sidebar, estado, animaciones) se movió a `AdminLayoutClient.tsx`, manteniendo el layout del servidor limpio y enfocado exclusivamente en la seguridad.

---
## 6. Verificación Final
Se ha verificado el correcto funcionamiento del sistema:
- **Automatización de Roles**: Confirmado que `createStoreAction` asigna roles `owner` y `developer` correctamente en el backend.
- **Validación de DB**: Migración `008_roles_validation.sql` aplicada con éxito, restringiendo roles en la tabla `profiles`.
- **Interfaz de Facturación**: La ruta `/admin/facturacion` renderiza correctamente el componente `DocumentTabs`.
- **Seguridad Admin**: Se probó el acceso a `/admin/facturacion` sin sesión y con un rol no administrativo, confirmando que el sistema redirige correctamente y protege los componentes de cliente de una renderización no autorizada.
- **Gating SaaS**: Se confirmó visualmente que los documentos restringidos (como Facturas o Guías) muestran candados y tooltips informativos cuando el plan del merchant no los permite.

## 7. Developer Command Center (Naranjo Edition)
Se ha estabilizado el panel de control para desarrolladores con una estética de terminal de alta gama y datos 100% reales.

### Características Principales:
- **KPIs de Producción**: El dashboard ahora calcula métricas reales (Total, Activos, Morosos, Mix de Planes) consultando directamente la tabla `public.stores`.
- **Monitor Real-Time**: 
  - **Selector de Contexto**: Permite filtrar logs y métricas de salud por un negocio específico o ver la infraestructura global.
  - **Logs del SII**: Integración con `sii_logs` para monitorear emisiones en tiempo real.
  - **System Health**: Verificación de latencia y estado de Supabase, API, Auth y Storage con estética "Brutalist".
- **Gestión de Facturación (SaaS)**: Interfaz para actualizar planes (`tier`), fechas de vencimiento y estados de pago de cada tenant, con revalidación instantánea de caché.

### Estética "Naranjo":
- Uso de paleta de colores `Amber` y `Orange`.
- Diseño de "Terminal" con esquinas rectas (`rounded-none`), fuentes monoespaciadas y micro-animaciones de actividad.
- Indicadores de estado con efectos de pulso y sombras neón para una sensación premium.

---
## 8. Multi-Tenancy y Dominios Agnósticos
Se ha optimizado el núcleo del sistema para soportar cualquier dominio o subdominio, eliminando restricciones hardcodeadas y corrigiendo errores críticos de enrutamiento.

### Mejoras Realizadas:
- **Middleware Robusto**: 
  - Corregido error de redeclaración de `host` que causaba fallos de sintaxis en producción.
  - Normalización de host a minúsculas (`.toLowerCase()`), eliminando fallos cuando el usuario escribe el dominio con mayúsculas.
  - Bloqueo estricto de rutas de tienda (`/pos`, `/admin`, `/vender`) cuando se accede desde el dominio raíz (`yahpos.cl` o `localhost`), redirigiendo automáticamente a la landing.
- **Base de Datos (RPC Agnóstica)**:
  - Migración `018_domain_agnostic_rpc.sql` aplicada.
  - La función `get_store_by_domain` ya no depende de `.yahpos.com`. Ahora utiliza comparaciones con `LIKE subdomain || '.%'`, lo que permite resolver tiendas en `.cl`, `.com`, `.localhost`, etc.
  - Soporte nativo para **Dominios Personalizados** mediante coincidencia exacta con `custom_domain`.

### Beneficios:
- **Flexibilidad Local**: Los desarrolladores ahora pueden usar cualquier TLD local (ej: `.localhost:3000`, `.localtest.me:3000`) sin modificar el código.
- **Seguridad (Auth Guard)**:
  - Se detectó y corrigió una vulnerabilidad crítica donde las rutas `/pos` y `/vender` permitían el acceso a usuarios no autenticados en subdominios.
  - Se integró `isPosRoute` en la guardia global de autenticación del middleware. Ahora, cualquier intento de acceso sin sesión redirige automáticamente al `/login`.
- **Escalabilidad**: El sistema está listo para recibir clientes con sus propios dominios (`tienda-pepito.cl`) sin intervenciones manuales adicionales.

---
## 9. Sincronización de Sesión Multi-Dominio
Se ha implementado una infraestructura robusta para permitir que la sesión de usuario persista sin interrupciones al navegar entre el dominio raíz (`yahpos.cl`) y los subdominios de las tiendas (`*.yahpos.cl`).

### Problema Resuelto:
La autenticación en Next.js/Supabase está limitada al dominio donde se origina. Al loguearse en la landing y saltar a un administrador o POS, la sesión se perdía o entraba en bucles de redirección.

### Implementación Técnica:
- **Bridge de Sincronización (`/api/auth/session-sync`)**: Una ruta dedicada que recibe tokens de forma segura y los "siembra" como cookies en el dominio destino.
- **Middleware de Doble Paso**: El middleware ahora transfiere explícitamente las cookies a las respuestas de redirección, evitando la pérdida de estado durante cambios de protocolo o host.
- **Soporte de Cookie Chunking**: Integración completa de `@supabase/ssr` para manejar cookies fragmentadas por tamaño, vital para sesiones de larga duración.
- **Prevención de Bucles**: Se añadió lógica de auto-redirección en la página de Login (`LoginPage.tsx`) para que, si un usuario ya está sincronizado pero cae en el login por un lag de red, sea enviado automáticamente a su destino.

---
## 10. Redirección Inteligente (Smart Redirection)
Se ha implementado una lógica de enrutamiento basada en roles para optimizar la experiencia de usuario tras el inicio de sesión.

### Acciones Realizadas:
- **`LoginPage.tsx`**: 
    - Se actualizó el flujo de login manual para que, tras un éxito, verifique el rol del usuario en el `authStore`.
    - Los roles administrativos (`admin`, `owner`, `manager`, `developer`, `superadmin`) son redirigidos automáticamente a `/admin`.
    - Los clientes permanecen en el storefront (`/`).
    - Se mantiene la prioridad de los parámetros `?redirect` o `?next` en la URL para no romper flujos de navegación profunda.
- **Auto-redirección Inteligente**: La lógica de `useEffect` que detecta sesiones activas ahora también realiza esta verificación de rol en el servidor (vía Supabase profiles) para asegurar una redirección coherente incluso sin hidratación del store.
- **Optimización de SessionSync**: Se eliminó un `setTimeout` con `router.refresh()` que causaba parpadeos y doble navegación post-login. 
- **Navegación Robusta**: Se utiliza `window.location.href` en lugar de `router.push()` para todas las redirecciones post-autenticación. Esto fuerza una navegación completa del navegador que garantiza que las nuevas cookies de sesión se envíen al servidor, permitiendo que el Middleware (Proxy) reconozca al usuario inmediatamente al entrar a rutas protegidas como `/admin`.

---
*Documentación actualizada el 10 de Mayo 2026 tras la estabilización del flujo de autenticación y redirección.*

---
## 11. Consolidación de Atributos Nutricionales y Catálogo Global
Se ha estandarizado la arquitectura de datos para los sellos de advertencia nutricional (Chile), eliminando inconsistencias entre el frontend y el backend.

### Cambios Realizados:
- **Consolidación de Atributos**: 
    - Se eliminó el campo redundante `sellosCount` en el `ProductModal.tsx` y en la interfaz `Product`.
    - Ahora se utiliza exclusivamente `nutritionalSeals` (campo nativo de la base de datos) como fuente única de verdad.
- **Sincronización Automática (Open Food Facts)**:
    - Se actualizó la lógica de autocompletado en `ProductModal.tsx`. Al ingresar un SKU/Código de barras, el sistema consulta `/api/products/lookup`.
    - Si el producto existe en el catálogo global, el sistema autocompleta automáticamente el nombre, categoría, imagen y la **cantidad de sellos nutricionales**.
- **Validación en POS (Junaeb/Pluxe)**:
    - Se actualizó `PaymentModal.tsx` para que la validación de pagos de beneficios estatales utilice el campo consolidado `nutritionalSeals`.
    - Se restauró la lógica que bloquea productos que exceden el límite de sellos configurado en los ajustes del POS (`maxSeals`).

### Verificación Técnica:
- **UI Cleanliness**: El formulario de producto ahora solo muestra un selector para "Sellos Nutricionales".
- **Magic Fill**: Verificado que al escanear productos conocidos, el contador de sellos se ajusta instantáneamente sin intervención del usuario.
- **Compliance**: Los pagos Junaeb son rechazados correctamente si el carrito contiene productos con más de 2 sellos (o el límite configurado).

---
## 12. Gestión de Sesiones de Caja y Terminales
Se ha resuelto el problema de concurrencia y bloqueo de terminales, asegurando que los cajeros puedan transicionar entre sesiones sin dejar bloqueos huérfanos.

### Mejoras Realizadas:
- **Liberación Automática (POST /api/cash-sessions)**: Al abrir una nueva sesión, el sistema identifica sesiones abiertas previas del mismo usuario, las cierra en la base de datos y libera los terminales asociados (`status: 'active'`).
- **Limpieza de Datos Stale (GET /api/terminals)**: Se añadió un override en la API para asegurar que el listado de terminales no muestre información de perfiles obsoleta almacenada en la tabla `terminals`.
- **Cierre de Sesión desde UI (PosHeader.tsx)**: El botón "Cerrar caja" ahora realiza una petición `PATCH` al backend para cerrar formalmente la sesión en la base de datos antes de limpiar el estado local.
- **Consistencia de Estado**: Se estandarizó el uso de `status: 'active'` como el estado de terminal disponible en la base de datos, alineado con scripts de limpieza automática.

### Verificación Técnica:
- **Script SQL**: Se ejecutó una limpieza manual para regularizar terminales con bloqueos inconsistentes.
- **Linting**: Los archivos modificados (`route.ts`, `PosHeader.tsx`) fueron validados con ESLint, eliminando advertencias de importaciones no usadas y tipos `any`.
- **Flujo de Usuario**: Verificado que un usuario puede cerrar su caja y verla disponible instantáneamente para otros operadores.

---
*Documentación actualizada el 11 de Mayo 2026 tras la implementación de los fixes de terminales.*
