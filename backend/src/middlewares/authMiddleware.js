const jwt = require('jsonwebtoken');

/**
 * Middleware para autenticar peticiones mediante JSON Web Token (JWT).
 * Espera el encabezado: Authorization: Bearer <token>
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Acceso no autorizado. No se proporcionó un token de sesión válido.'
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de autenticación ausente.'
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('❌ Error de seguridad: JWT_SECRET no está definida en las variables de entorno.');
      return res.status(500).json({
        success: false,
        message: 'Error interno en la configuración de autenticación del servidor.'
      });
    }

    const decoded = jwt.verify(token, secret);

    // Adjuntar los datos del usuario decodificados al objeto Request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_EXPIRED',
        message: 'La sesión ha expirado. Por favor, inicie sesión nuevamente.'
      });
    }

    return res.status(401).json({
      success: false,
      code: 'INVALID_TOKEN',
      message: 'Token inválido o manipulado.'
    });
  }
};

module.exports = authMiddleware;
