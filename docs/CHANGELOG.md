# Registro de Cambios (Changelog) - SIGER-FMC

Todas las modificaciones notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [Unreleased]

### Planned
- Implementación de la interfaz y endpoints del Módulo de Recepción de Tickets y Gestión de Clientes (Fase 2).
- Módulo de Banco de Trabajo y Diagnóstico Técnico.
- Integración con almacenamiento en la nube (Cloudinary) para evidencias fotográficas.
- Portal público de seguimiento de tickets para clientes (`/tracking/:codigo_ticket`).

---

## [0.2.0] - 2026-08-25

### Added
- Creación de la tabla `clientes` y normalización relacional con `servicios_recepcion`.
- Incorporación del campo `prioridad` (`Baja`, `Normal`, `Alta`, `Urgente`) en las órdenes de servicio.
- Índices secundarios en PostgreSQL para optimización de consultas en sucursales, clientes, estados y técnicos.
- Integración de `MorphIcons` para transiciones vectoriales animadas en selector de tema, visibilidad de contraseña y menú móvil.
- Implementación de layout responsivo para móviles y tablets (< 1024px) con menú fullscreen y cierre automático al navegar.
- Documentación técnica expandida: `docs/ARCHITECTURE.md` y `docs/API.md`.

### Changed
- Migración completa de la capa de datos de Microsoft SQL Server a **PostgreSQL 15+/18.x (`siger_fmc_db`)**.
- Reemplazo del driver `mssql` por **`pg`** (`node-postgres`) con Connection Pool reutilizable.
- Estandarización de nombres de tablas y columnas a **`snake_case` minúsculas** en toda la base de datos y controladores.
- Migración de consultas SQL a sintaxis parametrizada nativa de PostgreSQL (`$1, $2...`) y lectura directa vía `result.rows`.
- Actualización de variables de entorno en `.env` y `.env.example` para conexión a PostgreSQL.
- Actualización del esquema oficial en `docs/DATABASE.md` y guías en `docs/GUIDELINES.md`.

### Removed
- Eliminación de la dependencia `mssql` del backend.
- Eliminación del archivo temporal `docs/DATABASE2.md`.
- Eliminación de referencias residuales a sintaxis T-SQL (`@param`, `IDENTITY`, `DATETIME2`, `NVARCHAR`).

### Security
- Asignación y verificación de permisos (`GRANT ALL`) para el usuario de base de datos en PostgreSQL.
- Generación de hashes `bcrypt` seguros para usuarios semilla en `backend/src/db/init.sql`.

---

## [0.1.0] - 2026-08-16

### Added
- Configuración inicial de la arquitectura en 3 capas: Frontend (React 18 + Vite + Tailwind CSS) y Backend (Node.js + Express).
- Sistema de autenticación con JSON Web Tokens (JWT) y hashing de contraseñas con `bcryptjs` (salt rounds = 10).
- Login exclusivo mediante columna `usuario` en `datos_trabajadores`.
- Middlewares de seguridad: `authMiddleware` (validación de token Bearer) y `roleMiddleware` (`checkRole` y aislamiento de datos por sede con `requireBranchAccess`).
- Jerarquía de 4 roles de usuario: `SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`.
- Interfaz del Dashboard estilo Supabase con soporte para tema Claro (predeterminado) y Oscuro.
- Barra lateral (Sidebar) colapsable con 3 modos de visualización (`expanded`, `hover`, `collapsed`) y persistencia en `localStorage`.
- Header superior de ancho completo (100%) con logo institucional, badge de sucursal y perfil de usuario.
- Interceptor de Axios para inyección automática de tokens JWT y redirección en errores 401.
- Esquema de base de datos inicial para 11 tablas y catálogos semilla.
