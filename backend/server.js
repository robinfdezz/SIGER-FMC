const app = require('./src/app');
const { testConnection } = require('./src/config/db');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log('🚀 Inicializando servidor SIGER-FMC Backend...');

  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`📡 Servidor ejecutándose en: http://localhost:${PORT}`);
    console.log(`🔒 Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🩺 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🔑 Auth Endpoint: http://localhost:${PORT}/api/auth/login`);
    console.log(`===================================================`);

    // Validar conexión a SQL Server en segundo plano
    testConnection();
  });
};

startServer().catch((err) => {
  console.error('❌ Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
