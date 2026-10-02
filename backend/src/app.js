const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Middlewares
const { stripEmojisMiddleware } = require('./middlewares/stripEmojis.middleware');

// Rutas
const authRoutes = require('./routes/auth.routes');
const workersRoutes = require('./routes/workers.routes');
const clientsRoutes = require('./routes/clients.routes');
const catalogsRoutes = require('./routes/catalogs.routes');
const configuracionRoutes = require('./routes/configuracion.routes');
const serviciosRoutes = require('./routes/servicios.routes');
const uploadSessionRoutes = require('./routes/uploadSession.routes');
const searchRoutes = require('./routes/search.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const reportesRoutes = require('./routes/reportes.routes');

const app = express();

// Configuración de CORS (Permite localhost, https://siger-fmc.pages.dev y cualquier origen con credenciales)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'cf-turnstile-response', 'x-turnstile-token', 'X-Requested-With']
}));

// Middlewares estándar
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(stripEmojisMiddleware);

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Ruta raíz de bienvenida
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'SIGER-FMC Backend API',
    version: '1.0.0',
    description: 'API del Sistema Integral de Gestión y Reparación Técnica',
    status: 'Activo / En ejecución',
    frontend_url: 'http://localhost:5173',
    endpoints: {
      health: 'GET /api/health',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me'
    }
  });
});

// Ruta base de comprobación de salud (Health check)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'SIGER-FMC Backend API',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Montaje de rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/trabajadores', workersRoutes);
app.use('/api/clientes', clientsRoutes);
app.use('/api/catalogos', catalogsRoutes);
app.use('/api/sucursales', catalogsRoutes);
app.use('/api/roles', catalogsRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/upload-session', uploadSessionRoutes);
app.use('/api/buscar', searchRoutes);
app.use('/api/notificaciones', notificationsRoutes);
app.use('/api/reportes', reportesRoutes);

// Alias directo para el selector de categorias en el modulo de recepcion
app.use('/api/categorias-dispositivos', catalogsRoutes);
// Alias directo para estados de servicio
app.use('/api/estados-servicio', catalogsRoutes);

// Manejador de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
});

// Manejador global de errores (500)
app.use((err, req, res, next) => {
  console.error('💥 Error no controlado en la aplicación:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

module.exports = app;
