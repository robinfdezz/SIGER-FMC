'use strict';

const { getPool } = require('../config/db');

function isUserSuperAdmin(user) {
  if (!user) return false;
  const role = String(user.rol_nombre || user.rol || '').toLowerCase();
  return role === 'superadmin' || role === 'superadministrador' || role.includes('superadmin');
}

/**
 * GET /api/buscar?q=
 * Búsqueda predictiva unificada: órdenes, clientes y equipos.
 */
const globalSearch = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(200).json({
        ok: true,
        success: true,
        data: { ordenes: [], clientes: [], equipos: [], query: q }
      });
    }

    const pool = getPool();
    const isSuperAdmin = isUserSuperAdmin(req.user);
    let sucursalId = null;

    if (!isSuperAdmin) {
      sucursalId = req.user?.sucursal_id ? parseInt(req.user.sucursal_id, 10) : null;
      if (!sucursalId) {
        return res.status(403).json({
          ok: false,
          success: false,
          message: 'Acceso denegado: el usuario no tiene sucursal asignada.'
        });
      }
    } else if (req.query.sucursal_id && req.query.sucursal_id !== 'all') {
      sucursalId = parseInt(req.query.sucursal_id, 10);
    }

    const like = `%${q.replace(/[%_]/g, '\\$&')}%`;
    const branchClause = sucursalId ? ' AND sr.sucursal_id = $2' : '';
    const ordenParams = sucursalId ? [like, sucursalId] : [like];

    const [ordenesRes, clientesRes, equiposRes] = await Promise.all([
      pool.query(
        `SELECT
           sr.id,
           sr.codigo_ticket,
           COALESCE(
             sr.nombre_cliente,
             NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''),
             c.nombre,
             'Cliente'
           ) AS cliente_nombre,
           TRIM(CONCAT(sr.marca_equipo, ' ', sr.modelo_equipo)) AS equipo,
           sr.falla_reportada,
           sr.prioridad,
           es.nombre_estado,
           es.codigo_estado,
           es.color_badge,
           es.orden_flujo,
           'orden' AS tipo_resultado
         FROM servicios_recepcion sr
         JOIN estados_servicio es ON es.id = sr.estado_actual_id
         LEFT JOIN clientes c ON c.id = sr.cliente_id
         WHERE sr.activo = TRUE
           AND (
             sr.codigo_ticket ILIKE $1
             OR sr.falla_reportada ILIKE $1
             OR COALESCE(sr.nombre_cliente, '') ILIKE $1
             OR COALESCE(c.nombre, '') ILIKE $1
             OR COALESCE(c.apellido, '') ILIKE $1
           )
           ${branchClause}
         ORDER BY sr.updated_at DESC NULLS LAST
         LIMIT 8`,
        ordenParams
      ),
      pool.query(
        `SELECT
           cl.id,
           TRIM(CONCAT(cl.nombre, ' ', cl.apellido)) AS nombre_completo,
           cl.cedula_rnc,
           cl.telefono,
           cl.correo,
           cl.activo,
           'cliente' AS tipo_resultado
         FROM clientes cl
         WHERE (
             cl.nombre ILIKE $1
             OR cl.apellido ILIKE $1
             OR TRIM(CONCAT(cl.nombre, ' ', cl.apellido)) ILIKE $1
             OR cl.cedula_rnc ILIKE $1
             OR cl.telefono ILIKE $1
             OR COALESCE(cl.telefono_adicional, '') ILIKE $1
             OR COALESCE(cl.correo, '') ILIKE $1
           )
         ORDER BY cl.activo DESC, cl.updated_at DESC NULLS LAST
         LIMIT 6`,
        [like]
      ),
      pool.query(
        `SELECT
           sr.id,
           sr.codigo_ticket,
           sr.marca_equipo,
           sr.modelo_equipo,
           sr.num_serie_imei,
           TRIM(CONCAT(sr.marca_equipo, ' ', sr.modelo_equipo)) AS equipo,
           COALESCE(
             sr.nombre_cliente,
             NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''),
             c.nombre,
             'Cliente'
           ) AS cliente_nombre,
           es.nombre_estado,
           es.color_badge,
           'equipo' AS tipo_resultado
         FROM servicios_recepcion sr
         JOIN estados_servicio es ON es.id = sr.estado_actual_id
         LEFT JOIN clientes c ON c.id = sr.cliente_id
         WHERE sr.activo = TRUE
           AND (
             sr.marca_equipo ILIKE $1
             OR sr.modelo_equipo ILIKE $1
             OR TRIM(CONCAT(sr.marca_equipo, ' ', sr.modelo_equipo)) ILIKE $1
             OR COALESCE(sr.num_serie_imei, '') ILIKE $1
           )
           ${branchClause}
         ORDER BY sr.updated_at DESC NULLS LAST
         LIMIT 6`,
        ordenParams
      )
    ]);

    return res.status(200).json({
      ok: true,
      success: true,
      data: {
        query: q,
        ordenes: ordenesRes.rows,
        clientes: clientesRes.rows,
        equipos: equiposRes.rows
      }
    });
  } catch (error) {
    console.error('❌ Error en globalSearch:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al ejecutar la búsqueda global.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { globalSearch };
