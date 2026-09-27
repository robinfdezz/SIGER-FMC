'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const { globalSearch } = require('../controllers/search.controller');

router.use(authMiddleware);

/**
 * @route   GET /api/buscar?q=
 * @desc    Búsqueda predictiva global (órdenes, clientes, equipos)
 */
router.get('/', globalSearch);

module.exports = router;
