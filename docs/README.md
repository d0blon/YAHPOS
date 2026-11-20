# Documentación — YAHPOS!

**Índice maestro.** Todo lo que no sea protocolo vivo está acá.

**Última reorganización:** 2026-10-29. Se movieron 24 documentos que estaban sueltos en la raíz
del proyecto a las carpetas de abajo. Ningún contenido fue reescrito; solo cambió de lugar.

---

## Qué queda en la raíz del proyecto (y por qué)

Estos 6 archivos **no se mueven**: son leídos por herramientas o por el protocolo de trabajo.

| Archivo | Quién lo lee |
|---|---|
| `AGENTS.md` | Protocolo del constructor. Define el pipeline de 4 fases y las zonas rojas. |
| `CLAUDE.md` | Lo lee Claude Code automáticamente al iniciar sesión. |
| `README.md` | Portada del repo. Apunta acá. |
| `BITACORA.md` | Changelog histórico. Se actualiza al cerrar cada tarea (regla 8 de `AGENTS.md`). |
| `TASK_HANDOFF.md` | Tarea activa. Lo escribe el Arquitecto, lo lee el Constructor. |
| `YAHPOS Kanban.md` | Backlog. Plugin kanban de Obsidian: si se mueve, se pierde la vista de tablero. |

---

## Orden de lectura (si es tu primera vez)

```
1º  guias/EMPIEZA_AQUI.md              → el mapa mental, sin tecnicismos
2º  guias/MANUAL_PROYECTO.md           → qué es cada cosa, en detalle
3º  guias/GUIA_CONEXIONES.md           → cómo está cableado todo
4º  guias/DECISIONES_ARQUITECTURA.md   → por qué se eligió esto y no otra cosa
5º  guias/CURRICULUM_COLABORADOR.md    → plan de estudio para arrancar de cero
6º  guias/ACCESO_Y_MAPA_COLABORADOR.md → acceso, mapa pantalla→archivo y prompt para la IA
```

Entregable para el colaborador: `docs/guias/ACCESO_Y_MAPA_COLABORADOR.md`; él se lo pasa a su IA
en modo solo lectura.

Después, según lo que necesites:

```
entender el motor DTE      → planes/PLAN_MOTOR_DTE_DICIEMBRE_2026.md
entender los pagos         → arquitectura/PAYMENTS-ARCHITECTURE.md
saber qué falta            → ../YAHPOS Kanban.md
saber qué se rompió antes  → auditorias/AUDIT_REPORT_2026-07-28.md
```

---

## `guias/` — documentación para humanos

| Documento | Qué responde |
|---|---|
| `EMPIEZA_AQUI.md` | ¿Qué es YAHPOS!, en 30 segundos y sin jerga? |
| `MANUAL_PROYECTO.md` | ¿Qué es cada módulo, tabla y pantalla? |
| `GUIA_CONEXIONES.md` | ¿Qué se conecta con qué, y qué **no** debe conectarse? |
| `DECISIONES_ARQUITECTURA.md` | ¿Por qué se decidió así? ¿Qué costó? ¿Qué regla sale de ahí? |
| `CURRICULUM_COLABORADOR.md` | Plan de estudio octubre → diciembre para alguien que parte de cero |
| `ACCESO_Y_MAPA_COLABORADOR.md` | Guía para entregar al colaborador: acceso, mapa de pantallas y prompt para su IA |

## `arquitectura/` — cómo está construido

| Documento | Contenido |
|---|---|
| `ARCHITECTURE.md` | Multi-tenancy: middleware, resolución de tienda, núcleo de seguridad |
| `ARCHITECTURE_DYNAMIC_THEMING.md` | Branding por tenant: qué funciona y qué quedó a medias |
| `PAYMENTS-ARCHITECTURE.md` | Pasarelas, vouchers, comisiones, IVA, flujos de pago (45 KB, el más completo) |
| `sii/DOCS_TECNICOS_FINAL.md` | Flujo del motor DTE/SII tal como está escrito hoy |

## `planes/` — qué se va a hacer

| Documento | Estado |
|---|---|
| `PLAN_MOTOR_DTE_DICIEMBRE_2026.md` | **Vigente.** Plan de ejecución del motor DTE, multi-tenancy y riesgos (§1–§14) |
| `MAPA_MAESTRO_MISIONES_PENDIENTES.md` | Histórico (abril 2026). Superado en parte por el Kanban |
| `IMPLEMENTATION_PLAN.md` | Histórico (mayo 2026). Bugs de memoria y limpieza de efectos |
| `plan-implementacion-ecommerce-yhapos.md` | Histórico (mayo 2026). Rediseño del e-commerce |
| `PLAN_LIMPIEZA_CATALOGO.md` | Pipeline de limpieza del catálogo global (40k SKU) |

## `auditorias/` — qué se encontró

| Documento | Contenido |
|---|---|
| `AUDIT_REPORT_2026-07-28.md` | Auditoría estructural del código (245 archivos). El mejor material didáctico del repo |
| `REVISION_DISENO.md` | Checklist de revisión visual y funcional |
| `simulation-report.md` | Reporte de una simulación de certificación SII — **era MOCK**, no es evidencia de emisión real |

> `simulation-report.md` está listado en `.gitignore` porque lo regenera
> `scripts/generate-simulation-report.ts` en la raíz. Si lo volvés a generar, no lo muevas acá:
> deja las dos copias y esta entrada explica la diferencia.

## `operacion/` — cómo se opera y se trabaja

| Documento | Contenido |
|---|---|
| `manual_instalacion.md` | Onboarding de un cliente nuevo, 5 pasos |
| `WALKTHROUGH.md` | Recorrido por las features implementadas (roles, facturación, SaaS) |
| `task.md` | Lista de tareas de mayo 2026, mayormente completada |
| `CONTEXT_FOR_CLAUDE.md` | Traspaso puntual sobre el catálogo maestro |
| `COLLABORATION_PROTOCOL.md` | Reparto de roles entre agentes (histórico) |
| `PROTOCOLO_CAZABUGS.md` | **Vigente.** Flujo conjunto, modo IA «solo anotar», plantillas y riesgo |
| `TAREAS_COLABORADOR.md` | Tablero de tareas que el dueño asigna (búsqueda visual/lógica) |
| `REGISTRO_BUGS.md` | **Fuente única de verdad.** Hallazgos `HAL-###`, bugs abiertos, diferidos y cerrados |
| `INSTRUCCIONES_PARA_OPENCODE.md` | Encargo original de la limpieza de catálogo |

## `archivo/` — no leer salvo que busques historia

| Documento | Por qué está acá |
|---|---|
| `AGENTS_secciones_obsoletas_2026-07-28.md` | Texto viejo de `AGENTS.md`, conservado por trazabilidad |
| `CHECKLIST_DETALLADO.md` | Checklist de abril 2026, superado |
| `PLAN_DE_TRABAJO_OPENCODE.md` | Plan de mayo 2026, superado |
| `session-ses_2182.md` | Volcado de una sesión de IA (304 KB). Sin procesar |
| `2026-09-22.md` | Archivo vacío (0 bytes). Se conserva solo para no perder el rastro |

---

## Mapa de rutas viejas → nuevas

Si encontrás una referencia a una ruta vieja (en un commit, en un mensaje, en un doc de archivo),
esta tabla la resuelve. También sirve para entender por qué `BITACORA.md` menciona rutas que ya
no existen.

| Antes | Ahora |
|---|---|
| `./EMPIEZA_AQUI.md` | `docs/guias/EMPIEZA_AQUI.md` |
| `./MANUAL_PROYECTO.md` | `docs/guias/MANUAL_PROYECTO.md` |
| `./GUIA_CONEXIONES.md` | `docs/guias/GUIA_CONEXIONES.md` |
| `./DECISIONES_ARQUITECTURA.md` | `docs/guias/DECISIONES_ARQUITECTURA.md` |
| `./CURRICULUM_COLABORADOR.md` | `docs/guias/CURRICULUM_COLABORADOR.md` |
| `./ARCHITECTURE.md` | `docs/arquitectura/ARCHITECTURE.md` |
| `./ARCHITECTURE_DYNAMIC_THEMING.md` | `docs/arquitectura/ARCHITECTURE_DYNAMIC_THEMING.md` |
| `docs/PAYMENTS-ARCHITECTURE.md` | `docs/arquitectura/PAYMENTS-ARCHITECTURE.md` |
| `src/lib/sii/DOCS_TECNICOS_FINAL.md` | `docs/arquitectura/sii/DOCS_TECNICOS_FINAL.md` |
| `docs/PLAN_MOTOR_DTE_DICIEMBRE_2026.md` | `docs/planes/PLAN_MOTOR_DTE_DICIEMBRE_2026.md` |
| `./MAPA_MAESTRO_MISIONES_PENDIENTES.md` | `docs/planes/MAPA_MAESTRO_MISIONES_PENDIENTES.md` |
| `./IMPLEMENTATION_PLAN.md` | `docs/planes/IMPLEMENTATION_PLAN.md` |
| `./plan-implementacion-ecommerce-yhapos.md` | `docs/planes/plan-implementacion-ecommerce-yhapos.md` |
| `../PLAN_LIMPIEZA_CATALOGO.md` | `docs/planes/PLAN_LIMPIEZA_CATALOGO.md` |
| `./AUDIT_REPORT_2026-07-28.md` | `docs/auditorias/AUDIT_REPORT_2026-07-28.md` |
| `./REVISION_DISENO.md` | `docs/auditorias/REVISION_DISENO.md` |
| `./simulation-report.md` | `docs/auditorias/simulation-report.md` |
| `./manual_instalacion.md` | `docs/operacion/manual_instalacion.md` |
| `./WALKTHROUGH.md` | `docs/operacion/WALKTHROUGH.md` |
| `./task.md` | `docs/operacion/task.md` |
| `./CONTEXT_FOR_CLAUDE.md` | `docs/operacion/CONTEXT_FOR_CLAUDE.md` |
| `./COLLABORATION_PROTOCOL.md` | `docs/operacion/COLLABORATION_PROTOCOL.md` |
| `../INSTRUCCIONES_PARA_OPENCODE.md` | `docs/operacion/INSTRUCCIONES_PARA_OPENCODE.md` |
| `docs/archivo/*` | `docs/archivo/*` (sin cambio) |

---

## Reglas para no volver al desorden

1. **Un documento nuevo no va a la raíz del proyecto.** Va a la carpeta que corresponda de `docs/`.
   La única excepción son los 6 archivos vivos de arriba.
2. **Fecha en el nombre** cuando el documento es de un momento puntual:
   `AUDIT_REPORT_2026-07-28.md`. Si no tiene fecha, se asume que es documentación vigente.
3. **Un documento superado no se borra: se mueve a `archivo/`** y se anota acá qué lo reemplazó.
4. **Si un plan se convierte en el plan vigente**, se anota en su fila de `planes/`. Nunca puede
   haber dos documentos diciendo ser "el plan actual".
5. **Si movés un documento**, actualizás esta tabla de rutas. Es lo único que mantiene sano el
   resto de las referencias.

---

## Pendiente (no es documentación)

El 2026-11-20 se ejecutó la limpieza del pipeline one-off de catálogo. **Ya no hay pendiente en la
raíz del workspace.**

| Elemento eliminado | Detalle |
|---|---|
| `clean_*.js`, `fix_*.js`, `upload_*.js` | Scripts one-off de catálogo |
| `maestra_productos*.json` | Volcados JSON (~40 MB en total) |
| `*.sql` | Sentencias de un solo uso |
| `scrapers/`, `pdf_parser/`, `node_modules/` | Directorios retirados de la raíz del workspace |
