const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      host: process.env.DB_HOST || process.env.DB_SERVER || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || process.env.DB_DATABASE || 'siger_fmc_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('❌ Error inesperado en el cliente de PostgreSQL:', err.message);
});

/**
 * Retorna la instancia activa del Pool de PostgreSQL.
 */
const getPool = () => pool;

/**
 * Ejecuta una consulta SQL parametrizada de forma simplificada.
 * @param {string} text - Consulta SQL con $1, $2...
 * @param {Array} params - Parámetros de la consulta
 */
const query = (text, params) => pool.query(text, params);

/**
 * Valida la conexión inicial a la base de datos PostgreSQL al arrancar el servidor.
 */
const testConnection = async () => {
  try {
    const result = await pool.query('SELECT 1 AS connection_test');
    if (result.rows && result.rows[0].connection_test === 1) {
      const dbName = poolConfig.database || process.env.DB_NAME || 'siger_fmc_db';
      const host = poolConfig.host || process.env.DB_HOST || 'localhost';
      const port = poolConfig.port || process.env.DB_PORT || 5432;
      console.log(`✅ Conexión exitosa a PostgreSQL [Base de Datos: ${dbName} en ${host}:${port}]`);
    }
    return true;
  } catch (error) {
    const dbName = poolConfig.database || process.env.DB_NAME || 'siger_fmc_db';
    console.warn(`⚠️ Advertencia de conexión a BD PostgreSQL (${dbName}): ${error.message}`);
    console.warn('ℹ️ Asegúrate de que el servicio PostgreSQL esté activo y las credenciales en .env sean correctas.');
    return false;
  }
};

module.exports = {
  pool,
  getPool,
  query,
  testConnection
};
