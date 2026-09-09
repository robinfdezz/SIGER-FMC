'use strict';

const { getPool } = require('../config/db');
const { generateUniqueTicketCode } = require('../utils/ticketCodeGenerator');
const { uploadImageBuffer } = require('../config/cloudinary');

// ============================================================
// HELPERS PRIVADOS
// ============================================================

/**
 * Sanitiza y convierte un valor numerico. Devuelve el default si es invalido.
 */
function toDecimal(value, defaultVal) {
  var parsed = parseFloat(value);
  return isNaN(parsed) ? defaultVal : parsed;
}

/**
 * Valida que un string no este vacio despues de trim.
 */
function isBlank(str) {
  return !str || String(str).trim().length === 0;
}

// ============================================================
// POST /api/servicios  — Crear orden de servicio
// ============================================================
const createServicio = async (req, res) => {
  // ── 1. Control de acceso por rol y aislamiento por sucursal ────
  const userRole = String(req.user?.rol_nombre || req.user?.rol || '').toLowerCase();
  if (userRole === 'tecnico') {
    return res.status(403).json({
      ok: false,
      message: 'Los técnicos no tienen permisos para crear órdenes de servicio.'
    });
  }

  const isSuperAdmin = userRole === 'superadmin';

  // Si no es superadmin, forzar estrictamente sucursal_id del usuario logueado
  let finalSucursalId;
  if (!isSuperAdmin) {
    finalSucursalId = req.user?.sucursal_id;
    if (!finalSucursalId) {
      return res.status(403).json({
        ok: false,
        message: 'El usuario no tiene una sucursal asignada.'
      });
    }
  } else {
    // SuperAdmin puede especificar sucursal o usar la suya
    finalSucursalId = req.body.sucursal_id || req.user?.sucursal_id;
    if (!finalSucursalId) {
      return res.status(400).json({ ok: false, message: 'La sucursal es obligatoria.' });
    }
  }

  // El recepcionista es SIEMPRE el usuario autenticado (sin permitir sobreescritura)
  const usuario_recepcion_id = req.user?.id;
  if (!usuario_recepcion_id) {
    return res.status(401).json({ ok: false, message: 'No se pudo identificar al recepcionista. Sesión inválida.' });
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    const {
      // Cliente
      cliente_id,
      nombre_cliente,
      telefono_cliente,
      cedula_cliente,
      correo_cliente,
      email_cliente,
      // Servicio
      categoria_id,
      prioridad,
      // Equipo
      marca_equipo,
      modelo_equipo,
      num_serie_imei,
      datos_acceso_equipo,
      // Diagnostico
      falla_reportada,
      observaciones_recepcion,
      checklist_entrada,
      // Economico
      costo_previsto,
      monto_anticipo,
      monto_descuento,
      // Garantia
      tiempo_garantia,
      condiciones_garantia,
      fecha_entrega_estimada,
      // Garantia de servicio anterior
      servicio_origen_id,
      es_garantia,
      // Fotos de recepcion (array de URLs ya subidas a Cloudinary)
      fotos_recepcion,
      // Tecnicos asignados (array de IDs)
      tecnicos_ids
    } = req.body;

    // ── Validaciones de negocio ──────────────────────────────
    if (!categoria_id) {
      return res.status(400).json({ ok: false, message: 'La categoria del dispositivo es obligatoria.' });
    }

    // ── Validaciones y sanitización del cliente ──────────────
    var sanitizedNombre = null;
    var sanitizedTelefono = null;
    var sanitizedCedula = null;
    var sanitizedCorreo = null;

    if (!cliente_id) {
      if (isBlank(nombre_cliente)) {
        return res.status(400).json({ ok: false, message: 'Debe indicar un cliente registrado o el nombre del cliente.' });
      }
      sanitizedNombre = String(nombre_cliente).trim().slice(0, 100);
      if (sanitizedNombre.length < 3) {
        return res.status(400).json({ ok: false, message: 'El nombre del cliente debe tener al menos 3 caracteres.' });
      }

      if (isBlank(telefono_cliente)) {
        return res.status(400).json({ ok: false, message: 'El teléfono del cliente es obligatorio para el registro manual.' });
      }
      var telDigits = String(telefono_cliente).replace(/\D/g, '');
      if (telDigits.length < 10) {
        return res.status(400).json({ ok: false, message: 'El teléfono debe contener al menos 10 dígitos numéricos.' });
      }
      sanitizedTelefono = telDigits.slice(0, 20);

      if (!isBlank(cedula_cliente)) {
        sanitizedCedula = String(cedula_cliente).replace(/[^0-9\-]/g, '').trim().slice(0, 20);
      }

      var rawCorreo = correo_cliente || email_cliente;
      if (!isBlank(rawCorreo)) {
        var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        var trimmedCorreo = String(rawCorreo).trim().toLowerCase().slice(0, 100);
        if (!emailRegex.test(trimmedCorreo)) {
          return res.status(400).json({ ok: false, message: 'El formato del correo electrónico es inválido.' });
        }
        sanitizedCorreo = trimmedCorreo;
      }
    } else {
      sanitizedNombre = isBlank(nombre_cliente) ? null : String(nombre_cliente).trim().slice(0, 100);
      sanitizedTelefono = isBlank(telefono_cliente) ? null : String(telefono_cliente).trim().slice(0, 20);
      sanitizedCedula = isBlank(cedula_cliente) ? null : String(cedula_cliente).trim().slice(0, 20);
      var rawCorreoCliente = correo_cliente || email_cliente;
      sanitizedCorreo = isBlank(rawCorreoCliente) ? null : String(rawCorreoCliente).trim().toLowerCase().slice(0, 100);
    }

    if (isBlank(marca_equipo)) {
      return res.status(400).json({ ok: false, message: 'La marca del equipo es obligatoria.' });
    }
    var sanitizedMarca = String(marca_equipo).trim().slice(0, 50);
    if (sanitizedMarca.length < 2) {
      return res.status(400).json({ ok: false, message: 'La marca del equipo debe tener al menos 2 caracteres.' });
    }

    if (isBlank(modelo_equipo)) {
      return res.status(400).json({ ok: false, message: 'El modelo del equipo es obligatorio.' });
    }
    var sanitizedModelo = String(modelo_equipo).trim().slice(0, 50);
    if (sanitizedModelo.length < 2) {
      return res.status(400).json({ ok: false, message: 'El modelo del equipo debe tener al menos 2 caracteres.' });
    }

    var sanitizedImei = isBlank(num_serie_imei) ? null : String(num_serie_imei).trim().slice(0, 50);

    if (isBlank(falla_reportada)) {
      return res.status(400).json({ ok: false, message: 'La falla reportada es obligatoria.' });
    }

    // Prioridad por defecto
    var prioridades = ['baja', 'media', 'alta', 'urgente'];
    var prioridadFinal = prioridades.includes(prioridad) ? prioridad : 'media';

    // Tiempo de garantía en días (entero >= 0, default 30)
    const tiempoGarantia = Number.isInteger(Number(tiempo_garantia)) ? Math.max(0, parseInt(tiempo_garantia, 10)) : 30;

    await client.query('BEGIN');

    // Validación estricta de reingreso por garantía
    const isGarantia = es_garantia === true || es_garantia === 'true';
    let validOrigenId = null;
    if (isGarantia) {
      validOrigenId = Number(servicio_origen_id);
      if (!validOrigenId || !Number.isInteger(validOrigenId) || validOrigenId <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          ok: false,
          message: 'Para registrar un reingreso por garantía debes especificar una orden de servicio previa válida.'
        });
      }
      const checkOrigen = await client.query(
        'SELECT id FROM servicios_recepcion WHERE id = $1 AND activo = TRUE',
        [validOrigenId]
      );
      if (checkOrigen.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          ok: false,
          message: 'La orden de servicio previa especificada no existe en el sistema.'
        });
      }
    }

    // ── 1. Obtener el ID del estado inicial "En Recepcion" ───
    const estadoRes = await client.query(
      "SELECT id FROM estados_servicio WHERE codigo_estado = 'RECIBIDO' OR orden_flujo = 1 ORDER BY orden_flujo ASC LIMIT 1"
    );
    if (estadoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ ok: false, message: 'No se encontro el estado inicial de recepcion en el catalogo.' });
    }
    var estado_inicial_id = estadoRes.rows[0].id;

    // ── 2. Generar codigo de ticket unico con retry loop ─────
    var codigo_ticket = await generateUniqueTicketCode(client);

    // ── 3. Insertar la orden de servicio ─────────────────────
    var insertRes = await client.query(
      'INSERT INTO servicios_recepcion (\n' +
      '  codigo_ticket, sucursal_id, categoria_id, cliente_id,\n' +
      '  nombre_cliente, telefono_cliente, cedula_cliente, correo_cliente,\n' +
      '  usuario_recepcion_id, estado_actual_id, prioridad,\n' +
      '  marca_equipo, modelo_equipo, num_serie_imei, datos_acceso_equipo,\n' +
      '  falla_reportada, observaciones_recepcion, checklist_entrada,\n' +
      '  costo_previsto, monto_anticipo, monto_descuento,\n' +
      '  tiempo_garantia, condiciones_garantia, fecha_entrega_estimada,\n' +
      '  servicio_origen_id, es_garantia\n' +
      ') VALUES (\n' +
      '  $1, $2, $3, $4,\n' +
      '  $5, $6, $7, $8,\n' +
      '  $9, $10, $11,\n' +
      '  $12, $13, $14, $15,\n' +
      '  $16, $17, $18,\n' +
      '  $19, $20, $21,\n' +
      '  $22, $23, $24,\n' +
      '  $25, $26\n' +
      ') RETURNING *',
      [
        codigo_ticket,
        finalSucursalId,
        categoria_id,
        cliente_id || null,
        sanitizedNombre,
        sanitizedTelefono,
        sanitizedCedula,
        sanitizedCorreo,
        usuario_recepcion_id,
        estado_inicial_id,
        prioridadFinal,
        sanitizedMarca,
        sanitizedModelo,
        sanitizedImei,
        datos_acceso_equipo && typeof datos_acceso_equipo === 'object' ? JSON.stringify(datos_acceso_equipo) : null,
        String(falla_reportada).trim(),
        isBlank(observaciones_recepcion) ? null : String(observaciones_recepcion).trim(),
        checklist_entrada && typeof checklist_entrada === 'object' ? JSON.stringify(checklist_entrada) : null,
        toDecimal(costo_previsto, 0.00),
        toDecimal(monto_anticipo, 0.00),
        toDecimal(monto_descuento, 0.00),
        tiempoGarantia,
        isBlank(condiciones_garantia) ? null : String(condiciones_garantia).trim(),
        fecha_entrega_estimada || null,
        validOrigenId,
        isGarantia
      ]
    );

    var nuevaOrden = insertRes.rows[0];

    // ── 4. Registrar entrada inicial en historial_estados ────
    var cleanTecnicosIds = Array.isArray(tecnicos_ids)
      ? tecnicos_ids.map(Number).filter(function(n) { return Number.isInteger(n) && n > 0; })
      : [];

    var notaHistorial = cleanTecnicosIds.length > 0
      ? 'Orden de servicio creada en recepcion con ' + cleanTecnicosIds.length + ' tecnico(s) asignado(s).'
      : 'Orden de servicio creada en recepcion.';

    await client.query(
      'INSERT INTO historial_estados (servicio_id, estado_id, usuario_id, nota_cambio) VALUES ($1, $2, $3, $4)',
      [nuevaOrden.id, estado_inicial_id, usuario_recepcion_id, notaHistorial]
    );

    // ── 5. Registrar asignaciones en tecnicos_asignados ───────
    for (var ti = 0; ti < cleanTecnicosIds.length; ti++) {
      await client.query(
        'INSERT INTO tecnicos_asignados (servicio_id, tecnico_id, fecha_asignacion) VALUES ($1, $2, NOW())',
        [nuevaOrden.id, cleanTecnicosIds[ti]]
      );
    }

    // ── 6. Insertar fotos de recepcion en evidencias_fotograficas ─
    var fotosUrls = Array.isArray(fotos_recepcion) ? fotos_recepcion.filter(function(u) { return u && typeof u === 'string'; }) : [];
    for (var fi = 0; fi < fotosUrls.length; fi++) {
      await client.query(
        'INSERT INTO evidencias_fotograficas (servicio_id, url_foto, tipo_evidencia, usuario_id) VALUES ($1, $2, $3, $4)',
        [nuevaOrden.id, fotosUrls[fi], 'RECEPCION', usuario_recepcion_id]
      );
    }

    await client.query('COMMIT');

    var tecNombreRes = cleanTecnicosIds.length > 0
      ? await client.query(
          'SELECT TRIM(CONCAT(nombre, \' \', apellido)) AS nombre_completo FROM datos_trabajadores WHERE id = $1',
          [cleanTecnicosIds[0]]
        )
      : { rows: [] };
    var primerTecnicoNombre = tecNombreRes.rows[0]?.nombre_completo || 'Sin asignar';

    return res.status(201).json({
      ok: true,
      message: 'Orden de servicio creada exitosamente.',
      data: {
        id: nuevaOrden.id,
        codigo_ticket: nuevaOrden.codigo_ticket,
        marca_equipo: nuevaOrden.marca_equipo,
        modelo_equipo: nuevaOrden.modelo_equipo,
        nombre_cliente: nuevaOrden.nombre_cliente,
        cliente_nombre: nuevaOrden.nombre_cliente,
        telefono_cliente: nuevaOrden.telefono_cliente,
        falla_reportada: nuevaOrden.falla_reportada,
        observaciones_recepcion: nuevaOrden.observaciones_recepcion,
        observaciones: nuevaOrden.observaciones_recepcion,
        checklist_entrada: nuevaOrden.checklist_entrada,
        checklist_recepcion: nuevaOrden.checklist_entrada,
        datos_acceso_equipo: nuevaOrden.datos_acceso_equipo,
        datos_acceso: nuevaOrden.datos_acceso_equipo,
        costo_previsto: nuevaOrden.costo_previsto,
        monto_anticipo: nuevaOrden.monto_anticipo,
        monto_descuento: nuevaOrden.monto_descuento,
        fecha_entrega_estimada: nuevaOrden.fecha_entrega_estimada,
        estado_actual_id: nuevaOrden.estado_actual_id,
        fotos_count: fotosUrls.length,
        tecnicos_count: cleanTecnicosIds.length,
        tecnico_nombre: primerTecnicoNombre,
        tecnico_asignado: primerTecnicoNombre,
        tecnicos: tecNombreRes.rows[0] ? [{ id: cleanTecnicosIds[0], nombre_completo: primerTecnicoNombre }] : [],
        created_at: nuevaOrden.created_at
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en createServicio:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno al crear la orden de servicio.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    client.release();
  }
};

// ============================================================
// GET /api/servicios  — Listar ordenes de servicio (paginado)
// ============================================================
const getServicios = async (req, res) => {
  try {
    var pool = getPool();
    var page = parseInt(req.query.page) || 1;
    var limit = parseInt(req.query.limit) || 20;
    var offset = (page - 1) * limit;

    // Filtros opcionales
    var sucursal_id = req.query.sucursal_id;
    var estado_id = req.query.estado_id;
    var prioridad = req.query.prioridad;
    var tecnico_id = req.query.tecnico_id;
    var busqueda = req.query.q;

    var conditions = ['sr.activo = TRUE'];
    var params = [];
    var idx = 1;

    // ── Aislamiento estricto por sucursal según rol ──────────
    const userRole = String(req.user?.rol_nombre || req.user?.rol || '').toLowerCase();
    const isSuperAdmin = userRole === 'superadmin';

    if (!isSuperAdmin) {
      // Todo rol que no sea superadmin sólo puede consultar órdenes de su propia sucursal
      conditions.push('sr.sucursal_id = $' + idx++);
      params.push(Number(req.user?.sucursal_id || 0));
    } else if (sucursal_id && sucursal_id !== 'all') {
      // SuperAdmin puede filtrar por una sucursal específica si lo desea
      conditions.push('sr.sucursal_id = $' + idx++);
      params.push(Number(sucursal_id));
    }
    if (estado_id && estado_id !== 'all') {
      conditions.push('sr.estado_actual_id = $' + idx++);
      params.push(Number(estado_id));
    }
    if (prioridad && prioridad !== 'all') {
      conditions.push('LOWER(sr.prioridad) = LOWER($' + idx++ + ')');
      params.push(prioridad);
    }
    if (tecnico_id && tecnico_id !== 'all') {
      conditions.push('EXISTS (SELECT 1 FROM tecnicos_asignados ta_f WHERE ta_f.servicio_id = sr.id AND ta_f.tecnico_id = $' + idx++ + ')');
      params.push(Number(tecnico_id));
    }
    if (busqueda && busqueda.trim().length > 0) {
      conditions.push(
        '(\n' +
        '  sr.codigo_ticket ILIKE $' + idx + '\n' +
        '  OR sr.nombre_cliente ILIKE $' + idx + '\n' +
        '  OR c.nombre ILIKE $' + idx + '\n' +
        '  OR c.apellido ILIKE $' + idx + '\n' +
        '  OR CONCAT(c.nombre, \' \', c.apellido) ILIKE $' + idx + '\n' +
        '  OR sr.marca_equipo ILIKE $' + idx + '\n' +
        '  OR sr.modelo_equipo ILIKE $' + idx + '\n' +
        '  OR sr.num_serie_imei ILIKE $' + idx + '\n' +
        '  OR sr.telefono_cliente ILIKE $' + idx + '\n' +
        '  OR c.telefono ILIKE $' + idx + '\n' +
        ')'
      );
      params.push('%' + busqueda.trim() + '%');
      idx++;
    }

    var where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    var countRes = await pool.query(
      'SELECT COUNT(*) FROM servicios_recepcion sr LEFT JOIN clientes c ON c.id = sr.cliente_id ' + where,
      params
    );

    var limitParam = '$' + idx++;
    var offsetParam = '$' + idx++;
    params.push(limit, offset);

    var dataRes = await pool.query(
      'SELECT\n' +
      '  sr.id,\n' +
      '  sr.codigo_ticket,\n' +
      '  sr.prioridad,\n' +
      '  sr.marca_equipo,\n' +
      '  sr.modelo_equipo,\n' +
      '  sr.num_serie_imei,\n' +
      '  sr.datos_acceso_equipo,\n' +
      '  sr.falla_reportada,\n' +
      '  sr.observaciones_recepcion,\n' +
      '  sr.observaciones_recepcion AS observaciones,\n' +
      '  sr.checklist_entrada,\n' +
      '  sr.checklist_entrada AS checklist_recepcion,\n' +
      '  sr.costo_previsto,\n' +
      '  sr.monto_anticipo,\n' +
      '  sr.monto_descuento,\n' +
      '  sr.costo_final_confirmado,\n' +
      '  sr.es_garantia,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS nombre_cliente,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS cliente_nombre,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS telefono_cliente,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS cliente_telefono,\n' +
      '  sr.fecha_entrega_estimada,\n' +
      '  sr.tiempo_garantia,\n' +
      '  sr.condiciones_garantia,\n' +
      '  sr.created_at,\n' +
      '  sr.updated_at,\n' +
      '  es.nombre_estado AS estado,\n' +
      '  es.color_badge AS estado_color,\n' +
      '  cd.nombre_categoria AS categoria,\n' +
      '  ds.nombre_sucursal AS sucursal,\n' +
      '  TRIM(CONCAT(dt.nombre, \' \', dt.apellido)) AS recepcionista,\n' +
      '  COALESCE((SELECT TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id ORDER BY ta.id ASC LIMIT 1), \'Sin asignar\') AS tecnico_nombre,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', dt_tec.id, \'nombre_completo\', TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)))) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id), \'[]\'::json) AS tecnicos\n' +
      'FROM servicios_recepcion sr\n' +
      'LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id\n' +
      'LEFT JOIN categorias_dispositivos cd ON cd.id = sr.categoria_id\n' +
      'LEFT JOIN datos_sucursales ds ON ds.id = sr.sucursal_id\n' +
      'LEFT JOIN datos_trabajadores dt ON dt.id = sr.usuario_recepcion_id\n' +
      'LEFT JOIN clientes c ON c.id = sr.cliente_id\n' +
      where + '\n' +
      'ORDER BY sr.created_at DESC\n' +
      'LIMIT ' + limitParam + ' OFFSET ' + offsetParam,
      params
    );

    var total = parseInt(countRes.rows[0].count);

    return res.status(200).json({
      ok: true,
      data: dataRes.rows,
      pagination: {
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error en getServicios:', error);
    return res.status(500).json({ ok: false, message: 'Error al consultar ordenes de servicio.' });
  }
};

// ============================================================
// GET /api/servicios/:id  — Detalle de una orden
// ============================================================
const getServicioById = async (req, res) => {
  try {
    var pool = getPool();
    var id = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(400).json({ ok: false, message: 'ID de orden invalido.' });
    }

    const userRole = String(req.user?.rol_nombre || req.user?.rol || '').toLowerCase();
    const isSuperAdmin = userRole === 'superadmin';

    let branchCondition = '';
    const queryParams = [id];
    if (!isSuperAdmin && req.user?.sucursal_id) {
      branchCondition = ' AND sr.sucursal_id = $2';
      queryParams.push(Number(req.user.sucursal_id));
    }

    var result = await pool.query(
      'SELECT\n' +
      '  sr.*,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS nombre_cliente,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS cliente_nombre,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS telefono_cliente,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS cliente_telefono,\n' +
      '  sr.checklist_entrada AS checklist_recepcion,\n' +
      '  sr.observaciones_recepcion AS observaciones,\n' +
      '  es.nombre_estado AS estado,\n' +
      '  es.color_badge AS estado_color,\n' +
      '  cd.nombre_categoria AS categoria,\n' +
      '  ds.nombre_sucursal AS sucursal,\n' +
      '  TRIM(CONCAT(dt.nombre, \' \', dt.apellido)) AS recepcionista,\n' +
      '  TRIM(CONCAT(c.nombre, \' \', c.apellido)) AS nombre_cliente_reg,\n' +
      '  c.telefono AS telefono_cliente_reg,\n' +
      '  COALESCE((SELECT TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id ORDER BY ta.id ASC LIMIT 1), \'Sin asignar\') AS tecnico_nombre,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', dt_tec.id, \'nombre_completo\', TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)))) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id), \'[]\'::json) AS tecnicos\n' +
      'FROM servicios_recepcion sr\n' +
      'LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id\n' +
      'LEFT JOIN categorias_dispositivos cd ON cd.id = sr.categoria_id\n' +
      'LEFT JOIN datos_sucursales ds ON ds.id = sr.sucursal_id\n' +
      'LEFT JOIN datos_trabajadores dt ON dt.id = sr.usuario_recepcion_id\n' +
      'LEFT JOIN clientes c ON c.id = sr.cliente_id\n' +
      'WHERE sr.id = $1 AND sr.activo = TRUE' + branchCondition,
      queryParams
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada.' });
    }

    return res.status(200).json({ ok: true, data: result.rows[0] });

  } catch (error) {
    console.error('Error en getServicioById:', error);
    return res.status(500).json({ ok: false, message: 'Error al consultar la orden de servicio.' });
  }
};

// ============================================================
// GET /api/servicios/ticket/:codigo  — Buscar por codigo de ticket
// ============================================================
const getServicioByTicket = async (req, res) => {
  try {
    var pool = getPool();
    var codigo = String(req.params.codigo).trim().toUpperCase();

    var result = await pool.query(
      'SELECT\n' +
      '  sr.id, sr.codigo_ticket, sr.marca_equipo, sr.modelo_equipo,\n' +
      '  sr.falla_reportada, sr.prioridad, sr.es_garantia,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS nombre_cliente,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS cliente_nombre,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS telefono_cliente,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS cliente_telefono,\n' +
      '  sr.fecha_entrega_estimada, sr.created_at,\n' +
      '  es.nombre_estado AS estado, es.color_badge AS estado_color\n' +
      'FROM servicios_recepcion sr\n' +
      'LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id\n' +
      'LEFT JOIN clientes c ON c.id = sr.cliente_id\n' +
      'WHERE sr.codigo_ticket = $1 AND sr.activo = TRUE',
      [codigo]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'No se encontro ninguna orden con ese codigo de ticket.' });
    }

    return res.status(200).json({ ok: true, data: result.rows[0] });

  } catch (error) {
    console.error('Error en getServicioByTicket:', error);
    return res.status(500).json({ ok: false, message: 'Error al buscar por codigo de ticket.' });
  }
};

// ============================================================
// POST /api/servicios/upload-foto  — Subida de imagenes a Cloudinary
// ============================================================
const uploadFotosServicio = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ ok: false, message: 'No se recibieron archivos de imagen.' });
    }
    if (req.files.length > 5) {
      return res.status(400).json({ ok: false, message: 'Se permiten como maximo 5 fotos por recepcion.' });
    }

    var urls = [];
    for (var i = 0; i < req.files.length; i++) {
      var result = await uploadImageBuffer(req.files[i].buffer, 'siger-fmc/recepcion');
      urls.push(result.secure_url);
    }

    return res.status(200).json({ ok: true, urls: urls });
  } catch (error) {
    console.error('Error en uploadFotosServicio:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al procesar y subir las fotos a Cloudinary.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// GET /api/servicios/validar-garantia/:codigoTicket — Validar vigencia de garantía
// ============================================================
const validarGarantiaTicket = async (req, res) => {
  try {
    const pool = getPool();
    const { codigoTicket } = req.params;
    const cleanCode = String(codigoTicket || '').trim();

    if (!cleanCode) {
      return res.status(400).json({ ok: false, error: 'Código de ticket no proporcionado.' });
    }

    const query = `
      SELECT 
        sr.id,
        sr.codigo_ticket,
        sr.cliente_id,
        COALESCE(sr.nombre_cliente, TRIM(CONCAT(c.nombre, ' ', c.apellido))) AS nombre_cliente,
        COALESCE(sr.telefono_cliente, c.telefono) AS telefono_cliente,
        COALESCE(sr.cedula_cliente, c.cedula_rnc) AS cedula_cliente,
        COALESCE(sr.correo_cliente, c.correo) AS correo_cliente,
        sr.categoria_id,
        sr.marca_equipo,
        sr.modelo_equipo,
        sr.num_serie_imei,
        sr.datos_acceso_equipo,
        sr.fecha_entrega_real,
        COALESCE(sr.tiempo_garantia, 30) AS tiempo_garantia,
        CASE 
          WHEN sr.fecha_entrega_real IS NOT NULL 
          THEN (sr.fecha_entrega_real + (COALESCE(sr.tiempo_garantia, 30) || ' days')::interval)
          ELSE NULL 
        END AS fecha_vencimiento,
        CASE 
          WHEN sr.fecha_entrega_real IS NOT NULL AND (sr.fecha_entrega_real + (COALESCE(sr.tiempo_garantia, 30) || ' days')::interval) >= NOW() 
          THEN true 
          ELSE false 
        END AS garantia_vigente
      FROM servicios_recepcion sr
      LEFT JOIN clientes c ON c.id = sr.cliente_id
      WHERE UPPER(TRIM(sr.codigo_ticket)) = UPPER(TRIM($1))
      LIMIT 1;
    `;

    const result = await pool.query(query, [cleanCode]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        error: 'Ticket no encontrado en el sistema.',
        message: 'No existe ninguna orden con ese código de ticket.'
      });
    }

    const row = result.rows[0];

    let datosAcceso = row.datos_acceso_equipo;
    if (typeof datosAcceso === 'string') {
      try {
        datosAcceso = JSON.parse(datosAcceso);
      } catch (e) {
        datosAcceso = null;
      }
    }

    let diasRestantes = 0;
    if (row.fecha_vencimiento) {
      const diffMs = new Date(row.fecha_vencimiento).getTime() - Date.now();
      diasRestantes = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
    }

    const servicioData = {
      id: row.id,
      codigo_ticket: row.codigo_ticket,
      cliente_id: row.cliente_id || null,
      cliente: row.nombre_cliente || 'Cliente no registrado',
      nombre_cliente: row.nombre_cliente || '',
      telefono_cliente: row.telefono_cliente || '',
      cedula_cliente: row.cedula_cliente || '',
      correo_cliente: row.correo_cliente || '',
      categoria_id: row.categoria_id,
      marca_equipo: row.marca_equipo,
      modelo_equipo: row.modelo_equipo,
      num_serie_imei: row.num_serie_imei || '',
      datos_acceso_equipo: datosAcceso,
      fecha_entrega_real: row.fecha_entrega_real,
      tiempo_garantia: Number(row.tiempo_garantia) || 30
    };

    return res.status(200).json({
      ok: true,
      vigente: Boolean(row.garantia_vigente),
      entregado: Boolean(row.fecha_entrega_real),
      diasRestantes: diasRestantes,
      fechaVencimiento: row.fecha_vencimiento ? new Date(row.fecha_vencimiento).toISOString() : null,
      servicio: servicioData
    });

  } catch (error) {
    console.error('[validarGarantiaTicket Error]:', error);
    return res.status(500).json({
      ok: false,
      error: 'Error interno al validar garantía del ticket.',
      message: error.message
    });
  }
};

module.exports = {
  createServicio,
  getServicios,
  getServicioById,
  getServicioByTicket,
  validarGarantiaTicket,
  uploadFotosServicio
};