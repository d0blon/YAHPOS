# 📄 Documentación Técnica Final: Motor de Facturación YAHPOS!

Este documento detalla la implementación del motor de Facturación Electrónica (SII Chile) integrado en YAHPOS!. Está diseñado para que desarrolladores externos o futuros mantenedores comprendan el flujo crítico de emisión de documentos tributarios.

## 🏗️ Arquitectura del Sistema
El sistema no depende de proveedores externos (como Bsale o Haulmer) para la firma de documentos. Hemos implementado un motor nativo utilizando **WebCrypto API** (para el cliente) y **node:crypto** (para el servidor), garantizando máxima compatibilidad y rendimiento sin dependencias externas pesadas.

### Directorio Raíz: `src/lib/sii/`

| Archivo | Responsabilidad |
| :--- | :--- |
| `signer.ts` | Motor de firma XMLDSig. Aplica la firma digital al DTE usando el certificado `.pfx`. |
| `engine.ts` | Orquestador principal (**zona roja**). Maneja la lógica de negocio (Totales, IVA, Exento), reserva folios, y coordina TED + firma + envío. |
| `ted.ts` | Genera el nodo `<TED>` (Timbre Electrónico DTE) y lo firma con WebCrypto (`RSASSA-PKCS1-v1_5` / SHA-1). Soporta modo `isTest` que produce un `<FRMT>MOCK_TED_SIGNATURE</FRMT>` sin firmar de verdad — usado quirúrgicamente, ver advertencia abajo. |
| `envio.ts` | Arma el sobre `<EnvioBOLETA>` (`generateEnvioXml`) y hace el POST real al SII (`enviarAlSII`, endpoints `maullin.sii.cl` certificación / `palena.sii.cl` producción). |
| `caf.ts` | Lógica de lectura y validación de archivos CAF (Código de Autorización de Folios), incluye extracción de la llave privada JWK que usa `ted.ts` para firmar. |
| `auth.ts` | Flujo de autenticación Seed-Token con el SII. |
| `types.ts` | Tipos compartidos del ecosistema DTE: `SiiConfig`, `DteHeader`, `DteDetail`, `DtePayload`, `SiiAuthResponse`. |
| `pdf-generator.ts` | Generador de representaciones impresas (PDF) en formato térmico (80mm). |
| `templates/` | Plantillas XML base para Boletas (39), Facturas (33) y Guías (52). |

**Consumidores directos de `ted.ts`:** además de `engine.ts` (paso 2 de `emitirDocumento`), `PosTerminal()` (`src/app/(pos)/pos/page.tsx`) lo importa directo para generar el TED en el flujo POS. Dos entradas al mismo generador — si se toca `ted.ts`, probar ambos caminos.

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
4. **Generación y Firma del TED** (`ted.ts` → `SiiTedGenerator.generateTed()`):
   - Arma el nodo `<DD>` con emisor, folio, fecha, receptor, monto, primer ítem y fragmento CAF, en el orden exacto que exige el SII (RE, TD, F, FE, RR, RSR, MNT, IT1, CAF, TSTP).
   - Firma `<DD>` con la llave privada del CAF vía WebCrypto (`RSASSA-PKCS1-v1_5`, SHA-1), codificando en ISO-8859-1 antes de firmar.
5. **Firma del DTE completo (XMLDSig):** `signer.ts` aplica la firma sobre todo el documento `<DTE>`.
6. **Envío al SII** (`envio.ts`): `generateEnvioXml()` arma el sobre `<EnvioBOLETA>` y `enviarAlSII()` lo sube por `multipart/form-data` al endpoint de certificación (`maullin.sii.cl`) o producción (`palena.sii.cl`) según `config.environment`; parsea `<TRACKID>`/`<STATUS>` de la respuesta.
7. **Almacenamiento:** El XML firmado se guarda en la tabla `sii_documents` de Supabase.
8. **Generación de PDF:** El POS consume la API `/api/sii/documentos/[id]/pdf` la cual extrae el timbre del XML y genera el PDF térmico con el QR reglamentario.

### ⚠️ Modo `isTest` en el TED
`SiiTedGenerator.generateTed(dteData, cafXml, isTest)` acepta un tercer parámetro booleano. Si es `true`, **no firma nada de verdad** — devuelve un TED con `<FRMT algoritmo="SHA1withRSA">MOCK_TED_SIGNATURE</FRMT>` hardcodeado, y la firma del `<Documento>` completo también se reemplaza por `<Signature>MOCK_SIGNATURE</Signature>` (ver `engine.ts` línea ~246-248). `emitirDocumento()`/`emitirBoleta()` activan esto con `!!metadata.test`, con default `metadata = {}` (o sea `test` es `false` salvo que alguien lo pase explícito).

**Verificado:** `certification/route.ts` llama `engine.emitirBoleta(caseDef.payload, profile.store_id)` **sin tercer argumento** → `metadata.test` queda `false` → firma real, TED real. Las boletas de certificación ante el SII sí quedan firmadas de verdad. Ojo si en el futuro algún caller agrega `{ test: true }` por error — quedaría silenciosamente sin firma válida y sin ningún error visible.

### Certificación ante el SII (`certification/route.ts`)
`POST /api/sii/certification` **reutiliza el motor central**: hace `await import('@/lib/sii/engine')` (import dinámico — no aparece en herramientas de análisis estático de dependencias) y llama `engine.initForStore()` → `engine.emitirBoleta()` → `engine.enviarBoletaAlSII()`, guardando el `trackId` real del SII en `sii_certification_cases`. No es una implementación paralela; es el mismo camino de producción ejecutado con los 4 casos de prueba que exige la homologación (boleta afecta, exenta, multi-ítem, mixta).

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
*Documentación generada el 30 de Abril, 2026. Actualizada el 27 de Julio, 2026 (agregados `ted.ts`, `envio.ts`, `types.ts`; flujo de TED/envío detallado; nota sobre modo `isTest`; certificación aclarada).*
