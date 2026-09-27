'use strict';

const { getPool } = require('../config/db');

function noStore(res) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

/**
 * GET /api/notificaciones
 * Lista paginada de notificaciones del usuario autenticado.
 */
const getNotificaciones = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado.' });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const soloNoLeidas = String(req.query.unread || '') === 'true';

    const pool = getPool();
    const conditions = ['n.usuario_id = $1'];
    const params = [usuarioId];

    if (soloNoLeidas) {
      conditions.push('n.leida = FALSE');
    }

    const where = conditions.join(' AND ');

    const [listRes, countRes] = await Promise.all([
      pool.query(
        `SELECT
           n.id,
           n.tipo,
           n.titulo,
           n.mensaje,
           n.servicio_id,
           n.incidencia_id,
           n.enlace,
           n.leida,
           n.created_at,
           sr.codigo_ticket
         FROM notificaciones n
         LEFT JOIN servicios_recepcion sr ON sr.id = n.servicio_id
         WHERE ${where}
         ORDER BY n.leida ASC, n.created_at DESC
         LIMIT $${params.length + 1}`,
        [...params, limit]
      ),
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE leida = FALSE)::int AS no_leidas,
           COUNT(*)::int AS total
         FROM notificaciones
         WHERE usuario_id = $1`,
        [usuarioId]
      )
    ]);

    noStore(res);
    return res.status(200).json({
      ok: true,
      success: true,
      data: listRes.rows,
      meta: {
        no_leidas: countRes.rows[0]?.no_leidas || 0,
        total: countRes.rows[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('❌ Error en getNotificaciones:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al obtener notificaciones.'
    });
  }
};

/**
 * GET /api/notificaciones/conteo
 */
const getConteoNotificaciones = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado.' });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS no_leidas
       FROM notificaciones
       WHERE usuario_id = $1 AND leida = FALSE`,
      [usuarioId]
    );

    noStore(res);
    return res.status(200).json({
      ok: true,
      success: true,
      no_leidas: result.rows[0]?.no_leidas || 0
    });
  } catch (error) {
    console.error('❌ Error en getConteoNotificaciones:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al contar notificaciones.'
    });
  }
};

/**
 * PATCH /api/notificaciones/:id/leer
 */
const marcarNotificacionLeida = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const id = parseInt(req.params.id, 10);
    if (!usuarioId || !id) {
      return res.status(400).json({ ok: false, message: 'Solicitud inválida.' });
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE notificaciones
       SET leida = TRUE
       WHERE id = $1 AND usuario_id = $2
       RETURNING id, leida`,
      [id, usuarioId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Notificación no encontrada.' });
    }

    return res.status(200).json({ ok: true, success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en marcarNotificacionLeida:', error);
    return res.status(500).json({ ok: false, message: 'Error al marcar la notificación.' });
  }
};

/**
 * PATCH /api/notificaciones/leer-todas
 */
const marcarTodasLeidas = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado.' });
    }

    const pool = getPool();
    const result = await pool.query(
      `UPDATE notificaciones
       SET leida = TRUE
       WHERE usuario_id = $1 AND leida = FALSE`,
      [usuarioId]
    );

    return res.status(200).json({
      ok: true,
      success: true,
      actualizadas: result.rowCount || 0
    });
  } catch (error) {
    console.error('❌ Error en marcarTodasLeidas:', error);
    return res.status(500).json({ ok: false, message: 'Error al marcar notificaciones.' });
  }
};

module.exports = {
  getNotificaciones,
  getConteoNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas
};
