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

    // Validar conexión a PostgreSQL y ejecutar purga inicial de arranque
    testConnection().then(async (connected) => {
      if (connected) {
        try {
          const { purgarSesionesExpiradas } = require('./src/controllers/uploadSession.controller');
          console.log('🧹 Ejecutando pasada inicial de purga de sesiones huérfanas en arranque...');
          const resultado = await purgarSesionesExpiradas();
          if (resultado && resultado.purgadas > 0) {
            console.log(`✅ Purga inicial completada: ${resultado.purgadas} sesión(es) procesadas (${resultado.fotosEliminadas} fotos eliminadas).`);
          } else {
            console.log('✨ Purga inicial completada: Sin sesiones huérfanas pendientes.');
          }
        } catch (purgeErr) {
          console.warn('⚠️ Advertencia en purga inicial de arranque:', purgeErr.message);
        }
      }
    });
  });
};

startServer().catch((err) => {
  console.error('❌ Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
