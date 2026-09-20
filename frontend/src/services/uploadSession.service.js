import api from './api';

/**
 * Genera una nueva sesión para la subida remota de fotos vía código QR.
 * @returns {Promise<{ ok: boolean, sessionId: string, expira_en: string }>}
 */
export const crearUploadSession = async (payload = {}) => {
  const response = await api.post('/upload-session/crear', payload);
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

/**
 * Elimina inmediatamente una foto subida en la sesión QR desde Cloudinary y PostgreSQL.
 * @param {string} publicId - ID del asset en Cloudinary
 * @param {string} sessionId - Identificador de la sesión QR
 */
export const eliminarFotoUploadSession = async (publicId, sessionId = null) => {
  if (!publicId) return null;
  const response = await api.post('/upload-session/eliminar-foto', {
    public_id: publicId,
    session_id: sessionId
  });
  return response.data;
};
