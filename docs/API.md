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
- `500 Internal Server Error`: Error no controlado en el servidor.

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
- **Errores Posibles:** `400 Bad Request`, `401 Unauthorized` (Credenciales inválidas), `403 Forbidden` (Cuenta inactiva).

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

## 3. Módulo de Servicios y Tickets (`/api/servicios`)

### 3.1 Listar Órdenes de Servicio
- **Ruta:** `GET /api/servicios`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Query Params (Opcionales):**
  - `sucursal_id`: Filtrar por sede (ignorado si no es SuperAdmin).
  - `estado_id` o `codigo_estado`: Filtrar por estado actual.
  - `search`: Búsqueda por código de ticket, nombre de cliente o modelo.
  - `tecnico_id`: Filtrar servicios asignados a un técnico.
  - `page` (default: 1), `limit` (default: 20).
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "codigo_ticket": "TKT-2026-0001",
        "sucursal_id": 1,
        "sucursal_nombre": "Franyer Mobile Center - SFM",
        "nombre_cliente": "Juan Pérez",
        "telefono_cliente": "809-555-1234",
        "marca_equipo": "Apple",
        "modelo_equipo": "iPhone 13",
        "falla_reportada": "Pantalla rota sin táctil",
        "codigo_estado": "EN_REPARACION",
        "nombre_estado": "En Proceso de Reparación",
        "color_badge": "#8B5CF6",
        "costo_previsto": "4500.00",
        "costo_final_confirmado": "4500.00",
        "fecha_entrega_estimada": "2026-08-28",
        "created_at": "2026-08-25T14:30:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "totalPages": 1
    }
  }
  ```

---

### 3.2 Obtener Detalle Completo de una Orden
- **Ruta:** `GET /api/servicios/:id`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`, `Tecnico`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "codigo_ticket": "TKT-2026-0001",
      "sucursal_id": 1,
      "categoria_id": 1,
      "nombre_categoria": "Smartphone",
      "usuario_recepcion_id": 3,
      "recepcionista_nombre": "Laura Secretaria",
      "estado_actual_id": 4,
      "codigo_estado": "EN_REPARACION",
      "nombre_estado": "En Proceso de Reparación",
      "color_badge": "#8B5CF6",
      "nombre_cliente": "Juan Pérez",
      "telefono_cliente": "809-555-1234",
      "cedula_cliente": "056-1111111-2",
      "correo_cliente": "juan.perez@email.com",
      "marca_equipo": "Apple",
      "modelo_equipo": "iPhone 13",
      "num_serie_imei": "356789012345678",
      "datos_acceso_equipo": "PIN: 1234",
      "falla_reportada": "Pantalla rota sin táctil",
      "observaciones_recepcion": "Bordes con golpes leves, sin cámara rota",
      "checklist_entrada": "{\"enciende\":true,\"camaras\":true,\"wifi\":true,\"carga\":true}",
      "costo_previsto": "4500.00",
      "monto_descuento": "0.00",
      "costo_final_confirmado": "4500.00",
      "tiempo_garantia": "30 días",
      "fecha_entrega_estimada": "2026-08-28",
      "tecnicos_asignados": [
        { "id": 1, "tecnico_id": 4, "nombre": "Manuel Tecnico", "es_principal": true }
      ],
      "historial_estados": [
        { "id": 1, "codigo_estado": "RECIBIDO", "nota_cambio": "Recepción en mostrador", "fecha_registro": "2026-08-25T14:30:00.000Z", "usuario_nombre": "Laura Secretaria" },
        { "id": 2, "codigo_estado": "EN_DIAGNOSTICO", "nota_cambio": "Iniciando pruebas de pantalla", "fecha_registro": "2026-08-25T15:00:00.000Z", "usuario_nombre": "Manuel Tecnico" }
      ],
      "incidencias": [],
      "evidencias": []
    }
  }
  ```

---

### 3.3 Crear Nueva Orden de Servicio (Ticket)
- **Ruta:** `POST /api/servicios`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Secretaria`)
- **Body (JSON):**
  ```json
  {
    "sucursal_id": 1,
    "categoria_id": 1,
    "nombre_cliente": "Juan Pérez",
    "telefono_cliente": "809-555-1234",
    "cedula_cliente": "056-1111111-2",
    "correo_cliente": "juan.perez@email.com",
    "marca_equipo": "Apple",
    "modelo_equipo": "iPhone 13",
    "num_serie_imei": "356789012345678",
    "datos_acceso_equipo": "PIN: 1234",
    "falla_reportada": "Pantalla rota sin táctil",
    "observaciones_recepcion": "Bordes con golpes leves",
    "checklist_entrada": "{\"enciende\":true,\"camaras\":true,\"wifi\":true,\"carga\":true}",
    "costo_previsto": 4500.00,
    "monto_descuento": 0.00,
    "tiempo_garantia": "30 días",
    "condiciones_garantia": "No cubre daños por humedad ni golpes posteriores.",
    "fecha_entrega_estimada": "2026-08-28"
  }
  ```
- **Respuesta Exitosa (`201 Created`):**
  ```json
  {
    "success": true,
    "message": "Orden de servicio creada exitosamente.",
    "data": {
      "id": 1,
      "codigo_ticket": "TKT-2026-0001",
      "estado_actual": "RECIBIDO"
    }
  }
  ```

---

### 3.4 Cambiar Estado de Servicio (Transición de Flujo)
- **Ruta:** `PATCH /api/servicios/:id/estado`
- **Acceso:** Privado (`SuperAdmin`, `Admin_Sucursal`, `Tecnico`, `Secretaria`)
- **Body (JSON):**
  ```json
  {
    "nuevo_estado_id": 2,
    "nota_cambio": "Equipo diagnosticado. Se confirma cambio de módulo de pantalla."
  }
  ```
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "message": "Estado del servicio actualizado correctamente.",
    "data": {
      "servicio_id": 1,
      "codigo_estado": "EN_DIAGNOSTICO",
      "nombre_estado": "En Diagnóstico"
    }
  }
  ```

---

### 3.5 Consulta Pública de Ticket (Tracking de Clientes)
- **Ruta:** `GET /api/servicios/publico/:codigo_ticket`
- **Acceso:** Público (Sin token)
- **Parámetros:** `codigo_ticket` (ej. `TKT-2026-0001`)
- **Respuesta Exitosa (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "codigo_ticket": "TKT-2026-0001",
      "marca_equipo": "Apple",
      "modelo_equipo": "iPhone 13",
      "codigo_estado": "EN_REPARACION",
      "nombre_estado": "En Proceso de Reparación",
      "color_badge": "#8B5CF6",
      "orden_flujo": 4,
      "fecha_entrega_estimada": "2026-08-28",
      "historial": [
        { "nombre_estado": "Recibido en Taller", "fecha_registro": "2026-08-25T14:30:00.000Z" },
        { "nombre_estado": "En Diagnóstico", "fecha_registro": "2026-08-25T15:00:00.000Z" },
        { "nombre_estado": "En Proceso de Reparación", "fecha_registro": "2026-08-25T16:20:00.000Z" }
      ]
    }
  }
  ```

---

## 4. Módulo de Incidencias y Evidencias (`/api/incidencias`, `/api/evidencias`)

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
