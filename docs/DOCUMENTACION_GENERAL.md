# 📚 Documentación General y Mapa Maestro - SIGER-FMC

Bienvenido al centro neurálgico de documentación técnica, funcional y de arquitectura de **SIGER-FMC** (*Sistema Integral de Gestión y Reparación para Franyer Mobile Center, S.R.L.*).

---

## 🗺️ Mapa de Documentación

A continuación se detalla la estructura y el propósito de cada documento en el repositorio:

| Documento | Ubicación | Audiencia / Propósito |
| :--- | :--- | :--- |
| **Arquitectura Global** | [docs/ARCHITECTURE.md](./ARCHITECTURE.md) | Capas de la aplicación, ciclo de vida de tickets, aislamiento multi-sucursal, pipeline Cloudinary, campanita y correo Resend. |
| **Catálogo de API REST** | [docs/API.md](./API.md) | Endpoints (incl. `/buscar`, `/notificaciones`, `/servicios/dashboard`), middlewares RBAC, payloads JSON y códigos de respuesta. |
| **Modelo de Base de Datos** | [docs/DATABASE.md](./DATABASE.md) | Esquema relacional PostgreSQL, tablas (incl. `notificaciones`), campos, FKs, índices y matriz de alertas por rol. |
| **Guía de Desarrollo y UI/UX** | [docs/GUIDELINES.md](./GUIDELINES.md) | Sistema de diseño, cabecera (búsqueda + campanita), paleta por estado y convenciones de componentes. |
| **Contexto del Proyecto** | [docs/PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) | Visión de negocio, roles, módulos (dashboard, alertas, correo) y reglas funcionales. |
| **Reglas para Asistentes AI** | [docs/AI_RULES.md](./AI_RULES.md) | Restricciones estrictas de desarrollo, prohibiciones de comandos destructivos y lineamientos de codificación. |
| **Casos de Uso y Diagramas de Flujo** | [DIAGRAMAS_CASOS_DE_USO_Y_FLUJO.md](../DIAGRAMAS_CASOS_DE_USO_Y_FLUJO.md) | Especificación formal UML y flujos Mermaid (CU-01 a CU-18), catálogo de actores RBAC, ciclo de vida de taller y comprobantes. |
| **Registro de Cambios** | [docs/CHANGELOG.md](./CHANGELOG.md) | Historial cronológico de versiones y novedades (`[0.11.0]` dashboard, búsqueda, campanita, Resend). |

---

## 🛠️ Stack Tecnológico Consolidado

- **Backend:** Node.js, Express.js, PostgreSQL (`pg` Connection Pool), JWT, BcryptJS, Cloudinary SDK v2, Multer, Resend (correo transaccional), Cloudflare Turnstile (Anti-Bot condicional).
- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS, Lucide React, Morphicons, react-loading-skeleton, Sileo, Axios.
- **Base de Datos:** PostgreSQL (`siger_fmc_db`).
- **Almacenamiento Multimedia:** Cloudinary (Streaming en memoria, WebP `500x500`, calidad auto, carpetas `siger-fmc/personal-fmc`, `siger-fmc/recepcion` y `siger-fmc/evidencias-tickets`).
- **Alertas:** Campanita in-app (`notificaciones`) + correos Resend (cliente y técnico en asignación/finalización).

---

## 🚀 Flujo de Ejecución Rápida

1. **Base de Datos:** Ejecutar `backend/src/db/init.sql` en PostgreSQL.
2. **Servidor Backend:**
   ```bash
   cd backend
   npm install
   npm run dev   # http://localhost:5000
   ```
3. **Cliente Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev   # http://localhost:5173
   ```
