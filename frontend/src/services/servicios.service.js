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