import api from './api';

/**
 * Genera una nueva sesión para la subida remota de fotos vía código QR.
 * @returns {Promise<{ ok: boolean, sessionId: string, expira_en: string }>}
 */
export const crearUploadSession = async () => {
  const response = await api.post('/upload-session/crear');
  return response.data;
};

/**
 * Consulta el estado y fotos de una sesión activa (usado para polling en PC y validación en móvil).
 * @param {string} sessionId - Identificador único de la sesión
 * @returns {Promise<{ ok: boolean, sessionId: string, estado: string, fotos: Array, expira_en: string }>}
 */
export const getUploadSession = async (sessionId) => {
  const response = await api.get(`/upload-session/${encodeURIComponent(sessionId)}`);
  return response.data;
};

/**
 * Sube una lista de archivos de imagen a la sesión remota desde el dispositivo móvil.
 * @param {string} sessionId - Identificador de la sesión QR
 * @param {File[]} files - Lista de archivos de imagen capturados
 * @returns {Promise<{ ok: boolean, message: string, fotos: Array, nuevasFotos: Array }>}
 */
export const subirFotosSession = async (sessionId, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('fotos', file));

  const response = await api.post(
    `/upload-session/${encodeURIComponent(sessionId)}/subir`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    }
  );
  return response.data;
};
