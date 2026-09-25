import api from './api';

/**
 * Búsqueda predictiva global (órdenes, clientes, equipos)
 * @param {string} q
 * @param {Object} [params]
 */
export const globalSearch = async (q, params = {}) => {
  const response = await api.get('/buscar', {
    params: { q, ...params }
  });
  return response.data;
};
