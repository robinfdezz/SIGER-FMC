'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { upload, handleMulterErrors } = require('../middlewares/upload');
const {
  createServicio,
  getServicios,
  getServicioById,
  getServicioByTicket,
  validarGarantiaTicket,
  uploadFotosServicio
} = require('../controllers/servicios.controller');

// Todas las rutas de servicios requieren autenticacion
router.use(authMiddleware);

// GET /api/servicios?page=1&limit=20&sucursal_id=&estado_id=&q=
router.get('/', getServicios);

// GET /api/servicios/validar-garantia/:codigoTicket - Validar vigencia de garantía
router.get('/validar-garantia/:codigoTicket', validarGarantiaTicket);

// GET /api/servicios/ticket/:codigo  - DEBE ir antes de /:id
router.get('/ticket/:codigo', getServicioByTicket);

// GET /api/servicios/:id
router.get('/:id', getServicioById);

// POST /api/servicios
router.post('/', createServicio);

// POST /api/servicios/upload-foto  - Subida de hasta 5 fotos a Cloudinary
router.post(
  '/upload-foto',
  handleMulterErrors(upload.array('fotos', 5)),
  uploadFotosServicio
);

module.exports = router;