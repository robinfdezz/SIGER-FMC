# Contexto General del Proyecto (PROJECT_CONTEXT.md)

## 1. Visión y Propósito del Sistema
**SIGER-FMC** es un sistema web integral de gestión operativa y control de servicios técnicos desarrollado para **Franyer Mobile Center, S.R.L.**. El sistema centraliza la recepción de equipos, diagnóstico, asignación técnica, seguimiento de incidencias, control fotográfico de evidencias y entrega final de dispositivos, soportando operaciones multi-sucursal con trazabilidad completa de cada orden de servicio.

---

## 2. Estructura Multi-Sucursal y Compañía
* **Compañía Matriz:** Franyer Mobile Center, S.R.L. (RNC: 133-18964-1).
* **Sucursales Activas:**
  * `SUC-01`: Franyer Mobile Center - San Francisco de Macorís (SFM).
  * `SUC-02`: Franyer Mobile Center - Castillo.
* **Aislamiento Operativo:** Cada sucursal gestiona sus tickets, técnicos y recepciones de manera independiente, mientras que la administración global mantiene visibilidad total consolidada.

---

## 3. Roles y Actores del Sistema
El acceso y las capacidades dentro de la plataforma se rigen por cuatro roles estrictos:

1. **SuperAdmin (`rol_id: 1`):**
   * Control global absoluto de todas las sucursales, finanzas, catálogos generales, reportes consolidados y gestión de usuarios/trabajadores.
2. **Admin_Sucursal (`rol_id: 2`):**
   * Gestión administrativa y operativa local de una sucursal específica. Supervisión del equipo de trabajo, asignación de órdenes y métricas de su sede.
3. **Secretaria / Recepción (`rol_id: 3`):**
   * Atención al cliente en mostrador, búsqueda y registro de clientes, creación formal de tickets de entrada (`FMC-YYYY-XXXX`), emisión de comprobantes térmicos y stickers adhesivos, cobro de anticipos y gestión de entregas finales. Confinada a su sucursal asignada.
4. **Tecnico (`rol_id: 4`):**
   * Acceso al banco de trabajo técnico: diagnóstico, actualización de estados de reparación, reporte de repuestos/incidencias y carga de evidencias fotográficas.
   * **Modo Solo Lectura en Recepción:** No posee permisos para crear órdenes de servicio (bloqueo estricto `403 Forbidden`). Confinado a su sucursal y con lectura habilitada en trabajadores (`GET /api/trabajadores`) para filtros operativos.

---

## 4. Ciclo de Vida y Flujo Operativo de Tickets (`servicios_recepcion`)
Cada orden de servicio transita de manera estructurada a través de 8 estados secuenciales registrados en `estados_servicio`:

1. **`RECIBIDO` (ID: 1 | Gris):**
   * Registro del cliente (búsqueda por Cédula/RNC o alta nueva).
   * Registro de datos del equipo (categoría, marca, modelo, IMEI/serie, clave/patrón de acceso, falla reportada, checklist visual de entrada, costo previsto y nivel de prioridad: `baja`, `media`, `alta`, `urgente`).
2. **`EN_DIAGNOSTICO` (ID: 2 | Azul):**
   * Asignación del servicio a uno o varios técnicos (`tecnicos_asignados`) para evaluación de la falla física o de software.
3. **`ESPERA_REPUESTO` (ID: 3 | Ámbar):**
   * Se activa si el diagnóstico requiere piezas no disponibles o presupuestos adicionales (`incidencias_servicio`), a la espera de autorización del cliente (`aprobado_por_cliente`).
4. **`EN_REPARACION` (ID: 4 | Púrpura):**
   * Ejecución del trabajo técnico, reemplazo de componentes y solución de averías.
5. **`CONTROL_CALIDAD` (ID: 5 | Rosa):**
   * Pruebas funcionales posteriores a la reparación (cámaras, audio, carga, pantalla, sensores) para asegurar la calidad del servicio antes del aviso.
6. **`LISTO_ENTREGA` (ID: 6 | Esmeralda Claro):**
   * Equipo validado y listo en mostrador; notificación al cliente para retiro.
7. **`ENTREGADO` (ID: 7 | Esmeralda Oscuro):**
   * Cierre formal en mostrador, liquidación del costo final, entrega física y emisión de condiciones de garantía (ej. 30 días).
   * **Reingreso por Garantía:** Una orden previa únicamente es admisible para un nuevo ticket de garantía si su estado formal es `ENTREGADO` (o cuenta con `fecha_entrega`). Equipos aún no retirados del taller no son elegibles para garantía.
8. **`CANCELADO_DEVUELTO` (ID: 8 | Rojo):**
   * Cancelación formal mediante `CancelarOrdenModal` por falta de solución técnica, inviabilidad o no aceptación de presupuesto por parte del cliente.
   * **Restricción Estricta de Rol:** Exclusivo para `SuperAdmin` y `Admin_Sucursal`. Empleados con rol `Secretaria` o `Tecnico` tienen prohibida la anulación (`403 Forbidden`).
   * Registra obligatoriamente `motivo_cancelacion`, marca temporal `fecha_cancelacion = NOW()`, referencia a `usuario_cancela_id` e hito en `historial_estados`.
   * **Salvaguardas Defensivas:** Bloquea de forma inmediata e irreversible cualquier modificación de estado, asignación de técnicos, registro de incidencias o liquidación de entrega en taller (`400 Bad Request`). En la consulta pública se proyecta de manera transparente con el motivo y nodo terminal.

*Cada cambio de estado genera un registro inmutable en la tabla `historial_estados` con fecha, usuario responsable y nota explicativa.*

### 4.1 Políticas de Edición Controlada de Órdenes de Servicio (`EditarOrdenModal.jsx`)
Para mantener la integridad operativa del taller y la trazabilidad de los diagnósticos:
* **Restricción de Acceso (RBAC):** La edición está reservada a `SuperAdmin`, `Admin_Sucursal`, `admin` y `administrador`. El rol `Tecnico` tiene terminantemente prohibido editar órdenes de servicio (`403 Forbidden`).
* **Regla de Congelación según Estado de Taller:**
  - **En Recepción Inicial (`RECIBIDO_REVISION`, `PENDIENTE_REVISION`):** Es posible editar libremente los datos del equipo (marca, modelo, IMEI/serie, categoría, falla y costo estimado), así como credenciales de acceso, fecha estimada, prioridad y observaciones.
  - **En Fases Avanzadas de Taller (`EN_DIAGNOSTICO`, `EN_REPARACION`, `ESPERANDO_REPUESTO`, `LISTO_ENTREGA`):** El hardware y la avería original quedan congelados en modo solo lectura (`readOnly`). Solo se autoriza la modificación de credenciales de seguridad (PIN/patrón), fecha estimada de entrega, prioridad, observaciones y accesorios.
  - **En Estados Terminales (`ENTREGADO`, `CANCELADO_DEVUELTO`):** Edición completamente bloqueada (`400 Bad Request`).
* **Exclusión Estricta de Asignación Técnica:** La asignación o desasignación de técnicos se realiza única y exclusivamente en el Tablero de Taller (`BancoTrabajoPage.jsx`). El modal de edición no interviene ni modifica asignaciones de personal.
* **Restricción de Fecha Estimada de Entrega:** Tanto en la creación como en la edición de órdenes, no se permite ingresar ni guardar fechas anteriores al día en curso (`fecha_estimada_entrega >= hoy`).

---

## 5. Módulos y Entidades Clave
* **`clientes`:** Directorio único de clientes con documento de identidad (Cédula/RNC), contactos y dirección. Soporta búsqueda integral, vista rápida 360° (`ClienteDetalleModal.jsx`) y paginación en servidor. Deep-link desde búsqueda global: `/clientes?clienteId=`.
* **`servicios_recepcion`:** Registro maestro de la orden de reparación, especificaciones del equipo, liquidación financiera y costos. Soporta edición controlada mediante `EditarOrdenModal.jsx`.
* **Dashboard Operativo (`/dashboard` / `DashboardPage.jsx`):** Resumen en tiempo real vía `GET /api/servicios/dashboard` (KPIs, flujo por estado, serie 7 días, carga de técnicos, actividad reciente), filtrado por sucursal según rol.
* **Búsqueda Global (`GlobalSearch.jsx`):** Autocompletado en cabecera sobre órdenes, clientes y equipos (`GET /api/buscar`), con navegación directa a taller o ficha de cliente.
* **Banco de Trabajo Técnico (`/taller` / `BancoTrabajoPage.jsx`):** Tablero operativo de taller con tarjetas de servicio (`TallerCard.jsx`), vista conmutativa en tabla con paginación y filtrado por estado mediante pestañas animadas (`AnimatedTabs.jsx`). Incluye la **Ficha Técnica Modal (`FichaTecnicaModal.jsx`)** para transición de estados, asignación multi-técnico y visualización gráfica del patrón/PIN de acceso.
* **`incidencias_servicio`:** Registro de imprevistos, piezas extra y costos adicionales surgidos durante el diagnóstico o la reparación, con ciclo de vida completo de autorización del cliente (Aprobado o Rechazado formalmente por WhatsApp, Llamada o Presencial).
* **Centro de Alertas In-App (`notificaciones` / `NotificationBell.jsx`):** Campanita en cabecera para SuperAdmin, Admin, Secretaría y Técnico. Eventos operativos (nueva orden, estados, incidencias, asignación, finalización) sin saturar el correo.
* **Correo Transaccional (Resend):**
  * **Cliente:** recibido, cancelado, entregado y recibo digital.
  * **Técnico (interno):** solo al asignársele una orden y al finalizarse/entregarse su orden.
  * El resto de movimientos internos se comunica exclusivamente por la campanita.
* **Pipeline Unificado de Evidencias Fotográficas (`sesiones_carga_fotos` y `evidencias_fotograficas`):**
  * Subida desacoplada tanto por QR móvil (`UploadMobilePage.jsx`) como desde PC en mostrador (`DevicePhotoUploader.jsx`), garantizando que ninguna foto quede desvinculada en Cloudinary.
  * Sondeo en segundo plano (*background polling*) que recibe evidencias sin bloquear el trabajo en la PC.
  * Eliminación inmediata en la nube al descartar fotos en la interfaz (`eliminarFotoTemporal`).
  * Recolector de basura (*Garbage Collector*) programado cada 30 minutos y política de retención histórica de 15 días en base de datos.
* **`categorias_dispositivos`:** Clasificación de equipos atendidos (Smartphone, Tablet/iPad, Laptop, Consola de Videojuegos, Smartwatch, Otros).
* **Portal de Seguimiento Público (`EstadoOrdenPage.jsx`):** Consulta web pública en tiempo real (`/estado` y `/estado/:codigo`) accesible vía escaneo de código QR generado por `TicketQR.jsx` con enlace dinámico corporativo, protegida por Cloudflare Turnstile y con transiciones de carga fluidas mediante `react-loading-skeleton`.
* **Comprobantes Térmicos de Salida (`ReciboEntregaTermico.jsx`):** Emisión térmica oficial de 58mm y 80mm al liquidar y despachar equipos, con desglose de mano de obra, repuestos aprobados, garantías y firmas.

---

## 6. Stack Tecnológico
* **Frontend:** React, Tailwind CSS, Vite, Lucide Icons, Morphicons, QRCode.react (`qrcode.react`), react-loading-skeleton, Sileo (Toaster).
* **Backend:** Node.js, Express.js.
* **Base de Datos:** PostgreSQL (`siger_fmc_db`) vía driver nativo `pg` con Connection Pooling y retención histórica automatizada.
* **Gestión Multimedia:** Cloudinary SDK v2 + Multer (MemoryStorage), compresión adaptativa a WebP (`siger-fmc/personal-fmc`, `siger-fmc/recepcion` y `siger-fmc/evidencias-tickets`), sincronización móvil de fotos vía QR, subida unificada desde PC y recolección autónoma de imágenes huérfanas.
* **Correo:** Resend (`resend` npm) con plantillas HTML de marca en `backend/src/config/emailTemplates.js` y borradores en `backend/src/templates/email/`.
* **Seguridad y Sesión:** Autenticación basada en JSON Web Tokens (JWT) con contraseñas encriptadas en `bcryptjs`, RBAC estricto para operaciones críticas y protección anti-bot opcional vía Cloudflare Turnstile.