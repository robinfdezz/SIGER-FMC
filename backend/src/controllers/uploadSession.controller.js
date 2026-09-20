const crypto = require('crypto');
const { getPool } = require('../config/db');
const { uploadImageBuffer, deleteImageByPublicId } = require('../config/cloudinary');

let tableChecked = false;

/**
 * Asegura la existencia de la tabla sesiones_carga_fotos en PostgreSQL.
 */
const ensureTableExists = async (pool) => {
  if (tableChecked) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sesiones_carga_fotos (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(64) NOT NULL UNIQUE,
        fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
        estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
        expira_en TIMESTAMPTZ NOT NULL,
        max_fotos INTEGER DEFAULT 5,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE sesiones_carga_fotos ADD COLUMN IF NOT EXISTS max_fotos INTEGER DEFAULT 5;
      CREATE INDEX IF NOT EXISTS idx_sesiones_carga_session_id ON sesiones_carga_fotos (session_id);
      CREATE INDEX IF NOT EXISTS idx_sesiones_carga_estado_expira ON sesiones_carga_fotos (estado, expira_en);
    `);
    tableChecked = true;
  } catch (err) {
    console.error('⚠️ Error al verificar tabla sesiones_carga_fotos:', err.message);
  }
};

/**
 * Genera una nueva sesión de carga remota de fotos mediante QR.
 * POST /api/upload-session/crear
 */
const crearSesion = async (req, res) => {
  try {
    const pool = getPool();
    await ensureTableExists(pool);

    const sessionId = crypto.randomUUID();
    // Expiración a 15 minutos
    const expiraEn = new Date(Date.now() + 15 * 60 * 1000);

    const rawMaxFotos = req.body?.maxFotosPermitidas ?? req.body?.max_fotos ?? req.body?.maxFotos;
    const parsedMax = parseInt(rawMaxFotos, 10);
    const maxFotos = !isNaN(parsedMax) && parsedMax > 0 ? Math.min(10, parsedMax) : 5;

    const insertQuery = `
      INSERT INTO sesiones_carga_fotos (session_id, fotos, estado, expira_en, max_fotos)
      VALUES ($1, '[]'::jsonb, 'PENDIENTE', $2, $3)
      RETURNING session_id, estado, expira_en, max_fotos, created_at
    `;
    const result = await pool.query(insertQuery, [sessionId, expiraEn, maxFotos]);

    // Disparar purga de huérfanos en segundo plano sin bloquear la respuesta
    purgarSesionesExpiradas().catch((err) => {
      console.warn('⚠️ Aviso purga en background al crear sesión:', err.message);
    });

    return res.status(201).json({
      ok: true,
      message: 'Sesión de carga creada exitosamente.',
      data: result.rows[0],
      sessionId: result.rows[0].session_id,
      maxFotos: result.rows[0].max_fotos,
      expira_en: result.rows[0].expira_en
    });
  } catch (error) {
    console.error('❌ Error en crearSesion (uploadSession):', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al inicializar la sesión de carga remota.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Consulta el estado y fotos de una sesión activa (usado para el polling en PC o validación en móvil).
 * GET /api/upload-session/:sessionId
 */
const obtenerEstadoSesion = async (req, res) => {
  try {
    const pool = getPool();
    await ensureTableExists(pool);

    const { sessionId } = req.params;
    const cleanSessionId = String(sessionId || '').trim();

    if (!cleanSessionId) {
      return res.status(400).json({ ok: false, message: 'Identificador de sesión no proporcionado.' });
    }

    const result = await pool.query(
      `SELECT id, session_id, fotos, estado, expira_en, max_fotos, created_at, updated_at
       FROM sesiones_carga_fotos
       WHERE session_id = $1`,
      [cleanSessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        ok: false,
        message: 'No se encontró la sesión solicitada o el código es inválido.'
      });
    }

    const session = result.rows[0];
    const ahora = new Date();
    const expiracion = new Date(session.expira_en);
    const maxFotos = session.max_fotos || 5;
    const fotosActuales = Array.isArray(session.fotos) ? session.fotos : [];
    const cuposDisponibles = Math.max(0, maxFotos - fotosActuales.length);

    // Si expiró y no ha sido confirmada/utilizada en una orden
    if (ahora > expiracion && session.estado !== 'UTILIZADA' && session.estado !== 'CONFIRMADA') {
      if (session.estado !== 'EXPIRADO' && session.estado !== 'COMPLETADO' && session.estado !== 'PURGADA') {
        await pool.query(
          `UPDATE sesiones_carga_fotos SET estado = 'EXPIRADO', updated_at = NOW() WHERE id = $1`,
          [session.id]
        );
      }
      // Disparar purga de huérfanos en background
      purgarSesionesExpiradas().catch((err) => {
        console.warn('⚠️ Aviso purga en background tras expiración:', err.message);
      });
      return res.status(200).json({
        ok: true,
        sessionId: session.session_id,
        estado: session.estado === 'PURGADA' ? 'PURGADA' : 'EXPIRADO',
        fotos: fotosActuales,
        maxFotos,
        cuposDisponibles,
        expira_en: session.expira_en,
        message: 'La sesión ha expirado. Genere un nuevo código QR.'
      });
    }

    return res.status(200).json({
      ok: true,
      sessionId: session.session_id,
      estado: session.estado,
      fotos: fotosActuales,
      maxFotos,
      cuposDisponibles,
      expira_en: session.expira_en,
      created_at: session.created_at
    });
  } catch (error) {
    console.error('❌ Error en obtenerEstadoSesion:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al consultar el estado de la sesión.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Recibe y procesa las fotografías subidas desde el móvil para una sesión activa.
 * POST /api/upload-session/:sessionId/subir
 */
const subirFotosSesion = async (req, res) => {
  try {
    const pool = getPool();
    await ensureTableExists(pool);

    const { sessionId } = req.params;
    const cleanSessionId = String(sessionId || '').trim();

    if (!cleanSessionId) {
      return res.status(400).json({ ok: false, message: 'Identificador de sesión no proporcionado.' });
    }

    const sessionRes = await pool.query(
      `SELECT id, session_id, fotos, estado, expira_en, max_fotos
       FROM sesiones_carga_fotos
       WHERE session_id = $1`,
      [cleanSessionId]
    );

    if (sessionRes.rows.length === 0) {
      return res.status(404).json({ ok: false, message: 'Sesión no encontrada o inválida.' });
    }

    const session = sessionRes.rows[0];

    // 1. Validar que la sesión no haya finalizado o sido utilizada
    if (['COMPLETADO', 'UTILIZADA', 'PURGADA'].includes(session.estado)) {
      return res.status(409).json({
        ok: false,
        message: 'Esta sesión de carga ya ha sido finalizada o utilizada.'
      });
    }

    // 2. Validar expiración de sesión
    if (session.estado === 'EXPIRADO' || new Date() > new Date(session.expira_en)) {
      if (session.estado !== 'EXPIRADO') {
        await pool.query(
          `UPDATE sesiones_carga_fotos SET estado = 'EXPIRADO', updated_at = NOW() WHERE id = $1`,
          [session.id]
        );
      }
      return res.status(410).json({
        ok: false,
        message: 'Esta sesión de carga ha expirado. Por favor solicite un nuevo código QR.'
      });
    }

    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ ok: false, message: 'No se recibieron archivos de imagen.' });
    }

    const currentFotos = Array.isArray(session.fotos) ? session.fotos : [];
    const maxFotos = session.max_fotos || 5;

    // 3. Validar límite acumulado de fotos de la orden
    if (currentFotos.length + files.length > maxFotos) {
      const disponibles = Math.max(0, maxFotos - currentFotos.length);
      return res.status(400).json({
        ok: false,
        message: `Excede el cupo permitido para esta orden (${maxFotos} foto(s) en total). Puedes agregar un máximo de ${disponibles} fotografía(s) más.`
      });
    }

    // Subida a Cloudinary reutilizando el pipeline stream WebP optimizado
    // con fallback resiliente a data URI si Cloudinary devuelve 403/error en desarrollo
    const uploaded = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const uploadResult = await uploadImageBuffer(files[i].buffer, 'siger-fmc/recepcion');
        uploaded.push({
          url: uploadResult.secure_url,
          public_id: uploadResult.public_id,
          nombre_original: files[i].originalname || `foto-${Date.now()}-${i + 1}.jpg`,
          bytes: files[i].size,
          size: (files[i].size / (1024 * 1024)).toFixed(2),
          fecha_subida: new Date().toISOString()
        });
      } catch (cloudErr) {
        console.warn('⚠️ Cloudinary no disponible o cuota agotada, utilizando data URI de contingencia:', cloudErr.message);
        const mime = files[i].mimetype || 'image/jpeg';
        const base64Url = `data:${mime};base64,${files[i].buffer.toString('base64')}`;
        uploaded.push({
          url: base64Url,
          public_id: `local-${Date.now()}-${i + 1}`,
          nombre_original: files[i].originalname || `foto-${Date.now()}-${i + 1}.jpg`,
          bytes: files[i].size,
          size: (files[i].size / (1024 * 1024)).toFixed(2),
          fecha_subida: new Date().toISOString()
        });
      }
    }

    const totalFotos = [...currentFotos, ...uploaded];

    // Actualizar estado a COMPLETADO
    await pool.query(
      `UPDATE sesiones_carga_fotos
       SET fotos = $1::jsonb,
           estado = 'COMPLETADO',
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(totalFotos), session.id]
    );

    return res.status(200).json({
      ok: true,
      message: `${uploaded.length} fotografía(s) subida(s) y sincronizada(s) con éxito.`,
      fotos: totalFotos,
      nuevasFotos: uploaded
    });
  } catch (error) {
    console.error('❌ Error en subirFotosSesion:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al subir las fotografías del dispositivo móvil.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Rutina de Limpieza de Huérfanos (Garbage Collector):
 * Purgar de Cloudinary y marcar como PURGADA todas las sesiones expiradas o abandonadas
 * que no hayan sido formalmente confirmadas en una orden de servicio.
 */
const purgarSesionesExpiradas = async () => {
  try {
    const pool = getPool();
    await ensureTableExists(pool);

    // Buscar sesiones no confirmadas ('UTILIZADA' o 'CONFIRMADA') cuya expiración sea mayor a 30 minutos atrás,
    // o sesiones marcadas como 'EXPIRADO' / 'PENDIENTE' que lleven más de 30 minutos sin actividad.
    const query = `
      SELECT id, session_id, fotos, estado, expira_en
      FROM sesiones_carga_fotos
      WHERE estado NOT IN ('UTILIZADA', 'CONFIRMADA', 'PURGADA')
        AND (
          expira_en < NOW() - INTERVAL '30 minutes'
          OR (estado = 'EXPIRADO' AND updated_at < NOW() - INTERVAL '15 minutes')
          OR (estado = 'PENDIENTE' AND created_at < NOW() - INTERVAL '45 minutes')
        )
      LIMIT 50
    `;

    const result = await pool.query(query);
    let totalFotosEliminadas = 0;
    const sesionesPurgadas = result.rows ? result.rows.length : 0;

    if (result.rows && result.rows.length > 0) {
      for (const session of result.rows) {
        const fotos = Array.isArray(session.fotos) ? session.fotos : [];
        for (const foto of fotos) {
          const publicId = foto?.public_id;
          // Solo destruir assets reales de Cloudinary, omitiendo contingencias locales data URI
          if (publicId && typeof publicId === 'string' && !publicId.startsWith('local-')) {
            try {
              await deleteImageByPublicId(publicId);
              totalFotosEliminadas++;
            } catch (delErr) {
              console.warn(`⚠️ Error al destruir asset huérfano ${publicId}:`, delErr.message);
            }
          }
        }

        // Marcar sesión como PURGADA vaciando el JSONB de fotos para liberar almacenamiento
        await pool.query(
          `UPDATE sesiones_carga_fotos
           SET estado = 'PURGADA',
               fotos = '[]'::jsonb,
               updated_at = NOW()
           WHERE id = $1`,
          [session.id]
        );
      }

      console.log(`🧹 [Garbage Collector]: ${sesionesPurgadas} sesiones huérfanas purgadas (${totalFotosEliminadas} fotos eliminadas de Cloudinary).`);
    }

    // Limpieza de registros antiguos ya procesados (retención de 15 días)
    const cleanupResult = await pool.query(
      `DELETE FROM sesiones_carga_fotos 
       WHERE estado IN ('PURGADA', 'UTILIZADA') 
         AND created_at < NOW() - INTERVAL '15 days'`
    );

    if (cleanupResult.rowCount > 0) {
      console.log(`🧹 [Garbage Collector]: ${cleanupResult.rowCount} registros históricos eliminados de sesiones_carga_fotos (>15 días).`);
    }

    return {
      purgadas: sesionesPurgadas,
      fotosEliminadas: totalFotosEliminadas,
      registrosHistoricosEliminados: cleanupResult.rowCount || 0
    };
  } catch (error) {
    console.error('❌ Error en purgarSesionesExpiradas:', error.message);
    return { purgadas: 0, fotosEliminadas: 0, registrosHistoricosEliminados: 0 };
  }
};

/**
 * Ejecutar purga manual de sesiones huérfanas (auditorías y mantenimiento).
 * POST /api/upload-session/purgar
 */
const ejecutarPurgaManual = async (req, res) => {
  try {
    const resultado = await purgarSesionesExpiradas();
    return res.status(200).json({
      ok: true,
      message: `Purga completada: ${resultado.purgadas} sesión(es) procesada(s), ${resultado.fotosEliminadas} archivo(s) huérfano(s) purgados y ${resultado.registrosHistoricosEliminados || 0} registro(s) histórico(s) depurado(s).`,
      data: resultado
    });
  } catch (error) {
    console.error('❌ Error en ejecutarPurgaManual:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al ejecutar la purga de sesiones huérfanas.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Elimina inmediatamente una fotografía temporal de Cloudinary y opcionalmente de sesiones_carga_fotos.
 * DELETE /api/servicios/evidencia-temporal
 * POST /api/upload-session/eliminar-foto
 */
const eliminarFotoTemporal = async (req, res) => {
  try {
    const { public_id, session_id } = req.body || {};
    const cleanPublicId = String(public_id || req.query?.public_id || '').trim();
    const cleanSessionId = String(session_id || req.query?.session_id || '').trim();

    if (!cleanPublicId) {
      return res.status(400).json({
        ok: false,
        message: 'Identificador public_id de la fotografía es obligatorio.'
      });
    }

    // 1. Destruir en Cloudinary si es un asset remoto real
    let deleteResult = null;
    if (!cleanPublicId.startsWith('local-')) {
      deleteResult = await deleteImageByPublicId(cleanPublicId);
    }

    // 2. Si se proporcionó session_id, removerla del array jsonb en sesiones_carga_fotos
    if (cleanSessionId) {
      const pool = getPool();
      await ensureTableExists(pool);
      await pool.query(
        `UPDATE sesiones_carga_fotos
         SET fotos = COALESCE(
           (
             SELECT jsonb_agg(elem)
             FROM jsonb_array_elements(fotos) elem
             WHERE elem->>'public_id' != $1
           ),
           '[]'::jsonb
         ),
         updated_at = NOW()
         WHERE session_id = $2`,
        [cleanPublicId, cleanSessionId]
      );
    }

    return res.status(200).json({
      ok: true,
      message: 'Fotografía eliminada de Cloudinary correctamente.',
      public_id: cleanPublicId,
      result: deleteResult
    });
  } catch (error) {
    console.error('❌ Error en eliminarFotoTemporal:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error al eliminar la fotografía temporal.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Intervalo ligero de limpieza periódica cada 30 minutos (unref para no bloquear shutdown de Node)
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
setInterval(() => {
  purgarSesionesExpiradas().catch((err) => {
    console.warn('⚠️ Error en intervalo de limpieza de sesiones huérfanas:', err.message);
  });
}, CLEANUP_INTERVAL_MS).unref();

module.exports = {
  crearSesion,
  obtenerEstadoSesion,
  subirFotosSesion,
  purgarSesionesExpiradas,
  ejecutarPurgaManual,
  eliminarFotoTemporal
};
