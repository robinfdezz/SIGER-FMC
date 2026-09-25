'use strict';

const { getPool } = require('../config/db');
const {
  emailInternoAsignacion,
  emailInternoFinalizada
} = require('../config/email');

/** Únicos tipos internos que disparan correo (el resto solo campanita). */
const INTERNAL_EMAIL_TYPES = new Set(['ASIGNACION', 'ORDEN_FINALIZADA']);

/** Roles que siempre reciben campanita, aunque sean el actor del evento. */
const ALWAYS_NOTIFY_ROLES = new Set(['superadmin', 'admin_sucursal']);

/**
 * Crea notificaciones in-app. Correo interno solo en ASIGNACION y ORDEN_FINALIZADA.
 * Admin_Sucursal y SuperAdmin siempre se notifican (no se excluyen por ser el actor).
 */
async function createNotifications({
  usuarioIds = [],
  tipo,
  titulo,
  mensaje,
  servicioId = null,
  incidenciaId = null,
  enlace = null,
  excludeUserId = null,
  sendMail,
  meta = {}
}) {
  try {
    const pool = getPool();
    const rawIds = [...new Set(
      (usuarioIds || [])
        .map((id) => parseInt(id, 10))
        .filter((id) => Number.isInteger(id) && id > 0)
    )];

    if (!rawIds.length || !tipo || !titulo) return [];

    let ids = rawIds;
    const excludeId = excludeUserId != null ? Number(excludeUserId) : null;

    if (excludeId && Number.isInteger(excludeId) && excludeId > 0) {
      // No excluir a Admin/SuperAdmin: deben ver la campanita siempre
      const roleRes = await pool.query(
        `SELECT LOWER(re.nombre_rol) AS rol
         FROM datos_trabajadores dt
         JOIN roles_equipo re ON re.id = dt.rol_id
         WHERE dt.id = $1`,
        [excludeId]
      );
      const actorRol = String(roleRes.rows[0]?.rol || '');
      if (!ALWAYS_NOTIFY_ROLES.has(actorRol)) {
        ids = rawIds.filter((id) => id !== excludeId);
      }
    }

    if (!ids.length) return [];

    const tipoNorm = String(tipo).toUpperCase();
    const inserted = [];

    for (const usuarioId of ids) {
      const res = await pool.query(
        `INSERT INTO notificaciones
          (usuario_id, tipo, titulo, mensaje, servicio_id, incidencia_id, enlace)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, usuario_id, tipo, titulo, leida, created_at`,
        [
          usuarioId,
          String(tipo).slice(0, 50),
          String(titulo).slice(0, 150),
          mensaje ? String(mensaje).slice(0, 1000) : null,
          servicioId || null,
          incidenciaId || null,
          enlace ? String(enlace).slice(0, 255) : null
        ]
      );
      if (res.rows[0]) inserted.push(res.rows[0]);
    }

    const shouldMail =
      sendMail !== false &&
      INTERNAL_EMAIL_TYPES.has(tipoNorm) &&
      Boolean(process.env.RESEND_API_KEY) &&
      inserted.length > 0;

    if (shouldMail) {
      notifyUsersByEmail(ids, {
        tipo: tipoNorm,
        titulo,
        mensaje,
        enlace,
        servicioId,
        meta
      }).catch(() => {});
    }

    return inserted;
  } catch (error) {
    console.warn('⚠️ No se pudieron crear notificaciones:', error.message);
    return [];
  }
}

async function notifyUsersByEmail(usuarioIds, payload) {
  try {
    const pool = getPool();
    const res = await pool.query(
      `SELECT id, correo, nombre, apellido
       FROM datos_trabajadores
       WHERE id = ANY($1::int[])
         AND activo = TRUE
         AND correo IS NOT NULL
         AND TRIM(correo) <> ''`,
      [usuarioIds]
    );

    const tipo = String(payload.tipo || '').toUpperCase();
    if (!INTERNAL_EMAIL_TYPES.has(tipo)) return;

    const meta = payload.meta || {};

    await Promise.all(
      res.rows.map(async (user) => {
        const common = {
          usuario_nombre: `${user.nombre || ''} ${user.apellido || ''}`.trim(),
          codigo_ticket: meta.codigo_ticket,
          cliente_nombre: meta.cliente_nombre,
          equipo: meta.equipo,
          prioridad: meta.prioridad,
          falla_reportada: meta.falla_reportada || payload.mensaje,
          enlace: payload.enlace,
          servicio_id: payload.servicioId,
          titulo: payload.titulo,
          mensaje: payload.mensaje,
          fecha_entrega: meta.fecha_entrega
        };

        let result;
        if (tipo === 'ASIGNACION') {
          result = await emailInternoAsignacion(user.correo, common);
        } else if (tipo === 'ORDEN_FINALIZADA') {
          result = await emailInternoFinalizada(user.correo, common);
        } else {
          return;
        }

        if (!result.ok) {
          console.warn(`⚠️ Email no enviado a ${user.correo}: ${result.error}`);
        }
      })
    );
  } catch (error) {
    console.warn('⚠️ notifyUsersByEmail:', error.message);
  }
}

async function getBranchStaffIds(sucursalId, { includeTecnicos = false } = {}) {
  try {
    const pool = getPool();
    // Incluye siempre SuperAdmin (todas las sucursales) + Admin/Secretaria de la sede
    const roles = includeTecnicos
      ? ['SuperAdmin', 'Admin_Sucursal', 'Secretaria', 'Tecnico']
      : ['SuperAdmin', 'Admin_Sucursal', 'Secretaria'];

    const res = await pool.query(
      `SELECT dt.id
       FROM datos_trabajadores dt
       JOIN roles_equipo re ON re.id = dt.rol_id
       WHERE dt.activo = TRUE
         AND re.nombre_rol = ANY($1::text[])
         AND (
           LOWER(re.nombre_rol) IN ('superadmin')
           OR ($2::int IS NULL)
           OR dt.sucursal_id = $2
         )
       ORDER BY dt.id`,
      [roles, sucursalId ? parseInt(sucursalId, 10) : null]
    );

    return res.rows.map((r) => r.id);
  } catch (error) {
    console.warn('⚠️ getBranchStaffIds:', error.message);
    return [];
  }
}

async function getAssignedTechnicianIds(servicioId) {
  try {
    const pool = getPool();
    const res = await pool.query(
      `SELECT tecnico_id AS id
       FROM tecnicos_asignados
       WHERE servicio_id = $1`,
      [parseInt(servicioId, 10)]
    );
    return res.rows.map((r) => r.id);
  } catch (error) {
    console.warn('⚠️ getAssignedTechnicianIds:', error.message);
    return [];
  }
}

module.exports = {
  createNotifications,
  getBranchStaffIds,
  getAssignedTechnicianIds,
  notifyUsersByEmail
};
