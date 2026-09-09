import React, { useRef, useState } from 'react';
import { Camera, Trash2, Plus, Loader2 } from 'lucide-react';
import { uploadFotosRecepcion } from '../../services/servicios.service';
import { sileo } from 'sileo';

const MAX_PHOTOS = 5;

/**
 * DevicePhotoUploader
 * Galería dinámica de evidencias fotográficas (hasta 5 fotos).
 * Permite selección individual/múltiple o Drag & Drop con subida inmediata a Cloudinary.
 *
 * @param {string[]} value    - URLs de fotos cargadas
 * @param {Function} onChange - Callback con el nuevo array de URLs
 */
const DevicePhotoUploader = ({ value = [], onChange }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const currentPhotos = Array.isArray(value) ? value.filter(Boolean) : [];

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;

    const availableSlots = MAX_PHOTOS - currentPhotos.length;
    if (availableSlots <= 0) {
      sileo.error({
        title: 'Límite alcanzado',
        description: `Solo se permite un máximo de ${MAX_PHOTOS} fotografías.`
      });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const validFiles = [];

    for (const f of filesToProcess) {
      if (!validTypes.includes(f.type)) {
        sileo.error({ title: 'Formato no permitido', description: `${f.name}: Solo JPG, PNG o WEBP.` });
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        sileo.error({ title: 'Archivo muy grande', description: `${f.name} excede el límite de 5MB.` });
        continue;
      }
      validFiles.push(f);
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    try {
      const result = await uploadFotosRecepcion(validFiles);
      if (result.ok && Array.isArray(result.urls)) {
        const newUrls = [...currentPhotos, ...result.urls].slice(0, MAX_PHOTOS);
        onChange(newUrls);
      } else {
        sileo.error({ title: 'Error de subida', description: result.message || 'No se pudieron subir las imágenes.' });
      }
    } catch {
      sileo.error({ title: 'Error de subida', description: 'No se pudo subir la imagen. Intenta de nuevo.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleRemove = (indexToRemove) => {
    const newUrls = currentPhotos.filter((_, idx) => idx !== indexToRemove);
    onChange(newUrls);
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4">
      {/* Cabecera */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
            <Camera size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-outfit">
              Fotografías / Evidencias de Recepción
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">
              Hasta 5 fotos del dispositivo. JPG, PNG o WEBP, máx. 5MB cada una.
            </p>
          </div>
        </div>
        <span className="text-sm text-neutral-600 dark:text-neutral-300 font-inter shrink-0">
          <strong className="font-semibold">{currentPhotos.length}</strong> de {MAX_PHOTOS}
        </span>
      </div>

      {/* Input de archivo invisible */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      {/* Galería dinámica de miniaturas y slot de subida */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {/* Fotos agregadas */}
        {currentPhotos.map((url, index) => (
          <div
            key={url + index}
            className="relative w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl overflow-hidden group border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 shadow-2xs"
          >
            <img
              src={url}
              alt={`Evidencia ${index + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />

            {/* Overlay centralizado con botón de eliminar institucional */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                className="p-2 rounded-xl bg-red-600/90 hover:bg-red-700 text-white shadow-md backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
                title="Eliminar foto"
              >
                <Trash2 size={16} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        ))}

        {/* Slot de carga en progreso */}
        {isUploading && (
          <div className="w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl border-2 border-dashed border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 flex flex-col items-center justify-center">
            <Loader2 size={24} className="text-red-600 dark:text-red-400 animate-spin" />
            <span className="text-[11px] font-medium text-red-600 dark:text-red-400 mt-2 font-inter">Subiendo...</span>
          </div>
        )}

        {/* Slot para agregar fotos (+): visible si faltan fotos y no está subiendo */}
        {!isUploading && currentPhotos.length < MAX_PHOTOS && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer select-none group ${
              isDragging
                ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-600 dark:text-red-400'
                : 'border-neutral-200 dark:border-neutral-800 hover:border-red-400 dark:hover:border-red-600 bg-neutral-50/60 dark:bg-neutral-800/30 hover:bg-red-50/30 dark:hover:bg-red-950/10 text-neutral-400 dark:text-neutral-500 hover:text-red-600 dark:hover:text-red-400'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 shadow-2xs border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <Plus size={18} className="text-neutral-600 dark:text-neutral-300 group-hover:text-red-600 dark:group-hover:text-red-400" />
            </div>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-inter">
              Agregar
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-inter leading-tight">
              Foto
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DevicePhotoUploader;