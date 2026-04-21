# 🏔️ PatagoniaPOS - Core Platform

![PatagoniaPOS Framework](https://img.shields.io/badge/Framework-Next.js%2016-blue?style=for-the-badge&logo=next.js)
![Database](https://img.shields.io/badge/Database-Supabase-green?style=for-the-badge&logo=supabase)
![Styling](https://img.shields.io/badge/Styling-TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![Architecture](https://img.shields.io/badge/Architecture-B2B%20SaaS-purple?style=for-the-badge)

**PatagoniaPOS** es una plataforma integral de Punto de Venta (POS) comercial y E-Commerce construida para empoderar a los negocios locales y supermercados en la isla de Chiloé y toda la región. 

Combina operaciones de caja físicas fuera de línea con un robusto motor de comercio electrónico B2B/B2C, todo centralizado bajo un moderno modelo **SaaS (Software as a Service)**.

---

## 🚀 Arquitectura y Tiers (SaaS)

El sistema soporta una arquitectura multi-tiers controlada por features dinámicos. Esto permite a los dueños de los negocios (clientes de PatagoniaPOS) activar funcionalidades según sus necesidades operacionales.

| Plan | Características Base |
|------|----------------------|
| **🔵 Básico** | POS para sucursal física, control de inventario offline-first, turnos de caja, CRM local. La interfaz pública funciona como "landing de producto PatagoniaPOS" promoviendo el upgrade a Plus. |
| **⚡ Plus** |  *(Todo Básico) +* Ecommerce dinámico B2B/B2C con branding propio (Marca Blanca: logo, nombre comercial), gestión y pasarela de pago para pedidos locales. |
| **👑 Élite** | *(Todo Plus) +* Múltiples sucursales sincronizadas, reportes avanzados, "Picking fees" logísticos y conexiones API/Webhooks. |

---

## 🔐 Seguridad y Accesos Perimetrales

PatagoniaPOS cuenta con una **muralla de aislamiento** construida directamente en los servidores Edge (Middleware de Next.js) que intercepta todas las peticiones al milisegundo:

*   **Páginas Públicas:** Catálogo, contacto e inicio (Vistos según el SaaS Tier).
*   **Aislamiento de Sesión:** Imposibilidad de acceder a carritos, compras, perfil o paneles forzando rutas HTTP sin JWT válido.
*   **Gestión de Roles:** Validaciones rigurosas (Cliente, Trabajador de Caja, Dueño/Administrador). El POS es inutilizable si el usuario no cuenta con acreditación de Cajero.
*   **Modo Operador Central:** El `/admin/developer` contiene el núcleo SaaS para gestionar el negocio. Totalmente bloqueado mediante **TOTP 2FA (Authenticator)** + Criptografía simétrica AES-256.

---

## 🛠️ Tecnologías Empleadas

El ecosistema entero está programado usando React Server Components, asegurando un TTFB (Time to First Byte) mínimo y permitiendo integraciones profundas en el backend sin exponer lógica de negocio al cliente.

*   **Core:** Next.js 16 (App Router)
*   **UI/UX:** TailwindCSS, ShadCN UI, Lucide Icons
*   **Base de Datos & Auth:** Supabase (PostgreSQL), Row Level Security (RLS)
*   **Estados Globales:** Zustand

---

## 📌 Hojas de Ruta Activas (Roadmap 2026)
*   🟢 **Arquitectura Base & SaaS:** Completado (Tiers, Middleware, y Dual-Branding).
*   🔴 **Facturación SII:** Integración oficial con Factura/Boleta Electrónica (DTE Chile).
*   🟠 **Logística & Webhooks:** Dispatchers para retiro en tienda vs despacho a domicilio.
*   🟣 **Aplicación PWA:** Conversión a aplicación móvil/tablet nativa para los locales comerciales.

*Hecho con ☕ y código en el sur del mundo.*
