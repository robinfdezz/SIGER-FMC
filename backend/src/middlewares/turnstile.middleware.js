/**
 * Middleware para Validación de Cloudflare Turnstile (Anti-Bot)
 * 
 * Se activa condicionalmente mediante Feature Flag (ENABLE_TURNSTILE === 'true').
 * En entornos de desarrollo local o cuando está inactivo, se omite la verificación
 * permitiendo pruebas fluidas sin llamadas externas ni dependencias de red.
 */

const verifyTurnstile = async (req, res, next) => {
  const isEnabled = process.env.ENABLE_TURNSTILE === 'true';

  // Bypass en desarrollo o si el feature flag está inactivo
  if (!isEnabled) {
    return next();
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('[Turnstile] Error de configuración: ENABLE_TURNSTILE es true pero TURNSTILE_SECRET_KEY no está definida.');
    return res.status(500).json({
      success: false,
      mensaje: 'Error de configuración del servidor de verificación anti-bot'
    });
  }

  // Extraer token de headers (cf-turnstile-response), query params (turnstileToken) o body (turnstileToken)
  const token = req.headers['cf-turnstile-response'] || req.query?.turnstileToken || req.body?.turnstileToken;

  if (!token) {
    return res.status(400).json({
      success: false,
      mensaje: 'Token de verificación Cloudflare requerido'
    });
  }

  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || req.socket?.remoteAddress;

    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token);
    if (clientIp) {
      formData.append('remoteip', clientIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const data = await response.json();

    if (data && data.success) {
      return next();
    }

    console.warn('[Turnstile] Verificación fallida de Cloudflare:', data['error-codes'] || data);
    return res.status(403).json({
      success: false,
      mensaje: 'Verificación anti-bot fallida'
    });
  } catch (error) {
    console.error('[Turnstile] Error validando token con Cloudflare:', error.message);
    return res.status(500).json({
      success: false,
      mensaje: 'Error al contactar el servicio de verificación anti-bot'
    });
  }
};

module.exports = verifyTurnstile;
