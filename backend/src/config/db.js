const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'SIGER_FMC_DB',
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  connectionTimeout: 5000,
  requestTimeout: 15000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true
  }
};

let pool = null;

/**
 * Obtiene la instancia activa del Connection Pool de SQL Server.
 * Si no existe o se ha cerrado, inicializa una nueva conexión.
 */
const getPool = async () => {
  try {
    if (pool && pool.connected) {
      return pool;
    }
    pool = await new sql.ConnectionPool(dbConfig).connect();
    return pool;
  } catch (error) {
    console.error('❌ Error al conectar con SQL Server:', error.message);
    throw error;
  }
};

/**
 * Valida la conexión inicial a la base de datos al arrancar el servidor.
 */
const testConnection = async () => {
  try {
    const activePool = await getPool();
    const result = await activePool.request().query('SELECT 1 AS connection_test');
    if (result.recordset && result.recordset[0].connection_test === 1) {
      console.log(`✅ Conexión exitosa a SQL Server [Base de Datos: ${dbConfig.database} en ${dbConfig.server}:${dbConfig.port}]`);
    }
    return true;
  } catch (error) {
    console.warn(`⚠️ Advertencia de conexión a BD (${dbConfig.database}): ${error.message}`);
    console.warn('ℹ️ Asegúrate de que SQL Server esté en ejecución y las credenciales en .env sean correctas.');
    return false;
  }
};

module.exports = {
  sql,
  getPool,
  testConnection
};
