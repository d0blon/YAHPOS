# 📄 Documentación Técnica Final: Motor de Facturación YAHPOS!

Este documento detalla la implementación del motor de Facturación Electrónica (SII Chile) integrado en YAHPOS!. Está diseñado para que desarrolladores externos o futuros mantenedores comprendan el flujo crítico de emisión de documentos tributarios.

## 🏗️ Arquitectura del Sistema
El sistema no depende de proveedores externos (como Bsale o Haulmer) para la firma de documentos. Hemos implementado un motor nativo utilizando **WebCrypto API** (para el cliente) y **node:crypto** (para el servidor), garantizando máxima compatibilidad y rendimiento sin dependencias externas pesadas.

### Directorio Raíz: `src/lib/sii/`

| Archivo | Responsabilidad |
| :--- | :--- |
| `signer.ts` | Motor de firma XMLDSig. Aplica la firma digital al DTE usando el certificado `.pfx`. |
| `engine.ts` | Orquestador principal. Maneja la lógica de negocio (Totales, IVA, Exento) y llama al signer. |
| `caf.ts` | Lógica de lectura y validación de archivos CAF (Código de Autorización de Folios). |
| `auth.ts` | Flujo de autenticación Seed-Token con el SII. |
| `pdf-generator.ts` | Generador de representaciones impresas (PDF) en formato térmico (80mm). |
| `templates/` | Plantillas XML base para Boletas (39), Facturas (33) y Guías (52). |

---

## 🔐 Seguridad y Criptografía
Para garantizar la integridad de los datos sensibles (Certificados y CAFs), implementamos una capa de cifrado AES-256-CBC en `src/lib/crypto.ts`.

- **Llave Maestra:** Requiere una `SII_ENCRYPTION_KEY` de exactamente 32 caracteres en producción.
- **Validación en Tiempo de Ejecución:** El sistema valida la llave al primer uso. Si no cumple los requisitos en producción, se lanza un error crítico. Esto permite que el proceso de *build* (construcción) de Next.js se complete sin necesidad de tener las llaves secretas configuradas en el entorno de compilación.

---

## 📑 Flujo de Emisión de una Boleta (DTE 39)

1. **Validación de RUT:** En el checkout, se aplica el algoritmo Módulo 11 para asegurar que el RUT del receptor sea legalmente válido (`src/lib/validations/orders.ts`).
2. **Reserva de Folio:** El sistema consulta el archivo CAF almacenado en `sii_config` para obtener el siguiente número disponible.
3. **Generación de XML:** Se llena la plantilla `templates/boleta.ts` con los datos de la orden.
4. **Firma Digital (XMLDSig):** 
   - Se genera el nodo `<TED>` (Timbre Electrónico DTE) que contiene los datos críticos firmados.
   - Se aplica la firma a todo el documento `<DTE>`.
5. **Almacenamiento:** El XML firmado se guarda en la tabla `sii_documents` de Supabase.
6. **Generación de PDF:** El POS consume la API `/api/sii/documentos/[id]/pdf` la cual extrae el timbre del XML y genera el PDF térmico con el QR reglamentario.

---

## 🏷️ El Timbre Electrónico (TED)
El TED es el elemento más crítico para la validez legal. Se genera a partir de:
- Datos del emisor y receptor.
- Folio y fecha.
- Monto total.
- Firma privada del emisor sobre estos campos.

El generador de PDF extrae el fragmento `<TED>...</TED>` del XML almacenado y lo convierte en un código QR legible por la aplicación e-Boleta del SII.

---

## 🚀 Próximos Pasos para Producción
1. **Set de Pruebas:** Ejecutar el envío de 10 boletas al ambiente de certificación del SII.
2. **Carga de Certificado Real:** El cliente debe subir su archivo `.pfx` y contraseña a través del panel de configuración.
3. **Solicitud de Folios:** Descargar el archivo CAF desde `sii.cl` y cargarlo en YAHPOS!.

---
*Documentación generada el 30 de Abril, 2026.*
