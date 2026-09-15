import api from './api';

/**
 * Obtener categorias de dispositivos activas, ordenadas alfabeticamente
 */
export const getCategorias = async () => {
  const response = await api.get('/categorias-dispositivos');
  return response.data;
};

/**
 * Obtener listado paginado de ordenes de servicio
 */
export const getServicios = async (params = {}) => {
  const response = await api.get('/servicios', { params });
  return response.data;
};

/**
 * Crear una nueva orden de servicio
 */
export const createServicio = async (data) => {
  const response = await api.post('/servicios', data);
  return response.data;
};

/**
 * Subir hasta 4 fotos de recepcion a Cloudinary
 * @param {File[]} files - Array de archivos de imagen
 */
export const uploadFotosRecepcion = async (files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('fotos', file));
  const response = await api.post('/servicios/upload-foto', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  });
  return response.data;
};

/**
 * Buscar orden por codigo de ticket (consulta publica autenticada)
 */
export const getServicioByTicket = async (codigo) => {
  const response = await api.get(`/servicios/ticket/${codigo}`);
  return response.data;
};

/**
 * Validar vigencia de garantía por código de ticket
 * @param {string} codigoTicket
 */
export const validarGarantiaTicket = async (codigoTicket) => {
  try {
    const response = await api.get(`/servicios/validar-garantia/${encodeURIComponent(String(codigoTicket).trim())}`);
    return response.data;
  } catch (err) {
    if (err.response?.data) {
      return err.response.data;
    }
    return { ok: false, error: err.message || 'Error de conexión al validar ticket' };
  }
};

/**
 * Obtener detalle completo de una orden por ID
 * @param {number|string} id
 */
export const getServicioById = async (id) => {
  const response = await api.get(`/servicios/${id}`);
  return response.data;
};

/**
 * Obtener órdenes de servicio activas en el taller (flujo operativo 1 a 6)
 * @param {Object} params - { sucursal_id, tecnico_id }
 */
export const getServiciosTaller = async (params = {}) => {
  const response = await api.get('/servicios/taller', { params });
  return response.data;
};

/**
 * Actualizar el estado de una orden de servicio en taller
 * @param {number|string} id
 * @param {Object} data - { nuevo_estado_id, notas, tecnico_id }
 */
export const updateServicioEstado = async (id, data) => {
  const response = await api.patch(`/servicios/${id}/estado`, data);
  return response.data;
};

/**
 * Asignar técnico colaborador a una orden de servicio
 * @param {number|string} id
 * @param {number|string} [tecnico_id] - ID opcional (si se omite, se asigna el usuario en sesión)
 */
export const assignTecnicoServicio = async (id, tecnico_id = null) => {
  const response = await api.post(`/servicios/${id}/tecnicos`, { tecnico_id });
  return response.data;
};

/**
 * Remover técnico colaborador de una orden de servicio
 * @param {number|string} id
 * @param {number|string} tecnicoId
 */
export const removeTecnicoServicio = async (id, tecnicoId) => {
  const response = await api.delete(`/servicios/${id}/tecnicos/${tecnicoId}`);
  return response.data;
};

/**
 * Obtener incidencias y hallazgos técnicos de una orden
 * @param {number|string} id
 */
export const getIncidenciasServicio = async (id) => {
  const response = await api.get(`/servicios/${id}/incidencias`);
  return response.data;
};

/**
 * Registrar una nueva incidencia técnica
 * @param {number|string} id
 * @param {Object} data - { tipo_incidencia, descripcion, repuesto_requerido, costo_adicional_repuesto, fotos }
 */
export const createIncidenciaServicio = async (id, data) => {
  const response = await api.post(`/servicios/${id}/incidencias`, data);
  return response.data;
};

/**
 * Actualizar estado de aprobación del cliente para una incidencia
 * @param {number|string} id - ID del servicio
 * @param {number|string} incidenciaId - ID de la incidencia
 * @param {Object} data - { aprobado_por_cliente: boolean, metodo_aprobacion: string }
 */
export const updateAprobacionIncidencia = async (id, incidenciaId, data) => {
  const response = await api.patch(`/servicios/${id}/incidencias/${incidenciaId}/aprobacion`, data);
  return response.data;
};