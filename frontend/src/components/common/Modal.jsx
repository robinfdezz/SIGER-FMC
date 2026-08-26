import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-3xl'
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs w-full h-full overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-transparent transition-opacity"
      />

      {/* Modal Card con altura rígida de 80vh */}
      <div
        className={`relative w-full ${maxWidth} h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 shadow-2xl overflow-hidden z-10 my-auto animate-scale-up`}
      >
        {/* Header (Fijo arriba) */}
        <div className="p-4 sm:p-6 pb-3 sm:pb-4 shrink-0 border-b border-neutral-100 dark:border-neutral-800/80 flex items-start justify-between">
          <div className="pr-4">
            <h3 className="text-lg sm:text-xl font-semibold text-neutral-900 dark:text-neutral-100 font-outfit">
              {title}
            </h3>
            {description && (
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 font-inter">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
