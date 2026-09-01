const { getPool } = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Función auxiliar para validar reglas de negocio en payloads de clientes
 */
const validateClientPayload = async (pool, data, isEdit = false, currentClientId = null) => {
  const {
    nombre,
    apellido,
    cedula_rnc,
    telefono,
    telefono_adicional,
    correo,
    direccion
  } = data;

  // 1. Nombre (Obligatorio, min 2, max 100)
  if (!isEdit || nombre !== undefined) {
    if (!nombre || typeof nombre !== 'string' || nombre.trim().length < 2) {
      return 'El nombre del cliente es obligatorio y debe tener al menos 2 caracteres.';
    }
    if (nombre.trim().length > 100) {
      return 'El nombre no puede exceder los 100 caracteres.';
    }
  }

  // 2. Apellido (Obligatorio, min 2, max 100)
  if (!isEdit || apellido !== undefined) {
    if (!apellido || typeof apellido !== 'string' || apellido.trim().length === 0) {
      return 'El apellido del cliente es obligatorio.';
    }
    if (apellido.trim().length < 2) {
      return 'El apellido debe tener al menos 2 caracteres.';
    }
    if (apellido.trim().length > 100) {
      return 'El apellido no puede exceder los 100 caracteres.';
    }
  }

  // 3. Cédula o RNC (Obligatorio, min 9, max 20, único)
  if (!isEdit || cedula_rnc !== undefined) {
    if (!cedula_rnc || typeof cedula_rnc !== 'string' || cedula_rnc.trim().length === 0) {
      return 'La cédula o RNC es obligatoria.';
    }
    const cleanCed = cedula_rnc.trim();
    if (cleanCed.length < 9) {
      return 'La cédula o RNC debe tener al menos 9 caracteres numéricos.';
    }
    if (cleanCed.length > 20) {
      return 'La cédula o RNC no puede exceder los 20 caracteres.';
    }

    // Verificar unicidad en base de datos
    let checkQuery = 'SELECT id FROM clientes WHERE LOWER(cedula_rnc) = LOWER($1)';
    const queryParams = [cleanCed];
    if (isEdit && currentClientId) {
      checkQuery += ' AND id != $2';
      queryParams.push(currentClientId);
    }
    const dupRes = await pool.query(checkQuery, queryParams);
    if (dupRes.rows.length > 0) {
      return { duplicate: true, message: 'Ya existe un cliente registrado con esta cédula o RNC.' };
    }
  }

  // 4. Teléfono Principal (Obligatorio, min 10, max 20)
  if (!isEdit || telefono !== undefined) {
    if (!telefono || typeof telefono !== 'string' || telefono.trim().length === 0) {
      return 'El teléfono principal de contacto es obligatorio.';
    }
    const cleanTel = String(telefono).replace(/\D/g, '');
    if (cleanTel.length < 10) {
      return 'El teléfono debe contener al menos 10 dígitos numéricos.';
    }
    if (cleanTel.length > 20) {
      return 'El teléfono no puede exceder los 20 dígitos numéricos.';
    }
  }

  // 5. Teléfono Adicional (Opcional, max 20)
  if (telefono_adicional !== undefined && telefono_adicional !== null && String(telefono_adicional).trim().length > 0) {
    const cleanExtraTel = String(telefono_adicional).replace(/\D/g, '');
    if (cleanExtraTel.length < 10) {
      return 'El teléfono adicional debe contener al menos 10 dígitos numéricos.';
    }
    if (cleanExtraTel.length > 20) {
      return 'El teléfono adicional no puede exceder los 20 dígitos numéricos.';
    }
  }

  // 6. Correo Electrónico (Opcional, formato válido, max 100)
  if (correo !== undefined && correo !== null && String(correo).trim().length > 0) {
    const cleanMail = String(correo).trim();
    if (/\s/.test(cleanMail)) {
      return 'El correo electrónico no puede contener espacios en blanco.';
    }
    if (cleanMail.length > 100) {
      return 'El correo electrónico no puede exceder los 100 caracteres.';
    }
    if (!EMAIL_REGEX.test(cleanMail)) {
      return 'Ingrese un correo electrónico con formato válido (ej. cliente@dominio.com).';
    }
  }

  // 7. Dirección (Opcional)
  if (direccion !== undefined && direccion !== null && String(direccion).length > 500) {
    return 'La dirección no puede exceder los 500 caracteres.';
  }

  return null;
};

/**
 * Obtener listado de clientes con paginación, búsqueda y filtros.
 * GET /api/clientes
 */
const getClients = async (req, res) => {
  try {
    const pool = getPool();
    const {
      page = 1,
      limit = 20,
      search = '',
      estado = 'all'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const whereConditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Filtro por Estado
    if (estado === 'active' || estado === 'true') {
      whereConditions.push(`c.activo = TRUE`);
    } else if (estado === 'inactive' || estado === 'false') {
      whereConditions.push(`c.activo = FALSE`);
    }

    // Filtro por búsqueda textual (nombre, apellido, cedula_rnc, telefono, telefono_adicional, correo)
    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      whereConditions.push(`(
        LOWER(c.nombre) LIKE $${paramIndex} OR
        LOWER(COALESCE(c.apellido, '')) LIKE $${paramIndex} OR
        LOWER(c.nombre || ' ' || COALESCE(c.apellido, '')) LIKE $${paramIndex} OR
        LOWER(c.cedula_rnc) LIKE $${paramIndex} OR
        LOWER(c.telefono) LIKE $${paramIndex} OR
        LOWER(COALESCE(c.telefono_adicional, '')) LIKE $${paramIndex} OR
        LOWER(COALESCE(c.correo, '')) LIKE $${paramIndex}
      )`);
      queryParams.push(term);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Consulta con conteo total de registros
    const countQuery = `
      SELECT COUNT(*) AS total
      FROM clientes c
      ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Consulta de registros paginados
    const dataQuery = `
      SELECT 
        c.id,
        c.nombre,
        c.apellido,
        c.cedula_rnc,
        c.telefono,
        c.telefono_adicional,
        c.correo,
        c.direccion,
        c.activo,
        c.created_at,
        c.updated_at
      FROM clientes c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const dataParams = [...queryParams, limitNum, offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    return res.status(200).json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages
      }
    });
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al consultar la cartera de clientes.'
    });
  }
};

/**
 * Obtener detalle de un cliente por su ID.
 * GET /api/clientes/:id
 */
const getClientById = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = parseInt(id, 10);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'El identificador del cliente proporcionado no es válido.'
      });
    }

    const pool = getPool();
    const result = await pool.query(
      `SELECT 
        id, nombre, apellido, cedula_rnc, telefono, telefono_adicional,
        correo, direccion, activo, created_at, updated_at
       FROM clientes 
       WHERE id = $1`,
      [clientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró ningún cliente con el ID especificado.'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error al obtener cliente por ID:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al consultar el cliente.'
    });
  }
};

/**
 * Registrar un nuevo cliente en el sistema.
 * POST /api/clientes
 */
const createClient = async (req, res) => {
  try {
    const pool = getPool();
    const validationError = await validateClientPayload(pool, req.body, false);

    if (validationError) {
      if (typeof validationError === 'object' && validationError.duplicate) {
        return res.status(409).json({
          success: false,
          message: validationError.message
        });
      }
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const {
      nombre,
      apellido,
      cedula_rnc,
      telefono,
      telefono_adicional,
      correo,
      direccion
    } = req.body;

    const cleanNombre = nombre.trim();
    const cleanApellido = apellido.trim();
    const cleanCedula = cedula_rnc.trim();
    const cleanTelefono = String(telefono).replace(/\D/g, '');
    const cleanExtraTel = telefono_adicional && String(telefono_adicional).trim().length > 0
      ? String(telefono_adicional).replace(/\D/g, '')
      : null;
    const cleanCorreo = correo && String(correo).trim().length > 0 ? String(correo).trim().toLowerCase() : null;
    const cleanDireccion = direccion && String(direccion).trim().length > 0 ? String(direccion).trim() : null;

    const insertQuery = `
      INSERT INTO clientes (
        nombre, apellido, cedula_rnc, telefono, telefono_adicional,
        correo, direccion, activo, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id, nombre, apellido, cedula_rnc, telefono, telefono_adicional,
        correo, direccion, activo, created_at, updated_at
    `;

    const insertResult = await pool.query(insertQuery, [
      cleanNombre,
      cleanApellido,
      cleanCedula,
      cleanTelefono,
      cleanExtraTel,
      cleanCorreo,
      cleanDireccion
    ]);

    const newClient = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: 'Cliente registrado exitosamente.',
      data: newClient
    });
  } catch (error) {
    console.error('Error al registrar cliente:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un cliente con esta cédula o RNC registrada en el sistema.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al registrar el cliente.'
    });
  }
};

/**
 * Actualizar los datos de un cliente existente.
 * PUT /api/clientes/:id
 */
const updateClient = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = parseInt(id, 10);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'El identificador del cliente proporcionado no es válido.'
      });
    }

    const pool = getPool();

    // 1. Verificar si el cliente existe
    const clientCheck = await pool.query('SELECT * FROM clientes WHERE id = $1', [clientId]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El cliente que intenta actualizar no existe en el sistema.'
      });
    }

    const existingClient = clientCheck.rows[0];

    // 2. Validar payload de edición
    const validationError = await validateClientPayload(pool, req.body, true, clientId);
    if (validationError) {
      if (typeof validationError === 'object' && validationError.duplicate) {
        return res.status(409).json({
          success: false,
          message: validationError.message
        });
      }
      return res.status(400).json({
        success: false,
        message: validationError
      });
    }

    const {
      nombre,
      apellido,
      cedula_rnc,
      telefono,
      telefono_adicional,
      correo,
      direccion
    } = req.body;

    const cleanNombre = nombre !== undefined ? nombre.trim() : existingClient.nombre;
    const cleanApellido = apellido !== undefined ? apellido.trim() : existingClient.apellido;
    const cleanCedula = cedula_rnc !== undefined ? cedula_rnc.trim() : existingClient.cedula_rnc;
    const cleanTelefono = telefono !== undefined ? String(telefono).replace(/\D/g, '') : existingClient.telefono;
    const cleanExtraTel = telefono_adicional !== undefined
      ? (String(telefono_adicional).trim().length > 0 ? String(telefono_adicional).replace(/\D/g, '') : null)
      : existingClient.telefono_adicional;
    const cleanCorreo = correo !== undefined
      ? (String(correo).trim().length > 0 ? String(correo).trim().toLowerCase() : null)
      : existingClient.correo;
    const cleanDireccion = direccion !== undefined
      ? (String(direccion).trim().length > 0 ? String(direccion).trim() : null)
      : existingClient.direccion;

    const updateQuery = `
      UPDATE clientes SET
        nombre = $1,
        apellido = $2,
        cedula_rnc = $3,
        telefono = $4,
        telefono_adicional = $5,
        correo = $6,
        direccion = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING 
        id, nombre, apellido, cedula_rnc, telefono, telefono_adicional,
        correo, direccion, activo, created_at, updated_at
    `;

    const updateResult = await pool.query(updateQuery, [
      cleanNombre,
      cleanApellido,
      cleanCedula,
      cleanTelefono,
      cleanExtraTel,
      cleanCorreo,
      cleanDireccion,
      clientId
    ]);

    const updatedClient = updateResult.rows[0];

    return res.status(200).json({
      success: true,
      message: 'Cliente actualizado exitosamente.',
      data: updatedClient
    });
  } catch (error) {
    console.error('Error al actualizar cliente:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Ya existe otro cliente con esta cédula o RNC registrada en el sistema.'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar el cliente.'
    });
  }
};

/**
 * Alternar el estado activo / inactivo de un cliente.
 * PATCH /api/clientes/:id/toggle-status
 */
const toggleClientStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const clientId = parseInt(id, 10);

    if (isNaN(clientId)) {
      return res.status(400).json({
        success: false,
        message: 'El identificador del cliente proporcionado no es válido.'
      });
    }

    const pool = getPool();

    // 1. Verificar existencia
    const clientCheck = await pool.query('SELECT id, nombre, apellido, activo FROM clientes WHERE id = $1', [clientId]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El cliente especificado no existe.'
      });
    }

    const currentClient = clientCheck.rows[0];
    const newStatus = !currentClient.activo;

    const result = await pool.query(
      `UPDATE clientes 
       SET activo = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, nombre, apellido, cedula_rnc, activo, updated_at`,
      [newStatus, clientId]
    );

    const updated = result.rows[0];
    const fullName = `${updated.nombre} ${updated.apellido || ''}`.trim();
    const actionMessage = newStatus 
      ? `El cliente "${fullName}" ha sido reactivado correctamente.`
      : `El cliente "${fullName}" ha sido desactivado del sistema.`;

    return res.status(200).json({
      success: true,
      message: actionMessage,
      data: updated
    });
  } catch (error) {
    console.error('Error al alternar estado del cliente:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al modificar el estado del cliente.'
    });
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  toggleClientStatus
};
