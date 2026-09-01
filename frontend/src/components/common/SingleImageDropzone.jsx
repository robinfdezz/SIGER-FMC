import React, { useState, useRef } from 'react';
import { UploadCloud, Trash2 } from 'lucide-react';
import { sileo } from 'sileo';

/**
 * Componente modular genérico de carga y previsualización de imagen única estilo Dropzone interactivo.
 *
 * @param {string|null} value - URL remota de la imagen guardada.
 * @param {string|null} preview - URL de previsualización local (Data URL / Blob / ObjectURL).
 * @param {Function} onChange - Callback `(file: File) => void` al seleccionar o soltar un archivo válido.
 * @param {Function} onRemove - Callback `() => void` al hacer clic en el botón de eliminar imagen.
 * @param {boolean} disabled - Bloquea las interacciones durante operaciones asíncronas.
 * @param {number} maxSizeMB - Tamaño máximo permitido en megabytes (por defecto 5).
 * @param {string} label - Texto principal de la tarjeta.
 * @param {string} description - Texto secundario descriptivo.
 * @param {string} initials - Texto/iniciales a mostrar en el avatar/thumbnail si no hay imagen.
 * @param {string} className - Clases adicionales de Tailwind para el contenedor exterior.
 */
const SingleImageDropzone = ({
  value = null,
  preview = null,
  onChange,
  onRemove,
  disabled = false,
  maxSizeMB = 5,
  label,
  description,
  initials = '',
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const displayImage = preview || value;

  const defaultLabel = displayImage
    ? 'Arrastra o haz clic para cambiar foto'
    : 'Arrastra una foto aquí o haz clic para subir';

  const defaultDescription = `JPG, PNG o WEBP · Máx. ${maxSizeMB}MB`;

  const processFile = (file) => {
    if (!file || disabled) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      sileo.error({
        title: 'Formato no permitido',
        description: 'Solo se permiten imágenes en formato JPG, PNG o WEBP.'
      });
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      sileo.error({
        title: 'Archivo muy pesado',
        description: `La imagen no puede exceder los ${maxSizeMB}MB de tamaño.`
      });
      return;
    }

    if (onChange) {
      onChange(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    processFile(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (disabled) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onRemove) {
      onRemove();
    }
  };

  const handleContainerClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`group relative flex items-center gap-3.5 sm:gap-4 p-3 sm:p-3.5 rounded-2xl border border-dashed transition-all duration-200 select-none ${
        disabled
          ? 'opacity-60 cursor-not-allowed border-neutral-200 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-900/20'
          : isDragging
          ? 'border-red-500 bg-red-50/70 dark:bg-red-950/30 dark:border-red-500/80 ring-2 ring-red-500/20 cursor-pointer'
          : 'border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600 bg-neutral-50/50 hover:bg-neutral-50 dark:bg-neutral-900/40 dark:hover:bg-neutral-900/70 cursor-pointer'
      } ${className}`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png,image/jpeg,image/webp,image/jpg"
        disabled={disabled}
        className="hidden"
      />

      {/* Avatar / Thumbnail con Overlay al Hover */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold text-base sm:text-lg flex items-center justify-center shrink-0 border border-red-200/60 dark:border-red-900/40 overflow-hidden font-outfit shadow-2xs">
        {displayImage ? (
          <img
            src={displayImage}
            alt="Preview imagen"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <UploadCloud size={22} className="text-red-500 dark:text-red-400" />
        )}

        {/* Overlay interactivo */}
        {!disabled && displayImage && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center text-white">
            <UploadCloud size={20} className="transition-transform group-hover:scale-110" />
          </div>
        )}
      </div>

      {/* Textos descriptivos */}
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-neutral-800 dark:text-neutral-200 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
          {label || defaultLabel}
        </p>
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5 font-inter">
          {description || defaultDescription}
        </p>
      </div>

      {/* Botón de eliminación en extremo derecho */}
      {displayImage && !disabled && (
        <button
          type="button"
          onClick={handleRemove}
          title="Eliminar imagen"
          aria-label="Eliminar imagen"
          className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white transition-all duration-200 active:scale-95 cursor-pointer z-10"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
};

export default SingleImageDropzone;
