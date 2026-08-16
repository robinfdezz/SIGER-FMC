# 🗄️ Diccionario y Estructura de Base de Datos - SIGER-FMC

- **Motor:** Microsoft SQL Server (T-SQL)
- **Base de Datos:** `SIGER_FMC_DB`
- **Juego de caracteres / Textos:** `NVARCHAR` (Soporte UTF-8/Unicode)
- **Estrategia de eliminación:** Borrado lógico (`activo = 0 / 1`) en entidades principales.

---

## 1. Tablas y Estructura

### `Datos_Companhia` (Empresa Matriz)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `nombre_empresa` | NVARCHAR(100) | NO | Nombre legal/comercial |
| `rnc` | NVARCHAR(20) | NO | Registro Nacional de Contribuyente |
| `telefono_principal`| NVARCHAR(20) | NO | Teléfono de contacto |
| `correo_contacto` | NVARCHAR(100) | NO | Correo oficial |
| `direccion_fiscal` | NVARCHAR(MAX) | NO | Dirección de la empresa |
| `logo_url` | NVARCHAR(255) | SÍ | URL del logo (Cloudinary) |
| `created_at` | DATETIME2 | NO | Fecha de creación (SYSDATETIME()) |
| `updated_at` | DATETIME2 | NO | Fecha de modificación |

### `Datos_Sucursales` (Sedes Físicas)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `companhia_id` | INT | NO | FK -> `Datos_Companhia(id)` ON UPDATE CASCADE |
| `codigo_sucursal`| NVARCHAR(10) | NO | Código único (ej. 'SUC-01') |
| `nombre_sucursal`| NVARCHAR(100) | NO | Nombre descriptivo |
| `telefono` | NVARCHAR(20) | NO | Teléfono de la sucursal |
| `direccion` | NVARCHAR(MAX) | NO | Ubicación física |
| `created_at` | DATETIME2 | NO | Timestamp de creación |
| `updated_at` | DATETIME2 | NO | Timestamp de actualización |
| `activo` | BIT | NO | Estado lógico (1 = Activo, 0 = Inactivo) |

### `Roles_Equipo` (Niveles de Permisos)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `nombre_rol` | NVARCHAR(50) | NO | Nombre único ('SuperAdmin', 'Admin_Sucursal', etc.) |
| `descripcion` | NVARCHAR(255) | SÍ | Detalle del alcance del rol |
| `created_at` | DATETIME2 | NO | Timestamp de creación |
| `activo` | BIT | NO | Estado lógico |

### `Datos_Trabajadores` (Usuarios del Sistema)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `sucursal_id` | INT | SÍ | FK -> `Datos_Sucursales(id)` (NULL = SuperAdmin) |
| `rol_id` | INT | NO | FK -> `Roles_Equipo(id)` |
  `usuario` | NVARCHAR(50) | NO | usuario de seccion |
| `nombre` | NVARCHAR(50) | NO | Nombre de pila |
| `apellido` | NVARCHAR(50) | NO | Apellidos |
| `cedula` | NVARCHAR(20) | NO | Cédula de identidad |
| `telefono` | NVARCHAR(20) | NO | Teléfono móvil |
| `correo` | NVARCHAR(100) | NO | Correo electrónico (Login / Único) |
| `password` | NVARCHAR(255) | NO | Contraseña con hash Bcrypt |
| `foto_perfil_url` | NVARCHAR(255) | SÍ | URL del avatar (Cloudinary) |
| `ultimo_login` | DATETIME2 | SÍ | Último acceso registrado |
| `created_at` | DATETIME2 | NO | Timestamp de creación |
| `updated_at` | DATETIME2 | NO | Timestamp de actualización |
| `activo` | BIT | NO | Estado lógico |

### `Categorias_Dispositivos` (Catálogo de Equipos)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `nombre_categoria`| NVARCHAR(50) | NO | Único ('Smartphone', 'Laptop', etc.) |
| `descripcion` | NVARCHAR(150) | SÍ | Detalle de la categoría |
| `activo` | BIT | NO | Estado lógico |

### `Estados_Servicio` (Catálogo de Estados)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `codigo_estado` | NVARCHAR(30) | NO | Código único (ej. 'EN_REPARACION') |
| `nombre_estado` | NVARCHAR(50) | NO | Etiqueta visible ('En Proceso de Reparación') |
| `color_badge` | NVARCHAR(20) | NO | Color hexadecimal (ej. '#3B82F6') |
| `orden_flujo` | INT | NO | Posición en la línea de tiempo/flujo |

### `Servicios_Recepcion` (Órdenes de Trabajo)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `codigo_ticket` | NVARCHAR(20) | NO | Código único público (ej. 'TKT-2026-0001') |
| `sucursal_id` | INT | NO | FK -> `Datos_Sucursales(id)` |
| `categoria_id` | INT | NO | FK -> `Categorias_Dispositivos(id)` |
| `usuario_recepcion_id`| INT | NO | FK -> `Datos_Trabajadores(id)` |
| `estado_actual_id`| INT | NO | FK -> `Estados_Servicio(id)` |
| `nombre_cliente` | NVARCHAR(100) | NO | Nombre del cliente |
| `telefono_cliente`| NVARCHAR(20) | NO | Teléfono para avisos |
| `cedula_cliente` | NVARCHAR(20) | SÍ | Documento del cliente |
| `correo_cliente` | NVARCHAR(100) | SÍ | Correo del cliente |
| `marca_equipo` | NVARCHAR(50) | NO | Marca (Apple, Samsung, etc.) |
| `modelo_equipo` | NVARCHAR(50) | NO | Modelo (iPhone 13, Galaxy S23, etc.) |
| `num_serie_imei` | NVARCHAR(50) | SÍ | Número de serie o IMEI |
| `datos_acceso_equipo`| NVARCHAR(MAX) | SÍ | Patrón, PIN o contraseña de desbloqueo |
| `falla_reportada`| NVARCHAR(MAX) | NO | Problema descrito por el cliente |
| `observaciones_recepcion`| NVARCHAR(MAX) | SÍ | Detalles estéticos/físicos iniciales |
| `checklist_entrada`| NVARCHAR(MAX) | SÍ | Lista de verificación en formato JSON |
| `costo_previsto` | DECIMAL(10,2) | NO | Presupuesto inicial (Default: 0.00) |
| `monto_descuento`| DECIMAL(10,2) | NO | Descuento aplicado (Default: 0.00) |
| `costo_final_confirmado`| DECIMAL(10,2) | NO | Monto final a cobrar (Default: 0.00) |
| `tiempo_garantia`| NVARCHAR(50) | SÍ | Periodo de garantía (Default: '30 días') |
| `condiciones_garantia`| NVARCHAR(MAX) | SÍ | Términos y exclusiones de garantía |
| `fecha_entrega_estimada`| DATE | SÍ | Fecha acordada de entrega |
| `fecha_entrega_real`| DATETIME2 | SÍ | Fecha y hora en la que se entregó |
| `created_at` | DATETIME2 | NO | Timestamp de creación |
| `updated_at` | DATETIME2 | NO | Timestamp de actualización |
| `activo` | BIT | NO | Estado lógico |

### `Tecnicos_Asignados` (Asignación Técnica)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `Servicios_Recepcion(id)` ON DELETE CASCADE |
| `tecnico_id` | INT | NO | FK -> `Datos_Trabajadores(id)` |
| `fecha_asignacion`| DATETIME2 | NO | Timestamp de asignación |
| `es_principal` | BIT | NO | 1 = Responsable principal, 0 = Apoyo |

### `Historial_Estados` (Línea de Tiempo / Auditoría)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `Servicios_Recepcion(id)` ON DELETE CASCADE |
| `estado_id` | INT | NO | FK -> `Estados_Servicio(id)` |
| `usuario_id` | INT | NO | FK -> `Datos_Trabajadores(id)` |
| `nota_cambio` | NVARCHAR(MAX) | SÍ | Observación del cambio de estado |
| `fecha_registro`| DATETIME2 | NO | Timestamp del cambio |

### `Incidencias_Servicio` (Repuestos y Novedades)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `Servicios_Recepcion(id)` ON DELETE CASCADE |
| `tipo_incidencia`| NVARCHAR(50) | NO | 'Hallazgo Tecnico', 'Pieza Extra', 'Aviso al Cliente', 'Imprevisto' |
| `descripcion` | NVARCHAR(MAX) | NO | Detalle de la incidencia |
| `repuesto_requerido`| NVARCHAR(150) | SÍ | Nombre de la pieza a cambiar |
| `costo_adicional_repuesto`| DECIMAL(10,2) | NO | Costo extra (Default: 0.00) |
| `aprobado_por_cliente`| BIT | NO | 0 = Pendiente/Rechazado, 1 = Aprobado |
| `fecha_registro`| DATETIME2 | NO | Timestamp de registro |
| `activo` | BIT | NO | Estado lógico |

### `Evidencias_Fotograficas` (Galería Multimedia)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | INT IDENTITY(1,1) | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `Servicios_Recepcion(id)` ON DELETE CASCADE |
| `incidencia_id`| INT | SÍ | FK -> `Incidencias_Servicio(id)` |
| `url_foto` | NVARCHAR(255) | NO | URL de la imagen (Cloudinary o ruta local) |
| `tipo_evidencia`| NVARCHAR(50) | NO | 'Estado Inicial', 'Falla Detectada', 'Incidencia', 'Equipo Finalizado' |
| `descripcion` | NVARCHAR(150) | SÍ | Pie de foto explicativo |
| `fecha_subida` | DATETIME2 | NO | Timestamp de subida |
| `activo` | BIT | NO | Estado lógico |

---

## 2. Datos Semilla (Catálogos Iniciales)

### Roles del Sistema
1. `SuperAdmin`: Control total del sistema y todas las sucursales.
2. `Admin_Sucursal`: Control administrativo de una sucursal específica.
3. `Secretaria`: Recepción de equipos, apertura de tickets y entrega.
4. `Tecnico`: Diagnóstico, reparación, reporte de incidencias y carga de evidencias.

### Estados de Servicio
1. `RECIBIDO` | "Recibido en Taller" | `#6B7280` | Orden: 1
2. `EN_DIAGNOSTICO` | "En Diagnóstico" | `#3B82F6` | Orden: 2
3. `ESPERA_REPUESTO` | "En Espera de Repuesto" | `#F59E0B` | Orden: 3
4. `EN_REPARACION` | "En Proceso de Reparación" | `#8B5CF6` | Orden: 4
5. `CONTROL_CALIDAD` | "Control de Calidad / Pruebas" | `#EC4899` | Orden: 5
6. `LISTO_ENTREGA` | "Listo para Entrega" | `#10B981` | Orden: 6
7. `ENTREGADO` | "Entregado al Cliente" | `#059669` | Orden: 7
8. `CANCELADO_DEVUELTO` | "Cancelado / No Reparado" | `#EF4444` | Orden: 8
