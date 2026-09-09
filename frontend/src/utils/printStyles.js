/**
 * Inyecta dinámicamente las reglas CSS para impresión térmica (@page y dimensiones)
 *
 * @param {'ticket'|'sticker'} type
 * @param {Object} options
 * @param {number} [options.ancho] - En milímetros (mm)
 * @param {number} [options.alto]  - En milímetros (mm) (requerido para sticker)
 */
export const injectThermalPrintStyles = (type, options = {}) => {
  const styleId = 'thermal-print-page-style';
  let styleEl = document.getElementById(styleId);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  if (type === 'sticker') {
    const ancho = Number(options.ancho) || 50;
    const alto = Number(options.alto) || 30;

    styleEl.textContent = `
      @page {
        size: ${ancho}mm ${alto}mm !important;
        margin: 0 !important;
      }
      @media print {
        html, body {
          width: ${ancho}mm !important;
          height: ${alto}mm !important;
          max-width: ${ancho}mm !important;
          max-height: ${alto}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > *:not(#print-mount-point) {
          display: none !important;
        }
        #print-mount-point {
          width: ${ancho}mm !important;
          height: ${alto}mm !important;
          max-width: ${ancho}mm !important;
          max-height: ${alto}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          overflow: hidden !important;
          background: #ffffff !important;
          color: #000000 !important;
          z-index: 99999999 !important;
        }
        #print-mount-point, #print-mount-point * {
          visibility: visible !important;
        }
      }
    `;
  } else {
    // Ticket continuo (80mm o 58mm)
    const ancho = Number(options.ancho) || 80;

    styleEl.textContent = `
      @page {
        size: ${ancho}mm auto !important;
        margin: 0 !important;
      }
      @media print {
        html, body {
          width: ${ancho}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: #ffffff !important;
          color: #000000 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > *:not(#print-mount-point) {
          display: none !important;
        }
        #print-mount-point {
          width: ${ancho}mm !important;
          margin: 0 !important;
          padding: 0 !important;
          display: block !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
          z-index: 99999999 !important;
        }
        #print-mount-point, #print-mount-point * {
          visibility: visible !important;
        }
      }
    `;
  }
};

export default injectThermalPrintStyles;
