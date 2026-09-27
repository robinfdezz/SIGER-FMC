'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { checkRole } = require('../middlewares/roleMiddleware');
const {
  getReportesResumen,
  getReportesDetalle
} = require('../controllers/reportes.controller');

// Todas las rutas de reportes requieren autenticación y rol administrativo
router.use(authMiddleware);
router.use(checkRole(['SuperAdmin', 'Admin_Sucursal'], 'Acceso restringido a reportes e informes ejecutivos.'));

/**
 * @route   GET /api/reportes/resumen
 * @desc    KPIs financieros, serie temporal de entradas vs entregas, productividad de técnicos y distribución de categorías
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.get('/resumen', getReportesResumen);

/**
 * @route   GET /api/reportes/detalle
 * @desc    Listado tabular paginado de órdenes y liquidaciones para consulta y exportación
 * @access  Privado (SuperAdmin, Admin_Sucursal)
 */
router.get('/detalle', getReportesDetalle);

module.exports = router;
