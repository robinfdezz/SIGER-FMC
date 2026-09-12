# Registro de Cambios (Changelog) - SIGER-FMC

Todas las modificaciones notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [Unreleased]

### Planned
- Módulo de Banco de Trabajo y Diagnóstico Técnico.

---

## [0.6.1] - 2026-09-11

### Added
- **Sanitización y Bloqueo Centralizado de Emojis (Backend & Frontend):**
  - **Backend (`stripEmojis.middleware.js` / `app.js`):** Middleware global registrado inmediatamente tras `express.json()`. Aplica remoción recursiva en `req.body` y `req.query` mediante regex Unicode que abarca pictografías extendidas, bloques de emojis y símbolos suplementarios (`[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0E}-\u{FE0F}\u{200D}]/gu`), normalizando espacios redundantes sin afectar contraseñas o instancias no planas (`Date`, `Buffer`).
  - **Frontend (`stripEmojis.js` / `api.js` / `Input.jsx`):** Interceptor de solicitudes Axios que sanitiza `config.data` y `config.params` de forma transparente antes de disparar cualquier petición HTTP hacia el backend (incluyendo `FormData`). Se provee además el componente base `Input.jsx` con sanitización en tiempo real en eventos `onChange` y `onPaste`.
- **Generación Vectorial de Código QR Dinámico (`qrcode.react` / `TicketQR.jsx`):**
  - Integración de la dependencia `qrcode.react` (`QRCodeSVG`) en el frontend.
  - Creación del componente `TicketQR.jsx` (`frontend/src/components/common/TicketQR.jsx`) para renderizado vectorial SVG de alta definición, eliminando dependencias externas de APIs web y garantizando legibilidad en impresión térmica.
  - Enlace de rastreo resuelto dinámicamente según la sucursal y la empresa: `${dominio_sistema}/estado/${codigo_ticket}` (ej. `https://franyermobilecenter.com/estado/FMC-2026-0089`), embebido en comprobantes térmicos (`TicketTermico.jsx`) y stickers adhesivos (`StickerTermico.jsx`, `LabelPreview.jsx`).
- **Portal Público de Seguimiento de Órdenes para Clientes (`EstadoOrdenPage.jsx`):**
  - Nuevas rutas públicas en el frontend (`App.jsx`): `/estado` y `/estado/:codigo`, accesibles libremente sin requerir inicio de sesión.
  - Interfaz de rastreo en tiempo real estilo courier con buscador manual de ticket, stepper de las 8 fases operativas, detalles del dispositivo, desglose de costos y bitácora pública de avances.
- **Parametrización en Base de Datos de Dominio Web y Prefijos (`init.sql`, `DATABASE.md`):**
  - `datos_companhia`: Adición de la columna `dominio_sistema VARCHAR(150) NOT NULL DEFAULT 'https://franyermobilecenter.com'` para centralizar el dominio corporativo base para códigos QR y notificaciones.
  - `datos_sucursales`: Adición de la columna `prefijo_ticket VARCHAR(15) NOT NULL DEFAULT 'FMC-'` para la nomenclatura y formato personalizado de tickets por sede física.
- **Estandarización de Tablas de Gestión (`ServiciosPage.jsx`, `ClientsPage.jsx`, `WorkersPage.jsx`):**
  - Contenedor con altura fija homogénea de `h-[560px]` con scroll vertical y horizontal independiente (`overflow-y-auto overflow-x-auto relative`).
  - Cabecera fija (`thead sticky top-0`) con sombras sutiles y soporte coherente para modo claro y oscuro.
  - Barra inferior de conteo y resumen homologada en todas las vistas maestras (`"Mostrando X órdenes / clientes / usuarios"`).
  - Unificación de scrollbars globales (`frontend/src/index.css`) a `8px` tanto en el eje vertical como horizontal con `scrollbar-gutter: stable`.
  - Habilitación de salto de línea natural (`whitespace-normal break-words leading-snug`) en nombres de clientes y descripciones de equipos, eliminando truncados prematuros con puntos suspensivos.
  - Optimización de anchos de columnas: columna Cliente ajustada a `w-[19%] min-w-[150px]` y columna Fecha de Registro ampliada a `w-[145px] min-w-[135px] whitespace-nowrap`.

### Changed
- **Adopción de Iconos de Prioridad y Categorías en Tablas y Formularios (`ServiciosPage.jsx`, `NuevaOrdenPage.jsx`):**
  - **Clientes (`ClientsPage.jsx`):** Columna de estado activo/inactivo migrada a `<Badge variant="minimal" ... />` con iconos `CheckCircle2` y `XCircle`.
  - **Órdenes de Servicio (`ServiciosPage.jsx`):** Columna de prioridad migrada a `<Badge variant="minimal" ... />` con iconos específicos para cada uno de los 4 niveles, selector de filtro de prioridad actualizado con los mismos iconos, y columna "Equipo" dinamizada con iconos semánticos según la categoría técnica del dispositivo (`Smartphone`, `Laptop`, `Tablet`, `Gamepad2`, `Watch`, `Package`).
  - **Formulario de Ingreso de Órdenes (`NuevaOrdenPage.jsx`):**
    * **Nivel de Prioridad:** Enriquecido con los 4 iconos (`ChevronsDown`, `Equal`, `ChevronsUp`, `Flame` relleno) en cada opción y en el disparador.
    * **Categoría de Dispositivos:** Enriquecido con iconos específicos por categoría técnica tanto para opciones dinámicas de API como de respaldo (`Smartphone`, `Laptop`, `Tablet / iPad`, `Consola de Videojuegos`, `Smartwatch`, `Otros`).
- **Extensión del Componente `Badge` (`Badge.jsx`) y Refactorización en `WorkersPage.jsx`:**
  - Soporte para dos variantes visuales mediante la prop `variant`:
    * `'pill'` (predeterminado): estilo clásico tipo cápsula con fondo suave, borde y padding (`rounded-lg border px-2.5 py-1`).
    * `'minimal'`: estilo limpio en línea sin fondo ni borde (`bg-transparent border-0 p-0 rounded-none`), con icono y texto a color semántico.
  - Soporte de prop `color` para asignar colores semánticos (`danger`, `warning`, `purple`, `info`, `success`, `neutral`) con retrocompatibilidad absoluta para llamadas existentes.
  - Refactorización de la columna de roles en `WorkersPage.jsx` para utilizar la interfaz oficial: `<Badge variant="minimal" color={role.color} icon={RoleIcon}>{role.label}</Badge>`.
  - Asignación de iconos semánticos de Lucide y colores atenuados por rol:
    * `SuperAdmin`: Icono `ShieldCheck` con color `danger` (`text-red-600/80 dark:text-red-400/80`).
    * `Admin_Sucursal`: Icono `Shield` con color `warning` (`text-amber-600/85 dark:text-amber-400/80`).
    * `Secretaria`: Icono `ClipboardList` con color `purple` (`text-purple-600/80 dark:text-purple-400/80`).
    * `Tecnico`: Icono `Wrench` con color `info` (`text-blue-600/80 dark:text-blue-400/80`).
    * Default / Otros: Icono `User` con color `neutral` (`text-neutral-600/80 dark:text-neutral-400/80`).
  - Columna de estado activo/inactivo en `WorkersPage.jsx` migrada a `<Badge variant="minimal" color={worker.activo ? 'success' : 'neutral'} icon={worker.activo ? CheckCircle2 : XCircle}>` para completa coherencia visual con la tabla de clientes.
  - Mantenimiento del subtexto atenuado de sucursal con icono `Store` (`text-neutral-500 text-xs`).
- **Controles Inferiores del Sidebar (`Sidebar.jsx`):**
  - Corrección de alineación a la izquierda (`items-start`) en el contenedor inferior cuando el sidebar se encuentra expandido o fijado, alineándose a la misma vertical que el menú principal.
  - Botones de alternancia de tema (Modo Claro/Oscuro) y modo de visualización del sidebar definidos como cuadrados compactos (`w-10 h-10 aspect-square rounded-lg flex items-center justify-center`).
  - Efecto hover delimitado estrictamente al recuadro cuadrado (`hover:bg-neutral-100 dark:hover:bg-neutral-800`), eliminando la deformación rectangular a lo ancho.

### Fixed
- **Validación y Bloqueo de Reingresos por Garantía (`servicios.controller.js`, `NuevaOrdenPage.jsx`):**
  - Backend: Bloqueo estricto que impide procesar un reingreso por garantía si la orden de servicio previa no cuenta con estado `ENTREGADO` o fecha formal de entrega (`fecha_entrega`), retornando código de error `NO_ENTREGADO`.
  - Frontend: Bloqueo interactivo en el Paso 1 de apertura de órdenes al ingresar tickets de equipos aún en taller, alertando al usuario y deshabilitando el avance a pasos posteriores.
- **Formulario de Recepción de Servicios (`NuevaOrdenPage.jsx`):**
  - Unificación y aseguramiento del color rojo institucional (`text-red-500`) en los asteriscos (`*`) de todos los campos obligatorios del formulario (Nombre del Cliente, Teléfono, Marca, Modelo, Falla Reportada, Categoría de Dispositivo, Código de Ticket Original y Costo Estimado).

---

## [0.6.0] - 2026-09-09

### Added
- **Módulo de Recepción y Apertura de Órdenes de Servicio (`NuevaOrdenPage.jsx`, `ServiciosPage.jsx`):**
  - Generación de código único de ticket en formato estándar corporativo `FMC-YYYY-XXXX`.
  - Captura y persistencia JSONB de `checklist_entrada`, `observaciones_recepcion` y especificaciones completas del dispositivo.
  - Selector de método de seguridad del equipo (`DeviceSecurityPicker.jsx`): Soporte para patrón Android 3x3 normalizado en coordenadas base 0 (`[0..8]`) con secuencia numérica proyectada 1..9 (ej. `"7-4-1-5-3-6-9"`), código PIN, contraseña y sin bloqueo (`datos_acceso_equipo`).
  - Desglose presupuestario y financiero: `costo_previsto`, `monto_anticipo`, `monto_descuento` y balance pendiente calculado en tiempo real.
  - Asignación técnica inicial en `tecnicos_asignados` y registro automático de apertura en `historial_estados` con estado `RECIBIDO`.
- **Arquitectura de Impresión Térmica y Stickers de Taller (`#print-mount-point`):**
  - Punto de montaje On-Demand aislado del DOM interactivo para evitar distorsiones por modo oscuro, scrolls o estilos globales.
  - Resolución asíncrona de datos frescos (`getServicioById`) al reimprimir desde listas (`ServiciosPage.jsx`), garantizando la proyección de todas las columnas DDL de `init.sql`.
  - Presets físicos soportados:
    * Comprobantes térmicos POS de rollo continuo: **80 mm** y **58 mm** con logotipo monocromático de alto contraste, desglose financiero, checklist y código QR de seguimiento.
    * Stickers adhesivos de taller: **50x30 mm** y **60x40 mm** con trazado vectorial SVG de patrón Android o valor alfanumérico destacado para PIN/Contraseña.
- **Control de Acceso por Roles (RBAC) y Blindaje Multi-Sucursal:**
  - `Tecnico`: Configurado en modo **SOLO LECTURA** en órdenes de servicio. Bloqueo estricto con `403 Forbidden` en `POST /api/servicios`. Confinado a su sucursal (`requireBranchAccess`) y acceso de lectura habilitado en `GET /api/trabajadores` para filtros operativos de la sucursal.
  - `Admin_Sucursal` y `Secretaria`: Control total de apertura en mostrador confinado a su sucursal fija (`req.user.sucursal_id`), forzando `usuario_recepcion_id` en backend sin admitir sobreescritura manual. Habilitado acceso de lectura en `/configuracion/sucursales`, `/configuracion/companhia` y `/trabajadores`.
  - `SuperAdmin`: Visión omnicanal global y selección opcional de cualquier sucursal.

### Fixed
- Corrección de discrepancia de datos al reimprimir tickets térmicos desde `ServiciosPage.jsx` mediante la proyección unificada con `COALESCE` de clientes y subconsultas de técnicos.
- Corrección en renderizado de stickers adhesivos (`LabelPreview.jsx`) para mostrar el valor legible en PIN/Contraseña en lugar de `"[]"`.
- Normalización del dibujo vectorial del patrón de desbloqueo Android y texto inferior legible ordenado.
- Corrección en subtítulo contextual de `NuevaOrdenPage.jsx` para mostrar el nombre de la sucursal asignada a la Secretaria en lugar del fallback estático.
- Corrección de formato de fecha en cabeceras a minúsculas ("del" en lugar de "de").

### Added
- **Módulo de Gestión de Clientes y Control RBAC Granular:**
  - Backend: Endpoints REST protegidos para listado, detalle, creación, edición y alternado lógico de estado (`/api/clientes`).
  - Frontend: Vistas `ClientsPage.jsx` y modal `ClientModal.jsx` con resumen de conteo, avatares y badges de estado.
- **Módulo de Configuración del Sistema (`/configuracion`):**
  - Pestaña "Perfil de la Empresa" (`CompanyProfileTab.jsx`) para datos institucionales, contacto fiscal (RNC, razón social) y gestión de logotipo institucional con subida por streaming a Cloudinary.
  - Pestaña "Sucursales Físicas" (`BranchesTab.jsx`) con tarjetas de sedes, creación, edición, alternado de estado lógico (activo/inactivo), control de sede principal y restricción RBAC para `Admin_Sucursal`.
  - Pestaña "Impresión y Comprobantes" (`PrintingTab.jsx`):
    * Persistencia de objetos JSONB (`config_tickets`, `config_etiquetas`) en PostgreSQL.
    * Rediseño ergonómico con selectores interactivos de tipo cápsula/chip (`flex flex-wrap gap-2.5` en estilo `rose-50`).
    * Previsualización fidedigna de ticket térmico POS (80mm/58mm) en escala de grises monocromática nítida con márgenes de corte, RNC, logotipo con `grayscale contrast-150`, código QR de rastreo ampliado (`w-40 h-40`, SVG `w-full h-full`) con URL de seguimiento (`www.franyermobile.com/status`) y código `FMC-2026-0089`.
    * Previsualización adaptativa de sticker de taller (`LabelPreview.jsx`) con escalado dinámico de tipografía y matriz según dimensiones (`50x30`, `40x25`, `60x40`), envoltorio de datos largos (`break-words line-clamp-2`), e integración del **Método de Desbloqueo** del equipo (`PatternLockSvg` para patrón Android 3x3 y `UnlockMethodView` para PIN/Clave/Sin Bloqueo).
  - Backend (`/api/configuracion`): Endpoints de lectura y actualización para `datos_companhia` y `datos_sucursales` con sanitización automática de claves obsoletas (`formato_codigo`).
  - Navegación y UX: Sincronización de la pestaña activa en `ConfigurationPage.jsx` con parámetros de búsqueda de la URL (`useSearchParams` -> `?tab=perfil|sucursales|impresion`) para persistencia ante recarga (F5) y enlaces directos.
- **Componentes Comunes Reutilizables:**
  - `PatternLock.jsx`: Componente independiente para dibujado vectorial del patrón de desbloqueo Android (matriz 3x3 grid) y visualización de métodos de acceso (`UnlockMethodView`).
- **Integración con Almacenamiento en la Nube (Cloudinary):**
  - Carga optimizada por streaming en WebP y eliminación automática de archivos previos (`public_id`) para fotos de perfil y logotipos corporativos.
  - Componente común `SingleImageDropzone.jsx` con validaciones de tipo/peso y preview local inmediato.
- **Componentes Comunes Reutilizables:**
  - `Badge.jsx`: Soporte de variantes semánticas, punto indicador (`showDot`) e integración de iconos vectoriales de `lucide-react`.
  - `Button.jsx`: Variantes (`primary`, `secondary`, `outline`), estados de carga asíncrona (`Loader2`) y dimensiones normalizadas.
  - `Select.jsx` (Untitled UI) y `ResetFiltersButton.jsx` con animación morfométrica.

### Changed
- **Estandarización de Paleta Global y Superficies:**
  - Color de texto base institucional `#2C2C2C` (eliminando negro puro `#000000`) y fondo neutro para tarjetas y contenedores `#FEFDFD`.
- **Homologación de Dimensiones y Modales:**
  - Unificación de `BranchModal.jsx` a `maxWidth="max-w-3xl"`, bordes `rounded-2xl` y scroll `p-4 sm:p-6` en simetría con `WorkerModal.jsx` y `ClientModal.jsx`.
- **Experiencia Visual y Control de Roles:**
  - Restricción granular de edición en `BranchModal.jsx` y endpoint `PUT /api/configuracion/sucursales/:id`: bloqueo de código y nombre de sucursal para el rol Administrador de Sucursal (`disabled` y preservación de valores originales sin mutación en el backend).
  - Iconos semánticos (`CheckCircle2`, `XCircle`) en badges de estado en Usuarios, Clientes y Sucursales.
  - Rediseño de banner de advertencia en `CompanyProfileTab.jsx` a tonos rojos institucionales con `<ShieldAlert />`.
  - Atenuación simétrica (`opacity-50 select-none pointer-events-none`) en bloques no editables para `Admin_Sucursal`.
  - Reubicación del botón de recarga en la barra de navegación horizontal en `ConfigurationPage.jsx`.

### Removed
- Retiro del componente `Tooltip` sobre el botón pasivo "Solo Lectura" en `BranchesTab.jsx`.

---

## [0.4.0] - 2026-08-27

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

## [0.3.0] - 2026-08-26

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

## [0.2.0] - 2026-08-26

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

## [0.1.1] - 2026-08-25

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
