const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const {
  getClients,
  getClientById,
  createClient,
  updateClient,
  toggleClientStatus
} = require('../controllers/clients.controller');

// Todas las rutas de clientes requieren autenticación JWT
router.use(authMiddleware);

/**
 * @route   GET /api/clientes
 * @desc    Obtener listado de clientes con paginación, búsqueda y filtros
 * @access  Privado (SuperAdmin, Admin_Sucursal, Secretaria, Tecnico)
 */
router.get(
  '/',
  checkRole(['SuperAdmin', 'Admin_Sucursal', 'Secretaria', 'Tecnico']),
  getClients
);

/**
 * @route   GET /api/clientes/:id
 * @desc    Obtener detalle de un cliente por ID
 * @access  Privado (SuperAdmin, Admin_Sucursal, Secretaria, Tecnico)
 */
router.get(
  '/:id',
  checkRole(['SuperAdmin', 'Admin_Sucursal', 'Secretaria', 'Tecnico']),
  getClientById
);

/**
 * @route   POST /api/clientes
 * @desc    Registrar un nuevo cliente en el sistema
 * @access  Privado (SuperAdmin, Admin_Sucursal, Secretaria)
 */
router.post(
  '/',
  checkRole(['SuperAdmin', 'Admin_Sucursal', 'Secretaria']),
  createClient
);

/**
 * @route   PUT /api/clientes/:id
 * @desc    Actualizar los datos de un cliente
 * @access  Privado (SuperAdmin, Admin_Sucursal, Secretaria)
 */
router.put(
  '/:id',
  checkRole(['SuperAdmin', 'Admin_Sucursal', 'Secretaria']),
  updateClient
);

/**
 * @route   PATCH /api/clientes/:id/toggle-status
 * @desc    Alternar estado activo/inactivo de un cliente
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.patch(
  '/:id/toggle-status',
  checkRole(['SuperAdmin', 'Admin_Sucursal']),
  toggleClientStatus
);

module.exports = router;
