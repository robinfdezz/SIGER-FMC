import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

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

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs w-full h-full min-h-screen">
      {/* Backdrop con desenfoque suave */}
      <div
        onClick={() => !isLoading && onClose()}
        className="fixed inset-0 bg-transparent transition-opacity"
      />

      {/* Tarjeta Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-2xl p-6 z-10 my-auto transition-all animate-scale-up">
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
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
