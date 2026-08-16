const express = require('express');
const router = express.Router();
const { login, getMe } = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/authMiddleware');

/**
 * @route   POST /api/auth/login
 * @desc    Autenticar usuario y obtener token JWT
 * @access  Público
 */
router.post('/login', login);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener perfil del usuario autenticado
 * @access  Privado (requiere JWT)
 */
router.get('/me', authMiddleware, getMe);

module.exports = router;
