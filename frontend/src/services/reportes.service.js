import api from './api';

/**
 * Obtener resumen analítico y KPIs para reportes
 * @param {Object} [params]
 * @param {string} [params.desde] - YYYY-MM-DD
 * @param {string} [params.hasta] - YYYY-MM-DD
 * @param {number|string} [params.sucursal_id] - ID o 'all' (solo SuperAdmin)
 */
export const getReportesResumen = async (params = {}) => {
  const response = await api.get('/reportes/resumen', { params });
  return response.data;
};

/**
 * Obtener listado tabular de órdenes y liquidaciones para consulta o exportación
 * @param {Object} [params]
 * @param {string} [params.desde] - YYYY-MM-DD
 * @param {string} [params.hasta] - YYYY-MM-DD
 * @param {number|string} [params.sucursal_id]
 * @param {string} [params.estado] - 'entregados' | 'recibidos' | 'cancelados' | 'todos'
 * @param {string} [params.metodo_pago] - 'Efectivo' | 'Tarjeta' | 'Transferencia'
 * @param {string} [params.q] - Búsqueda por texto
 * @param {number} [params.page]
 * @param {number} [params.limit]
 * @param {boolean} [params.export] - true para obtener hasta 5000 registros
 */
export const getReportesDetalle = async (params = {}) => {
  const response = await api.get('/reportes/detalle', { params });
  return response.data;
};

export default {
  getReportesResumen,
  getReportesDetalle
};
