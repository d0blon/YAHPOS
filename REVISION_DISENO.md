# 📋 Checklist: Revisión de Diseño y Lógica YAHPOS!

Este checklist tiene como objetivo verificar la integridad visual (Glassmorphism, Responsividad) y funcional (RBAC, SII, CRUDs) de todo el software.

## 1. 🔑 Autenticación y Acceso
- [ ] **Login / Registro**: Verificar diseño premium y feedback de errores.
- [ ] **SessionSync**: Confirmar que el tier y rol se cargan correctamente según el usuario.
- [ ] **Protección de Rutas**: Intentar entrar a `/admin` como `customer` (debe denegar).
- [ ] **2FA (Authy/Google)**: Probar flujo completo de activación y validación.

## 2. 📊 Dashboard Administrativo (`/admin`)
- [ ] **Gráficos (Recharts)**: Verificar que carguen datos reales y sean responsivos.
- [ ] **Métricas Rápidas**: Ventas hoy, pedidos pendientes, etc.
- [ ] **Sidebar**: Colapso suave, estados activos, iconos amber/amber-theme.
- [ ] **Modo Oscuro/Claro**: Verificación de contraste en elementos glass.

## 3. 🛒 Punto de Venta (POS) (`/admin/pos`)
- [ ] **Buscador de Productos**: Velocidad y teclado numérico.
- [ ] **Carrito**: Sumas correctas, descuentos, impuestos (IVA).
- [ ] **Checkout**:
    - [ ] Pago en Efectivo.
    - [ ] Pago con Tarjeta (Mock/Integración).
    - [ ] Emisión de Boleta SII (Generación de PDF).
- [ ] **Impresión**: Formato térmico (80mm) del ticket generado.

## 4. 🧾 Facturación y SII (`/admin/facturacion`)
- [ ] **DocumentTabs**: Cambio entre Boleta, Factura, Nota de Crédito.
- [ ] **Historial de DTEs**: Lista con estados (Aceptado, Rechazado).
- [ ] **Generación Manual**: Formulario de receptor y detalle de items.
- [ ] **Folios (CAF)**: Visualización de folios disponibles por tipo.

## 5. 📦 Gestión de Pedidos (`/admin/pedidos`)
- [ ] **Lista de Pedidos**: Filtros por estado (Pendiente, Preparando, etc.).
- [ ] **Flujo de Picking**: Cambiar estados y verificar persistencia.
- [ ] **Detalle de Pedido**: Información de envío y productos.

## 6. 🏷️ Inventario y Productos (`/admin/inventario`)
- [ ] **Listado**: Imágenes cargando, stock destacado.
- [ ] **Crear/Editar**: Validaciones de campos obligatorios.
- [ ] **Categorías**: Arrastre/Orden y jerarquía.

## 7. 👥 Usuarios y Roles (`/admin/usuarios`)
- [ ] **Listado de Personal**: Filtrar por rol.
- [ ] **Edición de Permisos**: Cambiar roles y verificar impacto inmediato.

## 8. 🌐 E-commerce / Landing (`/`)
- [ ] **Home**: Hero section con animaciones.
- [ ] **Catálogo**: Filtros laterales y ordenamiento.
- [ ] **Carrito de Compra**: Sincronización local/Supabase.
- [ ] **Página de Venta (YAHPOS!.cl)**: Planes actualizados (Austral, Archipiélago, Patagonia).

## 9. ⚙️ Configuración (`/admin/configuracion`)
- [ ] **Perfil de Tienda**: Logo, RUT, Dirección.
- [ ] **SaaS Tier**: Visualización del plan actual.

---
**Criterio de Aceptación**: Ningún error en consola (F12), diseño 100% fiel al Glassmorphism, y lógica de SII operando sin fallos.

## 10. 💡 Ideas y Funcionalidades Futuras
- [ ] **Stock en Tiempo Real para Productos de Alta Rotación**: Mostrar en la web la disponibilidad exacta y en vivo (ej. "¡Saliendo del horno!", "Quedan 2 kilos") para productos que se agotan rápido. Ideal para pan fresco, cortes de carnicería (lomo, entraña), comida preparada (empanadas, pollos asados) o frutas/verduras frescas muy solicitadas.
