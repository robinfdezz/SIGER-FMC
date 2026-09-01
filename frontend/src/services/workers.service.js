import api from './api';

export const getWorkers = async (params = {}) => {
  const response = await api.get('/trabajadores', { params });
  return response.data;
};

export const getWorkerById = async (id) => {
  const response = await api.get(`/trabajadores/${id}`);
  return response.data;
};

export const createWorker = async (data) => {
  const response = await api.post('/trabajadores', data);
  return response.data;
};

export const updateWorker = async (id, data) => {
  const response = await api.put(`/trabajadores/${id}`, data);
  return response.data;
};

export const toggleWorkerStatus = async (id) => {
  const response = await api.patch(`/trabajadores/${id}/toggle-status`);
  return response.data;
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append('foto_perfil', file);
  const response = await api.post('/trabajadores/upload-avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    timeout: 120000 // 120 segundos para subida y procesamiento en Cloudinary
  });
  return response.data;
};
