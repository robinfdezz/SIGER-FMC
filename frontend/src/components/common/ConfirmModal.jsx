import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  isLoading = false
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const getConfirmButtonStyles = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/20';
      case 'success':
      case 'warning':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500/20';
      case 'info':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop con desenfoque suave */}
      <div
        onClick={() => !isLoading && onClose()}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Tarjeta Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 z-10 my-8 transition-all animate-scale-up">
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          disabled={isLoading}
          aria-label="Cerrar modal"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <X size={18} />
        </button>

        {/* Contenido sin icono lateral */}
        <div className="space-y-2 pr-6">
          <h3 className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
            {title}
          </h3>
          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-inter leading-relaxed">
            {description}
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs sm:text-sm font-medium bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2 focus:outline-none focus:ring-2 cursor-pointer ${getConfirmButtonStyles()}`}
          >
            {isLoading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
