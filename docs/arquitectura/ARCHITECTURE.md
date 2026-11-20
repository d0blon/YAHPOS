# 🗺️ ARQUITECTURA DE PATAGONIAPOS

Este documento describe el "Sistema Nervioso" de la plataforma para asegurar que cualquier cambio nuevo sea compatible con la estructura existente.

## 🛡️ Núcleo de Seguridad y Multi-tenancy

### 1. Middleware (`src/middleware.ts`)
*   **Función:** Puerta de enlace obligatoria. 
*   **Responsabilidad:** 
    *   Detectar si el host es el dominio raíz (`localhost:3000` o `yahpos.cl`).
    *   **Bloqueo Estricto:** Impide acceso a `/pos`, `/admin` y `/vender` desde el raíz.
    *   **Resolución de Tienda:** Busca el `subdomain` en Supabase y lo inyecta en los headers (`x-store-id`, `x-store-slug`).
*   **⚠️ Punto de Quiebre:** Si el Middleware falla, el resto de la app no sabrá qué tienda mostrar y colapsará.

### 2. SaaS Provider (`src/providers/SaaSProvider.tsx`)
*   **Función:** Hidratación de contexto.
*   **Responsabilidad:** Lee los headers inyectados por el Middleware y carga la configuración de la tienda (`config`, `tier`, `is_active`) desde la base de datos.
*   **Dependencia:** Todos los componentes de `/pos` y `/admin` consumen este contexto para habilitar/deshabilitar funciones según el Plan (Austral, Archipiélago, Patagonia).

## 🛒 Módulos Principales

### 3. Punto de Venta (POS - `src/app/(pos)/pos/page.tsx`)
*   **Lógica Offline:** Usa `IndexedDB` o estados locales para ventas rápidas.
*   **Integración SII:** El motor de facturación (`src/lib/sii/`) se activa solo si el método de pago NO es Junaeb/Pluxe.
*   **Caja:** Depende del `CashOpeningModal` para iniciar operaciones.

### 4. Administrador (`src/app/(admin)/admin/*`)
*   **RBAC (Roles):** El acceso a sub-secciones (Inventario, Personal, SII) depende de la matriz definida en `MAPA_MAESTRO_MISIONES_PENDIENTES.md`.
*   **Gestión DTE:** Interfaz para cargar certificados `.pfx` y folios `CAF`.

## 🔄 Flujo de Datos Crítico

1. **Cliente** accede a `tienda.yahpos.cl`
2. **Middleware** identifica la tienda y redirige si es necesario.
3. **SaaSProvider** carga la configuración de la DB usando el ID del Middleware.
4. **App Layout** renderiza la interfaz según el Plan y Rol.
5. **POS / Admin** ejecutan lógica de negocio.

## ⚠️ PUNTOS DE QUIEBRE (Zonas Rojas)

1.  **`src/middleware.ts`**: No tocar sin un plan de pruebas de regresión total.
2.  **`src/providers/SaaSProvider.tsx`**: Cambios aquí pueden desloguear a todos los usuarios o deshabilitar funciones pagadas.
3.  **`src/lib/sii/`**: Contiene la lógica criptográfica de firma XML. Un error aquí genera boletas inválidas legalmente.
4.  **`src/lib/supabase.ts`**: Configuración central de conexión.

---
*Documento mantenido por Antigravity. Última actualización: 9 de Mayo 2026.*
