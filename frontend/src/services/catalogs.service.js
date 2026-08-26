import api from './api';

export const getRoles = async () => {
  const response = await api.get('/catalogos/roles');
  return response.data;
};

export const getSucursales = async () => {
  const response = await api.get('/catalogos/sucursales');
  return response.data;
};

export const getBranches = getSucursales;

export const getCategorias = async () => {
  const response = await api.get('/catalogos/categorias');
  return response.data;
};

export const getEstados = async () => {
  const response = await api.get('/catalogos/estados');
  return response.data;
};
