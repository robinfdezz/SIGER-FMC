const express = require('express');
const router = express.Router();
const { upload, handleMulterErrors } = require('../middlewares/upload');
const {
  crearSesion,
  obtenerEstadoSesion,
  subirFotosSesion,
  ejecutarPurgaManual
} = require('../controllers/uploadSession.controller');

// POST /api/upload-session/crear - Genera nueva sesión QR
router.post('/crear', crearSesion);

// POST /api/upload-session/purgar - Ejecuta limpieza forzada de sesiones huérfanas
router.post('/purgar', ejecutarPurgaManual);

// GET /api/upload-session/:sessionId - Consulta estado y fotos (para Polling)
router.get('/:sessionId', obtenerEstadoSesion);

// POST /api/upload-session/:sessionId/subir - Carga remota desde móvil
router.post(
  '/:sessionId/subir',
  handleMulterErrors(upload.any()),
  subirFotosSesion
);

module.exports = router;
