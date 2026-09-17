import React, { useRef, useState } from 'react';
import { Camera, Trash2, Plus, Loader2, QrCode } from 'lucide-react';
import { uploadFotosRecepcion } from '../../services/servicios.service';
import QrUploadModal from './QrUploadModal';
import { sileo } from 'sileo';

const DEFAULT_MAX_PHOTOS = 5;

/**
 * DevicePhotoUploader
 * Galería dinámica de evidencias fotográficas.
 * Permite selección individual/múltiple o Drag & Drop con subida inmediata a Cloudinary,
 * así como carga remota sincronizada desde dispositivos móviles mediante Código QR y Polling.
 *
 * @param {string[]|Object[]} value - URLs u objetos de fotos cargadas
 * @param {Function} onChange       - Callback con el nuevo array de objetos {url, public_id}
 * @param {number} maxPhotos        - Cantidad máxima de fotos permitidas (default 5)
 * @param {string} title            - Título de la cabecera
 * @param {string} description      - Subtítulo explicativo
 * @param {React.Component} icon    - Icono temático del bloque
 * @param {string} className        - Clases CSS adicionales para el contenedor
 */
const DevicePhotoUploader = ({
  value = [],
  onChange,
  maxPhotos = DEFAULT_MAX_PHOTOS,
  title = 'Fotografías / Evidencias de Recepción',
  description = null,
  icon: HeaderIcon = Camera,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const MAX_PHOTOS = maxPhotos;
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
      if (result && (result.ok || result.status === 200)) {
        let uploaded = [];
        if (Array.isArray(result.fotos) && result.fotos.length > 0) {
          uploaded = result.fotos.map((f, idx) => ({
            url: f.url || f.secure_url,
            public_id: f.public_id || null,
            size: f.size || (validFiles[idx]?.size ? (validFiles[idx].size / (1024 * 1024)).toFixed(2) : null)
          }));
        } else if (Array.isArray(result.data?.fotos) && result.data.fotos.length > 0) {
          uploaded = result.data.fotos.map((f, idx) => ({
            url: f.url || f.secure_url,
            public_id: f.public_id || null,
            size: f.size || (validFiles[idx]?.size ? (validFiles[idx].size / (1024 * 1024)).toFixed(2) : null)
          }));
        } else if (result.url || result.data?.url) {
          uploaded = [{
            url: result.url || result.data?.url,
            public_id: result.public_id || result.data?.public_id || null,
            size: validFiles[0]?.size ? (validFiles[0].size / (1024 * 1024)).toFixed(2) : null
          }];
        } else if (Array.isArray(result.urls)) {
          uploaded = result.urls.map((url, idx) => ({
            url,
            public_id: null,
            size: validFiles[idx]?.size ? (validFiles[idx].size / (1024 * 1024)).toFixed(2) : null
          }));
        }

        const normalizedCurrent = currentPhotos.map((item) =>
          typeof item === 'object' && item !== null
            ? { url: item.url, public_id: item.public_id || null, size: item.size || null }
            : { url: item, public_id: null, size: null }
        );

        const newPhotos = [...normalizedCurrent, ...uploaded].slice(0, MAX_PHOTOS);
        onChange(newPhotos);
      } else {
        sileo.error({ title: 'Error de subida', description: result?.message || 'No se pudieron subir las imágenes.' });
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
    const newPhotos = currentPhotos.filter((_, idx) => idx !== indexToRemove);
    onChange(newPhotos);
  };

  // Callback ejecutado cuando el Polling del modal QR detecta fotos subidas desde el móvil
  const handleQrPhotosReceived = (newRemotePhotos) => {
    if (!Array.isArray(newRemotePhotos) || newRemotePhotos.length === 0) return;

    const normalizedNew = newRemotePhotos.map((item) => ({
      url: typeof item === 'object' && item !== null ? (item.url || item.secure_url) : item,
      public_id: typeof item === 'object' && item !== null ? (item.public_id || null) : null,
      size: typeof item === 'object' && item?.size ? item.size : null
    }));

    const normalizedCurrent = currentPhotos.map((item) =>
      typeof item === 'object' && item !== null
        ? { url: item.url, public_id: item.public_id || null, size: item.size || null }
        : { url: item, public_id: null, size: null }
    );

    // Fusionar sin duplicados por url
    const existingUrls = new Set(normalizedCurrent.map((p) => p.url));
    const toAdd = normalizedNew.filter((p) => !existingUrls.has(p.url));

    const combined = [...normalizedCurrent, ...toAdd].slice(0, MAX_PHOTOS);
    onChange(combined);
  };

  return (
    <div className={`p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-4 ${className}`.trim()}>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-100 dark:border-neutral-800/80 pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 shrink-0">
            <HeaderIcon size={16} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider font-outfit">
              {title}
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-inter mt-0.5">
              {description || `Hasta ${MAX_PHOTOS} fotos del dispositivo. JPG, PNG o WEBP, máx. 5MB cada una.`}
            </p>
          </div>
        </div>

        <span className="text-sm text-neutral-600 dark:text-neutral-300 font-inter shrink-0">
          <strong className="font-semibold">{currentPhotos.length}</strong> de {MAX_PHOTOS}
        </span>
      </div>

      {/* Input de archivo invisible (PC) */}
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

      {/* Galería dinámica de miniaturas y slots de subida */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        {/* Fotos agregadas */}
        {currentPhotos.map((item, index) => {
          const photoUrl = typeof item === 'object' && item !== null ? item.url : item;
          const photoKey = typeof item === 'object' && item?.public_id ? item.public_id : `${photoUrl}-${index}`;
          const photoSize = typeof item === 'object' && item !== null ? (item.size || (item.bytes ? (item.bytes / (1024 * 1024)).toFixed(2) : null)) : null;

          return (
            <div
              key={photoKey}
              className="relative w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl overflow-hidden group border border-neutral-200/80 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 shadow-2xs"
            >
              <img
                src={photoUrl}
                alt={`Evidencia ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />

              {/* Botón de descartar/eliminar en la esquina superior derecha (homologado con UploadMobilePage) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(index);
                }}
                className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-black/60 hover:bg-red-600 text-white transition-colors cursor-pointer z-10"
                title="Eliminar foto"
              >
                <Trash2 size={13} />
              </button>

              {/* Indicador de peso de la fotografía en la esquina inferior izquierda (homologado con UploadMobilePage) */}
              {photoSize && (
                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white select-none pointer-events-none z-10">
                  {photoSize}MB
                </span>
              )}
            </div>
          );
        })}

        {/* Slot de carga en progreso */}
        {isUploading && (
          <div className="w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl border-2 border-dashed border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 flex flex-col items-center justify-center">
            <Loader2 size={24} className="text-red-600 dark:text-red-400 animate-spin" />
            <span className="text-[11px] font-medium text-red-600 dark:text-red-400 mt-2 font-inter">Subiendo...</span>
          </div>
        )}

        {/* Slot 1: Agregar fotos desde PC (+) */}
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
            title="Seleccionar archivos desde la computadora o arrastrar aquí"
          >
            <div className="w-8 h-8 rounded-xl bg-white dark:bg-neutral-800 shadow-2xs border border-neutral-200 dark:border-neutral-700 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <Plus size={18} className="text-neutral-600 dark:text-neutral-300 group-hover:text-red-600 dark:group-hover:text-red-400" />
            </div>
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 font-inter">
              Desde PC
            </span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-inter leading-tight">
              Adjuntar
            </span>
          </div>
        )}

        {/* Slot 2: Botón complementario móvil QR al lado del botón de adjuntar */}
        {!isUploading && currentPhotos.length < MAX_PHOTOS && (
          <div
            onClick={() => setIsQrModalOpen(true)}
            className="w-28 h-28 sm:w-32 sm:h-32 aspect-square shrink-0 rounded-xl border-2 border-dashed border-red-200 dark:border-red-950/60 hover:border-red-500 dark:hover:border-red-600 bg-red-50/30 dark:bg-red-950/10 hover:bg-red-50/70 dark:hover:bg-red-950/30 transition-all flex flex-col items-center justify-center p-2 text-center cursor-pointer select-none group"
            title="Escanear QR para capturar fotos con la cámara del móvil"
          >
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 shadow-2xs border border-red-200/60 dark:border-red-800/60 flex items-center justify-center mb-1.5 transition-transform group-hover:scale-110">
              <QrCode size={18} />
            </div>
            <span className="text-xs font-semibold text-red-700 dark:text-red-300 font-inter">
              Con Móvil
            </span>
            <span className="text-[10px] text-red-500/80 dark:text-red-400/80 font-inter leading-tight">
              Código QR
            </span>
          </div>
        )}
      </div>

      {/* Submodal interactivo de sincronización QR */}
      <QrUploadModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onPhotosReceived={handleQrPhotosReceived}
        maxPhotos={MAX_PHOTOS - currentPhotos.length}
      />
    </div>
  );
};

export default DevicePhotoUploader;