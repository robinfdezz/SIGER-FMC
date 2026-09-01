# 📚 Documentación General y Mapa Maestro - SIGER-FMC

Bienvenido al centro neurálgico de documentación técnica, funcional y de arquitectura de **SIGER-FMC** (*Sistema Integral de Gestión y Reparación para Franyer Mobile Center, S.R.L.*).

---

## 🗺️ Mapa de Documentación

A continuación se detalla la estructura y el propósito de cada documento en el repositorio:

| Documento | Ubicación | Audiencia / Propósito |
| :--- | :--- | :--- |
| **Arquitectura Global** | [docs/ARCHITECTURE.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/ARCHITECTURE.md) | Capas de la aplicación, ciclo de vida de tickets, aislamiento multi-sucursal y pipeline multimedia Cloudinary. |
| **Catálogo de API REST** | [docs/API.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/API.md) | Especificación exhaustiva de endpoints, middlewares RBAC, payloads JSON, códigos de respuesta y subida de archivos. |
| **Modelo de Base de Datos** | [docs/DATABASE.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/DATABASE.md) | Esquema relacional PostgreSQL, tablas, campos obligatorios, llaves foráneas e índices. |
| **Guía de Desarrollo y UI/UX** | [docs/GUIDELINES.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/GUIDELINES.md) | Sistema de diseño, paleta de colores por estado, reglas de componentes (Dropzone, Select, Modal) y convenciones de código. |
| **Contexto del Proyecto** | [docs/PROJECT_CONTEXT.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/PROJECT_CONTEXT.md) | Visión de negocio de Franyer Mobile Center, S.R.L., sucursales activas, roles operativos y reglas funcionales. |
| **Reglas para Asistentes AI** | [docs/AI_RULES.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/AI_RULES.md) | Restricciones estrictas de desarrollo, prohibiciones de comandos destructivos y lineamientos de codificación. |
| **Registro de Cambios** | [docs/CHANGELOG.md](file:///c:/Users/pc/Desktop/SIGER-FMC/docs/CHANGELOG.md) | Historial cronológico de versiones y novedades en desarrollo (`[Unreleased]`). |

---

## 🛠️ Stack Tecnológico Consolidado

- **Backend:** Node.js, Express.js, PostgreSQL (`pg` Connection Pool), JWT, BcryptJS, Cloudinary SDK v2, Multer.
- **Frontend:** React 18, Vite, React Router v6, Tailwind CSS, Lucide React, Morphicons, Sileo, Axios.
- **Base de Datos:** PostgreSQL (`siger_fmc_db`).
- **Almacenamiento Multimedia:** Cloudinary (Streaming en memoria, WebP `500x500`, calidad auto, carpetas `siger-fmc/personal-fmc` y `siger-fmc/evidencias-tickets`).

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
