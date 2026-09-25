import api from './api';

const noCache = {
  headers: {
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache'
  },
  params: { _t: Date.now() }
};

/**
 * Listar notificaciones del usuario autenticado
 */
export const getNotificaciones = async (params = {}) => {
  const response = await api.get('/notificaciones', {
    params: { ...params, _t: Date.now() },
    headers: noCache.headers
  });
  return response.data;
};

/**
 * Conteo de no leídas (para badge)
 */
export const getConteoNotificaciones = async () => {
  const response = await api.get('/notificaciones/conteo', {
    params: { _t: Date.now() },
    headers: noCache.headers
  });
  return response.data;
};

/**
 * Marcar una notificación como leída
 */
export const marcarNotificacionLeida = async (id) => {
  const response = await api.patch(`/notificaciones/${id}/leer`);
  return response.data;
};

/**
 * Marcar todas como leídas
 */
export const marcarTodasLeidas = async () => {
  const response = await api.patch('/notificaciones/leer-todas');
  return response.data;
};
