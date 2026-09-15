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
  getServiciosTaller,
  updateServicioEstado,
  assignTecnicoServicio,
  removeTecnicoServicio,
  validarGarantiaTicket,
  uploadFotosServicio,
  getIncidenciasServicio,
  createIncidenciaServicio,
  updateAprobacionIncidencia,
  liquidarYEntregarServicio
} = require('../controllers/servicios.controller');

// ── Ruta pública para consulta / tracking de ticket vía QR ──
router.get('/ticket/:codigo', getServicioByTicket);

// Todas las demás rutas de servicios requieren autenticación
router.use(authMiddleware);

// GET /api/servicios/taller - Órdenes activas para el tablero Kanban de taller
router.get('/taller', getServiciosTaller);

// GET /api/servicios?page=1&limit=20&sucursal_id=&estado_id=&q=
router.get('/', getServicios);

// GET /api/servicios/validar-garantia/:codigoTicket - Validar vigencia de garantía
router.get('/validar-garantia/:codigoTicket', validarGarantiaTicket);

// GET /api/servicios/:id/incidencias - Listar incidencias y hallazgos técnicos
router.get('/:id/incidencias', getIncidenciasServicio);

// POST /api/servicios/:id/incidencias - Registrar nueva incidencia técnica
router.post('/:id/incidencias', createIncidenciaServicio);

// PATCH /api/servicios/:id/incidencias/:incidenciaId/aprobacion - Actualizar aprobación de cliente de una incidencia
router.patch('/:id/incidencias/:incidenciaId/aprobacion', updateAprobacionIncidencia);

// GET /api/servicios/:id
router.get('/:id', getServicioById);

// PATCH /api/servicios/:id/estado - Actualización de estado en taller
router.patch('/:id/estado', updateServicioEstado);

// POST /api/servicios/:id/tecnicos - Asignar técnico colaborador
router.post('/:id/tecnicos', assignTecnicoServicio);

// DELETE /api/servicios/:id/tecnicos/:tecnicoId - Remover técnico colaborador
router.delete('/:id/tecnicos/:tecnicoId', removeTecnicoServicio);

// POST /api/servicios/:id/entregar - Liquidación y entrega de equipo al cliente
router.post('/:id/entregar', liquidarYEntregarServicio);

// POST /api/servicios
router.post('/', createServicio);

// POST /api/servicios/upload-foto  - Subida de hasta 5 fotos a Cloudinary
router.post(
  '/upload-foto',
  handleMulterErrors(upload.any()),
  uploadFotosServicio
);

module.exports = router;