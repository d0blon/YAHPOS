# Plan: Motor DTE — ejecución diciembre 2026

**Documento creado:** 2026-10-29  
**Última actualización:** 2026-11-13 (P0 + P1 + P2 completados)  
**Ventana de ejecución:** desde diciembre 2026 (al salir de clases). No ejecutar antes.  
**Dueño de la ejecución:** el dueño del proyecto (esta es su área: el motor DTE).  
**Estado del área:** motor escrito, gaps de robustez cerrados, pendiente validación real con SII.

> Este documento asume que quien lo ejecute no tiene contexto de la conversación donde se
> originó. Está escrito para arrancar en frío: cada fase dice qué archivos toca, qué comando
> corre, y cómo se verifica que terminó.

---

## 1. Objetivo

Que YAHPOS! emita DTEs **reales y aceptados por el SII** con el RUT de una tienda piloto,
sin depender de un proveedor externo de facturación.

**Definición de éxito:** un `trackId` con estado `EPR` (sin reparos) y el SETMAIL de
*Declarar Avance* en `SOK`, para boleta (39) y factura (33), en ambiente de certificación
(Maullín). Después: la primera boleta real en producción (Palena).

**Definición de fracaso:** seguir en diciembre con el motor "funcionando en teoría" y sin
un solo documento aceptado por el SII.

---

## 2. Estado actual verificado (2026-10-29)

### Lo que existe

```
src/lib/sii/engine.ts              orquestador (13.7 KB) — ZONA ROJA
src/lib/sii/signer.ts              XMLDSig con .pfx (node-forge)
src/lib/sii/ted.ts                 timbre electrónico (WebCrypto, SHA-1)
src/lib/sii/envio.ts               sobre EnvioBOLETA + upload multipart
src/lib/sii/caf.ts                 parser CAF + llave privada
src/lib/sii/auth.ts                flujo seed/token
src/lib/sii/pdf-generator.ts       PDF térmico 80mm + QR
src/lib/sii/templates/             boleta(39), factura(33), guia(52), NC(61), ND(56)
src/app/api/sii/                   9 rutas (config, caf, auth, certification, enviar, sync, pdf…)
src/lib/crypto.ts                  AES-256-CBC para .pfx y CAF en reposo
```

### Lo que NO existe / está roto

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | **Cero validación real.** Nunca se envió un DTE al SII. | `DOCS_TECNICOS_FINAL.md:69` lo lista como "próximo paso" |
| 2 | **Tests: 1 caso trivial.** Sin cobertura de firma, TED, XML, totales. | `src/__tests__/unit/sii_engine.test.ts` (33 líneas, 1 assert) |
| 3 | **Rechazo del SII falla en silencio.** Escribe `error_log`, columna inexistente en `sii_documents`; el `.update()` no chequea `error`. | `engine.ts:382-388` + `YAHPOS Kanban.md:28-40` |
| 4 | **`estado` vs `estado_sii` asimétricos.** Un rechazado queda como "firmado". | mismo bloque, camino de éxito `engine.ts:371-380` |
| 5 | **Modo MOCK silencioso.** Si el `.pfx` no carga, `SiiAuth` devuelve `MOCK_TOKEN_<ts>` sin lanzar error. | `auth.ts:18-26`, `auth.ts:62-66` |
| 6 | **Folios reales sin guard.** `runSiiCertificationAction(storeId, true)` emite DTE reales de cualquier tienda. | `src/app/developer/actions/sii.ts:11` + `Kanban:47` |
| 7 | **Resolución hardcodeada.** `FchResol → '2014-08-22'`, `NroResol → '0'`. | `envio.ts:17-18` |
| 8 | **Un solo canal de envío.** Upload legacy CGI para certificación *y* producción. | `envio.ts:38-41` |
| 9 | ✅ **RESUELTO 2026-11-05.** El firmante nunca se instanciaba porque `forge.pki.certificateToAsn1(...).toDer()` no existe. Ahora el DER se obtiene con `forge.asn1.toDer(...)`. | `signer.ts:54-56` |
| 10 | ✅ **RESUELTO 2026-11-05.** Migrado a la API de `xml-crypto@6`: `new SignedXml({ privateKey, publicCert, ... })`, `addReference({ xpath, transforms, digestAlgorithm })`, `computeSignature(xml, { location })`. Eliminado el monkeypatch de `crypto.createHash` (en v6 el digest ya se hace con SHA-1 sobre UTF-8). | `signer.ts:80-101` |
| 11 | ✅ **RESUELTO 2026-11-05.** `getPrivateKeyJwk` acepta `RSASK` en PEM real del SII, además del formato componentizado interno. | `caf.ts:58-146` |
| 12 | ✅ **RESUELTO 2026-11-05.** Emite `TSTED` en ambas ramas y pliega a ASCII solo dentro del `<DD>`. | `ted.ts:91` |
| 13 | ✅ **RESUELTO 2026-11-06.** `IndExe` ahora va inmediatamente después de `NroLinDet`, como el XSD y el oráculo. En las 5 plantillas. | `templates/*.ts:9-11` |
| 14 | ❌ **DESCARTADO 2026-11-06.** `TasaIVA` es opcional en `Totales` y el oráculo tampoco lo emite para DTE 39. No es un defecto. | — |
| 15 | ✅ **RESUELTO 2026-11-06.** `PrcItem` conserva sus decimales; `MontoItem` se mantiene entero (redondeado). | `templates/*.ts:12` |
| 16 | ✅ **RESUELTO 2026-11-06.** `xmlText()` escapa `& < > " '` en todos los nodos de texto (emisor, receptor, ítems, referencias y `<DD>`), en vez de borrarlos. | `xml-text.ts` |
| 17 | ✅ **RESUELTO 2026-11-13.** P2 completo (13 gaps de robustez del motor). Ver §7.1 para detalle. | Múltiples archivos |

### El dato que cambia el plan — **VERIFICADO el 2026-11-01**

El equipo de `ruraldte-engine` afirmaba:

> *"El SII autoriza al contribuyente, no al software. Dejó de certificar programas hace años:
> hoy declaras con qué software vas a emitir y el proceso de certificación lo recorre tu RUT."*

**Es correcto, con un matiz importante.** Textual del SII
(`sii.cl/destacados/factura_electronica/factura_etapas_5.html`, consultado 2026-11-01):

> *"Este paso solo corresponde a las empresas que utilicen el Sistema Propio o de Mercado,
> quienes deben certificar los Documentos Tributarios Electrónicos (DTE) que la aplicación va a
> emitir, **y no el sistema informático como tal**."*

Traducción:

- ✅ **No existe** trámite de inscripción/ certificación de YAHPOS como empresa de software.
- ✅ **Sí existe** un trámite, pero es **del contribuyente**: cada RUT emisor postula y recorre
  el proceso. YAHPOS es el software declarado, no el certificado.
- ⚠️ Lo que se certifica son **los DTE que el software emite**, no el software. Misma diferencia
  práctica, distinta responsabilidad: si el documento sale mal, el rechazo cae sobre el RUT
  emisor y contra tu software.
- ❌ `YAHPOS Kanban.md:254` está mal planteado: no hay "inscripción como desarrollador".
- ➕ Sí existe la **nómina informativa de proveedores** (`emp_prov_fe.htm`), voluntaria, con la
  aclaración textual de que *"el SII no certifica el software de estas empresas"*. Ver §13.3/D7.

---

## 3. Decisión de arquitectura (ya tomada, no re-litigar en diciembre)

**Opción elegida: B — cambiar las tripas, no la frontera.**

Mantener la clase `SiiEngine` y su API pública. Reimplementar solo el interior
(XML, firma, TED, sobre, envío, folios) sobre `@devlas/dte-sii` (MIT, Node/CJS), vendorizado.

### Por qué

- El protocolo del SII tiene trampas documentadas que ya están resueltas en ese paquete
  (ver §7). Re-descubrirlas cuesta semanas y folios.
- Trae lo que falta por completo: `CertRunner` (set de pruebas), `CafSolicitor` (reposición
  de CAF), `FolioRegistry` (reserva atómica), libros, RCOF, `SiiPortalAuth` (resolución real),
  caché de sesión **por huella de certificado** (crítico en multi-tenant).
- MIT → se puede copiar sin liberar el repo. Vendorizado → no dependes de que el paquete viva.
- La frontera no cambia → cero riesgo para los 7 callers y para el schema de Supabase.

### Alternativas descartadas

| Opción | Por qué no |
|---|---|
| A. Arreglar el motor actual a ciegas | 1–2 semanas, bugs invisibles, mantienes el protocolo para siempre |
| C. API hosted (OpenFactura / BaseAPI / IntegraDTE) | Mata el diferenciador técnico, costo por documento |
| Reescribir desde cero | Ya está 90% escrito; el costo está en validar, no en escribir |

---

## 4. Contrato que NO se puede romper

Firma pública actual de `SiiEngine` (`engine.ts:19,38,176,180,321,328`):

```ts
new SiiEngine(config?: SiiConfig)
await initForStore(storeId: string)
await emitirBoleta(payload: DtePayload, storeId: string, metadata?: any)
await emitirDocumento(payload: DtePayload, storeId: string, metadata?: any)
await enviarBoletaAlSII(documentId: string, storeId: string)
await enviarDocumentoAlSII(documentId: string, storeId: string)
```

**Callers que dependen de esto — no tocar ni renombrar:**

```
src/app/admin/facturacion/actions.ts:4,39,129
src/app/api/sii/route.ts:2,27
src/app/api/sii/sync/route.ts:2,20
src/app/api/sii/enviar/route.ts:2,24
src/app/api/sii/auth/token/route.ts:3
src/app/api/sii/certification/route.ts:113-114   (import dinámico)
src/app/developer/actions/sii.ts:11-12           (import dinámico)
src/__tests__/unit/sii_engine.test.ts:1
```

**Otras exportaciones con contrato propio** (no reemplazar sin revisar sus callers):

```
src/lib/sii/caf.ts            → SiiCafParser
src/lib/sii/signer.ts         → SiiSigner
src/lib/sii/templates/boleta  → generateBoletaXml
src/lib/sii/pdf-generator.ts  → generateBoletaPdf
```

**Tablas que no se tocan:** `sii_config`, `sii_documents`, `sii_certification_cases`.
Si el adapter necesita un campo nuevo (ej. `caf_fingerprint`, `ambiente`), va en migración
aparte, con su RLS definida en el mismo handoff (regla de oro, `AGENTS.md §0`).

**Runtime:** todas las rutas de `/api/sii` son Node (no hay `export const runtime = 'edge'`
en ninguna). El paquete es CommonJS → requiere interop `createRequire` si se importa desde ESM.

---

## 5. Fases (≈10–12 días hábiles)

> **Orden de operaciones acordado (2026-11-02):** primero el código, después los trámites.
> Nada de lo que falta de motor depende del SII: todo se prueba offline con el harness de
> `..\dte-parity\`. El trámite se hace cuando el motor ya firme bien, y **un CAF real solo se
> consigue después de inscribirse como facturador**, así que el CAF sintético del harness es la
> única validación disponible hasta entonces.
>
> **Única cosa con plazo externo que conviene no dejar para el final:** comprar el certificado
> digital (se compra en el mercado, tarda días) y confirmar que el RUT no tenga situaciones
> pendientes con el SII. Son trámites de terceros, no de código, y son los que pueden dejar la
> Fase 4 esperando aunque el motor esté listo.


### Fase 0 — Verificar el trámite real — ✅ **CERRADA el 2026-11-01**

Sin código. Resultado confirmado contra el portal del SII.

**El proceso oficial son 3 etapas y 9 pasos** (`sii.cl/destacados/factura_electronica/index.html`):

| Etapa | Paso del SII | Qué significa para nosotros |
|---|---|---|
| 1. Preparación | Verificar obligatoriedad | Para Austral Market: obligado (primera categoría, boletas). |
| 1. Preparación | Seleccionar sistema de facturación | **Sistema Propio o de Mercado** ← YAHPOS. |
| 1. Preparación | Adquirir certificado digital | Del **emisor**, no de YAHPOS. Uso personal e intransferible. |
| **2. Inscripción** | **Inscripción y creación de usuarios** | Postula el contribuyente o su representante legal, **con certificado digital**. |
| **2. Inscripción** | **Certificación para sistema propio o de mercado** | Se certifican **los DTE que la app va a emitir**, no la app. |
| **2. Inscripción** | **Declaración de cumplimiento** | Paso final, se hace en `sii.cl`. |
| 3. Operación | Emitir, libros, obligaciones | Producción. |

**Datos operativos confirmados:**

- **Postulación:** `maullin.sii.cl/cvc_cgi/dte/pe_ingrut`. La hace el representante legal
  autenticado con certificado digital. Si es aceptada, el contribuyente queda **inscrito
  automáticamente en el Ambiente de Certificación** (Maullín).
- **Perfiles de usuario** que el emisor debe crear para "Sistema Propio o de Mercado":
  `Administrador`, **`Solicitar Folios`**, `Anular Folios`, `Firmar Documentos`,
  `Enviar Documentos`, `Consulta y Registro`
  (`factura_etapas_4.html`).
  → **Consecuencia directa para D1 (CAF automático, §13.3):** la solicitud automática de folios
  exige que el emisor haya creado el usuario con perfil **`Solicitar Folios`**. Sin ese perfil
  asignado, `CafSolicitor` falla por permisos, no por código. Va como requisito de onboarding.
- **Requisitos tributarios:** inicio de actividades vigente, Primera Categoría (Art. 20 LIR), y
  **ni el representante legal ni los usuarios autorizados pueden tener situaciones pendientes
  con el SII** (verificar en "Mi SII" → "Mi situación tributaria").

**Pendiente todavía (para Fase 4, no bloquea):**

- [ ] Descargar el instructivo vigente del set de pruebas y la lista de documentos a certificar
      por tipo (boleta 39, factura 33, NC 61, guía 52).
- [ ] Confirmar cuántos folios de certificación entrega el SII por solicitud.

**Consecuencia documental:** `YAHPOS Kanban.md:254` queda mal planteado ("certificación/verificación
de YAHPOS como desarrollador ante el SII"). Lo correcto: *"el RUT de Austral Market debe postular
como facturador electrónico con sistema propio y declarar cumplimiento"*. Como el Kanban es zona
protegida (`AGENTS.md` regla 6), no se edita desde acá: queda anotado para que lo corrija el dueño.

**Gate:** ✅ cerrado. El trámite es del contribuyente; se certifican los DTE, no YAHPOS.
No hay trámite de proveedor que esperar. **Próximo paso dentro de esta fase:** el dueño debe
verificar en "Mi SII → Mi situación tributaria" que su RUT (o el del piloto) no tenga situaciones
pendientes; eso habilita la postulación de Fase 4 y no depende de código.

---

### Fase 1 — Harness de paridad — ✅ **EJECUTADO el 2026-11-02** (offline, sin folios)

Resultado real, no estimación. Harness en
`..\dte-parity\` (fuera del repo: `tsconfig.json` incluye `**/*.ts`, meter `.ts` ahí rompe el build).
Reproducir:

```powershell
$env:TZ='America/Santiago'
cd "..\dte-parity"; npm install; npx tsx fixtures/make-fixtures.ts; npx tsx scripts/run-parity.ts
```

| Check | Resultado |
|---|---|
| Orden del `<DD>` | ❌ FAIL en los 5 payloads (`TSTP` ≠ `TSTED`) |
| Contenido del `<DD>` | ✅ 4/5 (falla P5 por `&` sin escapar) |
| `MntNeto` / `IVA` | ⚠️ WARN en P1 (redondeo por línea) |
| `MntTotal` / `MntExe` | ✅ |
| `DigestValue` | ❌ FAIL — **no hay digest: no hay firma** |
| Firma XMLDSig | ❌ FAIL — `SiiSigner` no se instancia (§2 #9) |
| Firma TED | ✅ (con el formato JWK sintético) |
| Bytes ≥128 en `<DD>` | ❌ P2, P4, P5 (acentos sin plegar) |
| TED con CAF real del SII | ❌ FAIL (§2 #11) |

**Conclusión:** el motor **no puede firmar ni un documento**. No es "falta validar": es que el
camino de firma está roto en 3 puntos independientes (`signer.ts:49`, `signer.ts:66-83`,
`caf.ts:63`). Eso **refuerza** la decisión de §3 — no hay nada que rescatar del firmante actual.

**Lo que el harness NO prueba:** XSD oficial (no incluido), CAF firmado por el SII, PDF417 real,
sobre/carátula, trackId. Todo eso es Fase 4.

### Fase 1 (histórico) — lo que se planeó

Sin contexto de la ejecución, el plan original era:

Objetivo: saber si el motor actual firma bien, **sin gastar un folio y sin tocar el SII**.

Directorio de trabajo: `scratch/dte-parity/` (fuera de `src/`, no entra al build).

- [ ] Instalar el oráculo en un proyecto aislado: `npm i @devlas/dte-sii` (solo ahí).
- [ ] Fixtures: un CAF de prueba, un `.pfx` de prueba, y un payload fijo (boleta 39, 3 ítems,
      uno exento, uno afecto).
- [ ] Generar el mismo DTE con **tu** `generateBoletaXml` + `SiiTedGenerator` y con el oráculo.
- [ ] Comparar:
  - `<DD>` campo por campo (RE, TD, F, FE, RR, RSR, MNT, IT1, CAF, TSTP) — mismo orden.
  - `MntNeto`, `IVA`, `MntExe`, `MntTotal` — iguales al peso.
  - `DigestValue` del `<Documento>` — **debe coincidir**.
  - `SignatureValue` / `FRMT` — **no** comparar bytes (dependen de la clave); en cambio
    **verificar la firma RSA** contra el certificado público. Firma que valida = correcto.
- [ ] Repetir para 33, 52, 61.
- [ ] Caso borde obligatorio: razón social con `ñ`, `á`, guion largo `—`, y un ítem con `Cajón`.
      (El lector PDF417 del SII pierde bytes ≥128 → el timbre deja de validar.)

**Gate:** los 4 tipos generan XML con digest coincidente y firma que verifica. Si no,
**no se toca el motor todavía**: primero se documenta la diferencia exacta.

**Por qué importa:** convierte "creo que funciona" en un test binario, reproducible, offline.

---

### Fase 2 — Adapter vendorizado (2–3 días)

- [ ] Copiar `@devlas/dte-sii` a `src/lib/sii/vendor/dte-sii/` **con su LICENSE**.
      Vendorizado, no como dependencia npm viva (protege contra abandono del upstream).
- [ ] Crear `src/lib/sii/engine-adapter.ts` que implemente las 6 firmas de §4 sobre el vendor.
- [ ] `engine.ts` pasa a delegar; **no** se borra hasta que Fase 3 pase completa.
- [ ] Mapear config: `SiiConfig` (RUT, `.pfx` descifrado desde `crypto.ts`, CAF, ambiente,
      `fchResol`/`nroResol`) → tipos del vendor.
- [ ] Resolución **desde el portal**, no hardcodeada (§7.3).
- [ ] Canal de envío por ambiente: SOAP en certificación, REST en producción (§7.1).
- [ ] Folios: reserva atómica en Supabase (RPC `v_folio_actual` ya existe) + `CafSolicitor`.
- [ ] Sesión del portal cacheada **por huella de certificado** (no una global).

**Gate:** `npm run build` + `npm run lint` limpios, el test existente pasa, y el harness de
Fase 1 corre contra el adapter y da los mismos resultados que el oráculo.

---

### Fase 3 — Cerrar los bugs de tu capa (medio día)

Estos no los arregla el vendor: son de YAHPOS.

- [ ] **Mock silencioso** (`auth.ts:18-26`): eliminar el fallback. Si el `.pfx` no carga →
      error tipado (`CERTIFICADO_INVALIDO`), nunca un token falso.
- [x] **Rechazo silencioso** (`engine.ts:382-388`): usar solo columnas que existen
      (`sii_response`, `estado_sii`). → tramo 20: el rechazo del envío ya no toca `error_log`
      (columna inexistente) y además marca `estado` para que el historial lo muestre.
- [ ] **Errores de escritura no chequeados**: los `.update()` del motor se esperan pero nunca se
      inspecciona su `error` (Supabase devuelve `{ error }`, no lanza). Un update fallido se ve
      igual que uno exitoso. Pendiente.
- [x] **`estado` vs `estado_sii`**: decidir cuál es la fuente de verdad, actualizar ambos en
      éxito y rechazo, y auditar qué lee cada panel (`SystemLogs`, historial, admin).
      → tramo 20: la UI (`InvoiceHistoryTable`) lee `estado`; el motor escribe **ambos** en
      envío, rechazo de envío y veredicto de aceptación. `estado_sii` conserva la nomenclatura
      del SII (`RECHAZADO_SII`).
- [ ] **Guard de folios reales** (`developer/actions/sii.ts`): `realMode: true` exige rol
      `developer` **y** confirmación explícita. Nunca por parámetro de URL/action.
- [ ] **`TZ=America/Santiago`** en el runtime (Vercel env var). Con UTC, las fechas se corren
      un día entre 20:00 y medianoche → el SII responde *"FECHA NO CORRESPONDE AL ENVIO"*.
- [x] Sacar el default `fchResol: '2014-08-22'` y `nroResol: '0'` (`envio.ts:17-18`).
      Si falta el dato, fallar explícito. → tramo 19: `fechaResolucion()` / `numeroResolucion()`.

**Gate:** un DTE con `.pfx` inválido falla con error visible, y un rechazo simulado deja
`estado_sii = 'RECHAZADO_SII'` en la base (verificado con query real, no con mocks).

---

### Fase 4 — Certificación con RUT piloto (3–5 días, depende del SII)

- [ ] Elegir la tienda piloto (RUT real, con certificado digital vigente y habilitado para
      autenticación con certificado en el portal del SII).
- [ ] Postular/correr el set de pruebas según lo que diga Fase 0.
- [ ] Enviar el set completo en Maullín. Pollear el estado: **`trackId` no es aceptación.**
- [ ] Verificar el veredicto real: **SETMAIL de *Declarar Avance*** (`SOK`/`SRH`).
      Un `EPR` con 0 reparos **no** es el veredicto.
- [ ] Validar el XML contra los XSD v2.5 del SII **antes** de cada envío: cada intento quema
      un folio de certificación y el SII los entrega de a pocos.
- [ ] Muestras impresas: verificar que el PDF417 decode de vuelta al TED exacto.
- [ ] Declarar cumplimiento.
- [ ] Primera boleta en producción (Palena) con monto mínimo, y verificar que aparece en RCV.

**Gate:** documento aceptado con trackId en producción + visible en RCV. Nada menos cuenta.

---

### Fase 5 — Operación (después)

- [ ] Reintentos y cola: migrar el sync a Inngest (ya está en el backlog, `Kanban:127`).
- [ ] Alertas: CAF bajo (<10 folios), certificado por vencer, rechazos en últimas 24h.
- [ ] Monitoreo de `SII_LIMITE_SESIONES` y `EPROTO` (§7.7).
- [ ] Runbook: qué hacer si el SII rechaza un DTE ya emitido → nota de crédito.

---

## 6. Reglas de trabajo durante la ejecución

1. **`engine.ts` es zona roja** (`AGENTS.md:398`). Sin harness de paridad funcionando, no se
   toca. Handoff sin plan de pruebas → no se empieza.
2. **Un archivo, una subtarea.** Nada de refactors paralelos.
3. **Nunca** emitir con folios reales para "probar". Los folios son recurso pre-autorizado e
   irrecuperable.
4. **Cada fase cierra con evidencia**, no con "debería funcionar": build, lint, y el test que
   corresponda. Si toca RLS/escritura, query real + caso negativo.
5. Si un mismo error falla 3 veces → parar y documentar, no insistir.

---

## 7. Trampas conocidas del protocolo (checklist de revisión)

Estas están documentadas por equipos que ya certificaron. Sirven como checklist al revisar
cualquier XML generado.

1. **Certificación ≠ producción en el canal de envío.**
   Boletas: certificación exige **SOAP**; la API REST no funciona ahí. Producción: **REST**.
   Facturas/notas: upload legacy. `envio.ts:38-41` hoy usa el mismo canal para ambos.
2. **`NroResol` / `FchResol` por ambiente.** Certificación: `NroResol: 0` + fecha que entrega
   el SII. Producción: número y fecha reales de la resolución. Mezclarlos = rechazo inmediato.
3. **La resolución se saca del portal**, no se hardcodea (`SiiPortalAuth`).
4. **El `xmlns` del `<DTE>` es parte de lo firmado.** Quitarlo "porque es redundante con el
   sobre" cambia el `DigestValue` → rechazo por firma inválida.
5. **C14N inclusiva sobre el árbol XML, no con regex.** Es la diferencia entre firmar lo que
   crees y firmar lo que serializas. *(Revisar `signer.ts` en Fase 1.)*
6. **Acentos en el TED.** El lector PDF417 pierde bytes ≥128: `Cajón` → `Cajnn` → timbre
   inválido. Normalizar a ASCII **solo dentro del `<DD>`**; el cuerpo del DTE conserva tildes.
7. **`EPROTO` intermitente** al abrir TLS con certificado (`rsa_pss … last octet invalid`).
   Reintentar con el mismo certificado funciona. **No significa certificado vencido.**
   El límite de sesiones (`SII_LIMITE_SESIONES`) **no** se reintenta: empeora el bloqueo.
8. **`trackId` no es aceptación.** Hay que pollear el estado del sobre y del DTE.
9. **`TZ` obligatoria** (`America/Santiago`), ver §Fase 3.
10. **ISO-8859-1 en todo lo que va al SII**, incluido el XML del sobre y el TED.

### 7.1 P2 completado (2026-11-13)

**13 gaps de robustez del motor cerrados.** Migración 032 aplicada a la base.

#### Grupo A — Fechas UTC → Chile (7 sitios)
- `fecha-chile.ts` creado con `timestampChile()`, `fechaChile()`, `formatFechaDDMMYYYY()`
- 5 templates (`boleta.ts`, `factura.ts`, `guia_despacho.ts`, `nota_credito.ts`, `nota_debito.ts`): `<TmstFirma>` ahora usa `timestampChile()` (hora Chile sin zona)
- `ted.ts:49,68`: `TSTED` usa `timestampChile()`
- `engine.ts:255`: fallback `FchEmis` usa `fechaChile()`

#### Grupo B — Envío SII (3 bugs)
- `envio.ts:120-192`: multipart ahora usa `rutSender`/`dvSender`/`rutCompany`/`dvCompany` (extraídos con `dividirRut`)
- `aceptacion.ts:108`: `FechaEmisionDte` convierte `AAAA-MM-DD` → `DDMMYYYY` con `formatFechaDDMMYYYY()`
- `envio.ts`: retry logic (5 intentos, backoff 1.5×, max 10s, solo red/5xx)

#### Grupo C — Certificado (1 bug)
- `signer.ts`: valida `notBefore`/`notAfter` del certificado. Lanza error si vencido o no válido aún

#### Grupo D — Motor robustez (3 bugs)
- `engine.ts:224`: `MntTotal ?? 0`, rechaza negativos, asigna siempre antes de INSERT
- `engine.ts:291`: valida `acteco` obligatorio para tipo ≠ 39/41 antes de generar XML
- `engine.ts:452,465,552`: los 3 `.update()` ahora capturan y lanzan errores

#### Migración 032 — DB fixes (3 gaps)
- **Gap 11:** trigger `trg_sii_documents_folio_duplicate` con mensaje descriptivo (excluye tests)
- **Gap 12:** grants `get_next_folio` restringidos a `service_role` (no `authenticated`/`anon`)
- **Gap 13:** `get_store_by_domain` matching exacto (`.yahpos.cl`, `.localhost:3000`), no LIKE laxo

#### Evidencia
- `tsc --noEmit`: 0 errores
- `eslint`: 0 errores nuevos
- `motor-cableado.ts`: 21/21 PASS

---

## 8. Recursos y licencias

| Recurso | Licencia | Uso permitido |
|---|---|---|
| `github.com/devlas-cl/dte-sii` (npm `@devlas/dte-sii`) | **MIT** | Copiar/vendorizar. Es el elegido. |
| `github.com/happier-milo/ruraldte-engine` | **Apache-2.0** | Copiar respetando `NOTICE` + marcas. Oráculo de tests. 329 tests offline. |
| `libredte/libredte-lib-core` | **AGPL-3.0** | ❌ Obliga a publicar el código de YAHPOS. No usar. |
| `SebastianMoyano/dte-chile` | **AGPL-3.0** | ❌ Mismo problema. |
| `AppDTE` (Java) | sin confirmar | Solo referencia. |

Documentación de apoyo:
- `ruraldte-engine/docs/DTE_CERT_APRENDIZAJES.md` — bitácora real de certificar 12 tipos.
- `ruraldte-engine/docs/COMO_CONTROLA_EL_SII.md` — qué valida el SII en cada request.
- `docs/arquitectura/sii/DOCS_TECNICOS_FINAL.md` — doc interno actual (desactualizado en el punto del trámite).

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| El upstream (devlas) se abandona | Vendorizado en el repo, con LICENSE. El harness permite migrar. |
| Cambios de esquema/servicios del SII | Es la razón de vendorizar y de tener tests: actualizas un directorio, no 8 archivos. |
| El SII entrega pocos folios de certificación | Validar contra XSD **antes** de cada envío. |
| Multi-tenant: certificados de N tiendas | Caché de sesión por huella de certificado, no global. Límite de sesiones por RUT. |
| Fuga de `.pfx` / CAF | Ya cifrados AES-256-CBC (`src/lib/crypto.ts`). Auditar logs y `SII_HTTP_DEBUG_DIR` si se usa. |
| Presión por lanzar antes de certificar | No decir "facturación certificada" hasta tener trackId aceptado + RCV. |

---

## 10. Orden mínimo si solo hay 1 día

Si diciembre arranca con poco tiempo, este es el orden que no se puede saltar:

1. Fase 0 (30 min) — saber qué trámite existe.
2. Fase 1 (medio día) — harness, un solo tipo (39). Con eso ya sabes si el motor firma bien.
3. Bug del mock silencioso (`auth.ts`) — 30 min, evita documentos falsos "exitosos".

Todo lo demás puede esperar una semana. Esto no.

---

## 11. Multi-tenancy — bloqueante antes del primer cliente

Modelo correcto: **cada tienda es un emisor tributario independiente**. YAHPOS es el software,
nunca el emisor.

```
Tienda A → RUT A, .pfx A, CAF A, resolución A, folios A, sesión A, ambiente A
Tienda B → RUT B, .pfx B, CAF B, resolución B, folios B, sesión B, ambiente B
```

Austral Market = *tenant #0*. Se certifica con el mismo camino de código que un cliente.
Eso es bueno: obliga a que el aislamiento funcione desde el día uno.

### Tareas

| # | Tarea | Evidencia | Prioridad |
|---|---|---|---|
| M1 | `get_next_folio` es `SECURITY DEFINER` sin validar dueño de `p_store_id`. Cualquier autenticado consume folios ajenos (recurso irrecuperable). Agregar chequeo de `store_id` del JWT + `SET search_path`. | `supabase/migrations/007_sii_folio_rpc.sql:46` | 🔴 |
| M2 | `storeId` nunca puede venir del cliente sin validar contra la sesión. Caso vivo: `runSiiCertificationAction(storeId, true)` emite DTE reales de cualquier tienda. | `src/app/developer/actions/sii.ts:11-12` | 🔴 |
| M3 | Engine usa `SUPABASE_SERVICE_ROLE_KEY` (bypass total de RLS) y recibe `storeId` por parámetro. Todo caller debe derivar el store de la sesión, nunca del request. | `src/lib/sii/engine.ts:29-32` | 🔴 |
| M4 | Cifrado de `.pfx`/CAF con **una** `SII_ENCRYPTION_KEY` global. Migrar a sobre: DEK por tienda envuelta por llave maestra. Antes de 10 clientes. | `src/lib/crypto.ts` | 🟡 |
| M5 | Caché de sesión SII **por huella de certificado**, no global. El SII limita sesiones por RUT y bloquea si se excede. | `auth.ts` (hoy: caché por instancia) | 🟡 |
| M6 | Ambiente por tienda (`sii_config.environment`) debe gobernar el canal de envío y bloquear mezclas. Prohibido leer el ambiente de una variable global. | `006_consolidate_schema.sql:80`, `envio.ts:38-41` | 🟡 |
| M7 | Onboarding inexistente: `settings.sii.enabled` es `false` y nada lo pone en `true`. Falta wizard: `.pfx` → validar → CAF → resolución del portal → 1 doc de prueba → habilitar. **Incluye verificar que el emisor tenga creado el perfil de usuario `Solicitar Folios` en el SII** (lo exige el portal, `factura_etapas_4.html`); sin ese perfil el CAF automático falla por permisos y el wizard debe detectarlo antes, no después. | `BITACORA.md:24-31` | 🟡 |
| M8 | Definir si una sucursal del mismo RUT es otra tienda o un campo `CdgSIISucur`. Hoy no está resuelto y afecta el modelo de datos. | — | 🟡 |

### Gate de la fase

Prueba negativa real, no mock: con sesión de tienda A,
`POST /api/sii/enviar` apuntando a un documento de tienda B → **403**, sin fuga de datos,
y el intento queda registrado. Repetir para RPC de folios y para el PDF.

---

## 12. Otros riesgos detectados

### Tributario / funcional (aparecen con el primer cliente real)

| # | Problema | Por qué duele |
|---|---|---|
| T1 | **Notas de crédito sin probar.** Plantilla 61 existe, pero sin test de referencias (`TpoDocRef`, `FolioRef`, `FchRef`, `CodRef`). | Todo negocio necesita anular una venta. Si falla, el cliente no puede corregir nada. |
| T2 | **Sin RCV ni libro de compras.** La IA lee facturas de proveedor, pero no hay conciliación ni libro. | El contador del cliente lo pide el mes 1. |
| T3 | **Retención de documentos.** El SII exige conservar los DTE. Hay `storage_path`, no hay política de retención ni restore probado. | Multa + imposibilidad de responder una fiscalización. |
| T4 | **Totales incompletos.** Verificar exento, ILA, retención, descuentos globales y redondeo. Un peso de diferencia = rechazo. | El rechazo llega después de haber consumido el folio. |
| T5 | **Cesión electrónica (factoring).** No implementada. | Clientes B2B la piden; no bloquea el lanzamiento. |
| T6 | **Guías de despacho 52**: requisitos de traslado cambiaron en 2026 (hubo prórroga). Verificar vigencia antes de prometer envíos. | Documento legal en la calle si está mal. |

### Seguridad

| # | Problema | Evidencia |
|---|---|---|
| S1 | **Service role en el motor** (ver M3): no es "un bug del DTE", es bypass de RLS en la capa que maneja documentos legales. | `engine.ts:29-32` |
| S2 | **`user_metadata.role` como autorización.** El PDF valida `user.user_metadata.role !== 'developer'`. `user_metadata` es **editable por el propio usuario** en Supabase → posible escalada. Usar `app_metadata` o tabla `profiles`. Verificar. | `src/app/api/sii/documentos/[id]/pdf/route.ts:36` |
| S3 | **Password del `.pfx`**: confirmar que está cifrada y no en claro en `sii_config`. Si está en claro, un dump de DB entrega certificados utilizables. | `sii_config` |
| S4 | **Logs**: XML tributario y respuestas del SII terminan en `console.error`. Si se activa `SII_HTTP_DEBUG_DIR`, es material sensible. | `engine.ts:88,289,307,394` |

### Operación / producto

| # | Problema | Por qué duele |
|---|---|---|
| O1 | **Emisión dentro del request HTTP.** El SII tarda decenas de segundos; en serverless eso es timeout → documento firmado, folio quemado, nunca enviado. Necesita cola (Inngest) + estado `PENDIENTE_ENVIO`. | Folios perdidos y clientes sin boleta. |
| O2 | **Cero observabilidad.** Solo `console.error`, sin tracking ni alertas. Ya te pasó: un rechazo se perdió en silencio. | Te enteras por el cliente. |
| O3 | **Onboarding = días del cliente** (certificado, CAF, autorización). Fricción de venta alta. | Necesitas "modo sin DTE" por defecto y upgrade después. |
| O4 | **Soporte de facto 24/7.** El SII rechaza un sábado a las 23:00. | Sin runbook ni SLA, cada incidente es una llamada. |
| O5 | **Migración desde Bsale/Nubox.** Si no importas folios y documentos, el cliente no cambia de sistema. | Bloquea la venta, no el producto. |
| O6 | **Hardware solo Chromium** (WebUSB). iPad/Safari no funciona. | Si el cliente usa tablet, el POS no opera. |

### Legal / regulatorio

| # | Problema | Nota |
|---|---|---|
| L1 | **Ley 21.719 (protección de datos personales)** — vigencia anunciada para dic 2026, justo en esta ventana. Manejas RUT, direcciones e historial de compra de clientes de tus clientes. **Verificar fecha exacta.** | Requiere base de licitud, política de privacidad, procedimiento ARCO y contratos de encargo. |
| L2 | **Rol legal**: tú eres encargado del tratamiento, la tienda es responsable. Sin contrato escrito, la responsabilidad se te pega igual. | Definir en los términos del SaaS. |
| L3 | **Responsabilidad tributaria**: el emisor es el cliente, pero si tu software emite mal, te va a demandar a ti. | Términos + límite de responsabilidad. |

### Estratégico

| # | Problema | Nota |
|---|---|---|
| E1 | **El DTE es commodity.** Bsale/Siigo/Haulmer lo incluyen casi gratis (ver investigación competitiva). No es el moat. | El moat es POS + hardware + `catalogo_global`. El DTE es requisito de entrada, no diferenciador. |

---

## 13. Devlas POS — qué copiar, qué no, y qué mejorar de lo nuestro

**Análisis:** 2026-10-29 sobre `devlas.cl/pos`.
**Dato incómodo:** DevlasPOS está en la nómina informativa de proveedores del SII
(`sii.cl/destacados/factura_electronica/emp_prov_fe.htm`). El mismo equipo que mantiene
`@devlas/dte-sii` — el paquete que decidimos vendorizar — opera un POS competidor en producción.
**Consecuencia:** vendorizar deja de ser solo gestión de riesgo de abandono; es también no
depender operativamente de un competidor. La decisión de §3 se mantiene, con una razón más.

> Nota del SII en esa nómina, textual: *"el SII no certifica el software de estas empresas; solo
> publica esta nómina como mera información"*. Respalda la hipótesis de §2 y la Fase 0.

### 13.1 Lo que ellos tienen y nosotros no

| # | Devlas POS | YAHPOS hoy | Se adoptó como |
|---|---|---|---|
| 1 | Onboarding DTE automático: sube `.pfx` → inscripción en el SII → **solicitud automática de CAF**. "Primera boleta en <30 min". | Carga manual de CAF. Sin wizard. `settings.sii.enabled` nunca pasa a `true`. | **D1** |
| 2 | Offline real de punta a punta (ventas, cajas, turnos, cierres) con sincronización al reconectar. | Existe `offlineFolioPool` + `OfflineSyncManager`, pero está **roto e inseguro** (ver 13.2). | **R1–R4** |
| 3 | Apps nativas: Windows `.exe`, macOS `.dmg`, Android Play Store, iOS TestFlight. | Web/PWA. | ❌ no se copia (13.4) |
| 4 | Multi-sucursal: hasta 20 sucursales, 40 cajas, 24 bodegas, 48 usuarios, traspasos y mermas. | Un `store` por subdominio. Sin modelo de sucursal. | **D2** (solo modelo de datos) |
| 5 | Fiado / cuenta corriente con abonos y saldo por cliente. | No existe. | **D5** (backlog post-DTE) |
| 6 | Importar factura de proveedor desde el SII → stock automático (determinista). | IA de visión leyendo PDFs: más frágil y más caro. | **D4** |
| 7 | API Keys + webhooks vendidos como feature del plan. | Sin producto de API. | **D5** (backlog) |
| 8 | Promos y convenios por RUT aplicados en el cobro. | No. | **D5** (backlog) |
| 9 | Granel, packs, recetas, vencimientos, guías de despacho con cupo. | Parcial. | **D3** (solo guías) |
| 10 | Precio público, 5 planes, 14 días sin tarjeta, sin contrato, sin comisión. | Sin pricing definido. | **D6** |
| 11 | 37 FAQ + guía completa + blog SEO + soporte incluido. | Nada. | **D6** |
| 12 | Distribución por instaladores en GitHub Releases. | Deploy web. | ❌ no se copia |

### 13.2 Lo que nosotros ya tenemos y hay que **arreglar antes de presumirlo**

Esto no es "mantener". Son cosas que ya escribimos, que hoy son una desventaja o un riesgo, y
que después de arreglarlas pasan a ser una ventaja real frente a Devlas.

| # | Qué tenemos | Estado real | Arreglo |
|---|---|---|---|
| **R1** | **Reserva offline de folios** (`siiStore.ts:45`, `/api/sii/folios/offline`) — reserva un lote de 50 folios por dispositivo y los consume localmente. Devlas no publica nada equivalente con este nivel de detalle. | 🔴 **Dos bugs.** (a) `route.ts:31` usa `.lte('folio_actual', 'folio_hasta')` — compara la columna contra el **string literal** `'folio_hasta'`, no contra otra columna (PostgREST no lo soporta directo). (b) `route.ts:24-50` hace read-then-update **sin `FOR UPDATE` ni RPC**: dos cajas reservando a la vez obtienen el mismo rango. Folio duplicado = DTE inválido, y no se puede deshacer. | Mover la reserva a RPC `SECURITY DEFINER` con `FOR UPDATE` (hermano de `get_next_folio`, §11/M1), filtrar por columna calculada o `WHERE folio_actual <= folio_hasta` sin PostgREST, y test de concurrencia de 2 reservas. |
| **R2** | **Persistencia del pool** vía `persist` + `idb-keyval` (`siiStore.ts:69-70,187-191`). | 🔴 **Crítico.** No hay `partialize`: se persiste **todo el estado**, incluido `activeCafs` (el XML del CAF **con la llave privada `RSASK`**) y `digitalToken` (token de sesión del SII). Queda en IndexedDB, sin cifrar, y **sobrevive al logout**. Con ese CAF se pueden forjar DTE dentro del rango; con el token se opera como el emisor. | `partialize` que excluya `activeCafs` y `digitalToken`. El CAF vive solo en memoria durante la sesión, o cifrado con llave derivada de un PIN. Limpiar el storage al cerrar sesión. |
| **R3** | **Cola de pendientes** (`pendingQueue` con `attempts`, `timestamp`). | 🟡 Existe la estructura, no hay política: sin backoff, sin dead-letter, sin tope de reintentos, sin orden garantizado (folio N+1 no puede llegar antes que N). | Backoff exponencial, tope de intentos, envío estrictamente por orden de folio, y estado visible en el POS ("3 boletas por enviar"). |
| **R4** | **`OfflineSyncManager`** + detección de `offline` (`pos/page.tsx:73-76,931,1062`). | 🟡 Detecta red y encola, pero el POS sigue asumiendo servidor para el resto del flujo. | Definir el alcance real: qué se puede vender sin red (boleta con folio reservado + CAF en memoria) y qué no. Documentarlo, porque es lo que se vende. |
| **R5** | **`catalogo_global`** (~40k SKU normalizados). | 🟢 Único en el mercado, nadie más lo tiene. Subexplotado: es una feature de producto, no un detalle técnico. | Convertirlo en argumento comercial (alta rápida de productos) y exponerlo en el onboarding. |
| **R6** | **Hardware: WebUSB/BLE/gaveta/pantalla cliente**. | 🟢 Real y funcionando; Devlas no lo tiene. 🔴 Limitado a Chromium (`AGENTS.md` Regla #4). | Declararlo explícitamente en la ficha ("requiere Chrome/Edge") en vez de que el cliente lo descubra. Detectar y avisar en el POS. |
| **R7** | **E-commerce público + loyalty + vouchers** (Edenred, Pluxe, Junaeb, Getnet, Webpay). | 🟢 Es el diferencial más grande contra un POS puro como Devlas. | No perseguir a Devlas en POS profundo; el pitch es "POS + tienda + pagos", no "POS más barato". |

### 13.3 Lo que sí hay que copiar (6 tareas)

Las 2 primeras son ingeniería y dependen de este plan (D1 → Fase 2, D2 → M8). Las 2 últimas
son de venta: no cuestan código, cuestan decisión.

| # | Tarea | Va en | Gate |
|---|---|---|---|
| **D1** | **Solicitud automática de CAF** (`CafSolicitor` del vendor): pedir folios al SII desde el onboarding sin que el cliente entre al portal. Sin esto el onboarding sigue siendo de días y el resto del trabajo comercial no rinde. | Fase 2 + **M7** | Un `.pfx` válido + RUT autorizado generan un CAF nuevo sin intervención manual, y el primer DTE se emite con ese folio. |
| **D2** | **Modelo de sucursal** (`CdgSIISucur` en el DTE, bodegas, traspasos). Solo el modelo de datos y el campo en el XML; sin UI de traspasos todavía. | **M8** | DTE emitido con `CdgSIISucur` correcto y validado contra el XSD. |
| **D3** | **Guías de despacho (52) completas**, incluidas en el plan, no como add-on. | Fase 4 (tipos) + T6 | Guía aceptada por el SII con motivo de traslado vigente en 2026. |
| **D4** | **Importar factura de proveedor desde el SII** (RCV) → stock, determinista. Reemplaza la IA de visión como camino principal; la IA queda como fallback para documentos que no están en el RCV. | Post-DTE (T2) | Factura del RCV crea movimiento de stock sin OCR. |
| **D6** | **Precio público + comparativa + FAQ.** No es ingeniería, es venta. Su tabla comparativa (Bsale ~$90.500, GestiónPOS ~$47.300, Lioren ~$20.100 vs Devlas $7.490) es la jugada a replicar, con verificación propia de cada precio. | Marketing, post-Fase 4 | Precio publicado antes de decir "certificado". |
| **D7** | **Inscribirse en la nómina del SII** (`emp_prov_fe.htm`) cuando exista un RUT emisor con trackId aceptado. Gratis, credibilidad alta, requisito: ser emisor con software propio (no Mipyme gratuito) y sin situaciones pendientes. Se pide por "Contáctenos". | Post-Fase 4 | Nombre en la nómina. |

### 13.4 Las 4 cosas que **no** se copian

| No copiar | Por qué |
|---|---|
| **Apps nativas (Win/macOS/iOS/Android)** | Cuatro bases de código, cuatro ciclos de release, cuatro stores. Tu ventaja es web: un deploy arregla a todos los tenants. El costo de mantener nativo te come el margen antes de tener 100 clientes. |
| **Su estructura de precios de 5 planes** | Su escala es otra. Copiar el precio sin copiar el volumen es suicidio de margen. Define precio por valor (POS + tienda + catálogo), no por escalones de cajas. |
| **Cupos por plan (20 sucursales / 40 cajas / 48 usuarios)** | Complejidad de facturación y de feature flags para un producto que aún no tiene clientes. Un solo plan con límites blandos. |
| **Inflar métricas en la landing** | Sus contadores dicen `0+ ventas`, `0 comercios`, `0,0% uptime`: placeholders o recién partiendo. No copies la métrica falsa; y tampoco te asustes, están más cerca de ti que de Bsale. |

### 13.5 Cómo se integra en las fases existentes

Ninguna fase de §5 cambia de orden. Se agregan tareas:

- **Fase 0** — suma verificar D7 (requisitos de la nómina) junto al trámite del contribuyente.
- **Fase 2** — suma **D1** (CAF automático) y **D2** (campo `CdgSIISucur` en el mapper).
- **Fase 3** — suma **R1** y **R2** como bloqueantes. R2 antes de que cualquier tenant real use el POS: hoy hay llave privada de emisor en IndexedDB.
- **Fase 4** — suma **D3** (guía 52) al set de tipos.
- **Fase 5 (operación)** — suma **R3** y **R4** (cola offline con orden y backoff).
- **Post-Fase 4** — **D4**, **D6**, **D7**, **D5** (fiado, API keys, convenios por RUT: backlog, no plan).

### 13.6 El veredicto en una línea

Devlas gana en **operación del DTE** (onboarding, CAF, offline) y en **distribución/precio**;
YAHPOS gana en **producto** (e-commerce, pagos, hardware, multi-tenant, catálogo). No se compite
con features: se compite con **onboarding de 30 minutos + offline que no filtre llaves + catálogo**.
Lo primero es D1, lo segundo es R1/R2, lo tercero es R5.

---

## 14. Bitácora de ejecución (llenar en diciembre)

```
### 2026-12-DD — Fase 0
- Trámite confirmado:
- Fuente (URL/fecha):
- Consecuencia para Kanban:254:

### 2026-11-01 — Fase 0 (adelantada, sin código)
- Trámite confirmado: **no se certifica el software; se certifican los DTE que emite.** Proceso de
  3 etapas / 9 pasos. Postulación del contribuyente (o representante legal) con certificado digital
  en `maullin.sii.cl/cvc_cgi/dte/pe_ingrut`; aceptada → inscripción automática en Ambiente de
  Certificación. Cierre con "Declaración de Cumplimiento" en sii.cl.
- Fuentes (consultadas 2026-11-01):
  - `sii.cl/destacados/factura_electronica/index.html` (las 3 etapas y los 9 pasos)
  - `sii.cl/destacados/factura_electronica/factura_etapas_5.html` (textual: "certificar los DTE que
    la aplicación va a emitir, y no el sistema informático como tal")
  - `sii.cl/destacados/factura_electronica/factura_etapas_4.html` (perfiles de usuario)
  - `sii.cl/destacados/factura_electronica/postulacion.htm` (URL de postulación)
- Hallazgo nuevo para D1: la solicitud automática de CAF requiere que el emisor cree un usuario con
  perfil **`Solicitar Folios`**. Sin ese perfil, `CafSolicitor` falla por permisos.
- Consecuencia para `Kanban.md:254`: está mal planteado (no hay inscripción como desarrollador).
  Pendiente que lo corrija el dueño; el Kanban es zona protegida.
- Pendiente de esta fase (no bloquea): instructivo vigente del set de pruebas + cuántos folios de
  certificación entrega el SII por solicitud.

### 2026-11-02 — Fase 1 adelantada: harness de paridad offline
- Ubicación: `..\dte-parity\` (fuera del repo; `tsconfig.json` del proyecto incluye `**/*.ts`).
- 5 payloads × 13 checks. Oráculo `@devlas/dte-sii@2.43.0` instalado y usado.
- Resultado: **el motor propio no firma ningún documento.** 3 bloqueantes independientes:
  1. `signer.ts:49` — `forge.pki.certificateToAsn1(...).toDer()` no existe → el constructor lanza.
  2. `signer.ts:66-83` — API de `xml-crypto` v2 sobre v6.1.2 (`addReference`, `keyInfoProvider`).
  3. `caf.ts:63` — `getPrivateKeyJwk` exige `RSASK.M/E/...`; el SII entrega PEM → `null`.
- Además: `ted.ts:46` emite `TSTP` en vez de `TSTED`; `IndExe` fuera de orden XSD en las 5
  plantillas; `TasaIVA` ausente solo en boleta; `PrcItem` redondeado; `&`/comillas borrados.
- No se tocó ningún archivo de `austral-market-next/` (verificado con `git status` antes/después).
- Consecuencia: la Opción B de §3 deja de ser una apuesta y pasa a ser la única razonable.
- Pendiente del harness: incluir los `.xsd` oficiales y probar PDF417 real (round-trip).

### 2026-11-05 — Tramos 2–4 cerrados: el motor ya firma
- **`caf.ts`** — acepta `RSASK` en PEM real del SII (vía `node:crypto`, `createPrivateKey` →
  `export({format:'jwk'})`) además del formato componentizado interno. Harness: `TED con CAF
  formato SII real` pasa de FAIL a PASS.
- **`ted.ts`** — emite `TSTED` (no `TSTP`) en ambas ramas; pliega a ASCII **solo dentro del
  `<DD>`** (RSR/IT1), con truncado posterior a 40. Harness: `Orden DD` y `Bytes >=128 en DD`
  pasan a PASS.
- **`signer.ts`** — reescrito para `xml-crypto@6.1.2`: constructor con `privateKey`/`publicCert`,
  `addReference({xpath, transforms, digestAlgorithm})`, `computeSignature(xml,{location})`.
  El DER del certificado se obtiene con `forge.asn1.toDer(...)`. Se elimina el monkeypatch de
  `crypto.createHash`. Harness: `DigestValue` y `Firma XMLDSig` pasan a PASS en los 5 payloads.
- Veredicto del harness tras los tres tramos: **P2, P3, P4 PASS**; **P1 WARN** (1 peso por
  redondeo por línea); **P5 FAIL** (XML mal formado por `&` sin escapar en campos del
  emisor/receptor, no solo en `NmbItem`).
- Hallazgo que corrige el plan: **`TasaIVA` no es un defecto de la boleta**. El oráculo tampoco
  lo emite para DTE 39; es opcional en `Totales`. El ítem #14 queda descartado.
- Hallazgo nuevo a verificar en Fase 4: el `<DD>` se firma sobre el string UTF-8, pero el DTE
  se declara y se envía como ISO-8859-1. Con acentos en el `<Documento>` (P4) el digest UTF-8
  y el digest latin1 difieren. El oráculo hace lo mismo (UTF-8) y el harness valida UTF-8, así
  que offline no se puede decidir; hay que probarlo contra el SII con un DTE acentuado.

### 2026-11-06 — Tramo 5: plantillas limpias, 0 FAIL en el harness
- Nuevo `src/lib/sii/xml-text.ts`: `xmlText(valor, maxLength?)` trunca y escapa
  `& < > " '`. Se aplica a **todos** los nodos de texto (antes solo se "limpiaba" `NmbItem`,
  borrando caracteres).
- Las 5 plantillas: `IndExe` movido a su posición XSD (después de `NroLinDet`), `PrcItem` sin
  redondear, `MontoItem` sigue entero, y todos los campos de emisor/receptor/referencias pasan
  por `xmlText`.
- `ted.ts`: `RSR` e `IT1` se escapan después del plegado/truncado. Antes `IT1` borraba `&` y
  `RSR` no se escapaba, lo que rompía el XML completo cuando el receptor traía `&`.
- Harness: **P2, P3, P4, P5 PASS; P1 WARN**. 0 casos FAIL.
- Único pendiente de paridad: P1 difiere en 1 peso (`MntNeto 2100` vs `2101`, `IVA 400` vs
  `399`) porque `engine.ts:132` redondea el neto **por línea**. El oráculo redondea sobre el
  total. Cambiarlo exige tocar `engine.ts`, que es zona roja: queda a decisión del dueño.

### 2026-11-06 (bis) — Tramo 6: `calculateTaxes()` sobre el total
- `engine.ts:112-171` (zona roja, autorizado): el neto afecto y su IVA ahora se calculan sobre
  la suma de líneas, no línea a línea:
  `MntNeto = round(Σ afecto / 1.19)`, `IVA = Σ afecto - MntNeto`, `MntTotal = Σ afecto + Σ exento`.
- Los montos por línea se redondean con `Math.round(item.MontoItem ?? QtyItem * PrcItem)`;
  antes `MontoItem = 0` caía al fallback y cobraba `QtyItem * PrcItem` (bug latente de ítems
  en $0).
- Harness: **P1 pasa de WARN a PASS**. Resultado final del motor propio: **0 FAIL y 0 WARN en
  los 5 payloads**. Los 5 WARN que quedan en `REPORTE.md` son del oráculo por no declarar
  `encoding`.

### 2026-11-06 (ter) — Tramo 7: validación contra el XSD oficial del SII
- Esquemas oficiales descargados a `dte-parity/schemas/`: `DTE_v10.xsd` + `SiiTypes_v10.xsd` +
  `xmldsignature_v10.xsd` (facturas/notas) y `EnvioBOLETA_v11.xsd` (boletas, publicado en
  `https://www.sii.cl/factura_electronica/EnvioBOLETA_v11.xsd`).
- Validador sin dependencias: `dte-parity/tools/ValidateXsd.java` (JDK 21) + wrapper
  `dte-parity/scripts/validate-xsd.ts`. Elige esquema por tipo y **verifica las firmas** con
  xml-crypto además de validar el XSD.
- **Dos defectos en los XSD del SII** (documentados, parcheados en local):
  - `SiiTypes_v10.xsd`, `Dec14_4Type`: `minInclusive 0.0001` → `0.0000`.
  - `EnvioBOLETA_v11.xsd`, `PctType`: `minInclusive 0.01` → `0.00`.
  Sin esos parches Xerces no compila los esquemas (`cvc-minInclusive-valid`).
- Hallazgos reales del motor (corregidos):
  1. **`Acteco` es obligatorio** en `DTE_v10.xsd` (`Emisor` → `Telefono?`, `CorreoEmisor?`,
     `Acteco`). No lo emitía ninguna plantilla. Se agregó `SiiConfig.acteco?` y `<Acteco>` en
     las 4 plantillas de factura/nota/guía. **El oráculo tampoco lo emite**: su XML no valida.
  2. **Boleta usaba nombres de factura** (`RznSoc`, `GiroEmis`); `EnvioBOLETA_v11.xsd` exige
     `RznSocEmisor` y `GiroEmisor`. Corregido en `boleta.ts`.
  3. **`<Transforms>` admite un solo `<Transform>`** en `xmldsignature_v10.xsd` (no es el
     XMLDSig completo). El firmante declaraba `enveloped-signature` + C14N. Ahora declara solo
     `enveloped-signature` y fuerza la C14N implícita del spec sobreescribiendo
     `getCanonXml()` (si no, el digest se calcula sobre `toString()` de xmldom y no coincide).
  4. **`KeyInfo` exige `KeyValue` antes de `X509Data`**; xml-crypto solo emitía `X509Data`.
     `signer.ts` ahora inyecta `<KeyValue><RSAKeyValue><Modulus>…` con `n`/`e` del PFX.
  5. **Boleta: `<DTE>` no existe en la raíz** de `EnvioBOLETA_v11.xsd` (solo como hijo local de
     `SetDTE`), y `EnvioBOLETA` exige su propia `<Signature>` sobre `SetDTE`. La boleta se
     valida dentro de un `EnvioBOLETA` mínimo (`generateEnvioXml`).
  6. **Orden de firma**: la C14N es inclusiva y hereda namespaces de los ancestros. Firmar el
     `<Documento>` suelto y **después** envolverlo rompe su `DigestValue`. Hay que envolver
     primero y firmar `Documento` + `SetDTE` sobre el XML final.
- Resultado: **5/5 PASS** de XSD y **5/5 PASS** de firmas (boletas: 2 firmas; factura: 1).
- Pendiente productivo en ese momento: `sii_config` no tenía columna `acteco`. **Resuelto en el
  tramo 10.**

### 2026-11-06 (quinquies) — Tramo 9: tipos 52 / 56 / 61 contra el XSD
- El motor declara soportar 33/39/41/52/56/61 pero el harness solo probaba 33 y 39.
- `fixtures/make-fixtures.ts` genera ahora CAF sintéticos para `[39, 33, 52, 56, 61]`.
- `fixtures/payloads.ts`: `CASOS_EXTRA` con P6 (nota de crédito 61), P7 (nota de débito 56) y
  P8 (guía de despacho 52). No tienen oráculo (`@devlas/dte-sii` no emite esos tipos), así que
  solo se validan contra el XSD.
- `validate-xsd.ts` despacha por tipo igual que `engine.ts:230-242` (`generarDte`) y aplica
  `calculateTaxes()` antes de renderizar, como `engine.ts:190`.
- Bug real encontrado: `guia_despacho.ts` emitía `<CodRef>0</CodRef>` cuando la referencia no
  traía `CodRef`. El XSD lo define como enumeración `1..3` → ahora es opcional y se omite.
- Resultado: **8/8 PASS** por caso, **lote PASS**.

### 2026-11-06 (sexies) — Tramo 10: datos de emisión en `sii_config`
- Hueco real: `engine.ts:53-65` leía `configData.fch_resol` y `configData.nro_resol`, **columnas
  que no existían en ninguna migración** (siempre `undefined` → carátula con `2014-08-22` / `0`),
  y `acteco` no se mapeaba, así que `<Acteco>` nunca llegaba al XML.
- `supabase/migrations/027_sii_config_datos_emision.sql`: agrega `acteco INTEGER`,
  `fch_resol DATE`, `nro_resol INTEGER`, con checks de rango (`acteco` 1000..999999,
  `nro_resol >= 0`) y `COMMENT`. No toca RLS: son columnas nuevas de una tabla que ya tiene
  `store_isolation_policy` (025).
- `api/sii/config/route.ts`: `POST` acepta `acteco`, `fch_resol`, `nro_resol`. Solo pisa los
  valores si el cliente los envía (`'acteco' in body`), para que un cliente viejo no borre la
  configuración. `''` → `NULL`.
- `admin/configuracion/page.tsx`: campos **Código de Actividad (Acteco)**, **N° Resolución** y
  **Fecha Resolución** en "Datos de la Empresa".
- `engine.ts:53-65` (autorizado por el dueño): mapea los 3 campos con `?? undefined`.
- `validate-xsd.ts`: **control negativo** — factura 33 sin `<Acteco>` debe ser inválida. Hoy
  Xerces la rechaza por `DirOrigen` (el esquema exige `Telefono|CorreoEmisor|Acteco` antes). Si
  ese control pasara a PASS, la validación no estaría probando nada.
- Resultado: **8/8 PASS · lote PASS · control PASS**; paridad `0 FAIL`; `tsc` limpio en app y
  harness. `eslint`: 9 errores `no-explicit-any` preexistentes (6 en `engine.ts`, 3 en
  `api/sii/config/route.ts`), ninguno nuevo.
- **Falta antes de emitir en serio:** cargar el `acteco` real del RUT emisor y el `nro_resol` /
  `fch_resol` de su resolución en el panel. Son datos del contribuyente, no del código.

### 2026-11-07 — Tramo 13: ISO-8859-1 como contrato (bytes = lo firmado)
- Riesgo real: el XML declara `encoding="ISO-8859-1"`, pero el string se convierte con
  `iconv.encode(xml, 'ISO-8859-1')` en el envío. `iconv` **no falla**: reemplaza por `?` todo
  carácter que no existe en el charset (emoji, `€`, cirílico). El SII recibía bytes distintos de
  los firmados y rechazaba con "firma inválida" sin explicar el motivo.
- Nuevo `src/lib/sii/encoding.ts`:
  - `bytesLatin1(xml, contexto)` convierte y **verifica el round-trip**; si el texto cambia,
    lanza error indicando el carácter y su código (`U+1F600`).
  - `normalizarLatin1(xml, contexto)` deja el documento representable en ISO-8859-1 sin perder
    texto: los caracteres fuera del charset pasan a referencia numérica (`&#128512;`).
- `signer.signXml()` normaliza **después** de `computeSignature`. Detalle no obvio: xml-crypto
  re-serializa el documento y devuelve las referencias numéricas como caracteres literales, así
  que escapar antes de firmar no sirve. El digest no cambia porque la C14N expande la referencia
  al mismo carácter antes de calcularlo (verificado con firma real, no solo teóricamente).
- `envio.ts` usa `bytesLatin1()` para el multipart; `engine.ts:283-291` archiva en Storage los
  **bytes** ISO-8859-1 (antes subía el string → UTF-8 con prolog latino, archivo legal que no
  reproducía lo enviado). Cambio de una línea en zona roja, solo en el archivado.
- Harness `scripts/encoding.ts`: 5 casos × 4 checks (convertible, bytes→texto idéntico, firma
  válida sobre los bytes releídos, acentos = 1 byte vs 2 en UTF-8) + normalización de emoji/€ +
  2 controles negativos. Resultado **23/23 PASS** (`REPORTE-ENCODING.md`).
- Resultado: `tsc` app+harness limpio; `eslint` sin errores nuevos (6 `no-explicit-any`
  preexistentes en `engine.ts`); XSD **8/8 · lote · control**; paridad **0 FAIL**.

### 2026-11-07 — Tramo 14: la respuesta del SII no se adivina (recepción vs. rechazo)
- Bug real en `envio.ts`: se consideraba recibido el DTE con solo encontrar `<TRACKID>`, sin mirar
  `<STATUS>`. El SII puede responder `STATUS=5` + `TRACKID` (rechazo con folio de seguimiento);
  el motor marcaba el documento como enviado y nunca se reintentaba. El caso inverso, `STATUS=0`
  sin `TRACKID`, tampoco es confirmación: no hay folio para consultar el estado.
- Nuevo `src/lib/sii/recepcion.ts`:
  - `parsearRespuestaRecepcion(texto)` acepta éxito solo con `STATUS=0` **y** `TRACKID`;
    cualquier otro `STATUS` es rechazo (`success: false`, conserva `glosa` y `trackId`).
    Respuesta vacía o HTML del portal (sesión caída) se reporta como "no reconocida", nunca
    como éxito silencioso.
  - `yaFueRecibido(doc)` corta el reenvío cuando hay `track_id` o el estado ya es
    `ENVIADO`/`ACEPTADO`; un `RECHAZADO_SII` sí se puede reintentar.
- `envio.ts` delega el parseo en `recepcion.ts`; `engine.ts` corta antes de firmar el sobre si
  `yaFueRecibido(doc)` y devuelve `yaEnviado: true` con el track id existente.
- Harness `scripts/recepcion-sii.ts`: 7 respuestas (OK, con espacios/saltos, rechazo con glosa,
  rechazo con track id, `STATUS=0` sin `TRACKID`, vacía, HTML) + 5 reglas de reenvío.
  **12/12 PASS**. El control negativo cubre el error caro: marcar como enviado lo que el SII
  rechazó.
- Resultado: `tsc` app+harness limpio; `eslint` sin errores nuevos; XSD **8/8 · lote · control**;
  paridad **0 FAIL**; PDF417 **5/5**; PDF datos **5/5**; encoding **23/23**.

### 2026-11-07 — Tramo 15: la venta del POS se convierte en un DTE real
- Bug real: el POS encolaba `{ items, totals, type, folio }` y `/api/sii/sync` armaba un
  `Encabezado` a mano con `payload.type` / `payload.totals.total`. El payload no tenía
  `Detalles` ni receptor: el motor firmaba un documento sin líneas. Además `storeId` era
  `selectedBranchId || 'default'` (id de sucursal, no de tienda) → 403 en cada sincronización,
  y el descuento por canje de puntos nunca llegaba al `MntTotal`.
- Nuevo `src/lib/sii/payload-pos.ts` (`payloadDesdeVentaPos()`):
  - `MontoItem` por línea se calcula sobre el total **cobrado**, repartiendo el descuento en
    proporción al peso de cada línea; el residuo de redondeo cae en la línea mayor, así
    `Σ MontoItem === total pagado` (no "aproximado").
  - `PrcItem = MontoItem / QtyItem` con 5 decimales (`Dec5Type`); soporta cantidades en kg.
  - RUT del receptor se valida con `validateRut()` (DV incluido). Inválido o ausente →
    `66666666-6` sin nombre, en vez de emitir con un RUT que el SII rechaza.
  - Rechaza ventas en $0, sin ítems o con fecha que no sea `AAAA-MM-DD`.
- `api/sii/sync/route.ts` reescrito: exige `Encabezado` + `Detalles` (422 si faltan, para que el
  cliente descarte el ítem viejo en vez de reintentarlo para siempre); idempotencia por
  `metadata.offline_id` (devuelve el documento existente si el HTTP se perdió y se reintenta);
  enlaza la orden (`sii_document_id`, `sii_status`, `folio`) por `metadata->>offline_id`;
  `FchEmis` por defecto en hora de Chile, no UTC.
- Migración `028_orders_sii_link.sql`: `orders.sii_document_id` (FK a `sii_documents`),
  `sii_status`, `folio`, índice, comentarios. `IF NOT EXISTS` porque las dos últimas ya se
  usaban en el código sin estar declaradas. Sin policy nueva: `orders` ya tiene
  `store_isolation_policy` sobre `store_id` y la escritura la hace el servidor autenticado.
- POS (`(pos)/pos/page.tsx`): el payload se arma con `payloadDesdeVentaPos()`; el `storeId` de
  la cola es el `store_id` de la tienda (`saasStoreId || config.id`); se eliminó la generación
  del TED en el navegador (el motor lo regenera con el CAF de la base y esa copia no se usaba);
  emisión inmediata best-effort tras registrar la orden (si falla, queda en cola).
- `api/orders` POST: tras crear la orden, enlaza el DTE ya emitido por `offline_id` (el POS
  puede emitir antes de que exista la fila). Un fallo de enlace se registra, no tumba la orden.
- Recibo (`PosReceiptModal`): el botón PDF usaba `orderData.id` (`POS-<timestamp>`), que no es
  un `sii_documents.id` → 404 siempre. Ahora usa `siiDocumentId`; si el DTE no está emitido,
  imprime el comprobante interno **avisando** ("BOLETA ELECTRÓNICA (SIN TIMBRE)") en vez de
  abrir una pestaña con error. Se quitaron RUT/giro/dirección hardcodeados: el RUT sale de
  `config.tax_id`.
- `OfflineSyncManager`: al emitir desde la cola enlaza la venta local con el documento y
  descarta los 422 (payload no emitible) en vez de reintentarlos cada 30 s.
- Harness `scripts/payload-pos.ts`: 5 casos de aritmética (simple, descuento, residuo de
  redondeo en 3 líneas, kg, exento) × 2 checks + RUT válido/inválido + 3 controles negativos +
  2 pipelines completos POS → TED → XML → firma → **XSD oficial de EnvioBOLETA**.
  **19/19 PASS** (`REPORTE-PAYLOAD-POS.md`).
- Resultado: `tsc` app+harness limpio; `eslint` sin errores nuevos; XSD **8/8 · lote · control**;
  paridad **0 FAIL**; PDF417 **5/5**; PDF datos **5/5**; encoding **23/23**; recepción
  **12/12**; payload POS **19/19**.

### 2026-11-07 — Tramo 16: esquema Supabase aplicado y contrato código ↔ base
- El SQL Editor del dashboard llevaba días cortando con `Connection terminated due to
  connection timeout`, incluso con `SELECT 1`. No era el SQL: era el editor/pooler. Se aplicó
  todo por la **Management API** (`POST /v1/projects/{ref}/database/query`) contra
  `bddpzqayurvhgpllykku` (`supermercado-sf`, `ACTIVE_HEALTHY`, Postgres 17.11). Sin `psql` ni
  `supabase` CLI en la máquina.
- **Bug de esquema real encontrado por el contrato:** `engine.ts:200-214` leía el CAF de
  `.from('sii_cafs').select('xml_content')`. Esa tabla **no existe** en la base y la columna
  tampoco. El CAF vive en `sii_folios.caf_xml` (lo escribe `api/sii/caf/route.ts`). Efecto:
  toda emisión con folio preasignado —el camino normal del POS offline— fallaba con
  "CAF no encontrado". Corregido a `sii_folios.caf_xml`.
- Migración `027_sii_config_datos_emision.sql` aplicada, statement por statement y con
  `NOT VALID` + `VALIDATE` para no colgar locks:
  `sii_config.acteco INTEGER` (antes faltaba; `fch_resol`/`nro_resol` ya existían de un intento
  parcial), constraints `sii_config_acteco_rango` (1000–999999) y
  `sii_config_nro_resol_rango` (≥0) — ambos con `convalidated=true` — más comentarios.
- Migración `028_orders_sii_link.sql` aplicada: `orders.sii_document_id UUID` FK a
  `sii_documents(id) ON DELETE SET NULL`, `orders.sii_status TEXT`, `orders.folio BIGINT`,
  índice `orders_sii_document_id_idx` y comentarios. Verificado con `information_schema`,
  `pg_constraint` y `pg_indexes`. Sin policy nueva: `orders` ya tiene `store_isolation_policy`.
- Nuevo harness `dte-parity/scripts/db-contract.ts`: compara el código contra el esquema real
  (tablas `sii_config`, `sii_folios`, `sii_documents`, `orders`, `sii_logs`, `profiles`), revisa
  que cada `.from(...).select(...)` use columnas existentes, y trae control negativo para que
  `sii_cafs` no vuelva. **24/24 PASS**. Durante el desarrollo el propio harness tenía un bug
  (atribuía el `.select` de una tabla al `.from` anterior); se acotó cada bloque al próximo
  `.from(...)`.
- Estado de datos: `sii_config` sigue con 1 fila y `acteco`/`nro_resol`/`fch_resol` vacíos;
  6 CAF en `sii_folios`, 67 `sii_documents`, 50 `orders`.
- Resultado: `tsc` app+harness limpio; `eslint` sin errores nuevos (solo los `any`
  preexistentes en `engine.ts`, `caf/route.ts` y `folios/offline/route.ts`); XSD **8/8 · lote ·
  control**; paridad **0 FAIL**; encoding **23/23**; recepción **12/12**; payload POS
  **19/19**; PDF417 **5/5**; PDF datos **5/5**; contrato BD **24/24**.

### 2026-11-08 — Tramo 17: fin a fin de emisión y envío (fetch inyectado)
- Nuevo harness `dte-parity/scripts/e2e-emision.ts`: reemplaza el cliente Supabase por un doble
  en memoria y el `fetch` global por uno que captura el multipart, y ejecuta el camino real:
  folio preasignado → CAF de `sii_folios` → TED → XML → firma → insert en `sii_documents` →
  archivo latin1 en Storage → `EnvioBOLETA` → firma de cada `Documento` y del `SetDTE` → POST a
  `maullin.sii.cl` → parseo de respuesta → update de estado.
- Verifica que el cuerpo que viaja al SII tiene **2 firmas válidas** (Documento + SetDTE) contra
  el certificado del emisor. El harness decodifica el `Blob` como **ISO-8859-1** (no `text()`,
  que lo haría UTF-8 y rompería los acentos antes de verificar).
- **Segundo bug de esquema encontrado por el contrato:** la rama de rechazo de
  `enviarDocumentoAlSII()` hacía `.update({ estado_sii: 'RECHAZADO_SII', error_log: ... })`, pero
  `sii_documents` **no tiene `error_log`**. PostgREST rechaza el update completo, así que un DTE
  rechazado por el SII se quedaba sin estado y sin glosa. Corregido a `sii_response`.
- `db-contract.ts` ahora también revisa las claves de `.insert({...})` / `.update({...})` contra
  el esquema (incluye `api/sii/sync`), y trae control negativo para `error_log`.
  **53/53 PASS**.
- El e2e cubre además: idempotencia (`track_id` presente → no reenvía, `yaEnviado: true`),
  rechazo (`STATUS=7`) no se reporta como éxito y la glosa queda en `sii_response`.
  **20/20 PASS**.
- Resultado: `tsc` app+harness limpio; `eslint` sin errores nuevos; XSD **8/8 · lote ·
  control**; paridad **0 FAIL**; encoding **23/23**; recepción **12/12**; payload POS
  **19/19**; PDF417 **5/5**; PDF datos **5/5**; contrato BD **53/53**.

### 2026-11-13 — Tramo 19: endpoints reales de auth, aceptación, vigencia de CAF y carátula fail-closed
- **Bloqueador confirmado con el SII vivo** (sondas HTTP del día): `maullin.sii.cl/cgi_rtc/RTC/crseed.cgi`
  → **404**; `palena.sii.cl/cgi_rtc/RTC/crseed.cgi` → `Transaccion Rechazada`; `w1.sii.cl` →
  **ENOTFOUND** (ese host de producción simplemente no existe). El canal vigente son los SOAP
  `DTEWS/CrSeed.jws` (`getSeed`) y `DTEWS/GetTokenFromSeed.jws` (`getToken` con el XML firmado
  escapado en `pszXml`), que responden 200 en maullin (certificación) y palena (producción).
- **`auth.ts` reescrito** sobre esos SOAP: eliminado `gettoken.cgi`, default de producción
  corregido de `w1` a `palena`, `User-Agent PROG 1.0` en cada request (sin él el SII devuelve 401
  engañoso o el portal HTML) y **fail-closed por `<ESTADO>`**: `ESTADO 00` es el único éxito.
  Antes, un `ESTADO 10 Error Interno` con HTTP 200 se convertía en `undefined` y el motor seguía.
- **Nuevo `soap.ts`**: sobre/escape/desescape/post y los hosts por ambiente, compartidos por auth y
  consultas. Los parsers (`parsearSemilla`, `parsearToken`, `extraerEtiqueta`, `estadoYGlosa`) se
  exportan para que el harness los pruebe con respuestas reales copiadas del SII.
- **Nuevo `aceptacion.ts` — el veredicto que faltaba.** Tener `TRACKID` sólo significa "recibido".
  Implementado `QueryEstUp.getEstUp` (RutCompania, DvCompania, TrackId, Token) y
  `QueryEstDte.getEstDte` (11 parámetros), con los nombres tomados del **WSDL vivo**, y
  `parsearEstadoSii()`: `ESTADO 000` = consulta resuelta y el veredicto sale de `RESP_BODY`
  (sólo `ACEPTADOS` es aceptado; `RECHAZADOS`/`NO ACEPTADOS` es rechazo; `EPR` y códigos
  abreviados quedan `DESCONOCIDO` a propósito — no se adivina un veredicto).
- **`envio.ts` fail-closed en la carátula.** `FchResol` ya no cae a `'2014-08-22'` ni `NroResol` a
  `0` por defecto: sin `fchResol` válida (`AAAA-MM-DD` con día real) o sin `nroResol` configurado,
  `generateEnvioXml` lanza antes de firmar. `nroResol = 0` se permite (aparece en ejemplos del SII
  y es el valor de las boletas); negativos, no.
- **`caf.ts` — vigencia antes de timbrar.** `validarCafParaEmision()` revisa tipo de DTE, rango de
  folio y el plazo de 6 meses (`CAF-3-517`), con recorte de fin de mes (31-ago + 6m = 28-feb).
  Devuelve problemas, no lanza: el llamador decide (el motor es zona roja, el cableado queda
  pendiente).
- **Bug de esquema en `api/sii/auth/token/route.ts`.** Leía `config.pfx_path` / `config.pfx_password`,
  columnas que **no existen** (las reales son `certificado_pfx_encrypted` /
  `certificado_password_encrypted`). Con `''` el signer fallaba, `SiiAuth` entraba en modo mock y el
  endpoint devolvía `MOCK_TOKEN_…` como token válido. Ahora descifra con `decrypt()` igual que
  `engine.ts`, responde `409` si no hay certificado y `422` si el `.pfx` no abre (`enModoMock()`).
- **Link roto del panel de certificación.** `SiiCertificationPanel.tsx:161` abría
  `/api/sii/document/{id}/xml` (ruta inexistente, y en singular). Nueva ruta
  `api/sii/documentos/[id]/xml/route.ts` con el mismo control que la del PDF (RLS + `store_id` o rol
  `developer`) y el link corregido a `/api/sii/documentos/{id}/xml`.
- Harness nuevos: `auth-sii.ts` **7/7**, `caf-vigencia.ts` **10/10**, `envio-caratula.ts` **7/7**,
  `aceptacion-sii.ts` **9/9**, `ted-rsa512.ts` **3/3** (el TED firma y verifica con CAF RSA-512, no
  solo 1024 — se comprueba contra la clave pública del CAF). `db-contract.ts` suma 13 controles
  (rutas del token y del XML + columnas fantasma) → **66/66**. `fixtures/payloads.ts::configPara`
  ahora entrega `fchResol`/`nroResol`.
- Resultado: `tsc` app+harness limpio; `eslint` sólo los `catch (error: any)` preexistentes de
  `engine.ts` (zona roja); XSD **8/8 · lote · control**; paridad **0 FAIL**; encoding **23/23**;
  recepción **12/12**; payload POS **19/19**; PDF417 **5/5**; PDF datos **5/5**; contrato BD
  **66/66**; e2e emisión **20/20**.
- **Datos reales que siguen mal (usuario):** `sii_config` de `c828f16e-…` tiene `fch_resol =
  2024-01-01`, `nro_resol = 0`, `acteco = null`; los 67 documentos de la BD son de prueba
  (`track_id = 9999999999`). Con el fail-closed nuevo, emitir sin `fch_resol` real ya no genera un
  DTE condenado a rechazo.
- **Pendiente (fuera de este tramo):** cablear `validarCafParaEmision` y `consultarEstadoUpload` en
  `engine.ts` (zona roja, requiere autorización); boletas en producción van por REST
  `pangal/rahue` con token propio (no implementado); formato de `FechaEmisionDte` para `getEstDte`
  sin verificar contra el SII (se pasa tal cual).

### 2026-11-13 — Tramo 20: el motor valida el CAF antes de gastar el folio y consulta el veredicto
- **Cableado en `engine.ts` (zona roja, autorizado por el dueño).** Antes, `emitirDocumento()`
  timbraba con el `caf_xml` que viniera: un CAF vencido o de otro rango se descubría recién al subir
  el envío (`CAF-3-517`), con el folio ya gastado y el DTE ambiguo. Ahora, antes del TED:
  - `Sin CAF para el folio N: no se puede timbrar` si la fila de `sii_folios` no trae `caf_xml`
    (antes se firmaba el TED con llave vacía y el error salía más tarde y más confuso);
  - `validarCafParaEmision(caf, { tipoDte, folio, fechaFirma: FchEmis })` y corte explícito
    `CAF no sirve para este DTE (LOCAL-FOLIO): …` con los códigos y mensajes de cada problema.
  El orden importa: la validación corre **antes** de `generateTed()`, así el folio no se consume.
- **Rechazo del envío ahora deja rastro legible.** La rama `RECHAZADO_SII` escribía sólo
  `estado_sii` y `sii_response`; `InvoiceHistoryTable` lee `doc.estado`, así que el historial seguía
  mostrando el DTE como `FIRMADO` después de un rechazo. Ahora se escriben **ambos**.
- **Nuevo `consultarEstadoEnvio(documentId, storeId)`.** Recepción no es aceptación: `STATUS=0` +
  `TRACKID` sólo dicen "recibido". El método toma el `track_id`, pide token, parte el RUT y llama
  `QueryEstUp.getEstUp`. Escribe `estado`/`estado_sii`/`sii_response` **sólo** con veredicto
  definitivo (`ACEPTADO` / `RECHAZADO`); con `EPR` o códigos abreviados deja el documento intacto
  — pisar `ENVIADO` con un veredicto desconocido perdería el rastro de que el SII sí lo recibió.
  Cada consulta deja un `sii_logs` (`STATUS_QUERY` / `STATUS_QUERY_FAILED`).
- **`dividirRut()` a módulo puro.** Las consultas SOAP no reciben el RUT completo: piden
  `RutCompania` (número) y `DvCompania` (DV). Nuevo `src/lib/sii/rut.ts` (saca puntos, DV a
  mayúscula, valida `^\d+$` y `^[0-9K]$`) para poder testearlo sin Supabase; separar mal el RUT hace
  que el SII responda "RUT NO EXISTE" y el envío se quede sin veredicto.
- **Tipos.** `emitirDocumento`/`emitirBoleta` devuelven `ResultadoEmision`, una unión discriminada
  (`success: true|false` literal). Con `success: boolean` ancho el estrechamiento no ocurre y los
  paneles que hacen `if (result.success)` no ven `folio`. Se anotaron los dos server actions
  (`admin/facturacion/actions.ts`) y el acceso por rama en `developer/actions/sii.ts`.
  `DteMetadata` reemplaza `metadata: any`; los `catch (error: any)` del motor pasaron a
  `unknown` + `mensajeDeError()`.
- **Ajuste requerido en el e2e (no es un bug del motor).** `dte-parity/scripts/e2e-emision.ts`
  emitía **folio 101** y el CAF sintético autoriza **1–100**: con la validación nueva el harness
  falla en la emisión y luego revienta con `ParseError: missing root element` en `firmasValidas()`.
  Folio pasado a **87** (y las dos aserciones). El harness estaba probando un folio que el CAF nunca
  autorizó: antes pasaba simplemente porque nadie revisaba.
- **Nuevo harness `motor-cableado.ts` — 21/21 PASS.** 6 de RUT (con guion, con puntos, DV `k`
  minúscula, sin guion, guion final, letras en el número), 2 de CAF contra el XML real de fixtures
  (sirve para firma 2026-11-01; `CAF-3-517` para 2027-06-01), 5 de veredicto
  (`ACEPTADOS`/`RECHAZADOS`/`NO ACEPTADOS`/`EPR`/`RFR`) y **8 controles estáticos** sobre el fuente
  del motor: la validación corre antes del TED, existe el corte sin CAF, se consulta `getEstUp`,
  un veredicto desconocido no pisa el estado, se escriben los dos estados, el rechazo del envío
  actualiza `estado`, la consulta filtra por `store_id` y no quedan `catch (error: any)`.
- Resultado: `tsc` app+harness limpio; `eslint` en `engine.ts`/`rut.ts` **0 errores** (los 4+16
  `no-explicit-any` de `admin/facturacion/actions.ts` y `developer/actions/sii.ts` son
  preexistentes); XSD **8/8 · lote · control**; paridad **0 FAIL**; encoding **23/23**; recepción
  **12/12**; payload POS **19/19**; PDF417 **5/5**; PDF datos **5/5**; contrato BD **72/72** (sube
  de 66 por el `select` nuevo); auth SII **7/7**; aceptación SII **9/9**; CAF vigencia **10/10**;
  carátula **7/7**; TED RSA-512 **3/3**; motor cableado **21/21**; e2e emisión **20/20**.
- **Sigue pendiente:** boletas en producción por REST `pangal`/`rahue` con token propio (sin
  implementar); formato real de `FechaEmisionDte` para `getEstDte` (se pasa tal cual, sin verificar
  contra el SII); `get_store_by_domain` con `p_host LIKE s.subdomain || '.%'` (acepta sufijos
  arbitrarios, no filtra documentos porque RLS usa el perfil, pero da contexto de tienda en hosts no
  autorizados); segunda tienda `45be9c55-…` sin `sii_config`/CAF/certificado; `acteco` sigue `null`
  en BD y es obligatorio en `DTE_v10.xsd`.

### 2026-11-13 — Tramo 18: aislamiento por tienda (envío, folios offline, unicidad de folio)
- **Hueco 1 — envío cruzaba tiendas.** `enviarDocumentoAlSII(documentId, storeId)` buscaba el DTE
  con `.eq('id', documentId)` y el cliente es **service-role** (salta RLS). Un usuario de la
  tienda A con el UUID de un DTE de la tienda B lo podía enviar, y los updates también iban por
  `id` solo. Corregido: `.eq('store_id', storeId)` en el `select` y en los **dos** `update`
  (rama `ENVIADO` y rama `RECHAZADO_SII`). Firma, reintento e idempotencia intactos.
- **Hueco 2 — reserva offline de folios rota y con carrera.** `api/sii/folios/offline` hacía
  `.lte('folio_actual', 'folio_hasta')` (compara la columna contra el literal `'folio_hasta'`,
  PostgREST lo castea a entero y falla) y luego leía+actualizaba sin lock: dos terminales de la
  misma tienda podían reservar el mismo rango. Nueva migración `029_reserve_folios.sql`: RPC
  `reserve_folios(uuid, integer, integer)` con `SECURITY DEFINER`, `FOR UPDATE`, guard
  `p_store_id IS DISTINCT FROM get_store_id()` y rechazo de `count <= 0`. La ruta ahora llama el
  RPC y mantiene la forma `{ success, start, end, cafXml, tipoDte }`.
- **Hueco 3 — sin unicidad de folio.** `sii_documents` solo tenía índice **no único**
  `(tipo_dte, folio)`; una carrera podía insertar folios duplicados. Nueva migración
  `030_sii_documents_folio_unique.sql`: índice único **parcial**
  `(store_id, tipo_dte, folio) WHERE (metadata->>'test') IS DISTINCT FROM 'true'`. Se excluyen
  las emisiones de prueba porque la certificación reemite los mismos folios a propósito.
- Migraciones `029` y `030` aplicadas por la **Management API** contra `bddpzqayurvhgpllykku` y
  verificadas (`pg_proc` lista el RPC con sus args; `pg_indexes` muestra el índice parcial).
- **Evidencia RPC** (JWT simulado en transacción + rollback, sin consumir folios): reserva
  devuelve `15–19` con `caf_len = 527`; tienda ajena → `No autorizado para esta tienda`;
  `count = 0` → `count debe ser mayor que cero`. `folio_actual` tipo 39 sin cambios (`15`).
- **Evidencia índice** (transacción + rollback): duplicado real → `23505` en
  `sii_documents_store_folio_key`; dos filas `metadata.test = true` con el mismo folio → pasan,
  exentas; sin leftovers.
- Harness: `db-contract.ts` ahora verifica que la ruta offline use `.rpc('reserve_folios')` y
  que la migración defina la función (**53/53 PASS**); el doble de Supabase en `e2e-emision.ts`
  soporta `.eq(...).eq(...)` encadenado en select y update (**20/20 PASS**).
- Resultado: `tsc` app+harness limpio; `eslint` sin regresiones (el `catch (error: any)` de
  `folios/offline/route.ts:44` es el mismo patrón preexistente de 42 rutas de `api/**`, incl.
  sus hermanas `sii/*`); XSD **8/8 · lote · control**; paridad **0 FAIL**; encoding **23/23**;
  recepción **12/12**; payload POS **19/19**; PDF417 **5/5**; PDF datos **5/5**; contrato BD
  **53/53**; e2e emisión **20/20**.
- **Huecos que siguen (fuera de este tramo):** la segunda tienda
  (`45be9c55-…`) no tiene `sii_config`, CAF ni certificado; `get_store_by_domain` usa
  `p_host LIKE s.subdomain || '.%'`, que acepta sufijos arbitrarios (no filtra documentos —RLS
  usa el perfil— pero sirve contexto de tienda en hosts no autorizados); el link
  `SiiCertificationPanel.tsx:161` apunta a `/api/sii/document/{id}/xml`, ruta inexistente.

### 2026-11-07 — Tramo 12: el PDF lee el XML firmado, no un mapeo paralelo
- Bug real en `api/sii/documentos/[id]/pdf/route.ts`: leía `Emisor.DirOrigin` (la plantilla
  emite `DirOrigen`) y `Emisor.GiroEmis` (las boletas emiten `GiroEmisor` desde el tramo 7). Toda
  boleta impresa salía con **"Giro no especificado"** y **"Dirección no especificada"**.
- Nuevo `src/lib/sii/pdf-datos.ts` (`extraerDatosPdf()`): único lugar que traduce
  `sii_documents.xml_content` → datos del PDF. Acepta los dos juegos de nombres
  (`RznSocEmisor`/`GiroEmisor` para boletas, `RznSoc`/`GiroEmis` para facturas), tolera
  `<DTE><Documento>` y `<Documento>` suelto, y convierte números (fast-xml-parser puede devolver
  texto).
- El timbre se recorta del XML **original** con regex, no del árbol parseado: fast-xml-parser
  normaliza espacios y comillas y el TED impreso debe ser byte a byte el firmado. Si el XML no
  trae `<TED>`, `extraerDatosPdf()` lanza error → el PDF **no** se imprime sin timbre.
- `pdf-generator.ts`: `tipoDte` opcional y título por tipo (39/41 boleta, 33 factura, 61/56 notas,
  52 guía). Antes todo se imprimía como "BOLETA ELECTRÓNICA".
- `route.ts`: usa el helper, `catch` sin `any`, y el archivo se llama
  `dte_<tipo>_F<folio>.pdf` (antes `boleta_<folio>.pdf` para cualquier tipo).
- Harness `scripts/pdf-datos.ts`: XML generado por las plantillas reales → 9 checks por caso
  (tipo, folio, giro, dirección, RUT, razón social de la tienda, items, total, y **timbre igual
  al TED firmado en ISO-8859-1**) + 2 controles negativos (XML sin `<TED>`, XML que no es DTE).
  Resultado **5/5 PASS · controles PASS** (`REPORTE-PDF-DATOS.md`).
- Resultado: `tsc` limpio app+harness; `eslint` 0 errores en los archivos tocados (1 warning
  preexistente en `loadImageBW`); XSD **8/8 · lote · control**; paridad **0 FAIL**.
- **Hallazgo fuera de scope (no corregido):** `PosReceiptModal` pide
  `/api/sii/documentos/${orderData.id}/pdf`, pero `orderData` es la orden local del POS
  (`(pos)/pos/page.tsx:989`), no una fila de `sii_documents`. El botón "Imprimir" del POS
  devuelve 404 hasta que la cola offline se sincronice y la orden apunte a su `documentId`.

### 2026-11-06 (septies) — Tramo 11: timbre impreso = PDF417 (no QR)
- Hueco real: `pdf-generator.ts` imprimía el TED como **QR**. El SII no valida la firma del
  timbre leyendo el XML: lee el código de barras impreso y verifica la firma sobre **esos
  bytes** (`@devlas/dte-sii/cert/MuestrasImpresas.js`). QR como timbre → documento rechazado.
- Nuevo `src/lib/sii/pdf417.ts` (`generarTimbrePdf417()`):
  - `binarytext: true` para que bwip-js tome cada caracter como byte ISO-8859-1; sin eso
    convierte a UTF-8 y `ñ` pasa de 0xF1 a 0xC3 0xB1 (bytes distintos a los firmados);
  - `PDF417_MAX_BYTES = 1113` (capacidad en compactación por bytes) con error explícito si el
    TED no cabe, en vez de imprimir un timbre ilegible;
  - `columns = 16`, `ecclevel = 2`, `scale = 3` → símbolo 1035×471 px, proporción 2.2:1.
- `pdf-generator.ts`: timbre PDF417 a 72 mm de ancho (32.7 mm de alto) en lugar del QR de 40 mm.
- **Hallazgo de fondo**: el CAF sintético del harness usaba RSA-2048 y el TED pesaba 1512 B →
  ningún PDF417 lo admite (máx 1113 B). El SII emite CAF con llave de **1024 bits**; las
  fixtures pasaron a 1024 y el TED bajó a 993–1009 B (`make-fixtures.ts`:
  `generateSeededKeyPair(bits = 2048)`, CAF con 1024).
- Nuevo harness `dte-parity/scripts/pdf417-roundtrip.ts`: TED del motor →
  `generarTimbrePdf417()` → PNG → `@zxing/library` → comparación byte a byte contra el TED en
  ISO-8859-1, más control de capacidad y control de acentos. Resultado **5/5 PASS · controles
  PASS** (`REPORTE-PDF417.md`).
- `bwip-js@4.11.4` en la app y en el harness; `@zxing/library` + `pngjs` solo en el harness.
- Tipos: `export =` de bwip-js solo expone `.d.ts` por condición (`browser`/`node`/...), que
  `moduleResolution: bundler` no resuelve → declaración mínima en `src/types/bwip-js.d.ts`
  (solo el encoder PDF417). El harness incluye ese `.d.ts` en su `tsconfig`.
- PDF real generado con `generateBoletaPdf()`: jsPDF embebe el PNG (1 imagen, ~490 KB).
- Resultado: `tsc` limpio app+harness, `eslint` sin errores nuevos, XSD **8/8 · lote · control**,
  paridad **0 FAIL**.
- **Riesgo abierto:** el PDF417 mide 72×32.7 mm y arranca a 4 mm del borde izquierdo.
  `MuestrasImpresas.js` describe muestras de referencia con 2 cm de margen izquierdo; para
  boleta de 80 mm hay que confirmarlo con una impresión real antes de certificar.

### 2026-11-06 (quater) — Tramo 8: sobre completo (`EnvioDTE` / `EnvioBOLETA`)
- `envio.ts` reescrito. Antes: armaba siempre `EnvioBOLETA`, usaba `config.nroResol || '0'`
  (rompía con `0`) y dejaba la firma del `Documento` calculada antes de envolver.
- Ahora:
  - elige el sobre por tipo (`EnvioDTE_v10.xsd` para 33/52/56/61, `EnvioBOLETA_v11.xsd` para
    39/41) y su `xsi:schemaLocation`;
  - **descarta la firma vieja** de cada `<DTE>` y **re-firma cada `<Documento>` ya envuelto**
    (la C14N inclusiva hereda namespaces: firmar antes de envolver invalida el digest);
  - `TmstFirmaEnv` en hora de Chile (`America/Santiago`) en vez de UTC;
  - `RutReceptor` parametrizable (default `66666666-6`), `SubTotDTE` agrupado por tipo.
- La firma del `SetDTE` sigue siendo responsabilidad del llamador (`engine.ts:356`), así el
  flujo de producción no cambia: `generateEnvioXml` → `signXml(envio, 'SetDTE')`.
- `signer.signXml(xml, tag, occurrence)` acepta índice y **siempre** usa XPath indexado. El
  comodín sin índice, con varios `<Documento>` en un sobre, hacía que xml-crypto creara una
  `<Reference>` por coincidencia (firma con 2 referencias → XSD inválido).
- `validate-xsd.ts` ahora valida **dos niveles**: `<DTE>` suelto contra `DTE_v10.xsd` (solo
  facturas) y el sobre completo contra `EnvioDTE_v10.xsd` / `EnvioBOLETA_v11.xsd`, más la
  verificación criptográfica de todas las firmas.
- Añadido caso **lote**: 2 boletas en un mismo sobre → `PASS`, 3 firmas (2 `Documento` +
  1 `SetDTE`).
- Resultado: **5/5 PASS** por caso, **lote PASS**. `REPORTE-XSD.md` con la tabla.

### 2026-12-DD — Fase 1
- Tipos probados:
- Digest coincide: sí/no
- Diferencias encontradas:
- Archivos: scratch/dte-parity/…

### 2026-12-DD — Fase 2
### 2026-12-DD — Fase 3
### 2026-12-DD — Fase 4
- TrackID certificación:
- SETMAIL:
- Primera boleta producción (folio/fecha):
```
