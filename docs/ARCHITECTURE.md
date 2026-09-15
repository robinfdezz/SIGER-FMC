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
- **Módulo de Incidencias Técnicas (`incidencias_servicio`):**
  - Permite documentar hallazgos durante el desensamble (`Hallazgo Tecnico`, `Pieza Extra`, `Aviso al Cliente`, `Imprevisto`), costos adicionales de repuestos y técnico autor.
  - **Aislamiento Fotográfico Estricto:** Las fotografías subidas a Cloudinary se segregan por su columna `tipo_evidencia` e `incidencia_id` en `evidencias_fotograficas`. Las fotos de recepción inicial (`tipo_evidencia = 'RECEPCION'`) no se mezclan con las evidencias técnicas de una incidencia (`tipo_evidencia = 'INCIDENCIA'`).
  - **Ciclo de Vida de Autorización del Cliente:**
    * **Aprobación:** Si el cliente autoriza el costo extra, se registra `aprobado_por_cliente = TRUE`, `fecha_aprobacion = NOW()` y el canal informado (`metodo_aprobacion` entre `'WhatsApp'`, `'Llamada'`, `'Presencial'`). Este costo se suma al total consolidado a cobrar.
    * **Rechazo Explícito:** Si el cliente declina el costo adicional, se registra `aprobado_por_cliente = FALSE`, `fecha_aprobacion = NOW()` y `estado_aprobacion = 'RECHAZADO'`. En la interfaz, el costo se tacha (`line-through`) y se excluye del balance financiero, preservando la posibilidad de reconsideración.
    * **Pendiente:** Si la incidencia tiene costo extra y aún no ha sido respondida, se marca como `'PENDIENTE'`, bloqueando el cierre financiero hasta su resolución.
- **Seguimiento Público:** Los clientes pueden consultar en tiempo real el progreso de su dispositivo introduciendo su `codigo_ticket` sin requerir inicio de sesión.

### 4.3 Arquitectura de Taller y Ficha Técnica (`BancoTrabajoPage.jsx`, `FichaTecnicaModal.jsx`)

1. **Mesa de Trabajo Técnica (`/taller` / `BancoTrabajoPage.jsx`):**
   - Panel de control para técnicos con filtrado en tiempo real y pestañas animadas (`AnimatedTabs.jsx`) que reflejan la distribución de equipos en cada fase del taller (`Recibido`, `En Diagnóstico`, `En Reparación`, `Esperando Repuesto`, `Listo para Entrega`).
   - Tarjetas técnicas (`TallerCard.jsx`) con información sintetizada del cliente, equipo, técnico asignado y prioridad.
2. **Ficha Técnica Modal (`FichaTecnicaModal.jsx`):**
   - Modal interactivo de alta densidad informativa dividido en 4 cuadrantes funcionales:
     * **Datos del Dispositivo y Recepción:** Resumen de cliente, fallas, accesorios y checklist de entrada.
     * **Acceso y Seguridad:** Renderizado adaptativo de contraseñas, PIN numérico o patrón gráfico mediante `UnlockMethodView`.
     * **Actualización de Estado y Multi-Técnicos:** Formulario de transición con notas técnicas y endpoints de asignación (`POST/DELETE /api/servicios/:id/tecnicos`).
     * **Incidencias y Línea de Tiempo Unificada:** Registro dinámico de hallazgos con cargador de fotos y un contenedor de trayectoria scroleable independiente (`max-h-[480px]`) que fusiona en orden descendente los hitos de estado y las incidencias.

### 4.4 Arquitectura de Credenciales de Seguridad y Patrón de Desbloqueo (`PatternLock.jsx`)

Para visualizar de manera segura el acceso al equipo, el componente `UnlockMethodView` y `PatternLockSvg` manejan dos variantes vectoriales especializadas:
1. **Variante Pantalla / Ficha Técnica (`variant="reception"`):**
   - Homologada 1:1 con el diseñador de recepción (`DeviceSecurityPicker.jsx`): cuadrícula 3x3 de 144px con círculos rojos (`fill="#ef4444"`), números de paso en blanco (1, 2, 3...) dentro de cada nodo, halo exterior translúcido y trazos conectores continuos.
   - Píldora inferior estilizada con `break-all whitespace-normal flex-wrap text-center` que permite envolver secuencias largas sin cortar la información con puntos suspensivos (`...`).
2. **Variante Etiqueta Térmica (`LabelPreview.jsx` & `StickerTermico.jsx`):**
   - Diseñada para rotuladoras e impresoras térmicas de 58mm y 80mm.
   - **Paleta Estrictamente Monocromática:** Trazos y círculos en negro sólido (`#111827`) con números blancos sobre fondo blanco puro, evitando cualquier color rojo para prevenir tramas de escala de grises o manchas borrosas al imprimir.
   - **Contenedor Acotado:** Dimensiones restringidas a `w-20 sm:w-24 max-w-[96px]` con secuencia numérica en píldora micro `wrap` centrada, asegurando convivencia limpia con la columna de datos del cliente (`flex-1 min-w-0 pr-2`).

### 4.5 PENDIENTE / PRÓXIMO SPRINT (FASE SIGUIENTE - NO INICIADA): Modal de Entrega Final

> [!NOTE]
> **Estado de Implementación:** PENDIENTE / NO INICIADA. Esta funcionalidad corresponde al siguiente sprint de desarrollo y actualmente **no está implementada** en el código activo. No debe considerarse una característica existente hasta que se desarrolle en la siguiente fase.

Una vez validados al 100% la recepción, el taller técnico, las incidencias y las credenciales de acceso, la fase proyectada para el siguiente ciclo operativo consistirá en el **Modal de Entrega Final y Cierre de Orden**:
1. **Liquidación Consolidada:** Cálculo del saldo final a pagar:
   $$\text{Balance} = \text{Costo Inicial} + \sum(\text{Incidencias Aprobadas}) - \text{Anticipos} - \text{Descuentos}$$
2. **Evidencias Fotográficas de Salida:** Registro fotográfico obligatorio del equipo reparado y encendido (`tipo_evidencia = 'ENTREGA'`).
3. **Firma de Conformidad y Salida:** Validación de la firma digital del cliente y transición al estado final `ENTREGADO`, generando el comprobante de salida y activando la póliza de garantía.

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
| **`siger-fmc/evidencias-tickets`** | Fotografías de entrada, diagnóstico y entrega de equipos | `evidencias_fotograficas.foto_url` |

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