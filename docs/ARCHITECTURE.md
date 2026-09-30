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
│   ├── config/              # db.js, cloudinary.js, email.js, emailTemplates.js
│   ├── controllers/         # auth, servicios, clients, workers, configuracion, uploadSession, search, notifications
│   ├── db/                  # Scripts DDL y semillas iniciales (init.sql)
│   ├── middlewares/         # Autenticación (JWT), RBAC, upload (Multer) y anti-bot
│   │   ├── authMiddleware.js
│   │   ├── roleMiddleware.js
│   │   ├── turnstile.middleware.js # Validación de tokens Cloudflare Turnstile
│   │   └── upload.js
│   ├── routes/              # Declaración de rutas y endpoints de la API REST
│   │   ├── auth.routes.js
│   │   ├── servicios.routes.js
│   │   ├── reportes.routes.js   # Informes, KPIs analíticos, series temporales y exportación
│   │   ├── clients.routes.js
│   │   ├── workers.routes.js
│   │   ├── configuracion.routes.js
│   │   ├── uploadSession.routes.js
│   │   ├── search.routes.js
│   │   ├── notifications.routes.js
│   │   └── catalogos.routes.js
│   ├── templates/email/     # Borradores HTML de plantillas Resend (cliente + interno)
│   ├── utils/               # notifications.js (campanita + disparo de correo tipado)
│   └── app.js               # Configuración central de Express, CORS y middlewares globales
├── server.js                # Punto de entrada y arranque del servidor HTTP
├── package.json             # Dependencias (pg, express, jsonwebtoken, bcryptjs, multer, resend)
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
│   │   │   ├── ConfirmModal.jsx # Modal de confirmación de acciones críticas
│   │   │   ├── InlineConfirmButton.jsx # Microcomponente inline de confirmación (sm/md, onBeforeConfirm)
│   │   │   ├── Pagination.jsx   # Paginador universal homologado (selector por página, botones < >)
│   │   │   ├── Skeleton.jsx     # Primitiva atómica de carga con pulso y gradiente HSL adaptativo
│   │   │   ├── TableSkeleton.jsx# Estructura configurable para tablas de gestión con 0% CLS
│   │   │   ├── TurnstileWidget.jsx # Widget anti-bot Cloudflare con soporte dark mode
│   │   │   ├── SingleImageDropzone.jsx # Subida y recorte de logotipo / avatares
│   │   │   ├── HelpDocsModal.jsx # Modal de documentación interactiva y atajos de teclado
│   │   │   ├── KeycapSequence.jsx # Renderizado visual de secuencias de teclas
│   │   │   └── TicketQR.jsx     # Renderizado vectorial QR dinámico
│   │   ├── charts/          # Gráficas analíticas vectoriales (SVG / Catmull-Rom)
│   │   │   ├── IncomeAreaChart.jsx # Curva suave con degradado esmeralda para ingresos
│   │   │   └── ReportTrendChart.jsx # Tendencia temporal de entradas vs entregas
│   │   ├── dashboard/       # Componentes analíticos del panel de control
│   │   │   └── DeviceCategoryDonut.jsx # Gráfica interactiva de categorías en dona SVG
│   │   ├── configuration/   # Pestañas de configuración institucional
│   │   │   ├── CompanyProfileTab.jsx # Perfil matriz, RNC, dirección y logotipo Cloudinary
│   │   │   ├── BranchesTab.jsx       # Gestión de sedes y datos operativos
│   │   │   └── PrintingTab.jsx       # Personalización sincronizada de Tickets y Stickers
│   │   ├── servicios/       # Modales y comprobantes de recepción y despacho
│   │   │   ├── CancelarOrdenModal.jsx   # Modal de cancelación de orden con motivo y confirmación
│   │   │   ├── ClientQuickSelect.jsx    # Selector y búsqueda rápida de clientes en mostrador
│   │   │   ├── DeviceChecklistPicker.jsx# Inspección física y checklist funcional (variante minimal)
│   │   │   ├── DevicePhotoUploader.jsx  # Subida de evidencias a Cloudinary
│   │   │   ├── DeviceSecurityPicker.jsx # Diseñador de patrones gráficos y contraseñas
│   │   │   ├── EntregaServicioModal.jsx # Modal de liquidación y cobro con InlineConfirmButton
│   │   │   ├── OrdenDetalleModal.jsx    # Visor 360° de orden con deep linking a taller, skeleton y copia de ticket
│   │   │   ├── PostCreacionModal.jsx    # Diálogo post-creación y selector de reimpresión
│   │   │   ├── PostEntregaModal.jsx     # Diálogo post-despacho y disparador de recibo
│   │   │   ├── QrUploadModal.jsx        # Modal de sincronización QR para fotos móviles
│   │   │   ├── ReciboEntregaTermico.jsx # Comprobante térmico de salida y liquidación
│   │   │   ├── ServiceTimeline.jsx      # Línea de tiempo unificada (taller y portal público)
│   │   │   ├── StepperHeader.jsx        # Encabezado modular de fases del stepper de recepción
│   │   │   ├── StickerTermico.jsx       # Etiqueta adhesiva térmica con QR
│   │   │   └── TicketTermico.jsx        # Ticket térmico original de recepción
│   │   ├── taller/          # Componentes de mesa de trabajo técnica
│   │   │   ├── FichaTecnicaModal.jsx    # Ficha técnica, incidencias, timeline y copia tolerante de ticket
│   │   │   ├── TallerCard.jsx           # Tarjeta de orden en banco de trabajo
│   │   │   └── AnimatedTabs.jsx         # Selector animado de fases operativas
│   │   ├── DashboardLayout.jsx  # Shell principal (Header + Sidebar + Menú móvil)
│   │   ├── Navbar.jsx           # Header superior: búsqueda global + campanita + perfil
│   │   ├── GlobalSearch.jsx     # Autocompletado predictivo (órdenes / clientes / equipos) con skeleton anatómico
│   │   ├── NotificationBell.jsx # Campanita in-app (badge, panel, marcar leídas) con skeleton inline
│   │   ├── Sidebar.jsx          # Barra lateral con 3 modos (expanded, hover, collapsed)
│   │   ├── ProtectedRoute.jsx   # Guarda de rutas privadas
│   │   └── ThemeToggle.jsx      # Alternancia animada de tema claro/oscuro
│   ├── context/             # Proveedores de estado global de React
│   │   ├── AuthContext.jsx      # Sesión del trabajador, persistencia y estado
│   │   └── ThemeContext.jsx     # Manejo del tema (Light por defecto / Dark)
│   ├── pages/               # Vistas principales del sistema
│   │   ├── Login/               # LoginPage.jsx (Formulario institucional con Turnstile)
│   │   ├── Dashboard/           # DashboardPage.jsx y DashboardSkeleton.jsx (Layout 2 columnas, métricas y 0% CLS)
│   │   ├── Reportes/            # ReportesPage.jsx, ReportesSkeleton.jsx y ReporteEjecutivoImprimible.jsx
│   │   ├── ServiciosPage.jsx    # Listado general de órdenes con TableSkeleton y filtros
│   │   ├── NuevaOrdenPage.jsx   # Flujo por etapas (Stepper) de recepción con ClientQuickSelect activo
│   │   ├── BancoTrabajoPage.jsx # Tablero operativo Kanban y modo tabla con estados terminales protegidos
│   │   ├── ClientsPage.jsx      # Directorio de clientes con TableSkeleton y bloqueo 409
│   │   ├── WorkersPage.jsx      # Gestión de personal con TableSkeleton y bloqueo 409
│   │   ├── ConfigurationPage.jsx# Panel de configuración matriz, sedes y formatos con skeleton inline
│   │   ├── EstadoOrdenPage.jsx  # Seguimiento público de orden con skeleton anatómico nativo y pegado tolerante
│   │   └── UploadMobilePage.jsx # Captura fotográfica móvil vía QR
│   ├── services/            # Clientes HTTP (api.js, servicios, reportes, search, notifications, etc.)
│   ├── hooks/               # Custom hooks reutilizables (useGlobalShortcuts.js)
│   ├── utils/               # clipboard.js (copia tolerante a fallos), printStyles y formato
│   ├── App.jsx              # Configuración de React Router y providers globales
│   ├── main.jsx             # Punto de montaje de la aplicación React
│   └── index.css            # Directivas Tailwind, animaciones y tokens del sistema de diseño
├── package.json             # Dependencias (react, vite, tailwindcss, morphicons, lucide-react, sileo)
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
- **Control Estricto de Roles en Taller (`checkTecnicoRol`):**
  * **Validación Backend (HTTP 400):** La API (`servicios.controller.js`) valida que cualquier trabajador asignado como técnico a una orden posea indefectiblemente el rol `'Tecnico'`. Si un usuario con rol `'SuperAdmin'`, `'Admin_Sucursal'` o `'Secretaria'` intenta autoasignarse o ser asignado en `tecnicos_asignados`, la transacción se aborta con error HTTP 400 explicativo.
  * **Filtro de Catálogo (`?solo_tecnicos=true`):** El endpoint `/api/trabajadores` soporta el flag `solo_tecnicos=true` para nutrir los selectores de la interfaz únicamente con personal técnico activo de la sucursal.
  * **Ocultamiento Condicional en UI:** En `TallerCard.jsx` y `FichaTecnicaModal.jsx`, los controles de autoasignación rápida y selección técnica se renderizan condicionalmente según `user.rol_nombre === 'Tecnico'`.
  * **Suite de Aislamiento y Roles (`test_branch_isolation.js`):** Conjunto de 12/12 pruebas automatizadas que verifican la impenetrabilidad del filtrado multi-sucursal y la inviolabilidad de las reglas de asignación técnica.

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
- **Módulo de Incidencias Técnicas (`incidencias_servicio`):**
  - Permite documentar hallazgos durante el desensamble (`Hallazgo Tecnico`, `Pieza Extra`, `Aviso al Cliente`, `Imprevisto`), costos adicionales de repuestos y técnico autor.
  - **Aislamiento Fotográfico Estricto:** Las fotografías subidas a Cloudinary se segregan por su columna `tipo_evidencia` e `incidencia_id` en `evidencias_fotograficas`. Las fotos de recepción inicial (`tipo_evidencia = 'RECEPCION'`) no se mezclan con las evidencias técnicas de una incidencia (`tipo_evidencia = 'INCIDENCIA'`).
  - **Ciclo de Vida de Autorización del Cliente:**
    * **Aprobación:** Si el cliente autoriza el costo extra, se registra `aprobado_por_cliente = TRUE`, `fecha_aprobacion = NOW()` y el canal informado (`metodo_aprobacion` entre `'WhatsApp'`, `'Llamada'`, `'Presencial'`). Este costo se suma al total consolidado a cobrar.
    * **Rechazo Explícito:** Si el cliente declina el costo adicional, se registra `aprobado_por_cliente = FALSE`, `fecha_aprobacion = NOW()` y `estado_aprobacion = 'RECHAZADO'`. En la interfaz, el costo se tacha (`line-through`) y se excluye del balance financiero, preservando la posibilidad de reconsideración.
    * **Pendiente:** Si la incidencia tiene costo extra y aún no ha sido respondida, se marca como `'PENDIENTE'`, bloqueando el cierre financiero hasta su resolución.
- **Seguimiento Público:** Los clientes pueden consultar en tiempo real el progreso de su dispositivo introduciendo su `codigo_ticket` sin requerir inicio de sesión.

### 4.3 Portal de Seguimiento Público y Contrato de Datos Extendido (`EstadoOrdenPage.jsx`, `ServiceTimeline.jsx`)

El portal público permite a los clientes consultar en tiempo real el estado de reparación de su dispositivo introduciendo su `codigo_ticket` sin requerir autenticación (`GET /api/servicios/consulta/:ticket`).

#### 1. Contrato de Datos del Endpoint Público (`getServicioByTicket`)
La consulta en `servicios.controller.js` proyecta un payload enriquecido mediante subconsultas SQL con agregaciones JSON nativas de PostgreSQL:

| Campo / Objeto | Tipo | Descripción |
| :--- | :--- | :--- |
| `id`, `codigo_ticket` | `integer`, `string` | Identificador interno y código alfanumérico visible del ticket. |
| `marca_equipo`, `modelo_equipo`, `num_serie_imei` | `string` | Identificación técnica del dispositivo en taller. |
| `falla_reportada`, `observaciones_recepcion`, `accesorios_recibidos` | `string` | Diagnóstico inicial, notas de recepción y accesorios entregados. |
| `checklist_entrada` | `json` | Matriz de inspección física y funcional del equipo. |
| `costo_previsto`, `monto_anticipo`, `monto_descuento`, `monto_liquidado` | `numeric` | Balance contable de la orden de servicio. |
| `estado_id`, `codigo_estado`, `estado`, `estado_color`, `orden_flujo` | `mixed` | Fase operativa actual en el flujo de taller (1 al 7). |
| `nombre_cliente`, `telefono_cliente` | `string` | Datos de contacto del titular con resolución `COALESCE`. |
| `sucursal`, `sucursal_telefono` | `string` | Sede responsable de la orden técnica. |
| `tecnicos` | `json (array)` | Lista de técnicos asignados (`id`, `nombre`, `apellido`, `nombre_completo`, `foto_perfil_url`). |
| `fotos` / `fotos_recepcion` | `json (array)` | Evidencias fotográficas de recepción inicial (`tipo_evidencia = 'RECEPCION'`). |
| `historial_estados` | `json (array)` | Historial cronológico de cambios de estado (`id`, `nombre_estado`, `codigo_estado`, `nota_cambio`, `fecha_registro`). |
| `incidencias` | `json (array)` | Incidencias activas del servicio (`id`, `tipo_incidencia`, `descripcion`, `repuesto_requerido`, `costo_adicional_repuesto`, `aprobado_por_cliente`, `fecha_aprobacion`, `metodo_aprobacion`, `estado_aprobacion`, `fotos`). |

#### 2. Regla de Filtrado y Exposición de Incidencias en Modo Público (`ServiceTimeline.jsx`)
Para garantizar la confidencialidad de diagnósticos preliminares y notas internas de taller, el componente `ServiceTimeline` implementa un filtro estricto cuando opera con la propiedad `isPublic={true}`:
```javascript
const visibleEvents = events.filter((ev) => {
  if (!isPublic) return true;
  if (ev.tipo_evento === 'INCIDENCIA') {
    return (
      ev.tipo_incidencia === 'Aviso al Cliente' ||
      ev.aprobado_por_cliente === true ||
      ev.rechazado_por_cliente === true
    );
  }
  return true;
});
```
- **Aviso al Cliente:** Se expone de inmediato para mantener informado al cliente sobre novedades de su equipo.
- **Hallazgos Técnicos Internos:** Permanecen confidenciales en el taller mientras se encuentren pendientes de evaluación interna.
- **Incidencias Aprobadas / Rechazadas:** Se visibilizan junto con su estado de resolución y fotografías adjuntas vinculadas (`tipo_evidencia = 'INCIDENCIA'`).

### 4.4 Arquitectura de Taller y Ficha Técnica (`BancoTrabajoPage.jsx`, `FichaTecnicaModal.jsx`)

1. **Mesa de Trabajo Técnica (`/taller` / `BancoTrabajoPage.jsx`):**
   - Panel de control para técnicos con filtrado en tiempo real y pestañas animadas (`AnimatedTabs.jsx`) que reflejan la distribución de equipos en cada fase del taller (`Recibido`, `En Diagnóstico`, `En Reparación`, `Esperando Repuesto`, `Listo para Entrega`).
   - Tarjetas técnicas (`TallerCard.jsx`) con información sintetizada del cliente, equipo, técnico asignado y prioridad. Incluye el microcomponente `InlineConfirmButton` para autoasignación rápida con confirmación en dos pasos.
2. **Ficha Técnica Modal (`FichaTecnicaModal.jsx`):**
   - Modal interactivo de alta densidad informativa dividido en 4 cuadrantes funcionales:
     * **Datos del Dispositivo y Recepción:** Resumen de cliente, fallas, accesorios y checklist de entrada. Título interactivo con botón de copiado de código de ticket con feedback visual instantáneo (`Check` verde).
     * **Acceso y Seguridad:** Renderizado adaptativo de contraseñas, PIN numérico o patrón gráfico mediante `UnlockMethodView`.
     * **Actualización de Estado y Multi-Técnicos:** Formulario de transición con notas técnicas, endpoints de asignación (`POST/DELETE /api/servicios/:id/tecnicos`) y botón inline de autoasignación `InlineConfirmButton`.
     * **Incidencias y Línea de Tiempo Unificada:** Registro dinámico de hallazgos con cargador de fotos y renderizado modularizado mediante `ServiceTimeline.jsx` (`max-h-[480px]`) que fusiona en orden descendente los hitos de estado y las incidencias con línea discontinua y nodos en forma de anillo hueco (*hollow rings*).

### 4.5 Arquitectura de Credenciales de Seguridad y Patrón de Desbloqueo (`PatternLock.jsx`)

Para visualizar de manera segura el acceso al equipo, el componente `UnlockMethodView` y `PatternLockSvg` manejan dos variantes vectoriales especializadas:
1. **Variante Pantalla / Ficha Técnica (`variant="reception"`):**
   - Homologada 1:1 con el diseñador de recepción (`DeviceSecurityPicker.jsx`): cuadrícula 3x3 de 144px con círculos rojos (`fill="#ef4444"`), números de paso en blanco (1, 2, 3...) dentro de cada nodo, halo exterior translúcido y trazos conectores continuos.
   - Píldora inferior estilizada con `break-all whitespace-normal flex-wrap text-center` que permite envolver secuencias largas sin cortar la información con puntos suspensivos (`...`).
2. **Variante Etiqueta Térmica (`LabelPreview.jsx` & `StickerTermico.jsx`):**
   - Diseñada para rotuladoras e impresoras térmicas de 58mm y 80mm.
   - **Paleta Estrictamente Monocromática:** Trazos y círculos en negro sólido (`#111827`) con números blancos sobre fondo blanco puro, evitando cualquier color rojo para prevenir tramas de escala de grises o manchas borrosas al imprimir.
   - **Contenedor Acotado:** Dimensiones restringidas a `w-20 sm:w-24 max-w-[96px]` con secuencia numérica en píldora micro `wrap` centrada, asegurando convivencia limpia con la columna de datos del cliente (`flex-1 min-w-0 pr-2`).

### 4.6 Módulo de Entrega Final, Liquidación y Comprobantes de Salida [Implementado]

Arquitectura desacoplada en tres componentes especializados para la culminación y despacho formal del servicio técnico:

```
┌──────────────────────────────┐
│  EntregaServicioModal.jsx    │  Formulario de liquidación contable, selección de método
│  (Desglose + DevicePhoto)    │  de pago, cálculo reactivo de devuelta y captura de fotos.
└──────────────┬───────────────┘
               │ Envío POST /api/servicios/:id/entregar
               ▼
┌──────────────────────────────┐
│    PostEntregaModal.jsx      │  Diálogo modal simétrico post-despacho con icono de éxito,
│  (Confirmación y Disparador) │  resumen monetario y botón rojo full-width de impresión.
└──────────────┬───────────────┘
               │ Montaje bajo demanda vía React Portal (#print-mount-point)
               ▼
┌──────────────────────────────┐
│   ReciboEntregaTermico.jsx   │  Comprobante térmico oficial (58mm/80mm) con desglose
│  (Impresión Térmica POS)     │  financiero, garantía, QR y firmas de conformidad.
└──────────────────────────────┘
```

1. **Modal de Liquidación y Despacho (`EntregaServicioModal.jsx`):**
   - **Consolidación Financiera:** Calcula el balance final liquidable:
     $$\text{Balance} = \text{Costo Inicial} + \sum(\text{Incidencias Aprobadas}) - \text{Anticipos} - \text{Descuentos}$$
   - **Manejo de Métodos de Pago:** Soporta `'Efectivo'`, `'Tarjeta'` y `'Transferencia'`. Para transacciones en efectivo, provee cálculo reactivo en tiempo real del cambio o devuelta según el monto recibido por el cliente.
   - **Evidencias Fotográficas de Entrega (`DevicePhotoUploader.jsx`):** Permite adjuntar imágenes de salida del dispositivo (pantalla encendida, entrega en mostrador) procesadas y persistidas atómicamente con `tipo_evidencia = 'ENTREGA'`.
   - **Transacción Atómica Backend (`liquidarYEntregarServicio`):** Actualiza `servicios_recepcion` con los datos del cajero (`usuario_entrega_id`), monto liquidado, método de pago, cambio devuelto, fecha real (`fecha_entrega_real = NOW()`), transición a estado `ENTREGADO` (Orden 7) en `historial_estados` y almacenamiento en `evidencias_fotograficas`.

2. **Modal Post-Entrega Homologado (`PostEntregaModal.jsx`):**
   - Proporciones visuales homologadas 1:1 con `PostCreacionModal.jsx`:
     * Contenedor superior circular simétrico (`w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 mx-auto mb-4`).
     * Botón primario a ancho completo en color rojo corporativo exacto (`bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl`) para disparar la impresión térmica.
     * Eliminación de botones superfluos o redundantes para un flujo de caja sin fricción.

3. **Comprobante Térmico de Salida (`ReciboEntregaTermico.jsx`):**
   - Componente modularizado e independiente de `TicketTermico.jsx`:
     * Encabezado institucional completo con datos fiscales de la sucursal emisora.
     * Desglose contable transparente: mano de obra, detalle de imprevistos/repuestos aprobados, anticipos previos, descuentos y balance cobrado en entrega.
     * Bloque de garantía formal con días de validez y fecha exacta de expiración.
     * Código QR vectorial dinámico (`TicketQR.jsx`) apuntando al portal público.
     * Integración estricta con la configuración modular de tickets (`config_tickets`): respeta visibilidad de campos (`mostrar_cliente`, `mostrar_equipo`, `mostrar_falla`, `mostrar_observaciones`, `mostrar_costo_y_anticipo`, `imprimir_garantia`, `mostrar_mensaje_cortesia`), ancho configurado (58mm u 80mm) y regla de impresión de dos copias con salto de página.

4. **Reapertura y Reimpresión desde Tablas Maestras (`ServiciosPage.jsx` & `PostCreacionModal.jsx`):**
   - Detección normalizada y tolerante a mayúsculas/minúsculas de órdenes despachadas (`estadoNormalizado.includes('ENTREG') || orden_flujo === 7 || estado_id === 7 || fecha_entrega_real`).
   - Al abrir el diálogo de impresión de una orden entregada, destaca prioritariamente el botón rojo **"Recibo de Entrega y Liquidación"** (renderizando `ReciboEntregaTermico`), manteniendo accesibles de forma secundaria el ticket de recepción original y los stickers.

### 4.7 Inmutabilidad de Estados Terminales y Reglas de Integridad de Negocio

Para blindar la integridad operativa, contable y contractual de la empresa, el sistema impone reglas estrictas de inmutabilidad sobre los estados terminales y validaciones de integridad referencial entre clientes, técnicos y órdenes de servicio:

```
                               ┌─────────────────────────────────────────┐
                               │     Órdenes Activas de Servicio         │
                               │  (Recibido ──► Diagnóstico ──► Listo)   │
                               └────────────────────┬────────────────────┘
                                                    │
                                ┌───────────────────┴───────────────────┐
                                ▼                                       ▼
                   [7. ENTREGADO] (Orden 7)            [8. CANCELADO_DEVUELTO] (Orden 8)
                   - Ciclo operativo completado        - Dispositivo devuelto / rechazado
                   - Saldo liquidado en caja           - Motivo de cancelación obligatorio
                   - Garantía formal activa            - Reintegro de anticipos registrado
                                │                                       │
                                └───────────────────┬───────────────────┘
                                                    │
                                                    ▼
                                 ╔═════════════════════════════════════╗
                                 ║    ESTADOS TERMINALES INMUTABLES    ║
                                 ║  - Transición de estado: [400 Block]║
                                 ║  - Asignación técnica:   [400 Block]║
                                 ║  - Incidencias / Costos: [400 Block]║
                                 ║  - Edición técnica:      [400 Block]║
                                 ╚═════════════════════════════════════╝
```

1. **Inmutabilidad Absoluta de Estados Terminales (`ENTREGADO` y `CANCELADO_DEVUELTO`):**
   - **Premisa de Negocio:** Tanto una orden entregada y cobrada (`ENTREGADO`, orden de flujo 7) como una orden cancelada y devuelta (`CANCELADO_DEVUELTO`, orden de flujo 8) representan el cierre definitivo e irreversible del ciclo del servicio. Permitir reabrir o mutar estas órdenes generaría fraudes de caja, descuadres en garantías e inconsistencias en la auditoría contable.
   - **Protección Backend (`servicios.controller.js`):**
     * En `actualizarEstadoServicio`, se evalúa el estado actual en base de datos previo a cualquier mutación. Si la orden ya está en `ENTREGADO` o `CANCELADO_DEVUELTO`, la petición es rechazada taxativamente con código `400 Bad Request` (*"No se puede modificar el estado de una orden que ya ha sido entregada / cancelada"*).
     * Se bloquean de igual modo asignaciones técnicas (`assignTecnicoServicio`), desasignaciones (`removeTecnicoServicio`), generación de incidencias (`createIncidenciaServicio`), liquidaciones secundarias e impresiones de comprobantes para órdenes canceladas.
   - **Protección Frontend y Banner Sobrio:**
     * En `FichaTecnicaModal.jsx` y `BancoTrabajoPage.jsx`, los selectores y botones de transición quedan completamente inhabilitados.
     * Se despliega un banner informativo limpio y centrado, sin cajas estridentes ni fondos pesados: icono superior de 32px (`CheckCircle2` verde para entregado, `XCircle` rojo para cancelado), título formal `"Orden de Servicio: [Badge Estado]"` y descripción clara indicando que el ciclo del equipo concluyó formalmente.

2. **Integridad de Negocio entre Clientes y Órdenes de Servicio:**
   - **Bloqueo de Clientes Inactivos en Apertura de Órdenes:**
     * *Frontend (`ClientQuickSelect.jsx`, `NuevaOrdenPage.jsx`):* Exclusión automática de clientes con `activo = false` en listas estáticas y búsquedas predictivas remotas en tiempo real.
     * *Backend (`servicios.controller.js`):* Al invocar `createServicio`, se consulta la tabla `clientes`. Si `activo = false`, se aborta la transacción con HTTP `400 Bad Request` (*"No se puede aperturar una orden para un cliente inactivo. Por favor active al cliente previamente"*).
   - **Protección contra Desactivación de Clientes con Órdenes Activas (`clients.controller.js`):**
     * Al solicitar la desactivación de un cliente (`activo = false`), el backend realiza una subconsulta en `servicios_recepcion` verificando si posee órdenes en estados no terminales (`codigo_estado NOT IN ('ENTREGADO', 'CANCELADO_DEVUELTO')`).
     * Si existen órdenes activas en curso, se rechaza la desactivación con código `409 Conflict`, devolviendo la lista de tickets involucrados.
     * La interfaz (`ClientsPage.jsx`) captura el código 409 y presenta un aviso de alerta (`sileo.warning`) detallando los tickets pendientes de resolución.

3. **Integridad de Negocio en Personal y Asignación Técnica:**
   - **Filtro de Técnicos Activos:** Solo los trabajadores con `activo = true` y rol `Tecnico` son proyectados en selectores y elegibles para asignación.
   - **Protección contra Desactivación de Personal con Órdenes Asignadas (`workers.controller.js`):**
     * Al intentar desactivar a un usuario (`activo = false`), se valida si figura asignado en `tecnicos_asignados` para servicios en curso que no hayan alcanzado un estado terminal.
     * Si posee órdenes operativas pendientes, la API responde con HTTP `409 Conflict` enumerando los tickets asignados, impidiendo dejar servicios huérfanos sin supervisión técnica.
     * La interfaz (`WorkersPage.jsx`) notifica al administrador mediante toast (`sileo.error`) para que reasigne previamente los tickets pendientes antes de dar de baja al usuario.

4. **Flujo Transaccional de Cancelación (`POST /api/servicios/:id/cancelar`):**
   - **Control de Acceso Estricto (RBAC):** Protegido por `checkRole(['SuperAdmin', 'Admin_Sucursal'])`. Usuarios con rol `Secretaria` o `Tecnico` tienen prohibida la anulación de servicios con HTTP `403 Forbidden`.
   - Requiere obligatoriamente un `motivo_cancelacion` descriptivo (longitud mínima validada en backend y frontend).
   - Registra en `servicios_recepcion`: `estado_id = 8` (`CANCELADO_DEVUELTO`), `motivo_cancelacion`, `fecha_cancelacion = NOW()` y `usuario_cancela_id = req.user.id`.
   - Inserta atómicamente el hito en `historial_estados` con la nota de cambio explicativa para auditoría.

5. **Separación de Responsabilidades: Consulta Pública vs. Emisión Física:**
   - **Consulta Pública (`GET /api/servicios/ticket/:codigo` / `consultarEstadoPublico`):** NUNCA bloquea la consulta de órdenes canceladas. Proyecta de manera transparente el estado de la orden para que el cliente conozca el motivo de detención del trabajo, integrando los datos de cancelación dentro del bloque contextual "Tiempos y Personal" y marcando el stepper con un nodo terminal rojo `<X />`.
   - **Emisión e Impresión Física (`GET /api/servicios/:id/ticket-impresion`):** Endpoint de validación estricta previo a la generación de comprobantes que bloquea la emisión con `400 Bad Request` (*"No se permite emitir comprobantes o etiquetas para órdenes canceladas"*).

6. **Componentes Visuales Homologados:**
   - **`CancelarOrdenModal.jsx`:** Ventana modal con ancho adaptado (`max-w-xl`), cabecera homologada sin iconos de bloqueo discordantes, metadatos contextuales jerarquizados (código de ticket con badge destacado, cliente con icono `<User />`, equipo con icono `<Smartphone />`), área de texto con validación reactiva y botón de confirmación inline destructivo.
   - **`OrdenDetalleModal.jsx`:** Visor integral 360° de la orden con botón de enlace directo al banco de trabajo (`/taller?buscar=SFM-...`), desglose financiero, checklist con badges minimalistas (`badgeVariant="minimal"`), historial de estados e incidencias unificado, y formateo inteligente de dispositivo (`formatDeviceName`) para prevenir duplicidades de marca/modelo.

### 4.8 Arquitectura de Edición Controlada y Mutabilidad por Estado (`EditarOrdenModal.jsx`, `PUT /api/servicios/:id`)

El sistema implementa una política de inmutabilidad progresiva para evitar que la edición administrativa comprometa el historial técnico o falsee el diagnóstico emitido por los técnicos en el taller:

```
                  ┌──────────────────────────────────────────────┐
                  │    Orden en Estado Inicial (Recibido)        │
                  └──────────────────────┬───────────────────────┘
                                         │
                         ¿Estado avanzado de taller?
                                         │
                  ┌──────────────────────┴──────────────────────┐
                  ▼ SÍ                                          ▼ NO
    ┌───────────────────────────┐                ┌───────────────────────────┐
    │  Modo Solo Lectura Parcial│                │     Edición Completa      │
    │  - Hardware Congelado     │                │  - Dispositivo y Falla    │
    │  - Falla Congelada        │                │  - Seguridad / PIN / Clave│
    │  - Seguridad / Contacto OK│                │  - Fecha Estimada Entrega │
    │  - Prioridad / Obs. OK    │                │  - Prioridad y Notas      │
    └───────────────────────────┘                └───────────────────────────┘
```

1. **Matriz de Permisos y Mutabilidad según Estado:**
   - **Estados Iniciales (`RECIBIDO_REVISION`, `PENDIENTE_REVISION`):** El cliente o la recepción pueden corregir erratas en la marca, modelo, número de serie/IMEI, problema reportado, categoría y costo estimado, además de notas de recepción y credenciales de acceso.
   - **Estados Avanzados (`EN_DIAGNOSTICO`, `EN_REPARACION`, `ESPERANDO_REPUESTO`, `LISTO_ENTREGA`):** El hardware y la falla reportada quedan estrictamente en modo solo lectura (`readOnly`). Esto salvaguarda la concordancia entre la inspección física del técnico y la orden original. Se autoriza la actualización de:
     * Métodos de desbloqueo, PIN y patrón (si el cliente suministra nuevas credenciales para pruebas).
     * Fecha estimada de entrega (renegociaciones de tiempo).
     * Nivel de prioridad (`baja`, `media`, `alta`, `urgente`).
     * Observaciones generales de recepción y accesorios.
   - **Estados Terminales (`ENTREGADO`, `CANCELADO_DEVUELTO`):** Edición bloqueada al 100% con HTTP `400 Bad Request`.

2. **Aislamiento de la Asignación Técnica:**
   - La asignación o reasignación de colaboradores técnicos **no** forma parte del modal de edición de orden. Esta responsabilidad pertenece exclusivamente al Tablero de Taller (`BancoTrabajoPage.jsx`), previniendo desincronizaciones en la carga operativa de los técnicos.

3. **Trazabilidad y Auditoría Continua (`historial_estados`):**
   - Cada actualización exitosa registra automáticamente un hito inmutable en `historial_estados` especificando qué campos fueron modificados (`cambiosAudit`), la estampa de tiempo y el `usuario_id` responsable.

4. **Componente de Interfaz Homologado (`EditarOrdenModal.jsx`):**
   - **Cabecera Unificada:** Comparte exactamente la misma estructura tipográfica y de badges que `OrdenDetalleModal.jsx`: título limpio, píldoras de Estado y Prioridad, y metadatos con iconos vectoriales `# Código`, fecha de recepción, cliente, sucursal y recepcionista.
   - **Menú de Pestañas Segmentado:** Navegación entre "Dispositivo y Falla", "Seguridad y Acceso" y "Prioridad y Observaciones".
   - **Aviso Discreto de Solo Lectura:** Micro-banner compacto (`flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 py-1.5`) con icono de candado que sustituye cajas invasivas de alerta.

### 4.9 Control y Validación Temporal de Fecha Estimada de Entrega

Para prevenir la programación de órdenes con fechas ya vencidas al momento de su apertura o reprogramación:

1. **Restricción en Componente Calendario (`DatePicker.jsx`):**
   - Soporte nativo para la prop `minDate`.
   - Inhabilita la interacción del puntero (`cursor-not-allowed`) y atenúa la opacidad (`opacity-25`) de todas las celdas de días anteriores a la fecha mínima permitida (`isBefore(day, startOfDay(minDate))`).

2. **Validación Preventiva en Formularios Frontend (`NuevaOrdenPage.jsx` & `EditarOrdenModal.jsx`):**
   - Enlace automático de `minDate={new Date()}` en los selectores de fecha estimada.
   - Bloqueo preventivo en la función `validarFormulario()` previo a la petición Axios: si la fecha ingresada es estrictamente anterior al inicio del día de hoy (`startOfDay(new Date())`), interrumpe el flujo y notifica mediante toast interactivo (`sileo.warning`).

3. **Validación Defensiva en Capa Backend (`servicios.controller.js`):**
   - Comprobación tanto en `createServicio` como en `updateServicio` evaluando la fecha a nivel de día calendario:
     ```javascript
     const hoy = new Date();
     hoy.setHours(0, 0, 0, 0);
     const fechaEst = new Date(fecha_estimada_entrega);
     if (fechaEst < hoy) {
       return res.status(400).json({
         ok: false,
         message: 'La fecha estimada de entrega no puede ser anterior a la fecha actual.'
       });
     }
     ```

---

## 5. Pipeline de Gestión Multimedia y Cloudinary

Para garantizar alta disponibilidad, velocidad de carga y mínimo consumo de almacenamiento en el servidor de base de datos, los archivos multimedia (fotos de perfil y evidencias de reparación) se procesan mediante un pipeline optimizado en la nube:

```
┌────────────────┐       multipart/form-data       ┌────────────────────────┐
│ Cliente React  ├────────────────────────────────►│ Servidor Express      │
│ (Dropzone / UI)│                                 │ (Multer MemoryStorage) │
└────────────────┘                                 └───────────┬────────────┘
                                                                │ Stream Buffer (RAM)
                                                                ▼
┌────────────────┐          URL segura / HTTPS      ┌────────────────────────┐
│  PostgreSQL    │◄────────────────────────────────┤ SDK Cloudinary v2      │
│ (Columna URL)  │                                 │ (WebP / 500x500 Auto)  │
└────────────────┘                                 └────────────────────────┘
```

### 5.1 Especificación del Pipeline de Subida

1. **Recepción en Memoria ([upload.js](file:///c:/Users/pc/Desktop/SIGER-FMC/backend/src/middlewares/upload.js)):**
   - `multer.memoryStorage()`: El archivo se procesa directamente en memoria RAM sin persistir temporalmente en el disco local del servidor, eliminando problemas de permisos o archivos temporales residuales.
   - **Filtro estricto de tipos MIME:** Solo se admiten formatos `image/jpeg`, `image/png` y `image/webp`.
   - **Límite de tamaño:** 5 MB por archivo.

2. **Streaming y Transformación ([cloudinary.js](file:///c:/Users/pc/Desktop/SIGER-FMC/backend/src/config/cloudinary.js)):**
   - `uploadImageBuffer(buffer, folder)`: Transmite el buffer mediante `Readable.from(buffer).pipe(cloudinary.uploader.upload_stream(...))`.
   - **Formato Inteligente:** Conversión automática a formato optimizado **WebP** (`format: 'webp'`).
   - **Compresión y Dimensiones:** Calidad adaptativa (`quality: 'auto'`) y límite de resolución (`500x500`, `crop: 'limit'`).

### 5.2 Convención de Carpetas en Cloudinary

| Carpeta Destino | Uso y Tipo de Recurso | Entidad Asociada |
| :--- | :--- | :--- |
| **`siger-fmc/personal-fmc`** | Avatares y fotos de perfil de trabajadores | `datos_trabajadores.foto_perfil_url` |
| **`siger-fmc/recepcion`** | Evidencias temporales de recepción (sesiones móviles QR y subidas desde PC) | `sesiones_carga_fotos.fotos` |
| **`siger-fmc/evidencias-tickets`** | Fotografías confirmadas de entrada, diagnóstico y entrega de equipos | `evidencias_fotograficas.foto_url` |

### 5.3 Ciclo de Limpieza de Recursos Huérfanos

- **Función `deleteImageByUrl(imageUrl)`:** Al actualizar o remover un avatar en `updateWorker`, se extrae el `public_id` de la URL antigua y se destruye el asset remoto en Cloudinary vía `cloudinary.uploader.destroy(public_id)`.
- **Prevención de Errores Silenciosos:** La eliminación es asíncrona no bloqueante; si el asset ya no existía en Cloudinary, la operación continúa exitosamente sin abortar la transacción de base de datos.

### 5.4 Resiliencia en Redes y Experiencia Dropzone (Frontend)

- **Timeout Extendido a 120s:** La función [uploadAvatar](file:///c:/Users/pc/Desktop/SIGER-FMC/frontend/src/services/workers.service.js) sobreescribe el timeout estándar de Axios con `timeout: 120000` para garantizar la subida en conexiones celulares o de baja velocidad.
- **Dropzone Interactivo ([WorkerModal.jsx](file:///c:/Users/pc/Desktop/SIGER-FMC/frontend/src/components/workers/WorkerModal.jsx)):** Permite arrastrar y soltar archivos o hacer clic sobre toda la tarjeta, proporcionando preview local inmediato (`URL.createObjectURL`), feedback visual de progreso (*"Subiendo y optimizando imagen..."*) y botón dedicado para desvincular fotos.

---

## 6. Arquitectura de Impresión Térmica y Etiquetas Adhesivas (On-Demand DOM)

SIGER-FMC cuenta con un subsistema de impresión física de alta fidelidad diseñado para operar con impresoras térmicas de tickets y rotuladoras térmicas de etiquetas adhesivas de taller sin depender de drivers propietarios ni ventanas emergentes intrusivas.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Disparador de Impresión                         │
│            (Apertura de Orden / Reimpresión en ServiciosPage)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│         Resolución Asíncrona de Datos Frescos (`getServicioById`)      │
│  - Proyección completa: checklist, desglose financiero, cliente/técnico│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Montaje On-Demand en `#print-mount-point`                │
│    - Renderizado aislado fuera del árbol visual interactivo            │
│    - Inmunidad a estilos de tema oscuro (fondo blanco, texto negro)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
    ┌───────────────────────────┐       ┌───────────────────────────┐
    │  Comprobante Térmico POS  │       │  Sticker Adhesivo Taller  │
    │  - Presets: 80mm / 58mm   │       │  - Presets: 50x30 / 60x40 │
    │  - QR de seguimiento      │       │  - SVG Patrón Android 3x3 │
    │  - Cláusula de garantía   │       │  - PIN / Clave legible    │
    └─────────────┬─────────────┘       └─────────────┬─────────────┘
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Ejecución `window.print()` y Desmontaje Automático        │
│    - Control vía directivas `@media print`                             │
│    - Limpieza de memoria y retorno al estado previo de la aplicación   │
└────────────────────────────────────────────────────────────────────────┘
```

### 6.1 Punto de Montaje On-Demand (`#print-mount-point`)
Para evitar distorsiones causadas por el modo oscuro (`dark mode`), capas fijas (`z-index`), barras de scroll o fugas de estilos globales:
1. El componente impreso no reside de forma estática en el DOM principal.
2. Durante la solicitud de impresión, se monta dinámicamente un portal en un contenedor `#print-mount-point` dedicado.
3. Se inyectan reglas CSS específicas de impresión (`@media print`) que ocultan el resto de la interfaz (`display: none !important`) y fuerzan visualización limpia a color verdadero o escala de grises sobre fondo blanco puro.
4. Tras disparar `window.print()`, los listeners de ciclo de vida (`onafterprint`) desmontan el componente y devuelven el foco al operador.

### 6.2 Resolución de Datos Frescos al Reimprimir
Al reimprimir comprobantes o stickers desde tablas operativas (`ServiciosPage.jsx`):
- Los listados paginados suelen cargar proyecciones optimizadas y ligeras.
- Para garantizar que el ticket incluya todos los campos requeridos (`costo_previsto`, `monto_anticipo`, `monto_descuento`, `checklist_entrada`, `observaciones_recepcion`, `datos_acceso_equipo`, resolución compuesta `COALESCE` de cliente y asignación técnica), la acción de impresión invoca en segundo plano `getServicioById(servicio.id)` antes de armar la plantilla.
- Esto previene discrepancias de datos o campos `undefined` en tickets reimpresos.

### 6.3 Presets Físicos y Formatos Soportados

#### 1. Comprobantes Térmicos POS (Rollo Continuo)
- **Preset 80 mm:** Ancho imprimible estándar para impresoras térmicas de mostrador (Epson TM-T20, Star Micronics, Xprinter). Dispone de cabecera institucional completa, RNC, teléfonos de sucursal, datos de cliente y equipo, desglose financiero tabular, checklist de recepción con casillas de verificación, código QR optimizado (`w-40 h-40`) y condiciones legales de garantía.
- **Preset 58 mm:** Versión compacta adaptada para impresoras térmicas portátiles o de 2 pulgadas, optimizando interlineados y reduciendo márgenes laterales.

#### 2. Etiquetas Adhesivas de Taller (Stickers de Dispositivo)
- **Presets Soportados:** **`50x30 mm`** (estándar preferido) y **`60x40 mm`** (alta resolución).
- **Integración de Seguridad del Dispositivo:**
  - **Patrón de Desbloqueo Android:** Dibuja la figura real en un SVG vectorial 3x3 normalizado a partir de las coordenadas base 0 (`[0..8]`), e imprime debajo la secuencia legible separada por guiones (ej. `"7-4-1-5-3-6-9"`).
    - **PIN o Contraseña:** Imprime la clave en tipografía monoespaciada de alta visibilidad (`text-sm font-mono font-black tracking-widest text-neutral-900`) con encabezado `"PIN"` o `"CLAVE"`, omitiendo cualquier cuadrícula vacía.
    - **Sin Bloqueo:** Indica claramente `"LIBRE / SIN CLAVE"`.

---

## 7. Subsistema de Evidencias Fotográficas, Sesión Unificada y Recolector de Huérfanos

Para agilizar la recepción de equipos en mostrador y talleres sin requerir cámaras web ni que los operarios deban iniciar sesión en sus teléfonos personales, y al mismo tiempo erradicar la proliferación de archivos huérfanos en Cloudinary, SIGER-FMC implementa una arquitectura de sesión unificada y recolección de basura (*Garbage Collector*):

```
┌─────────────────────────────────┐                             ┌─────────────────────────────────┐
│         PC de Mostrador         │       Escaneo QR            │       Smartphone Operario       │
│     (DevicePhotoUploader.jsx)   ├────────────────────────────►│       (UploadMobilePage.jsx)    │
│  - Inicializa session_id        │                             │  - Validación de cupo y sesión  │
│  - Polling en 2do plano (2.5s)  │                             │  - Captura con cámara o galería │
│  - Subida directa desde PC      │                             │  - Compresión previa en cliente │
└────────────────┬────────────────┘                             └────────────────┬────────────────┘
                 │                                                               │
                 │ Petición HTTP (POST /api/upload-session/:sessionId/subir)     │
                 └───────────────────────────────┬───────────────────────────────┘
                                                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Backend Express + PostgreSQL                                  │
│  1. sesiones_carga_fotos:                                                                       │
│     - session_id (UUID v4), max_fotos, expira_en (NOW() + 15m), estado                          │
│     - fotos JSONB: [{ public_id, secure_url, bytes, size, fecha_subida }]                       │
│                                                                                                 │
│  2. Transiciones de Ciclo de Vida:                                                              │
│     ├── PENDIENTE / COMPLETADO: Fotos preservadas mientras se redacta la orden de servicio.     │
│     ├── UTILIZADA: Al ejecutar POST /api/servicios, las fotos se transfieren a                  │
│     │   evidencias_fotograficas (tipo_evidencia = 'RECEPCION') y la sesión se marca UTILIZADA.  │
│     └── PURGADA: Si la sesión expira (>30m) sin guardarse la orden, el Garbage Collector       │
│         invoca cloudinary.uploader.destroy(public_id) para cada asset y marca estado PURGADA.   │
│                                                                                                 │
│  3. Destrucción en Tiempo Real (eliminarFotoTemporal):                                          │
│     - Al presionar el icono de basura en UI, se envía DELETE /api/upload-session/foto.           │
│     - Destruye inmediatamente el recurso en Cloudinary y lo remueve del JSONB en PostgreSQL.    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7.1 Arquitectura de Sesión Unificada (Carga desde PC y Móvil QR)
1. **Prevención de Huérfanas desde PC:**
   - Anteriormente, la selección de fotos desde PC en `DevicePhotoUploader.jsx` subía directamente a Cloudinary sin registrar la operación en PostgreSQL. Si el usuario cancelaba o cerraba la ventana, las fotos quedaban abandonadas en la nube.
   - Con la sesión unificada, `DevicePhotoUploader.jsx` inicializa o reutiliza la sesión activa en `sesiones_carga_fotos` y sube los archivos de la PC mediante `subirFotosSession(sessionId, files)`. De esta forma, cualquier archivo subido desde PC queda cubierto por la expiración temporal y la purga automática.
   - Como blindaje en profundidad (*defense-in-depth*), el endpoint directo `POST /api/servicios/upload-foto` en `servicios.controller.js` también realiza un upsert automático en `sesiones_carga_fotos`.

2. **Desacoplamiento de Polling y Experiencia en Segundo Plano:**
   - La gestión del temporizador de sondeo (`setInterval` a ~2.5s) y el estado de la sesión (`activeSessionId`, `sessionExpiresAt`) residen en el componente padre `DevicePhotoUploader.jsx`.
   - Si el usuario cierra el modal QR (`QrUploadModal.jsx`) para continuar completando datos del cliente o del checklist, el sondeo en segundo plano continúa escuchando.
   - Al detectar que la sesión remota pasa a `'COMPLETADO'`, las fotos se incorporan automáticamente al formulario y se notifica al usuario mediante un toast flotante de éxito (`sileo.success`).

3. **Propagación Dinámica de Cupo de Fotos (`maxFotosPermitidas`):**
   - Al abrir el QR o iniciar la sesión, se calcula el cupo disponible exacto:
     $$\text{Cupos Restantes} = \max(0, \text{MAX\_PHOTOS} - \text{fotosActuales.length})$$
   - El cupo se persiste en la columna `max_fotos` de `sesiones_carga_fotos`.
   - La interfaz móvil (`UploadMobilePage.jsx`) adapta su conteo visual a la relación exacta (`0 de X`, `1 de X`) y el backend (`subirFotosSesion`) valida que la suma acumulada no exceda el límite permitido, rechazando desbordes con HTTP `400 Bad Request`.

### 7.2 Destrucción en Tiempo Real (`eliminarFotoTemporal`)
- Endpoint dedicado (`POST /api/upload-session/eliminar-foto` y alias `DELETE /api/servicios/evidencia-temporal`).
- Al presionar el botón de basura en una miniatura antes de guardar la orden, el frontend solicita la eliminación física inmediata en Cloudinary vía `cloudinary.uploader.destroy(publicId)`.
- Si se suministra `sessionId`, la foto se remueve atómicamente del array JSONB en `sesiones_carga_fotos`, evitando discrepancias de conteo.

### 7.3 Recolector de Basura Automático (Garbage Collector) y Política de Retención
- **Ejecución Automática en Servidor (`backend/server.js`):** Un temporizador recurrente con `.unref()` ejecuta `purgarSesionesExpiradas()` cada 30 minutos sin bloquear el ciclo de eventos de Node.js.
- **Criterio de Purga Cloudinary:** Selecciona sesiones en `sesiones_carga_fotos` cuyo estado sea distinto de `'UTILIZADA'` y cuya expiración supere los 30 minutos de antigüedad (`expira_en < NOW() - INTERVAL '30 minutes'`). Destruye cada asset en Cloudinary y actualiza su estado a `'PURGADA'`.
- **Política de Retención en Base de Datos (15 Días):** Al finalizar la purga remota, el proceso ejecuta:
  ```sql
  DELETE FROM sesiones_carga_fotos 
  WHERE estado IN ('PURGADA', 'UTILIZADA') 
    AND created_at < NOW() - INTERVAL '15 days';
  ```
  Esto previene el crecimiento indefinido de la tabla sin comprometer la auditoría operativa reciente.

### 7.4 Script de Conciliación y Mantenimiento Administrativo
- **Ubicación:** `backend/src/scripts/purgar_huerfanas_cloudinary.js`.
- **Propósito:** Script utilitario ejecutable bajo demanda mediante `node backend/src/scripts/purgar_huerfanas_cloudinary.js`.
- **Algoritmo de Conciliación:**
  1. Lista los assets en la carpeta `siger-fmc/recepcion` de Cloudinary vía `cloudinary.api.resources`.
  2. Consulta en PostgreSQL todos los `public_id` registrados en `evidencias_fotograficas` y en sesiones activas/vigentes de `sesiones_carga_fotos`.
  3. Filtra archivos en Cloudinary con más de 2 horas de antigüedad (para salvaguardar recepciones activas en curso) que no existan en la base de datos.
  4. Ejecuta `cloudinary.uploader.destroy` sobre las imágenes huérfanas confirmadas y emite un informe detallado en consola.

### 7.5 Blindaje Multi-Sucursal y Reglas de Taller
1. **Aislamiento Multi-Sucursal en Taller:** Todas las consultas y mutaciones de la Mesa de Trabajo fuerzan `WHERE sucursal_id = req.user.sucursal_id`. Intentos de acceso inter-sucursal son rechazados con `404 Not Found`.
2. **Asignación Obligatoria:** No se permite realizar transiciones de estado desde `RECIBIDO` a fases operativas (`EN_DIAGNOSTICO`, `EN_REPARACION`, etc.) sin al menos un técnico asignado en `tecnicos_asignados`.
3. **Bloqueo de Desasignación Única:** Si un servicio ya inició operaciones y cuenta con un solo técnico asignado, se prohíbe su desasignación hasta que se incorpore otro técnico responsable.
4. **Exclusión Estricta de Secretaría:** Los trabajadores con rol `Secretaria` no pueden ser asignados como técnicos de taller ni tienen visible la acción de autoasignación.

---

## 8. Subsistema de Alertas: Campanita In-App y Correo (Resend)

SIGER-FMC separa deliberadamente las alertas operativas internas (campanita) de los correos transaccionales, para evitar saturación del buzón del personal.

### 8.1 Flujo de Emisión
```
 Evento de taller (crear / estado / incidencia / asignar / entregar)
                              │
                              ▼
              createNotifications()  [utils/notifications.js]
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
     INSERT notificaciones              ¿tipo ∈ {ASIGNACION,
     (campanita por usuario)             ORDEN_FINALIZADA}?
                                              │ sí
                                              ▼
                                     notifyUsersByEmail()
                                     → Resend (plantilla tipada)
```
Los correos al **cliente** se invocan directamente desde `servicios.controller.js` (`emailClienteRecibido`, `emailClienteCancelado`, `emailClienteEntregado`, `emailClienteRecibo`) y no pasan por la tabla `notificaciones`.

### 8.2 Destinatarios por Evento
| Evento | Campanita | Correo |
| :--- | :--- | :--- |
| Nueva orden / Urgente | SuperAdmin + Admin + Secretaría (sede) | Cliente: recibido |
| Asignación | Técnico asignado | Técnico |
| Cambio de estado | Técnicos asignados + staff sede | — |
| Incidencia / hallazgo | Staff sede | — |
| Entrega / finalización | Técnicos + staff sede | Técnico; Cliente: entregado + recibo |
| Cancelación | — | Cliente: cancelado |

### 8.3 Variables de Entorno
- `RESEND_API_KEY` — si está ausente, la campanita sigue funcionando; no se envían correos.
- `RESEND_FROM_EMAIL` — remitente verificado (sandbox: `onboarding@resend.dev`).
- `RESEND_TEST_TO` — en desarrollo redirige todos los destinatarios al buzón de prueba (útil con dominio no verificado).

### 8.4 Frontend
- `NotificationBell.jsx`: badge con alertas auditivas sintetizadas (Web Audio API), animación de campana, panel desplegable extendido, persistencia en sessionStorage y marcar leída / todas; polling 15 s + refresh on focus; requests sin caché.
- `GlobalSearch.jsx`: búsqueda predictiva en la misma cabecera (`Navbar.jsx`).
- `DashboardPage.jsx`: consume `GET /api/servicios/dashboard` con datos reales de la sede, KPIs segmentados por rol, gráfica de dona de categorías de dispositivos (`DeviceCategoryDonut`) y actividad reciente con avatares de técnicos.

---

## 9. Subsistema de Experiencia de Carga (Skeletons Nativos y Cero CLS)

Para optimizar el rendimiento visual, acelerar el tiempo de renderizado y erradicar por completo el salto acumulativo del diseño (**Cumulative Layout Shift - CLS = 0%**), SIGER-FMC eliminó cualquier dependencia de librerías externas de skeleton (como `react-loading-skeleton`) y estandarizó una arquitectura de esqueletos de carga basada en primitivas atómicas de React y Tailwind CSS nativo:

```
                                  ┌───────────────────────────┐
                                  │   Primitiva Skeleton.jsx  │
                                  │   - animate-pulse         │
                                  │   - bg-neutral-200/80     │
                                  │   - dark:bg-neutral-800/80│
                                  └─────────────┬─────────────┘
                                                │
                 ┌──────────────────────────────┼──────────────────────────────┐
                 ▼                              ▼                              ▼
      [Componentes Dedicados]        [TableSkeleton.jsx]             [Skeletons Inline]
      - DashboardSkeleton.jsx        - Filas y columnas              - ClientsPage / WorkersPage
      - ReportesSkeleton.jsx           homologadas a tablas          - ConfigurationPage (Tabs)
      - Vistas complejas multi-grid    con 0% de salto de layout     - NotificationBell / GlobalSearch
                                                                     - OrdenDetalle / FichaTecnica
```

### 9.1 Criterio de Selección: Componente Dedicado vs. Skeleton Inline
1. **Componentes Dedicados Separados (`DashboardSkeleton.jsx`, `ReportesSkeleton.jsx`):**
   - **Criterio:** Reservado exclusivamente para pantallas analíticas, paneles de control o vistas ejecutivas con múltiples cuadrículas (`grid-cols-1 md:grid-cols-3...`), gráficas vectoriales y distribución no lineal de datos.
   - **Implementación:** Calcan con fidelidad geométrica 1:1 el árbol DOM de la vista final (`Card`, dimensiones fijas `h-*`, `w-*`, gráficos de dona y series temporales), de modo que al completarse la petición asíncrona la transición sea imperceptible y sin saltos visuales.
2. **`TableSkeleton.jsx` para Vistas Tabulares:**
   - **Criterio:** Vistas maestras de datos (`ServiciosPage.jsx`, tablas de consulta masiva).
   - **Implementación:** Provee un contenedor con altura y cabecera estática que renderiza un número configurable de filas (`rows`) y columnas (`columns`), simulando píldoras de badges, textos y avatares con dimensiones realistas.
3. **Skeletons Inline (Anatómicos):**
   - **Criterio:** Vistas CRUD (`ClientsPage.jsx`, `WorkersPage.jsx`), modales de configuración (`ConfigurationPage.jsx`), paneles flotantes (`NotificationBell.jsx`, `GlobalSearch.jsx`) y modales de inspección (`OrdenDetalleModal.jsx`, `FichaTecnicaModal.jsx`).
   - **Implementación:** Se construyen directamente dentro de la vista mediante bloques ternarios `{loading ? (...) : (...)}` utilizando la primitiva `<Skeleton className="..." />`, asegurando que la cabecera, filtros y estructura externa permanezcan intactos durante la recarga de datos.

---

## 10. Subsistema Universal de Portapapeles (`clipboard.js`)

Para asegurar que la copia y el pegado de códigos de ticket y enlaces opere sin fricción en cualquier entorno de red, SIGER-FMC implementa una utilidad transversal tolerante a fallos:

### 10.1 Arquitectura de Copia con Estrategia Dual (`copyToClipboard`)
```javascript
// frontend/src/utils/clipboard.js
export async function copyToClipboard(text) {
  // 1. Contexto seguro moderno (HTTPS / http://localhost)
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* Fallback */ }
  }
  // 2. Fallback síncrono compatible (HTTP IP LAN 192.168.x.x / Navegadores Legacy)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!success;
  } catch { return false; }
}
```

### 10.2 Pautas de Integración en UI
- **Feedback Inmediato:** Toda acción de copiado debe estar acompañada de una microanimación con el icono `<Check />` y un toast informativo (`sileo.success({ title: 'Código copiado', description: ticket })`).
- **Respeto a Políticas de Seguridad de Lectura:** El pegado programático (`navigator.clipboard.readText()`) requiere permisos explícitos del usuario que suelen ser bloqueados en contextos HTTP locales. La interfaz nunca debe asumir que la lectura automática es infalible: ante cualquier bloqueo de permisos, enfoca el campo de entrada y guía al usuario con una notificación no intrusiva a usar `Ctrl + V`.