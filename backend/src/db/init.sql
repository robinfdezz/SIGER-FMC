-- ============================================================================
-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS: siger_fmc_db
-- Motor: PostgreSQL 15+ / 18.x
-- Codificación: UTF-8
-- ============================================================================

-- 1. Tabla de Compañía Matriz
CREATE TABLE IF NOT EXISTS datos_companhia (
    id SERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(100) NOT NULL,
    rnc VARCHAR(20) NOT NULL,
    telefono_principal VARCHAR(20) NOT NULL,
    correo_contacto VARCHAR(100) NOT NULL,
    direccion_fiscal TEXT NOT NULL,
    logo_url TEXT NULL,
    logo_public_id VARCHAR(150) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Sucursales
CREATE TABLE IF NOT EXISTS datos_sucursales (
    id SERIAL PRIMARY KEY,
    companhia_id INT NOT NULL,
    codigo_sucursal VARCHAR(10) NOT NULL UNIQUE,
    nombre_sucursal VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    direccion character varying(200) NOT NULL,
    config_tickets jsonb NOT NULL DEFAULT '{}'::jsonb,
    config_etiquetas jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_sucursal_companhia FOREIGN KEY (companhia_id) 
        REFERENCES datos_companhia(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 3. Tabla de Roles de Equipo
CREATE TABLE IF NOT EXISTS roles_equipo (
    id SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Tabla de Trabajadores (Usuarios del Sistema)
CREATE TABLE IF NOT EXISTS datos_trabajadores (
    id SERIAL PRIMARY KEY,
    sucursal_id INT NULL,
    rol_id INT NOT NULL,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(50) NOT NULL,
    apellido VARCHAR(50) NOT NULL,
    cedula VARCHAR(20) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    correo VARCHAR(100) NOT NULL UNIQUE,
    password TEXT NOT NULL,
    foto_perfil_url TEXT NULL,
    foto_perfil_public_id VARCHAR(150) NULL,
    ultimo_login TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_trabajador_sucursal FOREIGN KEY (sucursal_id) 
        REFERENCES datos_sucursales(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_trabajador_rol FOREIGN KEY (rol_id) 
        REFERENCES roles_equipo(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 5. Tabla de Categorías de Dispositivos
CREATE TABLE IF NOT EXISTS categorias_dispositivos (
    id SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(150) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6. Tabla de Estados de Servicio Técnico
CREATE TABLE IF NOT EXISTS estados_servicio (
    id SERIAL PRIMARY KEY,
    codigo_estado VARCHAR(30) NOT NULL UNIQUE,
    nombre_estado VARCHAR(50) NOT NULL,
    color_badge VARCHAR(20) NOT NULL,
    orden_flujo INT NOT NULL
);

-- 7. Tabla de Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    cedula_rnc VARCHAR(20) NOT NULL UNIQUE,
    telefono VARCHAR(20) NOT NULL,
    telefono_adicional VARCHAR(20) NULL,
    correo VARCHAR(100) NULL,
    direccion TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 8. Tabla de Servicios de Recepción (Tickets / Órdenes de Trabajo)
CREATE TABLE IF NOT EXISTS servicios_recepcion (
    id SERIAL PRIMARY KEY,
    codigo_ticket VARCHAR(20) NOT NULL UNIQUE,
    sucursal_id INT NOT NULL,
    categoria_id INT NOT NULL,
    cliente_id INT NULL,
    nombre_cliente VARCHAR(100) NULL,
    telefono_cliente VARCHAR(20) NULL,
    cedula_cliente VARCHAR(20) NULL,
    correo_cliente VARCHAR(100) NULL,
    usuario_recepcion_id INT NOT NULL,
    estado_actual_id INT NOT NULL,
    prioridad VARCHAR(20) NOT NULL DEFAULT 'media',
    marca_equipo VARCHAR(50) NOT NULL,
    modelo_equipo VARCHAR(50) NOT NULL,
    num_serie_imei VARCHAR(50) NULL,
    datos_acceso_equipo jsonb NULL,
    falla_reportada TEXT NOT NULL,
    observaciones_recepcion TEXT NULL,
    checklist_entrada jsonb NULL,
    costo_previsto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monto_anticipo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    monto_descuento NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    costo_final_confirmado NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    tiempo_garantia VARCHAR(50) NULL DEFAULT '30 días',
    condiciones_garantia TEXT NULL,
    fecha_entrega_estimada DATE NULL,
    fecha_entrega_real TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_identificacion_cliente CHECK ((cliente_id IS NOT NULL) OR (nombre_cliente IS NOT NULL)),
    CONSTRAINT chk_prioridad CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente')),
    CONSTRAINT fk_servicio_sucursal FOREIGN KEY (sucursal_id) 
        REFERENCES datos_sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT fk_servicio_categoria FOREIGN KEY (categoria_id) 
        REFERENCES categorias_dispositivos(id) ON DELETE RESTRICT,
    CONSTRAINT fk_servicio_cliente FOREIGN KEY (cliente_id) 
        REFERENCES clientes(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_servicio_recepcionista FOREIGN KEY (usuario_recepcion_id) 
        REFERENCES datos_trabajadores(id) ON DELETE RESTRICT,
    CONSTRAINT fk_servicio_estado FOREIGN KEY (estado_actual_id) 
        REFERENCES estados_servicio(id) ON DELETE RESTRICT
);

-- 9. Tabla de Técnicos Asignados
CREATE TABLE IF NOT EXISTS tecnicos_asignados (
    id SERIAL PRIMARY KEY,
    servicio_id INT NOT NULL,
    tecnico_id INT NOT NULL,
    fecha_asignacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_asignacion_servicio FOREIGN KEY (servicio_id) 
        REFERENCES servicios_recepcion(id) ON DELETE CASCADE,
    CONSTRAINT fk_asignacion_tecnico FOREIGN KEY (tecnico_id) 
        REFERENCES datos_trabajadores(id) ON DELETE RESTRICT
);

-- 10. Tabla de Historial de Estados (Auditoría / Línea de Tiempo)
CREATE TABLE IF NOT EXISTS historial_estados (
    id SERIAL PRIMARY KEY,
    servicio_id INT NOT NULL,
    estado_id INT NOT NULL,
    usuario_id INT NOT NULL,
    nota_cambio TEXT NULL,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_servicio FOREIGN KEY (servicio_id) 
        REFERENCES servicios_recepcion(id) ON DELETE CASCADE,
    CONSTRAINT fk_historial_estado FOREIGN KEY (estado_id) 
        REFERENCES estados_servicio(id) ON DELETE RESTRICT,
    CONSTRAINT fk_historial_usuario FOREIGN KEY (usuario_id) 
        REFERENCES datos_trabajadores(id) ON DELETE RESTRICT
);

-- 11. Tabla de Incidencias de Servicio (Repuestos y Novedades)
CREATE TABLE IF NOT EXISTS incidencias_servicio (
    id SERIAL PRIMARY KEY,
    servicio_id INT NOT NULL,
    tipo_incidencia VARCHAR(50) NOT NULL,
    descripcion TEXT NOT NULL,
    repuesto_requerido VARCHAR(150) NULL,
    costo_adicional_repuesto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    aprobado_por_cliente BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    usuario_id INT NULL,
    fecha_aprobacion TIMESTAMPTZ NULL,
    metodo_aprobacion VARCHAR(30) NULL,
    CONSTRAINT uq_incidencia_servicio UNIQUE (id, servicio_id),
    CONSTRAINT chk_tipo_incidencia CHECK (tipo_incidencia IN ('Imprevisto', 'Aviso al Cliente', 'Pieza Extra', 'Hallazgo Tecnico')),
    CONSTRAINT chk_metodo_aprobacion CHECK (metodo_aprobacion IS NULL OR metodo_aprobacion IN ('Presencial', 'Llamada', 'WhatsApp', 'Correo', 'Otro')),
    CONSTRAINT fk_incidencia_servicio FOREIGN KEY (servicio_id) 
        REFERENCES servicios_recepcion(id) ON DELETE CASCADE,
    CONSTRAINT incidencias_servicio_usuario_id_fkey FOREIGN KEY (usuario_id) 
        REFERENCES datos_trabajadores(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- 12. Tabla de Evidencias Fotográficas (Galería Multimedia)
CREATE TABLE IF NOT EXISTS evidencias_fotograficas (
    id SERIAL PRIMARY KEY,
    servicio_id INT NOT NULL,
    incidencia_id INT NULL,
    url_foto TEXT NOT NULL,
    tipo_evidencia VARCHAR(150) NOT NULL,
    descripcion VARCHAR(150) NULL,
    fecha_subida TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    public_id VARCHAR(150) NULL,
    usuario_id INT NULL,
    CONSTRAINT fk_evidencia_servicio FOREIGN KEY (servicio_id) 
        REFERENCES servicios_recepcion(id) ON DELETE CASCADE,
    CONSTRAINT fk_evidencia_incidencia_servicio FOREIGN KEY (incidencia_id, servicio_id) 
        REFERENCES incidencias_servicio(id, servicio_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT evidencias_fotograficas_usuario_id_fkey FOREIGN KEY (usuario_id) 
        REFERENCES datos_trabajadores(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================================
-- ÍNDICES SECUNDARIOS PARA RENDIMIENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_servicios_sucursal ON servicios_recepcion(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_servicios_cliente ON servicios_recepcion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_servicios_estado ON servicios_recepcion(estado_actual_id);
CREATE INDEX IF NOT EXISTS idx_servicios_prioridad ON servicios_recepcion(prioridad);
CREATE INDEX IF NOT EXISTS idx_tecnicos_servicio ON tecnicos_asignados(servicio_id);
CREATE INDEX IF NOT EXISTS idx_historial_servicio ON historial_estados(servicio_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_servicio ON incidencias_servicio(servicio_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_usuario ON incidencias_servicio(usuario_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_servicio ON evidencias_fotograficas(servicio_id);
CREATE INDEX IF NOT EXISTS idx_evidencias_usuario ON evidencias_fotograficas(usuario_id);

-- ============================================================================
-- DATOS SEMILLA BASE (CATÁLOGOS OBLIGATORIOS)
-- ============================================================================

-- 1. Compañía Matriz
INSERT INTO datos_companhia (nombre_empresa, rnc, telefono_principal, correo_contacto, direccion_fiscal)
SELECT 'Franyer Mobile Center, S.R.L.', '133-18964-1', '8493421998', 'franyermobilecenter@gmail.com', 'ADM LOCAL SAN FCO MACORIS'
WHERE NOT EXISTS (SELECT 1 FROM datos_companhia WHERE rnc = '133-18964-1');

-- 2. Sucursales Iniciales
INSERT INTO datos_sucursales (companhia_id, codigo_sucursal, nombre_sucursal, telefono, direccion)
SELECT 1, 'SUC-01', 'Franyer Mobile Center - SFM', '8493421998', 'San Francisco de Macoris'
WHERE NOT EXISTS (SELECT 1 FROM datos_sucursales WHERE codigo_sucursal = 'SUC-01');

INSERT INTO datos_sucursales (companhia_id, codigo_sucursal, nombre_sucursal, telefono, direccion)
SELECT 1, 'SUC-02', 'Franyer Mobile Center - Castillo', '8093132513', 'Castillo'
WHERE NOT EXISTS (SELECT 1 FROM datos_sucursales WHERE codigo_sucursal = 'SUC-02');

-- 3. Roles del Sistema
INSERT INTO roles_equipo (nombre_rol, descripcion) VALUES
('SuperAdmin', 'Control global de todas las sucursales, finanzas y configuración'),
('Admin_Sucursal', 'Gestión administrativa y operativa de una sucursal específica'),
('Secretaria', 'Recepción de equipos, creación de tickets y atención al cliente'),
('Tecnico', 'Diagnóstico, resolución técnica, subida de incidencias y evidencias')
ON CONFLICT (nombre_rol) DO NOTHING;

-- 4. Categorías de Dispositivos
INSERT INTO categorias_dispositivos (nombre_categoria, descripcion) VALUES
('Smartphone', 'Teléfonos inteligentes Android y iPhone'),
('Tablet / iPad', 'Tabletas y iPads'),
('Laptop', 'Computadoras portátiles y notebooks'),
('Consola de Videojuegos', 'PlayStation, Xbox, Nintendo Switch y portátiles'),
('Smartwatch', 'Relojes inteligentes y bandas deportivas'),
('Otros', 'Accesorios y dispositivos electrónicos varios')
ON CONFLICT (nombre_categoria) DO NOTHING;

-- 5. Estados de Servicio Técnico
INSERT INTO estados_servicio (codigo_estado, nombre_estado, color_badge, orden_flujo) VALUES
('RECIBIDO', 'Recibido en Taller', '#6B7280', 1),
('EN_DIAGNOSTICO', 'En Diagnóstico', '#3B82F6', 2),
('ESPERA_REPUESTO', 'En Espera de Repuesto', '#F59E0B', 3),
('EN_REPARACION', 'En Proceso de Reparación', '#8B5CF6', 4),
('CONTROL_CALIDAD', 'Control de Calidad / Pruebas', '#EC4899', 5),
('LISTO_ENTREGA', 'Listo para Entrega', '#10B981', 6),
('ENTREGADO', 'Entregado al Cliente', '#059669', 7),
('CANCELADO_DEVUELTO', 'Cancelado / No Reparado', '#EF4444', 8)
ON CONFLICT (codigo_estado) DO NOTHING;
