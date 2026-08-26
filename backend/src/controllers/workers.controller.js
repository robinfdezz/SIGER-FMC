const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');

/**
 * Obtener listado de todos los trabajadores con sus roles y sucursales.
 * GET /api/trabajadores
 */
const getWorkers = async (req, res) => {
  try {
    const pool = getPool();
    const queryParams = [];
    let query = `
      SELECT 
        t.id,
        t.sucursal_id,
        t.rol_id,
        t.usuario,
        t.nombre,
        t.apellido,
        t.cedula,
        t.telefono,
        t.correo,
        t.foto_perfil_url,
        t.ultimo_login,
        t.created_at,
        t.updated_at,
        t.activo,
        r.nombre_rol AS rol_nombre,
        s.nombre_sucursal AS sucursal_nombre,
        s.codigo_sucursal AS sucursal_codigo
      FROM datos_trabajadores t
      INNER JOIN roles_equipo r ON t.rol_id = r.id
      LEFT JOIN datos_sucursales s ON t.sucursal_id = s.id
    `;

    // Aislamiento por sucursal: Admin_Sucursal solo ve trabajadores de su sede
    if (!req.isSuperAdmin && req.filterSucursalId) {
      queryParams.push(req.filterSucursalId);
      query += ` WHERE t.sucursal_id = $${queryParams.length}`;
    } else if (req.query.sucursal_id) {
      // Filtro opcional para SuperAdmin
      queryParams.push(parseInt(req.query.sucursal_id, 10));
      query += ` WHERE t.sucursal_id = $${queryParams.length}`;
    }

    query += ` ORDER BY t.id ASC`;

    const result = await pool.query(query, queryParams);

    return res.status(200).json({
      ok: true,
      message: 'Listado de trabajadores obtenido con éxito.',
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error en getWorkers:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al obtener la lista de trabajadores.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener el detalle de un trabajador por ID.
 * GET /api/trabajadores/:id
 */
const getWorkerById = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id, 10);
    if (isNaN(workerId)) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del trabajador proporcionado es inválido.'
      });
    }

    const pool = getPool();
    const query = `
      SELECT 
        t.id,
        t.sucursal_id,
        t.rol_id,
        t.usuario,
        t.nombre,
        t.apellido,
        t.cedula,
        t.telefono,
        t.correo,
        t.foto_perfil_url,
        t.ultimo_login,
        t.created_at,
        t.updated_at,
        t.activo,
        r.nombre_rol AS rol_nombre,
        s.nombre_sucursal AS sucursal_nombre,
        s.codigo_sucursal AS sucursal_codigo
      FROM datos_trabajadores t
      INNER JOIN roles_equipo r ON t.rol_id = r.id
      LEFT JOIN datos_sucursales s ON t.sucursal_id = s.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [workerId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Trabajador no encontrado.'
      });
    }

    const worker = result.rows[0];

    // Validar aislamiento de sucursal
    if (!req.isSuperAdmin && req.filterSucursalId && worker.sucursal_id !== req.filterSucursalId) {
      return res.status(403).json({
        ok: false,
        message: 'No tiene permisos para acceder a la información de trabajadores de otra sucursal.'
      });
    }

    return res.status(200).json({
      ok: true,
      data: worker
    });
  } catch (error) {
    console.error('❌ Error en getWorkerById:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al consultar el trabajador.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Crear un nuevo trabajador en el sistema.
 * POST /api/trabajadores
 */
const createWorker = async (req, res) => {
  try {
    const {
      usuario,
      password,
      nombre,
      apellido,
      cedula,
      telefono,
      correo,
      rol_id,
      sucursal_id,
      foto_perfil_url
    } = req.body;

    // 1. Validar campos obligatorios
    if (!usuario || !password || !nombre || !apellido || !cedula || !telefono || !correo || !rol_id) {
      return res.status(400).json({
        ok: false,
        message: 'Todos los campos obligatorios deben ser proporcionados (usuario, password, nombre, apellido, cedula, telefono, correo, rol_id).'
      });
    }

    const cleanUsername = String(usuario).trim().toLowerCase();
    const cleanEmail = String(correo).trim().toLowerCase();
    const cleanCedula = String(cedula).trim();

    // 2. Control de asignación de sucursal según rol del usuario autenticado
    let assignedBranchId = sucursal_id ? parseInt(sucursal_id, 10) : null;
    if (!req.isSuperAdmin && req.filterSucursalId) {
      assignedBranchId = req.filterSucursalId;
    }

    const pool = getPool();

    // 3. Verificar duplicados (usuario, correo, cedula)
    const duplicateCheckQuery = `
      SELECT id, usuario, correo, cedula
      FROM datos_trabajadores
      WHERE LOWER(usuario) = $1 OR LOWER(correo) = $2 OR cedula = $3
      LIMIT 1
    `;
    const duplicateRes = await pool.query(duplicateCheckQuery, [cleanUsername, cleanEmail, cleanCedula]);

    if (duplicateRes.rows.length > 0) {
      const existing = duplicateRes.rows[0];
      let fieldConflict = 'datos ya registrados';
      if (existing.usuario.toLowerCase() === cleanUsername) fieldConflict = 'nombre de usuario';
      else if (existing.correo.toLowerCase() === cleanEmail) fieldConflict = 'correo electrónico';
      else if (existing.cedula === cleanCedula) fieldConflict = 'número de cédula';

      return res.status(409).json({
        ok: false,
        message: `Ya existe un trabajador registrado con este ${fieldConflict}.`
      });
    }

    // 4. Hashear contraseña con bcryptjs (10 rondas de salt)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 5. Insertar nuevo trabajador
    const insertQuery = `
      INSERT INTO datos_trabajadores (
        sucursal_id,
        rol_id,
        usuario,
        nombre,
        apellido,
        cedula,
        telefono,
        correo,
        password,
        foto_perfil_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING 
        id,
        sucursal_id,
        rol_id,
        usuario,
        nombre,
        apellido,
        cedula,
        telefono,
        correo,
        foto_perfil_url,
        activo,
        created_at
    `;

    const insertResult = await pool.query(insertQuery, [
      assignedBranchId,
      parseInt(rol_id, 10),
      cleanUsername,
      nombre.trim(),
      apellido.trim(),
      cleanCedula,
      telefono.trim(),
      cleanEmail,
      hashedPassword,
      foto_perfil_url || null
    ]);

    return res.status(201).json({
      ok: true,
      message: 'Trabajador registrado exitosamente.',
      data: insertResult.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en createWorker:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al registrar el nuevo trabajador.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar datos de un trabajador existente.
 * PUT /api/trabajadores/:id
 */
const updateWorker = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id, 10);
    if (isNaN(workerId)) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del trabajador es inválido.'
      });
    }

    const {
      usuario,
      password,
      nombre,
      apellido,
      cedula,
      telefono,
      correo,
      rol_id,
      sucursal_id,
      foto_perfil_url
    } = req.body;

    const pool = getPool();

    // 1. Verificar existencia del trabajador
    const checkWorkerRes = await pool.query(
      'SELECT id, sucursal_id, password FROM datos_trabajadores WHERE id = $1',
      [workerId]
    );

    if (checkWorkerRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Trabajador no encontrado.'
      });
    }

    const currentWorker = checkWorkerRes.rows[0];

    // Aislamiento por sucursal
    if (!req.isSuperAdmin && req.filterSucursalId && currentWorker.sucursal_id !== req.filterSucursalId) {
      return res.status(403).json({
        ok: false,
        message: 'No tiene permisos para modificar trabajadores de otra sucursal.'
      });
    }

    const cleanUsername = usuario ? String(usuario).trim().toLowerCase() : undefined;
    const cleanEmail = correo ? String(correo).trim().toLowerCase() : undefined;
    const cleanCedula = cedula ? String(cedula).trim() : undefined;

    // 2. Validar duplicados en otros trabajadores
    const duplicateQuery = `
      SELECT id, usuario, correo, cedula
      FROM datos_trabajadores
      WHERE (LOWER(usuario) = $1 OR LOWER(correo) = $2 OR cedula = $3) AND id != $4
      LIMIT 1
    `;
    const duplicateRes = await pool.query(duplicateQuery, [cleanUsername, cleanEmail, cleanCedula, workerId]);

    if (duplicateRes.rows.length > 0) {
      const existing = duplicateRes.rows[0];
      let fieldConflict = 'datos ya registrados';
      if (cleanUsername && existing.usuario.toLowerCase() === cleanUsername) fieldConflict = 'nombre de usuario';
      else if (cleanEmail && existing.correo.toLowerCase() === cleanEmail) fieldConflict = 'correo electrónico';
      else if (cleanCedula && existing.cedula === cleanCedula) fieldConflict = 'número de cédula';

      return res.status(409).json({
        ok: false,
        message: `El ${fieldConflict} ya se encuentra asignado a otro trabajador.`
      });
    }

    // 3. Evaluar actualización de contraseña
    let finalPassword = currentWorker.password;
    if (password && String(password).trim().length > 0) {
      finalPassword = await bcrypt.hash(String(password).trim(), 10);
    }

    // 4. Determinar sucursal asignada
    let branchToAssign = sucursal_id !== undefined ? (sucursal_id ? parseInt(sucursal_id, 10) : null) : currentWorker.sucursal_id;
    if (!req.isSuperAdmin && req.filterSucursalId) {
      branchToAssign = req.filterSucursalId;
    }

    // 5. Ejecutar actualización
    const updateQuery = `
      UPDATE datos_trabajadores
      SET 
        usuario = COALESCE($1, usuario),
        nombre = COALESCE($2, nombre),
        apellido = COALESCE($3, apellido),
        cedula = COALESCE($4, cedula),
        telefono = COALESCE($5, telefono),
        correo = COALESCE($6, correo),
        rol_id = COALESCE($7, rol_id),
        sucursal_id = $8,
        foto_perfil_url = COALESCE($9, foto_perfil_url),
        password = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING 
        id,
        sucursal_id,
        rol_id,
        usuario,
        nombre,
        apellido,
        cedula,
        telefono,
        correo,
        foto_perfil_url,
        activo,
        updated_at
    `;

    const updateRes = await pool.query(updateQuery, [
      cleanUsername || null,
      nombre ? nombre.trim() : null,
      apellido ? apellido.trim() : null,
      cleanCedula || null,
      telefono ? telefono.trim() : null,
      cleanEmail || null,
      rol_id ? parseInt(rol_id, 10) : null,
      branchToAssign,
      foto_perfil_url !== undefined ? foto_perfil_url : null,
      finalPassword,
      workerId
    ]);

    return res.status(200).json({
      ok: true,
      message: 'Trabajador actualizado exitosamente.',
      data: updateRes.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en updateWorker:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al actualizar los datos del trabajador.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Alternar estado lógico activo / inactivo de un trabajador.
 * PATCH /api/trabajadores/:id/toggle-status
 */
const toggleWorkerStatus = async (req, res) => {
  try {
    const workerId = parseInt(req.params.id, 10);
    if (isNaN(workerId)) {
      return res.status(400).json({
        ok: false,
        message: 'El ID del trabajador es inválido.'
      });
    }

    // Prevenir desactivación de la propia sesión activa
    if (req.user && req.user.id === workerId) {
      return res.status(400).json({
        ok: false,
        message: 'No es posible desactivar la cuenta de usuario de la sesión actualmente activa.'
      });
    }

    const pool = getPool();

    // 1. Verificar existencia y permisos de sucursal
    const checkRes = await pool.query(
      'SELECT id, sucursal_id, activo, nombre, apellido FROM datos_trabajadores WHERE id = $1',
      [workerId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Trabajador no encontrado.'
      });
    }

    const currentWorker = checkRes.rows[0];

    if (!req.isSuperAdmin && req.filterSucursalId && currentWorker.sucursal_id !== req.filterSucursalId) {
      return res.status(403).json({
        ok: false,
        message: 'No tiene permisos para modificar el estado de trabajadores de otra sucursal.'
      });
    }

    // 2. Alternar estado activo
    const toggleQuery = `
      UPDATE datos_trabajadores
      SET activo = NOT activo, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, usuario, nombre, apellido, activo, updated_at
    `;

    const toggleRes = await pool.query(toggleQuery, [workerId]);
    const updated = toggleRes.rows[0];

    return res.status(200).json({
      ok: true,
      message: `El trabajador ${updated.nombre} ${updated.apellido} ha sido ${updated.activo ? 'activado' : 'desactivado'} exitosamente.`,
      data: updated
    });
  } catch (error) {
    console.error('❌ Error en toggleWorkerStatus:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al cambiar el estado del trabajador.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  toggleWorkerStatus
};
