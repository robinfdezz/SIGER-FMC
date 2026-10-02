'use strict';

const { getPool } = require('../config/db');

// ============================================================
// HELPERS PRIVADOS
// ============================================================

/**
 * Determina si el usuario tiene privilegios de SuperAdmin
 */
function isUserSuperAdmin(user) {
  if (!user) return false;
  const roleName = String(user.rol_nombre || user.rol || '').toLowerCase();
  const roleId = Number(user.rol_id);
  return roleName === 'superadmin' || roleId === 1;
}

/**
 * Valida formato YYYY-MM-DD
 */
function isValidDateString(str) {
  if (!str || typeof str !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

/**
 * Obtiene la fecha actual en America/Santo_Domingo formateada como YYYY-MM-DD
 */
function getTodaySantoDomingo() {
  const d = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santo_Domingo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d); // Retorna YYYY-MM-DD
}

/**
 * Obtiene el primer día del mes actual en America/Santo_Domingo
 */
function getFirstDayOfMonthSantoDomingo() {
  const today = getTodaySantoDomingo();
  const [year, month] = today.split('-');
  return `${year}-${month}-01`;
}

// ============================================================
// GET /api/reportes/resumen — Resumen analítico estructurado
// ============================================================
const getReportesResumen = async (req, res) => {
  try {
    const pool = getPool();
    const isSuperAdmin = isUserSuperAdmin(req.user);
    const userRole = String(req.user?.rol_nombre || req.user?.rol || '').toLowerCase();

    // 1. Manejo de aislamiento por sucursal
    let sucursalId = null;
    if (!isSuperAdmin) {
      sucursalId = req.user?.sucursal_id ? parseInt(req.user.sucursal_id, 10) : null;
      if (!sucursalId) {
        return res.status(403).json({
          ok: false,
          success: false,
          message: 'Acceso denegado: El usuario no tiene una sucursal asignada.'
        });
      }
    } else if (req.query.sucursal_id && req.query.sucursal_id !== 'all') {
      const parsedId = parseInt(req.query.sucursal_id, 10);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        sucursalId = parsedId;
      }
    }

    // 2. Normalización de rango de fechas
    let desde = req.query.desde;
    let hasta = req.query.hasta;

    if (!isValidDateString(desde)) {
      desde = getFirstDayOfMonthSantoDomingo();
    }
    if (!isValidDateString(hasta)) {
      hasta = getTodaySantoDomingo();
    }

    // Asegurar orden cronológico si vienen invertidas
    if (desde > hasta) {
      const tmp = desde;
      desde = hasta;
      hasta = tmp;
    }

    // Parámetros base para consultas SQL
    // $1 = desde, $2 = hasta
    const baseParams = [desde, hasta];
    let branchClauseSr = '';
    let branchClauseSrx = '';
    let branchParamIndex = 3;

    if (sucursalId) {
      baseParams.push(sucursalId);
      branchClauseSr = ` AND sr.sucursal_id = $${branchParamIndex}`;
      branchClauseSrx = ` AND srx.sucursal_id = $${branchParamIndex}`;
    }

    // ------------------------------------------------------------
    // A) KPIs Financieros y Operativos
    // ------------------------------------------------------------
    const kpisPromise = pool.query(
      `SELECT
         -- Total Liquidado (Cobrado al entregar)
         COALESCE(SUM(sr.monto_liquidado) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         ), 0)::numeric(12,2) AS total_liquidado,

         -- Total Anticipos recibidos en el período
         COALESCE(SUM(sr.monto_anticipo) FILTER (
           WHERE (sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
             AND COALESCE(sr.monto_anticipo, 0) > 0
             AND es.codigo_estado != 'CANCELADO_DEVUELTO'
         ), 0)::numeric(12,2) AS total_anticipos,

         -- Total Valor de Órdenes Entregadas (Costo definitivo de órdenes liquidadas en el período)
         COALESCE(SUM(
           COALESCE(NULLIF(sr.costo_final_confirmado, 0), (COALESCE(sr.monto_liquidado, 0) + COALESCE(sr.monto_anticipo, 0)), 0)
         ) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         ), 0)::numeric(12,2) AS total_valor_entregadas,

         -- Mano de obra confirmada de órdenes entregadas (neta pura sin repuestos)
         COALESCE(SUM(
           GREATEST(0, (
             COALESCE(sr.costo_final_confirmado, 0)
             - COALESCE((
                 SELECT SUM(isc.costo_adicional_repuesto)
                 FROM incidencias_servicio isc
                 WHERE isc.servicio_id = sr.id
                   AND isc.activo = TRUE
                   AND isc.aprobado_por_cliente = TRUE
               ), 0)
             + COALESCE(sr.monto_descuento, 0)
           ))
         ) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         ), 0)::numeric(12,2) AS total_mano_obra,

         -- Descuentos otorgados en entregas
         COALESCE(SUM(sr.monto_descuento) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         ), 0)::numeric(12,2) AS total_descuentos,

         -- Impuestos cobrados en entregas
         COALESCE(SUM(sr.monto_impuesto) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         ), 0)::numeric(12,2) AS total_impuestos,

         -- Saldo pendiente actual de órdenes en proceso (flujo 1 a 6)
         COALESCE(SUM(
           GREATEST(0, (
             CASE
               WHEN COALESCE(sr.costo_final_confirmado, 0) > 0
                 THEN sr.costo_final_confirmado
               ELSE (
                 COALESCE(sr.costo_previsto, 0)
                 + COALESCE((
                     SELECT SUM(isc.costo_adicional_repuesto)
                     FROM incidencias_servicio isc
                     WHERE isc.servicio_id = sr.id
                       AND isc.activo = TRUE
                       AND isc.aprobado_por_cliente = TRUE
                   ), 0)
                 - COALESCE(sr.monto_descuento, 0)
               )
             END
             - COALESCE(sr.monto_anticipo, 0)
           ))
         ) FILTER (
           WHERE es.orden_flujo BETWEEN 1 AND 6
         ), 0)::numeric(12,2) AS saldo_pendiente,

         -- Conteo de órdenes entregadas/liquidadas
         COUNT(sr.id) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         )::int AS ordenes_liquidadas,

         -- Conteo de órdenes recibidas en el rango
         COUNT(sr.id) FILTER (
           WHERE (sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         )::int AS ordenes_recibidas,

         -- Conteo de órdenes canceladas en el rango
         COUNT(sr.id) FILTER (
           WHERE es.codigo_estado = 'CANCELADO_DEVUELTO'
             AND (
               (sr.fecha_cancelacion IS NOT NULL AND (sr.fecha_cancelacion AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date)
               OR (sr.updated_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
             )
         )::int AS ordenes_canceladas,

         -- Métodos de pago en entregas
         COALESCE(SUM(sr.monto_liquidado) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
             AND sr.metodo_pago_entrega = 'Efectivo'
         ), 0)::numeric(12,2) AS liquidado_efectivo,

         COALESCE(SUM(sr.monto_liquidado) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
             AND sr.metodo_pago_entrega = 'Tarjeta'
         ), 0)::numeric(12,2) AS liquidado_tarjeta,

         COALESCE(SUM(sr.monto_liquidado) FILTER (
           WHERE sr.fecha_entrega_real IS NOT NULL
             AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
             AND sr.metodo_pago_entrega = 'Transferencia'
         ), 0)::numeric(12,2) AS liquidado_transferencia

       FROM servicios_recepcion sr
       JOIN estados_servicio es ON es.id = sr.estado_actual_id
       WHERE sr.activo = TRUE${branchClauseSr}`,
      baseParams
    );

    // Repuestos facturados (aprobados en órdenes entregadas durante el período)
    const repuestosPromise = pool.query(
      `SELECT COALESCE(SUM(isc.costo_adicional_repuesto), 0)::numeric(12,2) AS total_repuestos
       FROM incidencias_servicio isc
       JOIN servicios_recepcion srx ON srx.id = isc.servicio_id
       WHERE isc.activo = TRUE
         AND isc.aprobado_por_cliente = TRUE
         AND srx.activo = TRUE
         AND srx.fecha_entrega_real IS NOT NULL
         AND (srx.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
         ${branchClauseSrx}`,
      baseParams
    );

    // ------------------------------------------------------------
    // B) Tendencia Temporal: Entradas vs. Entregas (generate_series)
    // ------------------------------------------------------------
    const seriePromise = pool.query(
      `WITH dias AS (
         SELECT generate_series(
           $1::date,
           $2::date,
           INTERVAL '1 day'
         )::date AS dia
       ),
       entradas_agg AS (
         SELECT
           (sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date AS dia,
           COUNT(*)::int AS entradas
         FROM servicios_recepcion sr
         WHERE sr.activo = TRUE
           AND (sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
           ${branchClauseSr}
         GROUP BY (sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date
       ),
       entregas_agg AS (
         SELECT
           (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date AS dia,
           COUNT(*)::int AS entregas,
           COALESCE(SUM(sr.monto_liquidado), 0)::numeric(12,2) AS monto_liquidado
         FROM servicios_recepcion sr
         WHERE sr.activo = TRUE
           AND sr.fecha_entrega_real IS NOT NULL
           AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
           ${branchClauseSr}
         GROUP BY (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date
       )
       SELECT
         d.dia::text AS fecha,
         COALESCE(ea.entradas, 0) AS entradas,
         COALESCE(eg.entregas, 0) AS entregas,
         COALESCE(eg.monto_liquidado, 0)::numeric(12,2) AS monto_liquidado
       FROM dias d
       LEFT JOIN entradas_agg ea ON ea.dia = d.dia
       LEFT JOIN entregas_agg eg ON eg.dia = d.dia
       ORDER BY d.dia ASC`,
      baseParams
    );

    // ------------------------------------------------------------
    // C) Productividad por Técnico
    // ------------------------------------------------------------
    const tecnicosPromise = pool.query(
      `WITH entregadas_periodo AS (
         SELECT
           ta.tecnico_id,
           COUNT(DISTINCT sr.id)::int AS ordenes_entregadas,
           COALESCE(SUM(
             GREATEST(0, (
               COALESCE(sr.costo_final_confirmado, 0)
               - COALESCE((
                   SELECT SUM(isc.costo_adicional_repuesto)
                   FROM incidencias_servicio isc
                   WHERE isc.servicio_id = sr.id
                     AND isc.activo = TRUE
                     AND isc.aprobado_por_cliente = TRUE
                 ), 0)
               + COALESCE(sr.monto_descuento, 0)
             ))
           ), 0)::numeric(12,2) AS total_mano_obra,
           AVG(EXTRACT(EPOCH FROM (sr.fecha_entrega_real - sr.created_at)) / 3600)::numeric(8,1) AS tiempo_promedio_horas,
           COUNT(DISTINCT sr.id) FILTER (
             WHERE sr.fecha_entrega_estimada IS NOT NULL
               AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date <= sr.fecha_entrega_estimada
           )::int AS entregadas_a_tiempo,
           COUNT(DISTINCT sr.id) FILTER (WHERE sr.fecha_entrega_estimada IS NOT NULL)::int AS con_fecha_estimada
         FROM tecnicos_asignados ta
         JOIN servicios_recepcion sr ON sr.id = ta.servicio_id
         WHERE sr.activo = TRUE
           AND sr.fecha_entrega_real IS NOT NULL
           AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
           ${branchClauseSr}
         GROUP BY ta.tecnico_id
       ),
       activas_actuales AS (
         SELECT
           ta.tecnico_id,
           COUNT(DISTINCT sr.id)::int AS ordenes_en_proceso
         FROM tecnicos_asignados ta
         JOIN servicios_recepcion sr ON sr.id = ta.servicio_id
         JOIN estados_servicio es ON es.id = sr.estado_actual_id
         WHERE sr.activo = TRUE
           AND es.orden_flujo BETWEEN 1 AND 6
           ${branchClauseSr}
         GROUP BY ta.tecnico_id
       )
       SELECT
         dt.id AS tecnico_id,
         TRIM(CONCAT(dt.nombre, ' ', dt.apellido)) AS nombre,
         dt.foto_perfil_url,
         COALESCE(ep.ordenes_entregadas, 0) AS ordenes_entregadas,
         COALESCE(aa.ordenes_en_proceso, 0) AS ordenes_en_proceso,
         COALESCE(ep.total_mano_obra, 0)::numeric(12,2) AS total_mano_obra,
         COALESCE(ep.tiempo_promedio_horas, 0)::numeric(8,1) AS tiempo_promedio_horas,
         CASE
           WHEN COALESCE(ep.con_fecha_estimada, 0) > 0
             THEN ROUND((ep.entregadas_a_tiempo::numeric / ep.con_fecha_estimada::numeric) * 100, 1)
           WHEN COALESCE(ep.ordenes_entregadas, 0) > 0 THEN 100.0
           ELSE 100.0
         END AS tasa_cumplimiento
       FROM datos_trabajadores dt
       JOIN roles_equipo re ON re.id = dt.rol_id
       LEFT JOIN entregadas_periodo ep ON ep.tecnico_id = dt.id
       LEFT JOIN activas_actuales aa ON aa.tecnico_id = dt.id
       WHERE dt.activo = TRUE
         AND (LOWER(re.nombre_rol) LIKE '%tecnic%' OR ep.ordenes_entregadas > 0 OR aa.ordenes_en_proceso > 0)
         ${sucursalId ? `AND (dt.sucursal_id = $${branchParamIndex} OR dt.sucursal_id IS NULL)` : ''}
       ORDER BY ordenes_entregadas DESC, ordenes_en_proceso DESC, nombre ASC`,
      baseParams
    );

    // ------------------------------------------------------------
    // D) Distribución por Categorías de Dispositivos
    // ------------------------------------------------------------
    const categoriasPromise = pool.query(
      `WITH cat_counts AS (
         SELECT
           cd.id,
           cd.nombre_categoria AS categoria,
           COUNT(sr.id)::int AS total
         FROM categorias_dispositivos cd
         LEFT JOIN servicios_recepcion sr
           ON sr.categoria_id = cd.id
          AND sr.activo = TRUE
          AND (
            (sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
            OR (sr.fecha_entrega_real IS NOT NULL AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date)
          )
          ${branchClauseSr}
         WHERE cd.activo = TRUE
         GROUP BY cd.id, cd.nombre_categoria
       ),
       total_sum AS (
         SELECT COALESCE(SUM(total), 0)::int AS grand_total FROM cat_counts
       )
       SELECT
         cc.id,
         cc.categoria,
         cc.total,
         CASE
           WHEN ts.grand_total > 0 THEN ROUND((cc.total::numeric / ts.grand_total::numeric) * 100, 1)
           ELSE 0.0
         END AS porcentaje
       FROM cat_counts cc
       CROSS JOIN total_sum ts
       ORDER BY cc.total DESC, cc.categoria ASC`,
      baseParams
    );

    // ------------------------------------------------------------
    // E) Lista de sucursales disponibles (para selector SuperAdmin)
    // ------------------------------------------------------------
    const sucursalesPromise = isSuperAdmin
      ? pool.query('SELECT id, codigo_sucursal, nombre_sucursal FROM datos_sucursales WHERE activo = TRUE ORDER BY nombre_sucursal ASC')
      : Promise.resolve({ rows: [] });

    // Ejecutar en paralelo
    const [
      kpisRes,
      repuestosRes,
      serieRes,
      tecnicosRes,
      categoriasRes,
      sucursalesRes
    ] = await Promise.all([
      kpisPromise,
      repuestosPromise,
      seriePromise,
      tecnicosPromise,
      categoriasPromise,
      sucursalesPromise
    ]);

    const kpiRow = kpisRes.rows[0] || {};
    const totalRepuestos = parseFloat(repuestosRes.rows[0]?.total_repuestos || 0);
    const totalLiquidado = parseFloat(kpiRow.total_liquidado || 0);
    const totalAnticipos = parseFloat(kpiRow.total_anticipos || 0);
    const totalFacturado = Math.round((totalLiquidado + totalAnticipos) * 100) / 100;
    const totalValorEntregadas = parseFloat(kpiRow.total_valor_entregadas || 0);
    const totalManoObra = parseFloat(kpiRow.total_mano_obra || 0);
    const totalDescuentos = parseFloat(kpiRow.total_descuentos || 0);
    const totalImpuestos = parseFloat(kpiRow.total_impuestos || 0);
    const saldoPendiente = parseFloat(kpiRow.saldo_pendiente || 0);

    const ordenesLiquidadas = parseInt(kpiRow.ordenes_liquidadas || 0, 10);
    const ordenesRecibidas = parseInt(kpiRow.ordenes_recibidas || 0, 10);
    const ordenesCanceladas = parseInt(kpiRow.ordenes_canceladas || 0, 10);

    const ticketPromedio = ordenesLiquidadas > 0
      ? Math.round((totalValorEntregadas / ordenesLiquidadas) * 100) / 100
      : 0;

    return res.status(200).json({
      ok: true,
      success: true,
      data: {
        rango: {
          desde,
          hasta,
          sucursal_id: sucursalId,
          es_superadmin: isSuperAdmin
        },
        kpis: {
          total_facturado: totalFacturado,
          total_liquidado: totalLiquidado,
          total_anticipos: totalAnticipos,
          total_valor_entregadas: totalValorEntregadas,
          total_mano_obra: totalManoObra,
          total_repuestos: totalRepuestos,
          total_descuentos: totalDescuentos,
          total_impuestos: totalImpuestos,
          saldo_pendiente: saldoPendiente,
          ordenes_liquidadas: ordenesLiquidadas,
          ordenes_recibidas: ordenesRecibidas,
          ordenes_canceladas: ordenesCanceladas,
          ticket_promedio: ticketPromedio,
          metodos_pago: {
            efectivo: parseFloat(kpiRow.liquidado_efectivo || 0),
            tarjeta: parseFloat(kpiRow.liquidado_tarjeta || 0),
            transferencia: parseFloat(kpiRow.liquidado_transferencia || 0)
          }
        },
        serie_temporal: serieRes.rows.map((r) => ({
          fecha: r.fecha,
          entradas: parseInt(r.entradas, 10),
          entregas: parseInt(r.entregas, 10),
          monto_liquidado: parseFloat(r.monto_liquidado || 0)
        })),
        productividad_tecnicos: tecnicosRes.rows.map((t) => ({
          tecnico_id: t.tecnico_id,
          nombre: t.nombre,
          foto_perfil_url: t.foto_perfil_url,
          ordenes_entregadas: parseInt(t.ordenes_entregadas, 10),
          ordenes_en_proceso: parseInt(t.ordenes_en_proceso, 10),
          total_mano_obra: parseFloat(t.total_mano_obra || 0),
          tiempo_promedio_horas: parseFloat(t.tiempo_promedio_horas || 0),
          tasa_cumplimiento: parseFloat(t.tasa_cumplimiento || 100)
        })),
        distribucion_categorias: categoriasRes.rows.map((c) => ({
          id: c.id,
          categoria: c.categoria,
          total: parseInt(c.total, 10),
          porcentaje: parseFloat(c.porcentaje || 0)
        })),
        sucursales: sucursalesRes.rows
      }
    });

  } catch (error) {
    console.error('❌ Error en getReportesResumen:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al generar el resumen de reportes.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// GET /api/reportes/detalle — Listado tabular paginado de órdenes
// ============================================================
const getReportesDetalle = async (req, res) => {
  try {
    const pool = getPool();
    const isSuperAdmin = isUserSuperAdmin(req.user);

    // 1. Manejo de sucursal
    let sucursalId = null;
    if (!isSuperAdmin) {
      sucursalId = req.user?.sucursal_id ? parseInt(req.user.sucursal_id, 10) : null;
      if (!sucursalId) {
        return res.status(403).json({
          ok: false,
          success: false,
          message: 'Acceso denegado: El usuario no tiene una sucursal asignada.'
        });
      }
    } else if (req.query.sucursal_id && req.query.sucursal_id !== 'all') {
      const parsedId = parseInt(req.query.sucursal_id, 10);
      if (Number.isInteger(parsedId) && parsedId > 0) {
        sucursalId = parsedId;
      }
    }

    // 2. Fechas
    let desde = req.query.desde;
    let hasta = req.query.hasta;
    if (!isValidDateString(desde)) {
      desde = getFirstDayOfMonthSantoDomingo();
    }
    if (!isValidDateString(hasta)) {
      hasta = getTodaySantoDomingo();
    }
    if (desde > hasta) {
      const tmp = desde;
      desde = hasta;
      hasta = tmp;
    }

    // 3. Paginación y búsqueda
    const isExport = req.query.export === 'true' || req.query.limit === 'all' || req.query.limit === '-1';
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = isExport ? 5000 : Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const estadoFiltro = String(req.query.estado || 'entregados').toLowerCase();
    const metodoPagoFiltro = req.query.metodo_pago ? String(req.query.metodo_pago).trim() : null;
    const busqueda = req.query.q ? String(req.query.q).trim() : null;

    // Construcción dinámica de filtros SQL
    const conditions = ['sr.activo = TRUE'];
    const values = [desde, hasta];
    let paramIndex = 3;

    if (sucursalId) {
      conditions.push(`sr.sucursal_id = $${paramIndex}`);
      values.push(sucursalId);
      paramIndex++;
    }

    // Filtro según estado
    if (estadoFiltro === 'entregados') {
      conditions.push(`sr.fecha_entrega_real IS NOT NULL`);
      conditions.push(`(sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date`);
    } else if (estadoFiltro === 'recibidos') {
      conditions.push(`(sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date`);
    } else if (estadoFiltro === 'cancelados') {
      conditions.push(`es.codigo_estado = 'CANCELADO_DEVUELTO'`);
      conditions.push(`(sr.updated_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date`);
    } else {
      // 'todos' o sin filtro específico: abarca órdenes creadas o liquidadas en el rango
      conditions.push(`(
        (sr.created_at AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date
        OR (sr.fecha_entrega_real IS NOT NULL AND (sr.fecha_entrega_real AT TIME ZONE 'America/Santo_Domingo')::date BETWEEN $1::date AND $2::date)
      )`);
    }

    if (metodoPagoFiltro) {
      conditions.push(`sr.metodo_pago_entrega = $${paramIndex}`);
      values.push(metodoPagoFiltro);
      paramIndex++;
    }

    if (busqueda) {
      conditions.push(`(
        sr.codigo_ticket ILIKE $${paramIndex}
        OR sr.nombre_cliente ILIKE $${paramIndex}
        OR sr.telefono_cliente ILIKE $${paramIndex}
        OR sr.marca_equipo ILIKE $${paramIndex}
        OR sr.modelo_equipo ILIKE $${paramIndex}
        OR sr.num_serie_imei ILIKE $${paramIndex}
        OR c.nombre ILIKE $${paramIndex}
        OR c.apellido ILIKE $${paramIndex}
      )`);
      values.push(`%${busqueda}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Consulta de conteo y sumatoria total del período
    const totalsQuery = `
      SELECT
        COUNT(*)::int AS total_items,
        COALESCE(SUM(sr.monto_liquidado), 0)::numeric(12,2) AS suma_liquidado,
        COALESCE(SUM(sr.monto_anticipo) FILTER (WHERE es.codigo_estado != 'CANCELADO_DEVUELTO'), 0)::numeric(12,2) AS suma_anticipo,
        COALESCE(SUM(sr.monto_descuento), 0)::numeric(12,2) AS suma_descuento,
        COALESCE(SUM(
          GREATEST(0, (
            COALESCE(sr.costo_final_confirmado, sr.costo_previsto, 0)
            - COALESCE((
                SELECT SUM(isc.costo_adicional_repuesto)
                FROM incidencias_servicio isc
                WHERE isc.servicio_id = sr.id
                  AND isc.activo = TRUE
                  AND isc.aprobado_por_cliente = TRUE
              ), 0)
            + CASE WHEN sr.fecha_entrega_real IS NOT NULL THEN COALESCE(sr.monto_descuento, 0) ELSE 0 END
          ))
        ), 0)::numeric(12,2) AS suma_mano_obra,
        COALESCE(SUM(
          COALESCE(sr.monto_liquidado, 0) + CASE WHEN es.codigo_estado != 'CANCELADO_DEVUELTO' THEN COALESCE(sr.monto_anticipo, 0) ELSE 0 END
        ), 0)::numeric(12,2) AS suma_facturado
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      LEFT JOIN clientes c ON c.id = sr.cliente_id
      ${whereClause}
    `;

    const totalsRes = await pool.query(totalsQuery, values);
    const totalItems = parseInt(totalsRes.rows[0]?.total_items || 0, 10);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // Consulta de registros paginados
    const itemsQuery = `
      SELECT
        sr.id,
        sr.codigo_ticket,
        sr.created_at AS fecha_recepcion,
        sr.fecha_entrega_real,
        sr.fecha_entrega_estimada,
        COALESCE(
          sr.nombre_cliente,
          NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''),
          'Cliente sin registrar'
        ) AS cliente_nombre,
        COALESCE(sr.telefono_cliente, c.telefono, '') AS cliente_telefono,
        sr.marca_equipo,
        sr.modelo_equipo,
        TRIM(CONCAT(sr.marca_equipo, ' ', sr.modelo_equipo)) AS equipo,
        sr.num_serie_imei,
        cd.nombre_categoria AS categoria_nombre,
        ds.nombre_sucursal AS sucursal_nombre,
        ds.codigo_sucursal,
        es.codigo_estado,
        es.nombre_estado,
        es.color_badge,
        sr.costo_previsto,
        sr.costo_final_confirmado,
        GREATEST(0, (
          COALESCE(sr.costo_final_confirmado, sr.costo_previsto, 0)
          - COALESCE((
              SELECT SUM(isc.costo_adicional_repuesto)
              FROM incidencias_servicio isc
              WHERE isc.servicio_id = sr.id
                AND isc.activo = TRUE
                AND isc.aprobado_por_cliente = TRUE
            ), 0)
          + CASE WHEN sr.fecha_entrega_real IS NOT NULL THEN COALESCE(sr.monto_descuento, 0) ELSE 0 END
        ))::numeric(12,2) AS mano_obra_neta,
        COALESCE((
          SELECT SUM(isc.costo_adicional_repuesto)
          FROM incidencias_servicio isc
          WHERE isc.servicio_id = sr.id
            AND isc.activo = TRUE
            AND isc.aprobado_por_cliente = TRUE
        ), 0)::numeric(12,2) AS repuestos_cobrados,
        sr.monto_anticipo,
        sr.monto_descuento,
        sr.monto_impuesto,
        sr.monto_liquidado,
        (COALESCE(sr.monto_liquidado, 0) + CASE WHEN es.codigo_estado != 'CANCELADO_DEVUELTO' THEN COALESCE(sr.monto_anticipo, 0) ELSE 0 END)::numeric(12,2) AS total_cobrado,
        sr.metodo_pago_entrega,
        COALESCE((
          SELECT string_agg(TRIM(CONCAT(dt.nombre, ' ', dt.apellido)), ', ' ORDER BY ta.id ASC)
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt ON dt.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
        ), 'Sin asignar') AS tecnico_nombre,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', dt.id,
            'nombre', dt.nombre,
            'apellido', dt.apellido,
            'nombre_completo', TRIM(CONCAT(dt.nombre, ' ', dt.apellido))
          ) ORDER BY ta.id ASC)
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt ON dt.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
        ), '[]'::json) AS tecnicos
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      JOIN categorias_dispositivos cd ON cd.id = sr.categoria_id
      JOIN datos_sucursales ds ON ds.id = sr.sucursal_id
      LEFT JOIN clientes c ON c.id = sr.cliente_id
      ${whereClause}
      ORDER BY COALESCE(sr.fecha_entrega_real, sr.created_at) DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const itemsRes = await pool.query(itemsQuery, values);

    return res.status(200).json({
      ok: true,
      success: true,
      data: {
        ordenes: itemsRes.rows.map((row) => ({
          id: row.id,
          codigo_ticket: row.codigo_ticket,
          fecha_recepcion: row.fecha_recepcion,
          fecha_entrega_real: row.fecha_entrega_real,
          fecha_entrega_estimada: row.fecha_entrega_estimada,
          cliente_nombre: row.cliente_nombre,
          cliente_telefono: row.cliente_telefono,
          marca_equipo: row.marca_equipo,
          modelo_equipo: row.modelo_equipo,
          equipo: row.equipo,
          num_serie_imei: row.num_serie_imei,
          categoria_nombre: row.categoria_nombre,
          sucursal_nombre: row.sucursal_nombre,
          codigo_sucursal: row.codigo_sucursal,
          codigo_estado: row.codigo_estado,
          nombre_estado: row.nombre_estado,
          color_badge: row.color_badge,
          tecnico_nombre: row.tecnico_nombre,
          tecnicos: row.tecnicos || [],
          costo_previsto: parseFloat(row.costo_previsto || 0),
          costo_final_confirmado: parseFloat(row.costo_final_confirmado || 0),
          mano_obra_neta: parseFloat(row.mano_obra_neta || row.costo_previsto || 0),
          repuestos_cobrados: parseFloat(row.repuestos_cobrados || 0),
          monto_anticipo: parseFloat(row.monto_anticipo || 0),
          monto_descuento: parseFloat(row.monto_descuento || 0),
          monto_impuesto: parseFloat(row.monto_impuesto || 0),
          monto_liquidado: parseFloat(row.monto_liquidado || 0),
          total_cobrado: parseFloat(row.total_cobrado || 0),
          metodo_pago_entrega: row.metodo_pago_entrega || 'N/A'
        })),
        totales: {
          total_items: totalItems,
          suma_liquidado: parseFloat(totalsRes.rows[0]?.suma_liquidado || 0),
          suma_anticipo: parseFloat(totalsRes.rows[0]?.suma_anticipo || 0),
          suma_descuento: parseFloat(totalsRes.rows[0]?.suma_descuento || 0),
          suma_mano_obra: parseFloat(totalsRes.rows[0]?.suma_mano_obra || 0),
          suma_facturado: parseFloat(totalsRes.rows[0]?.suma_facturado || 0)
        },
        paginacion: {
          page,
          limit,
          total: totalItems,
          totalPages
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en getReportesDetalle:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al obtener el listado detallado de órdenes.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getReportesResumen,
  getReportesDetalle
};
