import api from './api';

/**
 * Obtener listado paginado de clientes con filtros y búsqueda
 */
export const getClients = async (params = {}) => {
  const response = await api.get('/clientes', { params });
  return response.data;
};

/**
 * Obtener un cliente específico por ID
 */
export const getClientById = async (id) => {
  const response = await api.get(`/clientes/${id}`);
  return response.data;
};

/**
 * Registrar un nuevo cliente
 */
export const createClient = async (data) => {
  const response = await api.post('/clientes', data);
  return response.data;
};

/**
 * Actualizar datos de un cliente existente
 */
export const updateClient = async (id, data) => {
  const response = await api.put(`/clientes/${id}`, data);
  return response.data;
};

/**
 * Alternar estado activo / inactivo de un cliente
 */
export const toggleClientStatus = async (id) => {
  const response = await api.patch(`/clientes/${id}/toggle-status`);
  return response.data;
};
