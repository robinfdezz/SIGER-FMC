/**
 * Middleware para sanitizar y remover emojis de req.body y req.query de forma recursiva.
 * Previene errores de codificación en bases de datos y mantiene los datos limpios.
 */

// Regex Unicode que cubre pictografías extendidas, rangos de emojis comunes, banderas y selectores de variación
const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0E}-\u{FE0F}\u{200D}]/gu;

/**
 * Remueve emojis de strings o recursivamente de objetos y arreglos.
 * Preserva instancias no planas como Date o Buffer, y colapsa espacios redundantes dejados por emojis.
 *
 * @param {any} value - Valor a sanitizar
 * @param {boolean} [isSensitive=false] - Si es campo sensible (contraseña, token), no altera espacios
 * @returns {any}
 */
const stripEmojis = (value, isSensitive = false) => {
  if (typeof value === 'string') {
    const stripped = value.replace(EMOJI_REGEX, '');
    if (isSensitive) return stripped;
    return stripped.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/gm, '').trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripEmojis(item, isSensitive));
  }

  if (value !== null && typeof value === 'object') {
    if (value instanceof Date || (typeof Buffer !== 'undefined' && Buffer.isBuffer(value))) {
      return value;
    }
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      const sensitive = /pass|token|secret/i.test(key);
      cleaned[key] = stripEmojis(val, sensitive);
    }
    return cleaned;
  }

  return value;
};

const stripEmojisMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = stripEmojis(req.body);
  }
  if (req.query) {
    req.query = stripEmojis(req.query);
  }
  next();
};

module.exports = {
  stripEmojis,
  stripEmojisMiddleware
};
