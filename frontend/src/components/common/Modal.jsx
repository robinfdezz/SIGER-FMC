import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
  '2xl': 'max-w-4xl',
  '3xl': 'max-w-5xl',
  '4xl': 'max-w-6xl',
  full: 'max-w-[95vw]'
};

const Modal = ({
  isOpen,
  onClose,
  title,
  titleSlot = null,
  titleExtra = null,
  description,
  icon = null,
  headerExtra = null,
  customHeader = null,
  hideHeader = false,
  hideCloseButton = false,
  children,
  footer = null,
  size = 'xl',
  maxWidth = null,
  height = 'h-[80vh]',
  className = '',
  bodyClassName = '',
  headerClassName = '',
  closeOnBackdrop = true,
  closeOnEscape = true
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (closeOnEscape && e.key === 'Escape' && isOpen) {
        onClose?.();
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
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  // Resolver ancho efectivo: maxWidth tiene precedencia si se pasa explícitamente, de lo contrario se usa size
  const effectiveMaxWidth = maxWidth || SIZE_CLASSES[size] || SIZE_CLASSES.xl;
  const resolvedTitleSlot = titleSlot || titleExtra;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs w-full h-full overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={closeOnBackdrop ? onClose : undefined}
        className="fixed inset-0 bg-transparent transition-opacity"
      />

      {/* Modal Card */}
      <div
        className={`relative w-full ${effectiveMaxWidth} ${height} flex flex-col rounded-2xl sm:rounded-3xl bg-white dark:bg-[#141416] border border-neutral-200/80 dark:border-neutral-800 shadow-2xl overflow-hidden z-10 my-auto animate-scale-up ${className}`}
      >
        {/* Header */}
        {!hideHeader && (
          customHeader ? (
            customHeader
          ) : (
            <div className={`p-4 sm:p-5 pb-3 sm:pb-4 shrink-0 border-b border-neutral-100 dark:border-neutral-800/80 flex items-start justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/40 ${headerClassName}`}>
              <div className="flex items-start gap-3 min-w-0 pr-2">
                {icon && (
                  <div className="shrink-0 mt-0.5">
                    {icon}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {typeof title === 'string' ? (
                      <h3 className="text-base sm:text-lg font-bold font-outfit text-neutral-900 dark:text-neutral-100 leading-tight">
                        {title}
                      </h3>
                    ) : (
                      title
                    )}
                    {resolvedTitleSlot}
                  </div>
                  {description && (
                    <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5 font-inter">
                      {description}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {headerExtra}
                {!hideCloseButton && (
                  <button
                    onClick={onClose}
                    aria-label="Cerrar modal"
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer shrink-0"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>
            </div>
          )
        )}

        {/* Body Content */}
        <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${bodyClassName}`}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-neutral-100 dark:border-neutral-800/80 px-4 py-3 sm:px-6 sm:py-4 bg-neutral-50/70 dark:bg-[#141416] flex items-center justify-end gap-3 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
