'use strict';

/**
 * Plantillas HTML de correo SIGER-FMC
 * Paleta: brand #E11D48, zinc, tipografía tipo Sora/Segoe UI
 * Compatible con editores Resend (HTML + CSS inline).
 */

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return 'RD$ 0.00';
  return `RD$ ${n.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function resolveUrl(enlace) {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  if (!enlace) return clientUrl;
  if (String(enlace).startsWith('http')) return String(enlace);
  return `${clientUrl}${enlace.startsWith('/') ? '' : '/'}${enlace}`;
}

function formatPersonName(name) {
  if (!name) return 'Cliente';
  const str = String(name).trim();
  if (!str) return 'Cliente';
  if (str === str.toUpperCase() && str.length > 2) {
    return str
      .toLowerCase()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return str;
}

function formatEstimatedDate(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  try {
    const formatted = d.toLocaleDateString('es-DO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch (_) {
    return String(val);
  }
}

function statusBadge(label, bg, color, borderColor = null) {
  const borderStyle = borderColor ? `border:1px solid ${borderColor};` : '';
  return `<span style="display:inline-block;padding:5px 12px;border-radius:999px;background:${bg};color:${color};${borderStyle}font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap;line-height:1;">${escapeHtml(label)}</span>`;
}

/**
 * Shell visual compartido
 */
function wrapEmail({
  preheader = '',
  eyebrow = 'FRANYER MOBILE CENTER',
  logoUrl = null,
  title,
  badgeHtml = '',
  bodyHtml,
  ctaLabel = null,
  ctaUrl = null,
  centerCta = true,
  headerTheme = 'light',
  footerNote = 'Notificación automática emitida por el sistema SIGER-FMC. Por favor no respondas directamente a este correo.'
}) {
  const url = ctaUrl ? resolveUrl(ctaUrl) : null;
  const isDarkHeader = headerTheme === 'dark';

  const headerBg = isDarkHeader
    ? 'background:linear-gradient(135deg,#18181b 0%,#27272a 60%,#3f3f46 100%);'
    : 'background:#FFFFFF;border-bottom:1px solid #E2E8F0;';
  const eyebrowColor = isDarkHeader ? '#A1A1AA' : '#64748B';
  const logoMainColor = isDarkHeader ? '#0F172A' : '#0F172A';

  const cleanLogoUrl = logoUrl && String(logoUrl).trim() !== '' ? String(logoUrl).trim() : null;

  const brandingHtml = cleanLogoUrl
    ? `<img src="${escapeHtml(cleanLogoUrl)}" alt="Logo" height="38" style="max-height: 40px; width: auto; display: block; border: 0; outline: none;" />`
    : `
      <p style="margin:0;font-size:11px;line-height:1.2;letter-spacing:0.1em;text-transform:uppercase;color:${eyebrowColor};font-weight:700;">
        ${escapeHtml(eyebrow)}
      </p>
      <p style="margin:4px 0 0;font-size:22px;line-height:1.2;font-weight:800;color:${logoMainColor};letter-spacing:-0.03em;">
        SIGER<span style="color:#DC2626;">-FMC</span>
      </p>
    `;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0F172A;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F1F5F9;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05),0 8px 10px -6px rgba(0,0,0,0.03);">
          <!-- Línea de acento superior corporativa -->
          <tr>
            <td style="height:4px;background:linear-gradient(90deg,#DC2626 0%,#E11D48 100%);background-color:#DC2626;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Header / Cabecera -->
          <tr>
            <td style="${headerBg}padding:24px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    ${brandingHtml}
                  </td>
                  <td align="right" style="vertical-align:middle;text-align:right;">
                    ${badgeHtml || ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Contenido Principal -->
          <tr>
            <td style="padding:28px 28px 12px;background:#FFFFFF;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;font-weight:800;color:#0F172A;letter-spacing:-0.02em;">
                ${escapeHtml(title)}
              </h1>
              ${bodyHtml}
              ${url && ctaLabel ? `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 14px;">
                <tr>
                  <td align="${centerCta ? 'center' : 'left'}" style="text-align:${centerCta ? 'center' : 'left'};">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="${centerCta ? 'margin:0 auto;' : ''}">
                      <tr>
                        <td align="center" style="border-radius:8px;background:linear-gradient(135deg,#DC2626 0%,#E11D48 100%);background-color:#DC2626;box-shadow:0 4px 14px rgba(220,38,38,0.25);">
                          <a href="${url}" target="_blank" style="display:inline-block;padding:14px 28px;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:0.02em;border-radius:8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                            ${escapeHtml(ctaLabel)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:22px 28px 26px;background:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0 0 10px;font-size:12px;line-height:1.6;color:#64748B;">
                ${escapeHtml(footerNote)}
              </p>
              <div style="border-top:1px solid #E2E8F0;padding-top:12px;margin-top:12px;">
                <p style="margin:0;font-size:12px;line-height:1.6;color:#64748B;">
                  <strong style="color:#1E293B;">Franyer Mobile Center</strong> · Especialistas en reparación y servicio técnico integral de dispositivos móviles.
                </p>
                <p style="margin:4px 0 0;font-size:11.5px;line-height:1.5;color:#94A3B8;">
                  ¿Dudas con tu servicio? Contáctanos a través de nuestros canales oficiales o visita tu sucursal más cercana.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ticketInfoCard(rows = []) {
  const items = rows
    .filter((r) => r && r.value != null && String(r.value).trim() !== '')
    .map((r, idx, arr) => {
      const isLast = idx === arr.length - 1;
      const borderBottom = isLast ? '' : 'border-bottom:1px solid #E2E8F0;';
      const isTicket = r.isTicket || (r.label && String(r.label).toLowerCase().trim() === 'ticket');
      const valueHtml = isTicket
        ? `<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Courier New',monospace;font-size:13px;font-weight:700;color:#0F172A;">${escapeHtml(r.value)}</span>`
        : `<span style="font-weight:600;color:#0F172A;">${escapeHtml(r.value)}</span>`;

      return `
      <tr>
        <td style="padding:11px 12px 11px 0;font-size:13px;color:#64748B;font-weight:500;width:38%;vertical-align:top;${borderBottom}">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding:11px 0 11px 12px;font-size:13px;vertical-align:top;${borderBottom}">
          ${valueHtml}
        </td>
      </tr>`;
    })
    .join('');

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;border-collapse:separate;overflow:hidden;">
    <tr>
      <td style="padding:8px 18px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
          ${items}
        </table>
      </td>
    </tr>
  </table>`;
}

function detailCard(rows = []) {
  return ticketInfoCard(rows);
}

/** Cliente: equipo recibido */
function templateClienteRecibido(data = {}) {
  const trackingUrl = data.codigo_ticket
    ? `/estado/${encodeURIComponent(data.codigo_ticket)}`
    : '/estado';

  const clienteNombre = formatPersonName(data.cliente_nombre);
  const equipoDesc = data.equipo || data.dispositivo || data.modelo || 'Dispositivo';
  const fechaEstimada = formatEstimatedDate(data.fecha_entrega_estimada);
  const logoUrl =
    data.logo_url ||
    data.logoUrl ||
    process.env.COMPANY_LOGO_URL ||
    'https://res.cloudinary.com/azldehf5/image/upload/v1788389024/siger-fmc/companhia/pn2urmsb7a4eioqbfphj.png';

  const ticketRows = [
    { label: 'Ticket', value: data.codigo_ticket || 'Pendiente', isTicket: true },
    { label: 'Dispositivo / Modelo', value: equipoDesc },
    { label: 'Falla Reportada', value: data.falla_reportada || 'Revisión y diagnóstico técnico' },
    { label: 'Sucursal', value: data.sucursal || 'Sucursal Principal' },
    ...(fechaEstimada ? [{ label: 'Fecha Estimada', value: fechaEstimada }] : [])
  ];

  return {
    subject: `Equipo recibido · ${data.codigo_ticket || 'SIGER-FMC'}`,
    html: wrapEmail({
      preheader: `Recibimos tu ${equipoDesc} en taller. Ticket ${data.codigo_ticket || ''}`,
      eyebrow: 'FRANYER MOBILE CENTER',
      logoUrl,
      title: `¡Hola, ${clienteNombre}!`,
      badgeHtml: `<span style="color:#64748B;font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;white-space:nowrap;line-height:1.2;">RECIBIDO EN TALLER</span>`,
      ctaLabel: 'Rastrear Estado de mi Equipo →',
      ctaUrl: trackingUrl,
      centerCta: true,
      footerNote: 'Esta es una notificación automática generada por el sistema SIGER-FMC al registrar la recepción de tu equipo en taller.',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">
          Confirmamos el ingreso satisfactorio de tu equipo en <strong>Franyer Mobile Center</strong>. Nuestro departamento técnico ha registrado la orden e iniciará el protocolo de diagnóstico.
        </p>
        ${ticketInfoCard(ticketRows)}
        <p style="margin:16px 0 0;font-size:13px;line-height:1.55;color:#64748B;">
          Guarda este correo para consultar en todo momento el avance de la reparación, autorizar presupuestos o revisar detalles técnicos de tu servicio.
        </p>`
    })
  };
}

/** Cliente: orden cancelada */
function templateClienteCancelado(data = {}) {
  const trackingUrl = data.codigo_ticket
    ? `/estado/${encodeURIComponent(data.codigo_ticket)}`
    : '/estado';

  return {
    subject: `Orden cancelada · ${data.codigo_ticket || 'Servicio'}`,
    html: wrapEmail({
      preheader: `Tu orden ${data.codigo_ticket || ''} fue cancelada`,
      title: 'Tu orden fue cancelada',
      badgeHtml: statusBadge('Cancelado', '#fef2f2', '#dc2626'),
      ctaLabel: 'Ver detalle',
      ctaUrl: trackingUrl,
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Hola <strong>${escapeHtml(data.cliente_nombre || 'cliente')}</strong>, te informamos que la orden
          <strong>${escapeHtml(data.codigo_ticket || '')}</strong> fue cancelada formalmente en taller.
        </p>
        ${detailCard([
          { label: 'Ticket', value: data.codigo_ticket },
          { label: 'Equipo', value: data.equipo },
          { label: 'Motivo', value: data.motivo_cancelacion }
        ])}
        <p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#71717a;">
          Si tienes dudas o deseas reabrir el servicio, comunícate con tu sucursal.
        </p>`
    })
  };
}

/** Cliente: equipo entregado */
function templateClienteEntregado(data = {}) {
  return {
    subject: `Equipo entregado · ${data.codigo_ticket || 'Orden'}`,
    html: wrapEmail({
      preheader: `Tu ${data.equipo || 'equipo'} ya fue entregado`,
      title: '¡Tu equipo fue entregado!',
      badgeHtml: statusBadge('Entregado', '#ecfdf5', '#059669'),
      ctaLabel: 'Ver seguimiento',
      ctaUrl: data.codigo_ticket ? `/estado/${encodeURIComponent(data.codigo_ticket)}` : '/estado',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Hola <strong>${escapeHtml(data.cliente_nombre || 'cliente')}</strong>, confirmamos la entrega de tu equipo.
          Gracias por confiar en <strong>Franyer Mobile Center</strong>.
        </p>
        ${detailCard([
          { label: 'Ticket', value: data.codigo_ticket },
          { label: 'Equipo', value: data.equipo },
          { label: 'Fecha de entrega', value: data.fecha_entrega },
          { label: 'Método de pago', value: data.metodo_pago }
        ])}
        <p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#71717a;">
          En unos momentos recibirás un segundo correo con el recibo digital de liquidación.
        </p>`
    })
  };
}

/** Cliente: recibo digital post-entrega */
function templateClienteRecibo(data = {}) {
  const lines = Array.isArray(data.lineas) ? data.lineas : [];
  const lineRows = lines
    .map(
      (l) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#3f3f46;border-bottom:1px solid #f4f4f5;">${escapeHtml(l.concepto)}</td>
        <td style="padding:8px 0;font-size:13px;color:#18181b;font-weight:600;text-align:right;border-bottom:1px solid #f4f4f5;">${escapeHtml(formatMoney(l.monto))}</td>
      </tr>`
    )
    .join('');

  return {
    subject: `Recibo digital · ${data.codigo_ticket || 'Liquidación'}`,
    html: wrapEmail({
      preheader: `Recibo de liquidación ${data.codigo_ticket || ''}`,
      title: 'Recibo digital de entrega',
      badgeHtml: statusBadge('Pagado', '#fff1f2', '#e11d48'),
      ctaLabel: 'Consultar orden',
      ctaUrl: data.codigo_ticket ? `/estado/${encodeURIComponent(data.codigo_ticket)}` : '/estado',
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Hola <strong>${escapeHtml(data.cliente_nombre || 'cliente')}</strong>, adjuntamos el resumen contable
          de tu servicio <strong>${escapeHtml(data.codigo_ticket || '')}</strong>.
        </p>
        ${detailCard([
          { label: 'Equipo', value: data.equipo },
          { label: 'Método de pago', value: data.metodo_pago },
          { label: 'Fecha', value: data.fecha_entrega }
        ])}
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0;border:1px solid #f4f4f5;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:14px 16px;background:#fafafa;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#71717a;text-transform:uppercase;letter-spacing:0.06em;">Desglose</p>
              <table width="100%" cellspacing="0" cellpadding="0">
                ${lineRows || `<tr><td style="padding:8px 0;font-size:13px;color:#71717a;">Sin líneas adicionales</td></tr>`}
                <tr>
                  <td style="padding:12px 0 0;font-size:14px;font-weight:800;color:#18181b;">Total liquidado</td>
                  <td style="padding:12px 0 0;font-size:14px;font-weight:800;color:#e11d48;text-align:right;">${escapeHtml(formatMoney(data.total))}</td>
                </tr>
                ${data.anticipo != null ? `
                <tr>
                  <td style="padding:6px 0 0;font-size:12px;color:#71717a;">Anticipo aplicado</td>
                  <td style="padding:6px 0 0;font-size:12px;color:#71717a;text-align:right;">${escapeHtml(formatMoney(data.anticipo))}</td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
        </table>
        <p style="margin:8px 0 0;font-size:12px;line-height:1.5;color:#a1a1aa;">
          Conserva este recibo como comprobante. La garantía aplica según los términos indicados en tu ticket de recepción.
        </p>`
    })
  };
}

/** Interno: orden pendiente / nueva en sucursal */
function templateInternoOrdenPendiente(data = {}) {
  return {
    subject: `[Taller] Orden pendiente ${data.codigo_ticket || ''}`.trim(),
    html: wrapEmail({
      preheader: `Nueva orden pendiente ${data.codigo_ticket || ''}`,
      eyebrow: 'Alerta interna · SIGER-FMC',
      title: 'Nueva orden pendiente en taller',
      badgeHtml: statusBadge(data.prioridad === 'urgente' ? 'Urgente' : 'Pendiente', data.prioridad === 'urgente' ? '#fef2f2' : '#eff6ff', data.prioridad === 'urgente' ? '#dc2626' : '#2563eb'),
      ctaLabel: 'Abrir en Banco de Trabajo',
      ctaUrl: data.enlace || (data.servicio_id ? `/taller?ordenId=${data.servicio_id}` : '/taller'),
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Hola <strong>${escapeHtml(data.usuario_nombre || 'colaborador')}</strong>, hay una orden que requiere atención en tu sucursal.
        </p>
        ${detailCard([
          { label: 'Ticket', value: data.codigo_ticket },
          { label: 'Cliente', value: data.cliente_nombre },
          { label: 'Equipo', value: data.equipo },
          { label: 'Prioridad', value: data.prioridad },
          { label: 'Falla', value: data.falla_reportada }
        ])}`
    })
  };
}

/** Interno: orden asignada al técnico */
function templateInternoAsignacion(data = {}) {
  return {
    subject: `[Taller] Te asignaron ${data.codigo_ticket || 'una orden'}`,
    html: wrapEmail({
      preheader: `Nueva asignación ${data.codigo_ticket || ''}`,
      eyebrow: 'Alerta interna · SIGER-FMC',
      title: 'Se te asignó una orden',
      badgeHtml: statusBadge('Asignada', '#f5f3ff', '#7c3aed'),
      ctaLabel: 'Ver orden asignada',
      ctaUrl: data.enlace || (data.servicio_id ? `/taller?ordenId=${data.servicio_id}` : '/taller'),
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Hola <strong>${escapeHtml(data.usuario_nombre || 'técnico')}</strong>, quedaste asignado como responsable técnico de esta orden.
        </p>
        ${detailCard([
          { label: 'Ticket', value: data.codigo_ticket },
          { label: 'Cliente', value: data.cliente_nombre },
          { label: 'Equipo', value: data.equipo },
          { label: 'Prioridad', value: data.prioridad },
          { label: 'Falla', value: data.falla_reportada }
        ])}
        <p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#71717a;">
          Entra al Banco de Trabajo para actualizar el estado y registrar incidencias.
        </p>`
    })
  };
}

/** Interno: orden finalizada / entregada (técnico asignado) */
function templateInternoFinalizada(data = {}) {
  return {
    subject: `[Taller] Finalizó ${data.codigo_ticket || 'tu orden'}`,
    html: wrapEmail({
      preheader: `Orden finalizada ${data.codigo_ticket || ''}`,
      eyebrow: 'Alerta interna · SIGER-FMC',
      title: 'Tu orden fue finalizada',
      badgeHtml: statusBadge('Finalizada', '#ecfdf5', '#059669'),
      ctaLabel: 'Ver orden',
      ctaUrl: data.enlace || (data.servicio_id ? `/taller?ordenId=${data.servicio_id}` : '/taller'),
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Hola <strong>${escapeHtml(data.usuario_nombre || 'técnico')}</strong>, la orden que tenías asignada ya fue entregada al cliente.
        </p>
        ${detailCard([
          { label: 'Ticket', value: data.codigo_ticket },
          { label: 'Cliente', value: data.cliente_nombre },
          { label: 'Equipo', value: data.equipo },
          { label: 'Fecha de entrega', value: data.fecha_entrega }
        ])}`
    })
  };
}

/** Interno genérico (campanita) */
function templateInternoGenerico(data = {}) {
  return {
    subject: `[SIGER-FMC] ${data.titulo || 'Nueva alerta'}`,
    html: wrapEmail({
      preheader: data.mensaje || data.titulo || 'Alerta operativa',
      eyebrow: 'Alerta interna · SIGER-FMC',
      title: data.titulo || 'Nueva alerta operativa',
      badgeHtml: statusBadge('Sistema', '#f4f4f5', '#52525b'),
      ctaLabel: 'Abrir SIGER-FMC',
      ctaUrl: data.enlace || '/dashboard',
      bodyHtml: `
        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#3f3f46;">
          ${escapeHtml(data.mensaje || 'Tienes una nueva notificación en el sistema.')}
        </p>`
    })
  };
}

module.exports = {
  escapeHtml,
  formatMoney,
  wrapEmail,
  ticketInfoCard,
  detailCard,
  statusBadge,
  templateClienteRecibido,
  templateClienteCancelado,
  templateClienteEntregado,
  templateClienteRecibo,
  templateInternoOrdenPendiente,
  templateInternoAsignacion,
  templateInternoFinalizada,
  templateInternoGenerico
};
