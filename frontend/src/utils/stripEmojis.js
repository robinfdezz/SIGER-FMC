/**
 * Utilidad para sanitizar y remover emojis de textos, objetos y arreglos.
 * Utiliza la regex Unicode estándar para caracteres pictográficos extendidos y bloques suplementarios.
 */

export const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE0E}-\u{FE0F}\u{200D}]/gu;

/**
 * Remueve emojis de strings o recursivamente de objetos y arreglos.
 * Preserva instancias como Date, File, Blob y sanitiza campos de texto en FormData.
 *
 * @param {any} value
 * @param {boolean} [trimWhitespace=true] - Colapsa espacios redundantes causados por emojis removidos
 * @returns {any}
 */
export const stripEmojis = (value, trimWhitespace = true) => {
  if (typeof value === 'string') {
    const stripped = value.replace(EMOJI_REGEX, '');
    if (!trimWhitespace) return stripped;
    return stripped.replace(/[ \t]{2,}/g, ' ').replace(/[ \t]+$/gm, '').trim();
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripEmojis(item, trimWhitespace));
  }

  if (value !== null && typeof value === 'object') {
    // Sanitizar FormData preservando archivos/blobs
    if (typeof FormData !== 'undefined' && value instanceof FormData) {
      const sanitizedFormData = new FormData();
      for (const [key, val] of value.entries()) {
        if (typeof val === 'string') {
          sanitizedFormData.append(key, stripEmojis(val, trimWhitespace));
        } else {
          sanitizedFormData.append(key, val);
        }
      }
      return sanitizedFormData;
    }

    // Preservar Blobs, Archivos y Fechas sin alteración
    if (
      (typeof Blob !== 'undefined' && value instanceof Blob) ||
      value instanceof Date
    ) {
      return value;
    }

    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      const isSensitive = /pass|token|secret/i.test(key);
      cleaned[key] = isSensitive ? stripEmojis(val, false) : stripEmojis(val, trimWhitespace);
    }
    return cleaned;
  }

  return value;
};

export default stripEmojis;
