import React from 'react';

/**
 * Componente modular de Tooltip flotante estilizado, moderno y sin flecha.
 *
 * @param {React.ReactNode} children - Elemento trigger interactivo sobre el que se hace hover.
 * @param {React.ReactNode} content - Texto o contenido de la tarjeta flotante.
 * @param {'right' | 'left' | 'top' | 'bottom'} position - Posición relativa (por defecto: 'right').
 * @param {boolean} enabled - Activa o desactiva la renderización del tooltip (por defecto: true).
 * @param {string} className - Clases adicionales de Tailwind para la tarjeta flotante.
 */
const Tooltip = ({
  children,
  content,
  position = 'right',
  enabled = true,
  className = ''
}) => {
  if (!enabled || !content) {
    return <>{children}</>;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'right-full mr-3 top-1/2 -translate-y-1/2 translate-x-1 group-hover/tooltip:translate-x-0';
      case 'top':
        return 'bottom-full mb-2.5 left-1/2 -translate-x-1/2 translate-y-1 group-hover/tooltip:translate-y-0';
      case 'bottom':
        return 'top-full mt-2.5 left-1/2 -translate-x-1/2 -translate-y-1 group-hover/tooltip:translate-y-0';
      case 'right':
      default:
        return 'left-full ml-3 top-1/2 -translate-y-1/2 -translate-x-1 group-hover/tooltip:translate-x-0';
    }
  };

  return (
    <div className="relative group/tooltip flex w-full">
      {children}
      <div
        role="tooltip"
        className={`absolute z-50 pointer-events-none opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 ease-out whitespace-nowrap px-2.5 py-1 text-xs font-medium tracking-normal text-neutral-200 bg-neutral-900 dark:bg-neutral-900 border border-neutral-700/50 dark:border-neutral-700/60 rounded-lg shadow-xs select-none ${getPositionClasses()} ${className}`}
      >
        {content}
      </div>
    </div>
  );
};

export default Tooltip;
