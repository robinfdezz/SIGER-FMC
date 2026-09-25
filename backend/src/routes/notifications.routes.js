'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getNotificaciones,
  getConteoNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas
} = require('../controllers/notifications.controller');

router.use(authMiddleware);

router.get('/conteo', getConteoNotificaciones);
router.get('/', getNotificaciones);
router.patch('/leer-todas', marcarTodasLeidas);
router.patch('/:id/leer', marcarNotificacionLeida);

module.exports = router;
