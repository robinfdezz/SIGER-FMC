const multer = require('multer');

// Almacenamiento en memoria para subir directamente a Cloudinary vía stream
const storage = multer.memoryStorage();

// Filtro estricto para formatos de imagen soportados
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Formato de archivo no válido. Solo se permiten imágenes JPG, PNG y WEBP.'), false);
  }
};

// Configuración de Multer con límite de 5MB
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  },
  fileFilter
});

// Middleware auxiliar para capturar y formatear errores de Multer
const handleMulterErrors = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            ok: false,
            message: 'El archivo excede el tamaño máximo permitido de 5MB.'
          });
        }
        return res.status(400).json({
          ok: false,
          message: `Error en la subida del archivo: ${err.message}`
        });
      } else if (err) {
        return res.status(400).json({
          ok: false,
          message: err.message || 'Error al procesar el archivo de imagen.'
        });
      }
      next();
    });
  };
};

module.exports = {
  upload,
  handleMulterErrors
};
