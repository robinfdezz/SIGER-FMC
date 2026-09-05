```markdown
# 📋 Guía de Arquitectura y Desarrollo - SIGER-FMC

## 1. Resumen y Propósito
**SIGER-FMC** es un sistema web para el taller de servicio técnico y reparación de dispositivos electrónicos **Franyer Mobile Center, S.R.L.** Su objetivo es gestionar el ciclo de vida completo de cada servicio técnico con trazabilidad paso a paso (estilo paquetería/courier), control de incidencias, evidencias fotográficas y seguimiento público para clientes.

---

## 2. Stack Tecnológico

* **Frontend:** React.js (Vite), React Router v6, Tailwind CSS, Lucide React (Íconos), Morphicons (Iconos animados interactivos), Axios.
* **Backend:** Node.js, Express.js.
* **Base de Datos:** PostgreSQL (driver `pg` con Connection Pool, base de datos `siger_fmc_db`).
* **Autenticación:** JSON Web Tokens (JWT) + Hashing de contraseñas con `bcryptjs` (salt rounds = 10).
* **Multimedia:** Cloudinary con compresión previa en el cliente (`browser-image-compression`).
* **Control de Versiones (Git):**
  * `main`: Rama principal / producción estable.
  * `develop`: Rama base de desarrollo e integración continua.

---

## 3. Arquitectura del Proyecto

### Estructura del Backend (`/backend`)



backend/
├── src/
│   ├── config/          # db.js (PostgreSQL pool), cloudinary.js
│   ├── controllers/     # Controladores por entidad (auth, tickets, incidencias, etc.)
│   ├── middlewares/     # authMiddleware.js (JWT), roleMiddleware.js, upload.js (Multer)
│   ├── routes/          # auth.routes.js, tickets.routes.js, catalogos.routes.js, public.routes.js
│   ├── services/        # Lógica de negocio reutilizable
│   └── app.js           # Configuración de Express y middlewares globales
├── server.js            # Punto de entrada / arranque del servidor
└── .env                 # Variables de entorno



### Estructura del Frontend (`/frontend`)



frontend/
├── src/
│   ├── assets/          # Logos, imágenes estáticas
│   ├── components/      # Componentes reutilizables (Navbar, Sidebar, Badges, Modales, Tables)
│   ├── context/         # AuthContext.jsx (sesión y permisos globales)
│   ├── hooks/           # Custom hooks (useAuth, useTickets, useFetch)
│   ├── pages/           # Vistas principales
│   │   ├── Login/
│   │   ├── Dashboard/
│   │   ├── Tickets/     # Listado, Crear Ticket, Detalle de Ticket
│   │   ├── Admin/       # Gestión de usuarios, sucursales y reportes
│   │   └── Tracking/    # Consulta pública por código de ticket
│   ├── services/        # Instancia de Axios y llamadas a la API
│   ├── utils/           # Formateadores de fecha, moneda (DOP), constantes
│   ├── App.jsx          # Enrutador principal con rutas protegidas
│   └── main.jsx

---

## 4. Sistema de Diseño y UI/UX

### Paleta de Colores Base Institucional
* **Texto Principal (Tema Claro):** `#2C2C2C` (Gris carbón suave de alto contraste. Prohibido el uso de negro puro `#000000` o `text-black`).
* **Texto Principal (Tema Oscuro):** `#F4F4F5` / `text-slate-100`.
* **Fondo Claro Institucional (Light):** `#FEFDFD` para superficies, tarjetas (`card`), contenedores y campos de formulario.
* **Fondo Oscuro Institucional (Dark):** `#121212` para fondos generales, `#18181B` para superficies y `#1E1E24` para tarjetas.
* **Acento de Marca (Brand):** `#E11D48` (`brand-600` / Rojo FMC).

### Paleta de Colores por Estado de Servicio
* **Recibido:** `#6B7280` (Gris neutro)
* **En Diagnóstico:** `#3B82F6` (Azul informativo)
* **En Espera de Repuesto:** `#F59E0B` (Ámbar / Alerta)
* **En Reparación:** `#8B5CF6` (Púrpura / Trabajo activo)
* **Control de Calidad:** `#EC4899` (Rosa / Pruebas)
* **Listo para Entrega:** `#10B981` (Verde claro / Finalizado)
* **Entregado:** `#059669` (Verde oscuro / Completado)
* **Cancelado / No Reparado:** `#EF4444` (Rojo / Detenido)

### Reglas de Interfaz y Convenciones Visuales
* **Diseño Responsive:** Optimizado para tablets y móviles (uso de técnicos en banco de trabajo).
* **Feedback Visual:** Spinners en peticiones asíncronas, toasts de notificación para acciones exitosas/fallidas.
* **Fotos de Perfil:** Si el usuario no tiene `foto_perfil_url`, mostrar un avatar con sus iniciales.
* **Atenuación en Modo Solo Lectura:** Bloques y formularios no editables por restricciones de rol (RBAC) aplican la directriz uniforme `opacity-50 select-none pointer-events-none` junto a un banner explicativo conciso.
* **Seguimiento Público:** Vista minimalista y limpia para clientes sin requerir inicio de sesión.

---

## 5. Reglas de Negocio y Flujo de Trabajo

1. **Creación de Tickets:** Al registrar un servicio, se genera un código correlativo único (ej. `TKT-2026-0001`) y se crea automáticamente el primer registro en `Historial_Estados` con estado `RECIBIDO`.
2. **Subida y Procesamiento de Imágenes (Cloudinary):**
   * **Pipeline de Backend:** Multer en memoria (`memoryStorage`, límite de 5MB) transmite por streaming en RAM (`Readable.from(buffer)`) al SDK de Cloudinary.
   * **Optimización Automática:** Formato WebP inteligente (`format: 'webp'`), compresión adaptativa (`quality: 'auto'`) y dimensiones restringidas (`500x500`, `crop: 'limit'`).
   * **Estructura de Carpetas:**
     * `siger-fmc/personal-fmc`: Avatares de trabajadores y administradores.
     * `siger-fmc/evidencias-tickets`: Fotos de equipos recibidos, diagnóstico y entrega.
   * **Limpieza de Recursos Huérfanos:** Al actualizar o remover fotos, se invoca `deleteImageByUrl(url)` para destruir el asset previo en Cloudinary.
   * **Experiencia de Usuario (Dropzone):** Modales con selector dropzone completo (`onDragOver`, `onDrop`, `onClick`), preview instantáneo (`URL.createObjectURL`), feedback animado y timeout de petición extendido a 120 segundos.
3. **Manejo de Incidencias:**
   * Si una incidencia incluye costo de repuesto, inicia con `aprobado_por_cliente = 0`.
   * El `costo_final_confirmado` del ticket no suma este valor hasta que se confirme la aprobación.
4. **Seguridad y Roles:**
   * `SuperAdmin`: Acceso a todas las sucursales y usuarios.
   * `Admin_Sucursal`: Filtrado automático de consultas por su `sucursal_id`.
   * `Tecnico`: Solo gestiona tickets asignados o de su sede.
   * `Secretaria`: Apertura de órdenes, asignación básica y cobro/entrega.

## 6. Identidad Visual, UI/UX y Sistema de Temas

### Filosofía de Diseño
* **Estilo:** Minimalismo técnico y moderno, inspirado en **Supabase** (contrastes definidos, bordes sutiles, tipografías limpias y microinteracciones suaves).
* **Tema Predeterminado:** Modo **Claro (Light)** por defecto con soporte nativo para **Oscuro (Dark)**.
* **Persistencia:** Guardado en `localStorage.getItem('siger_theme')`.
* **Vista `/login`:** No muestra botón de cambio de tema (tema limpio institucional).

---

### Paleta de Colores por Tema

#### Modo Claro (Predeterminado)
* **Fondo Base (`bg-background`):** `#FAFAFA` (Zinc 50)
* **Superficies y Tarjetas (`bg-card`):** `#FFFFFF` (Blanco puro)
* **Bordes y Divisores (`border-border`):** `#E4E4E7` (Zinc 200)
* **Texto Primario (`text-primary`):** `#18181B` (Zinc 900)
* **Texto Secundario (`text-muted`):** `#71717A` (Zinc 500)
* **Inputs y Formularios:** `#FFFFFF` con bordes `#E4E4E7`

#### Modo Oscuro (Estilo Grafito Supabase)
* **Fondo Base (`bg-background`):** `#121212` / `#18181B` (Zinc 900)
* **Superficies y Tarjetas (`bg-card`):** `#1E1E24` / `#27272A` (Zinc 800)
* **Bordes y Divisores (`border-border`):** `#3F3F46` / `#27272A` (Zinc 700/800)
* **Texto Primario (`text-primary`):** `#F4F4F5` (Zinc 100)
* **Texto Secundario (`text-muted`):** `#A1A1AA` (Zinc 400)
* **Inputs y Formularios:** `#09090B` (Zinc 950) con bordes `#27272A`

#### Colores de Acento y Marca
* **Acento Primario (Rojo Marca):** `#E11D48` / `#EF4444` (Rose/Red 600).
* **Acento Hover/Focus:** `#BE123C` / `#DC2626` (Rose/Red 700).

### Tipografía Oficial
* **Fuente Corporativa:** **Sora** (Google Fonts) configurada como fuente predeterminada del sistema (`font-sans`).
* **Familia CSS:** `'Sora', sans-serif`.
* **Pesos Tipográficos:** Light (300), Regular (400), Medium (500), SemiBold (600), Bold (700), ExtraBold (800).
* Se aplica de manera global y uniforme a todos los componentes de la interfaz (encabezados, párrafos, tablas, formularios, modales, badges y botones).

### Estilo de Badges y Etiquetas
* **Bordes y Radio:** Se utiliza **`rounded-lg`** o `rounded-md` con padding compacto (`px-2.5 py-1 text-xs font-medium border`), descartando la forma genérica de píldora (`rounded-full`).
* **Etiquetas Limpias:** Se deben formatear siempre los nombres de roles a etiquetas de presentación legibles:
  * `SuperAdmin` ➔ `Super Admin`
  * `Admin_Sucursal` ➔ `Admin Sucursal`
  * `Secretaria` ➔ `Secretaria`
  * `Tecnico` ➔ `Técnico`

---

### Paleta Funcional para Estados (Badges & Tracking)
* **Recibido:** `#71717A`
* **En Diagnóstico:** `#38BDF8`
* **En Espera de Repuesto:** `#FBBF24`
* **En Reparación:** `#A855F7`
* **Control de Calidad:** `#F472B6`
* **Listo para Entrega:** `#34D399`
* **Entregado:** `#059669`
* **Cancelado / No Reparado:** `#EF4444`

---

### Contenedores y Tarjetas de Gestión
* **Cabecera y Filtros Integrados:** El título de la vista, la descripción, el botón de refrescar y el botón de acción principal (`+ Nuevo ...`) deben residir dentro de la misma tarjeta superior que contiene los buscadores y filtros.
* **Filas Inactivas:** Las filas con registros deshabilitados o inactivos (`activo = false`) deben mostrarse con opacidad atenuada (`opacity-50`) para comunicar visualmente su estado sin alterar la alineación.
* **Botones de Acción en Tablas:** Los botones de acción por fila (Editar, Activar/Desactivar) comparten dimensiones idénticas (`p-2 rounded-lg`), color base neutro (`text-neutral-500`) y estados hover sutiles.

---

## 7. Estructura del Layout y Navegación

* **Header Superior (Navbar):**
  * Extensión completa de extremo a extremo (100% ancho).
  * Izquierda: Logo institucional (`logo-FMC Black/White.png`) + Badge con nombre y código de sucursal (`MATRIZ`).
  * Derecha Desktop (>= 1024px): Avatar de usuario, nombre, rol y botón de logout.
  * Derecha Móvil (< 1024px): Botón hamburguesa animado con `MorphIcon` (`Menu` / `X` de `lucide`).
* **Barra Lateral Desktop (Sidebar):**
  * Ubicada verticalmente debajo del Header, visible en pantallas grandes (`hidden lg:flex`).
  * 3 Modos con persistencia en `localStorage ('siger_sidebar_mode')`:
    1. `expanded`: Fijo expandido (`w-64`).
    2. `hover`: Auto-expandir al posar cursor (`w-16` a `w-64`).
    3. `collapsed`: Fijo colapsado compacto (`w-16`).
  * Controles inferiores (solo icono): Botón de cambio de tema (`Sun`/`Moon` con `MorphIcon`) y selector de modo con menú en texto limpio.
* **Diseño Responsivo y Menú Móvil (< 1024px):**
  * Menú fullscreen a pantalla completa (`fixed inset-0 top-16 z-50`) con animación suave de apertura y cierre.
  * Contenido móvil: Badge de sucursal, lista de módulos con cierre automático al navegar, y sección inferior compacta con perfil, toggle de tema (`MorphIcon`) y botón de logout.

---

## 8. Patrones de Interfaz y UX (Modales vs. Páginas)

### Criterio de Selección: Modales vs. Vistas Dedicadas
* **Modales (`Modal.jsx` y `ConfirmModal.jsx`):**
  * Reservados exclusivamente para acciones atómicas, rápidas y formularios cortos que no deben perder el contexto de la vista principal.
  * **Modal Estándar (`Modal.jsx`):** Creación o edición de entidades (trabajadores, clientes), formularios en dos columnas y selects dinámicos.
  * **Modal de Confirmación (`ConfirmModal.jsx`):** Acciones críticas o destructivas (activar/desactivar cuentas, eliminar registros, cambiar estados sensibles) con variantes temáticas (`danger`, `warning`, `info`), iconos descriptivos y estados asíncronos (`isLoading`).
  * Características: Cierre con `Esc`, clic exterior opcional, backdrop con desenfoque suave (`backdrop-blur-xs`) y scroll interno si el contenido lo requiere.
* **Vistas Dedicadas con Breadcrumbs y Stepper:**
  * Obligatorias para flujos largos, formularios complejos o vistas con alta densidad de datos.
  * Casos de uso: Recepción y apertura de órdenes de servicio, detalle completo de diagnóstico y banco de trabajo técnico.
  * Características: Rutas propias (`/tickets/nuevo`, `/tickets/:id`), persistencia en navegación e historial del navegador.

### Especificación de Componentes de Navegación

#### Breadcrumbs (`Breadcrumbs.jsx`)
* Cabecera de navegación superior interactiva con enlaces contextuales.
* Formato: `Módulo / Subsección` (ej. `Órdenes de Servicio / Recibir Dispositivo`).
* Separador sutil (`/` o `ChevronRight`), texto atenuado en niveles previos y texto resaltado en el nivel actual.

#### Stepper / Asistente por Pasos (`Stepper.jsx`)
* Indicador visual superior para procesos secuenciales.
* Elementos:
  * Badges circulares numerados (completado con `Check`, activo con color de acento `#E11D48`, pendiente en gris neutro).
  * Línea conectora horizontal entre pasos.
  * Título y descripción corta por fase:
    * **Paso 1:** Cliente y Dispositivo (Datos del cliente, marca, modelo e IMEI).
    * **Paso 2:** Diagnóstico y Checklist (Falla reportada, condiciones estéticas y pruebas iniciales).
    * **Paso 3:** Presupuesto y Confirmación (Costos previstos, garantía y emisión de orden).

### 8.3 Catálogo de Componentes Comunes Reutilizables (`frontend/src/components/common/`)

1. **`SingleImageDropzone.jsx` (Zona de Carga Multimedia / Avatar):**
   * **Props Estándar:**
     * `value`: URL remota de la imagen guardada (`string | null`).
     * `preview`: URL de previsualización local (`Data URL | Blob | ObjectURL | null`).
     * `onChange`: Callback `(file: File) => void` al seleccionar o soltar un archivo válido.
     * `onRemove`: Callback `() => void` al presionar el botón de eliminar.
     * `disabled`: Bloquea las interacciones durante operaciones asíncronas (`boolean`).
     * `maxSizeMB`: Límite máximo en MB (por defecto: `5`).
     * `label`: Texto principal personalizable (por defecto: *"Arrastra o haz clic para cambiar foto"*).
     * `description`: Texto secundario (por defecto: *"JPG, PNG o WEBP · Máx. 5MB"*).
     * `initials`: Iniciales o texto fallback si no hay imagen (`string`).
     * `className`: Clases adicionales de Tailwind (`string`).
   * **Comportamiento:** Encapsula drag & drop (`onDragOver`, `onDragLeave`, `onDrop`), click trigger, validación de tipos MIME y tamaño, preview local inmediato y botón de eliminación con `e.stopPropagation()`.

2. **`Select.jsx` (Selector Personalizado):**
   * **Props:** `value`, `onChange`, `items` (`{ id, label, supportingText, avatarUrl, icon, disabled }`), `placeholder`, `label`, `hint`, `error`, `isRequired`, `disabled`.

3. **`Tooltip.jsx` (Tooltip Flotante Accesible en Chevrón / Clip-Path):**
   * **Props:** `children`, `content`, `position` (`'right' | 'left' | 'top' | 'bottom'`, por defecto: `'right'`), `enabled` (`boolean`), `className`.
   * **Comportamiento:** Renderiza el globo de información con forma poligonal continua mediante `clip-path` (chevrón/etiqueta apuntando hacia el disparador), padding adaptativo, sombra `shadow-md` y fondo neutro sólido (`bg-neutral-900 dark:bg-zinc-800 text-white`).

4. **`ResetFiltersButton.jsx` (Botón de Reset Animado):**
   * **Props:** `onClick`, `hasActiveFilters`, `disabled`, `durationMs` (por defecto: `1200`), `title`.

5. **`Modal.jsx` y Modales de Formulario (`WorkerModal.jsx`, `ClientModal.jsx`, `BranchModal.jsx`):**
   * **Props:** `isOpen`, `onClose`, `title`, `description`, `maxWidth`, variantes (`danger`, `warning`, `info`), `isLoading`.
   * **Estructura y Dimensiones:** Ancho homologado a `maxWidth="max-w-3xl"`, esquinas curvas `rounded-2xl`, cabecera fija, scroll interno con padding `p-4 sm:p-6` y pie de acciones consistente.
   * **Control de Campos por Rol (RBAC):**
     * En `BranchModal.jsx`: cuando el usuario autenticado tiene rol `Admin_Sucursal`, los campos `codigo_sucursal` y `nombre_sucursal` se renderizan deshabilitados y de solo lectura (`disabled`, `opacity-60 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed select-none`), permitiendo la edición únicamente de los campos operativos `telefono` y `direccion`. En el backend, el endpoint `PUT /api/configuracion/sucursales/:id` descarta cualquier mutación sobre dichos campos institucionales para roles no globales.

6. **`Button.jsx` (Botón Reutilizable):**
   * **Props:** `children`, `onClick`, `type` (`'button' | 'submit' | 'reset'`), `variant` (`'primary' | 'secondary' | 'danger' | 'outline' | 'ghost'`), `size` (`'sm' | 'md' | 'lg'`), `disabled`, `isLoading` (spinner `Loader2` integrado), `icon` (componente o elemento), `iconPosition` (`'left' | 'right'`), `className`.
   * **Estética:** Bordes redondeados `rounded-xl`, sombra suave, transiciones y variantes consistentes con el diseño de la aplicación.

7. **`Badge.jsx` (Insignia / Chip de Estado):**
   * **Props:** `children`, `variant` (`'success' | 'danger' | 'warning' | 'info' | 'neutral'`), `size` (`'sm' | 'md'`), `showDot` (`boolean`, por defecto: `true`), `icon` (componente funcional de `lucide-react`, ej. `CheckCircle2`, `XCircle`, `Sparkles`), `className`.
   * **Comportamiento y Renderizado:**
     * Si se pasa la prop `icon`, se renderiza con dimensionamiento adaptativo proporcional (`w-3 h-3` para `size="sm"` y `w-3.5 h-3.5` para `size="md"`) heredando el color semántico de la variante.
     * Si no se pasa `icon` y `showDot` es `true`, renderiza el punto indicador circular (`w-1.5 h-1.5 rounded-full`).
   * **Estética:** Bordes suaves `rounded-lg`, padding equilibrado y tipografía `font-medium text-xs`.

---

## 9. Reglas de Backend y Seguridad

* **Autenticación:** Login exclusivo mediante el campo **`usuario`** (columna `usuario` en `datos_trabajadores`) y hash `bcryptjs`.
* **Middlewares de Acceso:**
  * `authMiddleware`: Validación de token JWT en header `Authorization: Bearer <token>`.
  * `checkRole(['SuperAdmin', ...])`: Restricción de endpoints según el rol del usuario.
  * `requireBranchAccess`: Control de alcance de datos (SuperAdmin = omnicanal/global; otros roles = filtrado estricto por su `sucursal_id`).

---

### Consideraciones personales
- No usar comentarios explicativos largos (simplificar), a menos que se soliciten.
- No usar emojis ni caracteres extraños para decorar textos.
