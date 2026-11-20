# Integración SharkPos API — Guía Técnica

**Última actualización:** 2026-11-13  
**Status:** Evaluado, no implementado  
**Base URL:** `https://api.sharkpos.cl` (producción) / `https://sandbox.sharkpos.cl` (pruebas)

---

## 1. Resumen Ejecutivo

SharkPos es una API REST chilena de facturación electrónica SII. Recibe JSON, devuelve DTE firmado y timbrado. **No maneja XML, firma, CAF ni SOAP.**

### Comparación con motor propio

| Aspecto | Motor propio | SharkPos |
|---------|-------------|----------|
| Desarrollo | Meses (motor, XSD, firma, SOAP, webhooks) | Horas (1 endpoint por DTE) |
| Mantenimiento | Constante (cambios SII, certificados, CAF) | Cero |
| Costo | Infra + tiempo dev | $5.990/mes por RUT emisor |
| Control | Total | API externa |
| Complejidad | Alta (13+ gaps mapeados) | Baja (JSON in, JSON out) |

### Precios (IVA incluido)

| RUTs emisores | Costo mensual |
|---------------|---------------|
| 1 RUT | $5.990 |
| 5 RUT | $29.950 |
| 10 RUT | $59.900 |
| 50 RUT | $299.500 |

### Análisis de costo para YAHPOS!

Modelo de negocio: SaaS con DTE incluido en suscripción. SharkPos se comería la margen del plan más barato.

| Tiendas | SharkPos (1 RUT c/u) | Plan YAHPOS! básico |
|---------|---------------------|---------------------|
| 10 | $60K/mes | incluido |
| 50 | $300K/mes | incluido |
| 100 | $600K/mes | incluido |

Con 10 tiendas a $15K/mes, YAHPOS! gana $90K; SharkPos dejaría $30K de margen.  
Con 50 tiendas, motor propio deja $650K de margen bruto.

**Conclusión:** motor propio es la única opción rentable. SharkPos solo serviría si quisiéramos lanzar YA sin mantener el motor.

---

## 2. Características Clave

### Autenticación

```http
Authorization: Bearer <API_KEY>
Content-Type: application/json
Idempotency-Key: <id estable de la venta>   # obligatorio en emisiones
```

- API key va solo en backend (variable de entorno `SHARKPOS_API_KEY`)
- RUT emisor **nunca va en el body** (sale de la API key)
- Cada RUT emisor tiene su propia key

### Idempotencia

`Idempotency-Key` estable por venta (8-128 caracteres). Usar identificador de venta en el sistema (`venta-884`, `mesa-12-cuenta-884`), **NO** UUID nuevo por intento.

Ante error de red/5xx/429: reintentar con **misma** `Idempotency-Key` y mismo body. Nunca emitir de nuevo con otra key (duplicaría venta ante SII).

### Sandbox

Base URL `https://sandbox.sharkpos.cl`. API key de prueba dura 2/6/24 horas (renovable con mismo email). Contrato idéntico a producción.

### Documentos soportados

| Documento | Endpoint |
|-----------|----------|
| Boleta afecta 39 / exenta 41 | `POST /api/v1/dte/boleta/emit/` (`document_type`: 39 o 41) |
| Factura 33 | `POST /api/v1/dte/factura/emit/` |
| Factura exenta 34 | `POST /api/v1/dte/factura-exenta/emit/` |
| Nota de crédito 61 | `POST /api/v1/dte/nota-credito/emit/` |
| Nota de débito 56 | `POST /api/v1/dte/nota-debito/emit/` |
| Guía de despacho 52 | `POST /api/v1/dte/guia-despacho/emit/` |
| Anular guía 52 | `POST /api/v1/dte/guia-despacho/{dte_id}/void/` |
| Libro Guías Despacho | `GET /api/v1/dte/guia-despacho/libro/?period=AAAA-MM` |
| Factura compra 46 | `POST /api/v1/dte/factura-compra/emit/` |

### Webhooks

Firmados con estándar abierto **Standard Webhooks** (HMAC-SHA256).

**Eventos:**
- `dte.accepted` — SII aceptó documento
- `dte.rejected` — SII rechazó documento
- `dte.review_required` — requiere revisión manual
- `caf.folios_low` — folios por acabarse
- `caf.folios_expiring_soon` — CAF próximo a vencer

**Endpoints de registro:**
```http
POST /api/v1/dte/webhooks/          # API Key del RUT → eventos de ese RUT
POST /api/v1/partner/webhooks/      # API Key de partner → eventos de todos los RUT del partner
```

**Body ejemplo:**
```json
{
  "url": "https://api.yahpos.cl/webhooks/sharkpos",
  "description": "Producción",
  "event_types": ["dte.accepted", "dte.rejected", "dte.review_required", "caf.folios_low"]
}
```

**Respuesta 201:**
```json
{
  "status": "success",
  "webhook": {
    "id": "b1d0c0de-4f7a-4c3e-9a51-6f1f1f0c2a10",
    "url": "https://api.yahpos.cl/webhooks/sharkpos",
    "event_types": ["dte.accepted", "dte.rejected", "dte.review_required", "caf.folios_low"],
    "is_active": true,
    "secret": "whsec_kG1n2QyM0x4b3Y2c1Z5Q0x0dFh1Y2c3T1BmR3c9PQ=="
  }
}
```

**Nota:** `secret` se muestra **una sola vez**. Guardar como credencial. Si se pierde, rotar.

**Características:**
- Confiables: evento se guarda en misma transacción que cambio de estado
- Multi-RUT: plataforma partner registra 1 URL y recibe eventos de todos sus RUT
- Retries: si servidor no responde, reintenta durante ~27 horas

### Herramientas de gestión

SharkPos ofrece endpoints adicionales (no relacionados con emisión):

| Herramienta | Endpoint |
|-------------|----------|
| RCV: totales del mes | `GET /api/v1/rcv/totales/?period=AAAA-MM` |
| RCV: documento por documento | `GET /api/v1/rcv/documentos/?period=AAAA-MM` |
| Estimador de IVA (F29) | `GET /api/v1/rcv/estimador-iva/?period=AAAA-MM` |
| Bandeja facturas recibidas | `GET /api/v1/rcv/bandeja/` |
| Cuadratura con SII | `GET /api/v1/rcv/cuadratura/?period=AAAA-MM` |
| Validar RUT | `GET /api/v1/validar-rut/{rut}` |
| Indicadores (UF, UTM, dólar) | `GET /api/v1/indicadores/` |
| Calendario tributario | `GET /api/v1/calendario-tributario/` |
| Cierre de mes | `GET /api/v1/cierre-mes/?period=AAAA-MM` |
| Honorarios recibidos | `GET /api/v1/honorarios-recibidos/?period=AAAA-MM` |
| Cesión de facturas (factoring) | `GET /api/v1/cesion/` |
| Llave contador (solo lectura) | `GET /api/v1/llave-contador/` |

---

## 3. Ejemplos de Uso

### Boleta mínima

```json
POST /api/v1/dte/boleta/emit/
{
  "document_type": 39,
  "amount_total": 16980,
  "medio_pago": 1,
  "items": [
    {"name": "Ñoquis a la boloñesa", "qty": 1, "price": 8990},
    {"name": "Café cortado", "qty": 2, "price": 3995}
  ]
}
```

**Reglas:**
- Montos en pesos enteros (JSON number, no string)
- RUT como texto con guión (`12345678-5`)
- Fechas `AAAA-MM-DD`
- `amount_total` debe ser igual a suma de líneas
- Precios van con IVA incluido

### Factura (entre empresas)

Exige receptor completo:
- `receptor_rut`
- `receptor_name`
- `receptor_giro`
- `receptor_direccion`
- `receptor_comuna`

**No acepta** RUT consumidor final `66666666-6` (error `CONSUMIDOR_FINAL_NOT_ALLOWED`).

`price` es neto salvo que envíes `prices_include_iva: true`.

### Notas de crédito/débito

Llevan referencia al documento que corrigen:
- `ref_document_type`
- `ref_folio`
- `ref_date`
- `ref_code` (1 anula, 2 corrige texto, 3 corrige montos)
- `ref_reason`

### Estado de documento

```http
GET /api/v1/dte/{dte_id}/
```

**Respuesta incluye:**
- `public_status`: `queued` | `sent` | `accepted` | `rejected` | `review_required` | `failed`
- `xml` (firmado)
- `ted` (timbre)
- `pdf_url` (si aplica)

---

## 4. Flujo de Integración para YAHPOS!

### Paso 1: Emitir DTE

```typescript
const response = await fetch('https://api.sharkpos.cl/api/v1/dte/boleta/emit/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SHARKPOS_API_KEY}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': `venta-${orderId}`
  },
  body: JSON.stringify({
    document_type: 39,
    amount_total: total,
    medio_pago: medioPago,
    items: detalles
  })
});

const dte = await response.json();
// dte.id, dte.folio, dte.xml, dte.ted, dte.pdf_url
```

### Paso 2: Registrar webhook

```typescript
await fetch('https://api.sharkpos.cl/api/v1/dte/webhooks/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SHARKPOS_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://api.yahpos.cl/api/webhooks/sharkpos',
    event_types: ['dte.accepted', 'dte.rejected']
  })
});
```

### Paso 3: Endpoint webhook

```typescript
// src/app/api/webhooks/sharkpos/route.ts
import { verify as verifyWebhook } from 'standard-webhooks';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('webhook-signature');
  const webhookId = req.headers.get('webhook-id');
  const timestamp = req.headers.get('webhook-timestamp');
  
  try {
    verifyWebhook(
      process.env.SHARKPOS_WEBHOOK_SECRET!,
      body,
      {
        id: webhookId,
        timestamp: parseInt(timestamp!),
        signature: signature!
      }
    );
  } catch (e) {
    return new Response('Firma inválida', { status: 401 });
  }
  
  const event = JSON.parse(body);
  
  switch (event.type) {
    case 'dte.accepted':
      await actualizarEstado(event.data.dte_id, 'ACEPTADO');
      break;
    case 'dte.rejected':
      await actualizarEstado(event.data.dte_id, 'RECHAZADO');
      await notificarRechazo(event.data.dte_id, event.data.motivo);
      break;
    case 'caf.folios_low':
      await alertarFoliosBajos(event.data.rut_emisor);
      break;
  }
  
  return new Response('OK', { status: 200 });
}
```

### Paso 4: Manejo de errores

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  await sleep(parseInt(retryAfter!) * 1000);
  return await reintentarEmision();
}

if (response.status >= 500) {
  return await reintentarEmision(); // misma Idempotency-Key
}

if (response.status >= 400 && response.status !== 429) {
  const error = await response.json();
  // error.code, error.message, error.solution
  throw new Error(`SharkPos error: ${error.code} - ${error.message}`);
}
```

---

## 5. Reglas Críticas

1. **Empieza en sandbox.** Nunca toques SII real mientras pruebas.
2. **API key solo en backend.** Nunca en frontend ni repositorio.
3. **RUT emisor nunca va en body.** Sale de la API key.
4. **Idempotency-Key estable por venta.** No UUID nuevo por intento.
5. **Ante error de red/5xx/429: reintentar con misma key y body.** Nunca emitir de nuevo con otra key.
6. **Ante 4xx (distinto de 429): no reintentar, corregir solicitud.**
7. **Emisión síncrona, aceptación asíncrona.** Respuesta 201 trae folio/XML/timbre → entregar comprobante. Resultado SII llega por webhook.
8. **Documento `rejected`/`review_required`/`failed` no se reemplaza emitiendo otro.** Mostrar mensaje + contactar soporte con folio.
9. **Montos en pesos enteros (JSON number).** RUT como texto con guión. Fechas `AAAA-MM-DD`.
10. **No inventar campos ni endpoints.** Si no está en docs, no existe.

---

## 6. Documentación Oficial

- **Docs para developers:** https://api.sharkpos.cl/docs
- **Guía para agentes:** https://api.sharkpos.cl/docs/agentes.md
- **OpenAPI 3.1:** https://api.sharkpos.cl/docs/openapi.yaml
- **Precios:** https://api.sharkpos.cl/precios
- **Sandbox:** https://api.sharkpos.cl/sandbox
- **Contacto:** contacto@sharkpos.cl

---

## 7. Estado Actual en YAHPOS!

**Status:** Evaluado, no implementado.  
**Motivo:** modelo de negocio SaaS con DTE incluido hace inviable pagar $6K/RUT/mes.  
**Decisión:** mantener motor propio (13 gaps mapeados, en proceso de cierre).

**Próximos pasos:**
1. Cerrar P2 (13 gaps motor DTE) — en progreso
2. Certificación SII "1 intento" — objetivo febrero 2026
3. Re-evaluar SharkPos solo si motor propio resulta insostenible

---

## 8. Notas para Implementación Futura (si aplica)

Si en algún momento se decide integrar SharkPos:

1. **Crear módulo cliente:** `src/lib/sharkpos/client.ts` con métodos typed para cada endpoint.
2. **Variables de entorno:**
   - `SHARKPOS_API_KEY` (producción)
   - `SHARKPOS_API_KEY_SANDBOX` (pruebas)
   - `SHARKPOS_WEBHOOK_SECRET`
3. **Feature flag:** `USE_SHARKPOS=true/false` para alternar entre motor propio y SharkPos por tenant.
4. **Webhook endpoint:** `src/app/api/webhooks/sharkpos/route.ts` con verificación de firma.
5. **Tabla de tracking:** `sharkpos_emissions` con `dte_id`, `orderId`, `status`, `created_at`.
6. **Retry logic:** backoff exponencial para 5xx/429, max 5 intentos.
7. **Fallback:** si SharkPos falla, caer a motor propio (si está disponible).
