# Registro de Cambios (Changelog) - SIGER-FMC

Todas las modificaciones notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y este proyecto se adhiere a [Semantic Versioning (SemVer)](https://semver.org/lang/es/).

---

## [Unreleased]

### Added
- **Pipeline Unificado de Evidencias Fotográficas y Prevención de Huérfanas (`DevicePhotoUploader.jsx`, `uploadSession.controller.js`, `servicios.controller.js`):**
  - **Subida Unificada desde PC:** Las imágenes seleccionadas desde PC en `DevicePhotoUploader.jsx` se canalizan a través de `subirFotosSession` (`POST /api/upload-session/:sessionId/subir`), inicializando o reutilizando la sesión activa en `sesiones_carga_fotos` con vigencia temporal de 15 minutos.
  - **Blindaje en Profundidad en Endpoint Directo (`POST /api/servicios/upload-foto`):** `uploadFotosServicio` genera o actualiza automáticamente una sesión en `sesiones_carga_fotos` con estado `COMPLETADO` y fecha de expiración, garantizando que ninguna foto quede sin registrar en base de datos.
  - **Destrucción en Tiempo Real desde UI (`DELETE /api/upload-session/foto` & `POST /api/servicios/evidencia-temporal`):** Controlador `eliminarFotoTemporal` que recibe `{ publicId, sessionId }`, destruye el asset inmediatamente en Cloudinary vía `cloudinary.uploader.destroy(publicId)` y actualiza el arreglo JSONB en `sesiones_carga_fotos`.
  - **Política de Retención Automática en Base de Datos (15 Días):** En `purgarSesionesExpiradas`, tras la destrucción de fotos en Cloudinary, se ejecuta una depuración histórica que elimina registros con más de 15 días de antigüedad (`DELETE FROM sesiones_carga_fotos WHERE estado IN ('PURGADA', 'UTILIZADA') AND created_at < NOW() - INTERVAL '15 days'`).
  - **Script de Conciliación y Purga Administrativa (`backend/src/scripts/purgar_huerfanas_cloudinary.js`):** Herramienta CLI utilitaria que lista los recursos en la carpeta `siger-fmc/recepcion` de Cloudinary, los compara contra los `public_id` de `evidencias_fotograficas` y `sesiones_carga_fotos` activas en PostgreSQL, y purga de forma segura archivos huérfanos con más de 2 horas de antigüedad.
  - **Desacoplamiento del Ciclo de Vida QR y Polling en Segundo Plano:** El ciclo de vida de la sesión QR (`activeSessionId`, `sessionExpiresAt`) y el sondeo continuo (polling cada ~2.5s) se elevaron a `DevicePhotoUploader.jsx`. El sondeo continúa activo aunque se cierre `QrUploadModal.jsx`, emitiendo una notificación toast (`sileo.success`) al recibir las fotos.
  - **Propagación Dinámica de Cupo de Fotos (`maxFotosPermitidas`):** `DevicePhotoUploader.jsx` calcula los cupos disponibles (`MAX_PHOTOS - currentPhotos.length`) y los envía a `crearUploadSession`. Se persiste en la columna `max_fotos` de `sesiones_carga_fotos`, y el endpoint de subida (`subirFotosSesion`) valida estrictamente que la suma acumulada no exceda el límite permitido.
  - **Blindaje y Formato Exacto en Carga Móvil (`UploadMobilePage.jsx`):** Validación en montaje inicial (`useEffect`) que deshabilita la interfaz si la sesión ya fue completada, utilizada o purgada. Pastilla de conteo adaptada a la relación exacta `${selectedFiles.length} de ${limiteEfectivo}`.
- **Flujo Integral de Cancelación de Órdenes de Servicio (`POST /api/servicios/:id/cancelar` & `CancelarOrdenModal.jsx`):**
  - **Control Estricto de Roles (RBAC):** Restricción de acceso en `servicios.routes.js` mediante `checkRole(['SuperAdmin', 'Admin_Sucursal'])`. Usuarios con rol `Tecnico` o `Secretaria` tienen terminantemente prohibida la anulación de órdenes (HTTP `403 Forbidden`).
  - **Backend Transaccional:** Endpoint dedicado `POST /api/servicios/:id/cancelar` protegido por transacción atómica (`FOR UPDATE`), validación multi-sucursal defensiva y reglas estrictas de ciclo de vida (impide cancelar órdenes en estado `ENTREGADO` o previamente canceladas con HTTP `400 Bad Request`).
  - **Auditoría e Inmutabilidad:** Exige `motivo_cancelacion` obligatorio (mínimo 5 caracteres), actualiza el estado al catálogo `CANCELADO_DEVUELTO` (`orden_flujo = 8`), persiste `motivo_cancelacion`, `fecha_cancelacion` y `usuario_cancela_id` en `servicios_recepcion` e inserta el evento de auditoría en `historial_estados`.
  - **Modal Homologado (`CancelarOrdenModal.jsx`):** Interfaz modal amplia (`max-w-xl sm:max-w-2xl`) con cabecera limpia y metadatos destacados (código `# Ticket` resaltado en monoespaciado con icono `Hash` rojo, cliente con icono `User` y dispositivo con icono dinámico según categoría), aviso de advertencia tipográfico directo sobre el fondo sin contenedores invasivos, y botones estandarizados ("Volver" y "Confirmar Cancelación").
- **Endpoint Dedicado para Emisión de Comprobantes (`GET /api/servicios/:id/ticket-impresion`):**
  - Separación de responsabilidades entre consulta pública y emisión física: endpoint especializado `getTicketImpresionData` que valida y rechaza formalmente la generación de comprobantes térmicos o stickers para órdenes canceladas con HTTP `400 Bad Request` (*"No se permite emitir comprobantes o etiquetas para órdenes canceladas"*).
- **Comprobante Térmico de Salida y Liquidación (`ReciboEntregaTermico.jsx`):**
  - Nuevo comprobante térmico oficial para impresión de 58mm y 80mm con desglose exhaustivo de diagnósticos, mano de obra, repuestos/incidencias aprobadas, anticipos previos, descuentos, balance liquidado, condiciones de garantía y firmas de conformidad de cliente y receptor.
- **Modales de Inspección 360° en Clientes y Personal (`ClienteDetalleModal.jsx`, `UsuarioDetalleModal.jsx`):**
  - Modales de lectura y auditoría integral con diseño homologado, estadísticas de actividad, órdenes asociadas y badges minimalistas.
- **Blindaje Defensivo de Integridad ante Órdenes Canceladas:**
  - Bloqueo estricto con HTTP `400 Bad Request` en todas las operaciones de mutación técnica en taller para órdenes canceladas:
    - `updateServicioEstado`: Impide transición o avance de estado en órdenes canceladas.
    - `assignTecnicoServicio` y `removeTecnicoServicio`: Bloquea asignación y desasignación de colaboradores.
    - `createIncidenciaServicio` y `updateAprobacionIncidencia`: Bloquea registro de repuestos e incidencias adicionales.
    - `liquidarYEntregarServicio`: Bloquea liquidación financiera o entrega de equipos dados de baja.

### Changed
- **Liberación de Consulta Pública para Órdenes Canceladas (`getServicioByTicket` & `EstadoOrdenPage.jsx`):**
  - Se eliminó el bloqueo `400` del endpoint de seguimiento online (`GET /api/servicios/ticket/:codigo`), garantizando que clientes y técnicos puedan consultar órdenes canceladas de forma transparente con sus metadatos (`motivo_cancelacion`, `fecha_cancelacion`).
  - **Limpieza Visual en Consulta Pública (`EstadoOrdenPage.jsx`):**
    - Retiro del banner superior redundante para priorizar una vista limpia y directa del buscador al stepper.
    - Stepper de seguimiento actualizado con nodo terminal `Cancelado` completado con icono `<X />` en rojo institucional y trazo de conexión continuo.
    - Reubicación contextual en tarjeta "Tiempos y Personal": el campo "Fecha Est. Entrega" conmuta a "Fecha de Cancelación" y se proyecta el bloque tipográfico de "Motivo de Cancelación" si está presente.
- **Refactorización de Tabla de Servicios (`ServiciosPage.jsx`):**
  - Fila completamente interactiva (`cursor-pointer` y `onClick`) para abrir los detalles de la orden, retirando el botón redundante de visualización con icono de ojo (`<Eye />`).
  - Ocultamiento contextual en la columna de acciones: los botones de impresión (`<Printer />`) y de cancelación (`<Ban />`) se ocultan automáticamente en filas de órdenes canceladas o inactivas.
- **Pie de Modal Contextual en `OrdenDetalleModal.jsx`:**
  - Retiro del botón de cancelación del pie del modal (centralizándolo exclusivamente en las acciones de la tabla general).
  - El botón "Abrir en Banco de Trabajo" se oculta automáticamente si la orden está entregada o cancelada, dejando el pie del modal oculto sin líneas divisorias vacías.
  - Normalización defensiva de nombres de dispositivos (`formatDeviceName`), corrigiendo casos de duplicidad de marca y modelo (ej. "Google Pixel Google Pixel 7 Pro" -> "Google Pixel · 7 Pro").
- **Homologación de Insignias de Checklist a Variante Minimalista:**
  - Actualización de `<DeviceChecklistPicker />` con `badgeVariant="minimal"` en `OrdenDetalleModal.jsx` y en la Ficha Técnica del Banco de Trabajo (`FichaTecnicaModal.jsx`).
  - Soporte bidireccional en `DeviceChecklistPicker.jsx` para variantes `'minimal'` y `'minimalist'`.
- **Automatización del Entorno de Desarrollo (`.vscode/tasks.json`):**
  - Tarea `Dev: Frontend` migrada a `type: "shell"` ejecutando `npm run dev -- --host` en el directorio `${workspaceFolder}/frontend` para habilitar acceso por red local.
  - Corrección de esquema de la tarea compuesta `🚀 Iniciar Entorno Completo`: reubicación de `isDefault` dentro de `group: { kind: "build", isDefault: true }` y adición de `"problemMatcher": []`, resolviendo el aviso `Missing property "customize"`.

---

## [0.9.0] - 2026-09-17

### Added
- **Sincronización Móvil de Evidencias Fotográficas vía QR (`/api/upload-session`):**
  - Tabla `sesiones_carga_fotos` con almacenamiento JSONB estructurado (`url`, `secure_url`, `public_id`, `bytes`, `size`, `fecha_subida`), UUID v4 y vigencia de 15 minutos.
  - Endpoints `POST /api/upload-session`, `GET /api/upload-session/:sessionId`, `POST /api/upload-session/:sessionId/subir` y `POST /api/upload-session/purgar`.
  - Interfaz web móvil responsiva (`UploadMobilePage.jsx`) para captura directa con cámara o galería desde smartphones sin autenticación.
  - Modal interactivo de sincronización en PC (`QrUploadModal.jsx`) con polling automático y carga fluida de evidencias.
- **Ciclo de Vida y Garbage Collector Autónomo de Cloudinary:**
  - **Confirmación Automática:** Al guardar la orden (`POST /api/servicios`), las sesiones de carga móvil asociadas transicionan de forma atómica a `estado = 'UTILIZADA'`, protegiendo sus imágenes de cualquier purga.
  - **Recolección Periódica en Background:** Rutina `purgarSesionesExpiradas()` que consulta sesiones huérfanas (`estado NOT IN ('UTILIZADA', 'CONFIRMADA', 'PURGADA')` y expiración mayor a 30 minutos atrás), destruye sus fotos en Cloudinary vía `cloudinary.uploader.destroy(public_id)` y marca la sesión como `'PURGADA'`.
  - Activadores resilientes en background con intervalo `.unref()`, al crear/expirar sesiones y vía endpoint manual.
  - Índice de base de datos compuesto `idx_sesiones_carga_estado_expira` sobre `(estado, expira_en)`.
- **Regla de Asignación Obligatoria de Técnico en Taller:**
  - Validación en backend (`servicios.controller.js`): Impide avanzar de estado desde `RECIBIDO` hacia cualquier estado operativo (`EN_DIAGNOSTICO`, `EN_REPARACION`, etc.) si no existe al menos un técnico asignado en `tecnicos_asignados` (HTTP `400 Bad Request`).
  - Bloqueo de desasignación: Impide retirar al único técnico asignado si la orden ya no se encuentra en estado inicial `RECIBIDO`.
- **Blindaje Estricto Multi-Sucursal en Mesa de Trabajo:**
  - Forzado estricto de `req.user.sucursal_id` en todas las consultas y mutaciones de taller.
  - Rechazo inmediato con HTTP `404 Not Found` en intentos de mutación cruzada entre sucursales.
  - Validación de coincidencia de sede al asignar técnicos a una orden.
- **Restricción de Roles Operativos en Taller:**
  - Exclusión estricta de personal con rol `Secretaria`/Recepción en asignaciones técnicas de taller (`POST /api/servicios/:id/tecnicos`), selectores de colaboradores y visibilidad de la acción "Unirme a la orden" (restringido a `Tecnico`, `Admin_Sucursal` y `SuperAdmin`).

### Changed
- **Homologación Visual en Carga Móvil y Modal QR:**
  - `UploadMobilePage.jsx`: Cabecera y branding homologados con `EstadoOrdenPage.jsx` (logo, selector de tema oscuro/claro y tipografía institucional).
  - `QrUploadModal.jsx`: Reducción de textos redundantes, integración de componente `Badge` minimalista, espaciado inferior ergonómico y adopción del sistema de diseño unificado (`Button`, `SimpleButton`).
  - `DevicePhotoUploader.jsx`: Tarjetas de evidencia con indicador de peso en bytes/KB y posicionamiento superior derecho del botón de eliminación.

---

## [0.8.1] - 2026-09-16

### Added
- **Microcomponente Reutilizable de Confirmación Inline (`InlineConfirmButton.jsx`):**
  - Componente interactivo de confirmación en dos pasos (`[Unirme] -> "¿Unirte?" [✓] [✕]`) con microanimaciones, auto-cierre tras 5s por inactividad (`autoCancelTimeout`), detección de clics externos y variantes visuales (`card`, `primary`, `custom`).
  - Integración en `TallerCard.jsx` para autoasignación rápida de técnicos en el banco de trabajo sin necesidad de abrir la ficha técnica.
  - Integración en `FichaTecnicaModal.jsx` para el botón de autoasignación técnica directa.
- **Exposición y Filtrado de Incidencias en Consulta Pública (`getServicioByTicket` & `EstadoOrdenPage.jsx`):**
  - Subconsulta SQL optimizada en `servicios.controller.js` (`getServicioByTicket`) que proyecta incidencias activas en formato JSON con ID, descripción, tipo, repuesto, costo, fecha y fotos vinculadas de `evidencias_fotograficas` (`WHERE incidencia_id = inc.id`).
  - Inyección de eventos con `tipo_evento: 'INCIDENCIA'` en `historialPublico` ordenados cronológicamente de forma descendente junto a las transiciones de estado.
- **Componente Modularizado de Línea de Tiempo (`ServiceTimeline.jsx`):**
  - Componente compartido de visualización cronológica reutilizado tanto en Ficha Técnica (`FichaTecnicaModal.jsx`) como en el portal público de seguimiento (`EstadoOrdenPage.jsx`).
  - Soporte de modo público (`isPublic={true}`) con regla de exposición controlada: solo muestra incidencias de tipo `"Aviso al Cliente"` o incidencias con resolución formal (aprobadas o rechazadas), filtrando hallazgos técnicos o notas operativas internas.
  - Renderizado de miniaturas multimedia asociadas a cada hito y apertura a pantalla completa vía modal Lightbox.
- **Copiado Rápido de Ticket en Ficha Técnica (`FichaTecnicaModal.jsx`):**
  - Encabezado interactivo que permite copiar el código de ticket al portapapeles con un clic (`navigator.clipboard.writeText`) con feedback visual instantáneo (icono `Check` esmeralda durante 1.5s).

### Changed
- **Limpieza Visual en Ficha Técnica y Portal de Consulta Pública:**
  - `FichaTecnicaModal.jsx`: Eliminación de galerías de fotos de recepción duplicadas fuera del timeline histórico, consolidando toda la evidencia fotográfica dentro de los nodos correspondientes.
  - `EstadoOrdenPage.jsx`: Retiro del subtítulo redundante "Portal de Consulta y Seguimiento", unificación de espacios y enriquecimiento del detalle de hardware y avance.

### Fixed
- **Normalización de Evidencias en Nodos de Estado:**
  - Vinculación inequívoca de fotos de recepción inicial (`tipo_evidencia = 'RECEPCION'`) al evento de ingreso en taller (`orden_flujo = 1`) y fotos de salida (`tipo_evidencia = 'ENTREGA'`) al evento de despacho (`orden_flujo = 7`), evitando fotos flotantes descontextualizadas.

---

## [0.8.0] - 2026-09-15

### Added
- **Modal de Liquidación y Entrega de Equipos (`EntregaServicioModal.jsx`):**
  - **Desglose Financiero Integral:** Cálculo automático de balance con costo base de mano de obra, suma de incidencias aprobadas con costo adicional, deducción de anticipos pagados y descuentos comerciales.
  - **Multi-Método de Pago:** Soporte formal para cobro en `'Efectivo'`, `'Tarjeta'` y `'Transferencia'`.
  - **Cálculo Reactivo de Cambio:** Cálculo en tiempo real de devuelta/cambio para cobros en efectivo con validación de suficiencia del importe entregado por el cliente.
  - **Captura de Evidencias Fotográficas de Salida:** Integración de `DevicePhotoUploader.jsx` dentro del modal para registrar fotografías de entrega física del equipo reparado y encendido, persistidas atómicamente con `tipo_evidencia = 'ENTREGA'`.
  - **Observaciones de Despacho:** Campo textual para asentar notas de conformidad del cliente al momento de retirar el dispositivo.
- **Comprobante Térmico de Salida y Liquidación (`ReciboEntregaTermico.jsx`):**
  - **Componente Modularizado:** Comprobante térmico POS nativo (80mm / 58mm) completamente desacoplado de `TicketTermico.jsx`.
  - **Desglose Contable de Salida:** Cabecera fiscal de la sucursal emisora, datos del cliente y dispositivo, detalle de falla resuelta, detalle de mano de obra y de cada repuesto/incidencia aprobada, anticipo, total liquidado, importe recibido y cambio devuelto.
  - **Póliza de Garantía y QR:** Bloque formal de días de vigencia, fecha exacta de expiración, términos de cobertura y código QR vectorial dinámico (`TicketQR.jsx`).
  - **Integración con Configuración de Tickets:** Respeta las directivas y flags de `config_tickets` (`mostrar_cliente`, `mostrar_equipo`, `mostrar_falla`, `mostrar_observaciones`, `mostrar_costo_y_anticipo`, `imprimir_garantia`, `mostrar_mensaje_cortesia`, ancho de papel y regla de 2 copias con salto `@media print`).
- **Modal Post-Entrega Homologado (`PostEntregaModal.jsx`):**
  - Diálogo modal de confirmación post-despacho homologado visualmente respecto a `PostCreacionModal.jsx` con contenedor circular simétrico (`w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 mx-auto mb-4`), monto total cobrado y botón rojo primario a ancho completo para imprimir el recibo térmico con un clic.
- **Persistencia Atómica en Base de Datos (`servicios_recepcion`):**
  - Nuevas columnas DDL y lógica transaccional: `fecha_entrega_real`, `usuario_entrega_id` (FK `datos_trabajadores(id)`), `metodo_pago_entrega`, `monto_liquidado`, `monto_recibido_entrega`, `cambio_devuelto_entrega` y `observaciones_entrega`.
  - Transición atómica al estado `ENTREGADO` (Orden 7) con asiento inmutable en `historial_estados` y almacenamiento en `evidencias_fotograficas`.
- **Suite Automatizada de Pruebas de Aislamiento y Roles (`test_branch_isolation.js`):**
  - 12/12 pruebas unitarias e integrales exitosas validando el aislamiento multi-sucursal y el cumplimiento estricto de las reglas de negocio por rol.

### Changed
- **Refinamiento Visual de la Bitácora Técnica ("HISTÓRICO EN TALLER" en `FichaTecnicaModal.jsx`):**
  - Sustitución de la línea conectora vertical sólida por un trazo continuo punteado/discontinuo elegante (`border-l-2 border-dashed border-neutral-300 dark:border-neutral-700`).
  - Reemplazo de los puntos sólidos por anillos huecos (*hollow rings*, `w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-[#18181b]`) con color dinámico en el borde perimetral sincronizado con el estado operativo o la naturaleza del evento técnico.
- **Detección Normalizada de Órdenes Entregadas en Reimpresión (`ServiciosPage.jsx`, `PostCreacionModal.jsx`):**
  - Normalización robusta e insensible a mayúsculas/minúsculas para evaluar si una orden ya fue despachada (`estadoNormalizado.includes('ENTREG') || orden_flujo === 7 || estado_id === 7 || fecha_entrega_real`).
  - Al abrir el diálogo de reimpresión desde la tabla de tickets para una orden entregada, destaca prioritariamente el botón rojo "Recibo de Entrega y Liquidación" (montando `ReciboEntregaTermico`), manteniendo accesibles de forma secundaria el ticket de recepción y el sticker.
- **Enriquecimiento de la Consulta `getServicioById`:**
  - Inclusión explícita de `codigo_estado` y `orden_flujo` en el payload de detalle de servicio, garantizando la consistencia del estado en modales de impresión y vistas técnicas sin disparar consultas redundantes.

### Fixed
- **Homologación Visual y Corrección de Icono en `PostEntregaModal.jsx`:**
  - Corrección del aplastamiento o deformación horizontal del contenedor del icono de check esmeralda superior.
  - Eliminación de botones superfluos o redundantes ("WhatsApp" y "Finalizar") para proporcionar un flujo de caja enfocado y sin distracciones.
- **Tratamiento Contable de Incidencias Rechazadas:**
  - Garantía matemática y visual de exclusión del costo adicional de incidencias rechazadas en el total a liquidar, mostrándose tachadas (`line-through`) y con badge descriptivo.

### Security
- **Control Estricto de Roles en Taller (`checkTecnicoRol`):**
  - **Validación Backend (HTTP 400):** Bloqueo estricto que rechaza cualquier intento de autoasignación o asignación técnica hacia colaboradores con roles administrativos (`SuperAdmin`, `Admin_Sucursal`) o de secretaría (`Secretaria`).
  - **Filtro de Catálogo (`?solo_tecnicos=true`):** Filtrado específico en `/api/trabajadores` para que los desplegables de asignación en taller únicamente listen técnicos operativos activos.
  - **Ocultamiento Condicional en UI:** En `TallerCard.jsx` y `FichaTecnicaModal.jsx`, los botones interactivos de autoasignación ("Asignarme") y selectores se ocultan condicionalmente si el usuario autenticado no posee el rol de Técnico.

## [0.7.0] - 2026-09-14

### Added
- **Módulo de Taller Técnico y Banco de Trabajo (`BancoTrabajoPage.jsx`, `TallerCard.jsx`, `AnimatedTabs.jsx`):**
  - **Mesa de Trabajo Dinámica:** Vista de gestión técnica organizada por fases de taller con selector animado de pestañas (`AnimatedTabs`) que muestra contadores en tiempo real por estado operativo (`Recibido`, `En Diagnóstico`, `En Reparación`, `Esperando Repuesto`, `Listo para Entrega`).
  - **Tarjetas de Taller (`TallerCard.jsx`):** Visualización de equipos en banco con código de ticket, cliente, dispositivo, técnico asignado, nivel de prioridad y acceso directo con un clic a la Ficha Técnica.
- **Ficha Técnica Integral del Equipo (`FichaTecnicaModal.jsx`):**
  - **Auditoría de Datos Iniciales:** Resumen del equipo, cliente, fecha de ingreso, fallas reportadas y checklist de recepción.
  - **Transición de Estados con Validación:** Formulario para actualizar el estado técnico (`POST /api/servicios/:id/estados`) con notas de avance técnico y asignación del técnico responsable.
  - **Gestión Multi-Técnico:** Asignación y desasignación reactiva de múltiples técnicos de taller (`POST /api/servicios/:id/tecnicos` y `DELETE /api/servicios/:id/tecnicos/:tecnicoId`).
  - **Bitácora Unificada ("HISTÓRICO EN TALLER"):** Línea de tiempo que entrelaza cronológicamente las transiciones de estado con los hallazgos técnicos en orden descendente (del más reciente al más antiguo) con contenedor scroleable independiente (`max-h-[480px]`).
- **Módulo de Incidencias y Hallazgos Técnicos (Backend & Frontend):**
  - **Endpoints Relacionales (`servicios.controller.js`, `servicios.routes.js`):**
    * `POST /api/servicios/:id/incidencias`: Registro transaccional en `incidencias_servicio` (tipo, descripción, repuesto, costo adicional) y vinculación a `evidencias_fotograficas` (`tipo_evidencia = 'INCIDENCIA'`).
    * `GET /api/servicios/:id/incidencias`: Consulta de incidencias activas con datos del autor técnico y galería multimedia.
    * `GET /api/servicios/:id`: Enriquecido con subconsultas JSON agregadas para incidencias, técnicos asignados y fotos.
  - **Aislamiento Estricto de Fotos:** Separación inequívoca entre fotos de recepción inicial (`tipo_evidencia = 'RECEPCION'`) y fotos vinculadas a incidencias técnicas específicas (`tipo_evidencia = 'INCIDENCIA'`).
  - **Visor Lightbox Multimedia:** Visualizador de imágenes ampliado a pantalla completa con portal React (`createPortal`) integrado tanto en incidencias como en el histórico.
- **Ciclo de Vida de Aprobación y Rechazo de Costo Extra por Incidencias:**
  - **Endpoint de Resolución (`PATCH /api/servicios/:id/incidencias/:incidenciaId/aprobacion`):** Admite resolución de aprobación (`aprobado: true`) o rechazo formal (`estado_aprobacion: 'RECHAZADO'`, `aprobado_por_cliente = FALSE`, `fecha_aprobacion = NOW()`), con registro del canal de contacto (*WhatsApp*, *Llamada*, *Presencial*).
  - **Tratamiento del Rechazo:** Presentación del costo adicional tachado (`line-through`) con indicación explícita de descarte del total a cobrar, y botón para reconsiderar en caso de que el cliente cambie de opinión.
  - **Diseño Inline Sobrio:** Retiro de píldoras pesadas en favor de metadatos limpios, selectores segmentados compactos y botones institucionales `Button.jsx` (botón de confirmación en rojo institucional).
- **Homologación Visual y Vectorial del Patrón de Desbloqueo (`PatternLock.jsx` & `LabelPreview.jsx`):**
  - **Ficha Técnica (Modo Pantalla):** Rediseño de `PatternLockSvg` homologado 1:1 con el diseñador de recepción (`DeviceSecurityPicker`): cuadrícula 3x3 con números de paso del trazo (1, 2, 3...) en blanco dentro de círculos rojos (`fill="#ef4444"`), halo suave y trazos rojos continuos.
  - **Etiquetas Térmicas (Modo Compacto):** Cuadrícula 3x3 numerada en paleta estrictamente monocromática de alto contraste (negro `#111827` sobre blanco) para etiquetas adhesivas, asegurando legibilidad sin tramas de escala de grises en impresoras de 58mm y 80mm.
  - **Corrección de Desbordamiento y Envoltura (`wrap`):** Eliminación de truncamiento (`truncate`) en ambas variantes, aplicando `break-all whitespace-normal flex-wrap text-center` para que las secuencias largas quiebren suavemente de renglón y se mantengan perfectamente centradas sin generar puntos suspensivos (`...`).
  - **Eliminación de Rótulos Redundantes:** Retiro de los textos `"Patrón: X puntos"` y `"PATRÓN"` para una estética limpia.
  - **Prevención de Solapamiento en `LabelPreview.jsx`:** Contenedor derecho acotado a `w-20 sm:w-24 max-w-[96px]` y columna izquierda con `flex-1 min-w-0 pr-2` para garantizar holgura total a los datos del cliente y evitar cortes en el borde inferior.

---

## [0.6.2] - 2026-09-13

### Added
- **Ordenamiento Interactivo Multi-Columna en Tablas Maestras (`ServiciosPage.jsx`, `ClientsPage.jsx`, `WorkersPage.jsx`):**
  - **Estado y Alternancia:** Implementación de `sortConfig` (`key`, `direction`) con función `handleSort` reactiva que conmuta entre orden ascendente y descendente en clics sucesivos.
  - **Servicios (`ServiciosPage.jsx`):** Ordenamiento por Ticket (alfabético), Cliente (A-Z / Z-A), Equipo (marca y modelo), Estado, Prioridad (ponderación por severidad `Urgente: 3 > Alta: 2 > Media: 1 > Baja: 0`) y Fecha de ingreso (cronológica precisa por timestamp).
  - **Clientes (`ClientsPage.jsx`):** Ordenamiento por Cliente (nombre completo A-Z / Z-A), Contacto (cédula/RNC, teléfono, correo), Dirección, Fecha de Registro y Estado (activo/inactivo).
  - **Usuarios / Trabajadores (`WorkersPage.jsx`):** Ordenamiento por Usuario/Nombre (A-Z / Z-A), Cédula/Contacto, Rol (jerarquía de permisos `Super Admin > Admin Sucursal > Secretaria > Técnico`) y Estado (activo/inactivo).
  - **UI/UX Minimalista:** Encabezados interactivos (`cursor-pointer select-none`) limpios y sin iconos cuando la columna está inactiva, y con indicadores de flecha minimalistas estilizados (`ChevronUp` / `ChevronDown` en color rojo de acento) al activarse.
- **Acción Rápida de Selección Masiva en Checklist de Recepción (`ChecklistRecepcion.jsx`):**
  - Botón complementario "Marcar todos" junto al botón de limpiar, manteniendo coherencia estética y permitiendo completar rápidamente las comprobaciones de entrada de dispositivos.
- **Píldora Deslizante Animada en Selector de Pestañas (`ConfigurationPage.jsx`):**
  - Navegación animada entre pestañas mediante indicador deslizante reactivo utilizando React nativo (`useRef`, `useState`, `useEffect`) y Tailwind CSS, calculando dinámicamente `offsetLeft` y `offsetWidth`.
- **Sombreado Visual de Rango en Selector de Fechas (`DatePicker.jsx` / `Calendar.jsx`):**
  - Efecto continuo de recorrido entre la fecha inicial y la fecha de destino seleccionada (`isInRange`), con resaltado visual estilizado y bordes redondeados.

### Changed
- **Estandarización de Ancho de Contenedor en Dashboard:**
  - Ajuste del área de trabajo del Dashboard a `max-w-7xl mx-auto w-full` para armonizar el ancho de mesa de trabajo con las demás vistas del sistema (`Servicios`, `Clientes`, `Usuarios`).
- **Limpieza de Modales de Impresión:**
  - Remoción del botón redundante "Cerrar" en el modal de tickets y etiquetas térmicas, delegando el cierre a la interacción estándar (`Esc` / clic exterior / botón de aspa superior).

---

## [0.6.1] - 2026-09-11

### Added
- **Auditoría y Persistencia de `public_id` de Cloudinary en Evidencias Fotográficas (`servicios.controller.js`, `DevicePhotoUploader.jsx`):**
  - **Endpoint de Subida (`POST /api/servicios/upload-foto`):** Respuesta estructurada retornando `url`, `public_id`, `fotos: [{ url, public_id }]` y `urls`, asegurando acceso directo tanto a nivel raíz como anidado.
  - **Componente de Carga (`DevicePhotoUploader.jsx`):** Almacenamiento en el estado local de objetos estructurados `{ url, public_id }` con soporte de renderizado resiliente y preservación de identificadores de Cloudinary.
  - **Envío en Formulario (`NuevaOrdenPage.jsx`):** Mapeo de `fotos_recepcion` y `evidencias_fotograficas` enviando arreglos de objetos estructurados `{ url, public_id }`.
  - **Persistencia en Base de Datos (`createServicio`):** Inserción relacional en `evidencias_fotograficas (servicio_id, url_foto, public_id, tipo_evidencia, usuario_id)` almacenando fielmente el `public_id` de Cloudinary para futura gestión y depuración física de assets.
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
