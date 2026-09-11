const { getPool } = require('../config/db');

/**
 * Obtener roles del sistema
 * GET /api/catalogos/roles
 */
const getRoles = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query('SELECT id, nombre_rol, descripcion FROM roles_equipo ORDER BY id ASC');
    return res.status(200).json({
      ok: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error en getRoles:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar catálogo de roles.'
    });
  }
};

/**
 * Obtener sucursales activas
 * GET /api/catalogos/sucursales
 */
const getSucursales = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, companhia_id, codigo_sucursal, nombre_sucursal, prefijo_ticket, telefono, direccion, activo FROM datos_sucursales WHERE activo = TRUE ORDER BY id ASC'
    );
    return res.status(200).json({
      ok: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error en getSucursales:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar catálogo de sucursales.'
    });
  }
};

/**
 * Obtener categorías de dispositivos activas, ordenadas alfabéticamente
 * GET /api/catalogos/categorias
 * GET /api/categorias-dispositivos
 */
const getCategorias = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT
         id,
         nombre_categoria AS nombre,
         descripcion,
         activo
       FROM categorias_dispositivos
       WHERE activo = TRUE
       ORDER BY nombre_categoria ASC`
    );
    return res.status(200).json({
      ok: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error en getCategorias:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar catálogo de categorías.'
    });
  }
};

/**
 * Obtener estados de servicio ordenados por orden_flujo
 * GET /api/catalogos/estados
 */
const getEstados = async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, codigo_estado, nombre_estado, color_badge, orden_flujo FROM estados_servicio ORDER BY orden_flujo ASC'
    );
    return res.status(200).json({
      success: true,
      ok: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ Error en getEstados:', error);
    return res.status(500).json({
      success: false,
      ok: false,
      message: 'Error al consultar catálogo de estados.'
    });
  }
};

module.exports = {
  getRoles,
  getSucursales,
  getCategorias,
  getEstados
};
