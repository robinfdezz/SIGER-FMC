import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, description, children, maxWidth = 'max-w-2xl' }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#18181b] border border-neutral-200/80 dark:border-neutral-800 rounded-2xl shadow-2xl p-5 sm:p-6 z-10 my-4 transition-all animate-scale-up`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-neutral-100 dark:border-neutral-800/80">
          <div>
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
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content */}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
