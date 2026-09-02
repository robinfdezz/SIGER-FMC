const bcrypt = require('bcryptjs');
const { getPool } = require('../config/db');
const { uploadImageBuffer, deleteImageByPublicId, deleteImageByUrl } = require('../config/cloudinary');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Función auxiliar para validar reglas de negocio en payloads de trabajadores
 */
const validateWorkerPayload = async (pool, data, isEdit = false, currentWorker = null) => {
  const {
    nombre,
    apellido,
    usuario,
    cedula,
    correo,
    telefono,
    rol_id,
    sucursal_id,
    password
  } = data;

  // 1. Nombre (min 2, max 50)
  if (!isEdit || nombre !== undefined) {
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return 'El nombre es obligatorio y debe tener al menos 2 caracteres.';
    }
    if (nombre.trim().length > 50) {
      return 'El nombre no puede exceder los 50 caracteres.';
    }
  }

  // 2. Apellido (min 2, max 50)
  if (!isEdit || apellido !== undefined) {
    if (!apellido || typeof apellido !== 'string' || apellido.trim().length < 2) {
      return 'El apellido es obligatorio y debe tener al menos 2 caracteres.';
    }
    if (apellido.trim().length > 50) {
      return 'El apellido no puede exceder los 50 caracteres.';
    }
  }

  // 3. Nombre de Usuario (sin espacios, min 6, max 50)
  if (!isEdit || usuario !== undefined) {
    if (!usuario || typeof usuario !== 'string') {
      return 'El nombre de usuario es obligatorio.';
    }
    if (/\s/.test(usuario)) {
      return 'El nombre de usuario no puede contener espacios en blanco.';
    }
    const cleanUser = usuario.trim();
    if (cleanUser.length < 6) {
      return 'El nombre de usuario debe tener al menos 6 caracteres.';
    }
    if (cleanUser.length > 50) {
      return 'El nombre de usuario no puede exceder los 50 caracteres.';
    }
  }

  // 4. Cédula (solo dígitos numéricos, min 11, max 20)
  if (!isEdit || cedula !== undefined) {
    if (!cedula) {
      return 'La cédula de identidad es obligatoria.';
    }
    const cleanCed = String(cedula).replace(/\D/g, '');
    if (cleanCed.length < 11) {
      return 'La cédula debe contener al menos 11 dígitos numéricos.';
    }
    if (cleanCed.length > 20) {
      return 'La cédula no puede exceder los 20 dígitos numéricos.';
    }
  }

  // 5. Correo Electrónico (sin espacios, formato válido, max 100)
  if (!isEdit || correo !== undefined) {
    if (!correo || typeof correo !== 'string') {
      return 'El correo electrónico es obligatorio.';
    }
    if (/\s/.test(correo)) {
      return 'El correo electrónico no puede contener espacios en blanco.';
    }
    const cleanMail = correo.trim();
    if (cleanMail.length > 100) {
      return 'El correo electrónico no puede exceder los 100 caracteres.';
    }
    if (!EMAIL_REGEX.test(cleanMail)) {
      return 'Ingrese un correo electrónico con formato válido (ej. usuario@dominio.com).';
    }
  }

  // 6. Teléfono (solo dígitos numéricos, min 10, max 20)
  if (!isEdit || telefono !== undefined) {
    if (!telefono) {
      return 'El teléfono de contacto es obligatorio.';
    }
    const cleanTel = String(telefono).replace(/\D/g, '');
    if (cleanTel.length < 10) {
      return 'El teléfono debe contener al menos 10 dígitos numéricos.';
    }
    if (cleanTel.length > 20) {
      return 'El teléfono no puede exceder los 20 dígitos numéricos.';
    }
  }

  // 7. Rol y Sucursal
  let targetRoleId = rol_id !== undefined ? parseInt(rol_id, 10) : currentWorker?.rol_id;
  if (!isEdit || rol_id !== undefined) {
    if (!targetRoleId || isNaN(targetRoleId)) {
      return 'Debe seleccionar un rol de usuario válido.';
    }
  }

  let roleName = null;
  if (targetRoleId) {
    const roleRes = await pool.query('SELECT id, nombre_rol FROM roles_equipo WHERE id = $1', [targetRoleId]);
    if (roleRes.rows.length === 0) {
      return 'El rol seleccionado no existe en el sistema.';
    }
    roleName = roleRes.rows[0].nombre_rol;
  }

  // Si no es SuperAdmin, la sucursal es obligatoria y debe existir
  if (roleName && roleName !== 'SuperAdmin') {
    const targetBranchId = sucursal_id !== undefined ? (sucursal_id ? parseInt(sucursal_id, 10) : null) : currentWorker?.sucursal_id;
    if (!targetBranchId) {
      return 'Debe asignar una sucursal activa para este rol de usuario.';
    }
    const branchRes = await pool.query('SELECT id FROM datos_sucursales WHERE id = $1 AND activo = TRUE', [targetBranchId]);
    if (branchRes.rows.length === 0) {
      return 'La sucursal asignada no existe o se encuentra inactiva.';
    }
  }

  // 8. Contraseña (sin espacios, min 8, max 20)
  if (!isEdit) {
    if (!password || typeof password !== 'string') {
      return 'La contraseña es obligatoria.';
    }
    if (/\s/.test(password)) {
      return 'La contraseña no puede contener espacios en blanco.';
    }
    if (password.length < 8) {
      return 'La contraseña debe tener al menos 8 caracteres.';
    }
    if (password.length > 20) {
      return 'La contraseña no puede exceder los 20 caracteres.';
    }
  } else if (password !== undefined && password !== null && String(password).length > 0) {
    if (/\s/.test(password)) {
      return 'La nueva contraseña no puede contener espacios en blanco.';
    }
    if (String(password).length < 8) {
      return 'La nueva contraseña debe tener al menos 8 caracteres.';
    }
    if (String(password).length > 20) {
      return 'La nueva contraseña no puede exceder los 20 caracteres.';
    }
  }

  return null;
};

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
        t.foto_perfil_public_id,
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
        t.foto_perfil_public_id,
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
    const pool = getPool();

    // 1. Validar reglas de negocio del payload
    const validationError = await validateWorkerPayload(pool, req.body, false);
    if (validationError) {
      return res.status(400).json({
        ok: false,
        message: validationError
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
      foto_perfil_url,
      foto_perfil_public_id
    } = req.body;

    const cleanUsername = String(usuario).trim().toLowerCase();
    const cleanEmail = String(correo).trim().toLowerCase();
    const cleanCedula = String(cedula).replace(/\D/g, '');
    const cleanTelefono = String(telefono).replace(/\D/g, '');

    // 2. Control de asignación de sucursal y rol según rol del usuario autenticado (RBAC)
    let assignedBranchId = sucursal_id ? parseInt(sucursal_id, 10) : null;
    if (!req.isSuperAdmin) {
      // Validar que el rol_id solicitado pertenezca a Técnico o Secretaria
      const targetRoleRes = await pool.query('SELECT id, nombre_rol FROM roles_equipo WHERE id = $1', [parseInt(rol_id, 10)]);
      if (targetRoleRes.rows.length === 0) {
        return res.status(400).json({ ok: false, message: 'El rol seleccionado no existe.' });
      }
      const targetRoleName = targetRoleRes.rows[0].nombre_rol;
      if (!['Tecnico', 'Secretaria'].includes(targetRoleName)) {
        return res.status(403).json({
          ok: false,
          message: 'No tienes permisos para asignar este rol. Un Administrador de Sucursal solo puede registrar Técnicos o Secretarias.'
        });
      }

      // Forzar la sucursal del admin autenticado
      assignedBranchId = req.filterSucursalId || req.user.sucursal_id;
    }

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
        message: `Ya existe un usuario registrado con este ${fieldConflict}.`
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
        foto_perfil_url,
        foto_perfil_public_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        foto_perfil_public_id,
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
      cleanTelefono,
      cleanEmail,
      hashedPassword,
      foto_perfil_url ? String(foto_perfil_url).trim() : null,
      foto_perfil_public_id ? String(foto_perfil_public_id).trim() : null
    ]);

    return res.status(201).json({
      ok: true,
      message: 'Usuario registrado exitosamente.',
      data: insertResult.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en createWorker:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al registrar el nuevo usuario.',
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
        message: 'El ID del usuario proporcionado es inválido.'
      });
    }

    const pool = getPool();

    // 1. Verificar existencia del trabajador
    const checkWorkerRes = await pool.query(
      'SELECT id, sucursal_id, rol_id, password, foto_perfil_url, foto_perfil_public_id FROM datos_trabajadores WHERE id = $1',
      [workerId]
    );

    if (checkWorkerRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Usuario no encontrado.'
      });
    }

    const currentWorker = checkWorkerRes.rows[0];

    // Aislamiento por sucursal
    if (!req.isSuperAdmin && req.filterSucursalId && currentWorker.sucursal_id !== req.filterSucursalId) {
      return res.status(403).json({
        ok: false,
        message: 'No tiene permisos para modificar usuarios de otra sucursal.'
      });
    }

    // 2. Validar reglas de negocio del payload
    const validationError = await validateWorkerPayload(pool, req.body, true, currentWorker);
    if (validationError) {
      return res.status(400).json({
        ok: false,
        message: validationError
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
      foto_perfil_url,
      foto_perfil_public_id
    } = req.body;

    const cleanUsername = usuario !== undefined ? String(usuario).trim().toLowerCase() : undefined;
    const cleanEmail = correo !== undefined ? String(correo).trim().toLowerCase() : undefined;
    const cleanCedula = cedula !== undefined ? String(cedula).replace(/\D/g, '') : undefined;
    const cleanTelefono = telefono !== undefined ? String(telefono).replace(/\D/g, '') : undefined;

    // Gestionar foto_perfil_url, foto_perfil_public_id y eliminación previa en Cloudinary
    let newFotoUrl = currentWorker.foto_perfil_url;
    let newPublicId = currentWorker.foto_perfil_public_id;

    if (foto_perfil_url !== undefined) {
      newFotoUrl = (foto_perfil_url && String(foto_perfil_url).trim().length > 0)
        ? String(foto_perfil_url).trim()
        : null;

      newPublicId = (newFotoUrl && foto_perfil_public_id && String(foto_perfil_public_id).trim().length > 0)
        ? String(foto_perfil_public_id).trim()
        : null;

      // Si la foto cambió o fue eliminada voluntariamente, destruir la imagen previa en Cloudinary
      if (
        (currentWorker.foto_perfil_public_id || currentWorker.foto_perfil_url) &&
        (currentWorker.foto_perfil_public_id !== newPublicId || currentWorker.foto_perfil_url !== newFotoUrl)
      ) {
        if (currentWorker.foto_perfil_public_id) {
          deleteImageByPublicId(currentWorker.foto_perfil_public_id).catch((err) =>
            console.error('⚠️ Error al eliminar foto anterior de Cloudinary por public_id:', err.message)
          );
        } else if (currentWorker.foto_perfil_url) {
          deleteImageByUrl(currentWorker.foto_perfil_url).catch((err) =>
            console.error('⚠️ Error al eliminar foto anterior de Cloudinary por URL:', err.message)
          );
        }
      }
    }

    // 3. Validar duplicados en otros trabajadores
    const duplicateQuery = `
      SELECT id, usuario, correo, cedula
      FROM datos_trabajadores
      WHERE (LOWER(usuario) = $1 OR LOWER(correo) = $2 OR cedula = $3) AND id != $4
      LIMIT 1
    `;
    const duplicateRes = await pool.query(duplicateQuery, [
      cleanUsername || '',
      cleanEmail || '',
      cleanCedula || '',
      workerId
    ]);

    if (duplicateRes.rows.length > 0) {
      const existing = duplicateRes.rows[0];
      let fieldConflict = 'datos ya registrados';
      if (cleanUsername && existing.usuario.toLowerCase() === cleanUsername) fieldConflict = 'nombre de usuario';
      else if (cleanEmail && existing.correo.toLowerCase() === cleanEmail) fieldConflict = 'correo electrónico';
      else if (cleanCedula && existing.cedula === cleanCedula) fieldConflict = 'número de cédula';

      return res.status(409).json({
        ok: false,
        message: `El ${fieldConflict} ya se encuentra asignado a otro usuario.`
      });
    }

    // 4. Evaluar actualización de contraseña
    let finalPassword = currentWorker.password;
    if (password && String(password).trim().length > 0) {
      finalPassword = await bcrypt.hash(String(password).trim(), 10);
    }

    // 5. Determinar sucursal y rol asignado según rol del usuario autenticado (RBAC)
    let branchToAssign = sucursal_id !== undefined ? (sucursal_id ? parseInt(sucursal_id, 10) : null) : currentWorker.sucursal_id;
    if (!req.isSuperAdmin) {
      // Si se intenta modificar el rol, validar que solo pueda ser Técnico o Secretaria
      if (rol_id !== undefined && rol_id !== null && String(rol_id).trim() !== '') {
        const targetRoleRes = await pool.query('SELECT id, nombre_rol FROM roles_equipo WHERE id = $1', [parseInt(rol_id, 10)]);
        if (targetRoleRes.rows.length === 0) {
          return res.status(400).json({ ok: false, message: 'El rol seleccionado no existe.' });
        }
        const targetRoleName = targetRoleRes.rows[0].nombre_rol;
        if (!['Tecnico', 'Secretaria'].includes(targetRoleName)) {
          return res.status(403).json({
            ok: false,
            message: 'No tienes permisos para asignar este rol. Un Administrador de Sucursal solo puede asignar roles de Técnico o Secretaria.'
          });
        }
      }

      // Forzar la sucursal del admin autenticado
      branchToAssign = req.filterSucursalId || req.user.sucursal_id;
    }

    // 6. Ejecutar actualización
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
        foto_perfil_url = $9,
        foto_perfil_public_id = $10,
        password = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
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
        foto_perfil_public_id,
        activo,
        updated_at
    `;

    const updateRes = await pool.query(updateQuery, [
      cleanUsername !== undefined ? cleanUsername : null,
      nombre !== undefined ? nombre.trim() : null,
      apellido !== undefined ? apellido.trim() : null,
      cleanCedula !== undefined ? cleanCedula : null,
      cleanTelefono !== undefined ? cleanTelefono : null,
      cleanEmail !== undefined ? cleanEmail : null,
      rol_id !== undefined ? parseInt(rol_id, 10) : null,
      branchToAssign,
      newFotoUrl,
      newPublicId,
      finalPassword,
      workerId
    ]);

    return res.status(200).json({
      ok: true,
      message: 'Usuario actualizado exitosamente.',
      data: updateRes.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en updateWorker:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al actualizar los datos del usuario.',
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

/**
 * Subir foto de perfil a Cloudinary.
 * POST /api/trabajadores/upload-avatar
 */
const uploadWorkerAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: 'No se ha seleccionado ningún archivo de imagen para subir.'
      });
    }

    const result = await uploadImageBuffer(req.file.buffer, 'siger-fmc/personal-fmc');

    return res.status(200).json({
      ok: true,
      message: 'Foto de perfil subida exitosamente.',
      foto_perfil_url: result.secure_url,
      public_id: result.public_id,
      foto_perfil_public_id: result.public_id
    });
  } catch (error) {
    console.error('❌ Error en uploadWorkerAvatar:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al procesar y subir la imagen a Cloudinary.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  toggleWorkerStatus,
  uploadWorkerAvatar
};
