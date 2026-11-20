# Onboarding DTE - Guía Completa

**Creado:** 2026-11-13  
**Estado:** Planificación  
**Implementación:** Wizard pendiente (estimado: 2-3 días)

---

## Tabla de Contenidos

1. [Estado Actual del Motor DTE](#1-estado-actual-del-motor-dte)
2. [Flujo de Onboarding de Clientes](#2-flujo-de-onboarding-de-clientes)
3. [Responsabilidades](#3-responsabilidades)
4. [Tiempos Estimados](#4-tiempos-estimados)
5. [Wizard de Onboarding](#5-wizard-de-onboarding)
6. [Checklist de Implementación](#6-checklist-de-implementación)

---

## 1. Estado Actual del Motor DTE

### Lo que ya funciona ✅

```mermaid
graph LR
    A[P0: Multi-tenant] -->|14 queries scopeados| B[P1: Borrar tiendas]
    B -->|migración 031| C[P2: Robustez]
    C -->|13 gaps cerrados| D[Motor listo]
    D -->|21/21 tests| E[✅ Validado]
    
    style E fill:#90EE90
```

**P0 - Multi-tenant (completado)**
- ✅ 14 queries con scope por tienda
- ✅ EditorProvider.tsx aislado
- ✅ 0 fugas de datos entre tiendas

**P1 - Gestión de tiendas (completado)**
- ✅ Migración 031 aplicada
- ✅ Columna `is_demo` agregada
- ✅ Función `delete_store()` con verificación de roles

**P2 - Robustez (completado)**
- ✅ Fechas en hora Chile (7 sitios)
- ✅ Envío SII correcto (3 bugs)
- ✅ Validación certificado (1 bug)
- ✅ Motor robusto (3 bugs)
- ✅ DB fixes (migración 032)

**Tests**
- ✅ Harness `motor-cableado.ts`: 21/21 PASS
- ✅ TypeScript: 0 errores
- ✅ ESLint: 0 errores nuevos

---

## 2. Flujo de Onboarding de Clientes

### Escenario A: Cliente nuevo (nunca ha emitido DTE)

**Tiempo total: 2-3 semanas** (cuello de botella es el SII, no YAHPOS!)

```mermaid
gantt
    title Onboarding Cliente Nuevo
    dateFormat YYYY-MM-DD
    
    section Cliente (1-2 días)
    Obtener .pfx en notaría          :a1, 2026-01-01, 2d
    Postular certificación SII       :a2, after a1, 1d
    
    section SII (1-2 semanas)
    SII revisa casos prueba          :crit, a3, after a2, 7d
    SII emite resolución             :crit, a4, after a3, 3d
    
    section YAHPOS! (1 día)
    Cargar .pfx + CAF + resolución   :b1, after a4, 1d
    Emitir primer DTE real           :b2, after b1, 1h
```

### Escenario B: Cliente migrando desde otro software

**Tiempo total: 1-3 días** (con wizard: 30 minutos)

```mermaid
gantt
    title Migración Cliente Existente
    dateFormat YYYY-MM-DD
    
    section Cliente (1 día)
    Exportar DTEs anteriores         :a1, 2026-01-01, 1d
    Obtener .pfx actual              :a2, 2026-01-01, 1d
    
    section YAHPOS! (1 día)
    Cargar configuración             :b1, after a2, 4h
    Verificar CAF                    :b2, after b1, 2h
    Emitir primer DTE real           :b3, after b2, 1h
```

### Flujo detallado paso a paso

```mermaid
sequenceDiagram
    participant Cliente
    participant YAHPOS!
    participant SII
    
    Note over Cliente,SII: Fase 1: Requisitos previos
    
    Cliente->>Cliente: Obtener .pfx en notaría ($30K-80K)
    Cliente->>YAHPOS!: Subir .pfx + contraseña
    YAHPOS!->>YAHPOS!: Validar formato, vigencia, extraer RUT
    YAHPOS!->>YAHPOS!: Cifrar con AES-256-CBC
    YAHPOS!->>YAHPOS!: Guardar en sii_config
    YAHPOS!->>Cliente: ✅ Certificado cargado (RUT 76.123.456-7)
    
    Note over Cliente,SII: Fase 2: CAF (folios)
    
    Cliente->>YAHPOS!: Solicitar CAF (tipo 39, folios 1-100)
    YAHPOS!->>YAHPOS!: Generar XML solicitud
    YAHPOS!->>YAHPOS!: Firmar con .pfx
    YAHPOS!->>SII: POST /DTEWS/CAP/1.0
    SII->>SII: Validar firma + RUT
    SII-->>YAHPOS!: XML CAF firmado
    YAHPOS!->>YAHPOS!: Parsear CAF, extraer folios
    YAHPOS!->>YAHPOS!: Cifrar CAF
    YAHPOS!->>YAHPOS!: Guardar en sii_folios
    YAHPOS!->>Cliente: ✅ CAF cargado (folios 1-100)
    
    Note over Cliente,SII: Fase 3: Resolución SII
    
    Cliente->>YAHPOS!: Ingresar número resolución + fecha
    YAHPOS!->>YAHPOS!: Validar formato
    YAHPOS!->>YAHPOS!: Guardar en sii_config
    YAHPOS!->>Cliente: ✅ Resolución configurada
    
    Note over Cliente,SII: Fase 4: Certificación
    
    Cliente->>YAHPOS!: Iniciar certificación (ambiente Maullín)
    loop Por cada caso de prueba
        YAHPOS!->>YAHPOS!: Generar DTE prueba
        YAHPOS!->>YAHPOS!: Firmar + timbrar
        YAHPOS!->>SII: POST /DTEUpload
        SII-->>YAHPOS!: trackId
        YAHPOS!->>SII: GET /estado/{trackId}
        SII-->>YAHPOS!: ACEPTADO/RECHAZADO
        YAHPOS!->>YAHPOS!: Actualizar sii_documents.estado_sii
        YAHPOS!->>Cliente: ✅ Caso aprobado / ❌ Error: [detalle]
    end
    YAHPOS!->>Cliente: ✅ Certificación completa
    
    Note over Cliente,SII: Fase 5: Producción
    
    Cliente->>SII: Solicitar resolución producción
    SII-->>Cliente: Resolución + fecha + número
    Cliente->>YAHPOS!: Ingresar resolución producción
    YAHPOS!->>YAHPOS!: Cambiar environment a 'production'
    YAHPOS!->>YAHPOS!: Solicitar CAF producción
    YAHPOS!->>Cliente: ✅ Listo para emitir DTE reales
```

---

## 3. Responsabilidades

### División de responsabilidades

```mermaid
graph TB
    subgraph Cliente["Cliente (Emisor Tributario)"]
        C1[Obtener .pfx en notaría]
        C2[Pagar notaría ($30K-80K/año)]
        C3[Postular a certificación SII]
        C4[Ingresar resolución a YAHPOS!]
        C5[Responsable tributario ante SII]
    end
    
    subgraph YAHPOS["YAHPOS! (Software)"]
        Y1[Recibir .pfx cifrado]
        Y2[Generar XML DTE]
        Y3[Firmar con .pfx]
        Y4[Timbrar con CAF]
        Y5[Enviar al SII]
        Y6[Almacenar DTE cifrado]
        Y7[Polling estado SII]
        Y8[Reportar errores]
    end
    
    subgraph SII["SII (Autoridad)"]
        S1[Emitir certificado digital]
        S2[Autorizar CAF (folios)]
        S3[Recibir DTE]
        S4[Revisar certificación]
        S5[Emitir resolución producción]
        S6[Aceptar/rechazar DTE]
    end
    
    C1 --> Y1
    Y1 -.cifrado AES-256.-> Y2
    Y2 --> Y3
    Y3 --> Y4
    Y4 --> Y5
    Y5 --> S3
    S3 --> S6
    S1 --> C1
    S2 --> Y4
    S4 --> Y5
    C3 --> S4
    S5 --> C4
    C4 --> Y1
    C5 -.Responsabilidad legal.-> S6
```

### Qué NO puede hacer YAHPOS!

```mermaid
graph TD
    A[YAHPOS! NO puede] --> B[Acelerar revisión del SII]
    A --> C[Aprobar certificación]
    A --> D[Emitir resolución]
    A --> E[Asumir responsabilidad tributaria]
    
    F[YAHPOS! SÍ puede] --> G[Automatizar generación XML]
    F --> H[Firmar y timbrar]
    F --> I[Enviar al SII]
    F --> J[Reportar errores]
    
    style A fill:#FFB6C1
    style F fill:#90EE90
```

---

## 4. Tiempos Estimados

### Comparación con competencia

| Software | Migración (cliente certificado) | Primera vez | Wizard automático |
|----------|--------------------------------|-------------|-------------------|
| **YAHPOS! (hoy)** | 1 día | 2-3 semanas | ❌ No |
| **YAHPOS! (con wizard)** | 30 min | 2-3 semanas | ✅ Sí |
| **SharkPos** | 1 hora | 2-3 semanas | ✅ Sí |
| **LibreDTE** | 1 día | 2-3 semanas | ❌ No |

**Conclusión:** El cuello de botella es el SII (2-3 semanas para clientes nuevos), no el software.

### Línea de tiempo realista

```mermaid
gantt
    title Línea de Tiempo Onboarding
    dateFormat YYYY-MM-DD
    
    section Cliente nuevo (2-3 semanas)
    Obtener .pfx                    :a1, 2026-01-01, 3d
    Postular certificación          :a2, after a1, 1d
    SII revisa casos                :crit, a3, after a2, 7d
    SII emite resolución            :crit, a4, after a3, 3d
    Cargar en YAHPOS!               :b1, after a4, 1d
    Emitir primer DTE               :b2, after b1, 1h
    
    section Cliente migrando (1-3 días)
    Exportar datos anteriores       :c1, 2026-01-01, 1d
    Obtener .pfx actual             :c2, 2026-01-01, 1d
    Cargar en YAHPOS!               :d1, after c2, 4h
    Verificar CAF                   :d2, after d1, 2h
    Emitir primer DTE               :d3, after d2, 1h
    
    section Cliente migrando CON WIZARD (30 min)
    Wizard completo                 :e1, 2026-01-01, 30min
    Emitir primer DTE               :e2, after e1, 5min
```

---

## 5. Wizard de Onboarding

### Concepto

**Wizard = asistente paso a paso en la UI** que guía al cliente por el onboarding con validación automática en cada etapa.

### Flujo del wizard

```mermaid
sequenceDiagram
    participant Cliente
    participant Wizard UI
    participant Backend
    participant SII
    
    Cliente->>Wizard UI: Click "Configurar facturación electrónica"
    
    rect rgb(240, 248, 255)
    Note over Cliente,Backend: Paso 1: Certificado digital
    Wizard UI->>Cliente: "Sube tu archivo .pfx"
    Cliente->>Wizard UI: Upload archivo + contraseña
    Wizard UI->>Backend: POST /api/wizard/certificado
    Backend->>Backend: Validar .pfx, extraer RUT, verificar vigencia
    Backend-->>Wizard UI: ✅ RUT 76.123.456-7, vence 2027-03-15
    Wizard UI->>Cliente: Mostrar RUT + fecha vencimiento
    end
    
    rect rgb(240, 255, 240)
    Note over Cliente,SII: Paso 2: CAF (folios)
    Wizard UI->>Cliente: "¿Ya tienes CAF o lo solicitamos al SII?"
    
    alt Cliente ya tiene CAF
        Cliente->>Wizard UI: Upload XML CAF
        Wizard UI->>Backend: POST /api/wizard/caf
        Backend->>Backend: Parsear CAF, validar firma, extraer folios
        Backend-->>Wizard UI: ✅ Folios 1-100 para tipo 39
    else Cliente necesita CAF nuevo
        Wizard UI->>Backend: POST /api/wizard/caf/solicitar
        Backend->>Backend: Generar XML solicitud, firmar con .pfx
        Backend->>SII: SOAP /DTEWS/CAP/1.0
        SII-->>Backend: XML CAF firmado
        Backend-->>Wizard UI: ✅ CAF guardado, folios 1-100
    end
    end
    
    rect rgb(255, 248, 240)
    Note over Cliente,Backend: Paso 3: Resolución SII
    Wizard UI->>Cliente: "Ingresa tu resolución del SII"
    Cliente->>Wizard UI: Número + fecha
    Wizard UI->>Backend: POST /api/wizard/resolucion
    Backend->>Backend: Validar formato, guardar en sii_config
    Backend-->>Wizard UI: ✅ Configuración completa
    Wizard UI->>Cliente: "Ya puedes emitir DTE"
    end
    
    Wizard UI->>Cliente: Mostrar botón "Ir a facturación"
```

### Arquitectura técnica

```mermaid
graph TD
    subgraph Frontend
        A[wizard/page.tsx] --> B[Step 1: Certificado]
        B --> C[Step 2: CAF]
        C --> D[Step 3: Resolución]
        D --> E[Step 4: Prueba]
        
        A --> F[wizard/useWizard.ts]
        F --> G[Estado global]
        G --> H[Validación por paso]
    end
    
    subgraph Backend
        A --> I[wizard/api/]
        I --> J[POST /certificado]
        I --> K[POST /caf]
        I --> L[POST /resolucion]
        I --> M[POST /prueba]
    end
    
    subgraph DB
        J --> N[sii_config]
        K --> O[sii_folios]
        L --> N
        M --> P[sii_documents]
    end
    
    style A fill:#E6F3FF
    style I fill:#E6FFE6
    style N fill:#FFF4E6
```

### Archivos a crear

**Frontend:**
```
src/app/admin/configuracion/dte/wizard/
├── page.tsx                    # Página principal del wizard
├── steps/
│   ├── CertificadoStep.tsx     # Paso 1: Upload .pfx
│   ├── CafStep.tsx             # Paso 2: Cargar/solicitar CAF
│   ├── ResolucionStep.tsx      # Paso 3: Ingresar resolución
│   └── PruebaStep.tsx          # Paso 4: Emitir DTE prueba
├── components/
│   ├── ProgressBar.tsx         # Barra de progreso
│   ├── StepNavigation.tsx      # Navegación entre pasos
│   └── ValidationFeedback.tsx  # Feedback de validación
└── hooks/
    └── useWizard.ts            # Estado global del wizard
```

**Backend:**
```
src/app/api/wizard/
├── certificado/
│   └── route.ts                # POST: Subir y validar .pfx
├── caf/
│   ├── route.ts                # POST: Cargar CAF existente
│   └── solicitar/
│       └── route.ts            # POST: Solicitar CAF al SII
├── resolucion/
│   └── route.ts                # POST: Guardar resolución
└── prueba/
    └── route.ts                # POST: Emitir DTE de prueba
```

### Beneficios del wizard

| Aspecto | Sin wizard | Con wizard |
|---------|-----------|-----------|
| Cliente sabe qué hacer | ❌ Lee docs, pregunta a soporte | ✅ Paso a paso con validación |
| Tiempo configuración (cliente certificado) | 1 día | 30 minutos |
| Validación automática | ❌ Manual, después de subir | ✅ En cada paso |
| Experiencia usuario | ❌ Fragmentada, confusa | ✅ Fluida, guiada |
| Implementación | — | 2-3 días de desarrollo |

---

## 6. Checklist de Implementación

### Fase 1: Wizard básico (marzo)

**Frontend:**
- [ ] Crear `wizard/page.tsx` con estructura de pasos
- [ ] Implementar `CertificadoStep.tsx` con upload drag-and-drop
- [ ] Implementar `CafStep.tsx` con opción manual + automática
- [ ] Implementar `ResolucionStep.tsx` con validación
- [ ] Implementar `PruebaStep.tsx` con emisión de DTE test
- [ ] Crear `ProgressBar.tsx` visual
- [ ] Crear `useWizard.ts` hook para estado global

**Backend:**
- [ ] Crear endpoint `POST /api/wizard/certificado`
- [ ] Crear endpoint `POST /api/wizard/caf` (manual)
- [ ] Crear endpoint `POST /api/wizard/caf/solicitar` (automático)
- [ ] Crear endpoint `POST /api/wizard/resolucion`
- [ ] Crear endpoint `POST /api/wizard/prueba`

**Testing:**
- [ ] Probar con cliente certificado (migración)
- [ ] Probar con cliente nuevo (certificación completa)
- [ ] Validar que .pfx vencido sea rechazado
- [ ] Validar que CAF inválido sea rechazado
- [ ] Validar que resolución mal formada sea rechazada

### Fase 2: Mejoras UX (abril)

- [ ] Agregar tooltips explicativos en cada paso
- [ ] Agregar link a notaría recomendada
- [ ] Agregar descarga de XML solicitud CAF
- [ ] Agregar modo "prueba" mientras espera certificación
- [ ] Agregar exportación de DTEs para migración

### Fase 3: Automatización avanzada (mayo)

- [ ] Detección automática de resolución desde portal SII
- [ ] Importación masiva de DTEs desde otros software
- [ ] Notificaciones automáticas cuando SII aprueba
- [ ] Dashboard de progreso de certificación

---

## 7. Preguntas Frecuentes

### ¿Cuánto cuesta para el cliente?

| Concepto | Costo | Quién paga |
|----------|-------|-----------|
| Certificado .pfx | $30K-80K/año | Cliente |
| Suscripción YAHPOS! | $15K-50K/mes | Cliente |
| Folios SII | Gratis | SII |
| Certificación SII | Gratis | SII |
| **Total** | **$45K-130K/mes** | **Cliente** |

### ¿YAHPOS! puede emitir por el cliente?

**No.** YAHPOS! es solo software. El responsable tributario siempre es el RUT emisor (cliente). Si el SII rechaza un DTE, el rechazo cae sobre el cliente, no sobre YAHPOS!.

### ¿Qué pasa si el cliente quiere cambiar de software?

- YAHPOS! exporta todos los DTE en XML
- Cliente puede migrar a otro software
- Folios usados quedan registrados en SII
- Certificado .pfx sigue siendo del cliente (no de YAHPOS!)

### ¿Por qué tarda 2-3 semanas un cliente nuevo?

Porque el SII (Servicio de Impuestos Internos) revisa manualmente los casos de certificación. Ese tiempo es **ley chilena**, no depende de YAHPOS!. Cualquier software (SharkPos, LibreDTE, etc.) tiene los mismos tiempos.

### ¿Puedo usar YAHPOS! antes de certificarme?

Sí, en modo "prueba". Puedes:
- Emitir DTEs internos (no se envían al SII)
- Probar el flujo completo
- Entrenar al personal
- Cuando SII apruebe, activar emisión real

---

## 8. Referencias

**Documentos técnicos:**
- `docs/planes/PLAN_MOTOR_DTE_DICIEMBRE_2026.md` - Plan maestro del motor DTE
- `docs/integraciones/sharkpos-api.md` - Evaluación de SharkPos vs motor propio
- `supabase/migrations/031_store_delete_and_demo.sql` - Gestión de tiendas
- `supabase/migrations/032_sii_db_fixes.sql` - Fixes de robustez

**Recursos externos:**
- [SII - Factura Electrónica](https://www.sii.cl/factura_electronica/)
- [SII - Etapas para emitir DTE](https://www.sii.cl/destacados/factura_electronica/factura_etapas_5.html)
- [SII - Perfil usuario Solicitar Folios](https://www.sii.cl/destacados/factura_electronica/factura_etapas_4.html)

---

**Última actualización:** 2026-11-13  
**Próxima revisión:** Después de implementar wizard (marzo 2026)
