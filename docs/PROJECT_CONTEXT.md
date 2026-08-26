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
   * Atención al cliente en mostrador, búsqueda y registro de clientes, creación formal de tickets de entrada, emisión de comprobantes y gestión de entregas finales.
4. **Tecnico (`rol_id: 4`):**
   * Acceso al módulo técnico: diagnóstico, actualización de estados de reparación, reporte de repuestos/incidencias y carga de evidencias fotográficas.

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
8. **`CANCELADO_DEVUELTO` (ID: 8 | Rojo):**
   * Cancelación por falta de solución técnica o no aprobación del presupuesto por parte del cliente.

*Cada cambio de estado genera un registro inmutable en la tabla `historial_estados` con fecha, usuario responsable y nota explicativa.*

---

## 5. Módulos y Entidades Clave
* **`clientes`:** Directorio único de clientes con documento de identidad (Cédula/RNC), contactos y dirección.
* **`servicios_recepcion`:** Registro maestro de la orden de reparación, especificaciones del equipo y costos.
* **`incidencias_servicio`:** Registro de imprevistos, piezas extra y costos adicionales surgidos durante el diagnóstico/reparación.
* **`evidencias_fotograficas`:** Registro fotográfico del estado de entrada, fallas detectadas y resultado final.
* **`categorias_dispositivos`:** Clasificación de equipos atendidos (Smartphone, Tablet/iPad, Laptop, Consola de Videojuegos, Smartwatch, Otros).

---

## 6. Stack Tecnológico
* **Frontend:** React, Tailwind CSS, Vite, Lucide Icons.
* **Backend:** Node.js, Express.js.
* **Base de Datos:** PostgreSQL (`siger_fmc_db`) vía driver nativo `pg` con Connection Pooling.
* **Seguridad y Sesión:** Autenticación basada en JSON Web Tokens (JWT) con contraseñas encriptadas en `bcryptjs`.