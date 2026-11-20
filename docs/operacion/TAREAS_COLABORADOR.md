# Tablero de tareas asignadas — colaborador

Este tablero ordena el trabajo de revisión entre el dueño, el colaborador y la IA.

## Para el dueño

Asignar **UNA tarea a la vez**. Decir **QUÉ buscar**, no **CÓMO arreglarlo**. El scope es visual/lógico: pantallas, botones, rutas de la app y flujos. No pedir nombres de archivos de código. El plazo es opcional; si se define, se indica al asignar y no es campo obligatorio.

Este tablero **no reemplaza `YAHPOS Kanban.md`** y **no se edita ese archivo**. Las tareas de revisión van aquí; los hallazgos van a la bandeja de `REGISTRO_BUGS.md`; los bugs autorizados van a «Bugs abiertos».

## Tareas

| ID | Asignada por | Fecha | Objetivo | Dónde mirar | Estado | HAL generados |
|---|---|---|---|---|---|---|

_No hay tareas asignadas todavía._

## Plantilla para asignar (copiar/pegar)

```markdown
### T-### — título simple

- **ID:** T-###
- **Asignada por:** nombre del dueño
- **Fecha:** AAAA-MM-DD
- **Objetivo en lenguaje simple:** qué se quiere revisar, en palabras de todos los días
- **Dónde mirar:** pantallas / rutas de la app / módulos (sin exigir archivos de código)
- **Qué buscar:** qué debería pasar y qué se siente raro
- **Entorno:** dev | staging | prod · navegador y versión: ... · datos de prueba usados: ...
- **Evidencia esperada:** captura sin datos reales: ...
- **Estado:** ASIGNADA | EN_REVISIÓN | ENTREGADA
- **HAL generados:** HAL-###, HAL-### | ninguno
```

## Leyenda de estados

- `ASIGNADA`: el dueño la entregó; el colaborador todavía no la revisó.
- `EN_REVISIÓN`: el colaborador la está explorando con datos de prueba.
- `ENTREGADA`: el colaborador subió al menos un `HAL-###` o informó que no encontró nada.

El estado de la tarea no es el estado del hallazgo. El estado de cada `HAL-###` se sigue en el protocolo y en la bandeja del registro.

## Enlaces

- [`PROTOCOLO_CAZABUGS.md`](PROTOCOLO_CAZABUGS.md) — flujo conjunto, plantillas, Modo IA y prompts.
- [`REGISTRO_BUGS.md`](REGISTRO_BUGS.md) — bandeja de hallazgos y bugs autorizados.
- [`../guias/CURRICULUM_COLABORADOR.md`](../guias/CURRICULUM_COLABORADOR.md) — plan de aprendizaje del colaborador.
- [`../../AGENTS.md`](../../AGENTS.md) — reglas generales del proyecto.

Nota: El colaborador no programa: si una tarea requiere tocar código, el dueño la reescribe como búsqueda visual/lógica.
