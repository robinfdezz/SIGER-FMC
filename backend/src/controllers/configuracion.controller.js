const { getPool } = require('../config/db');
const { uploadImageBuffer, deleteImageByPublicId, deleteImageByUrl } = require('../config/cloudinary');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// 1. CONTROLADOR DE PERFIL DE LA EMPRESA (datos_companhia)
// ============================================================================

/**
 * Obtener la información de la empresa matriz.
 * GET /api/configuracion/companhia
 */
const getCompanyProfile = async (req, res) => {
  try {
    const pool = getPool();
    const query = `
      SELECT 
        id,
        nombre_empresa,
        rnc,
        telefono_principal,
        correo_contacto,
        direccion_fiscal,
        logo_url,
        logo_public_id,
        created_at,
        updated_at
      FROM datos_companhia
      ORDER BY id ASC
      LIMIT 1
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return res.status(200).json({
        ok: true,
        message: 'No hay información de empresa registrada.',
        data: {
          id: null,
          nombre_empresa: '',
          rnc: '',
          telefono_principal: '',
          correo_contacto: '',
          direccion_fiscal: '',
          logo_url: null,
          logo_public_id: null,
          created_at: null,
          updated_at: null
        }
      });
    }

    return res.status(200).json({
      ok: true,
      message: 'Perfil de la empresa obtenido con éxito.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en getCompanyProfile:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al obtener la información de la empresa.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Subir logotipo de la empresa a Cloudinary.
 * POST /api/configuracion/companhia/upload-logo
 */
const uploadCompanyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        message: 'No se ha seleccionado ningún archivo de imagen para el logotipo.'
      });
    }

    // Subir a la carpeta designada: siger-fmc/companhia
    const result = await uploadImageBuffer(req.file.buffer, 'siger-fmc/companhia');

    return res.status(200).json({
      ok: true,
      message: 'Logotipo subido exitosamente.',
      logo_url: result.secure_url,
      logo_public_id: result.public_id
    });
  } catch (error) {
    console.error('❌ Error en uploadCompanyLogo:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al procesar y subir el logotipo a Cloudinary.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar o crear (Upsert) el perfil de la empresa matriz.
 * PUT /api/configuracion/companhia
 */
const updateCompanyProfile = async (req, res) => {
  try {
    // Restricción RBAC: Solo SuperAdmin puede modificar los datos de la empresa
    if (req.user?.rol_nombre !== 'SuperAdmin') {
      return res.status(403).json({
        ok: false,
        message: 'Acceso denegado. Solo un Super Administrador puede modificar los datos de la empresa matriz.'
      });
    }

    const {
      nombre_empresa,
      rnc,
      telefono_principal,
      correo_contacto,
      direccion_fiscal,
      logo_url,
      logo_public_id
    } = req.body;

    // Validaciones de negocio estrictas con .trim()
    const cleanNombre = typeof nombre_empresa === 'string' ? nombre_empresa.trim() : '';
    if (!cleanNombre || cleanNombre.length < 2) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre o razón social de la empresa es obligatorio y debe tener al menos 2 caracteres.'
      });
    }
    if (cleanNombre.length > 100) {
      return res.status(400).json({
        ok: false,
        message: 'El nombre de la empresa no puede exceder los 100 caracteres.'
      });
    }

    const cleanRnc = typeof rnc === 'string' ? rnc.trim() : '';
    if (!cleanRnc) {
      return res.status(400).json({
        ok: false,
        message: 'El Registro Nacional de Contribuyente (RNC) es obligatorio.'
      });
    }
    const rncDigits = cleanRnc.replace(/\D/g, '');
    if (rncDigits.length !== 9 && rncDigits.length !== 11) {
      return res.status(400).json({
        ok: false,
        message: 'El RNC debe contener exactamente 9 dígitos (institucional) u 11 dígitos (persona física).'
      });
    }
    if (cleanRnc.length > 20) {
      return res.status(400).json({
        ok: false,
        message: 'El RNC no puede exceder los 20 caracteres.'
      });
    }

    const cleanTel = typeof telefono_principal === 'string' ? telefono_principal.trim().replace(/\D/g, '') : '';
    if (!cleanTel) {
      return res.status(400).json({
        ok: false,
        message: 'El teléfono principal de la empresa es obligatorio.'
      });
    }
    if (cleanTel.length < 10) {
      return res.status(400).json({
        ok: false,
        message: 'El teléfono principal debe contener al menos 10 dígitos numéricos.'
      });
    }
    if (cleanTel.length > 20) {
      return res.status(400).json({
        ok: false,
        message: 'El teléfono principal no puede exceder los 20 dígitos numéricos.'
      });
    }

    const cleanEmail = typeof correo_contacto === 'string' ? correo_contacto.trim().toLowerCase() : '';
    if (!cleanEmail) {
      return res.status(400).json({
        ok: false,
        message: 'El correo electrónico de contacto es obligatorio.'
      });
    }
    if (!EMAIL_REGEX.test(cleanEmail)) {
      return res.status(400).json({
        ok: false,
        message: 'Ingrese un correo electrónico de contacto con formato válido.'
      });
    }
    if (cleanEmail.length > 100) {
      return res.status(400).json({
        ok: false,
        message: 'El correo electrónico no puede exceder los 100 caracteres.'
      });
    }

    const cleanDireccion = typeof direccion_fiscal === 'string' ? direccion_fiscal.trim() : '';
    if (!cleanDireccion || cleanDireccion.length < 3) {
      return res.status(400).json({
        ok: false,
        message: 'La dirección fiscal de la empresa es obligatoria y debe tener al menos 3 caracteres.'
      });
    }

    const pool = getPool();

    // 1. Consultar registro actual para determinar si es UPDATE o INSERT
    const currentRes = await pool.query('SELECT id, logo_url, logo_public_id FROM datos_companhia ORDER BY id ASC LIMIT 1');
    const cleanLogoUrl = logo_url && String(logo_url).trim().length > 0 ? String(logo_url).trim() : null;
    const cleanLogoPublicId = cleanLogoUrl && logo_public_id && String(logo_public_id).trim().length > 0 ? String(logo_public_id).trim() : null;

    let savedCompany;

    if (currentRes.rows.length > 0) {
      const current = currentRes.rows[0];

      // Si el logo fue reemplazado o eliminado y existía un logo_public_id previo, eliminar el asset antiguo
      if (
        (current.logo_public_id || current.logo_url) &&
        (current.logo_public_id !== cleanLogoPublicId || current.logo_url !== cleanLogoUrl)
      ) {
        if (current.logo_public_id) {
          deleteImageByPublicId(current.logo_public_id).catch((err) =>
            console.error('⚠️ Error al eliminar logotipo anterior de Cloudinary por public_id:', err.message)
          );
        } else if (current.logo_url) {
          deleteImageByUrl(current.logo_url).catch((err) =>
            console.error('⚠️ Error al eliminar logotipo anterior de Cloudinary por URL:', err.message)
          );
        }
      }

      // Actualizar registro existente
      const updateQuery = `
        UPDATE datos_companhia
        SET 
          nombre_empresa = $1,
          rnc = $2,
          telefono_principal = $3,
          correo_contacto = $4,
          direccion_fiscal = $5,
          logo_url = $6,
          logo_public_id = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING 
          id,
          nombre_empresa,
          rnc,
          telefono_principal,
          correo_contacto,
          direccion_fiscal,
          logo_url,
          logo_public_id,
          created_at,
          updated_at
      `;

      const updateRes = await pool.query(updateQuery, [
        nombre_empresa.trim(),
        rnc.trim(),
        telefono_principal.trim(),
        cleanEmail,
        direccion_fiscal.trim(),
        cleanLogoUrl,
        cleanLogoPublicId,
        current.id
      ]);

      savedCompany = updateRes.rows[0];
    } else {
      // Inserción inicial
      const insertQuery = `
        INSERT INTO datos_companhia (
          nombre_empresa,
          rnc,
          telefono_principal,
          correo_contacto,
          direccion_fiscal,
          logo_url,
          logo_public_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING 
          id,
          nombre_empresa,
          rnc,
          telefono_principal,
          correo_contacto,
          direccion_fiscal,
          logo_url,
          logo_public_id,
          created_at,
          updated_at
      `;

      const insertRes = await pool.query(insertQuery, [
        nombre_empresa.trim(),
        rnc.trim(),
        telefono_principal.trim(),
        cleanEmail,
        direccion_fiscal.trim(),
        cleanLogoUrl,
        cleanLogoPublicId
      ]);

      savedCompany = insertRes.rows[0];
    }

    return res.status(200).json({
      ok: true,
      message: 'Información de la empresa actualizada exitosamente.',
      data: savedCompany
    });
  } catch (error) {
    console.error('❌ Error en updateCompanyProfile:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al actualizar el perfil de la empresa.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};


// ============================================================================
// 2. CONTROLADOR DE SUCURSALES (datos_sucursales)
// ============================================================================

/**
 * Listar todas las sucursales del sistema.
 * GET /api/configuracion/sucursales
 */
const getBranches = async (req, res) => {
  try {
    const pool = getPool();
    const query = `
      SELECT 
        id,
        companhia_id,
        codigo_sucursal,
        nombre_sucursal,
        telefono,
        direccion,
        activo,
        created_at,
        updated_at
      FROM datos_sucursales
      ORDER BY id ASC
    `;

    const result = await pool.query(query);

    return res.status(200).json({
      ok: true,
      message: 'Listado de sucursales obtenido con éxito.',
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error en getBranches:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al obtener la lista de sucursales.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar una sucursal existente.
 * PUT /api/configuracion/sucursales/:id
 */
const updateBranch = async (req, res) => {
  try {
    const branchId = parseInt(req.params.id, 10);
    if (isNaN(branchId)) {
      return res.status(400).json({
        ok: false,
        message: 'El ID de la sucursal proporcionado es inválido.'
      });
    }

    // Control de Acceso RBAC:
    // Admin_Sucursal solo puede modificar su propia sucursal asignada
    if (req.user?.rol_nombre === 'Admin_Sucursal' && req.user?.sucursal_id !== branchId) {
      return res.status(403).json({
        ok: false,
        message: 'Acceso denegado. Solo puede actualizar los datos de su propia sucursal asignada.'
      });
    }

    const pool = getPool();

    // 1. Verificar existencia de la sucursal
    const checkRes = await pool.query('SELECT id, codigo_sucursal, nombre_sucursal FROM datos_sucursales WHERE id = $1', [branchId]);
    if (checkRes.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'Sucursal no encontrada.'
      });
    }

    const currentBranch = checkRes.rows[0];
    const isSuperAdmin = req.user?.rol_nombre === 'SuperAdmin';

    const {
      codigo_sucursal,
      nombre_sucursal,
      telefono,
      direccion
    } = req.body;

    let finalCode = currentBranch.codigo_sucursal;
    let finalName = currentBranch.nombre_sucursal;

    // 2. Validaciones de campos específicos de SuperAdmin
    if (isSuperAdmin) {
      if (!codigo_sucursal || typeof codigo_sucursal !== 'string' || codigo_sucursal.trim().length === 0) {
        return res.status(400).json({
          ok: false,
          message: 'El código de la sucursal es obligatorio.'
        });
      }
      finalCode = codigo_sucursal.trim().toUpperCase();
      if (finalCode.length > 10) {
        return res.status(400).json({
          ok: false,
          message: 'El código de la sucursal no puede exceder los 10 caracteres.'
        });
      }

      if (!nombre_sucursal || typeof nombre_sucursal !== 'string' || nombre_sucursal.trim().length < 2) {
        return res.status(400).json({
          ok: false,
          message: 'El nombre de la sucursal es obligatorio y debe tener al menos 2 caracteres.'
        });
      }
      if (nombre_sucursal.trim().length > 100) {
        return res.status(400).json({
          ok: false,
          message: 'El nombre de la sucursal no puede exceder los 100 caracteres.'
        });
      }
      finalName = nombre_sucursal.trim();

      // Validar unicidad del código de sucursal
      const dupRes = await pool.query(
        'SELECT id FROM datos_sucursales WHERE UPPER(codigo_sucursal) = $1 AND id != $2',
        [finalCode, branchId]
      );
      if (dupRes.rows.length > 0) {
        return res.status(409).json({
          ok: false,
          message: `El código de sucursal "${finalCode}" ya está registrado en otra sede.`
        });
      }
    }

    // 3. Validaciones de campos operativos (telefono y direccion)
    if (!telefono || typeof telefono !== 'string' || telefono.trim().length === 0) {
      return res.status(400).json({
        ok: false,
        message: 'El teléfono de la sucursal es obligatorio.'
      });
    }
    const cleanTel = telefono.trim().replace(/\D/g, '');
    if (cleanTel.length < 10) {
      return res.status(400).json({
        ok: false,
        message: 'El teléfono debe contener al menos 10 dígitos numéricos.'
      });
    }
    if (cleanTel.length > 20) {
      return res.status(400).json({
        ok: false,
        message: 'El teléfono no puede exceder los 20 dígitos numéricos.'
      });
    }

    const cleanDireccion = typeof direccion === 'string' ? direccion.trim() : '';
    if (!cleanDireccion || cleanDireccion.length < 3) {
      return res.status(400).json({
        ok: false,
        message: 'La dirección física de la sucursal es obligatoria y debe tener al menos 3 caracteres.'
      });
    }

    // 4. Actualizar únicamente campos informativos (prohibido modificar 'activo')
    const updateQuery = `
      UPDATE datos_sucursales
      SET 
        codigo_sucursal = $1,
        nombre_sucursal = $2,
        telefono = $3,
        direccion = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING 
        id,
        companhia_id,
        codigo_sucursal,
        nombre_sucursal,
        telefono,
        direccion,
        activo,
        created_at,
        updated_at
    `;

    const updateRes = await pool.query(updateQuery, [
      finalCode,
      finalName,
      cleanTel,
      cleanDireccion,
      branchId
    ]);

    return res.status(200).json({
      ok: true,
      message: 'Sucursal actualizada exitosamente.',
      data: updateRes.rows[0]
    });
  } catch (error) {
    console.error('❌ Error en updateBranch:', error);
    return res.status(500).json({
      ok: false,
      message: 'Ocurrió un error al actualizar la información de la sucursal.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCompanyProfile,
  uploadCompanyLogo,
  updateCompanyProfile,
  getBranches,
  updateBranch
};
