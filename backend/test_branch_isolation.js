/**
 * Test Multi-Branch Isolation in Taller Controller
 * Certifies 100% airtight branch security for Mesa de Trabajo
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'siger_fmc',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234'
});

const {
  getServiciosTaller,
  updateServicioEstado,
  assignTecnicoServicio,
  removeTecnicoServicio,
  getIncidenciasServicio,
  createIncidenciaServicio,
  updateAprobacionIncidencia
} = require('./src/controllers/servicios.controller');

const { getWorkers } = require('./src/controllers/workers.controller');

function mockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.data = obj;
      return this;
    }
  };
  return res;
}

async function runIsolationTests() {
  console.log('=== INICIANDO CERTIFICACIÓN DE AISLAMIENTO MULTI-SUCURSAL (TALLER) ===\n');

  // Contextos de usuario:
  // Usuario 1: Tecnico San Francisco (sucursal_id = 1, rol = 'tecnico')
  const userBranch1 = {
    id: 4,
    usuario: 'tecnicosanfrancisco',
    rol: 'tecnico',
    rol_nombre: 'Técnico',
    sucursal_id: 1
  };

  // Usuario 2: Tecnico Castillo (sucursal_id = 2, rol = 'tecnico')
  const userBranch2 = {
    id: 5,
    usuario: 'tecnicocastillo',
    rol: 'tecnico',
    rol_nombre: 'Técnico',
    sucursal_id: 2
  };

  // Usuario 3: Superadmin (sucursal_id = null, rol = 'superadmin')
  const userSuperAdmin = {
    id: 1,
    usuario: 'superadmin',
    rol: 'superadmin',
    rol_nombre: 'Superadministrador',
    sucursal_id: null
  };

  // Orden 1: sucursal_id = 1
  const orderBranch1Id = 1;
  // Orden 5: sucursal_id = 2
  const orderBranch2Id = 5;

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASÓ: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
    }
  }

  // --- TEST 1: getServiciosTaller enclaustra al usuario no-superadmin ---
  console.log('--- TEST 1: GET /api/servicios/taller (Filtrado estricto por sucursal) ---');
  {
    // Usuario Branch 1 solicita órdenes (sin params)
    const req1 = { user: userBranch1, query: {} };
    const res1 = mockRes();
    await getServiciosTaller(req1, res1);
    const orders1 = res1.data?.data || [];
    const allBranch1 = orders1.length > 0 && orders1.every(o => Number(o.sucursal_id) === 1);
    assert(res1.statusCode === 200 && allBranch1, `Usuario Sucursal 1 solo recibe órdenes de Sucursal 1 (Total: ${orders1.length})`);

    // Intento de evasión: Usuario Branch 1 pasa ?sucursal_id=2 para espiar otra sucursal
    const reqEvasion = { user: userBranch1, query: { sucursal_id: '2' } };
    const resEvasion = mockRes();
    await getServiciosTaller(reqEvasion, resEvasion);
    const ordersEvasion = resEvasion.data?.data || [];
    const noLeak = ordersEvasion.length > 0 && ordersEvasion.every(o => Number(o.sucursal_id) === 1);
    assert(resEvasion.statusCode === 200 && noLeak, `Intento de manipulación de query (?sucursal_id=2) es ignorado: sigue forzando Sucursal 1`);

    // SuperAdmin puede consultar sucursal 2
    const reqSA = { user: userSuperAdmin, query: { sucursal_id: '2' } };
    const resSA = mockRes();
    await getServiciosTaller(reqSA, resSA);
    const ordersSA = resSA.data?.data || [];
    const allBranch2 = ordersSA.length > 0 && ordersSA.every(o => Number(o.sucursal_id) === 2);
    assert(resSA.statusCode === 200 && allBranch2, `SuperAdmin puede consultar específicamente Sucursal 2 (Total: ${ordersSA.length})`);
  }

  // --- TEST 2: Asignación de técnico entre sucursales distintas ---
  console.log('\n--- TEST 2: POST /api/servicios/:id/tecnicos (Asignación cruzada de técnicos) ---');
  {
    // Caso 2.1: Usuario Branch 1 intenta mutar una orden de Branch 2
    const reqCrossOrder = {
      params: { id: orderBranch2Id },
      user: userBranch1,
      body: { tecnico_id: userBranch1.id }
    };
    const resCrossOrder = mockRes();
    await assignTecnicoServicio(reqCrossOrder, resCrossOrder);
    assert(resCrossOrder.statusCode === 404, `Usuario de Sucursal 1 no puede interactuar con orden de Sucursal 2 (HTTP 404 esperado, obtuvo: ${resCrossOrder.statusCode})`);

    // Caso 2.2: Intento de asignar un técnico de Branch 2 a una orden de Branch 1 (incluso si lo intenta un admin)
    const reqCrossTec = {
      params: { id: orderBranch1Id },
      user: userBranch1,
      body: { tecnico_id: userBranch2.id } // Técnico de Sucursal 2
    };
    const resCrossTec = mockRes();
    await assignTecnicoServicio(reqCrossTec, resCrossTec);
    assert(resCrossTec.statusCode === 400 && resCrossTec.data?.message?.includes('otra sucursal'), `Bloqueada asignación de técnico de Sucursal 2 a orden de Sucursal 1 (HTTP 400: "${resCrossTec.data?.message}")`);

    // Caso 2.3: Intento de asignar a un usuario con rol Secretaria (ID 3) como técnico operativo
    const reqSecretaryTec = {
      params: { id: orderBranch1Id },
      user: userBranch1,
      body: { tecnico_id: 3 } // Secretaria San Francisco (sucursal_id = 1)
    };
    const resSecretaryTec = mockRes();
    await assignTecnicoServicio(reqSecretaryTec, resSecretaryTec);
    assert(resSecretaryTec.statusCode === 400 && resSecretaryTec.data?.message?.includes('rol de secretaría/recepción'), `Bloqueada asignación de Secretaria como técnico (HTTP 400: "${resSecretaryTec.data?.message}")`);
  }

  // --- TEST 3: Desasignación de técnico en orden de otra sucursal ---
  console.log('\n--- TEST 3: DELETE /api/servicios/:id/tecnicos/:tecnicoId (Desasignación en otra sucursal) ---');
  {
    const reqDelCross = {
      params: { id: orderBranch2Id, tecnicoId: 5 },
      user: userBranch1 // Usuario de Branch 1 intentando desasignar en orden de Branch 2
    };
    const resDelCross = mockRes();
    await removeTecnicoServicio(reqDelCross, resDelCross);
    assert(resDelCross.statusCode === 404, `Usuario de Sucursal 1 no puede desasignar técnicos en orden de Sucursal 2 (HTTP 404 esperado, obtuvo: ${resDelCross.statusCode})`);
  }

  // --- TEST 4: Cambio de estado en orden de otra sucursal ---
  console.log('\n--- TEST 4: PATCH /api/servicios/:id/estado (Mutación de estado en otra sucursal) ---');
  {
    const reqStateCross = {
      params: { id: orderBranch2Id },
      user: userBranch1,
      body: { nuevo_estado_id: 2 }
    };
    const resStateCross = mockRes();
    await updateServicioEstado(reqStateCross, resStateCross);
    assert(resStateCross.statusCode === 404, `Usuario de Sucursal 1 no puede cambiar estado de orden de Sucursal 2 (HTTP 404 esperado, obtuvo: ${resStateCross.statusCode})`);
  }

  // --- TEST 5: Consulta y creación de incidencias en orden de otra sucursal ---
  console.log('\n--- TEST 5: INCIDENCIAS (Consulta y Creación protegidas por sucursal) ---');
  {
    // GET Incidencias
    const reqGetInc = {
      params: { id: orderBranch2Id },
      user: userBranch1
    };
    const resGetInc = mockRes();
    await getIncidenciasServicio(reqGetInc, resGetInc);
    assert(resGetInc.statusCode === 404, `Usuario de Sucursal 1 no puede consultar incidencias de orden de Sucursal 2 (HTTP 404 esperado, obtuvo: ${resGetInc.statusCode})`);

    // POST Incidencia
    const reqPostInc = {
      params: { id: orderBranch2Id },
      user: userBranch1,
      body: {
        tipo_incidencia: 'Imprevisto',
        descripcion: 'Intento de hackeo o cruce de sucursal'
      }
    };
    const resPostInc = mockRes();
    await createIncidenciaServicio(reqPostInc, resPostInc);
    assert(resPostInc.statusCode === 404, `Usuario de Sucursal 1 no puede crear incidencias en orden de Sucursal 2 (HTTP 404 esperado, obtuvo: ${resPostInc.statusCode})`);

    // PATCH Aprobación Incidencia
    const reqPatchInc = {
      params: { id: orderBranch2Id, incidenciaId: 1 },
      user: userBranch1,
      body: {
        estado_aprobacion: 'APROBADO',
        metodo_aprobacion: 'Presencial'
      }
    };
    const resPatchInc = mockRes();
    await updateAprobacionIncidencia(reqPatchInc, resPatchInc);
    assert(resPatchInc.statusCode === 404, `Usuario de Sucursal 1 no puede aprobar/rechazar incidencias de orden de Sucursal 2 (HTTP 404 esperado, obtuvo: ${resPatchInc.statusCode})`);
  }

  // --- TEST 6: GET /api/trabajadores?solo_tecnicos=true (Exclusión de secretarias) ---
  console.log('\n--- TEST 6: GET /api/trabajadores?solo_tecnicos=true (Filtro anti-secretarias) ---');
  {
    const reqWorkers = {
      isSuperAdmin: true,
      query: { solo_tecnicos: 'true' }
    };
    const resWorkers = mockRes();
    await getWorkers(reqWorkers, resWorkers);
    const workers = resWorkers.data?.data || [];
    const hasSecretaria = workers.some(w => String(w.rol_nombre || '').toLowerCase().includes('secretaria'));
    assert(resWorkers.statusCode === 200 && !hasSecretaria && workers.length > 0, `Listado de técnicos con solo_tecnicos=true excluye completamente a secretarias (Total devueltos: ${workers.length}, contiene secretarias: ${hasSecretaria})`);
  }

  console.log(`\n=== RESULTADOS: ${passedTests} de ${totalTests} pruebas superadas (${Math.round((passedTests / totalTests) * 100)}%) ===`);
  await pool.end();
  process.exit(passedTests === totalTests ? 0 : 1);
}

runIsolationTests().catch((err) => {
  console.error('Error fatal durante la prueba:', err);
  process.exit(1);
});
