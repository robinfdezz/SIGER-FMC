-- ============================================================================
-- SCRIPT DE INICIALIZACIÓN DE BASE DE DATOS: SIGER_FMC_DB
-- Motor: Microsoft SQL Server (T-SQL)
-- ============================================================================

IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'SIGER_FMC_DB')
BEGIN
    CREATE DATABASE SIGER_FMC_DB COLLATE Latin1_General_100_CI_AS_SC_UTF8;
END
GO

USE SIGER_FMC_DB;
GO

-- 1. Tabla de Compañía Matriz
IF OBJECT_ID('Datos_Companhia', 'U') IS NULL
BEGIN
    CREATE TABLE Datos_Companhia (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre_empresa NVARCHAR(100) NOT NULL,
        rnc NVARCHAR(20) NOT NULL,
        telefono_principal NVARCHAR(20) NOT NULL,
        correo_contacto NVARCHAR(100) NOT NULL,
        direccion_fiscal NVARCHAR(MAX) NOT NULL,
        logo_url NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
    );
END
GO

-- 2. Tabla de Sucursales
IF OBJECT_ID('Datos_Sucursales', 'U') IS NULL
BEGIN
    CREATE TABLE Datos_Sucursales (
        id INT IDENTITY(1,1) PRIMARY KEY,
        companhia_id INT NOT NULL,
        codigo_sucursal NVARCHAR(10) NOT NULL UNIQUE,
        nombre_sucursal NVARCHAR(100) NOT NULL,
        telefono NVARCHAR(20) NOT NULL,
        direccion NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Sucursal_Companhia FOREIGN KEY (companhia_id) 
            REFERENCES Datos_Companhia(id) ON UPDATE CASCADE
    );
END
GO

-- 3. Tabla de Roles de Equipo
IF OBJECT_ID('Roles_Equipo', 'U') IS NULL
BEGIN
    CREATE TABLE Roles_Equipo (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre_rol NVARCHAR(50) NOT NULL UNIQUE,
        descripcion NVARCHAR(255) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        activo BIT NOT NULL DEFAULT 1
    );
END
GO

-- 4. Tabla de Trabajadores / Usuarios
IF OBJECT_ID('Datos_Trabajadores', 'U') IS NULL
BEGIN
    CREATE TABLE Datos_Trabajadores (
        id INT IDENTITY(1,1) PRIMARY KEY,
        sucursal_id INT NULL,
        rol_id INT NOT NULL,
        usuario NVARCHAR(50) NOT NULL UNIQUE,
        nombre NVARCHAR(50) NOT NULL,
        apellido NVARCHAR(50) NOT NULL,
        cedula NVARCHAR(20) NOT NULL,
        telefono NVARCHAR(20) NOT NULL,
        correo NVARCHAR(100) NOT NULL UNIQUE,
        password NVARCHAR(255) NOT NULL,
        foto_perfil_url NVARCHAR(255) NULL,
        ultimo_login DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Trabajador_Sucursal FOREIGN KEY (sucursal_id) 
            REFERENCES Datos_Sucursales(id),
        CONSTRAINT FK_Trabajador_Rol FOREIGN KEY (rol_id) 
            REFERENCES Roles_Equipo(id)
    );
END
GO

-- 5. Tabla de Categorías de Dispositivos
IF OBJECT_ID('Categorias_Dispositivos', 'U') IS NULL
BEGIN
    CREATE TABLE Categorias_Dispositivos (
        id INT IDENTITY(1,1) PRIMARY KEY,
        nombre_categoria NVARCHAR(50) NOT NULL UNIQUE,
        descripcion NVARCHAR(150) NULL,
        activo BIT NOT NULL DEFAULT 1
    );
END
GO

-- 6. Tabla de Estados de Servicio
IF OBJECT_ID('Estados_Servicio', 'U') IS NULL
BEGIN
    CREATE TABLE Estados_Servicio (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo_estado NVARCHAR(30) NOT NULL UNIQUE,
        nombre_estado NVARCHAR(50) NOT NULL,
        color_badge NVARCHAR(20) NOT NULL,
        orden_flujo INT NOT NULL
    );
END
GO

-- 7. Tabla de Servicios / Recepción (Órdenes de Trabajo)
IF OBJECT_ID('Servicios_Recepcion', 'U') IS NULL
BEGIN
    CREATE TABLE Servicios_Recepcion (
        id INT IDENTITY(1,1) PRIMARY KEY,
        codigo_ticket NVARCHAR(20) NOT NULL UNIQUE,
        sucursal_id INT NOT NULL,
        categoria_id INT NOT NULL,
        usuario_recepcion_id INT NOT NULL,
        estado_actual_id INT NOT NULL,
        nombre_cliente NVARCHAR(100) NOT NULL,
        telefono_cliente NVARCHAR(20) NOT NULL,
        cedula_cliente NVARCHAR(20) NULL,
        correo_cliente NVARCHAR(100) NULL,
        marca_equipo NVARCHAR(50) NOT NULL,
        modelo_equipo NVARCHAR(50) NOT NULL,
        num_serie_imei NVARCHAR(50) NULL,
        datos_acceso_equipo NVARCHAR(MAX) NULL,
        falla_reportada NVARCHAR(MAX) NOT NULL,
        observaciones_recepcion NVARCHAR(MAX) NULL,
        checklist_entrada NVARCHAR(MAX) NULL,
        costo_previsto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        monto_descuento DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        costo_final_confirmado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        tiempo_garantia NVARCHAR(50) NULL DEFAULT '30 días',
        condiciones_garantia NVARCHAR(MAX) NULL,
        fecha_entrega_estimada DATE NULL,
        fecha_entrega_real DATETIME2 NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Servicio_Sucursal FOREIGN KEY (sucursal_id) REFERENCES Datos_Sucursales(id),
        CONSTRAINT FK_Servicio_Categoria FOREIGN KEY (categoria_id) REFERENCES Categorias_Dispositivos(id),
        CONSTRAINT FK_Servicio_UsuarioRecepcion FOREIGN KEY (usuario_recepcion_id) REFERENCES Datos_Trabajadores(id),
        CONSTRAINT FK_Servicio_EstadoActual FOREIGN KEY (estado_actual_id) REFERENCES Estados_Servicio(id)
    );
END
GO

-- 8. Técnicos Asignados
IF OBJECT_ID('Tecnicos_Asignados', 'U') IS NULL
BEGIN
    CREATE TABLE Tecnicos_Asignados (
        id INT IDENTITY(1,1) PRIMARY KEY,
        servicio_id INT NOT NULL,
        tecnico_id INT NOT NULL,
        fecha_asignacion DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        es_principal BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_TecnicoAsignado_Servicio FOREIGN KEY (servicio_id) 
            REFERENCES Servicios_Recepcion(id) ON DELETE CASCADE,
        CONSTRAINT FK_TecnicoAsignado_Tecnico FOREIGN KEY (tecnico_id) 
            REFERENCES Datos_Trabajadores(id)
    );
END
GO

-- 9. Historial de Estados (Auditoría / Línea de Tiempo)
IF OBJECT_ID('Historial_Estados', 'U') IS NULL
BEGIN
    CREATE TABLE Historial_Estados (
        id INT IDENTITY(1,1) PRIMARY KEY,
        servicio_id INT NOT NULL,
        estado_id INT NOT NULL,
        usuario_id INT NOT NULL,
        nota_cambio NVARCHAR(MAX) NULL,
        fecha_registro DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_Historial_Servicio FOREIGN KEY (servicio_id) 
            REFERENCES Servicios_Recepcion(id) ON DELETE CASCADE,
        CONSTRAINT FK_Historial_Estado FOREIGN KEY (estado_id) 
            REFERENCES Estados_Servicio(id),
        CONSTRAINT FK_Historial_Usuario FOREIGN KEY (usuario_id) 
            REFERENCES Datos_Trabajadores(id)
    );
END
GO

-- 10. Incidencias de Servicio (Repuestos y Novedades)
IF OBJECT_ID('Incidencias_Servicio', 'U') IS NULL
BEGIN
    CREATE TABLE Incidencias_Servicio (
        id INT IDENTITY(1,1) PRIMARY KEY,
        servicio_id INT NOT NULL,
        tipo_incidencia NVARCHAR(50) NOT NULL,
        descripcion NVARCHAR(MAX) NOT NULL,
        repuesto_requerido NVARCHAR(150) NULL,
        costo_adicional_repuesto DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        aprobado_por_cliente BIT NOT NULL DEFAULT 0,
        fecha_registro DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Incidencia_Servicio FOREIGN KEY (servicio_id) 
            REFERENCES Servicios_Recepcion(id) ON DELETE CASCADE
    );
END
GO

-- 11. Evidencias Fotográficas
IF OBJECT_ID('Evidencias_Fotograficas', 'U') IS NULL
BEGIN
    CREATE TABLE Evidencias_Fotograficas (
        id INT IDENTITY(1,1) PRIMARY KEY,
        servicio_id INT NOT NULL,
        incidencia_id INT NULL,
        url_foto NVARCHAR(255) NOT NULL,
        tipo_evidencia NVARCHAR(50) NOT NULL,
        descripcion NVARCHAR(150) NULL,
        fecha_subida DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
        activo BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_Evidencia_Servicio FOREIGN KEY (servicio_id) 
            REFERENCES Servicios_Recepcion(id) ON DELETE CASCADE,
        CONSTRAINT FK_Evidencia_Incidencia FOREIGN KEY (incidencia_id) 
            REFERENCES Incidencias_Servicio(id)
    );
END
GO

-- ============================================================================
-- INSERCIÓN DE DATOS SEMILLA (ROLES, ESTADOS Y COMPAÑÍA)
-- ============================================================================

-- Roles
IF NOT EXISTS (SELECT 1 FROM Roles_Equipo WHERE nombre_rol = 'SuperAdmin')
    INSERT INTO Roles_Equipo (nombre_rol, descripcion) VALUES 
    ('SuperAdmin', 'Control total del sistema y todas las sucursales'),
    ('Admin_Sucursal', 'Control administrativo de una sucursal específica'),
    ('Secretaria', 'Recepción de equipos, apertura de tickets y entrega'),
    ('Tecnico', 'Diagnóstico, reparación, reporte de incidencias y carga de evidencias');
GO

-- Estados de Servicio
IF NOT EXISTS (SELECT 1 FROM Estados_Servicio WHERE codigo_estado = 'RECIBIDO')
    INSERT INTO Estados_Servicio (codigo_estado, nombre_estado, color_badge, orden_flujo) VALUES 
    ('RECIBIDO', 'Recibido en Taller', '#6B7280', 1),
    ('EN_DIAGNOSTICO', 'En Diagnóstico', '#3B82F6', 2),
    ('ESPERA_REPUESTO', 'En Espera de Repuesto', '#F59E0B', 3),
    ('EN_REPARACION', 'En Proceso de Reparación', '#8B5CF6', 4),
    ('CONTROL_CALIDAD', 'Control de Calidad / Pruebas', '#EC4899', 5),
    ('LISTO_ENTREGA', 'Listo para Entrega', '#10B981', 6),
    ('ENTREGADO', 'Entregado al Cliente', '#059669', 7),
    ('CANCELADO_DEVUELTO', 'Cancelado / No Reparado', '#EF4444', 8);
GO

-- Empresa Matriz
IF NOT EXISTS (SELECT 1 FROM Datos_Companhia WHERE rnc = '132-00000-1')
    INSERT INTO Datos_Companhia (nombre_empresa, rnc, telefono_principal, correo_contacto, direccion_fiscal)
    VALUES ('Franyer Mobile Center, S.R.L.', '132-00000-1', '809-555-0199', 'contacto@franyermobile.com', 'Av. Principal #100, Santo Domingo, R.D.');
GO

-- Sucursal Principal
IF NOT EXISTS (SELECT 1 FROM Datos_Sucursales WHERE codigo_sucursal = 'SUC-01')
    INSERT INTO Datos_Sucursales (companhia_id, codigo_sucursal, nombre_sucursal, telefono, direccion)
    VALUES (1, 'SUC-01', 'Sede Central - Principal', '809-555-0101', 'Av. Principal #100, Santo Domingo');
GO

-- Categorías de Dispositivos
IF NOT EXISTS (SELECT 1 FROM Categorias_Dispositivos WHERE nombre_categoria = 'Smartphone')
    INSERT INTO Categorias_Dispositivos (nombre_categoria, descripcion) VALUES
    ('Smartphone', 'Teléfonos móviles inteligentes (iPhone, Samsung, Xiaomi, etc.)'),
    ('Tablet', 'Tablets y iPads'),
    ('Laptop', 'Computadoras portátiles'),
    ('Smartwatch', 'Relojes inteligentes');
GO

-- Usuario SuperAdmin por defecto (Contraseña: Admin1234!)
-- Hash Bcrypt generado con 10 rondas para 'Admin1234!' = $2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1q92kYQx5bTzN4e1k8wO1P9.k7bQy2 (ejemplo)
-- Se recomienda cambiar la contraseña inmediatamente tras el primer inicio de sesión.
IF NOT EXISTS (SELECT 1 FROM Datos_Trabajadores WHERE correo = 'admin@sigerfmc.com')
BEGIN
    INSERT INTO Datos_Trabajadores (
        sucursal_id, rol_id, usuario, nombre, apellido, cedula, telefono, correo, password, activo
    ) VALUES (
        1, 1, 'admin', 'Franyer', 'Administrador', '001-0000000-0', '809-555-0100', 'admin@sigerfmc.com', 
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Contraseña: password (o hash personalizado)
        1
    );
END
GO
