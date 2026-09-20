'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { cloudinary } = require('../config/cloudinary');
const { getPool } = require('../config/db');

/**
 * Script utilitario para auditar, conciliar y purgar fotografías huérfanas en Cloudinary.
 * Se enfoca en la carpeta 'siger-fmc/recepcion'.
 *
 * Criterio de purga:
 * 1. El asset tiene más de 2 horas de creado en Cloudinary (protege recepciones en curso).
 * 2. El public_id NO existe en la tabla 'evidencias_fotograficas'.
 * 3. El public_id NO pertenece a una sesión activa en 'sesiones_carga_fotos'.
 */
async function ejecutarConciliacionYPurga() {
  console.log('================================================================');
  console.log('🧹 INICIANDO AUDITORÍA Y PURGA DE ASSETS HUÉRFANOS EN CLOUDINARY');
  console.log('================================================================\n');

  const pool = getPool();

  try {
    // 1. Obtener todos los public_id legítimos registrados en PostgreSQL
    console.log('📡 1. Consultando identificadores legítimos en PostgreSQL...');
    
    // 1.1 Evidencias activas registradas en órdenes
    const dbEvidenciasRes = await pool.query(
      `SELECT DISTINCT public_id 
       FROM evidencias_fotograficas 
       WHERE public_id IS NOT NULL AND TRIM(public_id) != ''`
    );
    const validPublicIds = new Set(dbEvidenciasRes.rows.map(r => r.public_id.trim()));

    // 1.2 Sesiones recientes o no expiradas en sesiones_carga_fotos
    const dbSesionesRes = await pool.query(
      `SELECT fotos 
       FROM sesiones_carga_fotos 
       WHERE estado NOT IN ('PURGADA') 
         AND (expira_en > NOW() - INTERVAL '2 hours' OR estado = 'UTILIZADA')`
    );

    for (const row of dbSesionesRes.rows) {
      if (Array.isArray(row.fotos)) {
        for (const item of row.fotos) {
          if (item && item.public_id && typeof item.public_id === 'string') {
            validPublicIds.add(item.public_id.trim());
          }
        }
      }
    }

    console.log(`✅ Total de public_ids válidos y protegidos en BD: ${validPublicIds.size}\n`);

    // 2. Listar todos los recursos en Cloudinary (con paginación next_cursor)
    console.log('☁️  2. Consultando assets remotos en Cloudinary (carpeta: siger-fmc/recepcion)...');
    let allCloudResources = [];
    let nextCursor = null;

    do {
      const options = {
        type: 'upload',
        prefix: 'siger-fmc/recepcion',
        max_results: 500
      };
      if (nextCursor) {
        options.next_cursor = nextCursor;
      }

      const response = await cloudinary.api.resources(options);
      allCloudResources = allCloudResources.concat(response.resources || []);
      nextCursor = response.next_cursor;
    } while (nextCursor);

    console.log(`✅ Total de recursos encontrados en Cloudinary: ${allCloudResources.length}\n`);

    // 3. Filtrar recursos huérfanos con más de 2 horas de antigüedad
    const dosHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const assetsAPurgar = [];
    let assetsRecientesProtegidos = 0;
    let assetsValidosConservados = 0;

    for (const asset of allCloudResources) {
      const publicId = asset.public_id;
      const assetDate = new Date(asset.created_at);

      if (validPublicIds.has(publicId)) {
        assetsValidosConservados++;
        continue;
      }

      // Si no está en BD pero tiene menos de 2 horas, protegerlo por si hay recepción en curso
      if (assetDate > dosHorasAtras) {
        assetsRecientesProtegidos++;
        continue;
      }

      assetsAPurgar.push(asset);
    }

    console.log('📊 RESUMEN DE DIAGNÓSTICO:');
    console.log(`   - Assets válidos y vinculados a BD:   ${assetsValidosConservados}`);
    console.log(`   - Assets recientes protegidos (< 2h): ${assetsRecientesProtegidos}`);
    console.log(`   - Assets huérfanos a purgar (> 2h):   ${assetsAPurgar.length}\n`);

    if (assetsAPurgar.length === 0) {
      console.log('✨ No se encontraron fotos huérfanas que cumplan el criterio de purga. El almacenamiento está limpio.');
      return;
    }

    // 4. Ejecutar destrucción en Cloudinary
    console.log(`🗑️  3. Procediendo a eliminar ${assetsAPurgar.length} assets huérfanos de Cloudinary...`);
    let eliminadosExitosos = 0;
    let totalBytesLiberados = 0;
    let erroresEliminacion = 0;

    for (const asset of assetsAPurgar) {
      try {
        const destroyRes = await cloudinary.uploader.destroy(asset.public_id);
        if (destroyRes.result === 'ok' || destroyRes.result === 'not found') {
          eliminadosExitosos++;
          totalBytesLiberados += (asset.bytes || 0);
          console.log(`   ✓ Eliminado: ${asset.public_id} (${((asset.bytes || 0) / 1024).toFixed(1)} KB)`);
        } else {
          console.warn(`   ⚠️ Respuesta inesperada para ${asset.public_id}:`, destroyRes);
        }
      } catch (err) {
        erroresEliminacion++;
        console.error(`   ❌ Error al eliminar ${asset.public_id}:`, err.message);
      }
    }

    const megabytesLiberados = (totalBytesLiberados / (1024 * 1024)).toFixed(2);

    console.log('\n================================================================');
    console.log('🎉 REPORTE FINAL DE PURGA Y SANEAMIENTO:');
    console.log(`   - Assets eliminados con éxito:   ${eliminadosExitosos}`);
    console.log(`   - Errores de eliminación:        ${erroresEliminacion}`);
    console.log(`   - Espacio total liberado:        ${megabytesLiberados} MB (${totalBytesLiberados} bytes)`);
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ Error general durante el proceso de conciliación:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar si se llama directamente vía CLI
if (require.main === module) {
  ejecutarConciliacionYPurga()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fallo de ejecución:', err);
      process.exit(1);
    });
}

module.exports = { ejecutarConciliacionYPurga };
