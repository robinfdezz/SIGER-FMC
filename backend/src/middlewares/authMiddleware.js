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

    const secret = process.env.JWT_SECRET || 'siger_fmc_default_secret_jwt';
    const decoded = jwt.verify(token, secret);

    // Adjuntar los datos del usuario decodificados al objeto Request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'La sesión ha expirado. Por favor, inicie sesión nuevamente.'
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Token inválido o manipulado.'
    });
  }
};

module.exports = authMiddleware;
