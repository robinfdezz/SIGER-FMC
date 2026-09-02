const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Rutas
const authRoutes = require('./routes/auth.routes');
const workersRoutes = require('./routes/workers.routes');
const clientsRoutes = require('./routes/clients.routes');
const catalogsRoutes = require('./routes/catalogs.routes');
const configuracionRoutes = require('./routes/configuracion.routes');

const app = express();

// Configuración de CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como Postman o apps móviles) o si está en la lista permitida
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('No permitido por la política de CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middlewares estándar
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
