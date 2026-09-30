/**
 * Copia texto al portapapeles de manera universal y robusta.
 * Funciona en localhost, HTTPS, redes locales (HTTP IP), navegadores modernos y antiguos.
 *
 * @param {string} text - El texto a copiar
 * @returns {Promise<boolean>} - Devuelve true si se copió exitosamente, false en caso contrario
 */
export async function copyToClipboard(text) {
  if (typeof text !== 'string' || !text) {
    return false;
  }

  // 1. Intentar con Clipboard API moderna si está disponible y en contexto seguro
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API writeText no permitida o falló, intentando fallback:', err);
    }
  }

  // 2. Método de contingencia (fallback) compatible con HTTP, IPs locales y navegadores legacy
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';
    textArea.style.opacity = '0';
    textArea.style.pointerEvents = 'none';
    textArea.setAttribute('readonly', '');

    document.body.appendChild(textArea);
    textArea.focus({ preventScroll: true });
    textArea.select();
    textArea.setSelectionRange(0, text.length);

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (successful) {
      return true;
    }
  } catch (fallbackErr) {
    console.warn('Fallback document.execCommand falló:', fallbackErr);
  }

  return false;
}
