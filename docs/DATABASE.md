# 🗄️ Diccionario y Estructura de Base de Datos - SIGER-FMC

- **Motor:** PostgreSQL 18.x
- **Base de Datos:** `siger_fmc_db`
- **Codificación / Juego de caracteres:** `UTF-8`
- **Estrategia de eliminación:** Borrado lógico (`activo = TRUE / FALSE`) en entidades operativas principales.

---

## 1. Tablas y Estructura

### `datos_companhia` (Empresa Matriz)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `nombre_empresa` | VARCHAR(100) | NO | Nombre legal y comercial de la empresa |
| `rnc` | VARCHAR(20) | NO | Registro Nacional de Contribuyente |
| `telefono_principal`| VARCHAR(20) | NO | Teléfono de contacto oficial |
| `correo_contacto` | VARCHAR(100) | NO | Correo oficial de contacto |
| `direccion_fiscal` | TEXT | NO | Dirección fiscal de la matriz |
| `logo_url` | VARCHAR(255) | SÍ | URL del logotipo de la empresa |
| `created_at` | TIMESTAMPTZ | SÍ | Fecha de creación (CURRENT_TIMESTAMP) |
| `updated_at` | TIMESTAMPTZ | SÍ | Fecha de modificación (CURRENT_TIMESTAMP) |

### `datos_sucursales` (Sedes Físicas)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `companhia_id` | INT | NO | FK -> `datos_companhia(id)` ON UPDATE CASCADE ON DELETE RESTRICT |
| `codigo_sucursal`| VARCHAR(10) | NO | Código único identificador (ej. 'SUC-01', 'SUC-02') |
| `nombre_sucursal`| VARCHAR(100) | NO | Nombre descriptivo de la sucursal |
| `telefono` | VARCHAR(20) | NO | Teléfono directo de la sucursal |
| `direccion` | TEXT | NO | Ubicación física |
| `created_at` | TIMESTAMPTZ | SÍ | Timestamp de creación |
| `updated_at` | TIMESTAMPTZ | SÍ | Timestamp de actualización |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

### `roles_equipo` (Niveles de Permisos)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `nombre_rol` | VARCHAR(50) | NO | Nombre único ('SuperAdmin', 'Admin_Sucursal', 'Secretaria', 'Tecnico') |
| `descripcion` | VARCHAR(255) | SÍ | Alcance y permisos del rol |
| `created_at` | TIMESTAMPTZ | SÍ | Timestamp de creación |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

### `datos_trabajadores` (Usuarios del Sistema)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `sucursal_id` | INT | SÍ | FK -> `datos_sucursales(id)` ON UPDATE CASCADE ON DELETE SET NULL (NULL = SuperAdmin / Acceso Global) |
| `rol_id` | INT | NO | FK -> `roles_equipo(id)` ON UPDATE CASCADE ON DELETE RESTRICT |
| `usuario` | VARCHAR(50) | NO | Nombre de usuario para autenticación (Único, min. 6 caracteres, sin espacios) |
| `nombre` | VARCHAR(50) | NO | Nombre de pila (min. 2 caracteres) |
| `apellido` | VARCHAR(50) | NO | Apellidos (min. 2 caracteres) |
| `cedula` | VARCHAR(20) | NO | Cédula de identidad (solo dígitos numéricos, min. 11) |
| `telefono` | VARCHAR(20) | NO | Teléfono móvil / WhatsApp (solo dígitos numéricos, min. 10) |
| `correo` | VARCHAR(100) | NO | Correo electrónico institucional / login (Único, sin espacios) |
| `password` | TEXT | NO | Contraseña con hash Bcrypt (min. 8 caracteres, sin espacios) |
| `foto_perfil_url` | VARCHAR(255) | SÍ | URL del avatar / foto de perfil |
| `ultimo_login` | TIMESTAMPTZ | SÍ | Último acceso al sistema |
| `created_at` | TIMESTAMPTZ | SÍ | Timestamp de creación |
| `updated_at` | TIMESTAMPTZ | SÍ | Timestamp de actualización |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

### `categorias_dispositivos` (Catálogo de Equipos)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `nombre_categoria`| VARCHAR(50) | NO | Único ('Smartphone', 'Laptop', 'Tablet / iPad', etc.) |
| `descripcion` | VARCHAR(150) | SÍ | Detalle de la categoría |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

### `estados_servicio` (Catálogo de Estados)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `codigo_estado` | VARCHAR(30) | NO | Código único en mayúsculas (ej. 'RECIBIDO', 'EN_DIAGNOSTICO') |
| `nombre_estado` | VARCHAR(50) | NO | Etiqueta visible ('Recibido en Taller', etc.) |
| `color_badge` | VARCHAR(20) | NO | Color hexadecimal (ej. '#6B7280', '#3B82F6') |
| `orden_flujo` | INT | NO | Secuencia en la línea de tiempo (1 al 8) |

### `clientes` (Cartera de Clientes Frecuentes)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `nombre` | VARCHAR(100) | NO | Nombres del cliente |
| `apellido` | VARCHAR(100) | NO | Apellidos del cliente |
| `cedula_rnc` | VARCHAR(20) | NO | Cédula o RNC del cliente (Único) |
| `telefono` | VARCHAR(20) | NO | Teléfono de contacto |
| `telefono_adicional`| VARCHAR(20) | SÍ | Teléfono secundario |
| `correo` | VARCHAR(100) | SÍ | Correo electrónico del cliente |
| `direccion` | TEXT | SÍ | Dirección del cliente |
| `created_at` | TIMESTAMPTZ | SÍ | Timestamp de creación |
| `updated_at` | TIMESTAMPTZ | SÍ | Timestamp de actualización |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

### `servicios_recepcion` (Tickets de Reparación / Órdenes de Servicio)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `codigo_ticket` | VARCHAR(20) | NO | Código único del ticket (Único) |
| `sucursal_id` | INT | NO | FK -> `datos_sucursales(id)` ON DELETE RESTRICT |
| `categoria_id` | INT | NO | FK -> `categorias_dispositivos(id)` ON DELETE RESTRICT |
| `cliente_id` | INT | SÍ | FK -> `clientes(id)` ON UPDATE CASCADE ON DELETE SET NULL |
| `nombre_cliente` | VARCHAR(100) | SÍ | Nombre de cliente (Obligatorio si `cliente_id` es NULL) |
| `telefono_cliente`| VARCHAR(20) | SÍ | Teléfono de contacto directo |
| `cedula_cliente` | VARCHAR(20) | SÍ | Documento del cliente |
| `correo_cliente` | VARCHAR(100) | SÍ | Correo del cliente |
| `usuario_recepcion_id`| INT | NO | FK -> `datos_trabajadores(id)` ON DELETE RESTRICT |
| `estado_actual_id`| INT | NO | FK -> `estados_servicio(id)` ON DELETE RESTRICT |
| `prioridad` | VARCHAR(20) | NO | 'baja', 'media', 'alta', 'urgente' (Default: 'media') |
| `marca_equipo` | VARCHAR(50) | NO | Marca (Apple, Samsung, Xiaomi, HP, etc.) |
| `modelo_equipo` | VARCHAR(50) | NO | Modelo (iPhone 13, Galaxy S23, etc.) |
| `num_serie_imei` | VARCHAR(50) | SÍ | Número de serie o IMEI |
| `datos_acceso_equipo`| TEXT | SÍ | PIN, patrón o clave de desbloqueo |
| `falla_reportada`| TEXT | NO | Problema descrito al ingresar el equipo |
| `observaciones_recepcion`| TEXT | SÍ | Detalles estéticos y condición inicial |
| `checklist_entrada`| TEXT | SÍ | Inspección inicial en formato JSON |
| `costo_previsto` | NUMERIC(10,2)| NO | Presupuesto inicial (Default: 0.00) |
| `monto_anticipo` | NUMERIC(10,2)| NO | Abono o pago inicial dejado por el cliente (Default: 0.00) |
| `monto_descuento`| NUMERIC(10,2)| NO | Descuento aplicado (Default: 0.00) |
| `costo_final_confirmado`| NUMERIC(10,2)| NO | Monto final a facturar (Default: 0.00) |
| `tiempo_garantia`| VARCHAR(50) | SÍ | Periodo de garantía (Default: '30 días') |
| `condiciones_garantia`| TEXT | SÍ | Términos y exclusiones de garantía |
| `fecha_entrega_estimada`| DATE | SÍ | Fecha estimada de entrega |
| `fecha_entrega_real`| TIMESTAMPTZ | SÍ | Fecha y hora en que se entregó el equipo |
| `created_at` | TIMESTAMPTZ | SÍ | Timestamp de creación |
| `updated_at` | TIMESTAMPTZ | SÍ | Timestamp de actualización |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

> **Restricciones Check (`servicios_recepcion`):**
> - `chk_identificacion_cliente`: `(cliente_id IS NOT NULL) OR (nombre_cliente IS NOT NULL)`
> - `chk_prioridad`: `prioridad IN ('baja', 'media', 'alta', 'urgente')`

### `tecnicos_asignados` (Asignación Técnica)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `servicios_recepcion(id)` ON DELETE CASCADE |
| `tecnico_id` | INT | NO | FK -> `datos_trabajadores(id)` ON DELETE RESTRICT |
| `fecha_asignacion`| TIMESTAMPTZ | SÍ | Timestamp de asignación (CURRENT_TIMESTAMP) |

### `historial_estados` (Auditoría / Línea de Tiempo)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `servicios_recepcion(id)` ON DELETE CASCADE |
| `estado_id` | INT | NO | FK -> `estados_servicio(id)` ON DELETE RESTRICT |
| `usuario_id` | INT | NO | FK -> `datos_trabajadores(id)` ON DELETE RESTRICT |
| `nota_cambio` | TEXT | SÍ | Observación del cambio de estado |
| `fecha_registro`| TIMESTAMPTZ | SÍ | Timestamp del cambio (CURRENT_TIMESTAMP) |

### `incidencias_servicio` (Novedades y Repuestos)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `servicios_recepcion(id)` ON DELETE CASCADE |
| `usuario_id` | INT | NO | FK -> `datos_trabajadores(id)` ON UPDATE CASCADE ON DELETE RESTRICT |
| `tipo_incidencia`| VARCHAR(50) | NO | 'Imprevisto', 'Aviso al Cliente', 'Pieza Extra', 'Hallazgo Tecnico' |
| `descripcion` | TEXT | NO | Detalle del problema o novedad |
| `repuesto_requerido`| VARCHAR(150)| SÍ | Repuesto o componente necesario |
| `costo_adicional_repuesto`| NUMERIC(10,2)| NO | Costo extra del repuesto (Default: 0.00) |
| `aprobado_por_cliente`| BOOLEAN | NO | Aprobación del cliente (Default: FALSE) |
| `fecha_aprobacion`| TIMESTAMPTZ | SÍ | Timestamp en que el cliente aprueba el costo extra |
| `metodo_aprobacion`| VARCHAR(30) | SÍ | Medio de confirmación ('Presencial', 'Llamada', 'WhatsApp', 'Correo', 'Otro') |
| `fecha_registro`| TIMESTAMPTZ | SÍ | Timestamp de registro (CURRENT_TIMESTAMP) |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

> **Restricciones Check (`incidencias_servicio`):**
> - `chk_tipo_incidencia`: `tipo_incidencia IN ('Imprevisto', 'Aviso al Cliente', 'Pieza Extra', 'Hallazgo Tecnico')`
> - `chk_metodo_aprobacion`: `metodo_aprobacion IS NULL OR metodo_aprobacion IN ('Presencial', 'Llamada', 'WhatsApp', 'Correo', 'Otro')`

### `evidencias_fotograficas` (Galería Multimedia)
| Campo | Tipo | Nulo | Descripción |
| :--- | :--- | :--- | :--- |
| `id` | SERIAL / INT | NO | Llave Primaria (PK) |
| `servicio_id` | INT | NO | FK -> `servicios_recepcion(id)` ON DELETE CASCADE |
| `incidencia_id`| INT | SÍ | FK -> `incidencias_servicio(id, servicio_id)` ON UPDATE CASCADE ON DELETE SET NULL |
| `usuario_id` | INT | NO | FK -> `datos_trabajadores(id)` ON UPDATE CASCADE ON DELETE RESTRICT |
| `url_foto` | TEXT | NO | URL de la imagen en almacenamiento Cloudinary |
| `public_id` | VARCHAR(150) | SÍ | ID único del archivo en Cloudinary para gestión y borrado |
| `tipo_evidencia`| VARCHAR(150) | NO | Clasificación ('Estado Inicial', 'Falla Detectada', 'Incidencia', 'Finalizado') |
| `descripcion` | VARCHAR(150) | SÍ | Descripción o nota visual |
| `fecha_subida` | TIMESTAMPTZ | SÍ | Timestamp de subida (CURRENT_TIMESTAMP) |
| `activo` | BOOLEAN | NO | Estado lógico (Default: TRUE) |

---

## 2. Índices Secundarios para Rendimiento

- `idx_servicios_sucursal` -> `servicios_recepcion(sucursal_id)`
- `idx_servicios_cliente` -> `servicios_recepcion(cliente_id)`
- `idx_servicios_estado` -> `servicios_recepcion(estado_actual_id)`
- `idx_servicios_prioridad` -> `servicios_recepcion(prioridad)`
- `idx_tecnicos_servicio` -> `tecnicos_asignados(servicio_id)`
- `idx_historial_servicio` -> `historial_estados(servicio_id)`
- `idx_incidencias_servicio` -> `incidencias_servicio(servicio_id)`
- `idx_incidencias_usuario` -> `incidencias_servicio(usuario_id)`
- `idx_evidencias_servicio` -> `evidencias_fotograficas(servicio_id)`
- `idx_evidencias_usuario` -> `evidencias_fotograficas(usuario_id)`

---

## 3. Datos Semilla (Catálogos Iniciales)

### Roles del Sistema (`roles_equipo`)
1. `SuperAdmin`: Control global de todas las sucursales, finanzas y configuración.
2. `Admin_Sucursal`: Gestión administrativa y operativa de una sucursal específica.
3. `Secretaria`: Recepción de equipos, creación de tickets y atención al cliente.
4. `Tecnico`: Diagnóstico, resolución técnica, subida de incidencias y evidencias.

### Estados de Servicio (`estados_servicio`)
1. `RECIBIDO` | "Recibido en Taller" | `#6B7280` | Orden: 1
2. `EN_DIAGNOSTICO` | "En Diagnóstico" | `#3B82F6` | Orden: 2
3. `ESPERA_REPUESTO` | "En Espera de Repuesto" | `#F59E0B` | Orden: 3
4. `EN_REPARACION` | "En Proceso de Reparación" | `#8B5CF6` | Orden: 4
5. `CONTROL_CALIDAD` | "Control de Calidad / Pruebas" | `#EC4899` | Orden: 5
6. `LISTO_ENTREGA` | "Listo para Entrega" | `#10B981` | Orden: 6
7. `ENTREGADO` | "Entregado al Cliente" | `#059669` | Orden: 7
8. `CANCELADO_DEVUELTO` | "Cancelado / No Reparado" | `#EF4444` | Orden: 8

### Categorías de Dispositivos (`categorias_dispositivos`)
1. `Smartphone` | Teléfonos inteligentes Android y iPhone
2. `Tablet / iPad` | Tabletas y iPads
3. `Laptop` | Computadoras portátiles y notebooks
4. `Consola de Videojuegos` | PlayStation, Xbox, Nintendo Switch y portátiles
5. `Smartwatch` | Relojes inteligentes y bandas deportivas
6. `Otros` | Accesorios y dispositivos electrónicos varios