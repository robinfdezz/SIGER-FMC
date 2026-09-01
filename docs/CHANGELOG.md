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

### Added
- **Módulo de Gestión de Clientes y Control RBAC Granular (Fase 2):**
  - **Backend (`clients.controller.js` y `clients.routes.js`):** Endpoints REST protegidos con middleware `checkRole`: listado y detalle con acceso de solo lectura para técnicos (`GET /api/clientes` y `GET /:id`), creación y edición autorizadas para roles administrativos y secretaría (`POST` y `PUT` exclusivo para `SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `403` para `Tecnico`), validación estricta de campos obligatorios (`nombre`, `apellido` NOT NULL, `cedula_rnc` única y `telefono`), y borrado lógico restringido a administradores (`PATCH /:id/toggle-status` exclusivo para `SuperAdmin` y `Admin_Sucursal`).
  - **Frontend (`ClientsPage.jsx` y `ClientModal.jsx`):** Homologación visual idéntica al estándar de `WorkersPage.jsx`: resumen de conteo inferior (*"Mostrando X de Y clientes registrados"*), avatares redondeados `rounded-xl` (`w-10 h-10`), badges de estado en cápsula suave con punto indicador, opacidad para registros inactivos, y modal estilizado con los mismos patrones de botones y cabeceras de `WorkerModal.jsx`.
  - **Navegación y Rutas (`App.jsx`, `Sidebar.jsx`, `DashboardLayout.jsx`):** Ruta protegida `/clientes` y acceso en menú lateral de escritorio y móvil con icono `Contact`.
- **Componente Modular `Select.jsx` (Diseño Untitled UI):**
  - Implementación del componente reutilizable `Select.jsx` con soporte de `label`, `hint`, `tooltip`, `isRequired`, `placeholder`, `items` (con `id`, `label`, `supportingText`, `avatarUrl`, `icon`, `disabled`), `value`, `onChange` y `disabled`.
  - Estilizado con Tailwind CSS (Dark/Light), flecha chevron rotativa animada, checkmark de selección activa y cierre automático ante clic exterior (`mousedown`/`touchstart`).
- Componente modular reutilizable `ConfirmModal.jsx` con variantes (`danger`, `warning`, `info`) y soporte de carga asíncrona.
- Modal de confirmación interactivo antes de alternar el estado activo/inactivo de trabajadores.

### Changed
- **Interacción Suave en Menú Lateral (`Sidebar.jsx`):**
  - Implementación de temporizadores debounce controlados por `useRef` para eventos del mouse en modo hover: retardo de entrada de 110ms (previene aperturas accidentales) y retardo de salida de 220ms (evita cierres bruscos al navegar o hacer clic).
  - Limpieza rigurosa de timers en desmontaje y cambio de modo de visualización.
- Reemplazo de todos los elementos `<select>` nativos en `WorkersPage.jsx` (filtros de Rol, Sucursal y Estado) y `WorkerModal.jsx` (selectores de Rol y Sucursal) por el nuevo componente `Select.jsx`.
- Configuración global de `Toaster` (Sileo) reubicada a `top-center` y sincronizada dinámicamente con `ThemeContext` (Dark/Light).

## [1.4.0] - 2026-08-27

### Security
- **Ajuste de Expiración Estricta de JWT (8 Horas):**
  - Configuración del tiempo de expiración a 8 horas (`expiresIn: '8h'`) en el controlador de login y variables de entorno (`.env` y `.env.example`).
  - Validación obligatoria de `JWT_SECRET` en el backend para evitar arranques con secretos nulos o fallback inseguro.
- **Manejo Robusto de Expiración de Sesión:**
  - `authMiddleware.js`: Captura explícita de `TokenExpiredError` retornando `401 Unauthorized` con código `TOKEN_EXPIRED`.
  - `api.js`: Interceptor de Axios mejorado para limpiar storage (`localStorage` y `sessionStorage`) y redirigir inmediatamente a `/login?expired=true` sin bucles de redirección.
  - `AuthContext.jsx`: Validación de expiración local previa (`isTokenExpired`) al inicializar la aplicación antes de enviar peticiones con tokens caducados.
- **Auditoría de Payload de Tokens y Flujo de Login Anti-Enumeración:**
  - Verificación de contenido seguro en el token JWT, transportando únicamente identificadores y roles (`id`, `usuario`, `correo`, `rol_id`, `rol_nombre`, `sucursal_id`, `sucursal_nombre`) y omitiendo contraseñas, hashes o cédulas.
  - Validación de contraseña mediante `bcrypt.compare()` previa a la comprobación del estado `activo` para prevenir enumeración de cuentas o revelación de estados a atacantes.
  - Mensaje unificado `401 Unauthorized`: *"Usuario o contraseña incorrectos."* tanto para usuarios inexistentes como para contraseñas incorrectas.
- **Prevención de Escalamiento de Privilegios y Control de Acceso (RBAC en Backend):**
  - `createWorker` y `updateWorker`: Rechazo inmediato con `403 Forbidden` ante cualquier intento de un Administrador de Sucursal de crear o asignar roles `SuperAdmin` o `Admin_Sucursal`, limitándolo exclusivamente a roles operativos (`Tecnico` y `Secretaria`).
  - Aislamiento estricto de sucursal: Forzado automático del `sucursal_id` de la sesión del administrador autenticado e impedimento de modificar usuarios o estados de otras sedes (`403 Forbidden`).

### Added
- **Protección y Guardia de Rutas en Frontend (`ProtectedRoute.jsx` y `App.jsx`):**
  - Implementación de la prop `allowedRoles` en `ProtectedRoute` para validación de permisos en el cliente.
  - Protección de la ruta `/trabajadores` exclusiva para `['SuperAdmin', 'Admin_Sucursal']`, redirigiendo automáticamente al `/dashboard` si un `Técnico` o `Secretaria` intenta ingresar manualmente.
- **Navegación Condicional por Roles (`Sidebar.jsx` y `DashboardLayout.jsx`):**
  - Ocultamiento reactivo del enlace/icono del módulo de Usuarios (`/trabajadores`) en el menú lateral de escritorio y en el menú móvil para usuarios con rol `Técnico` o `Secretaria`.

### Changed
- **Adaptación Dinámica de Gestión de Usuarios (`WorkersPage.jsx` y `WorkerModal.jsx`):**
  - `WorkersPage.jsx`: El selector de roles se adapta para mostrar únicamente `Todos los Roles`, `Técnico` y `Secretaria` si el usuario en sesión es Admin de Sucursal.
  - `WorkersPage.jsx`: El filtro de sucursales se oculta para el Admin de Sucursal y queda visible exclusivamente para `SuperAdmin`.
  - `WorkersPage.jsx`: Las acciones de fila (Editar y Alternar Estado) se restringen para que el Admin de Sucursal solo pueda operar sobre personal técnico/secretaría, mostrando *"Solo lectura"* en cuentas administrativas.
  - `WorkerModal.jsx`: El selector de rol filtra dinámicamente opciones administrativas y el selector de sucursal se bloquea/fija automáticamente a la sede del administrador en sesión.
- **Validación Estricta de Límites Máximos de Caracteres (`WorkerModal.jsx` y `workers.controller.js`):**
  - Aplicación de `maxLength` y validaciones visuales en frontend y rechazo con `400 Bad Request` en backend:
    - `nombre`: max 50 caracteres
    - `apellido`: max 50 caracteres
    - `usuario`: max 50 caracteres (min 6)
    - `correo`: max 100 caracteres
    - `cedula`: max 20 caracteres (min 11)
    - `telefono`: max 20 caracteres (min 10)
    - `password`: max 20 caracteres (min 8)
- **Validación y Sincronización en Login (`LoginPage.jsx` y `auth.controller.js`):**
  - Frontend: Inclusión de `maxLength={50}` en `usuario` (mín. 6) y `maxLength={20}` en `password` (mín. 8) con avisos de error personalizados en el formulario.
  - Backend: Validación previa de longitud de credenciales en `POST /api/auth/login`, respondiendo inmediatamente con `400 Bad Request` ante entradas fuera del rango permitido.
- **Capa Visual de Notificaciones Toast:**
  - `index.css`: Definición de regla `z-index: 99999 !important` para `[data-sileo-viewport]` y `[data-sileo-toast]` asegurando visibilidad frontal por encima de cualquier modal y backdrop.

---

## [1.3.0] - 2026-08-26

### Added
- **Diseño y Tipografía Global:**
  - Integración global de la fuente `Sora` de Google Fonts con soporte multilenguaje y visualización nítida en componentes.
  - Botón interactivo de limpiar filtros con morphing animado (`MorphIcon` con transiciones `X` y `Check`).
- **Validaciones Visuales y Sanitización en Formularios (`WorkerModal.jsx`):**
  - Desactivación de validación nativa del navegador e implementación de avisos de error personalizados en color rojo bajo cada campo.
  - Bloqueo de la barra espaciadora en tiempo real y sanitización de espacios en blanco en `usuario`, `correo` y `password`.
  - Sanitización automática de caracteres no numéricos en `cedula` y `telefono`.
  - Comparación reactiva (`hasChanges`) para bloquear y advertir submits redundantes en modo edición si no hay diferencias.
- **Soporte de Avatares Fotográficos (`foto_perfil_url`):**
  - Renderizado de fotos de perfil en la barra superior (`Navbar.jsx`), menú móvil (`DashboardLayout.jsx`) y tabla de usuarios (`WorkersPage.jsx`).
  - Fallback automático a iniciales de usuario si la imagen no existe o falla su carga (`onError`).
- **Control de Acceso y Sucursal Global para SuperAdmin:**
  - Deshabilitado y forzado de selección a *"Global / Sin Asignar"* cuando el rol seleccionado es `SuperAdmin`.
  - Soporte en backend de `sucursal_id: null` para SuperAdmin en creación y actualización.

### Changed
- **Controlador de Catálogos (`catalogs.controller.js`):**
  - Depuración y sincronización del endpoint `GET /api/catalogos/sucursales`, eliminando la columna obsoleta `es_matriz`.
  - Habilitación de alias de ruta directos en `app.js` (`/api/sucursales` y `/api/roles`).
- **Validación Estricta en Backend (`workers.controller.js`):**
  - Validación rigurosa de longitudes mínimas, ausencia de espacios en blanco y verificación de unicidad con códigos HTTP `400` y `409`.

---

## [1.2.0] - 2026-08-26

### Added
- **Módulo Backend de Trabajadores (`datos_trabajadores`):**
  - Endpoints CRUD (`/api/trabajadores`) protegidos con JWT y validación de roles (`SuperAdmin`, `Admin_Sucursal`).
  - Validación de unicidad para usuario, cédula y correo.
  - Encriptación segura de contraseñas con `bcryptjs` (10 rondas de salt).
  - Borrado lógico (`PATCH /api/trabajadores/:id/toggle-status`) con protección contra auto-desactivación de sesión.
- **Módulo Frontend de Trabajadores:**
  - Vista principal (`WorkersPage.jsx`) con filtros en tiempo real por texto, rol, sucursal y estado.
  - Modal reutilizable (`WorkerModal.jsx`) de dos columnas para creación y edición de personal.
  - Integración de notificaciones asíncronas con `sileo.promise` para los estados de carga, éxito y error.
  - Servicios de consumo API (`workers.service.js` y `catalogs.service.js`).

---

## [1.1.0] - 2026-08-25

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

## [1.0.0] - 2026-08-16

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
