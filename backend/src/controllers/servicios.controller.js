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

/**
 * Determina si el usuario posee rol SuperAdministrador.
 */
function isUserSuperAdmin(user) {
  if (!user) return false;
  const role = String(user.rol_nombre || user.rol || '').toLowerCase();
  return role === 'superadmin' || role === 'superadministrador' || role.includes('superadmin');
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
      accesorios_recibidos,
      accesorios,
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
    const isGarantia = es_garantia === true || es_garantia === 'true' || Boolean(servicio_origen_id);
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
        `SELECT sr.id, sr.fecha_entrega_real, es.codigo_estado, es.nombre_estado
         FROM servicios_recepcion sr
         LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id
         WHERE sr.id = $1 AND sr.activo = TRUE`,
        [validOrigenId]
      );
      if (checkOrigen.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          ok: false,
          message: 'La orden de servicio previa especificada no existe en el sistema.'
        });
      }

      const origenRow = checkOrigen.rows[0];
      const isOrigenEntregado = Boolean(origenRow.fecha_entrega_real) ||
        String(origenRow.codigo_estado || '').toUpperCase() === 'ENTREGADO' ||
        String(origenRow.nombre_estado || '').toUpperCase().includes('ENTREGADO');

      if (!isOrigenEntregado) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          ok: false,
          valido: false,
          codigo_error: 'NO_ENTREGADO',
          message: 'El equipo correspondiente a este ticket aún no ha sido entregado al cliente. No procede aplicar garantía.'
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

    // ── 2. Obtener prefijo_ticket de la sucursal ─────────────
    const sucursalRes = await client.query(
      'SELECT prefijo_ticket FROM datos_sucursales WHERE id = $1',
      [finalSucursalId]
    );
    const prefijoSucursal = (sucursalRes.rows[0]?.prefijo_ticket && sucursalRes.rows[0].prefijo_ticket.trim())
      ? sucursalRes.rows[0].prefijo_ticket.trim()
      : 'FMC-';

    // ── 3. Generar codigo de ticket unico con retry loop ─────
    const sufijoTicket = await generateUniqueTicketCode(client);
    const codigo_ticket = sufijoTicket.startsWith('FMC-')
      ? sufijoTicket.replace(/^FMC-/, prefijoSucursal)
      : `${prefijoSucursal}${sufijoTicket}`;

    // ── 3. Insertar la orden de servicio ─────────────────────
    const accesoriosFinal = isBlank(accesorios_recibidos)
      ? (isBlank(accesorios) ? null : String(accesorios).trim())
      : String(accesorios_recibidos).trim();

    var insertRes = await client.query(
      'INSERT INTO servicios_recepcion (\n' +
      '  codigo_ticket, sucursal_id, categoria_id, cliente_id,\n' +
      '  nombre_cliente, telefono_cliente, cedula_cliente, correo_cliente,\n' +
      '  usuario_recepcion_id, estado_actual_id, prioridad,\n' +
      '  marca_equipo, modelo_equipo, num_serie_imei, datos_acceso_equipo,\n' +
      '  falla_reportada, observaciones_recepcion, accesorios_recibidos, checklist_entrada,\n' +
      '  costo_previsto, monto_anticipo, monto_descuento,\n' +
      '  tiempo_garantia, condiciones_garantia, fecha_entrega_estimada,\n' +
      '  servicio_origen_id, es_garantia\n' +
      ') VALUES (\n' +
      '  $1, $2, $3, $4,\n' +
      '  $5, $6, $7, $8,\n' +
      '  $9, $10, $11,\n' +
      '  $12, $13, $14, $15,\n' +
      '  $16, $17, $18, $19,\n' +
      '  $20, $21, $22,\n' +
      '  $23, $24, $25,\n' +
      '  $26, $27\n' +
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
        datos_acceso_equipo && typeof datos_acceso_equipo === 'object'
          ? JSON.stringify(datos_acceso_equipo)
          : (typeof datos_acceso_equipo === 'string' && datos_acceso_equipo.trim() ? datos_acceso_equipo.trim() : null),
        String(falla_reportada).trim(),
        isBlank(observaciones_recepcion) ? null : String(observaciones_recepcion).trim(),
        accesoriosFinal,
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
    const rawFotos = Array.isArray(fotos_recepcion)
      ? fotos_recepcion
      : (Array.isArray(req.body.evidencias_fotograficas) ? req.body.evidencias_fotograficas : []);

    const fotosValidas = rawFotos
      .filter(Boolean)
      .map(function(item) {
        if (typeof item === 'object' && item !== null) {
          const url = String(item.url || item.url_foto || item.secure_url || '').trim();
          const public_id = item.public_id ? String(item.public_id).trim() : null;
          return url ? { url: url, public_id: public_id } : null;
        }
        if (typeof item === 'string' && item.trim().length > 0) {
          return { url: item.trim(), public_id: null };
        }
        return null;
      })
      .filter(Boolean);

    for (var fi = 0; fi < fotosValidas.length; fi++) {
      var foto = fotosValidas[fi];
      await client.query(
        'INSERT INTO evidencias_fotograficas (servicio_id, url_foto, public_id, tipo_evidencia, usuario_id) VALUES ($1, $2, $3, $4, $5)',
        [nuevaOrden.id, foto.url, foto.public_id, 'RECEPCION', usuario_recepcion_id]
      );
    }

    await client.query('COMMIT');

    // ── 7. Marcado de Confirmación en sesiones_carga_fotos (evitar purga de huérfanos) ──
    try {
      const urlsFotos = fotosValidas.map((f) => f.url).filter(Boolean);
      const publicIdsFotos = fotosValidas.map((f) => f.public_id).filter(Boolean);
      const sessionIdsToConfirm = [];
      if (req.body.upload_session_id) sessionIdsToConfirm.push(String(req.body.upload_session_id).trim());
      if (req.body.sessionId) sessionIdsToConfirm.push(String(req.body.sessionId).trim());

      if (urlsFotos.length > 0 || publicIdsFotos.length > 0 || sessionIdsToConfirm.length > 0) {
        await pool.query(
          `UPDATE sesiones_carga_fotos
           SET estado = 'UTILIZADA', updated_at = NOW()
           WHERE estado IN ('PENDIENTE', 'COMPLETADO', 'EXPIRADO')
             AND (
               session_id = ANY($1::text[])
               OR EXISTS (
                 SELECT 1
                 FROM jsonb_array_elements(fotos) elem
                 WHERE (elem->>'url' IS NOT NULL AND elem->>'url' = ANY($2::text[]))
                    OR (elem->>'public_id' IS NOT NULL AND elem->>'public_id' = ANY($3::text[]))
               )
             )`,
          [sessionIdsToConfirm, urlsFotos, publicIdsFotos]
        );
      }
    } catch (sessionConfirmErr) {
      console.warn('⚠️ No se pudo marcar sesión en sesiones_carga_fotos como UTILIZADA:', sessionConfirmErr.message);
    }

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
        accesorios_recibidos: nuevaOrden.accesorios_recibidos,
        accesorios: nuevaOrden.accesorios_recibidos,
        checklist_entrada: nuevaOrden.checklist_entrada,
        checklist_recepcion: nuevaOrden.checklist_entrada,
        datos_acceso_equipo: nuevaOrden.datos_acceso_equipo,
        datos_acceso: nuevaOrden.datos_acceso_equipo,
        costo_previsto: nuevaOrden.costo_previsto,
        monto_anticipo: nuevaOrden.monto_anticipo,
        monto_descuento: nuevaOrden.monto_descuento,
        fecha_entrega_estimada: nuevaOrden.fecha_entrega_estimada,
        estado_actual_id: nuevaOrden.estado_actual_id,
        fotos_count: fotosValidas.length,
        fotos: fotosValidas,
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
    var page = parseInt(req.query.page, 10) || 1;
    var limit = parseInt(req.query.limit, 10) || 20;
    if (page < 1) page = 1;
    if (limit < 1) limit = 20;
    if (limit > 100) limit = 100;
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
      '  sr.accesorios_recibidos,\n' +
      '  sr.accesorios_recibidos AS accesorios,\n' +
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
      '  sr.fecha_entrega_real,\n' +
      '  sr.usuario_entrega_id,\n' +
      '  sr.metodo_pago_entrega,\n' +
      '  sr.monto_liquidado,\n' +
      '  sr.monto_recibido_entrega,\n' +
      '  sr.cambio_devuelto_entrega,\n' +
      '  sr.observaciones_entrega,\n' +
      '  sr.tiempo_garantia,\n' +
      '  sr.condiciones_garantia,\n' +
      '  sr.created_at,\n' +
      '  sr.updated_at,\n' +
      '  sr.estado_actual_id,\n' +
      '  sr.estado_actual_id AS estado_id,\n' +
      '  es.codigo_estado,\n' +
      '  es.orden_flujo,\n' +
      '  es.nombre_estado AS estado,\n' +
      '  es.color_badge AS estado_color,\n' +
      '  cd.nombre_categoria AS categoria,\n' +
      '  ds.nombre_sucursal AS sucursal,\n' +
      '  TRIM(CONCAT(dt.nombre, \' \', dt.apellido)) AS recepcionista,\n' +
      '  TRIM(CONCAT(dt_ent.nombre, \' \', dt_ent.apellido)) AS despachado_por,\n' +
      '  COALESCE((SELECT TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id ORDER BY ta.id ASC LIMIT 1), \'Sin asignar\') AS tecnico_nombre,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', dt_tec.id, \'nombre_completo\', TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)))) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id), \'[]\'::json) AS tecnicos\n' +
      'FROM servicios_recepcion sr\n' +
      'LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id\n' +
      'LEFT JOIN categorias_dispositivos cd ON cd.id = sr.categoria_id\n' +
      'LEFT JOIN datos_sucursales ds ON ds.id = sr.sucursal_id\n' +
      'LEFT JOIN datos_trabajadores dt ON dt.id = sr.usuario_recepcion_id\n' +
      'LEFT JOIN datos_trabajadores dt_ent ON dt_ent.id = sr.usuario_entrega_id\n' +
      'LEFT JOIN clientes c ON c.id = sr.cliente_id\n' +
      where + '\n' +
      'ORDER BY sr.created_at DESC\n' +
      'LIMIT ' + limitParam + ' OFFSET ' + offsetParam,
      params
    );

    var total = parseInt(countRes.rows[0]?.count || 0, 10) || 0;
    var totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      ok: true,
      servicios: dataRes.rows,
      data: dataRes.rows,
      pagination: {
        total: total,
        page: page,
        limit: limit,
        totalPages: totalPages
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
      '  sr.accesorios_recibidos AS accesorios,\n' +
      '  es.nombre_estado AS estado,\n' +
      '  es.codigo_estado,\n' +
      '  es.orden_flujo,\n' +
      '  es.color_badge AS estado_color,\n' +
      '  cd.nombre_categoria AS categoria,\n' +
      '  ds.nombre_sucursal AS sucursal,\n' +
      '  TRIM(CONCAT(dt.nombre, \' \', dt.apellido)) AS recepcionista,\n' +
      '  TRIM(CONCAT(dt_ent.nombre, \' \', dt_ent.apellido)) AS despachado_por,\n' +
      '  TRIM(CONCAT(c.nombre, \' \', c.apellido)) AS nombre_cliente_reg,\n' +
      '  c.telefono AS telefono_cliente_reg,\n' +
      '  COALESCE((SELECT TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id ORDER BY ta.id ASC LIMIT 1), \'Sin asignar\') AS tecnico_nombre,\n' +
      '  COALESCE((SELECT string_agg(TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)), \', \' ORDER BY ta.id ASC) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id), \'Sin asignar\') AS tecnicos_nombres,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', dt_tec.id, \'nombre\', dt_tec.nombre, \'apellido\', dt_tec.apellido, \'nombre_completo\', TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)), \'usuario\', dt_tec.usuario, \'foto_perfil_url\', dt_tec.foto_perfil_url) ORDER BY ta.id ASC) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id), \'[]\'::json) AS tecnicos,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', dt_tec.id, \'nombre\', dt_tec.nombre, \'apellido\', dt_tec.apellido, \'nombre_completo\', TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)), \'usuario\', dt_tec.usuario, \'foto_perfil_url\', dt_tec.foto_perfil_url) ORDER BY ta.id ASC) FROM tecnicos_asignados ta JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id WHERE ta.servicio_id = sr.id), \'[]\'::json) AS tecnicos_asignados,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', ef.id, \'url\', ef.url_foto, \'url_foto\', ef.url_foto, \'public_id\', ef.public_id, \'tipo_evidencia\', ef.tipo_evidencia, \'fecha_subida\', ef.fecha_subida) ORDER BY ef.id ASC) FROM evidencias_fotograficas ef WHERE ef.servicio_id = sr.id AND ef.activo = TRUE AND ef.incidencia_id IS NULL AND ef.tipo_evidencia != \'INCIDENCIA\'), \'[]\'::json) AS fotos,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', ef.id, \'url\', ef.url_foto, \'url_foto\', ef.url_foto, \'public_id\', ef.public_id, \'tipo_evidencia\', ef.tipo_evidencia, \'fecha_subida\', ef.fecha_subida) ORDER BY ef.id ASC) FROM evidencias_fotograficas ef WHERE ef.servicio_id = sr.id AND ef.activo = TRUE AND ef.incidencia_id IS NULL AND (ef.tipo_evidencia = \'RECEPCION\' OR ef.tipo_evidencia IS NULL)), \'[]\'::json) AS fotos_recepcion,\n' +
      '  COALESCE((SELECT json_agg(json_build_object(\'id\', ef.id, \'url\', ef.url_foto, \'url_foto\', ef.url_foto, \'public_id\', ef.public_id, \'tipo_evidencia\', ef.tipo_evidencia, \'fecha_subida\', ef.fecha_subida) ORDER BY ef.id ASC) FROM evidencias_fotograficas ef WHERE ef.servicio_id = sr.id AND ef.activo = TRUE AND ef.incidencia_id IS NULL AND ef.tipo_evidencia = \'ENTREGA\'), \'[]\'::json) AS fotos_entrega,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', he.id,\n' +
      '        \'estado_id\', he.estado_id,\n' +
      '        \'nombre_estado\', es_h.nombre_estado,\n' +
      '        \'codigo_estado\', es_h.codigo_estado,\n' +
      '        \'color_badge\', es_h.color_badge,\n' +
      '        \'orden_flujo\', es_h.orden_flujo,\n' +
      '        \'usuario_id\', he.usuario_id,\n' +
      '        \'usuario_nombre\', TRIM(CONCAT(dt_h.nombre, \' \', dt_h.apellido)),\n' +
      '        \'nota_cambio\', he.nota_cambio,\n' +
      '        \'fecha_registro\', he.fecha_registro\n' +
      '      ) ORDER BY he.fecha_registro ASC, he.id ASC\n' +
      '    )\n' +
      '    FROM historial_estados he\n' +
      '    LEFT JOIN estados_servicio es_h ON es_h.id = he.estado_id\n' +
      '    LEFT JOIN datos_trabajadores dt_h ON dt_h.id = he.usuario_id\n' +
      '    WHERE he.servicio_id = sr.id\n' +
      '  ), \'[]\'::json) AS historial_estados,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', inc.id,\n' +
      '        \'servicio_id\', inc.servicio_id,\n' +
      '        \'tipo_incidencia\', inc.tipo_incidencia,\n' +
      '        \'descripcion\', inc.descripcion,\n' +
      '        \'repuesto_requerido\', inc.repuesto_requerido,\n' +
      '        \'costo_adicional_repuesto\', inc.costo_adicional_repuesto,\n' +
      '        \'aprobado_por_cliente\', inc.aprobado_por_cliente,\n' +
      '        \'fecha_aprobacion\', inc.fecha_aprobacion,\n' +
      '        \'metodo_aprobacion\', inc.metodo_aprobacion,\n' +
      '        \'estado_aprobacion\', CASE WHEN inc.aprobado_por_cliente = TRUE THEN \'APROBADO\' WHEN inc.fecha_aprobacion IS NOT NULL THEN \'RECHAZADO\' ELSE \'PENDIENTE\' END,\n' +
      '        \'rechazado_por_cliente\', (inc.aprobado_por_cliente = FALSE AND inc.fecha_aprobacion IS NOT NULL),\n' +
      '        \'fecha_registro\', inc.fecha_registro,\n' +
      '        \'usuario_id\', inc.usuario_id,\n' +
      '        \'usuario_nombre\', TRIM(CONCAT(dt_inc.nombre, \' \', dt_inc.apellido)),\n' +
      '        \'fotos\', COALESCE((\n' +
      '          SELECT json_agg(\n' +
      '            json_build_object(\n' +
      '              \'id\', ef_inc.id,\n' +
      '              \'url\', ef_inc.url_foto,\n' +
      '              \'url_foto\', ef_inc.url_foto,\n' +
      '              \'public_id\', ef_inc.public_id,\n' +
      '              \'tipo_evidencia\', ef_inc.tipo_evidencia,\n' +
      '              \'fecha_subida\', ef_inc.fecha_subida\n' +
      '            ) ORDER BY ef_inc.id ASC\n' +
      '          )\n' +
      '          FROM evidencias_fotograficas ef_inc\n' +
      '          WHERE ef_inc.incidencia_id = inc.id AND ef_inc.activo = TRUE\n' +
      '        ), \'[]\'::json)\n' +
      '      ) ORDER BY inc.fecha_registro DESC, inc.id DESC\n' +
      '    )\n' +
      '    FROM incidencias_servicio inc\n' +
      '    LEFT JOIN datos_trabajadores dt_inc ON dt_inc.id = inc.usuario_id\n' +
      '    WHERE inc.servicio_id = sr.id AND inc.activo = TRUE\n' +
      '  ), \'[]\'::json) AS incidencias\n' +
      'FROM servicios_recepcion sr\n' +
      'LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id\n' +
      'LEFT JOIN categorias_dispositivos cd ON cd.id = sr.categoria_id\n' +
      'LEFT JOIN datos_sucursales ds ON ds.id = sr.sucursal_id\n' +
      'LEFT JOIN datos_trabajadores dt ON dt.id = sr.usuario_recepcion_id\n' +
      'LEFT JOIN datos_trabajadores dt_ent ON dt_ent.id = sr.usuario_entrega_id\n' +
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
      '  sr.id, sr.codigo_ticket, sr.marca_equipo, sr.modelo_equipo, sr.num_serie_imei,\n' +
      '  sr.falla_reportada, sr.observaciones_recepcion, sr.observaciones_recepcion AS observaciones, sr.accesorios_recibidos, sr.accesorios_recibidos AS accesorios,\n' +
      '  sr.prioridad, sr.es_garantia, sr.checklist_entrada,\n' +
      '  sr.costo_previsto, sr.costo_final_confirmado, sr.monto_anticipo, sr.monto_descuento, sr.monto_liquidado,\n' +
      '  sr.motivo_cancelacion, sr.fecha_cancelacion, sr.usuario_cancela_id,\n' +
      '  sr.fecha_entrega_estimada, sr.fecha_entrega_estimada AS fecha_estimada_entrega, sr.fecha_entrega_real, sr.created_at, sr.updated_at,\n' +
      '  es.id AS estado_id, es.codigo_estado, es.nombre_estado AS estado, es.color_badge AS estado_color, es.orden_flujo,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS nombre_cliente,\n' +
      '  COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, \' \', c.apellido)), \'\'), c.nombre) AS cliente_nombre,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS telefono_cliente,\n' +
      '  COALESCE(sr.telefono_cliente, c.telefono) AS cliente_telefono,\n' +
      '  ds.nombre_sucursal AS sucursal,\n' +
      '  ds.telefono AS sucursal_telefono,\n' +
      '  COALESCE((\n' +
      '    SELECT TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido))\n' +
      '    FROM tecnicos_asignados ta\n' +
      '    JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id\n' +
      '    WHERE ta.servicio_id = sr.id\n' +
      '    ORDER BY ta.id ASC\n' +
      '    LIMIT 1\n' +
      '  ), \'Sin asignar\') AS tecnico_nombre,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', dt_tec.id,\n' +
      '        \'nombre\', dt_tec.nombre,\n' +
      '        \'apellido\', dt_tec.apellido,\n' +
      '        \'nombre_completo\', TRIM(CONCAT(dt_tec.nombre, \' \', dt_tec.apellido)),\n' +
      '        \'foto_perfil_url\', dt_tec.foto_perfil_url\n' +
      '      ) ORDER BY ta.id ASC\n' +
      '    )\n' +
      '    FROM tecnicos_asignados ta\n' +
      '    JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id\n' +
      '    WHERE ta.servicio_id = sr.id\n' +
      '  ), \'[]\'::json) AS tecnicos,\n' +
      '  (SELECT logo_url FROM datos_companhia LIMIT 1) AS logo_url,\n' +
      '  (SELECT nombre_empresa FROM datos_companhia LIMIT 1) AS nombre_empresa,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', ef.id,\n' +
      '        \'url\', ef.url_foto,\n' +
      '        \'url_foto\', ef.url_foto,\n' +
      '        \'public_id\', ef.public_id,\n' +
      '        \'tipo_evidencia\', ef.tipo_evidencia,\n' +
      '        \'fecha_subida\', ef.fecha_subida\n' +
      '      ) ORDER BY ef.id ASC\n' +
      '    )\n' +
      '    FROM evidencias_fotograficas ef\n' +
      '    WHERE ef.servicio_id = sr.id\n' +
      '      AND ef.activo = TRUE\n' +
      '      AND ef.incidencia_id IS NULL\n' +
      '      AND ef.tipo_evidencia != \'INCIDENCIA\'\n' +
      '  ), \'[]\'::json) AS fotos,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', ef.id,\n' +
      '        \'url\', ef.url_foto,\n' +
      '        \'url_foto\', ef.url_foto,\n' +
      '        \'public_id\', ef.public_id,\n' +
      '        \'tipo_evidencia\', ef.tipo_evidencia,\n' +
      '        \'fecha_subida\', ef.fecha_subida\n' +
      '      ) ORDER BY ef.id ASC\n' +
      '    )\n' +
      '    FROM evidencias_fotograficas ef\n' +
      '    WHERE ef.servicio_id = sr.id\n' +
      '      AND ef.activo = TRUE\n' +
      '      AND ef.incidencia_id IS NULL\n' +
      '      AND (ef.tipo_evidencia = \'RECEPCION\' OR ef.tipo_evidencia IS NULL)\n' +
      '  ), \'[]\'::json) AS fotos_recepcion,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', ef.id,\n' +
      '        \'url\', ef.url_foto,\n' +
      '        \'url_foto\', ef.url_foto,\n' +
      '        \'public_id\', ef.public_id,\n' +
      '        \'tipo_evidencia\', ef.tipo_evidencia,\n' +
      '        \'fecha_subida\', ef.fecha_subida\n' +
      '      ) ORDER BY ef.id ASC\n' +
      '    )\n' +
      '    FROM evidencias_fotograficas ef\n' +
      '    WHERE ef.servicio_id = sr.id\n' +
      '      AND ef.activo = TRUE\n' +
      '      AND ef.incidencia_id IS NULL\n' +
      '      AND ef.tipo_evidencia = \'ENTREGA\'\n' +
      '  ), \'[]\'::json) AS fotos_entrega,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', he.id,\n' +
      '        \'estado_id\', he.estado_id,\n' +
      '        \'nombre_estado\', es_h.nombre_estado,\n' +
      '        \'codigo_estado\', es_h.codigo_estado,\n' +
      '        \'orden_flujo\', es_h.orden_flujo,\n' +
      '        \'nota_cambio\', he.nota_cambio,\n' +
      '        \'fecha_registro\', he.fecha_registro\n' +
      '      ) ORDER BY he.fecha_registro ASC, he.id ASC\n' +
      '    )\n' +
      '    FROM historial_estados he\n' +
      '    LEFT JOIN estados_servicio es_h ON es_h.id = he.estado_id\n' +
      '    WHERE he.servicio_id = sr.id\n' +
      '  ), \'[]\'::json) AS historial_estados,\n' +
      '  COALESCE((\n' +
      '    SELECT json_agg(\n' +
      '      json_build_object(\n' +
      '        \'id\', inc.id,\n' +
      '        \'servicio_id\', inc.servicio_id,\n' +
      '        \'tipo_incidencia\', inc.tipo_incidencia,\n' +
      '        \'descripcion\', inc.descripcion,\n' +
      '        \'repuesto_requerido\', inc.repuesto_requerido,\n' +
      '        \'costo_adicional_repuesto\', inc.costo_adicional_repuesto,\n' +
      '        \'aprobado_por_cliente\', inc.aprobado_por_cliente,\n' +
      '        \'fecha_aprobacion\', inc.fecha_aprobacion,\n' +
      '        \'metodo_aprobacion\', inc.metodo_aprobacion,\n' +
      '        \'estado_aprobacion\', CASE WHEN inc.aprobado_por_cliente = TRUE THEN \'APROBADO\' WHEN inc.fecha_aprobacion IS NOT NULL THEN \'RECHAZADO\' ELSE \'PENDIENTE\' END,\n' +
      '        \'rechazado_por_cliente\', (inc.aprobado_por_cliente = FALSE AND inc.fecha_aprobacion IS NOT NULL),\n' +
      '        \'fecha_registro\', inc.fecha_registro,\n' +
      '        \'fotos\', COALESCE((\n' +
      '          SELECT json_agg(\n' +
      '            json_build_object(\n' +
      '              \'id\', ef_inc.id,\n' +
      '              \'url\', ef_inc.url_foto,\n' +
      '              \'url_foto\', ef_inc.url_foto,\n' +
      '              \'tipo_evidencia\', ef_inc.tipo_evidencia,\n' +
      '              \'fecha_subida\', ef_inc.fecha_subida\n' +
      '            ) ORDER BY ef_inc.id ASC\n' +
      '          )\n' +
      '          FROM evidencias_fotograficas ef_inc\n' +
      '          WHERE ef_inc.incidencia_id = inc.id AND ef_inc.activo = TRUE\n' +
      '        ), \'[]\'::json)\n' +
      '      ) ORDER BY inc.fecha_registro DESC, inc.id DESC\n' +
      '    )\n' +
      '    FROM incidencias_servicio inc\n' +
      '    WHERE inc.servicio_id = sr.id AND inc.activo = TRUE\n' +
      '  ), \'[]\'::json) AS incidencias\n' +
      'FROM servicios_recepcion sr\n' +
      'LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id\n' +
      'LEFT JOIN clientes c ON c.id = sr.cliente_id\n' +
      'LEFT JOIN datos_sucursales ds ON ds.id = sr.sucursal_id\n' +
      'WHERE sr.codigo_ticket = $1 AND sr.activo = TRUE',
      [codigo]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'No se encontro ninguna orden con ese codigo de ticket.' });
    }

    const ordenTicket = result.rows[0];
    return res.status(200).json({ ok: true, data: ordenTicket });

  } catch (error) {
    console.error('Error en getServicioByTicket:', error);
    return res.status(500).json({ ok: false, message: 'Error al buscar por codigo de ticket.' });
  }
};

/**
 * GET /api/servicios/:id/ticket-impresion
 * Validación y consulta previa a emisión de ticket/etiqueta física.
 * Bloquea formalmente la emisión de comprobantes para órdenes canceladas.
 */
const getTicketImpresionData = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getPool();
    const result = await pool.query(
      `SELECT sr.id, sr.codigo_ticket, es.codigo_estado, es.orden_flujo
       FROM servicios_recepcion sr
       JOIN estados_servicio es ON es.id = sr.estado_actual_id
       WHERE (sr.id::text = $1 OR sr.codigo_ticket = $1) AND sr.activo = TRUE`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada.' });
    }

    const order = result.rows[0];
    if (Number(order.orden_flujo) === 8 || String(order.codigo_estado || '').toUpperCase().includes('CANCEL')) {
      return res.status(400).json({
        ok: false,
        message: 'No se permite emitir comprobantes o etiquetas para órdenes canceladas'
      });
    }

    return res.status(200).json({ ok: true, data: order });
  } catch (error) {
    console.error('Error en getTicketImpresionData:', error);
    return res.status(500).json({ ok: false, message: 'Error al consultar datos de impresión.' });
  }
};

// ============================================================
// POST /api/servicios/upload-foto  — Subida de imagenes a Cloudinary
// ============================================================
const uploadFotosServicio = async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ ok: false, message: 'No se recibieron archivos de imagen.' });
    }
    if (files.length > 5) {
      return res.status(400).json({ ok: false, message: 'Se permiten como maximo 5 fotos por recepcion.' });
    }

    const fotos = [];
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const result = await uploadImageBuffer(files[i].buffer, 'siger-fmc/recepcion');
      fotos.push({
        url: result.secure_url,
        public_id: result.public_id,
        bytes: files[i].size,
        size: (files[i].size / (1024 * 1024)).toFixed(2)
      });
      urls.push(result.secure_url);
    }

    return res.status(200).json({
      ok: true,
      url: fotos[0]?.url,
      public_id: fotos[0]?.public_id,
      fotos: fotos,
      urls: urls,
      data: {
        url: fotos[0]?.url,
        public_id: fotos[0]?.public_id,
        fotos: fotos
      }
    });
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
        es.codigo_estado,
        es.nombre_estado AS estado_nombre,
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
      LEFT JOIN estados_servicio es ON es.id = sr.estado_actual_id
      WHERE UPPER(TRIM(sr.codigo_ticket)) = UPPER(TRIM($1))
      LIMIT 1;
    `;

    const result = await pool.query(query, [cleanCode]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        ok: false,
        valido: false,
        error: 'Ticket no encontrado en el sistema.',
        message: 'No existe ninguna orden con ese código de ticket.'
      });
    }

    const row = result.rows[0];

    // Verificar si el equipo fue formalmente entregado al cliente
    const isEntregado = Boolean(row.fecha_entrega_real) ||
      String(row.codigo_estado || '').toUpperCase() === 'ENTREGADO' ||
      String(row.estado_nombre || '').toUpperCase().includes('ENTREGADO');

    if (!isEntregado) {
      return res.status(200).json({
        ok: false,
        valido: false,
        codigo_error: 'NO_ENTREGADO',
        message: 'El equipo correspondiente a este ticket aún no ha sido entregado al cliente. No procede aplicar garantía.',
        servicio: {
          id: row.id,
          codigo_ticket: row.codigo_ticket,
          estado_nombre: row.estado_nombre || row.codigo_estado || 'En proceso'
        }
      });
    }

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
      valido: true,
      vigente: Boolean(row.garantia_vigente),
      entregado: true,
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

// ============================================================
// GET /api/servicios/taller — Órdenes activas en flujo de taller
// ============================================================
const getServiciosTaller = async (req, res) => {
  try {
    const pool = getPool();
    const isSuperAdmin = isUserSuperAdmin(req.user);

    // Determinar sucursal a filtrar con aislamiento estricto
    let sucursalId = null;
    if (!isSuperAdmin) {
      // Todo usuario no SuperAdmin queda estrictamente enclaustrado en su propia sucursal
      sucursalId = req.user?.sucursal_id ? parseInt(req.user.sucursal_id, 10) : null;
      if (!sucursalId) {
        return res.status(403).json({
          ok: false,
          success: false,
          message: 'Acceso denegado: El usuario no tiene una sucursal asignada.'
        });
      }
    } else if (req.query.sucursal_id && req.query.sucursal_id !== 'all') {
      sucursalId = parseInt(req.query.sucursal_id, 10);
    }

    // Filtro opcional por técnico
    let tecnicoId = null;
    if (req.query.tecnico_id && req.query.tecnico_id !== 'all') {
      tecnicoId = parseInt(req.query.tecnico_id);
    }

    // Construcción de condiciones WHERE
    // Estados activos en taller: orden_flujo entre 1 y 6 (excluye 7: Entregado y 8: Cancelado)
    const conditions = [
      'sr.activo = TRUE',
      'es.orden_flujo >= 1',
      'es.orden_flujo <= 6'
    ];
    const params = [];

    if (sucursalId) {
      params.push(sucursalId);
      conditions.push(`sr.sucursal_id = $${params.length}`);
    }

    if (tecnicoId) {
      params.push(tecnicoId);
      conditions.push(`EXISTS (SELECT 1 FROM tecnicos_asignados ta WHERE ta.servicio_id = sr.id AND ta.tecnico_id = $${params.length})`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT
        sr.id,
        sr.codigo_ticket,
        sr.sucursal_id,
        ds.nombre_sucursal AS sucursal,
        sr.categoria_id,
        cd.nombre_categoria AS categoria,
        sr.marca_equipo,
        sr.modelo_equipo,
        sr.num_serie_imei,
        sr.falla_reportada,
        sr.observaciones_recepcion,
        sr.observaciones_recepcion AS observaciones,
        sr.accesorios_recibidos,
        sr.accesorios_recibidos AS accesorios,
        sr.prioridad,
        sr.es_garantia,
        sr.datos_acceso_equipo,
        sr.checklist_entrada,
        sr.costo_previsto,
        sr.costo_final_confirmado,
        sr.monto_anticipo,
        sr.monto_descuento,
        sr.tiempo_garantia,
        sr.condiciones_garantia,
        sr.fecha_entrega_real,
        sr.fecha_entrega_estimada,
        sr.created_at,
        sr.updated_at,
        es.id AS estado_id,
        es.codigo_estado,
        es.nombre_estado AS estado,
        es.color_badge AS estado_color,
        es.orden_flujo,
        COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''), c.nombre) AS nombre_cliente,
        COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''), c.nombre) AS cliente,
        COALESCE(sr.telefono_cliente, c.telefono) AS telefono_cliente,
        COALESCE((
          SELECT TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido))
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
          ORDER BY ta.id ASC
          LIMIT 1
        ), 'Sin asignar') AS tecnico_nombre,
        COALESCE((
          SELECT ta.tecnico_id
          FROM tecnicos_asignados ta
          WHERE ta.servicio_id = sr.id
          ORDER BY ta.id ASC
          LIMIT 1
        ), NULL) AS tecnico_id,
        COALESCE((
          SELECT string_agg(TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido)), ', ' ORDER BY ta.id ASC)
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
        ), 'Sin asignar') AS tecnicos_nombres,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', dt_tec.id,
            'nombre', dt_tec.nombre,
            'apellido', dt_tec.apellido,
            'nombre_completo', TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido)),
            'usuario', dt_tec.usuario,
            'foto_perfil_url', dt_tec.foto_perfil_url
          ) ORDER BY ta.id ASC)
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
        ), '[]'::json) AS tecnicos,
        COALESCE((
          SELECT COUNT(*)::int
          FROM incidencias_servicio inc
          WHERE inc.servicio_id = sr.id
            AND inc.activo = TRUE
            AND inc.costo_adicional_repuesto > 0
            AND inc.aprobado_por_cliente = FALSE
            AND inc.fecha_aprobacion IS NULL
        ), 0) AS incidencias_pendientes_costo
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      LEFT JOIN categorias_dispositivos cd ON cd.id = sr.categoria_id
      LEFT JOIN datos_sucursales ds ON ds.id = sr.sucursal_id
      LEFT JOIN clientes c ON c.id = sr.cliente_id
      ${whereClause}
      ORDER BY
        CASE sr.prioridad
          WHEN 'urgente' THEN 4
          WHEN 'alta' THEN 3
          WHEN 'media' THEN 2
          WHEN 'baja' THEN 1
          ELSE 0
        END DESC,
        sr.created_at ASC
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || 0, 10);

    const shouldPaginate = req.query.page !== undefined || req.query.limit !== undefined || req.query.paginate === 'true';

    let pageNum = 1;
    let limitNum = total || 20;
    let totalPages = 1;

    let finalQuery = query;
    const finalParams = [...params];

    if (shouldPaginate) {
      pageNum = Math.max(1, parseInt(req.query.page, 10) || 1);
      limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const offset = (pageNum - 1) * limitNum;
      totalPages = Math.ceil(total / limitNum) || 1;

      finalQuery += ` LIMIT $${finalParams.length + 1} OFFSET $${finalParams.length + 2}`;
      finalParams.push(limitNum, offset);
    }

    const result = await pool.query(finalQuery, finalParams);

    return res.status(200).json({
      ok: true,
      success: true,
      total,
      data: result.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('❌ Error en getServiciosTaller:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al consultar órdenes del taller.'
    });
  }
};

// ============================================================
// PATCH /api/servicios/:id/estado — Actualizar estado de una orden
// ============================================================
const updateServicioEstado = async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(400).json({ ok: false, message: 'ID de orden inválido.' });
    }

    const { nuevo_estado_id, notas, tecnico_id } = req.body;
    const estadoId = parseInt(nuevo_estado_id);

    if (!estadoId || estadoId < 1) {
      return res.status(400).json({ ok: false, message: 'Debe especificar un nuevo_estado_id válido.' });
    }

    const usuarioId = req.user?.id;
    if (!usuarioId) {
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado.' });
    }

    // 1. Validar existencia del nuevo estado
    const estadoRes = await client.query(
      'SELECT id, codigo_estado, nombre_estado, color_badge, orden_flujo FROM estados_servicio WHERE id = $1',
      [estadoId]
    );

    if (estadoRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'El estado seleccionado no existe en el catálogo.' });
    }
    const nuevoEstado = estadoRes.rows[0];

    // 2. Verificar existencia de la orden y sucursal autorizada
    const isSuperAdmin = isUserSuperAdmin(req.user);

    let checkQuery = `
      SELECT sr.id, sr.codigo_ticket, sr.sucursal_id, sr.estado_actual_id, es.codigo_estado, es.orden_flujo
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      WHERE sr.id = $1 AND sr.activo = TRUE
    `;
    const checkParams = [id];

    if (!isSuperAdmin) {
      if (!req.user?.sucursal_id) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado: El usuario no tiene una sucursal asignada.' });
      }
      checkQuery += ' AND sr.sucursal_id = $2';
      checkParams.push(parseInt(req.user.sucursal_id, 10));
    }

    const ordenRes = await client.query(checkQuery, checkParams);
    if (ordenRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada o fuera de su sucursal.' });
    }

    const ordenActual = ordenRes.rows[0];
    if (Number(ordenActual.orden_flujo) === 8 || String(ordenActual.codigo_estado || '').toUpperCase().includes('CANCEL')) {
      return res.status(400).json({
        ok: false,
        message: 'No se pueden realizar cambios de estado en una orden cancelada.'
      });
    }

    await client.query('BEGIN');

    // Regla de Negocio: Ninguna orden puede avanzar más allá de RECIBIDO ni permanecer en estados
    // operativos posteriores sin al menos un técnico asignado.
    const esEstadoOperativo = nuevoEstado.codigo_estado !== 'RECIBIDO' && Number(nuevoEstado.orden_flujo) !== 1;
    if (esEstadoOperativo) {
      const tecCountRes = await client.query(
        'SELECT COUNT(*)::int AS total FROM tecnicos_asignados WHERE servicio_id = $1',
        [id]
      );
      const totalTecnicos = tecCountRes.rows[0]?.total || 0;
      const vieneTecnicoExplicito = Boolean(tecnico_id && Number.isInteger(parseInt(tecnico_id)));

      if (totalTecnicos === 0 && !vieneTecnicoExplicito) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          ok: false,
          success: false,
          status: 'error',
          message: 'Debe asignar al menos un técnico responsable a la orden antes de avanzar de estado.'
        });
      }
    }

    // Regla de Negocio: Bloqueo Defensivo por Costos/Repuestos Pendientes de Aprobación.
    // Si la orden cuenta con alguna incidencia con costo adicional pendiente de resolución (ni aprobada ni rechazada),
    // no se permite transicionar la orden a estados operativos de avance (orden_flujo > 3: En Reparación, Control de Calidad, Listo para Entrega, Entregado).
    const esEstadoAvancePosterior = Number(nuevoEstado.orden_flujo) > 3;
    if (esEstadoAvancePosterior) {
      const pendingCostsRes = await client.query(
        `SELECT id, tipo_incidencia, descripcion, repuesto_requerido, costo_adicional_repuesto
         FROM incidencias_servicio
         WHERE servicio_id = $1
           AND activo = TRUE
           AND costo_adicional_repuesto > 0
           AND aprobado_por_cliente = FALSE
           AND fecha_aprobacion IS NULL`,
        [id]
      );

      if (pendingCostsRes.rowCount > 0) {
        await client.query('ROLLBACK');
        const count = pendingCostsRes.rowCount;
        const primerInc = pendingCostsRes.rows[0];
        return res.status(400).json({
          ok: false,
          success: false,
          status: 'error',
          message: `No se puede avanzar la orden a "${nuevoEstado.nombre_estado}" porque existen ${count} costo(s)/repuesto(s) adicional(es) pendiente(s) de aprobación por parte del cliente (Ej: ${primerInc.tipo_incidencia} - RD$ ${Number(primerInc.costo_adicional_repuesto).toFixed(2)}). Debe aprobar o rechazar el presupuesto primero.`
        });
      }
    }

    // 3. Actualizar estado_actual_id y timestamp
    let updateQuery = 'UPDATE servicios_recepcion SET estado_actual_id = $1, updated_at = NOW()';
    const updateParams = [estadoId, id];

    if (nuevoEstado.codigo_estado === 'ENTREGADO' || nuevoEstado.orden_flujo === 7) {
      updateQuery = 'UPDATE servicios_recepcion SET estado_actual_id = $1, fecha_entrega_real = COALESCE(fecha_entrega_real, NOW()), updated_at = NOW()';
    }
    updateQuery += ' WHERE id = $2 RETURNING *';

    await client.query(updateQuery, updateParams);

    // 4. Asignación si se envió un tecnico_id explícito en la solicitud
    if (tecnico_id && Number.isInteger(parseInt(tecnico_id))) {
      const tecnicoParaAgregar = parseInt(tecnico_id);
      const existeTecnico = await client.query(
        'SELECT 1 FROM tecnicos_asignados WHERE servicio_id = $1 AND tecnico_id = $2',
        [id, tecnicoParaAgregar]
      );
      if (existeTecnico.rowCount === 0) {
        await client.query(
          'INSERT INTO tecnicos_asignados (servicio_id, tecnico_id, fecha_asignacion) VALUES ($1, $2, NOW())',
          [id, tecnicoParaAgregar]
        );
      }
    }

    // 5. Insertar en historial_estados
    const notaTexto = (notas && String(notas).trim())
      ? String(notas).trim()
      : `Estado actualizado a: ${nuevoEstado.nombre_estado}`;

    await client.query(
      'INSERT INTO historial_estados (servicio_id, estado_id, usuario_id, nota_cambio, fecha_registro) VALUES ($1, $2, $3, $4, NOW())',
      [id, estadoId, usuarioId, notaTexto]
    );

    await client.query('COMMIT');

    // 6. Consultar orden actualizada completa con badge y técnicos
    const finalRes = await pool.query(
      `SELECT
        sr.id,
        sr.codigo_ticket,
        sr.sucursal_id,
        ds.nombre_sucursal AS sucursal,
        sr.categoria_id,
        cd.nombre_categoria AS categoria,
        sr.marca_equipo,
        sr.modelo_equipo,
        sr.falla_reportada,
        sr.prioridad,
        sr.es_garantia,
        sr.fecha_entrega_estimada,
        sr.fecha_entrega_real,
        sr.created_at,
        sr.updated_at,
        es.id AS estado_id,
        es.codigo_estado,
        es.nombre_estado AS estado,
        es.color_badge AS estado_color,
        es.orden_flujo,
        COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''), c.nombre) AS nombre_cliente,
        COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''), c.nombre) AS cliente,
        COALESCE(sr.telefono_cliente, c.telefono) AS telefono_cliente,
        COALESCE((
          SELECT TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido))
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
          ORDER BY ta.id ASC
          LIMIT 1
        ), 'Sin asignar') AS tecnico_nombre,
        COALESCE((
          SELECT string_agg(TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido)), ', ' ORDER BY ta.id ASC)
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
        ), 'Sin asignar') AS tecnicos_nombres,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', dt_tec.id,
            'nombre', dt_tec.nombre,
            'apellido', dt_tec.apellido,
            'nombre_completo', TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido)),
            'usuario', dt_tec.usuario,
            'foto_perfil_url', dt_tec.foto_perfil_url
          ) ORDER BY ta.id ASC)
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
        ), '[]'::json) AS tecnicos,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', dt_tec.id,
            'nombre', dt_tec.nombre,
            'apellido', dt_tec.apellido,
            'nombre_completo', TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido)),
            'usuario', dt_tec.usuario,
            'foto_perfil_url', dt_tec.foto_perfil_url
          ) ORDER BY ta.id ASC)
          FROM tecnicos_asignados ta
          JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
          WHERE ta.servicio_id = sr.id
        ), '[]'::json) AS tecnicos_asignados
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      LEFT JOIN categorias_dispositivos cd ON cd.id = sr.categoria_id
      LEFT JOIN datos_sucursales ds ON ds.id = sr.sucursal_id
      LEFT JOIN clientes c ON c.id = sr.cliente_id
      WHERE sr.id = $1`,
      [id]
    );

    return res.status(200).json({
      ok: true,
      success: true,
      message: `Estado actualizado a "${nuevoEstado.nombre_estado}" correctamente.`,
      data: finalRes.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en updateServicioEstado:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al actualizar el estado de la orden de servicio.'
    });
  } finally {
    client.release();
  }
};

// ============================================================
// POST /api/servicios/:id/tecnicos — Asignar técnico colaborador
// ============================================================
const assignTecnicoServicio = async (req, res) => {
  try {
    const pool = getPool();
    const id = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(400).json({ ok: false, message: 'ID de orden inválido.' });
    }

    const targetTecnicoId = req.body.tecnico_id ? parseInt(req.body.tecnico_id) : req.user?.id;
    if (!targetTecnicoId || targetTecnicoId < 1) {
      return res.status(400).json({ ok: false, message: 'ID de técnico inválido.' });
    }

    const isSuperAdmin = isUserSuperAdmin(req.user);

    // Verificar que el técnico exista, esté activo y obtener su rol
    const tecRes = await pool.query(
      `SELECT dt.id, dt.nombre, dt.apellido, dt.usuario, dt.activo, dt.sucursal_id, r.nombre_rol AS rol_nombre
       FROM datos_trabajadores dt
       LEFT JOIN roles_equipo r ON r.id = dt.rol_id
       WHERE dt.id = $1`,
      [targetTecnicoId]
    );
    if (tecRes.rowCount === 0 || !tecRes.rows[0].activo) {
      return res.status(404).json({ ok: false, message: 'El técnico seleccionado no existe o está inactivo.' });
    }
    const tecnicoInfo = tecRes.rows[0];

    // Validar que el rol no sea administrativo/recepción (Secretaria, Recepcionista, Cajero, etc.)
    const tecRole = String(tecnicoInfo.rol_nombre || '').toLowerCase();
    const rolesNoPermitidos = ['secretaria', 'recepcionista', 'recepcion', 'cajero'];
    if (rolesNoPermitidos.some((r) => tecRole.includes(r))) {
      return res.status(400).json({
        ok: false,
        message: 'El usuario seleccionado tiene rol de secretaría/recepción y no puede ser asignado como técnico operativo.'
      });
    }

    // Verificar que la orden exista, esté activa y pertenezca a la sucursal autorizada
    let checkOrderQuery = `
      SELECT sr.id, sr.codigo_ticket, sr.sucursal_id, es.codigo_estado, es.orden_flujo
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      WHERE sr.id = $1 AND sr.activo = TRUE
    `;
    const checkOrderParams = [id];
    if (!isSuperAdmin) {
      if (!req.user?.sucursal_id) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado: El usuario no tiene una sucursal asignada.' });
      }
      checkOrderQuery += ' AND sr.sucursal_id = $2';
      checkOrderParams.push(parseInt(req.user.sucursal_id, 10));
    }

    const ordenRes = await pool.query(checkOrderQuery, checkOrderParams);
    if (ordenRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada o fuera de su sucursal.' });
    }
    const ordenInfo = ordenRes.rows[0];

    if (Number(ordenInfo.orden_flujo) === 8 || String(ordenInfo.codigo_estado || '').toUpperCase().includes('CANCEL')) {
      return res.status(400).json({
        ok: false,
        message: 'No se pueden asignar técnicos a una orden cancelada.'
      });
    }

    // Validar que el técnico pertenezca a la misma sucursal de la orden (o sea superadmin / rol global)
    if (tecnicoInfo.sucursal_id && ordenInfo.sucursal_id && Number(tecnicoInfo.sucursal_id) !== Number(ordenInfo.sucursal_id)) {
      return res.status(400).json({
        ok: false,
        message: 'El técnico pertenece a otra sucursal y no puede ser asignado a esta orden.'
      });
    }

    // Verificar si ya está asignado
    const existe = await pool.query(
      'SELECT id FROM tecnicos_asignados WHERE servicio_id = $1 AND tecnico_id = $2',
      [id, targetTecnicoId]
    );

    if (existe.rowCount > 0) {
      return res.status(200).json({
        ok: true,
        success: true,
        message: 'El técnico ya se encuentra asignado a esta orden.'
      });
    }

    // Insertar asignación
    await pool.query(
      'INSERT INTO tecnicos_asignados (servicio_id, tecnico_id, fecha_asignacion) VALUES ($1, $2, NOW())',
      [id, targetTecnicoId]
    );

    // Retornar lista completa actualizada de técnicos
    const listRes = await pool.query(
      `SELECT json_agg(json_build_object(
        'id', dt_tec.id,
        'nombre', dt_tec.nombre,
        'apellido', dt_tec.apellido,
        'nombre_completo', TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido)),
        'usuario', dt_tec.usuario,
        'foto_perfil_url', dt_tec.foto_perfil_url
      ) ORDER BY ta.id ASC) AS tecnicos
      FROM tecnicos_asignados ta
      JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
      WHERE ta.servicio_id = $1`,
      [id]
    );

    return res.status(200).json({
      ok: true,
      success: true,
      message: `${tecnicoInfo.nombre} ${tecnicoInfo.apellido} asignado exitosamente a la orden.`,
      data: {
        tecnicos: listRes.rows[0]?.tecnicos || [],
        tecnicos_asignados: listRes.rows[0]?.tecnicos || []
      }
    });

  } catch (error) {
    console.error('❌ Error en assignTecnicoServicio:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al asignar técnico colaborador.'
    });
  }
};

// ============================================================
// DELETE /api/servicios/:id/tecnicos/:tecnicoId — Remover técnico colaborador
// ============================================================
const removeTecnicoServicio = async (req, res) => {
  try {
    const pool = getPool();
    const id = parseInt(req.params.id);
    const tecnicoId = parseInt(req.params.tecnicoId);

    if (!id || !tecnicoId) {
      return res.status(400).json({ ok: false, message: 'Parámetros inválidos.' });
    }

    const isSuperAdmin = isUserSuperAdmin(req.user);

    // Regla de Negocio: Si la orden se encuentra en un estado operativo posterior a 'RECIBIDO',
    // no se puede remover al único técnico asignado. También validar aislamiento multi-sucursal.
    let checkOrderQuery = `SELECT sr.id, sr.estado_actual_id, sr.sucursal_id, es.codigo_estado, es.orden_flujo
       FROM servicios_recepcion sr
       JOIN estados_servicio es ON es.id = sr.estado_actual_id
       WHERE sr.id = $1 AND sr.activo = TRUE`;
    const checkOrderParams = [id];

    if (!isSuperAdmin) {
      if (!req.user?.sucursal_id) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado: El usuario no tiene una sucursal asignada.' });
      }
      checkOrderQuery += ' AND sr.sucursal_id = $2';
      checkOrderParams.push(parseInt(req.user.sucursal_id, 10));
    }

    const ordenRes = await pool.query(checkOrderQuery, checkOrderParams);

    if (ordenRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada o fuera de su sucursal.' });
    }

    const estadoOrden = ordenRes.rows[0];
    if (Number(estadoOrden.orden_flujo) === 8 || String(estadoOrden.codigo_estado || '').toUpperCase().includes('CANCEL')) {
      return res.status(400).json({
        ok: false,
        message: 'No se pueden modificar los técnicos de una orden cancelada.'
      });
    }
    const esEstadoPosterior = estadoOrden.codigo_estado !== 'RECIBIDO' && Number(estadoOrden.orden_flujo) > 1;

    if (esEstadoPosterior) {
      const countRes = await pool.query(
        'SELECT COUNT(*)::int AS total FROM tecnicos_asignados WHERE servicio_id = $1',
        [id]
      );
      const totalActual = countRes.rows[0]?.total || 0;
      if (totalActual <= 1) {
        return res.status(400).json({
          ok: false,
          success: false,
          status: 'error',
          message: 'No se puede desasignar al único técnico mientras la orden esté en proceso. Asigne otro técnico primero o regrese la orden a Recibido.'
        });
      }
    }

    await pool.query(
      'DELETE FROM tecnicos_asignados WHERE servicio_id = $1 AND tecnico_id = $2',
      [id, tecnicoId]
    );

    const listRes = await pool.query(
      `SELECT json_agg(json_build_object(
        'id', dt_tec.id,
        'nombre', dt_tec.nombre,
        'apellido', dt_tec.apellido,
        'nombre_completo', TRIM(CONCAT(dt_tec.nombre, ' ', dt_tec.apellido)),
        'usuario', dt_tec.usuario,
        'foto_perfil_url', dt_tec.foto_perfil_url
      ) ORDER BY ta.id ASC) AS tecnicos
      FROM tecnicos_asignados ta
      JOIN datos_trabajadores dt_tec ON dt_tec.id = ta.tecnico_id
      WHERE ta.servicio_id = $1`,
      [id]
    );

    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Técnico desvinculado de la orden.',
      data: {
        tecnicos: listRes.rows[0]?.tecnicos || [],
        tecnicos_asignados: listRes.rows[0]?.tecnicos || []
      }
    });

  } catch (error) {
    console.error('❌ Error en removeTecnicoServicio:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al remover técnico.'
    });
  }
};

// ============================================================
// GET /api/servicios/:id/incidencias — Listar incidencias de una orden
// ============================================================
const getIncidenciasServicio = async (req, res) => {
  try {
    const pool = getPool();
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) {
      return res.status(400).json({ ok: false, message: 'ID de orden inválido.' });
    }

    const isSuperAdmin = isUserSuperAdmin(req.user);

    // Verificar que la orden exista y pertenezca a la sucursal del usuario
    let checkOrderQuery = 'SELECT id, sucursal_id FROM servicios_recepcion WHERE id = $1 AND activo = TRUE';
    const checkOrderParams = [id];
    if (!isSuperAdmin) {
      if (!req.user?.sucursal_id) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado: El usuario no tiene una sucursal asignada.' });
      }
      checkOrderQuery += ' AND sucursal_id = $2';
      checkOrderParams.push(parseInt(req.user.sucursal_id, 10));
    }

    const ordenRes = await pool.query(checkOrderQuery, checkOrderParams);
    if (ordenRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada o fuera de su sucursal.' });
    }

    const query = `
      SELECT
        inc.id,
        inc.servicio_id,
        inc.tipo_incidencia,
        inc.descripcion,
        inc.repuesto_requerido,
        inc.costo_adicional_repuesto,
        inc.aprobado_por_cliente,
        inc.fecha_aprobacion,
        inc.metodo_aprobacion,
        CASE WHEN inc.aprobado_por_cliente = TRUE THEN 'APROBADO' WHEN inc.fecha_aprobacion IS NOT NULL THEN 'RECHAZADO' ELSE 'PENDIENTE' END AS estado_aprobacion,
        (inc.aprobado_por_cliente = FALSE AND inc.fecha_aprobacion IS NOT NULL) AS rechazado_por_cliente,
        inc.fecha_registro,
        inc.usuario_id,
        TRIM(CONCAT(dt.nombre, ' ', dt.apellido)) AS usuario_nombre,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', ef.id,
              'url', ef.url_foto,
              'url_foto', ef.url_foto,
              'public_id', ef.public_id,
              'tipo_evidencia', ef.tipo_evidencia,
              'fecha_subida', ef.fecha_subida
            ) ORDER BY ef.id ASC
          )
          FROM evidencias_fotograficas ef
          WHERE ef.incidencia_id = inc.id AND ef.activo = TRUE
        ), '[]'::json) AS fotos
      FROM incidencias_servicio inc
      LEFT JOIN datos_trabajadores dt ON dt.id = inc.usuario_id
      WHERE inc.servicio_id = $1 AND inc.activo = TRUE
      ORDER BY inc.fecha_registro DESC, inc.id DESC
    `;

    const result = await pool.query(query, [id]);
    return res.status(200).json({ ok: true, data: result.rows });
  } catch (error) {
    console.error('❌ Error en getIncidenciasServicio:', error);
    return res.status(500).json({ ok: false, message: 'Error al consultar las incidencias del servicio.' });
  }
};

// ============================================================
// POST /api/servicios/:id/incidencias — Registrar incidencia técnica
// ============================================================
const createIncidenciaServicio = async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) {
      return res.status(400).json({ ok: false, message: 'ID de orden inválido.' });
    }

    const {
      tipo_incidencia,
      descripcion,
      repuesto_requerido,
      costo_adicional_repuesto,
      aprobado_por_cliente,
      metodo_aprobacion,
      fotos
    } = req.body;

    const tiposPermitidos = ['Imprevisto', 'Aviso al Cliente', 'Pieza Extra', 'Hallazgo Tecnico'];
    if (!tipo_incidencia || !tiposPermitidos.includes(tipo_incidencia)) {
      return res.status(400).json({
        ok: false,
        message: `El tipo de incidencia es obligatorio y debe ser uno de: ${tiposPermitidos.join(', ')}.`
      });
    }

    if (isBlank(descripcion)) {
      return res.status(400).json({
        ok: false,
        message: 'La descripción de la incidencia es obligatoria.'
      });
    }

    const isSuperAdmin = isUserSuperAdmin(req.user);

    // Verificar que la orden exista, esté activa y pertenezca a la sucursal autorizada
    let checkOrderQuery = `
      SELECT sr.id, sr.codigo_ticket, sr.sucursal_id, sr.estado_actual_id, es.codigo_estado, es.orden_flujo
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      WHERE sr.id = $1 AND sr.activo = TRUE
    `;
    const checkOrderParams = [id];
    if (!isSuperAdmin) {
      if (!req.user?.sucursal_id) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado: El usuario no tiene una sucursal asignada.' });
      }
      checkOrderQuery += ' AND sr.sucursal_id = $2';
      checkOrderParams.push(parseInt(req.user.sucursal_id, 10));
    }

    const ordenRes = await client.query(checkOrderQuery, checkOrderParams);
    if (ordenRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada o fuera de su sucursal.' });
    }

    const ordenActualInc = ordenRes.rows[0];
    if (Number(ordenActualInc.orden_flujo) === 8 || String(ordenActualInc.codigo_estado || '').toUpperCase().includes('CANCEL')) {
      return res.status(400).json({
        ok: false,
        message: 'No se pueden registrar repuestos o incidencias en una orden cancelada.'
      });
    }

    const repuestoFinal = isBlank(repuesto_requerido) ? null : String(repuesto_requerido).trim();
    const costoFinal = toDecimal(costo_adicional_repuesto, 0.00);
    const usuarioId = req.user?.id || null;

    const metodosPermitidos = ['Presencial', 'Llamada', 'WhatsApp', 'Correo', 'Otro'];
    const isAprobado = Boolean(
      aprobado_por_cliente === true ||
      aprobado_por_cliente === 'true' ||
      aprobado_por_cliente === 1 ||
      aprobado_por_cliente === '1'
    );
    const metodoFinal = isAprobado
      ? (metodosPermitidos.includes(metodo_aprobacion) ? metodo_aprobacion : 'Presencial')
      : null;
    const fechaAprobacionFinal = isAprobado ? new Date() : null;

    await client.query('BEGIN');

    const insertIncQuery = `
      INSERT INTO incidencias_servicio (
        servicio_id,
        tipo_incidencia,
        descripcion,
        repuesto_requerido,
        costo_adicional_repuesto,
        aprobado_por_cliente,
        fecha_aprobacion,
        metodo_aprobacion,
        activo,
        usuario_id,
        fecha_registro
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, NOW())
      RETURNING *
    `;

    const incRes = await client.query(insertIncQuery, [
      id,
      tipo_incidencia,
      String(descripcion).trim(),
      repuestoFinal,
      costoFinal,
      isAprobado,
      fechaAprobacionFinal,
      metodoFinal,
      usuarioId
    ]);

    const nuevaIncidencia = incRes.rows[0];

    // Procesar evidencias fotográficas vinculadas
    const rawFotos = Array.isArray(fotos)
      ? fotos
      : (Array.isArray(req.body.evidencias_fotograficas) ? req.body.evidencias_fotograficas : []);

    const fotosValidas = rawFotos
      .filter(Boolean)
      .map(item => {
        if (typeof item === 'object' && item !== null) {
          const url = String(item.url || item.url_foto || item.secure_url || '').trim();
          const public_id = item.public_id ? String(item.public_id).trim() : null;
          return url ? { url, public_id } : null;
        }
        if (typeof item === 'string' && item.trim().length > 0) {
          return { url: item.trim(), public_id: null };
        }
        return null;
      })
      .filter(Boolean);

    for (const f of fotosValidas) {
      await client.query(
        `INSERT INTO evidencias_fotograficas (
          servicio_id,
          incidencia_id,
          url_foto,
          public_id,
          tipo_evidencia,
          usuario_id,
          activo,
          fecha_subida
        ) VALUES ($1, $2, $3, $4, 'INCIDENCIA', $5, TRUE, NOW())`,
        [id, nuevaIncidencia.id, f.url, f.public_id, usuarioId]
      );
    }

    // Regla de Negocio: Si la incidencia tiene costo adicional y queda pendiente de aprobación,
    // transicionar automáticamente la orden al estado 'ESPERA_REPUESTO' (si no está ya en ese estado).
    const tieneCostoPendiente = costoFinal > 0 && !isAprobado;
    if (tieneCostoPendiente) {
      const estadoEsperaRes = await client.query(
        "SELECT id, codigo_estado, nombre_estado FROM estados_servicio WHERE codigo_estado = 'ESPERA_REPUESTO' LIMIT 1"
      );
      if (estadoEsperaRes.rowCount > 0) {
        const estadoEspera = estadoEsperaRes.rows[0];
        const estadoActualOrdenId = ordenRes.rows[0]?.estado_actual_id;

        if (estadoActualOrdenId !== estadoEspera.id) {
          await client.query(
            'UPDATE servicios_recepcion SET estado_actual_id = $1, updated_at = NOW() WHERE id = $2',
            [estadoEspera.id, id]
          );

          const notaTransicion = `Transición automática a ${estadoEspera.nombre_estado} por solicitud de repuesto/costo adicional pendiente de aprobación (Incidencia #${nuevaIncidencia.id}: ${nuevaIncidencia.tipo_incidencia} - RD$ ${costoFinal.toFixed(2)}).`;
          await client.query(
            'INSERT INTO historial_estados (servicio_id, estado_id, usuario_id, nota_cambio, fecha_registro) VALUES ($1, $2, $3, $4, NOW())',
            [id, estadoEspera.id, usuarioId, notaTransicion]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Consultar el registro recién insertado con usuario y fotos
    const finalRes = await pool.query(
      `SELECT
        inc.id,
        inc.servicio_id,
        inc.tipo_incidencia,
        inc.descripcion,
        inc.repuesto_requerido,
        inc.costo_adicional_repuesto,
        inc.aprobado_por_cliente,
        inc.fecha_aprobacion,
        inc.metodo_aprobacion,
        CASE WHEN inc.aprobado_por_cliente = TRUE THEN 'APROBADO' WHEN inc.fecha_aprobacion IS NOT NULL THEN 'RECHAZADO' ELSE 'PENDIENTE' END AS estado_aprobacion,
        (inc.aprobado_por_cliente = FALSE AND inc.fecha_aprobacion IS NOT NULL) AS rechazado_por_cliente,
        inc.fecha_registro,
        inc.usuario_id,
        TRIM(CONCAT(dt.nombre, ' ', dt.apellido)) AS usuario_nombre,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', ef.id,
              'url', ef.url_foto,
              'url_foto', ef.url_foto,
              'public_id', ef.public_id,
              'tipo_evidencia', ef.tipo_evidencia,
              'fecha_subida', ef.fecha_subida
            ) ORDER BY ef.id ASC
          )
          FROM evidencias_fotograficas ef
          WHERE ef.incidencia_id = inc.id AND ef.activo = TRUE
        ), '[]'::json) AS fotos
      FROM incidencias_servicio inc
      LEFT JOIN datos_trabajadores dt ON dt.id = inc.usuario_id
      WHERE inc.id = $1`,
      [nuevaIncidencia.id]
    );

    return res.status(201).json({
      ok: true,
      success: true,
      message: 'Incidencia técnica registrada exitosamente.',
      data: finalRes.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en createIncidenciaServicio:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al registrar la incidencia de servicio.'
    });
  } finally {
    client.release();
  }
};

// ============================================================
// PATCH /api/servicios/:id/incidencias/:incidenciaId/aprobacion — Actualizar aprobación del cliente
// ============================================================
const updateAprobacionIncidencia = async (req, res) => {
  try {
    const pool = getPool();
    const servicioId = parseInt(req.params.id, 10);
    const incidenciaId = parseInt(req.params.incidenciaId, 10);

    if (!servicioId || servicioId < 1 || !incidenciaId || incidenciaId < 1) {
      return res.status(400).json({ ok: false, message: 'IDs de orden o incidencia inválidos.' });
    }

    const {
      aprobado_por_cliente,
      rechazado,
      rechazado_por_cliente,
      estado_aprobacion,
      accion,
      metodo_aprobacion
    } = req.body;

    const isSuperAdmin = isUserSuperAdmin(req.user);

    // Verificar que la orden exista y pertenezca a la sucursal autorizada
    let checkOrderQuery = `
      SELECT sr.id, sr.sucursal_id, es.codigo_estado, es.orden_flujo
      FROM servicios_recepcion sr
      JOIN estados_servicio es ON es.id = sr.estado_actual_id
      WHERE sr.id = $1 AND sr.activo = TRUE
    `;
    const checkOrderParams = [servicioId];
    if (!isSuperAdmin) {
      if (!req.user?.sucursal_id) {
        return res.status(403).json({ ok: false, message: 'Acceso denegado: El usuario no tiene una sucursal asignada.' });
      }
      checkOrderQuery += ' AND sr.sucursal_id = $2';
      checkOrderParams.push(parseInt(req.user.sucursal_id, 10));
    }

    const ordenRes = await pool.query(checkOrderQuery, checkOrderParams);
    if (ordenRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada o fuera de su sucursal.' });
    }

    const ordenActualAprob = ordenRes.rows[0];
    if (Number(ordenActualAprob.orden_flujo) === 8 || String(ordenActualAprob.codigo_estado || '').toUpperCase().includes('CANCEL')) {
      return res.status(400).json({
        ok: false,
        message: 'No se pueden modificar incidencias de una orden cancelada.'
      });
    }

    // Verificar que la incidencia exista para este servicio
    const checkRes = await pool.query(
      'SELECT id, servicio_id, costo_adicional_repuesto FROM incidencias_servicio WHERE id = $1 AND servicio_id = $2 AND activo = TRUE',
      [incidenciaId, servicioId]
    );

    if (checkRes.rowCount === 0) {
      return res.status(404).json({ ok: false, message: 'Incidencia técnica no encontrada para esta orden.' });
    }

    const metodosPermitidos = ['Presencial', 'Llamada', 'WhatsApp', 'Correo', 'Otro'];
    let isAprobado = false;
    let metodoFinal = null;
    let fechaAprobacionFinal = null;
    let message = '';

    const isExplicitReject = Boolean(
      estado_aprobacion === 'RECHAZADO' ||
      rechazado === true ||
      rechazado_por_cliente === true ||
      accion === 'rechazar'
    );

    const isExplicitApprove = Boolean(
      !isExplicitReject && (
        estado_aprobacion === 'APROBADO' ||
        aprobado_por_cliente === true ||
        aprobado_por_cliente === 'true' ||
        aprobado_por_cliente === 1 ||
        aprobado_por_cliente === '1' ||
        accion === 'aprobar'
      )
    );

    if (isExplicitReject) {
      isAprobado = false;
      metodoFinal = metodosPermitidos.includes(metodo_aprobacion) ? metodo_aprobacion : 'Llamada';
      fechaAprobacionFinal = new Date();
      message = 'Rechazo del presupuesto registrado exitosamente.';
    } else if (isExplicitApprove) {
      isAprobado = true;
      metodoFinal = metodosPermitidos.includes(metodo_aprobacion) ? metodo_aprobacion : 'WhatsApp';
      fechaAprobacionFinal = new Date();
      message = 'Aprobación del cliente registrada exitosamente.';
    } else {
      // Restablecer a pendiente
      isAprobado = false;
      metodoFinal = null;
      fechaAprobacionFinal = null;
      message = 'Estado de aprobación restablecido a pendiente.';
    }

    await pool.query(
      `UPDATE incidencias_servicio
       SET aprobado_por_cliente = $1,
           metodo_aprobacion = $2,
           fecha_aprobacion = $3
       WHERE id = $4 AND servicio_id = $5`,
      [isAprobado, metodoFinal, fechaAprobacionFinal, incidenciaId, servicioId]
    );

    // Retornar la incidencia actualizada con datos completos
    const updatedRes = await pool.query(
      `SELECT
        inc.id,
        inc.servicio_id,
        inc.tipo_incidencia,
        inc.descripcion,
        inc.repuesto_requerido,
        inc.costo_adicional_repuesto,
        inc.aprobado_por_cliente,
        inc.fecha_aprobacion,
        inc.metodo_aprobacion,
        CASE WHEN inc.aprobado_por_cliente = TRUE THEN 'APROBADO' WHEN inc.fecha_aprobacion IS NOT NULL THEN 'RECHAZADO' ELSE 'PENDIENTE' END AS estado_aprobacion,
        (inc.aprobado_por_cliente = FALSE AND inc.fecha_aprobacion IS NOT NULL) AS rechazado_por_cliente,
        inc.fecha_registro,
        inc.usuario_id,
        TRIM(CONCAT(dt.nombre, ' ', dt.apellido)) AS usuario_nombre,
        COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', ef.id,
              'url', ef.url_foto,
              'url_foto', ef.url_foto,
              'public_id', ef.public_id,
              'tipo_evidencia', ef.tipo_evidencia,
              'fecha_subida', ef.fecha_subida
            ) ORDER BY ef.id ASC
          )
          FROM evidencias_fotograficas ef
          WHERE ef.incidencia_id = inc.id AND ef.activo = TRUE
        ), '[]'::json) AS fotos
      FROM incidencias_servicio inc
      LEFT JOIN datos_trabajadores dt ON dt.id = inc.usuario_id
      WHERE inc.id = $1`,
      [incidenciaId]
    );

    return res.status(200).json({
      ok: true,
      success: true,
      message,
      data: updatedRes.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en updateAprobacionIncidencia:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar la aprobación de la incidencia.' });
  }
};

// ============================================================
// POST /api/servicios/:id/entregar — Liquidación y Entrega de Equipos
// ============================================================
const liquidarYEntregarServicio = async (req, res) => {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const id = parseInt(req.params.id);
    if (!id || id < 1) {
      return res.status(400).json({ ok: false, message: 'ID de orden inválido.' });
    }

    const usuarioId = req.user?.id;
    if (!usuarioId) {
      client.release();
      return res.status(401).json({ ok: false, message: 'Usuario no autenticado.' });
    }

    // Validación canónica de roles: El rol Técnico está estrictamente prohibido
    const userRole = String(req.user?.rol_nombre || req.user?.rol || '').trim().toLowerCase();
    const userRolId = Number(req.user?.rol_id);
    if (userRole === 'tecnico' || userRole.includes('tecnic') || userRolId === 4) {
      client.release();
      return res.status(403).json({
        ok: false,
        message: 'El perfil de Técnico no tiene autorización para realizar la entrega ni cobro de órdenes.'
      });
    }

    const isSuperAdmin = isUserSuperAdmin(req.user);

    await client.query('BEGIN');

    // 1. Obtener la orden bloqueándola para actualización
    const orderRes = await client.query(
      `SELECT sr.id, sr.codigo_ticket, sr.sucursal_id, sr.estado_actual_id,
              sr.costo_previsto, sr.costo_final_confirmado, sr.monto_anticipo, sr.monto_descuento,
              sr.tiempo_garantia, sr.condiciones_garantia, sr.marca_equipo, sr.modelo_equipo,
              COALESCE(sr.nombre_cliente, NULLIF(TRIM(CONCAT(c.nombre, ' ', c.apellido)), ''), c.nombre) AS cliente,
              sr.telefono_cliente,
              es.codigo_estado, es.nombre_estado, es.orden_flujo
       FROM servicios_recepcion sr
       JOIN estados_servicio es ON es.id = sr.estado_actual_id
       LEFT JOIN clientes c ON c.id = sr.cliente_id
       WHERE sr.id = $1 AND sr.activo = TRUE
       FOR UPDATE OF sr`,
      [id]
    );

    if (orderRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, message: 'Orden de servicio no encontrada.' });
    }

    const order = orderRes.rows[0];

    // Validación estricta multi-sucursal
    if (!isSuperAdmin && req.user?.sucursal_id && Number(order.sucursal_id) !== Number(req.user.sucursal_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        ok: false,
        message: 'Acceso denegado: no tiene permisos para liquidar o entregar órdenes de otra sucursal.'
      });
    }

    // Validar si ya está entregada o cancelada
    if (order.codigo_estado === 'ENTREGADO' || Number(order.orden_flujo) === 7) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        ok: false,
        message: 'Esta orden ya fue entregada anteriormente.'
      });
    }

    if (Number(order.orden_flujo) === 8 || String(order.codigo_estado || '').toUpperCase().includes('CANCEL')) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        ok: false,
        message: 'No se puede liquidar o entregar una orden cancelada.'
      });
    }

    // 2. Consultar incidencias activas con costo y calcular repuestos aprobados vs pendientes
    const incidenciasRes = await client.query(
      `SELECT id, tipo_incidencia, descripcion, repuesto_requerido,
              costo_adicional_repuesto, aprobado_por_cliente, fecha_aprobacion, metodo_aprobacion
       FROM incidencias_servicio
       WHERE servicio_id = $1 AND activo = TRUE AND costo_adicional_repuesto > 0`,
      [id]
    );

    const incidenciasConCosto = incidenciasRes.rows;

    // Si tiene alguna incidencia con costo pendiente de aprobación/resolución, bloquear entrega
    const incidenciasPendientes = incidenciasConCosto.filter(
      (inc) => inc.aprobado_por_cliente !== true && !inc.fecha_aprobacion
    );

    if (incidenciasPendientes.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        ok: false,
        message: `No se puede liquidar ni entregar la orden porque tiene ${incidenciasPendientes.length} costo(s)/repuesto(s) adicional(es) pendiente(s) de aprobación por parte del cliente. Debe aprobar o rechazar el presupuesto primero.`
      });
    }

    // Sumar solo los costos de repuestos expresamente aprobados
    const repuestosAprobados = incidenciasConCosto.filter(
      (inc) => inc.aprobado_por_cliente === true
    );
    const sumaRepuestosAprobados = repuestosAprobados.reduce(
      (acc, inc) => acc + parseFloat(inc.costo_adicional_repuesto || 0),
      0
    );

    // 3. Cálculo financiero estricto
    const costoBasePactado = parseFloat(order.costo_final_confirmado) > 0
      ? parseFloat(order.costo_final_confirmado)
      : (parseFloat(order.costo_previsto) || 0);

    const montoDescuento = parseFloat(order.monto_descuento) || 0;
    const montoAnticipo = parseFloat(order.monto_anticipo) || 0;

    // Total = (costoBase || costo_previsto) + suma_repuestos_aprobados - monto_descuento
    const totalDefinitivo = Math.max(0, (costoBasePactado + sumaRepuestosAprobados) - montoDescuento);
    // Balance = Total - monto_anticipo
    const balancePendiente = Math.max(0, totalDefinitivo - montoAnticipo);

    // 4. Validar cobro si hay balance pendiente
    const montoRecibidoParam = req.body.monto_recibido !== undefined && req.body.monto_recibido !== null
      ? parseFloat(req.body.monto_recibido)
      : null;
    const metodoPago = req.body.metodo_pago ? String(req.body.metodo_pago).trim() : 'Efectivo';
    const notasEntrega = req.body.notas_entrega ? String(req.body.notas_entrega).trim() : '';

    let cambioDevuelto = 0;
    if (balancePendiente > 0) {
      if (montoRecibidoParam === null || isNaN(montoRecibidoParam)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          ok: false,
          message: `La orden tiene un saldo pendiente de liquidación de RD$ ${balancePendiente.toFixed(2)}. Debe ingresar el monto recibido del cliente.`
        });
      }

      if (montoRecibidoParam < balancePendiente) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          ok: false,
          message: `El monto recibido (RD$ ${montoRecibidoParam.toFixed(2)}) es menor que el balance adeudado (RD$ ${balancePendiente.toFixed(2)}).`
        });
      }

      cambioDevuelto = Math.max(0, montoRecibidoParam - balancePendiente);
    }

    // 5. Obtener ID del estado 'ENTREGADO' (orden_flujo 7)
    const estadoEntregadoRes = await client.query(
      "SELECT id, codigo_estado, nombre_estado, color_badge, orden_flujo FROM estados_servicio WHERE codigo_estado = 'ENTREGADO' OR orden_flujo = 7 LIMIT 1"
    );

    if (estadoEntregadoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        ok: false,
        message: 'No se encontró el estado "ENTREGADO" en el catálogo del sistema.'
      });
    }

    const estadoEntregado = estadoEntregadoRes.rows[0];

    // 6. Actualizar servicios_recepcion con las columnas dedicadas de entrega
    const finalMetodoPago = balancePendiente > 0 ? metodoPago : null;
    const finalMontoLiquidado = balancePendiente;
    const finalMontoRecibido = balancePendiente > 0 ? (montoRecibidoParam || 0) : 0;
    const finalCambioDevuelto = balancePendiente > 0 ? cambioDevuelto : 0;
    const finalObservacionesEntrega = notasEntrega || null;

    await client.query(
      `UPDATE servicios_recepcion
       SET estado_actual_id = $1,
           fecha_entrega_real = NOW(),
           costo_final_confirmado = $2,
           usuario_entrega_id = $3,
           metodo_pago_entrega = $4,
           monto_liquidado = $5,
           monto_recibido_entrega = $6,
           cambio_devuelto_entrega = $7,
           observaciones_entrega = $8,
           updated_at = NOW()
       WHERE id = $9`,
      [
        estadoEntregado.id,
        totalDefinitivo,
        usuarioId,
        finalMetodoPago,
        finalMontoLiquidado,
        finalMontoRecibido,
        finalCambioDevuelto,
        finalObservacionesEntrega,
        id
      ]
    );

    // 7. Registrar en historial_estados la transición oficial a ENTREGADO
    await client.query(
      `INSERT INTO historial_estados (servicio_id, estado_id, usuario_id, nota_cambio, fecha_registro)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, estadoEntregado.id, usuarioId, 'Equipo entregado y liquidado al cliente.']
    );

    // 8. Insertar fotos de entrega en evidencias_fotograficas (si se proporcionaron)
    const rawFotosEntrega = Array.isArray(req.body.fotos_entrega)
      ? req.body.fotos_entrega
      : (Array.isArray(req.body.evidencias_entrega)
        ? req.body.evidencias_entrega
        : (Array.isArray(req.body.fotos) ? req.body.fotos : []));

    const fotosEntregaValidas = rawFotosEntrega
      .filter(Boolean)
      .map(function(item) {
        if (typeof item === 'object' && item !== null) {
          const url = String(item.url || item.url_foto || item.secure_url || '').trim();
          const public_id = item.public_id ? String(item.public_id).trim() : null;
          return url ? { url: url, public_id: public_id } : null;
        }
        if (typeof item === 'string' && item.trim().length > 0) {
          return { url: item.trim(), public_id: null };
        }
        return null;
      })
      .filter(Boolean);

    for (var fe = 0; fe < fotosEntregaValidas.length; fe++) {
      var fotoEntrega = fotosEntregaValidas[fe];
      await client.query(
        'INSERT INTO evidencias_fotograficas (servicio_id, url_foto, public_id, tipo_evidencia, usuario_id) VALUES ($1, $2, $3, $4, $5)',
        [id, fotoEntrega.url, fotoEntrega.public_id, 'ENTREGA', usuarioId]
      );
    }

    await client.query('COMMIT');

    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Equipo entregado y liquidado exitosamente.',
      data: {
        id,
        codigo_ticket: order.codigo_ticket,
        estado_actual_id: estadoEntregado.id,
        estado: estadoEntregado.nombre_estado,
        codigo_estado: estadoEntregado.codigo_estado,
        estado_color: estadoEntregado.color_badge,
        orden_flujo: estadoEntregado.orden_flujo,
        costo_final_confirmado: totalDefinitivo,
        fecha_entrega_real: new Date().toISOString(),
        usuario_entrega_id: usuarioId,
        metodo_pago_entrega: finalMetodoPago,
        monto_liquidado: finalMontoLiquidado,
        monto_recibido_entrega: finalMontoRecibido,
        cambio_devuelto_entrega: finalCambioDevuelto,
        observaciones_entrega: finalObservacionesEntrega,
        desglose_liquidacion: {
          costo_base: costoBasePactado,
          suma_repuestos_aprobados: sumaRepuestosAprobados,
          repuestos_aprobados: repuestosAprobados,
          monto_descuento: montoDescuento,
          total: totalDefinitivo,
          monto_anticipo: montoAnticipo,
          balance_liquidado: balancePendiente,
          monto_recibido: finalMontoRecibido,
          cambio_devuelto: finalCambioDevuelto,
          metodo_pago: finalMetodoPago || 'Previo / Anticipo'
        }
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en liquidarYEntregarServicio:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al procesar la liquidación y entrega de la orden de servicio.'
    });
  } finally {
    client.release();
  }
};

/**
 * POST /api/servicios/:id/cancelar
 * Cancelación formal de una orden de servicio técnico.
 * Valida que no esté previamente entregada ni cancelada, exige motivo,
 * actualiza el estado a CANCELADO_DEVUELTO, persiste motivo/fecha/usuario y
 * registra el evento en historial_estados.
 */
const cancelarServicio = async (req, res) => {
  const { id } = req.params;
  const { motivo_cancelacion } = req.body || {};
  const usuarioId = req.user?.id;
  const isSuperAdmin = Number(req.user?.rol_id) === 1;

  if (!motivo_cancelacion || typeof motivo_cancelacion !== 'string' || motivo_cancelacion.trim().length < 5) {
    return res.status(400).json({
      ok: false,
      success: false,
      message: 'El motivo de cancelación es obligatorio y debe contener al menos 5 caracteres.'
    });
  }

  const motivoLimpio = motivo_cancelacion.trim();
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Obtener la orden bloqueándola para actualización
    const orderRes = await client.query(
      `SELECT sr.id, sr.codigo_ticket, sr.sucursal_id, sr.estado_actual_id,
              es.codigo_estado, es.nombre_estado, es.orden_flujo
       FROM servicios_recepcion sr
       JOIN estados_servicio es ON es.id = sr.estado_actual_id
       WHERE sr.id = $1 AND sr.activo = TRUE
       FOR UPDATE OF sr`,
      [id]
    );

    if (orderRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        ok: false,
        success: false,
        message: 'Orden de servicio no encontrada.'
      });
    }

    const order = orderRes.rows[0];

    // Validación multi-sucursal
    if (!isSuperAdmin && req.user?.sucursal_id && Number(order.sucursal_id) !== Number(req.user.sucursal_id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        ok: false,
        success: false,
        message: 'Acceso denegado: no tiene permisos para cancelar órdenes de otra sucursal.'
      });
    }

    const codEstadoActual = String(order.codigo_estado || '').toUpperCase();
    const flujoActual = Number(order.orden_flujo || 0);

    // Impedir cancelación si ya fue entregada
    if (codEstadoActual.includes('ENTREG') || flujoActual === 7) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        ok: false,
        success: false,
        message: 'No es posible cancelar una orden que ya fue entregada al cliente.'
      });
    }

    // Impedir cancelación si ya está cancelada
    if (codEstadoActual.includes('CANCEL') || flujoActual === 8) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        ok: false,
        success: false,
        message: 'Esta orden ya se encuentra cancelada.'
      });
    }

    // 2. Buscar estado 'CANCELADO_DEVUELTO' (orden_flujo 8)
    const estadoCanceladoRes = await client.query(
      `SELECT id, codigo_estado, nombre_estado, color_badge, orden_flujo
       FROM estados_servicio
       WHERE codigo_estado = 'CANCELADO_DEVUELTO' OR codigo_estado ILIKE '%CANCEL%' OR orden_flujo = 8
       ORDER BY orden_flujo DESC
       LIMIT 1`
    );

    if (estadoCanceladoRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({
        ok: false,
        success: false,
        message: 'No se encontró el estado de cancelación en el catálogo del sistema.'
      });
    }

    const estadoCancelado = estadoCanceladoRes.rows[0];

    // 3. Actualizar orden
    await client.query(
      `UPDATE servicios_recepcion
       SET estado_actual_id = $1,
           motivo_cancelacion = $2,
           fecha_cancelacion = NOW(),
           usuario_cancela_id = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [estadoCancelado.id, motivoLimpio, usuarioId, id]
    );

    // 4. Registrar en historial_estados
    await client.query(
      `INSERT INTO historial_estados (servicio_id, estado_id, usuario_id, nota_cambio, fecha_registro)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, estadoCancelado.id, usuarioId, `Cancelación de orden: ${motivoLimpio}`]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      ok: true,
      success: true,
      message: 'Orden de servicio cancelada correctamente.',
      data: {
        id: Number(id),
        codigo_ticket: order.codigo_ticket,
        estado_actual_id: estadoCancelado.id,
        estado: estadoCancelado.nombre_estado,
        codigo_estado: estadoCancelado.codigo_estado,
        estado_color: estadoCancelado.color_badge,
        orden_flujo: estadoCancelado.orden_flujo,
        motivo_cancelacion: motivoLimpio,
        fecha_cancelacion: new Date().toISOString()
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error en cancelarServicio:', error);
    return res.status(500).json({
      ok: false,
      success: false,
      message: 'Error al procesar la cancelación de la orden de servicio.'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  createServicio,
  getServicios,
  getServicioById,
  getServicioByTicket,
  getServiciosTaller,
  updateServicioEstado,
  assignTecnicoServicio,
  removeTecnicoServicio,
  validarGarantiaTicket,
  uploadFotosServicio,
  getIncidenciasServicio,
  createIncidenciaServicio,
  updateAprobacionIncidencia,
  liquidarYEntregarServicio,
  cancelarServicio,
  getTicketImpresionData
};