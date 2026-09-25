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

function statusBadge(label, bg, color) {
  return `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${bg};color:${color};font-size:11px;font-weight:700;letter-spacing:0.02em;">${escapeHtml(label)}</span>`;
}

/**
 * Shell visual compartido
 */
function wrapEmail({
  preheader = '',
  eyebrow = 'Franyer Mobile Center',
  title,
  badgeHtml = '',
  bodyHtml,
  ctaLabel = null,
  ctaUrl = null,
  footerNote = 'Mensaje automático de SIGER-FMC. No responder a este correo.'
}) {
  const url = ctaUrl ? resolveUrl(ctaUrl) : null;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Sora,Arial,sans-serif;color:#18181b;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#18181b 0%,#27272a 60%,#3f3f46 100%);padding:22px 24px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <p style="margin:0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;font-weight:600;">${escapeHtml(eyebrow)}</p>
                    <p style="margin:6px 0 0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">SIGER<span style="color:#fb7185;">-FMC</span></p>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    ${badgeHtml || ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:3px;background:#e11d48;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;font-weight:800;color:#18181b;letter-spacing:-0.02em;">${escapeHtml(title)}</h1>
              ${bodyHtml}
              ${url && ctaLabel ? `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 8px;">
                <tr>
                  <td style="border-radius:12px;background:#e11d48;">
                    <a href="${url}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;">
                      ${escapeHtml(ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 24px;">
              <div style="border-top:1px solid #f4f4f5;padding-top:16px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#a1a1aa;">${escapeHtml(footerNote)}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#71717a;"><strong style="color:#3f3f46;">Franyer Mobile Center</strong> · Servicio técnico profesional</p>
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

function detailCard(rows = []) {
  const items = rows
    .filter((r) => r && r.value != null && String(r.value).trim() !== '')
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;font-size:12px;color:#71717a;width:38%;vertical-align:top;">${escapeHtml(r.label)}</td>
        <td style="padding:8px 0;font-size:13px;color:#18181b;font-weight:600;vertical-align:top;">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join('');

  return `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 8px;background:#fafafa;border:1px solid #f4f4f5;border-radius:12px;">
    <tr>
      <td style="padding:14px 16px;">
        <table width="100%" cellspacing="0" cellpadding="0">${items}</table>
      </td>
    </tr>
  </table>`;
}

/** Cliente: equipo recibido */
function templateClienteRecibido(data = {}) {
  const trackingUrl = data.codigo_ticket
    ? `/estado/${encodeURIComponent(data.codigo_ticket)}`
    : '/estado';

  return {
    subject: `Equipo recibido · ${data.codigo_ticket || 'Orden'}`,
    html: wrapEmail({
      preheader: `Recibimos tu ${data.equipo || 'equipo'} en taller. Ticket ${data.codigo_ticket || ''}`,
      title: '¡Recibimos tu equipo!',
      badgeHtml: statusBadge('Recibido', '#f4f4f5', '#52525b'),
      ctaLabel: 'Seguir mi orden',
      ctaUrl: trackingUrl,
      bodyHtml: `
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
          Hola <strong>${escapeHtml(data.cliente_nombre || 'cliente')}</strong>, confirmamos el ingreso de tu equipo en
          <strong>Franyer Mobile Center</strong>. Nuestro equipo técnico iniciará el diagnóstico.
        </p>
        ${detailCard([
          { label: 'Ticket', value: data.codigo_ticket },
          { label: 'Equipo', value: data.equipo },
          { label: 'Falla reportada', value: data.falla_reportada },
          { label: 'Sucursal', value: data.sucursal },
          { label: 'Entrega estimada', value: data.fecha_entrega_estimada }
        ])}
        <p style="margin:12px 0 0;font-size:13px;line-height:1.55;color:#71717a;">
          Guarda este correo. Con el código de ticket puedes consultar el estado en cualquier momento.
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
  templateClienteRecibido,
  templateClienteCancelado,
  templateClienteEntregado,
  templateClienteRecibo,
  templateInternoOrdenPendiente,
  templateInternoAsignacion,
  templateInternoFinalizada,
  templateInternoGenerico
};
