const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getRoles,
  getSucursales,
  getCategorias,
  getEstados
} = require('../controllers/catalogs.controller');

router.use(authMiddleware);

router.get('/roles', getRoles);
router.get('/sucursales', getSucursales);
router.get('/categorias', getCategorias);
router.get('/estados', getEstados);
router.get('/', (req, res, next) => {
  if (req.baseUrl.includes('sucursal')) return getSucursales(req, res, next);
  if (req.baseUrl.includes('rol')) return getRoles(req, res, next);
  return getSucursales(req, res, next);
});

module.exports = router;
