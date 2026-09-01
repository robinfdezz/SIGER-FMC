const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { checkRole, requireBranchAccess } = require('../middlewares/roleMiddleware');
const { upload, handleMulterErrors } = require('../middlewares/upload');
const {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  toggleWorkerStatus,
  uploadWorkerAvatar
} = require('../controllers/workers.controller');

// Todas las rutas requieren autenticación y privilegios de administración
router.use(authMiddleware);
router.use(checkRole(['SuperAdmin', 'Admin_Sucursal']));
router.use(requireBranchAccess);

/**
 * @route   POST /api/trabajadores/upload-avatar
 * @desc    Subir foto de perfil de usuario a Cloudinary
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.post('/upload-avatar', handleMulterErrors(upload.single('foto_perfil')), uploadWorkerAvatar);

/**
 * @route   GET /api/trabajadores
 * @desc    Obtener listado de todos los trabajadores (filtrado por sucursal para Admin_Sucursal)
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.get('/', getWorkers);

/**
 * @route   GET /api/trabajadores/:id
 * @desc    Obtener detalle de un trabajador por ID
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.get('/:id', getWorkerById);

/**
 * @route   POST /api/trabajadores
 * @desc    Registrar un nuevo trabajador en el sistema
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.post('/', createWorker);

/**
 * @route   PUT /api/trabajadores/:id
 * @desc    Actualizar datos de un trabajador existente
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.put('/:id', updateWorker);

/**
 * @route   PATCH /api/trabajadores/:id/toggle-status
 * @desc    Alternar estado activo / inactivo de un trabajador (borrado lógico)
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.patch('/:id/toggle-status', toggleWorkerStatus);

module.exports = router;
