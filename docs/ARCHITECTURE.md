# Arquitectura Global del Sistema - SIGER-FMC

Documento técnico descriptivo de la arquitectura de software, patrones de diseño, estructura de módulos, seguridad y flujo operativo de **SIGER-FMC** (Sistema Integral de Gestión y Reparación para Franyer Mobile Center, S.R.L.).

---

## 1. Visión General y Patrón de Diseño

SIGER-FMC está implementado bajo una arquitectura desacoplada de 3 capas:

```
┌───────────────────────────────────────────────────────────┐
│                     1. Capa Cliente                       │
│      React 18 + Vite + Tailwind CSS + Morphicons / Lucide │
└─────────────────────────────┬─────────────────────────────┘
                              │ HTTP / REST (Axios + JWT)
                              ▼
┌───────────────────────────────────────────────────────────┐
│                    2. Capa Servidor                       │
│        Node.js + Express (API RESTful + Middlewares)      │
└─────────────────────────────┬─────────────────────────────┘
                              │ Pool de Conexiones (pg)
                              ▼
┌───────────────────────────────────────────────────────────┐
│                 3. Capa de Persistencia                   │
│       PostgreSQL 15+/18.x (siger_fmc_db - UTF-8 / Relacional)│
└───────────────────────────────────────────────────────────┘
```

### Principios Arquitectónicos
- **Separación de Responsabilidades:** El cliente web consume exclusivamente la API REST del backend mediante llamadas asíncronas seguras con tokens JWT.
- **Aislamiento Multi-Sucursal:** Control de acceso a nivel de middleware que restringe el alcance de datos según la sucursal asignada del trabajador, permitiendo a `SuperAdmin` una visión omnicanal.
- **Trazabilidad Inmutable:** Cada cambio de estado, diagnóstico o incidencia genera registros históricos de auditoría en la base de datos.

---

## 2. Estructura de Directorios

### 2.1 Backend (`/backend`)

```
backend/
├── src/
│   ├── config/              # Conexión a PostgreSQL (db.js) y servicios externos
│   ├── controllers/         # Lógica de controladores por entidad (auth, tickets, etc.)
│   ├── db/                  # Scripts DDL y semillas iniciales (init.sql)
│   ├── middlewares/         # Autenticación (JWT), autorización por roles y aislamientos
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   ├── routes/              # Declaración de rutas y endpoints de la API REST
│   │   └── auth.routes.js
│   └── app.js               # Configuración central de Express, CORS y middlewares globales
├── server.js                # Punto de entrada y arranque del servidor HTTP
├── package.json             # Dependencias del servidor (pg, express, jsonwebtoken, bcryptjs)
├── .env                     # Variables de entorno privadas (ignorado por Git)
└── .env.example             # Plantilla pública de variables requeridas
```

### 2.2 Frontend (`/frontend`)

```
frontend/
├── src/
│   ├── assets/              # Logotipos institucionales, favicons e imágenes estáticas
│   ├── components/          # Componentes visuales reutilizables
│   │   ├── common/          # Componentes transversales y modulares
│   │   │   ├── Breadcrumbs.jsx  # Cabecera contextual (Módulo / Subsección)
│   │   │   ├── Stepper.jsx      # Asistente visual por etapas (Checklist/Presupuesto)
│   │   │   ├── Modal.jsx        # Ventana modal atómica (Clientes, edición)
│   │   │   └── ConfirmModal.jsx # Modal de confirmación de acciones críticas
│   │   ├── DashboardLayout.jsx  # Shell principal (Header + Sidebar + Menú móvil)
│   │   ├── Navbar.jsx           # Header superior de 100% de ancho
│   │   ├── Sidebar.jsx          # Barra lateral con 3 modos (expanded, hover, collapsed)
│   │   ├── ProtectedRoute.jsx   # Guarda de rutas privadas
│   │   └── ThemeToggle.jsx      # Alternancia animada de tema claro/oscuro
│   ├── context/             # Proveedores de estado global de React
│   │   ├── AuthContext.jsx      # Sesión del trabajador, persistencia y estado
│   │   └── ThemeContext.jsx     # Manejo del tema (Light por defecto / Dark)
│   ├── pages/               # Vistas principales del sistema
│   │   ├── Login/               # LoginPage.jsx (Formulario institucional, validaciones)
│   │   ├── Dashboard/           # DashboardPage.jsx (Métricas, resumen y accesos)
│   │   └── Tickets/             # Vistas del módulo de órdenes y recepción
│   │       ├── TicketsPage.jsx  # Listado general de órdenes con filtros
│   │       ├── NewTicketPage.jsx# Flujo por etapas (Stepper) de recepción
│   │       └── TicketDetailPage.jsx # Detalle integral del servicio técnico
│   ├── services/            # Clientes de red y configuración HTTP
│   │   └── api.js               # Instancia de Axios con interceptor automático de JWT
│   ├── hooks/               # Custom hooks reutilizables
│   ├── App.jsx              # Configuración de React Router y providers globales
│   ├── main.jsx             # Montaje de la aplicación React en el DOM
│   └── index.css            # Directivas Tailwind y tokens del sistema de diseño
├── package.json             # Dependencias del cliente (react, vite, tailwindcss, morphicons)
├── tailwind.config.js       # Paleta de colores, breakpoints y temas
├── vite.config.js           # Configuración del bundler y proxy de desarrollo
└── index.html               # Plantilla HTML base con favicon institucional y fuentes
```

---

## 3. Flujo de Autenticación y Seguridad

### 3.1 Ciclo de Vida del Token JWT

1. **Petición de Acceso (`POST /api/auth/login`):**
   - El trabajador ingresa su `usuario` y `password`.
   - El backend busca el registro en `datos_trabajadores` con JOIN a `roles_equipo` y `datos_sucursales`.
   - Se valida el estado activo (`activo = TRUE`) y se compara la contraseña con `bcryptjs`.
   - Si es válido, se actualiza `ultimo_login = CURRENT_TIMESTAMP` y se emite un JWT firmado.

2. **Estructura del Payload JWT:**
   ```json
   {
     "id": 1,
     "nombre": "Franyer",
     "apellido": "Administrador",
     "usuario": "superadmin",
     "correo": "admin@franyermobile.com",
     "rol_id": 1,
     "rol_nombre": "SuperAdmin",
     "sucursal_id": null,
     "sucursal_nombre": "Todas las Sucursales"
   }
   ```

3. **Almacenamiento y Transmisión en el Cliente:**
   - Si se marca *"Recordar sesión en este equipo"*, el token se almacena en `localStorage` (`siger_token`); de lo contrario, en `sessionStorage`.
   - El interceptor de [src/services/api.js](file:///c:/Users/pc/Desktop/SIGER-FMC/frontend/src/services/api.js) adjunta automáticamente el header en cada petición saliente:
     ```http
     Authorization: Bearer <token_jwt>
     ```

4. **Validación en Backend (`authMiddleware.js`):**
   - Extrae el Bearer token, verifica su firma con `JWT_SECRET` y vigencia (`JWT_EXPIRES_IN=24h`).
   - Inyecta `req.user` con los datos decodificados en el ciclo de la petición.

### 3.2 Jerarquía de Roles y Control de Acceso

| Rol | Alcance de Datos | Permisos Operativos |
| :--- | :--- | :--- |
| **`SuperAdmin`** | Omnicanal (Todas las sedes) | Control total del sistema, finanzas, auditoría, configuración y gestión de usuarios. |
| **`Admin_Sucursal`**| Sede Asignada | Gestión operativa y administrativa de su sucursal, reasignación técnica y reportes. |
| **`Secretaria`** | Sede Asignada | Recepción de equipos, generación de tickets, atención a clientes, cobros y entregas. |
| **`Tecnico`** | Sede Asignada | Banco de trabajo, actualización de diagnósticos, registro de repuestos/incidencias y fotos. |

- **`checkRole(['SuperAdmin', ...])`:** Restringe endpoints según los roles declarados.
- **`requireBranchAccess`:** Aplica filtrado automático `WHERE sucursal_id = req.user.sucursal_id` para trabajadores no administradores globales.

---

## 4. Ciclo de Vida de un Ticket (Servicio de Recepción)

Cada orden de servicio técnico en la tabla `servicios_recepcion` sigue un flujo secuencial estandarizado:

```
 [1. RECIBIDO] ──► [2. EN_DIAGNOSTICO] ──► [3. ESPERA_REPUESTO] (Opcional)
        │                   │                         │
        │                   ▼                         │
        │           [4. EN_REPARACION] ◄──────────────┘
        │                   │
        │                   ▼
        │         [5. CONTROL_CALIDAD]
        │                   │
        │                   ▼
        │          [6. LISTO_ENTREGA]
        │             │           │
        ▼             ▼           ▼
[8. CANCELADO_DEVUELTO]     [7. ENTREGADO]
```

### 4.1 Estados Oficiales del Flujo

1. **`RECIBIDO` (Orden 1 - `#6B7280`):** Equipo ingresado en sucursal con falla reportada, observaciones estéticas, checklist inicial y código único de ticket (`TKT-YYYY-XXXX`).
2. **`EN_DIAGNOSTICO` (Orden 2 - `#3B82F6`):** Asignado a un técnico en banco de trabajo para evaluación de componentes y fallas ocultas.
3. **`ESPERA_REPUESTO` (Orden 3 - `#F59E0B`):** Estado temporal si se requiere una pieza no disponible en inventario local.
4. **`EN_REPARACION` (Orden 4 - `#8B5CF6`):** Procedimiento técnico activo de cambio de repuesto, microsoldadura o software.
5. **`CONTROL_CALIDAD` (Orden 5 - `#EC4899`):** Pruebas de funcionamiento post-reparación (carga, cámaras, pantalla, sensores).
6. **`LISTO_ENTREGA` (Orden 6 - `#10B981`):** Equipo listo con presupuesto final consolidado y notificación al cliente.
7. **`ENTREGADO` (Orden 7 - `#059669`):** Entrega física al cliente, cobro registrado y activación del periodo de garantía.
8. **`CANCELADO_DEVUELTO` (Orden 8 - `#EF4444`):** Servicio cancelado por no aceptación de presupuesto o dispositivo no reparable.

### 4.2 Trazabilidad, Incidencias y Evidencias

- **Historial Inmutable (`historial_estados`):** Cada cambio de estado genera un registro automático con `servicio_id`, `estado_id`, `usuario_id`, `nota_cambio` y `fecha_registro`.
- **Gestión de Incidencias (`incidencias_servicio`):** Registra novedades durante la reparación (`Hallazgo Tecnico`, `Pieza Extra`, `Aviso al Cliente`, `Imprevisto`), costo adicional del repuesto y estado de aprobación (`aprobado_por_cliente`).
- **Galería Multimedia (`evidencias_fotograficas`):** Registro de fotos antes, durante y después de la reparación vinculadas al ticket o a una incidencia particular.
- **Seguimiento Público:** Los clientes pueden consultar en tiempo real el progreso de su dispositivo introduciendo su `codigo_ticket` sin requerir inicio de sesión.

### 4.3 Arquitectura de Vistas: Flujo por Etapas (Stepper) vs. Modales Atómicos

Para optimizar la experiencia de usuario y la confiabilidad operativa, el frontend divide las interacciones según su complejidad:

1. **Rutas Dedicadas con Stepper (`/tickets/nuevo`):**
   - La recepción y apertura de tickets se estructura en una página independiente con asistente por pasos (`Stepper.jsx`) y migas de pan (`Breadcrumbs.jsx`).
   - Ventajas arquitectónicas: Garantiza compatibilidad nativa con el historial de navegación (botones atrás/adelante del navegador), previene pérdidas accidentales de datos extensos y permite validaciones modulares por etapa (Cliente/Equipo -> Diagnóstico/Checklist -> Presupuesto/Condiciones).
2. **Modales Atómicos y de Confirmación (`Modal.jsx`, `ConfirmModal.jsx`):**
   - Acciones puntuales que no requieren salir de la tabla o vista actual (ej. creación rápida de un nuevo cliente desde un selector, edición de datos de trabajadores, o confirmación modal obligatoria para activar/desactivar cuentas y registrar repuestos extras).