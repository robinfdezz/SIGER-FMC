```markdown
# 📋 Guía de Arquitectura y Desarrollo - SIGER-FMC

## 1. Resumen y Propósito
**SIGER-FMC** es un sistema web para el taller de servicio técnico y reparación de dispositivos electrónicos **Franyer Mobile Center, S.R.L.** Su objetivo es gestionar el ciclo de vida completo de cada servicio técnico con trazabilidad paso a paso (estilo paquetería/courier), control de incidencias, evidencias fotográficas y seguimiento público para clientes.

---

## 2. Stack Tecnológico

* **Frontend:** React.js (Vite), React Router v6, Tailwind CSS, Lucide React (Íconos), Axios.
* **Backend:** Node.js, Express.js.
* **Base de Datos:** Microsoft SQL Server (driver `mssql` con Connection Pool).
* **Autenticación:** JSON Web Tokens (JWT) + Hashing de contraseñas con `bcryptjs` (salt rounds = 10).
* **Multimedia:** Cloudinary con compresión previa en el cliente (`browser-image-compression`).

---

## 3. Arquitectura del Proyecto

### Estructura del Backend (`/backend`)



backend/
├── src/
│   ├── config/          # db.js (SQL Server pool), cloudinary.js
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

### Paleta de Colores por Estado de Servicio
* **Recibido:** `#6B7280` (Gris neutro)
* **En Diagnóstico:** `#3B82F6` (Azul informativo)
* **En Espera de Repuesto:** `#F59E0B` (Ámbar / Alerta)
* **En Reparación:** `#8B5CF6` (Púrpura / Trabajo activo)
* **Control de Calidad:** `#EC4899` (Rosa / Pruebas)
* **Listo para Entrega:** `#10B981` (Verde claro / Finalizado)
* **Entregado:** `#059669` (Verde oscuro / Completado)
* **Cancelado / No Reparado:** `#EF4444` (Rojo / Detenido)

### Reglas de Interfaz
* **Diseño Responsive:** Optimizado para tablets y móviles (uso de técnicos en banco de trabajo).
* **Feedback Visual:** Spinners en peticiones asíncronas, toasts de notificación para acciones exitosas/fallidas.
* **Fotos de Perfil:** Si el usuario no tiene `foto_perfil_url`, mostrar un avatar con sus iniciales.
* **Seguimiento Público:** Vista minimalista y limpia para clientes sin requerir inicio de sesión.

---

## 5. Reglas de Negocio y Flujo de Trabajo

1. **Creación de Tickets:** Al registrar un servicio, se genera un código correlativo único (ej. `TKT-2026-0001`) y se crea automáticamente el primer registro en `Historial_Estados` con estado `RECIBIDO`.
2. **Subida de Imágenes:**
   * Las fotos se comprimen en React antes de subir (`maxWidth: 1920px`, `maxSizeMB: 0.3`).
   * Se suben a Cloudinary y solo la URL se guarda en `Evidencias_Fotograficas`.
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

## 7. Estructura del Layout y Navegación

* **Header Superior (Navbar):**
  * Extensión completa de extremo a extremo (100% ancho).
  * Izquierda: Logo institucional (`logo-FMC Black/White.png`) + Badge con nombre y código de sucursal.
  * Derecha: Avatar de usuario, nombre, rol y botón de logout.
* **Barra Lateral (Sidebar):**
  * Ubicada verticalmente debajo del Header.
  * 3 Modos con persistencia en `localStorage ('siger_sidebar_mode')`:
    1. `expanded`: Fijo expandido (`w-64`).
    2. `hover`: Auto-expandir al posar cursor (`w-16` a `w-64`).
    3. `collapsed`: Fijo colapsado compacto (`w-16`).
  * Controles inferiores (solo icono): Botón de cambio de tema (`Sun`/`Moon`) y botón selector de modo con menú desplegable en texto limpio.

---

## 8. Reglas de Backend y Seguridad

* **Autenticación:** Login exclusivo mediante el campo **`usuario`** (columna `usuario` en `Datos_Trabajadores`) y hash `bcryptjs`.
* **Middlewares de Acceso:**
  * `authMiddleware`: Validación de token JWT en header `Authorization: Bearer <token>`.
  * `checkRole(['SuperAdmin', ...])`: Restricción de endpoints según el rol del usuario.
  * `requireBranchAccess`: Control de alcance de datos (SuperAdmin = omnicanal/global; otros roles = filtrado estricto por su `sucursal_id`).

---

### Consideraciones personales
- No usar comentarios explicativos largos (simplificar), a menos que se soliciten.
- No usar emojis ni caracteres extraños para decorar textos.
