import api from './api';

/**
 * Obtener la información de la empresa matriz.
 * @returns {Promise<Object>}
 */
export const getCompanyProfile = async () => {
  const response = await api.get('/configuracion/companhia');
  return response.data;
};

/**
 * Subir logotipo de la empresa a Cloudinary.
 * @param {File} logoFile - Archivo de imagen seleccionado
 * @returns {Promise<Object>}
 */
export const uploadCompanyLogo = async (logoFile) => {
  const formData = new FormData();
  formData.append('logo', logoFile);

  const response = await api.post('/configuracion/companhia/upload-logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 120000 // 120s para subidas de imagen en conexiones lentas
  });

  return response.data;
};

/**
 * Actualizar o registrar los datos de la empresa matriz.
 * @param {Object} companyData - Datos del formulario de la empresa
 * @returns {Promise<Object>}
 */
export const updateCompanyProfile = async (companyData) => {
  const response = await api.put('/configuracion/companhia', companyData);
  return response.data;
};

/**
 * Listar todas las sucursales existentes.
 * @returns {Promise<Object>}
 */
export const getBranches = async () => {
  const response = await api.get('/configuracion/sucursales');
  return response.data;
};

/**
 * Actualizar datos informativos de una sucursal existente.
 * @param {number|string} id - ID de la sucursal
 * @param {Object} branchData - Datos informativos a actualizar
 * @returns {Promise<Object>}
 */
export const updateBranch = async (id, branchData) => {
  const response = await api.put(`/configuracion/sucursales/${id}`, branchData);
  return response.data;
};
