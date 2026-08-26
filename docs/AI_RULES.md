# Reglas y Directivas de Comportamiento para el Asistente IA (AI_RULES.md)

Este documento define el estándar operativo, directivas de ejecución y restricciones estrictas para el Asistente IA dentro de este proyecto.

---

## 1. Modo de Respuesta y Comunicación
* **Concisión y Claridad:** Ve directo al grano. Evita preámbulos innecesarios, saludos repetitivos, despedidas o explicaciones redundantes a menos que se soliciten explícitamente.
* **Cumplimiento Estricto:** Sigue las instrucciones del usuario al pie de la letra sin asumir requerimientos no solicitados ni desviarte del alcance definido.
* **Explicaciones Técnicas Breves:** Si realizas cambios en el código, resume puntualmente **qué** se modificó y en **cuáles archivos**, sin transcribir archivos enteros si solo cambió una sección pequeña.

---

## 2. Control de Terminal y Comandos
* **Servidores Locales (PROHIBIDO `npm run dev`):**
  * **NUNCA** ejecutes comandos de servidor en segundo plano o que bloqueen la terminal (`npm run dev`, `npm start`, `nodemon`, `vite`, etc.) para frontend o backend[cite: 2].
  * La ejecución y monitoreo de los entornos locales de desarrollo queda **100% bajo control del usuario**[cite: 2].
* **Control de Versiones (PROHIBIDO `git commit` / `git push`):**
  * **NUNCA** ejecutes comandos que alteren el historial de Git (`git commit`, `git push`, `git checkout -b`, etc.). Los commits y subidas son exclusiva responsabilidad del usuario.
* **Comandos Permitidos:**
  * Instalación y desinstalación de dependencias (`npm install <paquete>`, `npm uninstall <paquete>`)[cite: 2].
  * Ejecución de scripts de build o linter puntual (`npm run build`, `npm run lint`) cuando se solicite validar sintaxis[cite: 2].
  * Pruebas unitarias o scripts de migración si se autorizan expresamente[cite: 2].

---

## 3. Integridad de Código y Buenas Prácticas
* **Modificaciones No Destructivas:**
  * No borres lógica existente, validaciones de seguridad (tokens JWT, middlewares, roles) ni estilos globales salvo que la tarea lo exija expresamente.
  * Respeta la arquitectura en capas: Frontend en `frontend/`, Backend en `backend/`, y esquemas de base de datos en `docs/database.md`.
* **Consistencia de Nomenclatura:**
  * Mantén `snake_case` para entidades, tablas y columnas de base de datos (PostgreSQL).
  * Mantén `camelCase` para variables y funciones en JavaScript/React.
  * Mantén `PascalCase` para componentes React.

---

## 4. Prioridad de Documentación del Proyecto
* Antes de modificar esquemas o estilos, consulta:
  1. `docs/database.md`: Estructura oficial, tablas y relaciones de PostgreSQL.
  2. `docs/GUIDELINES.md`: Directrices visuales, responsive design, breakpoints y microinteracciones de interfaz.

---

## 5. Formato de Entrega de Cambios
* Si necesitas modificar archivos existentes:
  * Proporciona el diff o el bloque exacto indicando la ruta del archivo.
  * Si creas archivos nuevos, asegúrate de ubicarlos en la carpeta correcta dentro del árbol del proyecto.