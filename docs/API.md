# Documentación de API REST - SIGER-FMC

Especificación técnica de endpoints, parámetros, autenticación y contratos de respuesta de la API REST de **SIGER-FMC**.

---

## 1. Convenciones Generales

- **Base URL:** `http://localhost:5000/api` (o `/api` mediante proxy en desarrollo)
- **Formato de Peticiones y Respuestas:** `application/json` (UTF-8)
- **Autenticación:** JSON Web Token (JWT) vía cabecera HTTP:
  ```http
  Authorization: Bearer <token_jwt>
  ```

### Formato de Respuestas Estándar

#### Respuesta Exitosa (2xx)
```json
{
  "success": true,
  "message": "Operación realizada con éxito.",
  "data": { ... }
}
```

#### Respuesta de Error (4xx / 5xx)
```json
{
  "success": false,
  "message": "Descripción clara del error.",
  "error": "Detalle técnico opcional (solo en desarrollo)"
}
```

### Códigos de Estado HTTP Utilizados
- `200 OK`: Petición procesada exitosamente.
- `201 Created`: Recurso creado exitosamente.
- `400 Bad Request`: Parámetros inválidos o incompletos en el Body/Query.
- `401 Unauthorized`: Token ausente, expirado o credenciales inválidas.
- `403 Forbidden`: Acceso denegado por rol o por aislamiento de sucursal.
- `404 Not Found`: Recurso no encontrado.
- `409 Conflict`: Conflicto de unicidad (cédula, usuario, correo duplicado).
- `500 Internal Server Error`: Error no controlado en el servidor.

---

### 1.1 Matriz de Roles y Control de Acceso (RBAC)

La arquitectura de seguridad de SIGER-FMC implementa control de acceso basado en roles (RBAC) combinado con aislamiento de datos por sucursal (`requireBranchAccess`):

| Rol | Alcance de Datos (Sucursal) | Órdenes de Servicio (`/servicios`) | Personal (`/trabajadores`) | Configuración (`/configuracion`) | Clientes (`/clientes`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SuperAdmin`** | **Omnicanal Global** (ve todas las sedes) | Control total (Crear, Listar, Detalle, Modificar) | CRUD Total y gestión de avatares | Edición global de Empresa y Sucursales | CRUD Total |
| **`Admin_Sucursal`** | **Sede Asignada Fija** (`sucursal_id`) | Control total en su sucursal (Crear, Listar, Detalle) | CRUD de Técnicos/Secretarias de su sede | Edición exclusiva de su sucursal asignada | CRUD Total |
| **`Secretaria`** | **Sede Asignada Fija** (`sucursal_id`) | Control operativo (Crear órdenes, Listar, Detalle, Imprimir) | **Lectura** (`GET /`, `GET /:id`) de personal de su sede | **Lectura** (`GET`) de Empresa y Sucursales | CRUD de Clientes |
| **`Tecnico`** | **Sede Asignada Fija** (`sucursal_id`) | **SOLO LECTURA** (`GET /`, `GET /:id`). **Bloqueo 403** en creación | **Lectura** (`GET /`, `GET /:id`) de personal de su sede | Sin acceso (`403 Forbidden`) | Lectura (`GET`) |

#### Políticas Estrictas de Seguridad:
1. **`SuperAdmin`:** Acceso omnicanal y selección global de sucursales en filtros y creaciones.
2. **`Admin_Sucursal` y `Secretaria`:** Control total de recepción confinado a su `sucursal_id` fija. Permisos de lectura habilitados en `/configuracion/sucursales`, `/configuracion/companhia` y `/trabajadores` para alimentar selectores y plantillas de comprobantes de su sede.
3. **`Tecnico`:** Modo **SOLO LECTURA** en recepción de órdenes. Cualquier intento de `POST /api/servicios` es rechazado con `403 Forbidden` (*"Los técnicos no tienen permisos para crear órdenes de servicio"*). Confinado a su sucursal y lectura autorizada en `GET /api/trabajadores` para filtros operativos de asignación en taller.

---

## 2. Módulo de Autenticación (`/api/auth`)

### 2.1 Iniciar Sesión (Login)
- **Ruta:** `POST /api/auth/login`
- **Acceso:** Público
- **Body (JSON):**
  ```json
  {
    "usuario": "superadmin",
    "password": "admin123"
  }
  ```
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Inicio de sesión exitoso.",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "user": {
      "id": 1,
      "nombre": "Franyer",
      "apellido": "Administrador",
      "usuario": "superadmin",
      "correo": "admin@franyermobile.com",
      "rol_id": 1,
      "rol_nombre": "SuperAdmin",
      "sucursal_id": null,
      "sucursal_nombre": "Todas las Sucursales",
      "sucursal_codigo": "MATRIZ",
      "ultimo_login": "2026-08-25T18:45:00.000Z"
    }
  }
  ```
- **Reglas de Validación de Credenciales:**
  - `usuario`: Obligatorio (mínimo 6 caracteres, máximo 50 caracteres).
  - `password`: Obligatorio (mínimo 8 caracteres, máximo 20 caracteres).
- **Errores Posibles:** 
  - `400 Bad Request`: Formato o longitud de credenciales inválida.
  - `401 Unauthorized`: Credenciales incorrectas (usuario o contraseña no coinciden).
  - `403 Forbidden`: Cuenta de usuario desactivada.

---

### 2.2 Obtener Perfil de Sesión Activa
- **Ruta:** `GET /api/auth/me`
- **Acceso:** Privado (`Bearer Token`)
- **Headers:** `Authorization: Bearer <token>`
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "user": {
      "id": 1,
      "nombre": "Franyer",
      "apellido": "Administrador",
      "usuario": "superadmin",
      "correo": "admin@franyermobile.com",
      "cedula": "056-0000000-1",
      "telefono": "809-555-0199",
      "foto_perfil_url": null,
      "rol_id": 1,
      "rol_nombre": "SuperAdmin",
      "sucursal_id": null,
      "sucursal_nombre": "Todas las Sucursales",
      "sucursal_codigo": "MATRIZ",
      "ultimo_login": "2026-08-25T18:45:00.000Z"
    }
  }
  ```
- **Errores Posibles:** `401 Unauthorized`, `404 Not Found`.

---

### 2.3 Cerrar Sesión (Logout)
- **Ruta:** `POST /api/auth/logout`
- **Acceso:** Privado (`Bearer Token`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Sesión cerrada correctamente."
  }
  ```

---

## 3. Módulo de Trabajadores y Usuarios (`/api/trabajadores`)

### 3.1 Listar Trabajadores
- **Ruta:** `GET /api/trabajadores`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Aislamiento:** Filtrado automático por `requireBranchAccess` según `sucursal_id` del token (excepto `SuperAdmin` que tiene visión global).
- **Query Params (Opcionales):**
  - `sucursal_id` (solo `SuperAdmin`): Filtrar por ID de sucursal.
  - `activo` (`true`/`false`): Filtrar trabajadores activos.
  - `rol` (string): Filtrar por nombre de rol (ej. `tecnico`).
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Listado de trabajadores obtenido con éxito.",
    "data": [
      {
        "id": 1,
        "sucursal_id": 1,
        "rol_id": 1,
        "usuario": "superadmin",
        "nombre": "Franyer",
        "apellido": "Administrador",
        "cedula": "056-0000000-1",
        "telefono": "809-555-0199",
        "correo": "admin@franyermobile.com",
        "foto_perfil_url": null,
        "ultimo_login": "2026-08-25T18:45:00.000Z",
        "activo": true,
        "rol_nombre": "SuperAdmin",
        "sucursal_nombre": "Franyer Mobile Center - SFM",
        "sucursal_codigo": "MATRIZ"
      }
    ],
    "total": 1
  }
  ```

---

### 3.2 Obtener Detalle de un Trabajador
- **Ruta:** `GET /api/trabajadores/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "data": {
      "id": 1,
      "usuario": "superadmin",
      "nombre": "Franyer",
      "apellido": "Administrador",
      "cedula": "056-0000000-1",
      "telefono": "809-555-0199",
      "correo": "admin@franyermobile.com",
      "rol_nombre": "SuperAdmin",
      "sucursal_nombre": "Franyer Mobile Center - SFM"
    }
  }
  ```

---

### 3.3 Registrar Nuevo Trabajador / Usuario
- **Ruta:** `POST /api/trabajadores`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Reglas de Validación Estrictas:**
  - `nombre` y `apellido`: Obligatorios (string, min. 2, máx. 50 caracteres).
  - `usuario`: Obligatorio (string, min. 6, máx. 50 caracteres, sin espacios en blanco).
  - `cedula`: Obligatoria (solo dígitos numéricos, min. 11, máx. 20 dígitos).
  - `correo`: Obligatorio (formato email estándar válido, máx. 100 caracteres, sin espacios en blanco).
  - `telefono`: Obligatorio (solo dígitos numéricos, min. 10, máx. 20 dígitos).
  - `rol_id`: Obligatorio (ID válido y existente en `roles_equipo`).
  - `sucursal_id`: Obligatorio para roles de sede (`Admin_Sucursal`, `Secretaria`, `Tecnico`). Para `SuperAdmin` se permite `null` (acceso global).
  - `password`: Obligatoria (string, min. 8, máx. 20 caracteres, sin espacios en blanco).
  - `foto_perfil_url`: Opcional (URL válida o `null`).
- **Body (JSON):**
  ```json
  {
    "usuario": "tecnico.juan",
    "password": "PasswordSegura123",
    "nombre": "Juan",
    "apellido": "López",
    "cedula": "05612345678",
    "telefono": "8095558899",
    "correo": "juan.lopez@franyermobile.com",
    "rol_id": 4,
    "sucursal_id": 1,
    "foto_perfil_url": null
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "ok": true,
    "message": "Usuario registrado exitosamente.",
    "data": {
      "id": 5,
      "sucursal_id": 1,
      "rol_id": 4,
      "usuario": "tecnico.juan",
      "nombre": "Juan",
      "apellido": "López",
      "cedula": "05612345678",
      "telefono": "8095558899",
      "correo": "juan.lopez@franyermobile.com",
      "foto_perfil_url": null,
      "activo": true,
      "created_at": "2026-08-26T17:00:00.000Z"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: Formato o longitud inválida en campos (`"El nombre de usuario no puede contener espacios en blanco."`, `"La contraseña debe tener al menos 8 caracteres."`, etc.).
  - `403 Forbidden`: 
    - Intento de un `Admin_Sucursal` de asignar roles administrativos (`SuperAdmin` o `Admin_Sucursal`): *"No tienes permisos para asignar este rol. Un Administrador de Sucursal solo puede registrar Técnicos o Secretarias."*
  - `409 Conflict`: Conflicto por duplicidad en `usuario`, `correo` o `cedula`.

---

### 3.4 Actualizar Trabajador / Usuario
- **Ruta:** `PUT /api/trabajadores/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Reglas de Validación y RBAC:**
  - Aplica las mismas validaciones de formato, longitud mínima y bloqueo de espacios que en creación.
  - `password` es opcional; si se incluye con texto, debe tener mínimo 8 caracteres sin espacios.
  - **Aislamiento por Sede:** Un `Admin_Sucursal` solo puede modificar usuarios pertenecientes a su misma sucursal física.
  - **Restricción de Roles:** Un `Admin_Sucursal` no puede cambiar el rol de un usuario a `SuperAdmin` ni `Admin_Sucursal`.
- **Body (JSON):**
  ```json
  {
    "nombre": "Juan Carlos",
    "apellido": "López",
    "telefono": "8095558800",
    "correo": "jc.lopez@franyermobile.com",
    "password": "",
    "rol_id": 4,
    "sucursal_id": 1,
    "foto_perfil_url": "https://example.com/avatar.jpg"
  }
  ```
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Usuario actualizado exitosamente.",
    "data": {
      "id": 5,
      "sucursal_id": 1,
      "rol_id": 4,
      "usuario": "tecnico.juan",
      "nombre": "Juan Carlos",
      "apellido": "López",
      "cedula": "05612345678",
      "telefono": "8095558800",
      "correo": "jc.lopez@franyermobile.com",
      "foto_perfil_url": "https://example.com/avatar.jpg",
      "activo": true,
      "updated_at": "2026-08-26T17:15:00.000Z"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: Datos inválidos o parámetros incompletos.
  - `403 Forbidden`: 
    - Intento de un `Admin_Sucursal` de modificar un usuario de otra sucursal (*"No tiene permisos para modificar usuarios de otra sucursal."*).
    - Intento de escalar el rol a `SuperAdmin` o `Admin_Sucursal` (*"No tienes permisos para asignar este rol."*).
  - `404 Not Found`: Usuario no encontrado.
  - `409 Conflict`: Duplicidad en `usuario`, `correo` o `cedula` asignados a otro registro.

---

### 3.5 Alternar Estado (Activar / Desactivar)
- **Ruta:** `PATCH /api/trabajadores/:id/toggle-status`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Reglas RBAC:**
  - Un usuario no puede desactivar su propia cuenta de sesión activa (`400 Bad Request`).
  - Un `Admin_Sucursal` no puede alternar el estado de trabajadores de otra sucursal (`403 Forbidden`).
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "El trabajador Juan Carlos López ha sido desactivado exitosamente.",
    "data": {
      "id": 5,
      "usuario": "tecnico.juan",
      "activo": false
    }
  }
  ```

---

### 3.6 Subir Foto de Perfil (Cloudinary)
- **Ruta:** `POST /api/trabajadores/upload-avatar`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Formato:** `multipart/form-data` con el campo `foto_perfil` (archivo de imagen).
- **Formatos permitidos:** `image/jpeg`, `image/png`, `image/webp`.
- **Límite de tamaño:** 5 MB.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Foto de perfil subida exitosamente.",
    "foto_perfil_url": "https://res.cloudinary.com/cloudname/image/upload/v1234567890/siger-fmc/usuarios/abc123xyz.webp",
    "public_id": "siger-fmc/usuarios/abc123xyz"
  }
  ```
- **Errores:**
  - `400 Bad Request`: Archivo faltante, formato no permitido o peso mayor a 5MB.
  - `500 Internal Server Error`: Falla en la comunicación con el servicio de Cloudinary.

---

## 4. Módulo de Gestión de Clientes (`/api/clientes`)

### 4.1 Listar Clientes
- **Ruta:** `GET /api/clientes`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Query Params (Opcionales):**
  - `page` (INT, default: 1): Número de página.
  - `limit` (INT, default: 20): Cantidad de registros por página.
  - `search` (STRING): Término de búsqueda con `ILIKE` en `nombre`, `apellido`, `cedula_rnc`, `telefono`, `telefono_adicional` y `correo`.
  - `estado` (STRING, default: `'all'`): Filtrar por `'active'`, `'inactive'` o `'all'`.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "nombre": "Pedro",
        "apellido": "Almonte",
        "cedula_rnc": "05600123456",
        "telefono": "8095551122",
        "telefono_adicional": "8295553344",
        "correo": "pedro.almonte@ejemplo.com",
        "direccion": "Calle Principal #45, SFM",
        "activo": true,
        "created_at": "2026-09-01T12:00:00.000Z",
        "updated_at": "2026-09-01T12:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

---

### 4.2 Obtener Cliente por ID
- **Ruta:** `GET /api/clientes/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "nombre": "Pedro",
      "apellido": "Almonte",
      "cedula_rnc": "05600123456",
      "telefono": "8095551122",
      "telefono_adicional": "8295553344",
      "correo": "pedro.almonte@ejemplo.com",
      "direccion": "Calle Principal #45, SFM",
      "activo": true,
      "created_at": "2026-09-01T12:00:00.000Z",
      "updated_at": "2026-09-01T12:00:00.000Z"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: ID no válido.
  - `404 Not Found`: Cliente no encontrado.

---

### 4.3 Registrar Cliente
- **Ruta:** `POST /api/clientes`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`)
- **Campos Obligatorios:** `nombre`, `apellido`, `cedula_rnc`, `telefono`.
- **Validaciones:**
  - `nombre`: min 2, max 100 caracteres.
  - `apellido`: min 2, max 100 caracteres.
  - `cedula_rnc`: min 9, max 20 caracteres (único en la base de datos).
  - `telefono`: min 10, max 20 dígitos numéricos.
  - `correo`: max 100 caracteres con formato email válido.
  - `direccion`: max 500 caracteres.
- **Body (JSON):**
  ```json
  {
    "nombre": "Pedro",
    "apellido": "Almonte",
    "cedula_rnc": "05600123456",
    "telefono": "8095551122",
    "telefono_adicional": "8295553344",
    "correo": "pedro.almonte@ejemplo.com",
    "direccion": "Calle Principal #45, SFM"
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Cliente registrado exitosamente.",
    "data": {
      "id": 1,
      "nombre": "Pedro",
      "apellido": "Almonte",
      "cedula_rnc": "05600123456",
      "telefono": "8095551122",
      "telefono_adicional": "8295553344",
      "correo": "pedro.almonte@ejemplo.com",
      "direccion": "Calle Principal #45, SFM",
      "activo": true,
      "created_at": "2026-09-01T12:00:00.000Z",
      "updated_at": "2026-09-01T12:00:00.000Z"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: Validación de longitud o campos obligatorios no superada.
  - `403 Forbidden`: Intento de creación por parte de un usuario con rol `Tecnico`.
  - `409 Conflict`: Ya existe un cliente con la misma `cedula_rnc`.

---

### 4.4 Actualizar Cliente
- **Ruta:** `PUT /api/clientes/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`)
- **Body (JSON):**
  ```json
  {
    "nombre": "Pedro Manuel",
    "apellido": "Almonte Díaz",
    "cedula_rnc": "05600123456",
    "telefono": "8095551199",
    "telefono_adicional": null,
    "correo": "p.almonte@ejemplo.com",
    "direccion": "Av. Libertad #12, SFM"
  }
  ```
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Cliente actualizado exitosamente.",
    "data": {
      "id": 1,
      "nombre": "Pedro Manuel",
      "apellido": "Almonte Díaz",
      "cedula_rnc": "05600123456",
      "telefono": "8095551199",
      "telefono_adicional": null,
      "correo": "p.almonte@ejemplo.com",
      "direccion": "Av. Libertad #12, SFM",
      "activo": true,
      "created_at": "2026-09-01T12:00:00.000Z",
      "updated_at": "2026-09-01T12:30:00.000Z"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: Formato de datos inválido.
  - `403 Forbidden`: Intento de edición por parte de un usuario con rol `Tecnico`.
  - `404 Not Found`: Cliente no existe.
  - `409 Conflict`: La cédula o RNC ya está registrada para otro cliente.

---

### 4.5 Alternar Estado (Activar / Desactivar)
- **Ruta:** `PATCH /api/clientes/:id/toggle-status`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "El cliente \"Pedro Almonte\" ha sido desactivado del sistema.",
    "data": {
      "id": 1,
      "nombre": "Pedro",
      "apellido": "Almonte",
      "cedula_rnc": "05600123456",
      "activo": false,
      "updated_at": "2026-09-01T12:35:00.000Z"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: ID inválido.
  - `403 Forbidden`: Intento de alternar estado por parte de roles no administrativos (`Secretaria` o `Tecnico`).
  - `404 Not Found`: Cliente no encontrado.

---

## 5. Módulo de Servicios y Tickets (`/api/servicios`)

Control integral de recepción de equipos, apertura de órdenes de trabajo, seguimiento técnico, comprobantes térmicos y stickers adhesivos de taller.

### 5.1 Listar Órdenes de Servicio
- **Ruta:** `GET /api/servicios`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Aislamiento por Sede:**
  - Si el usuario no es `SuperAdmin`, la consulta fuerza automáticamente:
    `WHERE sr.sucursal_id = req.user.sucursal_id`
  - Si es `SuperAdmin`, puede consultar globalmente o filtrar por una sede específica (`?sucursal_id=X`).
- **Query Params (Opcionales):**
  - `page` (INT, default: 1): Número de página.
  - `limit` (INT, default: 20): Registros por página.
  - `sucursal_id` (INT | 'all'): Filtro por sucursal (solo `SuperAdmin`).
  - `estado_id` (INT | 'all'): Filtro por estado del flujo.
  - `prioridad` (STRING | 'all'): `'baja'`, `'media'`, `'alta'`, `'urgente'`.
  - `tecnico_id` (INT | 'all'): Filtra servicios donde el técnico participe en `tecnicos_asignados`.
  - `q` o `busqueda` (STRING): Búsqueda por `codigo_ticket`, nombre de cliente, modelo, marca, IMEI o teléfono.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "data": [
      {
        "id": 1,
        "codigo_ticket": "FMC-2026-0001",
        "prioridad": "media",
        "marca_equipo": "Samsung",
        "modelo_equipo": "Galaxy S23 Ultra",
        "num_serie_imei": "358921000123456",
        "datos_acceso_equipo": {
          "tipo": "patron",
          "metodo": "patron",
          "patron": [6, 3, 0, 4, 2, 5, 8],
          "valor": "7-4-1-5-3-6-9"
        },
        "falla_reportada": "Pantalla estrellada y no responde al tacto",
        "observaciones_recepcion": "Bordes con desgaste cosmético leve",
        "observaciones": "Bordes con desgaste cosmético leve",
        "checklist_entrada": { "enciende": true, "pantalla_tactil": false, "camaras": true },
        "checklist_recepcion": { "enciende": true, "pantalla_tactil": false, "camaras": true },
        "costo_previsto": "5500.00",
        "monto_anticipo": "2000.00",
        "monto_descuento": "0.00",
        "costo_final_confirmado": "0.00",
        "es_garantia": false,
        "nombre_cliente": "Carlos Mendoza",
        "cliente_nombre": "Carlos Mendoza",
        "telefono_cliente": "829-555-0149",
        "cliente_telefono": "829-555-0149",
        "fecha_entrega_estimada": "2026-09-12",
        "tiempo_garantia": 30,
        "condiciones_garantia": "Garantía cubre exclusivamente defectos en la pantalla instalada.",
        "created_at": "2026-09-09T16:00:00.000Z",
        "updated_at": "2026-09-09T16:00:00.000Z",
        "estado": "Recibido en Taller",
        "estado_color": "#6B7280",
        "categoria": "Smartphone",
        "sucursal": "Franyer Mobile Center - Castillo",
        "recepcionista": "secre secre",
        "tecnico_nombre": "ronall franco",
        "tecnicos": [
          { "id": 5, "nombre_completo": "ronall franco" }
        ]
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
  ```

---

### 5.2 Obtener Detalle Completo de una Orden por ID
- **Ruta:** `GET /api/servicios/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Aislamiento:** Un usuario de sucursal solo puede consultar órdenes de su misma sede (`AND sr.sucursal_id = req.user.sucursal_id`).
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "data": {
      "id": 1,
      "codigo_ticket": "FMC-2026-0001",
      "sucursal_id": 2,
      "categoria_id": 1,
      "cliente_id": 3,
      "servicio_origen_id": null,
      "es_garantia": false,
      "nombre_cliente": "Carlos Mendoza",
      "cliente_nombre": "Carlos Mendoza",
      "telefono_cliente": "829-555-0149",
      "cliente_telefono": "829-555-0149",
      "cedula_cliente": "056-0012345-6",
      "correo_cliente": "carlos.mendoza@email.com",
      "usuario_recepcion_id": 6,
      "estado_actual_id": 1,
      "prioridad": "media",
      "marca_equipo": "Samsung",
      "modelo_equipo": "Galaxy S23 Ultra",
      "num_serie_imei": "358921000123456",
      "datos_acceso_equipo": {
        "tipo": "patron",
        "metodo": "patron",
        "patron": [6, 3, 0, 4, 2, 5, 8],
        "valor": "7-4-1-5-3-6-9"
      },
      "falla_reportada": "Pantalla estrellada y no responde al tacto",
      "observaciones_recepcion": "Bordes con desgaste cosmético leve",
      "observaciones": "Bordes con desgaste cosmético leve",
      "checklist_entrada": { "enciende": true, "pantalla_tactil": false },
      "checklist_recepcion": { "enciende": true, "pantalla_tactil": false },
      "costo_previsto": "5500.00",
      "monto_anticipo": "2000.00",
      "monto_descuento": "0.00",
      "costo_final_confirmado": "0.00",
      "tiempo_garantia": 30,
      "condiciones_garantia": "Garantía estándar de 30 días.",
      "fecha_entrega_estimada": "2026-09-12",
      "fecha_entrega_real": null,
      "created_at": "2026-09-09T16:00:00.000Z",
      "updated_at": "2026-09-09T16:00:00.000Z",
      "activo": true,
      "estado": "Recibido en Taller",
      "estado_color": "#6B7280",
      "categoria": "Smartphone",
      "sucursal": "Franyer Mobile Center - Castillo",
      "recepcionista": "secre secre",
      "nombre_cliente_reg": "Carlos Mendoza",
      "telefono_cliente_reg": "829-555-0149",
      "tecnico_nombre": "ronall franco",
      "tecnicos": [
        { "id": 5, "nombre_completo": "ronall franco" }
      ]
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: ID inválido.
  - `404 Not Found`: Orden no encontrada o no pertenece a la sucursal del usuario.

---

### 5.3 Crear Nueva Orden de Servicio (Apertura de Ticket)
- **Ruta:** `POST /api/servicios`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`). **Bloqueado para `Tecnico` con `403 Forbidden`**.
- **Reglas RBAC y Blindaje de Sucursal:**
  - Si el usuario logueado tiene rol `Tecnico`, se rechaza inmediatamente:
    `{ "ok": false, "message": "Los técnicos no tienen permisos para crear órdenes de servicio." }`
  - Si el usuario no es `SuperAdmin`, se fuerza estrictamente:
    `sucursal_id = req.user.sucursal_id`
    `usuario_recepcion_id = req.user.id` (sin admitir sobreescritura desde el body).
  - El código de ticket generado es único e inmutable en formato estándar `FMC-YYYY-XXXX`.
- **Body (JSON):**
  ```json
  {
    "cliente_id": 3,
    "nombre_cliente": "Carlos Mendoza",
    "telefono_cliente": "829-555-0149",
    "cedula_cliente": "056-0012345-6",
    "correo_cliente": "carlos.mendoza@email.com",
    "categoria_id": 1,
    "prioridad": "media",
    "marca_equipo": "Samsung",
    "modelo_equipo": "Galaxy S23 Ultra",
    "num_serie_imei": "358921000123456",
    "datos_acceso_equipo": {
      "tipo": "patron",
      "metodo": "patron",
      "patron": [6, 3, 0, 4, 2, 5, 8],
      "valor": "7-4-1-5-3-6-9"
    },
    "falla_reportada": "Pantalla estrellada y no responde al tacto",
    "observaciones_recepcion": "Bordes con desgaste cosmético leve",
    "checklist_entrada": {
      "enciende": true,
      "pantalla_tactil": false,
      "camara_trasera": true,
      "camara_frontal": true,
      "puerto_carga": true,
      "wifi_bluetooth": true
    },
    "costo_previsto": 5500.00,
    "monto_anticipo": 2000.00,
    "monto_descuento": 0.00,
    "tiempo_garantia": 30,
    "condiciones_garantia": "Garantía estándar de 30 días.",
    "fecha_entrega_estimada": "2026-09-12",
    "es_garantia": false,
    "servicio_origen_id": null,
    "fotos_recepcion": [],
    "tecnicos_ids": [5]
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "ok": true,
    "message": "Orden de servicio creada exitosamente.",
    "data": {
      "id": 1,
      "codigo_ticket": "FMC-2026-0001",
      "sucursal_id": 2,
      "categoria_id": 1,
      "cliente_id": 3,
      "nombre_cliente": "Carlos Mendoza",
      "telefono_cliente": "829-555-0149",
      "marca_equipo": "Samsung",
      "modelo_equipo": "Galaxy S23 Ultra",
      "falla_reportada": "Pantalla estrellada y no responde al tacto",
      "costo_previsto": "5500.00",
      "monto_anticipo": "2000.00",
      "costo_final_confirmado": "0.00",
      "estado_actual_id": 1,
      "created_at": "2026-09-09T16:00:00.000Z"
    }
  }
  ```
- **Errores:**
  - `400 Bad Request`: Falta de campos obligatorios (`categoria_id`, `falla_reportada`, `marca_equipo`, etc.).
  - `403 Forbidden`: Usuario con rol `Tecnico` o usuario sin sucursal asignada.

---

### 5.4 Consultar por Código de Ticket
- **Ruta:** `GET /api/servicios/ticket/:codigo`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Parámetros:** `codigo` (ej. `FMC-2026-0001`).
- **Respuesta Exitosa (`200 OK`):** Devuelve la orden con sus datos descriptivos y estado.

---

### 5.5 Validar Vigencia de Garantía
- **Ruta:** `GET /api/servicios/validar-garantia/:codigoTicket`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Descripción:** Comprueba si un ticket previo existe, si fue entregado y calcula si la fecha actual está dentro del periodo cubierto por `tiempo_garantia`.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "data": {
      "servicio_id": 1,
      "codigo_ticket": "FMC-2026-0001",
      "en_garantia": true,
      "dias_restantes": 18,
      "fecha_entrega": "2026-08-28T18:00:00.000Z",
      "tiempo_garantia_dias": 30
    }
  }
  ```

---

### 5.6 Subir Fotografías de Recepción
- **Ruta:** `POST /api/servicios/upload-foto`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Headers:** `multipart/form-data` con campo `fotos` (hasta 5 imágenes).
- **Procesamiento:** Streaming a Cloudinary en carpeta `siger-fmc/evidencias-tickets` en formato optimizado WebP.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "2 foto(s) subida(s) exitosamente.",
    "data": [
      {
        "url": "https://res.cloudinary.com/.../siger-fmc/evidencias-tickets/foto1.webp",
        "public_id": "siger-fmc/evidencias-tickets/foto1"
      }
    ]
  }
  ```

### 4.1 Registrar Incidencia / Repuesto Adicional
- **Ruta:** `POST /api/incidencias`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Tecnico`)
- **Body (JSON):**
  ```json
  {
    "servicio_id": 1,
    "tipo_incidencia": "Pieza Extra",
    "descripcion": "Flex de carga sulfatado no detecta cargador rápido.",
    "repuesto_requerido": "Flex Pin de Carga iPhone 13 Original",
    "costo_adicional_repuesto": 1200.00
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Incidencia registrada exitosamente.",
    "data": {
      "id": 1,
      "aprobado_por_cliente": false
    }
  }
  ```

---

### 4.2 Aprobar o Rechazar Incidencia
- **Ruta:** `PATCH /api/incidencias/:id/aprobacion`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`)
- **Body (JSON):**
  ```json
  {
    "aprobado_por_cliente": true
  }
  ```

---

### 4.3 Subir Evidencia Fotográfica
- **Ruta:** `POST /api/evidencias`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Tecnico`)
- **Body (JSON / Multipart):**
  ```json
  {
    "servicio_id": 1,
    "incidencia_id": null,
    "url_foto": "https://res.cloudinary.com/fmc/image/upload/v1234/evidencia_1.jpg",
    "tipo_evidencia": "Estado Inicial",
    "descripcion": "Golpe en esquina inferior derecha al recibir."
  }
  ```

---

## 5. Módulo de Catálogos del Sistema (`/api/catalogos`)

### Endpoints Disponibles

| Método | Ruta | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/catalogos/categorias` | Autenticado | Lista categorías de equipos activas (`categorias_dispositivos`). |
| `GET` | `/api/catalogos/estados` | Autenticado | Lista los 8 estados de servicio ordenados (`estados_servicio`). |
| `GET` | `/api/catalogos/sucursales` | Autenticado | Lista sedes físicas activas (`datos_sucursales`). |
| `GET` | `/api/catalogos/roles` | `SuperAdmin` | Lista roles del sistema (`roles_equipo`). |
| `GET` | `/api/catalogos/tecnicos` | Autenticado | Lista técnicos disponibles por sucursal (`datos_trabajadores`). |

---

## 6. Módulo de Gestión de Trabajadores / Usuarios (`/api/trabajadores`)

Gestión integral de los usuarios y empleados del sistema con control de acceso por roles (RBAC) y soporte de fotos de perfil optimizadas en Cloudinary.

### 6.1 Subir Foto de Perfil / Avatar
- **Ruta:** `POST /api/trabajadores/upload-avatar`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Data:**
  - `foto_perfil`: Archivo binario de imagen (`image/jpeg`, `image/png`, `image/webp`, máx. 5MB).
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Foto de perfil subida exitosamente.",
    "foto_perfil_url": "https://res.cloudinary.com/cloud_name/image/upload/v1234567890/siger-fmc/personal-fmc/abc123xyz.webp",
    "public_id": "siger-fmc/personal-fmc/abc123xyz",
    "foto_perfil_public_id": "siger-fmc/personal-fmc/abc123xyz"
  }
  ```

---

### 6.2 Obtener Listado de Trabajadores
- **Ruta:** `GET /api/trabajadores`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Aislamiento:** Restringido por `requireBranchAccess` a la sucursal del usuario logueado (los técnicos y secretarias reciben los trabajadores de su propia sede para los filtros operativos).
- **Query Params:**
  - `sucursal_id` (opcional, solo `SuperAdmin`): Filtrar por ID de sucursal.
  - `activo` (opcional, boolean): Filtrar por estado activo.
  - `rol` (opcional, string): Filtrar por nombre de rol.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Listado de trabajadores obtenido con éxito.",
    "data": [
      {
        "id": 1,
        "sucursal_id": 1,
        "rol_id": 4,
        "usuario": "tecnico_juan",
        "nombre": "Juan",
        "apellido": "Pérez",
        "cedula": "40200000001",
        "telefono": "8095550101",
        "correo": "juan.perez@franyermobile.com",
        "foto_perfil_url": "https://res.cloudinary.com/.../abc123xyz.webp",
        "foto_perfil_public_id": "siger-fmc/personal-fmc/abc123xyz",
        "ultimo_login": "2026-08-30T10:00:00.000Z",
        "created_at": "2026-08-20T12:00:00.000Z",
        "updated_at": "2026-09-02T13:00:00.000Z",
        "activo": true,
        "rol_nombre": "Tecnico",
        "sucursal_nombre": "Sucursal Principal",
        "sucursal_codigo": "SUC-01"
      }
    ],
    "total": 1
  }
  ```

---

### 6.3 Obtener Detalle de un Trabajador
- **Ruta:** `GET /api/trabajadores/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "data": {
      "id": 1,
      "sucursal_id": 1,
      "rol_id": 4,
      "usuario": "tecnico_juan",
      "nombre": "Juan",
      "apellido": "Pérez",
      "cedula": "40200000001",
      "telefono": "8095550101",
      "correo": "juan.perez@franyermobile.com",
      "foto_perfil_url": "https://res.cloudinary.com/.../abc123xyz.webp",
      "foto_perfil_public_id": "siger-fmc/personal-fmc/abc123xyz",
      "activo": true,
      "rol_nombre": "Tecnico",
      "sucursal_nombre": "Sucursal Principal",
      "sucursal_codigo": "SUC-01"
    }
  }
  ```

---

### 6.4 Registrar un Nuevo Trabajador
- **Ruta:** `POST /api/trabajadores`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Body (JSON):**
  ```json
  {
    "nombre": "Carlos",
    "apellido": "López",
    "usuario": "clopez",
    "cedula": "40212345678",
    "telefono": "8095550102",
    "correo": "carlos.lopez@franyermobile.com",
    "rol_id": 4,
    "sucursal_id": 1,
    "password": "Password123",
    "foto_perfil_url": "https://res.cloudinary.com/.../abc123xyz.webp",
    "foto_perfil_public_id": "siger-fmc/personal-fmc/abc123xyz"
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "ok": true,
    "message": "Usuario registrado exitosamente.",
    "data": {
      "id": 2,
      "usuario": "clopez",
      "nombre": "Carlos",
      "apellido": "López",
      "foto_perfil_url": "https://res.cloudinary.com/.../abc123xyz.webp",
      "foto_perfil_public_id": "siger-fmc/personal-fmc/abc123xyz",
      "activo": true
    }
  }
  ```

---

### 6.5 Actualizar Trabajador
- **Ruta:** `PUT /api/trabajadores/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Body (JSON):**
  ```json
  {
    "nombre": "Carlos",
    "apellido": "López",
    "usuario": "clopez",
    "cedula": "40212345678",
    "telefono": "8095550102",
    "correo": "carlos.lopez@franyermobile.com",
    "rol_id": 4,
    "sucursal_id": 1,
    "password": "",
    "foto_perfil_url": "https://res.cloudinary.com/.../nuevo_avatar.webp",
    "foto_perfil_public_id": "siger-fmc/personal-fmc/nuevo_avatar"
  }
  ```
- **Comportamiento Multimedia en Actualización:**
  - Si se proporciona un nuevo avatar o se establece `foto_perfil_url: null` (eliminación voluntaria), el backend elimina automáticamente la imagen anterior de Cloudinary utilizando `foto_perfil_public_id` con `cloudinary.uploader.destroy()`.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Usuario actualizado exitosamente.",
    "data": {
      "id": 2,
      "usuario": "clopez",
      "foto_perfil_url": "https://res.cloudinary.com/.../nuevo_avatar.webp",
      "foto_perfil_public_id": "siger-fmc/personal-fmc/nuevo_avatar",
      "activo": true,
      "updated_at": "2026-09-02T13:15:00.000Z"
    }
  }
  ```

---

### 6.6 Alternar Estado Activo / Inactivo (Borrado Lógico)
- **Ruta:** `PATCH /api/trabajadores/:id/toggle-status`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "El trabajador Carlos López ha sido desactivado exitosamente.",
    "data": {
      "id": 2,
      "usuario": "clopez",
      "nombre": "Carlos",
      "apellido": "López",
      "activo": false,
      "updated_at": "2026-09-02T13:20:00.000Z"
    }
  }
  ```

---

## 7. Módulo de Configuración del Sistema (`/api/configuracion`)

Módulo administrativo para la parametrización de la empresa matriz y la gestión informativa de sucursales físicas.

- **Acceso:** Exclusivo para roles `SuperAdmin` y `Admin_Sucursal` (bloqueado para `Secretaria` y `Tecnico`).
- **Aislamiento de Sucursal:** Los administradores de sucursal (`Admin_Sucursal`) solo tienen permisos para modificar la información de su propia sucursal asignada.

---

### 7.1 Perfil de Empresa Matriz (`/api/configuracion/companhia`)

#### 7.1.1 Obtener Perfil de la Empresa
- **Ruta:** `GET /api/configuracion/companhia`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Perfil de la empresa obtenido con éxito.",
    "data": {
      "id": 1,
      "nombre_empresa": "Franyer Mobile Center, S.R.L.",
      "rnc": "133-18964-1",
      "telefono_principal": "8493421998",
      "correo_contacto": "franyermobilecenter@gmail.com",
      "direccion_fiscal": "ADM LOCAL SAN FCO MACORIS",
      "logo_url": "https://res.cloudinary.com/cloud_name/image/upload/v1234/siger-fmc/companhia/logo_empresa.webp",
      "logo_public_id": "siger-fmc/companhia/logo_empresa",
      "created_at": "2026-08-25T21:37:51.988Z",
      "updated_at": "2026-09-02T14:00:00.000Z"
    }
  }
  ```

#### 7.1.2 Subir Logotipo de la Empresa
- **Ruta:** `POST /api/configuracion/companhia/upload-logo`
- **Acceso:** Privado (`SuperAdmin`)
- **Headers:** `Authorization: Bearer <token>`, `Content-Type: multipart/form-data`
- **Form Data:**
  - `logo`: Archivo binario de imagen (JPG, PNG, WEBP, máx. 5MB).
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Logotipo subido exitosamente.",
    "logo_url": "https://res.cloudinary.com/cloud_name/image/upload/v1234567890/siger-fmc/companhia/abc123xyz.webp",
    "logo_public_id": "siger-fmc/companhia/abc123xyz"
  }
  ```

#### 7.1.3 Actualizar Datos de la Empresa
- **Ruta:** `PUT /api/configuracion/companhia`
- **Acceso:** Privado (`SuperAdmin`)
- **Body (JSON):**
  ```json
  {
    "nombre_empresa": "Franyer Mobile Center, S.R.L.",
    "rnc": "133-18964-1",
    "telefono_principal": "8493421998",
    "correo_contacto": "franyermobilecenter@gmail.com",
    "direccion_fiscal": "San Francisco de Macorís, Rep. Dom.",
    "logo_url": "https://res.cloudinary.com/.../siger-fmc/companhia/nuevo_logo.webp",
    "logo_public_id": "siger-fmc/companhia/nuevo_logo"
  }
  ```
- **Comportamiento Multimedia:**
  - Si se actualiza el logotipo y existía un `logo_public_id` previo, el backend elimina automáticamente el archivo anterior de Cloudinary.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Información de la empresa actualizada exitosamente.",
    "data": {
      "id": 1,
      "nombre_empresa": "Franyer Mobile Center, S.R.L.",
      "rnc": "133-18964-1",
      "telefono_principal": "8493421998",
      "correo_contacto": "franyermobilecenter@gmail.com",
      "direccion_fiscal": "San Francisco de Macorís, Rep. Dom.",
      "logo_url": "https://res.cloudinary.com/.../siger-fmc/companhia/nuevo_logo.webp",
      "logo_public_id": "siger-fmc/companhia/nuevo_logo",
      "updated_at": "2026-09-02T14:05:00.000Z"
    }
  }
  ```

---

### 7.2 Gestión de Sucursales (`/api/configuracion/sucursales`)

#### 7.2.1 Listar Sucursales
- **Ruta:** `GET /api/configuracion/sucursales`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Listado de sucursales obtenido con éxito.",
    "data": [
      {
        "id": 1,
        "companhia_id": 1,
        "codigo_sucursal": "SUC-01",
        "nombre_sucursal": "Franyer Mobile Center - SFM",
        "telefono": "8493421998",
        "direccion": "San Francisco de Macoris",
        "config_tickets": {
          "ancho_papel_mm": 80,
          "copias_impresion": 1,
          "imprimir_logo": true,
          "mostrar_rnc": true,
          "mostrar_contacto_sucursal": true,
          "mostrar_cliente": true,
          "mostrar_equipo": true,
          "mostrar_falla": true,
          "mostrar_observaciones": true,
          "mostrar_costo_y_anticipo": true,
          "mostrar_checklist_recepcion": true,
          "incluir_qr_tracking": true,
          "imprimir_garantia": true,
          "clausula_garantia_defecto": "Garantía válida únicamente presentando este comprobante...",
          "mostrar_mensaje_cortesia": true,
          "mensaje_cortesia": "¡Gracias por su preferencia!..."
        },
        "config_etiquetas": {
          "preset": "50x30",
          "ancho_mm": 50,
          "alto_mm": 30,
          "orientacion": "horizontal",
          "incluir_nombre_empresa": true,
          "incluir_codigo_ticket": true,
          "incluir_cliente": true,
          "incluir_telefono": true,
          "incluir_equipo": true,
          "incluir_falla": true,
          "incluir_fecha": true,
          "incluir_tecnico": false,
          "incluir_metodo_desbloqueo": true,
          "tamano_fuente": "md"
        },
        "activo": true,
        "created_at": "2026-08-25T21:42:59.821Z",
        "updated_at": "2026-09-05T11:40:00.000Z"
      }
    ],
    "total": 1
  }
  ```

#### 7.2.2 Actualizar Sucursal Existente
- **Ruta:** `PUT /api/configuracion/sucursales/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal` de la sucursal `:id`)
- **Body (JSON):**
  ```json
  {
    "codigo_sucursal": "SUC-01",
    "nombre_sucursal": "Franyer Mobile Center - SFM Principal",
    "telefono": "8493421998",
    "direccion": "Av. Presidente Antonio Guzmán Fernández #12, SFM",
    "config_tickets": {
      "ancho_papel_mm": 80,
      "copias_impresion": 1,
      "imprimir_logo": true,
      "mostrar_rnc": true,
      "mostrar_contacto_sucursal": true,
      "mostrar_cliente": true,
      "mostrar_equipo": true,
      "mostrar_falla": true,
      "mostrar_observaciones": true,
      "mostrar_costo_y_anticipo": true,
      "mostrar_checklist_recepcion": true,
      "incluir_qr_tracking": true,
      "imprimir_garantia": true,
      "clausula_garantia_defecto": "Garantía válida únicamente presentando este comprobante...",
      "mostrar_mensaje_cortesia": true,
      "mensaje_cortesia": "¡Gracias por su preferencia!..."
    },
    "config_etiquetas": {
      "preset": "50x30",
      "ancho_mm": 50,
      "alto_mm": 30,
      "orientacion": "horizontal",
      "incluir_nombre_empresa": true,
      "incluir_codigo_ticket": true,
      "incluir_cliente": true,
      "incluir_telefono": true,
      "incluir_equipo": true,
      "incluir_falla": true,
      "incluir_fecha": true,
      "incluir_tecnico": false,
      "incluir_metodo_desbloqueo": true,
      "tamano_fuente": "md"
    }
  }
  ```
- **Reglas:**
  - `Admin_Sucursal` solo puede actualizar su `:id` de sucursal asignado (retorna `403` si intenta actualizar otra sede).
  - Permite actualizar campos informativos (`codigo_sucursal`, `nombre_sucursal`, `telefono`, `direccion`) y las configuraciones JSONB (`config_tickets`, `config_etiquetas`).
  - No se permite crear (POST), eliminar (DELETE) ni modificar el estado lógico `activo`.
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "ok": true,
    "message": "Sucursal actualizada exitosamente.",
    "data": {
      "id": 1,
      "companhia_id": 1,
      "codigo_sucursal": "SUC-01",
      "nombre_sucursal": "Franyer Mobile Center - SFM Principal",
      "telefono": "8493421998",
      "direccion": "Av. Presidente Antonio Guzmán Fernández #12, SFM",
      "config_tickets": { ... },
      "config_etiquetas": { ... },
      "activo": true,
      "updated_at": "2026-09-05T11:40:00.000Z"
    }
  }
  ```


