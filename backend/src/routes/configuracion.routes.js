const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const { upload, handleMulterErrors } = require('../middlewares/upload');
const {
  getCompanyProfile,
  uploadCompanyLogo,
  updateCompanyProfile,
  getBranches,
  updateBranch
} = require('../controllers/configuracion.controller');

// Todas las rutas de configuración requieren autenticación y rol de administración
router.use(authMiddleware);
router.use(checkRole(['SuperAdmin', 'Admin_Sucursal']));

// ============================================================================
// RUTAS: PERFIL DE EMPRESA MATRIZ (datos_companhia)
// ============================================================================

/**
 * @route   GET /api/configuracion/companhia
 * @desc    Obtener el perfil de la empresa matriz
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.get('/companhia', getCompanyProfile);

/**
 * @route   POST /api/configuracion/companhia/upload-logo
 * @desc    Subir logotipo de la empresa a Cloudinary (carpeta siger-fmc/companhia)
 * @access  Privado (SuperAdmin)
 */
router.post(
  '/companhia/upload-logo',
  checkRole(['SuperAdmin']),
  handleMulterErrors(upload.single('logo')),
  uploadCompanyLogo
);

/**
 * @route   PUT /api/configuracion/companhia
 * @desc    Actualizar perfil y logotipo de la empresa matriz
 * @access  Privado (SuperAdmin)
 */
router.put('/companhia', checkRole(['SuperAdmin']), updateCompanyProfile);

// ============================================================================
// RUTAS: SUCURSALES (datos_sucursales)
// ============================================================================

/**
 * @route   GET /api/configuracion/sucursales
 * @desc    Listar todas las sucursales del sistema
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.get('/sucursales', getBranches);

/**
 * @route   PUT /api/configuracion/sucursales/:id
 * @desc    Actualizar datos informativos de una sucursal existente
 * @access  Privado (SuperAdmin, Admin_Sucursal - restringido a su propia sucursal)
 */
router.put('/sucursales/:id', updateBranch);

module.exports = router;
