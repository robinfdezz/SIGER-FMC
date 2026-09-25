'use strict';

const { Resend } = require('resend');
const {
  templateClienteRecibido,
  templateClienteCancelado,
  templateClienteEntregado,
  templateClienteRecibo,
  templateInternoOrdenPendiente,
  templateInternoAsignacion,
  templateInternoFinalizada,
  templateInternoGenerico
} = require('./emailTemplates');

let resendClient = null;

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

/**
 * Envía un correo transaccional vía Resend.
 */
async function sendEmail({ to, subject, html, text }) {
  try {
    const client = getResendClient();
    if (!client) {
      return { ok: false, error: 'RESEND_API_KEY no configurada' };
    }

    let recipients = (Array.isArray(to) ? to : [to])
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean);

    if (!recipients.length || !subject) {
      return { ok: false, error: 'Destinatario o asunto inválido' };
    }

    // En desarrollo, Resend solo permite enviar al correo de la cuenta.
    // RESEND_TEST_TO redirige todos los envíos a ese buzón para poder probar plantillas.
    const testTo = String(process.env.RESEND_TEST_TO || '').trim().toLowerCase();
    const isDev = (process.env.NODE_ENV || 'development') !== 'production';
    let finalSubject = String(subject).slice(0, 200);
    if (isDev && testTo) {
      const intended = recipients.join(', ');
      recipients = [testTo];
      finalSubject = `[DEV → ${intended}] ${finalSubject}`.slice(0, 200);
      console.log(`📧 Resend DEV redirect: ${intended} → ${testTo}`);
    }

    const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    const { data, error } = await client.emails.send({
      from: `SIGER-FMC <${from}>`,
      to: recipients,
      subject: finalSubject,
      html: html || `<p>${text || subject}</p>`,
      text: text || subject
    });

    if (error) {
      console.warn('⚠️ Resend error:', error.message || error);
      return { ok: false, error: error.message || String(error) };
    }

    console.log(`✅ Correo enviado via Resend (${recipients.join(', ')}) id=${data?.id || 'n/a'}`);
    return { ok: true, id: data?.id };
  } catch (error) {
    console.warn('⚠️ No se pudo enviar correo Resend:', error.message);
    return { ok: false, error: error.message };
  }
}

function buildNotificationEmailHtml(payload) {
  return templateInternoGenerico(payload).html;
}

async function sendTemplatedEmail(to, built) {
  if (!to || !built) return { ok: false, error: 'Sin destinatario o plantilla' };
  const result = await sendEmail({
    to,
    subject: built.subject,
    html: built.html,
    text: built.subject
  });
  if (!result.ok) {
    console.warn(`⚠️ Plantilla no enviada a ${to}: ${result.error}`);
  }
  return result;
}

/** Correos al cliente */
async function emailClienteRecibido(to, data) {
  return sendTemplatedEmail(to, templateClienteRecibido(data));
}
async function emailClienteCancelado(to, data) {
  return sendTemplatedEmail(to, templateClienteCancelado(data));
}
async function emailClienteEntregado(to, data) {
  return sendTemplatedEmail(to, templateClienteEntregado(data));
}
async function emailClienteRecibo(to, data) {
  return sendTemplatedEmail(to, templateClienteRecibo(data));
}

/** Correos internos (solo asignación y finalización) */
async function emailInternoOrdenPendiente(to, data) {
  return sendTemplatedEmail(to, templateInternoOrdenPendiente(data));
}
async function emailInternoAsignacion(to, data) {
  return sendTemplatedEmail(to, templateInternoAsignacion(data));
}
async function emailInternoFinalizada(to, data) {
  return sendTemplatedEmail(to, templateInternoFinalizada(data));
}

module.exports = {
  sendEmail,
  buildNotificationEmailHtml,
  getResendClient,
  emailClienteRecibido,
  emailClienteCancelado,
  emailClienteEntregado,
  emailClienteRecibo,
  emailInternoOrdenPendiente,
  emailInternoAsignacion,
  emailInternoFinalizada,
  templateClienteRecibido,
  templateClienteCancelado,
  templateClienteEntregado,
  templateClienteRecibo,
  templateInternoOrdenPendiente,
  templateInternoAsignacion,
  templateInternoFinalizada
};
