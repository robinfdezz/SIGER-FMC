const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

/**
 * Genera un token JWT para el trabajador autenticado.
 */
const generateToken = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está configurada en las variables de entorno.');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Controlador de Inicio de Sesión (Login)
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { usuario, password, correo } = req.body;
    const userIdentifier = usuario || correo;

    // 1. Validar campos requeridos y formato de longitudes
    if (!userIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Por favor, ingrese tanto el nombre de usuario como la contraseña.'
      });
    }

    const cleanUsername = String(userIdentifier).trim().toLowerCase();
    const strPassword = String(password);

    if (cleanUsername.length < 6 || cleanUsername.length > 50 || strPassword.length < 8 || strPassword.length > 20) {
      return res.status(400).json({
        success: false,
        message: 'Formato o longitud de credenciales inválida.'
      });
    }

    // 2. Consultar usuario en la base de datos con JOIN a Roles y Sucursales
    const pool = getPool();
    const query = `
      SELECT 
        t.id,
        t.sucursal_id,
        t.rol_id,
        t.usuario,
        t.nombre,
        t.apellido,
        t.cedula,
        t.telefono,
        t.correo,
        t.password,
        t.foto_perfil_url,
        t.ultimo_login,
        t.activo,
        r.nombre_rol AS rol_nombre,
        s.nombre_sucursal AS sucursal_nombre,
        s.codigo_sucursal AS sucursal_codigo
      FROM datos_trabajadores t
      INNER JOIN roles_equipo r ON t.rol_id = r.id
      LEFT JOIN datos_sucursales s ON t.sucursal_id = s.id
      WHERE LOWER(t.usuario) = $1
    `;

    const result = await pool.query(query, [cleanUsername]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Verifique el usuario y la contraseña ingresados.'
      });
    }

    const worker = result.rows[0];

    // 3. Validar estado activo del trabajador
    if (!worker.activo) {
      return res.status(403).json({
        success: false,
        message: 'Su cuenta se encuentra desactivada. Comuníquese con el administrador del sistema.'
      });
    }

    // 4. Comparar hash de contraseña
    const isMatch = await bcrypt.compare(password, worker.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales inválidas. Verifique el usuario y la contraseña ingresados.'
      });
    }

    // 5. Actualizar último acceso (ultimo_login)
    try {
      await pool.query(
        'UPDATE datos_trabajadores SET ultimo_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [worker.id]
      );
    } catch (updateErr) {
      console.error('Error al actualizar ultimo_login:', updateErr.message);
    }

    // 6. Construir payload y generar token JWT
    const tokenPayload = {
      id: worker.id,
      nombre: worker.nombre,
      apellido: worker.apellido,
      usuario: worker.usuario,
      correo: worker.correo,
      rol_id: worker.rol_id,
      rol_nombre: worker.rol_nombre,
      sucursal_id: worker.sucursal_id,
      sucursal_nombre: worker.sucursal_nombre || 'Todas las Sucursales'
    };

    const token = generateToken(tokenPayload);

    // 7. Retornar respuesta exitosa (omitiendo la contraseña)
    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        id: worker.id,
        nombre: worker.nombre,
        apellido: worker.apellido,
        usuario: worker.usuario,
        correo: worker.correo,
        cedula: worker.cedula,
        telefono: worker.telefono,
        foto_perfil_url: worker.foto_perfil_url,
        rol_id: worker.rol_id,
        rol_nombre: worker.rol_nombre,
        sucursal_id: worker.sucursal_id,
        sucursal_nombre: worker.sucursal_nombre || 'Todas las Sucursales',
        sucursal_codigo: worker.sucursal_codigo || 'GLOBAL',
        ultimo_login: worker.ultimo_login
      }
    });

  } catch (error) {
    console.error('❌ Error en login:', error);
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error interno en el servidor al intentar iniciar sesión. Inténtelo nuevamente más tarde.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener perfil de la sesión actual
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No se encontró información de la sesión.'
      });
    }

    const pool = getPool();
    const query = `
      SELECT 
        t.id,
        t.sucursal_id,
        t.rol_id,
        t.usuario,
        t.nombre,
        t.apellido,
        t.cedula,
        t.telefono,
        t.correo,
        t.foto_perfil_url,
        t.ultimo_login,
        t.activo,
        r.nombre_rol AS rol_nombre,
        s.nombre_sucursal AS sucursal_nombre,
        s.codigo_sucursal AS sucursal_codigo
      FROM datos_trabajadores t
      INNER JOIN roles_equipo r ON t.rol_id = r.id
      LEFT JOIN datos_sucursales s ON t.sucursal_id = s.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El usuario asociado a esta sesión no fue encontrado.'
      });
    }

    const worker = result.rows[0];

    if (!worker.activo) {
      return res.status(403).json({
        success: false,
        message: 'Su cuenta ha sido desactivada.'
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: worker.id,
        nombre: worker.nombre,
        apellido: worker.apellido,
        usuario: worker.usuario,
        correo: worker.correo,
        cedula: worker.cedula,
        telefono: worker.telefono,
        foto_perfil_url: worker.foto_perfil_url,
        rol_id: worker.rol_id,
        rol_nombre: worker.rol_nombre,
        sucursal_id: worker.sucursal_id,
        sucursal_nombre: worker.sucursal_nombre || 'Todas las Sucursales',
        sucursal_codigo: worker.sucursal_codigo || 'GLOBAL',
        ultimo_login: worker.ultimo_login
      }
    });

  } catch (error) {
    console.error('❌ Error en getMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al verificar la sesión del usuario.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  login,
  getMe
};
