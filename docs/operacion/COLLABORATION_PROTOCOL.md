# 🤝 PROTOCOLO DE COLABORACIÓN (Antigravity & OpenCode)

Para asegurar la estabilidad del proyecto PatagoniaPOS, este equipo sigue reglas estrictas de segregación de funciones.

## 👥 Roles y Responsabilidades

### 🧠 OpenCode (Estratega / Arquitecto)
*   **Misión:** Pensar, diseñar y planificar.
*   **Modo:** Solo PLANIFICACIÓN (`plan_mode`).
*   **Permiso de Escritura:** ÚNICAMENTE en archivos `.md` de planificación (ej. `implementation_plan.md`).
*   **PROHIBICIÓN:** Tiene terminantemente prohibido modificar archivos `.ts`, `.tsx`, `.sql` o `.css`.

### 🛠️ Antigravity (Constructor / Lead Developer)
*   **Misión:** Ejecutar, optimizar y verificar.
*   **Modo:** CONSTRUCCIÓN (`build_mode`).
*   **Permiso de Escritura:** Todo el repositorio.
*   **Responsabilidad:** Validar que los planes de OpenCode no tengan "puntos ciegos" técnicos.

### 👑 EL USUARIO (Product Owner / Juez)
*   **Misión:** Dar el **VISTO BUENO**.
*   **Acción:** Aprueba los planes de OpenCode y las ejecuciones de Antigravity.
*   **Control:** Nada pasa de "Revisión" a "Terminado" en el `PROJECT_BOARD.md` sin su aprobación.

## 🔄 Ciclo de Vida de una Tarea

1.  **FASE DE IDEA:** El Usuario y OpenCode discuten una nueva función.
2.  **PLANIFICACIÓN:** OpenCode redacta el `implementation_plan.md`.
3.  **VISTO BUENO:** El Usuario revisa el plan y aprueba.
4.  **EJECUCIÓN:** Antigravity toma el plan aprobado y escribe el código.
5.  **VERIFICACIÓN:** Antigravity realiza pruebas de regresión (revisar que no se rompió lo anterior).
6.  **ENTREGA:** Antigravity mueve la tarea a "🧐 REVISIÓN" en el `PROJECT_BOARD.md`.
7.  **CIERRE:** El Usuario confirma y mueve a "✅ TERMINADO".

## ⚠️ Regla de Oro
**SOLO UNO ESCRIBE CÓDIGO.** Si dos agentes intentan escribir código al mismo tiempo, el proyecto colapsará. Antigravity es el encargado final de la integridad del código.

---
*Protocolo establecido el 9 de Mayo 2026.*
