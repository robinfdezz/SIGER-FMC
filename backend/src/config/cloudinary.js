const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configuración de credenciales de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Sube un buffer de imagen a Cloudinary en streaming.
 * @param {Buffer} buffer - Buffer del archivo en memoria (desde Multer).
 * @param {string} folder - Carpeta destino en Cloudinary (por defecto: 'siger-fmc/personal-fmc').
 * @param {object} customOptions - Opciones adicionales de transformación o upload.
 * @returns {Promise<object>} Resultado de la carga en Cloudinary (secure_url, public_id, etc.)
 */
const uploadImageBuffer = (buffer, folder = 'siger-fmc/personal-fmc', customOptions = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      format: 'webp',
      transformation: [
        { width: 500, height: 500, crop: 'limit' },
        { quality: 'auto' }
      ],
      ...customOptions
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error('❌ Error en upload_stream de Cloudinary:', error);
        return reject(error);
      }
      resolve(result);
    });

    // Inyectar el buffer en el stream de Cloudinary
    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Elimina directamente un asset de Cloudinary utilizando su public_id.
 * @param {string} publicId - ID público del asset en Cloudinary (ej: 'siger-fmc/personal-fmc/abc123xyz').
 * @returns {Promise<object|null>} Resultado de la eliminación de Cloudinary o null si no se proporcionó ID.
 */
const deleteImageByPublicId = async (publicId) => {
  if (!publicId || typeof publicId !== 'string' || publicId.trim().length === 0) {
    return null;
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId.trim());
    return result;
  } catch (error) {
    console.error(`⚠️ Error al eliminar asset de Cloudinary por public_id (${publicId}):`, error.message);
    return null;
  }
};

/**
 * Extrae el public_id de una URL de Cloudinary y elimina la imagen.
 * @param {string} imageUrl - URL pública de la imagen en Cloudinary.
 * @returns {Promise<object|null>} Resultado de la eliminación o null si la URL no es de Cloudinary.
 */
const deleteImageByUrl = async (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.includes('cloudinary.com')) {
    return null;
  }

  try {
    // Ejemplo de URL: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/siger-fmc/personal-fmc/abc123xyz.webp
    const parts = imageUrl.split('/');
    const uploadIndex = parts.findIndex((p) => p === 'upload');
    if (uploadIndex === -1) return null;

    // Obtener los segmentos después de /upload/v<version>/
    const pathAfterUpload = parts.slice(uploadIndex + 1);
    // Si el primer segmento es la versión (v123456), saltarlo
    if (pathAfterUpload[0].startsWith('v') && !isNaN(pathAfterUpload[0].substring(1))) {
      pathAfterUpload.shift();
    }

    const fullPathWithExt = pathAfterUpload.join('/');
    // Quitar la extensión (.jpg, .webp, etc.)
    const publicId = fullPathWithExt.replace(/\.[^/.]+$/, '');

    if (!publicId) return null;

    return await deleteImageByPublicId(publicId);
  } catch (error) {
    console.error('⚠️ Error al eliminar imagen previa de Cloudinary por URL:', error.message);
    return null;
  }
};

module.exports = {
  cloudinary,
  uploadImageBuffer,
  deleteImageByPublicId,
  deleteImageByUrl
};
