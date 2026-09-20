import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Componente dinámico de Código QR para comprobantes de servicio y tickets térmicos.
 * Genera el enlace de seguimiento en vivo hacia el portal web del cliente.
 *
 * @param {Object} props
 * @param {string} [props.codigoTicket]   - Código único de la orden de servicio (ej: FMC-2026-0089)
 * @param {string} [props.dominioSistema] - Dominio corporativo del sistema (ej: https://franyermobilecenter.com)
 * @param {number} [props.size]           - Tamaño en píxeles del SVG (por defecto: 80)
 * @param {string} [props.className]      - Clases CSS aplicadas al SVG
 * @param {'L'|'M'|'Q'|'H'} [props.level] - Nivel de corrección de error QR (por defecto: 'M')
 * @param {string} [props.bgColor]        - Color de fondo (por defecto: '#ffffff')
 * @param {string} [props.fgColor]        - Color de módulos QR (por defecto: '#000000')
 * @param {boolean} [props.includeMargin] - Margen de zona de silencio (por defecto: false)
 */
export const TicketQR = ({
  codigoTicket = '',
  dominioSistema = 'https://franyermobilecenter.com',
  size = 80,
  className = '',
  level = 'M',
  bgColor = '#ffffff',
  fgColor = '#000000',
  includeMargin = false
}) => {
  const cleanDomain = (dominioSistema || 'https://franyermobilecenter.com').replace(/\/$/, '');
  const trackingUrl = `${cleanDomain}/estado/${encodeURIComponent(codigoTicket || '')}`;

  return (
    <QRCodeSVG
      value={trackingUrl}
      size={size}
      level={level}
      bgColor={bgColor}
      fgColor={fgColor}
      includeMargin={includeMargin}
      className={className}
    />
  );
};

export default TicketQR;
